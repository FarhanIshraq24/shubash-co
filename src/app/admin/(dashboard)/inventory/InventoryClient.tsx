"use client";

import React, { useState, useTransition } from "react";
import { formatBDT, formatVolume, formatDhakaDate } from "@/lib/utils";
import { convertSealedBottleAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Droplet,
  Package,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface SourceBottleItem {
  id: string;
  productName: string;
  brandName: string;
  batchRef: string | null;
  totalMl: string;
  remainingMl: string;
  reservedMl: string;
  availableMl: string;
  costBasis: string;
  costPerMl: string;
  status: string;
  openedAt: string;
}

interface SealedBottleItem {
  id: string;
  productName: string;
  brandName: string;
  batchRef: string | null;
  volumeMl: string;
  quantity: number;
  costPerUnit: string;
}

interface StockMovementItem {
  id: string;
  type: string;
  quantity: string;
  note: string | null;
  createdAt: string;
}

interface InventoryClientProps {
  sourceBottles: SourceBottleItem[];
  sealedBottles: SealedBottleItem[];
  recentMovements: StockMovementItem[];
  totalAvailableMl: number;
  totalReservedMl: number;
}

export function InventoryClient({
  sourceBottles,
  sealedBottles,
  recentMovements,
  totalAvailableMl,
  totalReservedMl,
}: InventoryClientProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedSealedId, setSelectedSealedId] = useState<string | null>(null);
  const [conversionNote, setConversionNote] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const handleConvert = (sealedId: string) => {
    setSelectedSealedId(sealedId);
    setConversionNote("");
    setFeedback(null);
  };

  const executeConvert = () => {
    if (!selectedSealedId) return;

    startTransition(async () => {
      const res = await convertSealedBottleAction(selectedSealedId, conversionNote);
      if (res.success) {
        setFeedback({
          type: "success",
          message: "Sealed bottle successfully converted into an active decant source bottle!",
        });
        setSelectedSealedId(null);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to convert bottle.",
        });
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Alert Feedback */}
      {feedback && (
        <div
          role="status"
          className={`p-4 rounded-[var(--radius-md)] border text-sm flex items-start gap-2 ${
            feedback.type === "success"
              ? "bg-[var(--status-success-bg)] border-[var(--status-success-border)] text-[var(--status-success)]"
              : "bg-[var(--status-error-bg)] border-[var(--status-error-border)] text-[var(--status-error)]"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-[var(--text-secondary)]">
              Available Liquid
            </CardTitle>
            <Droplet className="h-4 w-4 text-[var(--primary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--text-strong)]">
              {formatVolume(totalAvailableMl)}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Ready to dispense into decants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-[var(--text-secondary)]">
              Reserved Liquid
            </CardTitle>
            <Clock className="h-4 w-4 text-[var(--status-warning)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--status-warning)]">
              {formatVolume(totalReservedMl)}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Reserved for orders pending fill</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-[var(--text-secondary)]">
              Active Source Bottles
            </CardTitle>
            <Droplet className="h-4 w-4 text-[var(--text-muted)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--text-strong)]">
              {sourceBottles.length}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Dispensing in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-[var(--text-secondary)]">
              Sealed Retail Bottles
            </CardTitle>
            <Package className="h-4 w-4 text-[var(--text-muted)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--text-strong)]">
              {sealedBottles.reduce((acc, sb) => acc + sb.quantity, 0)} units
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Available for sale or conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Modal / Prompt */}
      {selectedSealedId && (
        <Card className="border-2 border-[var(--primary)] bg-[var(--surface-subtle)]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-[var(--text-strong)]">
              <RefreshCw className="h-5 w-5 text-[var(--primary)]" />
              <span>Confirm Bottle Conversion to Decant Source</span>
            </CardTitle>
            <CardDescription>
              This action decreases 1 unit from the sealed bottle and creates a new source bottle
              tracked in exact milliliters with derived cost basis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-strong)] mb-1">
                Optional Notes / Batch Details
              </label>
              <input
                type="text"
                value={conversionNote}
                onChange={(e) => setConversionNote(e.target.value)}
                placeholder="e.g. Opened on Shelf A2 for 5ml orders"
                className="w-full h-10 px-3 text-sm rounded-[var(--radius-md)] border border-[var(--border-control)] bg-[var(--surface)] text-[var(--text-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={executeConvert}
                isLoading={isPending}
              >
                Confirm Conversion
              </Button>
              <Button
                variant="secondary"
                onClick={() => setSelectedSealedId(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Source Bottles Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-strong)]">
              Active Decant Source Bottles
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Liquid tracked in exact milliliters. Available = Physical Remaining - Reserved.
            </p>
          </div>
        </div>

        {sourceBottles.length === 0 ? (
          <div className="p-8 text-center rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-muted)] text-sm">
            No active decant source bottles opened yet. Convert a sealed bottle below to start dispensing.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product & Brand</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Total Fill</TableHead>
                <TableHead>Remaining Physical</TableHead>
                <TableHead>Reserved</TableHead>
                <TableHead>Available to Sell</TableHead>
                <TableHead>Cost Basis</TableHead>
                <TableHead>Cost / ml</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Opened</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sourceBottles.map((bottle) => (
                <TableRow key={bottle.id}>
                  <TableCell className="font-semibold text-[var(--text-strong)]">
                    <div>{bottle.productName}</div>
                    <div className="text-xs text-[var(--text-secondary)] font-normal">
                      {bottle.brandName}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-[var(--text-muted)]">
                    {bottle.batchRef || "—"}
                  </TableCell>
                  <TableCell className="tabular-nums font-medium">
                    {formatVolume(bottle.totalMl)}
                  </TableCell>
                  <TableCell className="tabular-nums font-semibold text-[var(--text-strong)]">
                    {formatVolume(bottle.remainingMl)}
                  </TableCell>
                  <TableCell className="tabular-nums font-semibold text-[var(--status-warning)]">
                    {formatVolume(bottle.reservedMl)}
                  </TableCell>
                  <TableCell className="tabular-nums font-bold text-[var(--status-success)]">
                    {formatVolume(bottle.availableMl)}
                  </TableCell>
                  <TableCell className="tabular-nums">{formatBDT(bottle.costBasis)}</TableCell>
                  <TableCell className="tabular-nums text-xs text-[var(--text-secondary)]">
                    {formatBDT(bottle.costPerMl)}/ml
                  </TableCell>
                  <TableCell>
                    <Badge variant={bottle.status === "ACTIVE" ? "success" : "default"}>
                      {bottle.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {formatDhakaDate(bottle.openedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Sealed Bottles Table */}
      <div className="space-y-4 pt-6 border-t border-[var(--border-subtle)]">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-strong)]">
            Sealed Full Bottles (Retail Inventory)
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Tracked in units. Convert to decant source bottle when ready to sample.
          </p>
        </div>

        {sealedBottles.length === 0 ? (
          <div className="p-8 text-center rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-muted)] text-sm">
            No sealed bottles recorded. Add stock via Purchasing.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product & Brand</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Bottle Volume</TableHead>
                <TableHead>Units in Stock</TableHead>
                <TableHead>Cost Per Unit</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sealedBottles.map((bottle) => (
                <TableRow key={bottle.id}>
                  <TableCell className="font-semibold text-[var(--text-strong)]">
                    <div>{bottle.productName}</div>
                    <div className="text-xs text-[var(--text-secondary)] font-normal">
                      {bottle.brandName}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-[var(--text-muted)]">
                    {bottle.batchRef || "—"}
                  </TableCell>
                  <TableCell className="tabular-nums font-medium">
                    {formatVolume(bottle.volumeMl)}
                  </TableCell>
                  <TableCell className="tabular-nums font-bold text-[var(--text-strong)]">
                    {bottle.quantity} {bottle.quantity === 1 ? "unit" : "units"}
                  </TableCell>
                  <TableCell className="tabular-nums">{formatBDT(bottle.costPerUnit)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleConvert(bottle.id)}
                      disabled={bottle.quantity <= 0}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Convert to Decants</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Recent Stock Movements Audit Trail */}
      <div className="space-y-4 pt-6 border-t border-[var(--border-subtle)]">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-strong)]">
            Recent Stock Movements (Audit Trail)
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Every inventory receipt, reservation, filling, wastage, and conversion is immutably logged.
          </p>
        </div>

        {recentMovements.length === 0 ? (
          <div className="p-8 text-center rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-muted)] text-sm">
            No stock movements recorded yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp (Asia/Dhaka)</TableHead>
                <TableHead>Movement Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Reference & Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentMovements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {formatDhakaDate(movement.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        movement.type.includes("CONVERSION")
                          ? "primary"
                          : movement.type === "FILL"
                          ? "success"
                          : movement.type === "RESERVE"
                          ? "warning"
                          : movement.type === "WASTE"
                          ? "error"
                          : "default"
                      }
                    >
                      {movement.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-sm tabular-nums">
                    {movement.quantity}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--text-secondary)]">
                    {movement.note || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
