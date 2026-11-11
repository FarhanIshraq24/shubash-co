"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

export interface LocalCartItem {
  variantId: string;
  quantity: number;
}

export interface SerializedCartItem {
  variantId: string;
  productId: string;
  productName: string;
  brandName: string;
  slug: string;
  format: "DECANT" | "FULL_BOTTLE";
  volumeMl: string | null;
  priceEach: string;
  quantity: number;
  subtotal: string;
  imageUrl: string | null;
  inStock: boolean;
  maxQty: number;
  note: string | null;
}

export interface SerializedCartSummary {
  items: SerializedCartItem[];
  subtotal: string;
  deliveryFee: string;
  discount: string;
  total: string;
  subtotalFormatted: string;
  deliveryFeeFormatted: string;
  discountFormatted: string;
  totalFormatted: string;
  freeDeliveryThreshold: string | null;
  freeDeliveryEligible: boolean;
  itemCount: number;
  couponCode?: string | null;
  couponError?: string | null;
}

interface CartContextType {
  items: LocalCartItem[];
  summary: SerializedCartSummary | null;
  isLoading: boolean;
  isValidating: boolean;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  addItem: (variantId: string, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  syncCart: (district?: string, coupon?: string) => Promise<void>;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "shubash_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<LocalCartItem[]>([]);
  const [summary, setSummary] = useState<SerializedCartSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const validItems: LocalCartItem[] = parsed
            .filter((item): item is { variantId: unknown; quantity: unknown } => 
              typeof item === "object" && item !== null && "variantId" in item
            )
            .map((item) => ({
              variantId: String(item.variantId),
              quantity: Math.max(1, Number(item.quantity) || 1),
            }));
          setItems(validItems);
        }
      }
    } catch (e) {
      console.error("Failed to parse cart from localStorage", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync and validate with server
  const syncCart = useCallback(async (district?: string, coupon?: string) => {
    if (items.length === 0) {
      setSummary(null);
      return;
    }

    setIsValidating(true);
    try {
      const res = await fetch("/api/cart/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, district, coupon }),
      });
      if (res.ok) {
        const data = (await res.json()) as SerializedCartSummary;
        setSummary(data);

        // Self-heal the stored cart: drop variants that were deleted/hidden and
        // clamp quantities to what is in stock, so checkout can't get stuck.
        const byId = new Map(data.items.map((i) => [i.variantId, i]));
        const needsFix = items.some((i) => {
          const v = byId.get(i.variantId);
          return !v || (v.inStock && i.quantity > v.maxQty);
        });
        if (needsFix) {
          const fixed = items
            .filter((i) => byId.has(i.variantId))
            .map((i) => {
              const v = byId.get(i.variantId)!;
              return v.inStock && i.quantity > v.maxQty ? { ...i, quantity: v.maxQty } : i;
            });
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fixed));
          } catch {
            /* storage unavailable */
          }
          setItems(fixed);
        }
      }
    } catch (err) {
      console.error("Failed to validate cart with server", err);
    } finally {
      setIsValidating(false);
    }
  }, [items]);

  useEffect(() => {
    if (!isLoading) {
      void syncCart();
    }
  }, [items, isLoading, syncCart]);

  const addItem = useCallback((variantId: string, quantity = 1) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.variantId === variantId);
      let updated: LocalCartItem[];
      if (existingIndex > -1) {
        updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
      } else {
        updated = [...prev, { variantId, quantity }];
      }
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save cart item", e);
      }
      return updated;
    });
    setIsDrawerOpen(true);
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setItems((prev) => {
      const updated = prev.filter((i) => i.variantId !== variantId);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to remove cart item", e);
      }
      return updated;
    });
  }, []);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(variantId);
      return;
    }
    setItems((prev) => {
      const updated = prev.map((i) =>
        i.variantId === variantId ? { ...i, quantity } : i
      );
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to update cart quantity", e);
      }
      return updated;
    });
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
    setSummary(null);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear cart", e);
    }
  }, []);

  const itemCount = useMemo(
    () => items.reduce((acc, curr) => acc + curr.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        summary,
        isLoading,
        isValidating,
        isDrawerOpen,
        setIsDrawerOpen,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        syncCart,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
