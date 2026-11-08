"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatBDT, formatDhakaDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { verifyManualPayment } from "../orders/actions";
import {
  Search,
  CreditCard,
} from "lucide-react";

export interface SerializedPayment {
  id: string;
  orderId: string;
  orderNumber: string;
  method: string;
  amount: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  payerNumber: string | null;
  transactionRef: string | null;
  rejectedReason: string | null;
  createdAt: string;
  customerName: string;
}

interface PaymentsClientProps {
  payments: SerializedPayment[];
}

export function PaymentsClient({ payments: initialPayments }: PaymentsClientProps) {
  const [payments, setPayments] = useState<SerializedPayment[]>(initialPayments);
  const [filter, setFilter] = useState<string>("PENDING");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filtered = payments.filter((p) => {
    const matchesFilter = filter === "ALL" || p.status === filter;
    const matchesSearch =
      !search ||
      p.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (p.transactionRef && p.transactionRef.toLowerCase().includes(search.toLowerCase())) ||
      (p.payerNumber && p.payerNumber.includes(search)) ||
      p.customerName.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleAction = async (paymentId: string, approved: boolean) => {
    setProcessingId(paymentId);
    try {
      await verifyManualPayment(paymentId, approved);
      setPayments((prev) =>
        prev.map((p) =>
          p.id === paymentId ? { ...p, status: approved ? "APPROVED" : "REJECTED" } : p
        )
      );
    } catch {
      alert("Failed to process payment verification");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border-subtle)]">
          {["PENDING", "APPROVED", "REJECTED", "ALL"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors ${
                filter === tab
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--text-strong)] hover:bg-[var(--surface-subtle)]"
              }`}
            >
              {tab === "PENDING"
                ? "Needs Verification"
                : tab === "APPROVED"
                ? "Verified"
                : tab === "REJECTED"
                ? "Rejected"
                : "All Payments"}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search TrxID, order #, phone..."
            className="w-full h-10 pl-9 pr-3 text-xs bg-[var(--surface)] border border-[var(--border-control)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] space-y-3">
          <CreditCard className="h-10 w-10 text-[var(--text-muted)] mx-auto opacity-50" />
          <h3 className="text-base font-bold text-[var(--text-strong)]">No payments in this queue</h3>
          <p className="text-xs text-[var(--text-muted)]">
            When customers submit bKash, Nagad, or Rocket TrxIDs at checkout, they will appear here for staff review.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Payer Phone</TableHead>
              <TableHead>Transaction ID (TrxID)</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono font-bold text-[var(--text-strong)]">
                  <Link href={`/admin/orders/${p.orderId}`} className="hover:underline">
                    {p.orderNumber}
                  </Link>
                </TableCell>
                <TableCell className="text-xs font-semibold text-[var(--text-strong)]">
                  {p.customerName}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs font-bold text-[var(--text-strong)] uppercase">
                    {p.method}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-[var(--text-secondary)]">
                  {p.payerNumber || "—"}
                </TableCell>
                <TableCell className="font-mono font-bold text-xs text-[var(--text-strong)]">
                  {p.transactionRef || "COD"}
                </TableCell>
                <TableCell className="font-bold text-xs tabular-nums text-[var(--text-strong)]">
                  {formatBDT(p.amount)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      p.status === "APPROVED"
                        ? "success"
                        : p.status === "REJECTED"
                        ? "error"
                        : "warning"
                    }
                  >
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-[var(--text-muted)] font-mono whitespace-nowrap">
                  {formatDhakaDate(p.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  {p.status === "PENDING" ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={processingId === p.id}
                        onClick={() => handleAction(p.id, true)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={processingId === p.id}
                        onClick={() => handleAction(p.id, false)}
                        className="text-[var(--status-error)]"
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)] italic">Processed</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
