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
import { updateOrderStatus } from "./actions";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import {
  Search,
  Eye,
  Package,
} from "lucide-react";

export interface SerializedOrder {
  id: string;
  orderNumber: string;
  trackingToken: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  deliveryZone: string | null;
  customerName: string;
  customerPhone: string;
  itemCount: number;
  createdAt: string;
}

interface OrdersClientProps {
  orders: SerializedOrder[];
}

export function OrdersClient({ orders: initialOrders }: OrdersClientProps) {
  const [orders, setOrders] = useState<SerializedOrder[]>(initialOrders);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filterTabs = [
    { label: "All Orders", value: "ALL" },
    { label: "Pending", value: "PENDING" },
    { label: "Confirmed", value: "CONFIRMED" },
    { label: "Preparing / Decanting", value: "PREPARING" },
    { label: "Packed", value: "PACKED" },
    { label: "Shipped", value: "SHIPPED" },
    { label: "Delivered", value: "DELIVERED" },
    { label: "Cancelled", value: "CANCELLED" },
  ];

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = selectedStatus === "ALL" || o.status === selectedStatus;
    const matchesSearch =
      !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.customerPhone.includes(search);
    return matchesStatus && matchesSearch;
  });

  const handleQuickStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch {
      alert("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border-subtle)]">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSelectedStatus(tab.value)}
              className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors ${
                selectedStatus === tab.value
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--text-strong)] hover:bg-[var(--surface-subtle)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, customer, phone..."
            className="w-full h-10 pl-9 pr-3 text-xs bg-[var(--surface)] border border-[var(--border-control)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
        </div>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] space-y-3">
          <Package className="h-10 w-10 text-[var(--text-muted)] mx-auto opacity-50" />
          <h3 className="text-base font-bold text-[var(--text-strong)]">No orders found</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Try adjusting your search query or selecting a different status filter tab.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total & Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Placed At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono font-bold text-[var(--text-strong)]">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="hover:underline flex items-center gap-1"
                  >
                    <span>{order.orderNumber}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <p className="font-semibold text-xs text-[var(--text-strong)]">
                    {order.customerName}
                  </p>
                  <p className="text-[11px] font-mono text-[var(--text-muted)]">
                    {order.customerPhone}
                  </p>
                </TableCell>
                <TableCell className="text-xs text-[var(--text-secondary)]">
                  {order.deliveryZone || "Standard Delivery"}
                </TableCell>
                <TableCell className="tabular-nums text-xs font-semibold text-[var(--text-strong)]">
                  {order.itemCount} items
                </TableCell>
                <TableCell>
                  <p className="font-bold text-xs tabular-nums text-[var(--text-strong)]">
                    {formatBDT(order.total)}
                  </p>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">
                      {order.paymentMethod}
                    </span>
                    <Badge
                      variant={
                        order.paymentStatus === "PAID"
                          ? "success"
                          : order.paymentStatus === "PENDING_VERIFICATION"
                          ? "warning"
                          : "default"
                      }
                    >
                      {order.paymentStatus === "PENDING_VERIFICATION" ? "Verify" : order.paymentStatus}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      order.status === "DELIVERED"
                        ? "success"
                        : order.status === "SHIPPED"
                        ? "info"
                        : order.status === "CANCELLED"
                        ? "error"
                        : order.status === "PREPARING"
                        ? "warning"
                        : "default"
                    }
                  >
                    {order.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-[var(--text-muted)] font-mono whitespace-nowrap">
                  {formatDhakaDate(order.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {order.status === "PENDING" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={updatingId === order.id}
                        onClick={() => handleQuickStatusChange(order.id, OrderStatus.CONFIRMED)}
                      >
                        Confirm
                      </Button>
                    )}
                    {order.status === "CONFIRMED" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={updatingId === order.id}
                        onClick={() => handleQuickStatusChange(order.id, OrderStatus.PREPARING)}
                      >
                        Start Filling
                      </Button>
                    )}
                    <Link href={`/admin/orders/${order.id}`}>
                      <Button size="sm" variant="ghost">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
