import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatBDT, formatDhakaDate } from "@/lib/utils";
import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Truck,
  Sparkles,
} from "lucide-react";

interface OrderPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    token?: string;
  }>;
}

export const metadata = {
  title: "Order Confirmation | Shubash & Co. (সুবাস & Co.)",
  description: "Your order details and tracking status.",
};

export default async function OrderConfirmationPage({ params }: OrderPageProps) {
  const { id } = await params;

  let order = null;
  try {
    order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: { brand: true },
                },
              },
            },
          },
        },
        payments: true,
        shipments: true,
      },
    });
  } catch {
    // Database empty or not migrated
  }

  if (!order) {
    notFound();
  }

  const customerSnapshot = order.customerSnapshot as { name?: string; phone?: string; email?: string } | null;
  const addressSnapshot = order.addressSnapshot as {
    division?: string;
    district?: string;
    thana?: string;
    fullAddress?: string;
    deliveryNote?: string;
  } | null;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Success Banner */}
        <div className="p-8 rounded-[var(--radius-xl)] bg-[var(--surface)] border border-[var(--border-subtle)] text-center space-y-4 shadow-xs">
          <div className="h-16 w-16 rounded-full bg-[#EAF4EE] text-[var(--status-success)] flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-1">
            <Badge variant="success">Order Confirmed</Badge>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-strong)]">
              Thank You for Your Order!
            </h1>
            <p className="text-sm text-[var(--text-secondary)] max-w-lg mx-auto">
              Your authentic fragrance selection has been received. Order{" "}
              <strong className="text-[var(--text-strong)] font-mono">{order.orderNumber}</strong> is now queued for careful decanting and dispatch.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap gap-3 justify-center">
            <Link href={`/track?token=${order.trackingToken}`}>
              <Button variant="primary" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                <span>Track Live Order Status</span>
              </Button>
            </Link>
            <Link href="/products">
              <Button variant="secondary">Continue Exploring Fragrances</Button>
            </Link>
          </div>
        </div>

        {/* Decant Quality Guarantee Notice */}
        <div className="mt-8 p-4 rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-[var(--primary)] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <strong className="block font-bold text-[var(--text-strong)]">
              Hand-Decanted with Teflon Seal Guarantee
            </strong>
            <span className="text-[var(--text-secondary)]">
              All decants are drawn fresh using sterile medical equipment into premium glass atomizers with teflon tape wrapped around the nozzle threads to completely eliminate evaporation or courier leaks.
            </span>
          </div>
        </div>

        {/* Order Details & Items Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Order Items Table (8 cols) */}
          <div className="md:col-span-8 space-y-6">
            <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] space-y-4 shadow-xs">
              <h2 className="text-base font-bold text-[var(--text-strong)] pb-2 border-b border-[var(--border-subtle)]">
                Ordered Fragrances ({order.items.length})
              </h2>

              <div className="space-y-4">
                {order.items.map((item) => {
                  const snap = item.variantSnapshot as {
                    productName?: string;
                    brandName?: string;
                    format?: string;
                    volumeMl?: string;
                  } | null;

                  return (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]/60 last:border-0 last:pb-0"
                    >
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                          {snap?.brandName || "Luxury Fragrance"}
                        </span>
                        <h3 className="text-sm font-bold text-[var(--text-strong)]">
                          {snap?.productName || "Perfume Item"}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant={snap?.format === "DECANT" ? "default" : "info"}>
                            {snap?.format === "DECANT" ? `${snap?.volumeMl}ml Decant` : "Full Bottle"}
                          </Badge>
                          <span className="text-xs text-[var(--text-muted)]">
                            Qty: <strong className="text-[var(--text-strong)]">{item.quantity}</strong> × {formatBDT(item.unitPrice)}
                          </span>
                        </div>
                      </div>

                      <span className="text-sm font-bold text-[var(--text-strong)] tabular-nums">
                        {formatBDT(item.totalPrice)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Financial Totals */}
              <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[var(--text-strong)] tabular-nums">
                    {formatBDT(order.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Delivery ({order.deliveryZone || "Standard"})</span>
                  <span className="font-semibold text-[var(--text-strong)] tabular-nums">
                    {Number(order.deliveryFee) === 0 ? "FREE" : formatBDT(order.deliveryFee)}
                  </span>
                </div>
                {Number(order.discountAmount) > 0 && (
                  <div className="flex justify-between text-[var(--status-success)] font-semibold">
                    <span>Discount</span>
                    <span className="tabular-nums">- {formatBDT(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-[var(--text-strong)] pt-2 border-t border-[var(--border-subtle)]">
                  <span>Total Amount</span>
                  <span className="tabular-nums text-lg">{formatBDT(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery & Payment Metadata (4 cols) */}
          <div className="md:col-span-4 space-y-6">
            <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[var(--text-strong)] uppercase tracking-wider pb-2 border-b border-[var(--border-subtle)]">
                Delivery Details
              </h3>

              <div className="text-xs sm:text-sm space-y-1 text-[var(--text-secondary)]">
                <p className="font-bold text-[var(--text-strong)]">{customerSnapshot?.name}</p>
                <p className="font-mono">{customerSnapshot?.phone}</p>
                {customerSnapshot?.email && <p>{customerSnapshot.email}</p>}
                <div className="pt-2 text-[var(--text-strong)]">
                  <p>{addressSnapshot?.fullAddress}</p>
                  <p>
                    {addressSnapshot?.thana}, {addressSnapshot?.district}
                  </p>
                  <p>{addressSnapshot?.division}</p>
                </div>
                {addressSnapshot?.deliveryNote && (
                  <p className="pt-2 text-xs italic text-[var(--text-muted)]">
                    Note: &quot;{addressSnapshot.deliveryNote}&quot;
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[var(--text-strong)] uppercase tracking-wider pb-2 border-b border-[var(--border-subtle)]">
                Payment Information
              </h3>

              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Method</span>
                  <strong className="text-[var(--text-strong)]">{order.paymentMethod}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Status</span>
                  <Badge variant={order.paymentStatus === "PAID" ? "success" : "default"}>
                    {order.paymentStatus.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Date & Time</span>
                  <span className="text-[var(--text-strong)] font-mono text-xs">
                    {formatDhakaDate(order.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
