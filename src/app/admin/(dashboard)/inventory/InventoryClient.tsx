"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatBDT, formatVolume, formatDhakaDate } from "@/lib/utils";
import {
  convertSealedBottleAction,
  addSealedBottleAction,
  updateSealedQuantityAction,
  adjustSourceBottleAction,
  retireSourceBottleAction,
  deleteSealedBottleAction,
  getProductsForDropdownAction,
  addSourceBottleAction,
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
  defaultVolumeMl: string;
}

// ─── Reusable Modal Shell ───────────────────────────────────────

function ModalOverlay({
  open,
  onClose,
  title,
  description,
  error,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  error?: string | null;
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
        <div className="p-5 space-y-4">
          {error && (
            <div
              role="alert"
              className="p-3 rounded-[var(--radius-md)] border text-sm flex items-start gap-2 bg-[var(--status-error-bg)] border-[var(--status-error-border)] text-[var(--status-error)]"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {children}
        </div>
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalError, setModalError] = useState<string | null>(null);
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
    | { type: "addSource" }
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
  const [formTotalMl, setFormTotalMl] = useState("");

  // Clear auto-dismiss feedback after 5s
  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 6000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  // Load products for the "Add Sealed" form
  // Always reload so newly created products show up
  const loadProducts = async () => {
    const res = await getProductsForDropdownAction();
    if (res.success && res.data) {
      setProducts(res.data);
    } else {
      setModalError(res.error || "Could not load products.");
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
    setFormTotalMl("");
    setModalError(null);

    if (m.type === "addSealed" || m.type === "addSource") {
      void loadProducts();
    } else if (m.type === "editSealedQty") {
      setFormNewQuantity(m.bottle.quantity.toString());
      setFormCostPerUnit(m.bottle.costPerUnit);
      setFormBatchRef(m.bottle.batchRef || "");
    } else if (m.type === "adjustSource") {
      setFormNewRemainingMl(m.bottle.remainingMl);
    }

    setModal(m);
  };

  const closeModal = () => {
    setModal(null);
    setModalError(null);
  };

  /** Run a server action; keep the modal open and show the error inside it on failure. */
  const run = (
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string
  ) => {
    setModalError(null);
    startTransition(async () => {
      try {
        const res = await action();
        if (res.success) {
          setFeedback({ type: "success", message: successMessage });
          closeModal();
          router.refresh();
        } else {
          setModalError(res.error || "Something went wrong.");
        }
      } catch (e) {
        setModalError(e instanceof Error ? e.message : "Network error — please try again.");
      }
    });
  };

  const num = (v: string) => (v.trim() === "" ? NaN : Number(v));

  // ─── Handlers ──────────────────────────────────────

  const handleAddSealed = () => {
    if (!formProductId) return setModalError("Please select a product.");
    if (!(num(formVolumeMl) > 0)) return setModalError("Enter the bottle volume in ml.");
    if (!(Number.isInteger(num(formQuantity)) && num(formQuantity) > 0)) return setModalError("Quantity must be a whole number of at least 1.");
    if (!(num(formCostPerUnit) >= 0)) return setModalError("Enter the cost per unit (use 0 if unknown).");
    run(
      () =>
        addSealedBottleAction({
          productId: formProductId,
          volumeMl: num(formVolumeMl),
          quantity: num(formQuantity),
          costPerUnit: num(formCostPerUnit),
          batchRef: formBatchRef || undefined,
          notes: formNotes || undefined,
        }),
      "Sealed bottle(s) added to inventory!"
    );
  };

  const handleAddSource = () => {
    if (!formProductId) return setModalError("Please select a product.");
    if (!(num(formTotalMl) > 0)) return setModalError("Enter the bottle's full size in ml.");
    if (!(num(formNewRemainingMl) > 0)) return setModalError("Enter how many ml are left.");
    if (num(formNewRemainingMl) > num(formTotalMl)) return setModalError("Remaining ml cannot exceed the bottle size.");
    if (!(num(formCostPerUnit) >= 0)) return setModalError("Enter the bottle cost (use 0 if unknown).");
    run(
      () =>
        addSourceBottleAction({
          productId: formProductId,
          totalMl: num(formTotalMl),
          remainingMl: num(formNewRemainingMl),
          costBasis: num(formCostPerUnit),
          batchRef: formBatchRef || undefined,
          notes: formNotes || undefined,
        }),
      "Open decant bottle added — it is now available for decant orders."
    );
  };

  const handleUpdateSealedQty = () => {
    if (!modal || modal.type !== "editSealedQty") return;
    if (!(Number.isInteger(num(formNewQuantity)) && num(formNewQuantity) >= 0)) return setModalError("Quantity must be a whole number (0 or more).");
    if (!formReason.trim()) return setModalError("Please enter a reason for the adjustment.");
    const bottleId = modal.bottle.id;
    run(
      () =>
        updateSealedQuantityAction(bottleId, num(formNewQuantity), formReason, {
          costPerUnit: num(formCostPerUnit) >= 0 ? num(formCostPerUnit) : undefined,
          batchRef: formBatchRef,
        }),
      "Sealed bottle updated!"
    );
  };

  const handleDeleteSealed = () => {
    if (!modal || modal.type !== "deleteSealed") return;
    if (!formReason.trim()) return setModalError("Please enter a reason for deletion.");
    const bottleId = modal.bottle.id;
    run(() => deleteSealedBottleAction(bottleId, formReason), "Sealed bottle record deleted.");
  };

  const handleConvert = () => {
    if (!modal || modal.type !== "convertSealed") return;
    const bottleId = modal.bottle.id;
    run(
      () => convertSealedBottleAction(bottleId, formNotes),
      "Sealed bottle converted into an active decant source bottle!"
    );
  };

  const handleAdjustSource = () => {
    if (!modal || modal.type !== "adjustSource") return;
    if (!(num(formNewRemainingMl) >= 0)) return setModalError("Enter a valid remaining ml.");
    if (!formReason.trim()) return setModalError("Please enter a reason for the adjustment.");
    const bottleId = modal.bottle.id;
    run(
      () => adjustSourceBottleAction(bottleId, num(formNewRemainingMl), formReason),
      "Source bottle remaining ml adjusted!"
    );
  };

  const handleRetireSource = () => {
    if (!modal || modal.type !== "retireSource") return;
    if (!formReason.trim()) return setModalError("Please enter a reason for retiring the bottle.");
    const bottleId = modal.bottle.id;
    run(() => retireSourceBottleAction(bottleId, formReason), "Source bottle retired successfully.");
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
          <Button variant="secondary" size="sm" onClick={() => openModal({ type: "addSource" })}>
            <Plus className="h-4 w-4" />
            <span>Add Open Bottle</span>
          </Button>
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
        error={modalError}
        title="Add Sealed Bottles to Inventory"
        description="Record new sealed full bottles received from a supplier or purchase."
      >
        <div className="space-y-4">
          <FormField label="Product" required>
            <select
              value={formProductId}
              onChange={(e) => {
                setFormProductId(e.target.value);
                const opt = products.find((p) => p.id === e.target.value);
                if (opt?.defaultVolumeMl && !formVolumeMl) setFormVolumeMl(opt.defaultVolumeMl);
              }}
              className={selectClass}
            >
              <option value="">{productsLoaded ? "— Select a product —" : "Loading products…"}</option>
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

      {/* ─── Add Open Source Bottle Modal ─────────────────────── */}
      <ModalOverlay
        open={modal?.type === "addSource"}
        onClose={closeModal}
        error={modalError}
        title="Add an Open Decant Bottle"
        description="Record a bottle that is already open (e.g. bought partly used). Its liquid becomes available for decant orders immediately."
      >
        <div className="space-y-4">
          <FormField label="Product" required>
            <select value={formProductId} onChange={(e) => setFormProductId(e.target.value)} className={selectClass}>
              <option value="">{productsLoaded ? "— Select a product —" : "Loading products…"}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Bottle Size (ml)" required>
              <input type="number" step="0.01" min="0.01" value={formTotalMl} onChange={(e) => setFormTotalMl(e.target.value)} placeholder="e.g. 100" className={inputClass} />
            </FormField>
            <FormField label="ml Remaining" required>
              <input type="number" step="0.001" min="0" value={formNewRemainingMl} onChange={(e) => setFormNewRemainingMl(e.target.value)} placeholder="e.g. 85" className={inputClass} />
            </FormField>
          </div>
          <FormField label="Bottle Cost (৳ BDT)" required>
            <input type="number" step="0.01" min="0" value={formCostPerUnit} onChange={(e) => setFormCostPerUnit(e.target.value)} placeholder="Full purchase price of the bottle" className={inputClass} />
          </FormField>
          <FormField label="Batch Reference">
            <input type="text" value={formBatchRef} onChange={(e) => setFormBatchRef(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Notes">
            <input type="text" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className={inputClass} />
          </FormField>
          <div className="flex items-center gap-3 pt-2">
            <Button variant="primary" onClick={handleAddSource} isLoading={isPending}>
              Add Open Bottle
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
        error={modalError}
        title="Edit Sealed Bottle Stock"
        description={
          modal?.type === "editSealedQty"
            ? `${modal.bottle.brandName} — ${modal.bottle.productName} (${formatVolume(modal.bottle.volumeMl)})`
            : ""
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Units in Stock" required>
              <input
                type="number"
                min="0"
                step="1"
                value={formNewQuantity}
                onChange={(e) => setFormNewQuantity(e.target.value)}
                className={inputClass}
              />
            </FormField>
            <FormField label="Cost Per Unit (৳)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={formCostPerUnit}
                onChange={(e) => setFormCostPerUnit(e.target.value)}
                className={inputClass}
              />
            </FormField>
          </div>
          <FormField label="Batch Reference">
            <input
              type="text"
              value={formBatchRef}
              onChange={(e) => setFormBatchRef(e.target.value)}
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
              Save Changes
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
        error={modalError}
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
        error={modalError}
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
        error={modalError}
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
        error={modalError}
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
