"use client";

import React, { useState } from "react";
import Image from "next/image";
import { formatBDT, formatVolume } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Droplet,
  Package,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  Check,
  Plus,
  Minus,
  ShoppingBag,
} from "lucide-react";
import { useCart } from "@/context/CartContext";

export interface VariantData {
  id: string;
  sku: string;
  format: "DECANT" | "FULL_BOTTLE" | "BOTH";
  volumeMl: string | number;
  price: string | number;
  compareAtPrice?: string | number | null;
  packagingNote?: string | null;
  maxQty: number;
}

export interface ProductDetailProps {
  product: {
    id: string;
    name: string;
    slug: string;
    brand: { name: string; slug: string; country?: string | null };
    description?: string | null;
    topNotes?: string | null;
    middleNotes?: string | null;
    baseNotes?: string | null;
    concentration?: string | null;
    fragranceFamily?: string | null;
    gender?: string | null;
    format: "DECANT" | "FULL_BOTTLE" | "BOTH";
    images: { url: string; altText?: string | null; isPrimary: boolean }[];
    availableMl: number;
    sealedUnits: number;
    decantVariants: VariantData[];
    fullBottleVariants: VariantData[];
  };
}

export function ProductDetailClient({ product }: ProductDetailProps) {
  // Determine initial format based on availability
  const hasDecants = product.decantVariants.length > 0;
  const hasFullBottles = product.fullBottleVariants.length > 0;

  const decantsInStock = product.decantVariants.some((v) => v.maxQty > 0);
  const [selectedFormat, setSelectedFormat] = useState<"DECANT" | "FULL_BOTTLE">(
    hasDecants && (decantsInStock || !hasFullBottles) ? "DECANT" : "FULL_BOTTLE"
  );

  const currentVariants =
    selectedFormat === "DECANT" ? product.decantVariants : product.fullBottleVariants;

  const firstAvailable = (vs: VariantData[]) => (vs.find((v) => v.maxQty > 0) ?? vs[0])?.id || "";

  const [selectedVariantId, setSelectedVariantId] = useState<string>(firstAvailable(currentVariants));

  const [quantity, setQuantity] = useState<number>(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [addedNotice, setAddedNotice] = useState<boolean>(false);

  // Switch format
  const handleFormatChange = (format: "DECANT" | "FULL_BOTTLE") => {
    setSelectedFormat(format);
    const variants = format === "DECANT" ? product.decantVariants : product.fullBottleVariants;
    if (variants.length > 0) {
      setSelectedVariantId(firstAvailable(variants));
    }
    setQuantity(1);
  };

  const selectedVariant =
    currentVariants.find((v) => v.id === selectedVariantId) || currentVariants[0];

  const { addItem, items: cartItems } = useCart();
  const inCart = cartItems.find((i) => i.variantId === selectedVariant?.id)?.quantity ?? 0;
  const maxQty = selectedVariant?.maxQty ?? 0;
  const canAdd = !!selectedVariant && maxQty > 0 && inCart + quantity <= maxQty;

  const handleAddToCart = () => {
    if (!selectedVariant || !canAdd) return;

    try {
      addItem(selectedVariant.id, quantity);
      setAddedNotice(true);
      setTimeout(() => setAddedNotice(false), 3000);
    } catch {
      // fallback
    }
  };

  // Spray estimate helper
  const getSprayEstimate = (ml: number | string) => {
    const num = typeof ml === "string" ? parseFloat(ml) : ml;
    if (num <= 3) return "~40 to 45 sprays · Skin test";
    if (num <= 5) return "~65 to 70 sprays · 1 to 2 weeks";
    if (num <= 10) return "~130 to 140 sprays · Extended travel size";
    return `~${Math.round(num * 14)} sprays`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
      {/* Left Column: Image Gallery */}
      <div className="space-y-4">
        {/* Main Image Viewport */}
        <div className="relative aspect-square w-full rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] overflow-hidden">
          {product.images.length > 0 ? (
            <Image
              src={product.images[selectedImageIndex]?.url || product.images[0].url}
              alt={product.images[selectedImageIndex]?.altText || product.name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
              <Sparkles className="h-16 w-16 opacity-30" />
            </div>
          )}

          {/* Format badge indicator on image */}
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--surface)]/95 text-[var(--text-strong)] shadow-xs border border-[var(--border-subtle)]">
              {selectedFormat === "DECANT" ? (
                <>
                  <Droplet className="h-3.5 w-3.5 text-[var(--primary)]" />
                  <span>Decant Sample</span>
                </>
              ) : (
                <>
                  <Package className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                  <span>Full Bottle</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Thumbnails */}
        {product.images.length > 1 && (
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedImageIndex(idx)}
                className={`relative h-20 w-20 rounded-[var(--radius-md)] border overflow-hidden shrink-0 transition-all ${
                  selectedImageIndex === idx
                    ? "border-[var(--primary)] ring-2 ring-[var(--focus-ring)]"
                    : "border-[var(--border-subtle)] opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={img.url}
                  alt={img.altText || `Thumbnail ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </button>
            ))}
          </div>
        )}

        {/* Guarantees Box */}
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] p-5 space-y-3 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-3 text-[var(--text-strong)] font-semibold">
            <ShieldCheck className="h-4 w-4 text-[var(--primary)] shrink-0" />
            <span>100% Guaranteed Authentic Perfume Juice</span>
          </div>
          <p className="leading-relaxed">
            Every decant is drawn using dedicated, sterile laboratory instruments directly from original retail bottles. No dilution, no alteration.
          </p>
          <div className="flex items-center gap-4 pt-2 border-t border-[var(--border-subtle)] text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5" />
              <span>Nationwide Courier</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Transit Damage Covered</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Product Info & Variant Selection */}
      <div className="space-y-6">
        {/* Brand & Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              {product.brand.name}
            </span>
            {product.brand.country && (
              <span className="text-xs text-[var(--text-muted)]">
                · {product.brand.country}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--text-strong)]">
            {product.name}
          </h1>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {product.concentration && (
              <Badge variant="outline">{product.concentration}</Badge>
            )}
            {product.fragranceFamily && (
              <Badge variant="default">{product.fragranceFamily}</Badge>
            )}
            {product.gender && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                {product.gender}
              </span>
            )}
          </div>
        </div>

        {/* Separate Format Selector: Decant vs Full Bottle */}
        <div className="space-y-2 pt-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-strong)]">
            Choose Presentation Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleFormatChange("DECANT")}
              disabled={!hasDecants}
              className={`p-3.5 rounded-[var(--radius-md)] border text-left transition-all ${
                selectedFormat === "DECANT"
                  ? "border-2 border-[var(--primary)] bg-[var(--surface)] shadow-xs"
                  : "border-[var(--border-control)] bg-[var(--surface-subtle)] opacity-80 hover:opacity-100"
              } ${!hasDecants ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[var(--text-strong)] flex items-center gap-1.5">
                  <Droplet className="h-4 w-4 text-[var(--primary)]" />
                  <span>Decant Sample</span>
                </span>
                {selectedFormat === "DECANT" && (
                  <Check className="h-4 w-4 text-[var(--primary)]" />
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                3ml, 5ml, 10ml in glass atomizer
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleFormatChange("FULL_BOTTLE")}
              disabled={!hasFullBottles}
              className={`p-3.5 rounded-[var(--radius-md)] border text-left transition-all ${
                selectedFormat === "FULL_BOTTLE"
                  ? "border-2 border-[var(--primary)] bg-[var(--surface)] shadow-xs"
                  : "border-[var(--border-control)] bg-[var(--surface-subtle)] opacity-80 hover:opacity-100"
              } ${!hasFullBottles ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[var(--text-strong)] flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-[var(--text-secondary)]" />
                  <span>Full Bottle</span>
                </span>
                {selectedFormat === "FULL_BOTTLE" && (
                  <Check className="h-4 w-4 text-[var(--primary)]" />
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Sealed original retail packaging
              </p>
            </button>
          </div>
        </div>

        {/* Size Chips */}
        {currentVariants.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-strong)]">
                Select Size ({selectedFormat === "DECANT" ? "Decant Volume" : "Bottle Volume"})
              </label>
              {selectedVariant && (
                <span className="text-xs text-[var(--text-secondary)]">
                  {getSprayEstimate(selectedVariant.volumeMl)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {currentVariants.map((variant) => {
                const isSelected = variant.id === selectedVariantId;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => {
                      setSelectedVariantId(variant.id);
                      setQuantity(1);
                    }}
                    className={`p-3 rounded-[var(--radius-md)] border text-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-2 border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                        : "border-[var(--border-control)] bg-[var(--surface)] text-[var(--text-strong)] hover:border-[var(--foreground)]"
                    }`}
                  >
                    <div className={`font-bold text-base leading-tight ${variant.maxQty <= 0 ? "line-through opacity-60" : ""}`}>
                      {formatVolume(variant.volumeMl)}
                    </div>
                    <div
                      className={`text-xs mt-1 tabular-nums ${
                        isSelected ? "text-[var(--primary-foreground)]/90" : "text-[var(--text-secondary)] font-medium"
                      }`}
                    >
                      {variant.maxQty <= 0 ? "Sold out" : formatBDT(variant.price)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Price and Stock Status */}
        {selectedVariant && (
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border-subtle)] flex items-center justify-between">
            <div>
              <div className="text-xs text-[var(--text-secondary)] font-medium">Price (BDT)</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-extrabold text-[var(--text-strong)] tabular-nums">
                  {formatBDT(selectedVariant.price)}
                </span>
                {selectedVariant.compareAtPrice && Number(selectedVariant.compareAtPrice) > Number(selectedVariant.price) && (
                  <span className="text-base text-[var(--text-muted)] line-through tabular-nums">
                    {formatBDT(selectedVariant.compareAtPrice)}
                  </span>
                )}
              </div>
              {selectedVariant.packagingNote && (
                <p className="text-[11px] text-[var(--text-muted)] mt-1">{selectedVariant.packagingNote}</p>
              )}
            </div>

            <div className="text-right">
              {maxQty > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-success)]" />
                  <span>In Stock</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded bg-[var(--status-error-bg)] text-[var(--status-error)] border border-[var(--status-error-border)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-error)]" />
                  <span>Out of Stock</span>
                </span>
              )}
              {maxQty > 0 && maxQty <= 5 && (
                <p className="text-[11px] text-[var(--status-warning)] font-semibold mt-1">Only {maxQty} left</p>
              )}
            </div>
          </div>
        )}

        {/* Quantity & Add to Cart Controls */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-4">
            {/* Quantity Stepper */}
            <div className="flex items-center border border-[var(--border-control)] rounded-[var(--radius-md)] bg-[var(--surface)] h-12">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="px-3.5 h-full text-[var(--text-strong)] hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-bold text-base tabular-nums text-[var(--text-strong)]">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(Math.min(quantity + 1, Math.max(1, maxQty - inCart)))}
                disabled={quantity >= maxQty - inCart}
                className="px-3.5 disabled:opacity-30 h-full text-[var(--text-strong)] hover:bg-[var(--surface-subtle)]"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Add to Cart CTA */}
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={handleAddToCart}
              disabled={!canAdd}
            >
              <ShoppingBag className="h-5 w-5" />
              <span>
                {maxQty <= 0
                  ? "Out of Stock"
                  : inCart >= maxQty
                  ? "Max quantity in cart"
                  : `Add to Cart · ${formatBDT(Number(selectedVariant?.price || 0) * quantity)}`}
              </span>
            </Button>
          </div>

          {addedNotice && (
            <div
              role="status"
              className="p-3 rounded-[var(--radius-md)] bg-[var(--status-success-bg)] border border-[var(--status-success-border)] text-[var(--status-success)] text-xs font-semibold flex items-center justify-between animate-in fade-in"
            >
              <span>Added to your cart!</span>
              <a href="/cart" className="underline font-bold hover:text-black">
                View Cart & Checkout →
              </a>
            </div>
          )}
        </div>

        {/* Olfactory Notes Pyramid */}
        {(product.topNotes || product.middleNotes || product.baseNotes) && (
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-strong)]">
              Fragrance Pyramid & Notes
            </h3>

            <div className="space-y-3 text-sm">
              {product.topNotes && (
                <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)]">
                  <span className="font-bold text-[var(--text-strong)] block text-xs uppercase text-[var(--text-secondary)]">
                    Top Notes (Opening)
                  </span>
                  <span className="text-[var(--text-strong)] font-medium mt-0.5 block">
                    {product.topNotes}
                  </span>
                </div>
              )}

              {product.middleNotes && (
                <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)]">
                  <span className="font-bold text-[var(--text-strong)] block text-xs uppercase text-[var(--text-secondary)]">
                    Heart Notes (Mid)
                  </span>
                  <span className="text-[var(--text-strong)] font-medium mt-0.5 block">
                    {product.middleNotes}
                  </span>
                </div>
              )}

              {product.baseNotes && (
                <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)]">
                  <span className="font-bold text-[var(--text-strong)] block text-xs uppercase text-[var(--text-secondary)]">
                    Base Notes (Dry Down)
                  </span>
                  <span className="text-[var(--text-strong)] font-medium mt-0.5 block">
                    {product.baseNotes}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Product Description */}
        {product.description && (
          <div className="space-y-2 pt-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-strong)]">
              About This Scent
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
