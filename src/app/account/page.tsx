import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth-helpers";
import { formatBDT, formatDhakaDate } from "@/lib/utils";
import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  Truck,
  Phone,
  Mail,
} from "lucide-react";

export const metadata = {
  title: "My Account & Orders | Shubash & Co. (সুবাস & Co.)",
  description: "View your order history, decant fulfillment updates, and delivery addresses.",
};

import { Prisma } from "@prisma/client";

export default async function CustomerAccountPage() {
  const customer = await requireCustomer();

  type OrderWithItems = Prisma.OrderGetPayload<{
    include: { items: true };
  }>;

  let orders: OrderWithItems[] = [];
  try {
    orders = await prisma.order.findMany({
      where: {
        OR: [
          { customerId: customer.id },
          { customerSnapshot: { path: ["phone"], equals: customer.phone } },
        ],
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // Database empty or not configured
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Header customerName={customer.name} />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
        {/* Profile Card */}
        <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--primary)] font-bold text-xl">
              {customer.name.slice(0, 1)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-strong)]">{customer.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)] mt-0.5">
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="h-3.5 w-3.5" />
                  {customer.phone}
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {customer.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/products">
              <Button variant="primary" size="sm">
                Shop Fragrances
              </Button>
            </Link>
          </div>
        </div>

        {/* Orders History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <h2 className="text-lg font-bold text-[var(--text-strong)]">
              Your Orders ({orders.length})
            </h2>
            <Link href="/track" className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" />
              <span>Track with Token</span>
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] space-y-4">
              <Package className="h-10 w-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <h3 className="text-base font-bold text-[var(--text-strong)]">No orders placed yet</h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                Explore our collection of authentic decants and sealed full retail bottles.
              </p>
              <Link href="/products">
                <Button variant="primary" size="sm">
                  Start Exploring
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="p-5 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[var(--border-subtle)] text-xs">
                    <div>
                      <span className="font-bold font-mono text-[var(--text-strong)] text-sm">
                        {order.orderNumber}
                      </span>
                      <span className="text-[var(--text-muted)] ml-2">
                        {formatDhakaDate(order.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          order.status === "DELIVERED"
                            ? "success"
                            : order.status === "CANCELLED"
                            ? "error"
                            : "default"
                        }
                      >
                        {order.status.replace("_", " ")}
                      </Badge>
                      <span className="font-bold text-sm text-[var(--text-strong)] tabular-nums">
                        {formatBDT(order.total)}
                      </span>
                    </div>
                  </div>

                  {/* Items Summary */}
                  <div className="space-y-1.5 text-xs">
                    {order.items.map((item) => {
                      const snap = item.variantSnapshot as {
                        productName?: string;
                        brandName?: string;
                        format?: string;
                        volumeMl?: string;
                      } | null;

                      return (
                        <div key={item.id} className="flex justify-between items-center text-[var(--text-secondary)]">
                          <span>
                            {snap?.productName || "Fragrance"}{" "}
                            <span className="text-[var(--text-muted)]">
                              ({snap?.format === "DECANT" ? `${snap?.volumeMl}ml Decant` : "Full Bottle"}) × {item.quantity}
                            </span>
                          </span>
                          <span className="font-semibold text-[var(--text-strong)] tabular-nums">
                            {formatBDT(item.totalPrice)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <Link href={`/orders/${order.id}`}>
                      <Button variant="secondary" size="sm">
                        View Order Details
                      </Button>
                    </Link>
                    <Link href={`/track?token=${order.trackingToken}`}>
                      <Button variant="primary" size="sm" className="flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5" />
                        <span>Track Status</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
