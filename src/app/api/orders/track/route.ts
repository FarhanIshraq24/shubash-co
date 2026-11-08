import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatBDT } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim();

    if (!query) {
      return NextResponse.json({ error: "Missing tracking query" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { trackingToken: query },
          { orderNumber: { equals: query, mode: "insensitive" } },
        ],
      },
      include: {
        items: true,
        shipments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const customerSnapshot = order.customerSnapshot as { name?: string } | null;
    const addressSnapshot = order.addressSnapshot as { district?: string } | null;
    const latestShipment = order.shipments[0];

    const safeName = customerSnapshot?.name
      ? customerSnapshot.name.split(" ")[0] + " ***"
      : "Customer";

    return NextResponse.json({
      orderNumber: order.orderNumber,
      trackingToken: order.trackingToken,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt.toISOString(),
      recipientName: safeName,
      recipientCity: addressSnapshot?.district || "Bangladesh",
      totalFormatted: formatBDT(order.total),
      courierName: latestShipment?.courier || null,
      courierTrackingNumber: latestShipment?.trackingNumber || null,
      items: order.items.map((item) => {
        const snap = item.variantSnapshot as {
          productName?: string;
          brandName?: string;
          format?: string;
          volumeMl?: string;
        } | null;
        return {
          name: snap?.productName || "Fragrance Item",
          brand: snap?.brandName || "Luxury Brand",
          format: snap?.format || "DECANT",
          volumeMl: snap?.volumeMl || null,
          quantity: item.quantity,
        };
      }),
    });
  } catch (err) {
    console.error("[orders/track]", err);
    return NextResponse.json({ error: "Failed to track order" }, { status: 500 });
  }
}
