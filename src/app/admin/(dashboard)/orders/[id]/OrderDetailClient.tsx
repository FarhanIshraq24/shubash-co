"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatBDT, formatDhakaDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  updateOrderStatus,
  verifyManualPayment,
  completeFilling,
  dispatchCourier,
} from "../actions";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import {
  ArrowLeft,
  Truck,
  Droplet,
  CheckCircle2,
  Printer,
} from "lucide-react";

export interface SerializedOrderDetail {
  id: string;
  orderNumber: string;
  trackingToken: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  subtotal: string;
  deliveryFee: string;
  discountAmount: string;
  total: string;
  deliveryZone: string | null;
  deliveryNote: string | null;
  createdAt: string;
  customerSnapshot: {
    name?: string;
    phone?: string;
    email?: string;
  } | null;
  addressSnapshot: {
    division?: string;
    district?: string;
    thana?: string;
    fullAddress?: string;
    deliveryNote?: string;
  } | null;
  items: Array<{
    id: string;
    variantId: string | null;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    format: string;
    productName: string;
    brandName: string;
    volumeMl: string | null;
    isFilled: boolean;
    wasteMl: string | null;
  }>;
  payment: {
    id: string;
    method: string;
    amount: string;
    status: string;
    payerNumber: string | null;
    transactionRef: string | null;
    rejectedReason: string | null;
  } | null;
  shipment: {
    courier: string | null;
    trackingNumber: string | null;
    shippedAt: string | null;
  } | null;
  statusEvents: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: string;
  }>;
}

interface OrderDetailClientProps {
  order: SerializedOrderDetail;
}

export function OrderDetailClient({ order: initialOrder }: OrderDetailClientProps) {
  const [order, setOrder] = useState<SerializedOrderDetail>(initialOrder);
  const [isProcessing, setIsProcessing] = useState(false);
  const [courierName, setCourierName] = useState("Steadfast Courier");
  const [trackingNumber, setTrackingNumber] = useState("");

  const handleStatusChange = async (newStatus: OrderStatus) => {
    setIsProcessing(true);
    try {
      await updateOrderStatus(order.id, newStatus);
      setOrder((prev) => ({ ...prev, status: newStatus }));
    } catch {
      alert("Failed to update status");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyPayment = async (approved: boolean) => {
    if (!order.payment) return;
    setIsProcessing(true);
    try {
      await verifyManualPayment(order.payment.id, approved);
      setOrder((prev) => ({
        ...prev,
        paymentStatus: approved ? PaymentStatus.PAID : PaymentStatus.FAILED,
        payment: prev.payment
          ? { ...prev.payment, status: approved ? "APPROVED" : "REJECTED" }
          : null,
      }));
    } catch {
      alert("Failed to verify payment");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFillItem = async (orderItemId: string) => {
    setIsProcessing(true);
    try {
      await completeFilling({
        orderItemId,
        actualWasteMl: 0.1,
        notes: "Filled via sterile glass syringe with teflon plumbers tape seal",
      });
      setOrder((prev) => ({
        ...prev,
        items: prev.items.map((it) =>
          it.id === orderItemId ? { ...it, isFilled: true, wasteMl: "0.100" } : it
        ),
      }));
    } catch {
      alert("Failed to record decant filling");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;

    setIsProcessing(true);
    try {
      await dispatchCourier({
        orderId: order.id,
        courier: courierName,
        trackingNumber: trackingNumber.trim(),
      });
      setOrder((prev) => ({
        ...prev,
        status: OrderStatus.SHIPPED,
        shipment: {
          courier: courierName,
          trackingNumber: trackingNumber.trim(),
          shippedAt: new Date().toISOString(),
        },
      }));
    } catch {
      alert("Failed to dispatch order");
    } finally {
      setIsProcessing(false);
    }
  };

  const allDecantsFilled = order.items
    .filter((i) => i.format === "DECANT")
    .every((i) => i.isFilled);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="p-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono text-[var(--text-strong)]">
                {order.orderNumber}
              </h1>
              <Badge
                variant={
                  order.status === "DELIVERED"
                    ? "success"
                    : order.status === "SHIPPED"
                    ? "info"
                    : order.status === "CANCELLED"
                    ? "error"
                    : "default"
                }
              >
                {order.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Placed on {formatDhakaDate(order.createdAt)} · Public Token:{" "}
              <Link
                href={`/track?token=${order.trackingToken}`}
                target="_blank"
                className="font-mono text-[var(--primary)] hover:underline"
              >
                {order.trackingToken.slice(0, 12)}...
              </Link>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-[var(--radius-md)] border border-[var(--border-control)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-[var(--text-strong)]"
          >
            <Printer className="h-4 w-4" />
            <span>Print Slip</span>
          </button>

          {order.status === "PENDING" && (
            <Button
              variant="primary"
              size="sm"
              disabled={isProcessing}
              onClick={() => handleStatusChange(OrderStatus.CONFIRMED)}
            >
              Confirm Order
            </Button>
          )}

          {order.status === "CONFIRMED" && (
            <Button
              variant="primary"
              size="sm"
              disabled={isProcessing}
              onClick={() => handleStatusChange(OrderStatus.PREPARING)}
            >
              Start Decanting
            </Button>
          )}

          {order.status === "PREPARING" && (
            <Button
              variant="primary"
              size="sm"
              disabled={isProcessing || !allDecantsFilled}
              onClick={() => handleStatusChange(OrderStatus.PACKED)}
            >
              Mark Packed
            </Button>
          )}

          {order.status === "SHIPPED" && (
            <Button
              variant="primary"
              size="sm"
              disabled={isProcessing}
              onClick={() => handleStatusChange(OrderStatus.DELIVERED)}
            >
              Mark Delivered
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Items, Filling Station, Events (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Decanting Filling Station */}
          <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Droplet className="h-5 w-5 text-[var(--primary)]" />
                <h2 className="text-base font-bold text-[var(--text-strong)]">
                  Decanting Station & Item Packing
                </h2>
              </div>
              <Badge variant={allDecantsFilled ? "success" : "warning"}>
                {allDecantsFilled ? "All Decants Filled" : "Filling In Progress"}
              </Badge>
            </div>

            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--surface-subtle)]/30"
                >
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {item.brandName}
                    </span>
                    <h3 className="text-sm font-bold text-[var(--text-strong)]">
                      {item.productName}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.format === "DECANT" ? "default" : "info"}>
                        {item.format === "DECANT" ? `${item.volumeMl}ml Decant` : "Full Bottle"}
                      </Badge>
                      <span className="text-xs text-[var(--text-muted)]">
                        Qty: <strong className="text-[var(--text-strong)]">{item.quantity}</strong> × {formatBDT(item.unitPrice)} = {formatBDT(item.totalPrice)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {item.format === "DECANT" ? (
                      item.isFilled ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--status-success)]">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Filled (waste: {item.wasteMl}ml)</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isProcessing}
                          onClick={() => handleFillItem(item.id)}
                          className="flex items-center gap-1.5"
                        >
                          <Droplet className="h-3.5 w-3.5" />
                          <span>Complete Filling</span>
                        </Button>
                      )
                    ) : (
                      <span className="text-xs font-semibold text-[var(--text-muted)]">
                        Sealed Box Ready
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Courier Dispatch Section */}
          <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-subtle)]">
              <Truck className="h-5 w-5 text-[var(--primary)]" />
              <h2 className="text-base font-bold text-[var(--text-strong)]">Courier Handover</h2>
            </div>

            {order.shipment ? (
              <div className="p-4 rounded-[var(--radius-md)] bg-[#EAF4EE] border border-[#A3D9B5] text-xs sm:text-sm text-[#2D6A4F] flex items-center justify-between">
                <div>
                  <p className="font-bold">Handed over to {order.shipment.courier}</p>
                  <p className="font-mono pt-0.5">Tracking / Consignment ID: {order.shipment.trackingNumber}</p>
                </div>
                <Badge variant="success">Shipped</Badge>
              </div>
            ) : (
              <form onSubmit={handleDispatch} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-strong)] block mb-1">
                    Courier Partner
                  </label>
                  <select
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-[var(--surface)] border border-[var(--border-control)] rounded-[var(--radius-md)] focus:outline-none"
                  >
                    <option value="Steadfast Courier">Steadfast Courier (Nationwide)</option>
                    <option value="Pathao Courier">Pathao Courier (Dhaka / Fast)</option>
                    <option value="RedX Logistics">RedX Logistics</option>
                    <option value="In-house Messenger">In-house Messenger</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-strong)] block mb-1">
                    Consignment ID / Trx
                  </label>
                  <input
                    type="text"
                    required
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="e.g. STDF-89421"
                    className="w-full h-10 px-3 text-xs bg-[var(--surface)] border border-[var(--border-control)] rounded-[var(--radius-md)] focus:outline-none font-mono"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isProcessing}
                    className="w-full h-10 text-xs font-bold"
                  >
                    Dispatch Order
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Customer Info, Payment Status, Totals (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Customer & Address */}
          <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-[var(--text-strong)] uppercase tracking-wider pb-2 border-b border-[var(--border-subtle)]">
              Customer Information
            </h3>

            <div className="text-xs space-y-1.5 text-[var(--text-secondary)]">
              <p className="text-sm font-bold text-[var(--text-strong)]">
                {order.customerSnapshot?.name}
              </p>
              <p className="font-mono">{order.customerSnapshot?.phone}</p>
              {order.customerSnapshot?.email && <p>{order.customerSnapshot.email}</p>}

              <div className="pt-2 text-[var(--text-strong)]">
                <p className="font-semibold">{order.addressSnapshot?.fullAddress}</p>
                <p>
                  {order.addressSnapshot?.thana}, {order.addressSnapshot?.district}
                </p>
                <p>{order.addressSnapshot?.division}</p>
              </div>

              {order.deliveryNote && (
                <div className="pt-2 p-2 rounded bg-[var(--surface-subtle)] text-[11px] italic">
                  Note: &quot;{order.deliveryNote}&quot;
                </div>
              )}
            </div>
          </div>

          {/* Payment Verification Queue */}
          <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <h3 className="text-xs font-bold text-[var(--text-strong)] uppercase tracking-wider">
                Payment Verification
              </h3>
              <Badge
                variant={
                  order.paymentStatus === "PAID"
                    ? "success"
                    : order.paymentStatus === "FAILED"
                    ? "error"
                    : "warning"
                }
              >
                {order.paymentStatus}
              </Badge>
            </div>

            <div className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Method</span>
                <strong className="text-[var(--text-strong)]">{order.paymentMethod}</strong>
              </div>

              {order.payment?.transactionRef && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Transaction ID</span>
                  <strong className="font-mono text-[var(--text-strong)]">
                    {order.payment.transactionRef}
                  </strong>
                </div>
              )}

              {order.payment?.payerNumber && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Sender Phone</span>
                  <span className="font-mono">{order.payment.payerNumber}</span>
                </div>
              )}

              {order.paymentStatus === "PENDING_VERIFICATION" && (
                <div className="pt-3 border-t border-[var(--border-subtle)] flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={isProcessing}
                    onClick={() => handleVerifyPayment(true)}
                    className="flex-1"
                  >
                    Approve Payment
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isProcessing}
                    onClick={() => handleVerifyPayment(false)}
                    className="flex-1 text-[var(--status-error)]"
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Order Financials */}
          <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-xs space-y-3 text-xs sm:text-sm">
            <h3 className="text-xs font-bold text-[var(--text-strong)] uppercase tracking-wider pb-2 border-b border-[var(--border-subtle)]">
              Financial Breakdown
            </h3>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Subtotal</span>
              <span className="font-semibold text-[var(--text-strong)] tabular-nums">
                {formatBDT(order.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Delivery Fee</span>
              <span className="font-semibold text-[var(--text-strong)] tabular-nums">
                {formatBDT(order.deliveryFee)}
              </span>
            </div>
            {Number(order.discountAmount) > 0 && (
              <div className="flex justify-between text-[var(--status-success)] font-semibold">
                <span>Discount</span>
                <span className="tabular-nums">- {formatBDT(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-[var(--text-strong)] pt-2 border-t border-[var(--border-subtle)]">
              <span>Grand Total</span>
              <span className="tabular-nums text-lg">{formatBDT(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
