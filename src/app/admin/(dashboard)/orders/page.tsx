import React from "react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { Permission } from "@/lib/permissions";
import { OrdersClient, SerializedOrder } from "./OrdersClient";

export const metadata = {
  title: "Orders & Fulfillment | Shubash & Co. Admin",
};

export default async function AdminOrdersPage() {
  await requirePermission(Permission.ORDERS_READ);

  let ordersRaw: SerializedOrder[] = [];

  try {
    const dbOrders = await prisma.order.findMany({
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    ordersRaw = dbOrders.map((o) => {
      const cust = o.customerSnapshot as { name?: string; phone?: string } | null;
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        trackingToken: o.trackingToken,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        subtotal: o.subtotal.toString(),
        deliveryFee: o.deliveryFee.toString(),
        total: o.total.toString(),
        deliveryZone: o.deliveryZone,
        customerName: cust?.name || "Customer",
        customerPhone: cust?.phone || "—",
        itemCount: o.items.reduce((acc, i) => acc + i.quantity, 0),
        createdAt: o.createdAt.toISOString(),
      };
    });
  } catch {
    // Database empty or not migrated
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-[var(--border-subtle)]">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-strong)]">
          Customer Orders & Decanting Pipeline
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Process online orders, manage decant filling stations, and dispatch couriers.
        </p>
      </div>

      <OrdersClient orders={ordersRaw} />
    </div>
  );
}
