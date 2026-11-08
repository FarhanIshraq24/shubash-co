import React from "react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { Permission } from "@/lib/permissions";
import { PaymentsClient, SerializedPayment } from "./PaymentsClient";

export const metadata = {
  title: "Payments & Verification | Shubash & Co. Admin",
};

export default async function AdminPaymentsPage() {
  await requirePermission(Permission.PAYMENTS_READ);

  let paymentsRaw: SerializedPayment[] = [];

  try {
    const payments = await prisma.payment.findMany({
      include: {
        order: {
          select: {
            orderNumber: true,
            customerSnapshot: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    paymentsRaw = payments.map((p) => {
      const cust = p.order?.customerSnapshot as { name?: string } | null;
      return {
        id: p.id,
        orderId: p.orderId,
        orderNumber: p.order?.orderNumber || "—",
        method: p.method,
        amount: p.amount.toString(),
        status: p.status,
        payerNumber: p.payerNumber,
        transactionRef: p.transactionRef,
        rejectedReason: p.rejectedReason,
        createdAt: p.createdAt.toISOString(),
        customerName: cust?.name || "Customer",
      };
    });
  } catch {
    // Database empty or not migrated
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-[var(--border-subtle)]">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-strong)]">
          Payment Verification Queue
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Verify manual bKash, Nagad, and Rocket mobile banking transactions against bank statements.
        </p>
      </div>

      <PaymentsClient payments={paymentsRaw} />
    </div>
  );
}
