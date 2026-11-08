"use client";

import React, { useState, useTransition, useEffect } from "react";
import { formatBDT, formatVolume, formatDhakaDate } from "@/lib/utils";
import {
  convertSealedBottleAction,
  addSealedBottleAction,
  updateSealedQuantityAction,
  adjustSourceBottleAction,
  retireSourceBottleAction,
  deleteSealedBottleAction,
  getProductsForDropdownAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Plus,
  Pencil,
  Trash2,
  Archive,
  X,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────

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

interface ProductOption {
  id: string;
  label: string;
}

// ─── Reusable Modal Shell ───────────────────────────────────────

function ModalOverlay({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-strong)]">{title}</h3>
            {description && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-subtle)] text-[var(--text-muted)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Form Field Helpers ─────────────────────────────────────────

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--text-strong)] mb-1">
        {label} {required && <span className="text-[var(--status-error)]">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full h-10 px-3 text-sm rounded-[var(--radius-md)] border border-[var(--border-control)] bg-[var(--surface)] text-[var(--text-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]";

const selectClass =
  "w-full h-10 px-3 text-sm rounded-[var(--radius-md)] border border-[var(--border-control)] bg-[var(--surface)] text-[var(--text-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]";

// ─── Main Component ─────────────────────────────────────────────

export function InventoryClient({
  sourceBottles,
  sealedBottles,
  recentMovements,
  totalAvailableMl,
  totalReservedMl,
}: InventoryClientProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Products dropdown data
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  // Modal state
  const [modal, setModal] = useState<
    | null
    | { type: "addSealed" }
    | { type: "editSealedQty"; bottle: SealedBottleItem }
    | { type: "deleteSealed"; bottle: SealedBottleItem }
    | { type: "convertSealed"; bottle: SealedBottleItem }
    | { type: "adjustSource"; bottle: SourceBottleItem }
    | { type: "retireSource"; bottle: SourceBottleItem }
  >(null);

  // Form values
  const [formProductId, setFormProductId] = useState("");
  const [formVolumeMl, setFormVolumeMl] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formCostPerUnit, setFormCostPerUnit] = useState("");
  const [formBatchRef, setFormBatchRef] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formNewQuantity, setFormNewQuantity] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formNewRemainingMl, setFormNewRemainingMl] = useState("");

  // Clear auto-dismiss feedback after 5s
  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 6000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  // Load products for the "Add Sealed" form
  const loadProducts = async () => {
    if (productsLoaded) return;
    const res = await getProductsForDropdownAction();
    if (res.success && res.data) {
      setProducts(res.data);
    }
    setProductsLoaded(true);
  };

  const openModal = (m: NonNullable<typeof modal>) => {
    setFeedback(null);
    setFormProductId("");
    setFormVolumeMl("");
    setFormQuantity("1");
    setFormCostPerUnit("");
    setFormBatchRef("");
    setFormNotes("");
    setFormNewQuantity("");
    setFormReason("");
    setFormNewRemainingMl("");

    if (m.type === "addSealed") {
      loadProducts();
    } else if (m.type === "editSealedQty") {
      setFormNewQuantity(m.bottle.quantity.toString());
    } else if (m.type === "adjustSource") {
      setFormNewRemainingMl(m.bottle.remainingMl);
    }

    setModal(m);
  };

  const closeModal = () => setModal(null);

  // ─── Handlers ──────────────────────────────────────

  const handleAddSealed = () => {
    startTransition(async () => {
      const res = await addSealedBottleAction({
        productId: formProductId,
        volumeMl: parseFloat(formVolumeMl),
        quantity: parseInt(formQuantity, 10),
        costPerUnit: parseFloat(formCostPerUnit),
        batchRef: formBatchRef || undefined,
        notes: formNotes || undefined,
      });
      if (res.success) {
        setFeedback({ type: "success", message: "Sealed bottle(s) added to inventory!" });
        closeModal();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to add." });
      }
    });
  };

  const handleUpdateSealedQty = () => {
    if (!modal || modal.type !== "editSealedQty") return;
    startTransition(async () => {
      const res = await updateSealedQuantityAction(
        modal.bottle.id,
        parseInt(formNewQuantity, 10),
        formReason
      );
      if (res.success) {
        setFeedback({ type: "success", message: "Sealed bottle quantity updated!" });
        closeModal();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update." });
      }
    });
  };

  const handleDeleteSealed = () => {
    if (!modal || modal.type !== "deleteSealed") return;
    startTransition(async () => {
      const res = await deleteSealedBottleAction(modal.bottle.id, formReason);
      if (res.success) {
        setFeedback({ type: "success", message: "Sealed bottle record deleted." });
        closeModal();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to delete." });
      }
    });
  };

  const handleConvert = () => {
    if (!modal || modal.type !== "convertSealed") return;
    startTransition(async () => {
      const res = await convertSealedBottleAction(modal.bottle.id, formNotes);
      if (res.success) {
        setFeedback({
          type: "success",
          message: "Sealed bottle converted into an active decant source bottle!",
        });
        closeModal();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to convert." });
      }
    });
  };

  const handleAdjustSource = () => {
    if (!modal || modal.type !== "adjustSource") return;
    startTransition(async () => {
      const res = await adjustSourceBottleAction(
        modal.bottle.id,
        parseFloat(formNewRemainingMl),
        formReason
      );
      if (res.success) {
        setFeedback({ type: "success", message: "Source bottle remaining ml adjusted!" });
        closeModal();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to adjust." });
      }
    });
  };

  const handleRetireSource = () => {
    if (!modal || modal.type !== "retireSource") return;
    startTransition(async () => {
      const res = await retireSourceBottleAction(modal.bottle.id, formReason);
      if (res.success) {
        setFeedback({ type: "success", message: "Source bottle retired successfully." });
        closeModal();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to retire." });
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Feedback Toast */}
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
              {sourceBottles.filter((b) => b.status === "ACTIVE").length}
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

      {/* ─── Active Source Bottles Table ───────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-strong)]">
              Active Decant Source Bottles
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Liquid tracked in exact milliliters. Available = Physical Remaining − Reserved.
            </p>
          </div>
        </div>

        {sourceBottles.length === 0 ? (
          <div className="p-8 text-center rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-muted)] text-sm">
            No active decant source bottles opened yet. Convert a sealed bottle below to start
            dispensing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product & Brand</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Total Fill</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Cost / ml</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {bottle.status === "ACTIVE" && (
                          <>
                            <button
                              onClick={() => openModal({ type: "adjustSource", bottle })}
                              title="Adjust remaining ml"
                              className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-strong)]"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => openModal({ type: "retireSource", bottle })}
                              title="Retire bottle"
                              className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--status-error)]"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ─── Sealed Bottles Table ─────────────────────────────── */}
      <div className="space-y-4 pt-6 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-strong)]">
              Sealed Full Bottles (Retail Inventory)
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Tracked in units. Convert to decant source bottle when ready to sample.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => openModal({ type: "addSealed" })}
          >
            <Plus className="h-4 w-4" />
            <span>Add Sealed Bottles</span>
          </Button>
        </div>

        {sealedBottles.length === 0 ? (
          <div className="p-8 text-center rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-muted)] text-sm">
            No sealed bottles recorded. Click &quot;Add Sealed Bottles&quot; above to receive new stock.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product & Brand</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Bottle Volume</TableHead>
                  <TableHead>Units in Stock</TableHead>
                  <TableHead>Cost Per Unit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openModal({ type: "convertSealed", bottle })}
                          disabled={bottle.quantity <= 0}
                          title="Convert to decant source"
                          className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--primary)] disabled:opacity-40"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openModal({ type: "editSealedQty", bottle })}
                          title="Edit quantity"
                          className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-strong)]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openModal({ type: "deleteSealed", bottle })}
                          title="Delete record"
                          className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--status-error)]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ─── Recent Stock Movements Audit Trail ───────────────── */}
      <div className="space-y-4 pt-6 border-t border-[var(--border-subtle)]">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-strong)]">
            Recent Stock Movements (Audit Trail)
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Every inventory receipt, reservation, filling, wastage, and conversion is immutably
            logged.
          </p>
        </div>

        {recentMovements.length === 0 ? (
          <div className="p-8 text-center rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-muted)] text-sm">
            No stock movements recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                            : movement.type === "RECEIVE"
                            ? "success"
                            : "default"
                        }
                      >
                        {movement.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-sm tabular-nums">
                      {movement.quantity}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-secondary)] max-w-xs truncate">
                      {movement.note || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
         MODALS
         ═══════════════════════════════════════════════════════════ */}

      {/* ─── Add Sealed Bottles Modal ─────────────────────────── */}
      <ModalOverlay
        open={modal?.type === "addSealed"}
        onClose={closeModal}
        title="Add Sealed Bottles to Inventory"
        description="Record new sealed full bottles received from a supplier or purchase."
      >
        <div className="space-y-4">
          <FormField label="Product" required>
            <select
              value={formProductId}
              onChange={(e) => setFormProductId(e.target.value)}
              className={selectClass}
            >
              <option value="">— Select a product —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Bottle Volume (ml)" required>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formVolumeMl}
                onChange={(e) => setFormVolumeMl(e.target.value)}
                placeholder="e.g. 100"
                className={inputClass}
              />
            </FormField>
            <FormField label="Quantity (units)" required>
              <input
                type="number"
                min="1"
                step="1"
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                placeholder="e.g. 3"
                className={inputClass}
              />
            </FormField>
          </div>
          <FormField label="Cost Per Unit (৳ BDT)" required>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formCostPerUnit}
              onChange={(e) => setFormCostPerUnit(e.target.value)}
              placeholder="e.g. 3500"
              className={inputClass}
            />
          </FormField>
          <FormField label="Batch Reference">
            <input
              type="text"
              value={formBatchRef}
              onChange={(e) => setFormBatchRef(e.target.value)}
              placeholder="e.g. BATCH-2024-NOV"
              className={inputClass}
            />
          </FormField>
          <FormField label="Notes">
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="e.g. Purchased from Lattafa BD Distributor"
              className={inputClass}
            />
          </FormField>
          <div className="flex items-center gap-3 pt-2">
            <Button variant="primary" onClick={handleAddSealed} isLoading={isPending}>
              Add to Inventory
            </Button>
            <Button variant="secondary" onClick={closeModal} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </div>
      </ModalOverlay>

      {/* ─── Edit Sealed Quantity Modal ───────────────────────── */}
      <ModalOverlay
        open={modal?.type === "editSealedQty"}
        onClose={closeModal}
        title="Update Sealed Bottle Quantity"
        description={
          modal?.type === "editSealedQty"
            ? `${modal.bottle.brandName} — ${modal.bottle.productName} (${formatVolume(modal.bottle.volumeMl)})`
            : ""
        }
      >
        <div className="space-y-4">
          <FormField label="New Quantity" required>
            <input
              type="number"
              min="0"
              step="1"
              value={formNewQuantity}
              onChange={(e) => setFormNewQuantity(e.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Reason for Adjustment" required>
            <input
              type="text"
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="e.g. Physical stock count correction"
              className={inputClass}
            />
          </FormField>
          <div className="flex items-center gap-3 pt-2">
            <Button variant="primary" onClick={handleUpdateSealedQty} isLoading={isPending}>
              Update Quantity
            </Button>
            <Button variant="secondary" onClick={closeModal} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </div>
      </ModalOverlay>

      {/* ─── Delete Sealed Bottle Modal ───────────────────────── */}
      <ModalOverlay
        open={modal?.type === "deleteSealed"}
        onClose={closeModal}
        title="Delete Sealed Bottle Record"
        description={
          modal?.type === "deleteSealed"
            ? `${modal.bottle.brandName} — ${modal.bottle.productName} (${modal.bottle.quantity} units)`
            : ""
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--status-error-bg)] border border-[var(--status-error-border)] text-[var(--status-error)] text-sm">
            <strong>Warning:</strong> This will permanently delete this sealed bottle record. This
            cannot be undone.
          </div>
          <FormField label="Reason for Deletion" required>
            <input
              type="text"
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="e.g. Duplicate entry, data entry error"
              className={inputClass}
            />
          </FormField>
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="destructive"
              onClick={handleDeleteSealed}
              isLoading={isPending}
            >
              Delete Permanently
            </Button>
            <Button variant="secondary" onClick={closeModal} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </div>
      </ModalOverlay>

      {/* ─── Convert Sealed → Source Modal ────────────────────── */}
      <ModalOverlay
        open={modal?.type === "convertSealed"}
        onClose={closeModal}
        title="Convert Sealed → Decant Source Bottle"
        description={
          modal?.type === "convertSealed"
            ? `Opens 1 unit of ${modal.bottle.brandName} — ${modal.bottle.productName} (${formatVolume(modal.bottle.volumeMl)}) for decanting.`
            : ""
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)]">
            This will <strong>decrease 1 sealed unit</strong> and create a new source bottle tracked
            in exact milliliters with derived cost per ml.
          </div>
          <FormField label="Optional Notes / Batch Details">
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="e.g. Opened on Shelf A2 for 5ml orders"
              className={inputClass}
            />
          </FormField>
          <div className="flex items-center gap-3 pt-2">
            <Button variant="primary" onClick={handleConvert} isLoading={isPending}>
              <RefreshCw className="h-4 w-4" />
              <span>Confirm Conversion</span>
            </Button>
            <Button variant="secondary" onClick={closeModal} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </div>
      </ModalOverlay>

      {/* ─── Adjust Source Bottle Remaining ml Modal ──────────── */}
      <ModalOverlay
        open={modal?.type === "adjustSource"}
        onClose={closeModal}
        title="Adjust Source Bottle Remaining ml"
        description={
          modal?.type === "adjustSource"
            ? `${modal.bottle.brandName} — ${modal.bottle.productName} (Total: ${formatVolume(modal.bottle.totalMl)}, Currently: ${formatVolume(modal.bottle.remainingMl)})`
            : ""
        }
      >
        <div className="space-y-4">
          <FormField label="New Remaining ml" required>
            <input
              type="number"
              step="0.001"
              min="0"
              value={formNewRemainingMl}
              onChange={(e) => setFormNewRemainingMl(e.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Reason for Adjustment" required>
            <input
              type="text"
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="e.g. Spill during filling, physical recount"
              className={inputClass}
            />
          </FormField>
          <div className="flex items-center gap-3 pt-2">
            <Button variant="primary" onClick={handleAdjustSource} isLoading={isPending}>
              Save Adjustment
            </Button>
            <Button variant="secondary" onClick={closeModal} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </div>
      </ModalOverlay>

      {/* ─── Retire Source Bottle Modal ───────────────────────── */}
      <ModalOverlay
        open={modal?.type === "retireSource"}
        onClose={closeModal}
        title="Retire Source Bottle"
        description={
          modal?.type === "retireSource"
            ? `${modal.bottle.brandName} — ${modal.bottle.productName} (${formatVolume(modal.bottle.remainingMl)} remaining)`
            : ""
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--status-error-bg)] border border-[var(--status-error-border)] text-[var(--status-error)] text-sm">
            Retiring this bottle marks it as no longer dispensable. Any remaining liquid will be
            written off in the audit trail.
          </div>
          <FormField label="Reason for Retirement" required>
            <input
              type="text"
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="e.g. Bottle damaged, scent degraded, too little liquid left"
              className={inputClass}
            />
          </FormField>
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="destructive"
              onClick={handleRetireSource}
              isLoading={isPending}
            >
              <Archive className="h-4 w-4" />
              <span>Retire Bottle</span>
            </Button>
            <Button variant="secondary" onClick={closeModal} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </div>
      </ModalOverlay>
    </div>
  );
}
