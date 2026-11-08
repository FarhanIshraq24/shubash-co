"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { formatBDT } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Truck,
  Sparkles,
  AlertCircle,
  Tag,
} from "lucide-react";

export function CartClient() {
  const { summary, isLoading, isValidating, updateQuantity, removeItem, syncCart } = useCart();
  const [district, setDistrict] = useState<string>("dhaka");
  const [couponInput, setCouponInput] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<string>("");

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponInput.trim()) {
      setAppliedCoupon(couponInput.trim().toUpperCase());
      void syncCart(district, couponInput.trim().toUpperCase());
    }
  };

  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    void syncCart(newDistrict, appliedCoupon);
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="h-10 w-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-[var(--text-secondary)]">Loading your cart...</p>
      </div>
    );
  }

  const items = summary?.items || [];
  const itemCount = summary?.itemCount || 0;

  if (items.length === 0) {
    return (
      <div className="py-24 text-center space-y-6 max-w-md mx-auto">
        <div className="h-20 w-20 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
          <ShoppingBag className="h-10 w-10 opacity-60" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-[var(--text-strong)]">Your fragrance bag is empty</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Explore authentic niche & designer decants or full bottles to begin your olfactory journey.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/products?format=DECANT">
            <Button variant="primary">Explore Decants (from ৳250)</Button>
          </Link>
          <Link href="/products?format=FULL_BOTTLE">
            <Button variant="secondary">Browse Full Bottles</Button>
          </Link>
        </div>
      </div>
    );
  }

  const subtotalNum = parseFloat(summary?.subtotal || "0");
  const freeThresholdNum = parseFloat(summary?.freeDeliveryThreshold || "4000");
  const amountToFree = Math.max(0, freeThresholdNum - subtotalNum);
  const progressPercent = Math.min(100, Math.round((subtotalNum / freeThresholdNum) * 100));

  return (
    <div className="space-y-8">
      {/* Free Delivery Bar */}
      <div className="p-4 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border-subtle)] space-y-2 shadow-xs">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="font-semibold text-[var(--text-strong)] flex items-center gap-2">
            <Truck className="h-4 w-4 text-[var(--primary)]" />
            {amountToFree === 0 ? (
              <span className="text-[var(--status-success)] font-bold">
                🎉 Congratulations! You unlocked Free Nationwide Delivery!
              </span>
            ) : (
              <span>
                Add <strong className="text-[var(--text-strong)]">{formatBDT(amountToFree)}</strong> more for{" "}
                <strong className="text-[var(--status-success)]">Free Delivery</strong> anywhere in Bangladesh!
              </span>
            )}
          </span>
          <span className="text-xs font-bold text-[var(--text-muted)]">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full bg-[var(--surface-subtle)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--primary)] rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cart Items List (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <h2 className="text-lg font-bold text-[var(--text-strong)]">
              Items in Bag ({itemCount})
            </h2>
            {isValidating && (
              <span className="text-xs text-[var(--text-muted)] animate-pulse">
                Updating prices & stock...
              </span>
            )}
          </div>

          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.variantId}
                className="flex flex-col sm:flex-row gap-4 p-4 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] transition-shadow hover:shadow-xs"
              >
                {/* Product Thumbnail */}
                <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] shrink-0 overflow-hidden border border-[var(--border-subtle)]">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.productName}
                      fill
                      className="object-cover"
                      sizes="112px"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[var(--text-muted)]">
                      <Sparkles className="h-8 w-8 opacity-40" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                          {item.brandName}
                        </span>
                        <Link
                          href={`/products/${item.slug}`}
                          className="block text-base font-bold text-[var(--text-strong)] hover:underline"
                        >
                          {item.productName}
                        </Link>
                      </div>
                      <span className="text-base sm:text-lg font-bold text-[var(--text-strong)] tabular-nums">
                        {formatBDT(item.subtotal)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                      <Badge variant={item.format === "DECANT" ? "default" : "info"}>
                        {item.format === "DECANT" ? `Decant ${item.volumeMl}ml` : `Full Bottle ${item.volumeMl}ml`}
                      </Badge>
                      <span className="text-xs text-[var(--text-muted)]">
                        {formatBDT(item.priceEach)} each
                      </span>
                    </div>

                    {item.note && (
                      <p className="text-xs text-[var(--status-warning)] font-semibold flex items-center gap-1 pt-1">
                        <AlertCircle className="h-3 w-3" />
                        {item.note}
                      </p>
                    )}
                  </div>

                  {/* Quantity and Actions */}
                  <div className="flex items-center justify-between pt-4 mt-2 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--border-control)] bg-[var(--surface)]">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                        className="p-1.5 hover:bg-[var(--surface-subtle)] text-[var(--text-strong)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="px-3 text-sm font-bold text-[var(--text-strong)] tabular-nums min-w-[32px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                        className="p-1.5 hover:bg-[var(--surface-subtle)] text-[var(--text-strong)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.variantId)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--status-error)] hover:underline min-h-[36px] px-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Guarantees Reminder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border-subtle)] flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[var(--status-success)] shrink-0" />
              <div className="text-xs">
                <strong className="block text-[var(--text-strong)] font-bold">100% Authentic Always</strong>
                <span className="text-[var(--text-muted)]">Hand-decanted from verified genuine bottles</span>
              </div>
            </div>
            <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border-subtle)] flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-[var(--primary)] shrink-0" />
              <div className="text-xs">
                <strong className="block text-[var(--text-strong)] font-bold">Teflon Seal Protection</strong>
                <span className="text-[var(--text-muted)]">Zero leakage guaranteed during courier transit</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] space-y-6 shadow-xs">
            <h3 className="text-lg font-bold text-[var(--text-strong)] pb-3 border-b border-[var(--border-subtle)]">
              Order Summary
            </h3>

            {/* Delivery Destination Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-strong)] uppercase tracking-wider block">
                Delivery Location
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDistrictChange("dhaka")}
                  className={`p-2.5 text-xs font-bold rounded-[var(--radius-md)] border transition-colors text-center ${
                    district === "dhaka"
                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "border-[var(--border-control)] bg-[var(--surface)] text-[var(--text-strong)] hover:bg-[var(--surface-subtle)]"
                  }`}
                >
                  Inside Dhaka (৳80)
                </button>
                <button
                  type="button"
                  onClick={() => handleDistrictChange("outside-dhaka")}
                  className={`p-2.5 text-xs font-bold rounded-[var(--radius-md)] border transition-colors text-center ${
                    district === "outside-dhaka"
                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "border-[var(--border-control)] bg-[var(--surface)] text-[var(--text-strong)] hover:bg-[var(--surface-subtle)]"
                  }`}
                >
                  Outside Dhaka (৳150)
                </button>
              </div>
            </div>

            {/* Promo Code Input */}
            <form onSubmit={handleApplyCoupon} className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-strong)] uppercase tracking-wider block">
                Coupon / Promo Code
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="e.g. WELCOME10"
                    className="w-full h-10 px-3 pl-8 text-sm uppercase font-semibold bg-[var(--surface)] border border-[var(--border-control)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  />
                  <Tag className="absolute left-2.5 top-3 h-4 w-4 text-[var(--text-muted)]" />
                </div>
                <Button type="submit" variant="secondary" size="sm">
                  Apply
                </Button>
              </div>
              {appliedCoupon && (
                <p className="text-xs font-semibold text-[var(--status-success)]">
                  Coupon {appliedCoupon} active
                </p>
              )}
            </form>

            {/* Line Item Totals */}
            <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)] text-sm">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Subtotal</span>
                <span className="font-semibold text-[var(--text-strong)] tabular-nums">
                  {summary?.subtotalFormatted}
                </span>
              </div>

              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Delivery Fee</span>
                <span className="font-semibold text-[var(--text-strong)] tabular-nums">
                  {summary?.deliveryFeeFormatted}
                </span>
              </div>

              {parseFloat(summary?.discount || "0") > 0 && (
                <div className="flex justify-between text-[var(--status-success)] font-semibold">
                  <span>Coupon Discount</span>
                  <span className="tabular-nums">- {summary?.discountFormatted}</span>
                </div>
              )}

              <div className="flex justify-between text-base sm:text-lg font-bold text-[var(--text-strong)] pt-3 border-t border-[var(--border-subtle)]">
                <span>Total Amount</span>
                <span className="tabular-nums text-[20px]">{summary?.totalFormatted}</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                All prices include applicable VAT. Handled with love in Dhaka.
              </p>
            </div>

            {/* Checkout CTA */}
            <div className="pt-2">
              <Link href={`/checkout?district=${district}${appliedCoupon ? `&coupon=${appliedCoupon}` : ""}`}>
                <Button variant="primary" size="lg" className="w-full flex items-center justify-center gap-2">
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
