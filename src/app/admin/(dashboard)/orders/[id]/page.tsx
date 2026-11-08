import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { Permission } from "@/lib/permissions";
import { OrderDetailClient, SerializedOrderDetail } from "./OrderDetailClient";

interface AdminOrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata = {
  title: "Order Details | Shubash & Co. Admin",
};

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  await requirePermission(Permission.ORDERS_READ);
  const { id } = await params;

  let order = null;
  try {
    order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            production: true,
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        shipments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        statusEvents: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
  } catch {
    // Database empty or not migrated
  }

  if (!order) {
    notFound();
  }

  const latestPayment = order.payments[0] || null;
  const latestShipment = order.shipments[0] || null;

  const serialized: SerializedOrderDetail = {
    id: order.id,
    orderNumber: order.orderNumber,
    trackingToken: order.trackingToken,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    subtotal: order.subtotal.toString(),
    deliveryFee: order.deliveryFee.toString(),
    discountAmount: order.discountAmount.toString(),
    total: order.total.toString(),
    deliveryZone: order.deliveryZone,
    deliveryNote: order.deliveryNote,
    createdAt: order.createdAt.toISOString(),
    customerSnapshot: order.customerSnapshot as { name?: string; phone?: string; email?: string } | null,
    addressSnapshot: order.addressSnapshot as {
      division?: string;
      district?: string;
      thana?: string;
      fullAddress?: string;
      deliveryNote?: string;
    } | null,
    items: order.items.map((i) => {
      const snap = i.variantSnapshot as {
        productName?: string;
        brandName?: string;
        format?: string;
        volumeMl?: string;
      } | null;

      return {
        id: i.id,
        variantId: i.variantId,
        quantity: i.quantity,
        unitPrice: i.unitPrice.toString(),
        totalPrice: i.totalPrice.toString(),
        format: snap?.format || "DECANT",
        productName: snap?.productName || "Fragrance Item",
        brandName: snap?.brandName || "Brand",
        volumeMl: snap?.volumeMl || null,
        isFilled: Boolean(i.production),
        wasteMl: i.production?.wasteMl.toString() || null,
      };
    }),
    payment: latestPayment
      ? {
          id: latestPayment.id,
          method: latestPayment.method,
          amount: latestPayment.amount.toString(),
          status: latestPayment.status,
          payerNumber: latestPayment.payerNumber,
          transactionRef: latestPayment.transactionRef,
          rejectedReason: latestPayment.rejectedReason,
        }
      : null,
    shipment: latestShipment
      ? {
          courier: latestShipment.courier,
          trackingNumber: latestShipment.trackingNumber,
          shippedAt: latestShipment.shippedAt ? latestShipment.shippedAt.toISOString() : null,
        }
      : null,
    statusEvents: order.statusEvents.map((e) => ({
      id: e.id,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      note: e.note,
      createdAt: e.createdAt.toISOString(),
    })),
  };

  return <OrderDetailClient order={serialized} />;
}
