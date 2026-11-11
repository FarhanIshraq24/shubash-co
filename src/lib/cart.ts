/**
 * cart.ts — Server-Side Cart Validation Engine
 *
 * Client stores item references in localStorage.
 * On every sync the server validates: price, stock availability, variant existence.
 * Delivery fee is computed here from DeliveryZone settings stored in DB.
 */

import { prisma } from "@/lib/prisma";
import { formatBDT } from "@/lib/utils";
import Decimal from "decimal.js";
import { ProductFormat, SourceBottleStatus } from "@prisma/client";

export interface LocalCartItem {
  variantId: string;
  quantity: number;
}

export interface ValidatedCartItem {
  variantId: string;
  productId: string;
  productName: string;
  brandName: string;
  slug: string;
  format: ProductFormat;
  volumeMl: Decimal | null;
  priceEach: Decimal;
  quantity: number;
  subtotal: Decimal;
  imageUrl: string | null;
  // Stock state
  inStock: boolean;
  maxQty: number;
  note: string | null; // e.g. "Only 2ml available"
}

export interface CartSummary {
  items: ValidatedCartItem[];
  subtotal: Decimal;
  deliveryFee: Decimal;
  discount: Decimal;
  total: Decimal;
  // Formatted strings
  subtotalFormatted: string;
  deliveryFeeFormatted: string;
  discountFormatted: string;
  totalFormatted: string;
  freeDeliveryThreshold: Decimal | null;
  freeDeliveryEligible: boolean;
  itemCount: number;
  couponId: string | null;
  couponCode: string | null;
  couponError: string | null;
}

/** Default delivery fees — overridden by DeliveryZone rows in DB */
const DEFAULT_DHAKA_FEE = new Decimal(80);
const DEFAULT_OUTSIDE_FEE = new Decimal(150);
const DEFAULT_FREE_THRESHOLD = new Decimal(4000);

/**
 * Validate a list of local cart items against live DB prices and stock.
 * @param items - Raw items from localStorage
 * @param districtSlug - e.g. "dhaka" | "outside-dhaka" for zone lookup
 * @param couponCode - Optional coupon to validate
 */
export async function validateCart(
  items: LocalCartItem[],
  districtSlug?: string,
  couponCode?: string
): Promise<CartSummary> {
  if (!items.length) {
    return emptyCart();
  }

  const variantIds = items.map((i) => i.variantId);

  // Load all variants with live product+brand info
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: {
      product: {
        include: {
          brand: true,
          images: { take: 1, orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
        },
      },
    },
  });

  // Load stock for all products in one go (avoids a query per cart line)
  const productIds = [...new Set(variants.map((v) => v.product.id))];
  const [sourceBottles, sealedBottles] = await Promise.all([
    prisma.sourceBottle.findMany({
      where: { productId: { in: productIds }, status: SourceBottleStatus.ACTIVE },
      select: { productId: true, remainingMl: true, reservedMl: true },
    }),
    prisma.sealedBottle.findMany({
      where: { productId: { in: productIds }, quantity: { gt: 0 } },
      select: { productId: true, volumeMl: true, quantity: true },
    }),
  ]);

  const validatedItems: ValidatedCartItem[] = [];

  for (const local of items) {
    const variant = variants.find((v) => v.id === local.variantId);
    if (!variant || !variant.product.active || !variant.active) continue;

    const quantity = Math.max(1, Math.min(local.quantity, 99));
    const { maxQty } = computeVariantStock(variant, sourceBottles, sealedBottles);
    const inStock = maxQty > 0;
    let note: string | null = null;
    if (!inStock) {
      note = "Out of stock";
    } else if (local.quantity > maxQty) {
      note = `Only ${maxQty} available — quantity adjusted`;
    } else if (variant.format === ProductFormat.DECANT && maxQty < 5) {
      note = `Only ${maxQty} decant${maxQty === 1 ? "" : "s"} left at this size`;
    } else if (variant.format !== ProductFormat.DECANT && maxQty <= 3) {
      note = `Only ${maxQty} left in stock`;
    }

    const qty = Math.min(quantity, Math.max(maxQty, 1));
    const priceEach = new Decimal(variant.price.toString());
    const subtotal = priceEach.mul(qty);

    validatedItems.push({
      variantId: variant.id,
      productId: variant.product.id,
      productName: variant.product.name,
      brandName: variant.product.brand.name,
      slug: variant.product.slug,
      format: variant.format,
      volumeMl: variant.volumeMl ? new Decimal(variant.volumeMl.toString()) : null,
      priceEach,
      quantity: qty,
      subtotal,
      imageUrl: variant.product.images[0]?.url || null,
      inStock,
      maxQty,
      note,
    });
  }

  // Out-of-stock lines are shown in the cart but not charged
  const subtotal = validatedItems
    .filter((i) => i.inStock)
    .reduce((s, i) => s.plus(i.subtotal), new Decimal(0));

  // Delivery fee from DB zone settings
  let dhakaFee = DEFAULT_DHAKA_FEE;
  let outsideFee = DEFAULT_OUTSIDE_FEE;
  let freeThreshold = DEFAULT_FREE_THRESHOLD;

  try {
    const deliverySetting = await prisma.setting.findUnique({
      where: { key: "delivery_fees" },
    });
    if (deliverySetting && typeof deliverySetting.value === "object" && deliverySetting.value !== null) {
      const val = deliverySetting.value as { dhaka?: number; outside?: number; freeAbove?: number };
      if (val.dhaka) dhakaFee = new Decimal(val.dhaka);
      if (val.outside) outsideFee = new Decimal(val.outside);
      if (val.freeAbove) freeThreshold = new Decimal(val.freeAbove);
    }
  } catch {
    // Use defaults if DB not available
  }

  const isOutside = districtSlug && districtSlug !== "dhaka";
  const baseFee = isOutside ? outsideFee : dhakaFee;
  const freeDeliveryEligible = subtotal.gte(freeThreshold);
  let deliveryFee = freeDeliveryEligible || validatedItems.length === 0 ? new Decimal(0) : baseFee;

  // Coupon discount
  let discount = new Decimal(0);
  let couponId: string | null = null;
  let appliedCode: string | null = null;
  let couponError: string | null = null;
  let freeDeliveryFromCoupon = false;
  if (couponCode && couponCode.trim()) {
    try {
      const now = new Date();
      const coupon = await prisma.coupon.findFirst({
        where: { code: couponCode.toUpperCase().trim(), active: true },
      });
      if (!coupon) {
        couponError = "This coupon code is not valid.";
      } else if (coupon.startAt && coupon.startAt > now) {
        couponError = "This coupon is not active yet.";
      } else if (coupon.endAt && coupon.endAt < now) {
        couponError = "This coupon has expired.";
      } else if (coupon.totalLimit !== null && coupon.timesUsed >= coupon.totalLimit) {
        couponError = "This coupon has reached its usage limit.";
      } else if (coupon.minOrderAmount && subtotal.lt(coupon.minOrderAmount.toString())) {
        couponError = `Minimum order of ${formatBDT(coupon.minOrderAmount.toString())} required for this coupon.`;
      } else {
        if (coupon.type === "PERCENT") {
          discount = subtotal.mul(new Decimal(coupon.value.toString()).div(100)).toDecimalPlaces(2);
        } else {
          discount = new Decimal(coupon.value.toString());
        }
        if (coupon.maxDiscount) discount = Decimal.min(discount, new Decimal(coupon.maxDiscount.toString()));
        discount = Decimal.min(discount, subtotal);
        freeDeliveryFromCoupon = coupon.freeDelivery;
        couponId = coupon.id;
        appliedCode = coupon.code;
      }
    } catch {
      couponError = "Could not validate coupon right now.";
    }
  }
  if (freeDeliveryFromCoupon) deliveryFee = new Decimal(0);

  const total = subtotal.plus(deliveryFee).minus(discount);

  return {
    items: validatedItems,
    subtotal,
    deliveryFee,
    discount,
    total,
    subtotalFormatted: formatBDT(subtotal),
    deliveryFeeFormatted: deliveryFee.isZero() ? "FREE" : formatBDT(deliveryFee),
    discountFormatted: formatBDT(discount),
    totalFormatted: formatBDT(total),
    freeDeliveryThreshold: freeThreshold,
    freeDeliveryEligible,
    itemCount: validatedItems.reduce((s, i) => s + i.quantity, 0),
    couponId,
    couponCode: appliedCode,
    couponError,
  };
}

/**
 * How many units of a variant can be sold right now.
 *  - DECANT: one order line is filled from a single source bottle, so the
 *    limit is the best single bottle's available ml ÷ decant size.
 *  - FULL_BOTTLE: sealed units of the same bottle size.
 */
export function computeVariantStock(
  variant: { format: ProductFormat; volumeMl: Decimal.Value | { toString(): string }; product: { id: string } },
  sourceBottles: { productId: string; remainingMl: { toString(): string }; reservedMl: { toString(): string } }[],
  sealedBottles: { productId: string; volumeMl: { toString(): string }; quantity: number }[]
): { maxQty: number } {
  const vol = new Decimal(variant.volumeMl.toString());
  if (vol.lte(0)) return { maxQty: 0 };

  if (variant.format === ProductFormat.DECANT) {
    const best = sourceBottles
      .filter((b) => b.productId === variant.product.id)
      .reduce((max, b) => {
        const avail = new Decimal(b.remainingMl.toString()).minus(b.reservedMl.toString());
        return avail.gt(max) ? avail : max;
      }, new Decimal(0));
    return { maxQty: Math.max(0, Math.floor(best.div(vol).toNumber())) };
  }

  const units = sealedBottles
    .filter((b) => b.productId === variant.product.id && new Decimal(b.volumeMl.toString()).eq(vol))
    .reduce((sum, b) => sum + b.quantity, 0);
  return { maxQty: units };
}

function emptyCart(): CartSummary {
  const zero = new Decimal(0);
  return {
    items: [],
    subtotal: zero,
    deliveryFee: zero,
    discount: zero,
    total: zero,
    subtotalFormatted: formatBDT(0),
    deliveryFeeFormatted: formatBDT(0),
    discountFormatted: formatBDT(0),
    totalFormatted: formatBDT(0),
    freeDeliveryThreshold: DEFAULT_FREE_THRESHOLD,
    freeDeliveryEligible: false,
    itemCount: 0,
    couponId: null,
    couponCode: null,
    couponError: null,
  };
}
