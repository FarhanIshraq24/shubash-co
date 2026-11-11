import { NextRequest, NextResponse } from "next/server";
import { validateCart, LocalCartItem } from "@/lib/cart";

/**
 * POST /api/cart/validate
 * Body: { items: LocalCartItem[], district?: string, coupon?: string }
 * Returns a fully-validated CartSummary with live prices & stock states.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      items?: LocalCartItem[];
      district?: string;
      coupon?: string;
    };

    const items: LocalCartItem[] = Array.isArray(body.items)
      ? body.items.map((i) => ({
          variantId: String(i.variantId),
          quantity: Math.max(1, Math.min(Number(i.quantity) || 1, 99)),
        }))
      : [];

    const summary = await validateCart(items, body.district, body.coupon);

    // Serialise Decimal fields to strings for JSON transport
    return NextResponse.json({
      items: summary.items.map((item) => ({
        ...item,
        volumeMl: item.volumeMl?.toString() ?? null,
        priceEach: item.priceEach.toString(),
        subtotal: item.subtotal.toString(),
      })),
      subtotal: summary.subtotal.toString(),
      deliveryFee: summary.deliveryFee.toString(),
      discount: summary.discount.toString(),
      total: summary.total.toString(),
      subtotalFormatted: summary.subtotalFormatted,
      deliveryFeeFormatted: summary.deliveryFeeFormatted,
      discountFormatted: summary.discountFormatted,
      totalFormatted: summary.totalFormatted,
      freeDeliveryThreshold: summary.freeDeliveryThreshold?.toString() ?? null,
      freeDeliveryEligible: summary.freeDeliveryEligible,
      itemCount: summary.itemCount,
      couponCode: summary.couponCode,
      couponError: summary.couponError,
    });
  } catch (err) {
    console.error("[cart/validate]", err);
    return NextResponse.json({ error: "Cart validation failed" }, { status: 500 });
  }
}
