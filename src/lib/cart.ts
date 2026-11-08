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
          images: { take: 1, orderBy: { position: "asc" } },
        },
      },
    },
  });

  const validatedItems: ValidatedCartItem[] = [];

  for (const local of items) {
    const variant = variants.find((v) => v.id === local.variantId);
    if (!variant || !variant.product.active || !variant.active) continue;

    const quantity = Math.max(1, Math.min(local.quantity, 99));
    let maxQty = 0;
    let inStock = false;
    let note: string | null = null;

    if (variant.format === ProductFormat.DECANT) {
      // Liquid availability: check source bottles
      const sourceBottles = await prisma.sourceBottle.findMany({
        where: { productId: variant.product.id, status: SourceBottleStatus.ACTIVE },
        select: { remainingMl: true, reservedMl: true },
      });
      const availableMl = sourceBottles.reduce(
        (sum, sb) => sum.plus(new Decimal(sb.remainingMl.toString()).minus(new Decimal(sb.reservedMl.toString()))),
        new Decimal(0)
      );
      const decantVolume = variant.volumeMl ? new Decimal(variant.volumeMl.toString()) : new Decimal(0);
      if (decantVolume.gt(0)) {
        maxQty = Math.floor(availableMl.div(decantVolume).toNumber());
        inStock = maxQty > 0;
        if (inStock && maxQty < 5) {
          note = `Only ${maxQty} decants available at this size`;
        }
      }
    } else {
      // Full bottle: check sealed stock
      const sealed = await prisma.sealedBottle.findMany({
        where: { productId: variant.product.id, quantity: { gt: 0 } },
        select: { quantity: true },
      });
      maxQty = sealed.reduce((sum, s) => sum + s.quantity, 0);
      inStock = maxQty > 0;
      if (inStock && maxQty <= 3) {
        note = `Only ${maxQty} left in stock`;
      }
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

  const subtotal = validatedItems.reduce((s, i) => s.plus(i.subtotal), new Decimal(0));

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
  const deliveryFee = freeDeliveryEligible ? new Decimal(0) : baseFee;

  // Coupon discount
  let discount = new Decimal(0);
  if (couponCode && couponCode.trim()) {
    try {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: couponCode.toUpperCase().trim(),
          active: true,
          OR: [
            { endAt: null },
            { endAt: { gte: new Date() } },
          ],
        },
      });
      if (coupon) {
        if (coupon.type === "PERCENT") {
          discount = subtotal.mul(new Decimal(coupon.value.toString()).div(100)).toDecimalPlaces(2);
        } else {
          discount = Decimal.min(new Decimal(coupon.value.toString()), subtotal);
        }
      }
    } catch {
      // Coupon validation failed silently
    }
  }

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
  };
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
  };
}
