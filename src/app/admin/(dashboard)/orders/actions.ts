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
  ReservationStatus,
  StockMovementType,
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
  if (order.status === toStatus) return { success: true };
  if (order.status === OrderStatus.CANCELLED) {
    throw new Error("This order is cancelled and its stock has been released. It cannot be reopened.");
  }

  await prisma.$transaction(async (tx) => {
    // Cancelling returns all still-reserved stock to inventory
    if (toStatus === OrderStatus.CANCELLED) {
      const reservations = await tx.stockReservation.findMany({
        where: { status: ReservationStatus.ACTIVE, orderItem: { orderId } },
      });
      for (const r of reservations) {
        await tx.stockReservation.update({
          where: { id: r.id },
          data: { status: ReservationStatus.RELEASED, releasedAt: new Date() },
        });
        await tx.sourceBottle.update({
          where: { id: r.sourceBottleId },
          data: { reservedMl: { decrement: r.volumeMl } },
        });
        await tx.stockMovement.create({
          data: {
            type: StockMovementType.UNRESERVE,
            sourceBottleId: r.sourceBottleId,
            quantityMl: r.volumeMl,
            orderId,
            referenceId: r.id,
            referenceType: "StockReservation",
            note: `Released ${r.volumeMl}ml — Order ${order.orderNumber} cancelled`,
            createdByUserId: user.id,
          },
        });
      }

      // Sealed bottles were decremented at checkout; put them back unless already shipped
      const shippedStates: OrderStatus[] = [OrderStatus.SHIPPED, OrderStatus.DELIVERED];
      if (!shippedStates.includes(order.status)) {
        const sealedReserves = await tx.stockMovement.findMany({
          where: { orderId, type: StockMovementType.RESERVE, sealedBottleId: { not: null } },
        });
        for (const m of sealedReserves) {
          await tx.sealedBottle.update({
            where: { id: m.sealedBottleId! },
            data: { quantity: { increment: m.quantityUnits ?? 0 } },
          });
          await tx.stockMovement.create({
            data: {
              type: StockMovementType.UNRESERVE,
              sealedBottleId: m.sealedBottleId,
              quantityUnits: m.quantityUnits,
              orderId,
              note: `Returned ${m.quantityUnits} sealed bottle(s) to stock — Order ${order.orderNumber} cancelled`,
              createdByUserId: user.id,
            },
          });
        }
      }
    }

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
        ...(toStatus === OrderStatus.CANCELLED
          ? { cancelledAt: new Date(), cancelReason: note || "Cancelled by staff" }
          : {}),
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
  }, { timeout: 30000, maxWait: 10000 });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");
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
