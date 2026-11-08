"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { Permission } from "@/lib/permissions";
import { recordDecantFilling } from "@/lib/inventory";
import { recordPaymentCollectionEntry } from "@/lib/ledger";
import {
  OrderStatus,
  PaymentStatus,
  PaymentVerificationStatus,
  FulfillmentStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function updateOrderStatus(orderId: string, toStatus: OrderStatus, note?: string) {
  const user = await requirePermission(Permission.ORDERS_WRITE);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: toStatus,
        fulfillmentStatus:
          toStatus === OrderStatus.DELIVERED
            ? FulfillmentStatus.FULFILLED
            : toStatus === OrderStatus.CANCELLED
            ? FulfillmentStatus.UNFULFILLED
            : order.fulfillmentStatus,
      },
    });

    await tx.orderStatusEvent.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus,
        note: note || `Status transitioned to ${toStatus} by staff`,
        userId: user.id,
      },
    });
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { success: true };
}

export async function verifyManualPayment(
  paymentId: string,
  approved: boolean,
  rejectedReason?: string
) {
  const user = await requirePermission(Permission.PAYMENTS_VERIFY);

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  });

  if (!payment) {
    throw new Error("Payment record not found");
  }

  await prisma.$transaction(async (tx) => {
    if (approved) {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentVerificationStatus.APPROVED,
          verifiedByUserId: user.id,
          verifiedAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status:
            payment.order.status === OrderStatus.PENDING
              ? OrderStatus.CONFIRMED
              : payment.order.status,
        },
      });

      // Record in accounting ledger
      try {
        await recordPaymentCollectionEntry(
          {
            orderNumber: payment.order.orderNumber,
            amount: payment.amount,
            method: payment.method,
          },
          user.id,
          tx
        );
      } catch (e) {
        console.error("Ledger recording error:", e);
      }
    } else {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentVerificationStatus.REJECTED,
          rejectedReason: rejectedReason || "Invalid TrxID or mismatched amount",
          verifiedByUserId: user.id,
          verifiedAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: PaymentStatus.FAILED,
        },
      });
    }
  });

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/orders/${payment.orderId}`);
  return { success: true };
}

export async function completeFilling(params: {
  orderItemId: string;
  actualWasteMl?: number;
  notes?: string;
}) {
  const user = await requirePermission(Permission.INVENTORY_FILL);

  const result = await recordDecantFilling({
    orderItemId: params.orderItemId,
    userId: user.id,
    wasteMl: params.actualWasteMl || 0,
    notes: params.notes,
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");
  return { success: true, result };
}

export async function dispatchCourier(params: {
  orderId: string;
  courier: string;
  trackingNumber: string;
  notes?: string;
}) {
  const user = await requirePermission(Permission.ORDERS_WRITE);

  await prisma.$transaction(async (tx) => {
    await tx.shipment.create({
      data: {
        orderId: params.orderId,
        courier: params.courier,
        trackingNumber: params.trackingNumber,
        shippedAt: new Date(),
        notes: params.notes,
      },
    });

    await tx.order.update({
      where: { id: params.orderId },
      data: {
        status: OrderStatus.SHIPPED,
      },
    });

    await tx.orderStatusEvent.create({
      data: {
        orderId: params.orderId,
        toStatus: OrderStatus.SHIPPED,
        note: `Handed over to ${params.courier} (Tracking: ${params.trackingNumber})`,
        userId: user.id,
      },
    });
  });

  revalidatePath(`/admin/orders/${params.orderId}`);
  revalidatePath("/admin/orders");
  return { success: true };
}
