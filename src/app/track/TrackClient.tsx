"use client";

import React, { useState } from "react";
import { formatDhakaDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  Droplet,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

export interface TrackingData {
  orderNumber: string;
  trackingToken: string;
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURNED";
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  recipientName: string;
  recipientCity: string;
  totalFormatted: string;
  courierName?: string | null;
  courierTrackingNumber?: string | null;
  items: Array<{
    name: string;
    brand: string;
    format: string;
    volumeMl: string | null;
    quantity: number;
  }>;
}

interface TrackClientProps {
  initialData: TrackingData | null;
  initialQuery?: string;
}

export function TrackClient({ initialData, initialQuery = "" }: TrackClientProps) {
  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState<TrackingData | null>(initialData);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(`/api/orders/track?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const orderData = (await res.json()) as TrackingData;
        setData(orderData);
      } else {
        setData(null);
        setSearchError("No order found matching this tracking token or order number.");
      }
    } catch {
      setSearchError("Failed to lookup order. Please check your internet connection.");
    } finally {
      setIsSearching(false);
    }
  };

  const steps = [
    { key: "PENDING", label: "Order Placed", desc: "Awaiting review", icon: Clock },
    { key: "CONFIRMED", label: "Confirmed", desc: "Stock verified", icon: CheckCircle2 },
    { key: "PREPARING", label: "Decanting & Sealing", desc: "Teflon leak-proof seal", icon: Droplet },
    { key: "PACKED", label: "Packed", desc: "Ready for courier", icon: Package },
    { key: "SHIPPED", label: "Shipped", desc: "In transit with courier", icon: Truck },
    { key: "DELIVERED", label: "Delivered", desc: "Smell good everyday", icon: ShieldCheck },
  ];

  const getStepStatus = (stepKey: string, currentStatus: string) => {
    const orderIndex = steps.findIndex((s) => s.key === currentStatus);
    const stepIndex = steps.findIndex((s) => s.key === stepKey);

    if (currentStatus === "CANCELLED" || currentStatus === "RETURNED") {
      return "inactive";
    }

    if (stepIndex < orderIndex) return "completed";
    if (stepIndex === orderIndex) return "current";
    return "upcoming";
  };

  return (
    <div className="space-y-8">
      {/* Search Input Banner */}
      <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-xs">
        <form onSubmit={handleSearch} className="max-w-xl mx-auto space-y-3">
          <label className="text-xs font-bold text-[var(--text-strong)] uppercase tracking-wider block text-center">
            Enter Order Number or Tracking Token
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. SC-202611-0001 or tracking UUID"
                className="w-full h-12 pl-10 pr-4 text-sm bg-[var(--surface)] border border-[var(--border-control)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] font-mono"
              />
              <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-[var(--text-muted)] pointer-events-none" />
            </div>
            <Button type="submit" variant="primary" disabled={isSearching} className="h-12 px-6">
              {isSearching ? "Searching..." : "Track Order"}
            </Button>
          </div>
          <p className="text-xs text-[var(--text-muted)] text-center">
            Tracking tokens were provided upon checkout and sent via SMS.
          </p>
        </form>

        {searchError && (
          <div className="mt-4 p-3 rounded-[var(--radius-md)] bg-[#FEE2E2] text-[#991B1B] text-xs font-semibold flex items-center justify-center gap-2 max-w-xl mx-auto">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* Tracking Result View */}
      {data && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Header Card */}
          <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[var(--text-strong)] font-mono">
                  Order {data.orderNumber}
                </h2>
                <Badge
                  variant={
                    data.status === "DELIVERED"
                      ? "success"
                      : data.status === "CANCELLED"
                      ? "error"
                      : "default"
                  }
                >
                  {data.status.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Placed on {formatDhakaDate(data.createdAt)} · Delivering to {data.recipientName} ({data.recipientCity})
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-[var(--text-muted)] block">Amount</span>
              <span className="text-lg font-bold text-[var(--text-strong)] tabular-nums">
                {data.totalFormatted} ({data.paymentMethod})
              </span>
            </div>
          </div>

          {/* Stepper Pipeline */}
          <div className="p-6 sm:p-8 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-xs">
            <h3 className="text-sm font-bold text-[var(--text-strong)] uppercase tracking-wider mb-8">
              Live Fulfillment Pipeline
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-6 relative">
              {steps.map((step) => {
                const status = getStepStatus(step.key, data.status);
                const IconComponent = step.icon;

                return (
                  <div key={step.key} className="flex flex-col items-center text-center space-y-2 relative">
                    <div
                      className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
                        status === "completed"
                          ? "bg-[var(--status-success)] text-white"
                          : status === "current"
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)] ring-4 ring-[var(--surface-subtle)]"
                          : "bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                      }`}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>

                    <div className="space-y-0.5">
                      <p
                        className={`text-xs font-bold ${
                          status === "current"
                            ? "text-[var(--text-strong)]"
                            : status === "completed"
                            ? "text-[var(--status-success)]"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] hidden sm:block">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Courier Details */}
          {data.courierName && (
            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-[var(--primary)]" />
                <span>
                  Dispatched via <strong>{data.courierName}</strong>
                  {data.courierTrackingNumber && (
                    <>
                      {" "}· Tracking ID: <strong className="font-mono">{data.courierTrackingNumber}</strong>
                    </>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Items Summary */}
          <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-strong)] uppercase tracking-wider pb-2 border-b border-[var(--border-subtle)]">
              Package Contents
            </h3>
            <div className="space-y-2">
              {data.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-[var(--border-subtle)]/40 last:border-0">
                  <div>
                    <span className="font-bold text-[var(--text-strong)]">{item.name}</span>
                    <span className="text-[var(--text-muted)] ml-2">
                      ({item.format === "DECANT" ? `${item.volumeMl}ml Decant` : "Full Bottle"})
                    </span>
                  </div>
                  <span className="font-semibold text-[var(--text-secondary)]">Qty: {item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
