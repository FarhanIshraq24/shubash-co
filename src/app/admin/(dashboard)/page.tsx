import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  Droplet,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  Plus,
  RefreshCw,
} from "lucide-react";

export default async function AdminDashboardPage() {
  // Read counts safely from database
  let pendingOrders = 0;
  let pendingPayments = 0;
  let activeSourceBottles = 0;
  const lowStockBottles = 0;

  try {
    [pendingOrders, pendingPayments, activeSourceBottles] = await Promise.all([
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.sourceBottle.count({ where: { status: "ACTIVE" } }),
    ]);
  } catch {
    // Database empty or not migrated yet during initial bootstrap
  }

  return (
    <div className="space-y-8">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--border-subtle)]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-strong)]">
            Business Operations Dashboard
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Real-time status of orders, decant inventory, and financial ledger.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/inventory">
            <Button variant="secondary" size="sm">
              <Droplet className="h-4 w-4" />
              <span>Decants Status</span>
            </Button>
          </Link>
          <Link href="/admin/orders">
            <Button variant="primary" size="sm">
              <ShoppingBag className="h-4 w-4" />
              <span>View Orders</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-[var(--text-secondary)]">
              Pending Orders
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-[var(--text-muted)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--text-strong)]">{pendingOrders}</div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Awaiting confirmation & packing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-[var(--text-secondary)]">
              Payment Verification
            </CardTitle>
            <CreditCard className="h-4 w-4 text-[var(--text-muted)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--text-strong)]">{pendingPayments}</div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Manual bKash/Nagad transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-[var(--text-secondary)]">
              Active Decant Sources
            </CardTitle>
            <Droplet className="h-4 w-4 text-[var(--text-muted)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--text-strong)]">{activeSourceBottles}</div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Open bottles dispensing liquid (ml)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-[var(--text-secondary)]">
              Stock Warnings
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-[var(--status-warning)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--status-warning)]">{lowStockBottles}</div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Source bottles below reserve</p>
          </CardContent>
        </Card>
      </div>

      {/* Operational Workflows Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Decant Inventory Core Rules</CardTitle>
            <CardDescription>
              How Shubash & Co. models shared perfume liquid accurately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[var(--text-secondary)]">
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <p className="font-semibold text-[var(--text-strong)]">Sealed Bottle → Source Bottle Conversion</p>
              <p className="text-xs mt-1">
                Full bottles are converted explicitly into a decant source (decreasing sealed units, creating an exact ml source bottle with cost-per-ml basis).
              </p>
            </div>
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <p className="font-semibold text-[var(--text-strong)]">Reservations & Filling</p>
              <p className="text-xs mt-1">
                When a customer orders a 5ml or 10ml decant, liquid is reserved. When staff fills the atomizer, reserved liquid becomes consumed + wastage is tracked.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Operations</CardTitle>
            <CardDescription>Direct navigation to primary tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/admin/inventory"
              className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)] transition-colors text-sm font-semibold text-[var(--text-strong)]"
            >
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-[var(--primary)]" />
                <span>Convert Sealed Bottle into Decant Source</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" />
            </Link>

            <Link
              href="/admin/orders"
              className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)] transition-colors text-sm font-semibold text-[var(--text-strong)]"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-[var(--primary)]" />
                <span>Process Orders & Print Slips</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" />
            </Link>

            <Link
              href="/admin/payments"
              className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)] transition-colors text-sm font-semibold text-[var(--text-strong)]"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[var(--primary)]" />
                <span>Verify bKash / Nagad Transactions</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" />
            </Link>

            <Link
              href="/admin/accounting"
              className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)] transition-colors text-sm font-semibold text-[var(--text-strong)]"
            >
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-[var(--primary)]" />
                <span>Record Expense & Review Ledger</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
