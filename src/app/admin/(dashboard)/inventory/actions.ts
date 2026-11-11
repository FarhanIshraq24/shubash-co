"use server";

import { requirePermission } from "@/lib/auth-helpers";
import { Permission } from "@/lib/permissions";
import { convertSealedToSourceBottle } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { StockMovementType, SourceBottleStatus } from "@prisma/client";
import Decimal from "decimal.js";
import { revalidatePath } from "next/cache";

function revalidateInventory() {
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/products");
}

// ─── Convert Sealed → Source Bottle ─────────────────────────────
export async function convertSealedBottleAction(sealedBottleId: string, notes?: string) {
  try {
    const admin = await requirePermission(Permission.INVENTORY_CONVERT);
    const result = await convertSealedToSourceBottle({
      sealedBottleId,
      userId: admin.id,
      notes,
    });

    revalidateInventory();
    return { success: true, data: result };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to convert bottle.";
    return { success: false, error: message };
  }
}

// ─── Add New Sealed Bottles ─────────────────────────────────────
export async function addSealedBottleAction(data: {
  productId: string;
  volumeMl: number;
  quantity: number;
  costPerUnit: number;
  batchRef?: string;
  notes?: string;
}) {
  try {
    const admin = await requirePermission(Permission.INVENTORY_FILL);

    // Validate inputs
    if (!data.productId) throw new Error("Please select a product.");
    if (!Number.isFinite(data.volumeMl) || data.volumeMl <= 0) throw new Error("Enter a valid bottle volume in ml.");
    if (!Number.isInteger(data.quantity) || data.quantity <= 0) throw new Error("Quantity must be a whole number of at least 1.");
    if (!Number.isFinite(data.costPerUnit) || data.costPerUnit < 0) throw new Error("Enter a valid cost per unit (0 or more).");

    const sealedBottle = await prisma.$transaction(async (tx) => {
      const bottle = await tx.sealedBottle.create({
        data: {
          productId: data.productId,
          volumeMl: new Decimal(data.volumeMl).toFixed(2),
          quantity: data.quantity,
          costPerUnit: new Decimal(data.costPerUnit).toFixed(2),
          batchRef: data.batchRef || null,
          notes: data.notes || null,
        },
      });

      // Log stock receive movement
      await tx.stockMovement.create({
        data: {
          type: StockMovementType.RECEIVE,
          sealedBottleId: bottle.id,
          quantityUnits: data.quantity,
          referenceId: bottle.id,
          referenceType: "SealedBottle",
          note: `Received ${data.quantity} sealed bottle(s) of ${data.volumeMl}ml (Batch: ${data.batchRef || "N/A"})`,
          createdByUserId: admin.id,
        },
      });

      return bottle;
    });

    revalidateInventory();
    return { success: true, data: { id: sealedBottle.id } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add sealed bottles.";
    return { success: false, error: message };
  }
}

// ─── Update Sealed Bottle Quantity ──────────────────────────────
export async function updateSealedQuantityAction(
  sealedBottleId: string,
  newQuantity: number,
  reason: string,
  details?: { costPerUnit?: number; batchRef?: string }
) {
  try {
    const admin = await requirePermission(Permission.INVENTORY_FILL);

    if (!Number.isInteger(newQuantity) || newQuantity < 0) throw new Error("Quantity must be a whole number (0 or more).");
    if (!reason.trim()) throw new Error("Reason is required for inventory adjustments.");

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.sealedBottle.findUnique({
        where: { id: sealedBottleId },
      });

      if (!existing) throw new Error("Sealed bottle not found.");

      const diff = newQuantity - existing.quantity;

      if (details?.costPerUnit !== undefined && (!Number.isFinite(details.costPerUnit) || details.costPerUnit < 0)) {
        throw new Error("Enter a valid cost per unit.");
      }

      const updated = await tx.sealedBottle.update({
        where: { id: sealedBottleId },
        data: {
          quantity: newQuantity,
          ...(details?.costPerUnit !== undefined ? { costPerUnit: new Decimal(details.costPerUnit).toFixed(2) } : {}),
          ...(details?.batchRef !== undefined ? { batchRef: details.batchRef.trim() || null } : {}),
        },
      });

      await tx.stockMovement.create({
        data: {
          type: StockMovementType.ADJUST,
          sealedBottleId: sealedBottleId,
          quantityUnits: Math.abs(diff),
          referenceId: sealedBottleId,
          referenceType: "SealedBottle",
          note: `Adjusted sealed quantity from ${existing.quantity} → ${newQuantity} (${diff > 0 ? "+" : ""}${diff}). Reason: ${reason}`,
          createdByUserId: admin.id,
        },
      });

      return updated;
    });

    revalidateInventory();
    return { success: true, data: { quantity: result.quantity } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update sealed bottle.";
    return { success: false, error: message };
  }
}

// ─── Adjust Source Bottle Remaining ml ──────────────────────────
export async function adjustSourceBottleAction(
  sourceBottleId: string,
  newRemainingMl: number,
  reason: string
) {
  try {
    const admin = await requirePermission(Permission.INVENTORY_FILL);

    if (!Number.isFinite(newRemainingMl) || newRemainingMl < 0) throw new Error("Enter a valid remaining ml (0 or more).");
    if (!reason.trim()) throw new Error("Reason is required for inventory adjustments.");

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.sourceBottle.findUnique({
        where: { id: sourceBottleId },
      });

      if (!existing) throw new Error("Source bottle not found.");

      const oldRemaining = new Decimal(existing.remainingMl.toString());
      const newRemaining = new Decimal(newRemainingMl);
      const reserved = new Decimal(existing.reservedMl.toString());

      if (newRemaining.lessThan(reserved)) {
        throw new Error(
          `Cannot set remaining to ${newRemaining}ml when ${reserved}ml is already reserved. Release reservations first.`
        );
      }

      if (newRemaining.greaterThan(new Decimal(existing.totalMl.toString()))) {
        throw new Error(`Remaining cannot exceed the bottle's total fill of ${existing.totalMl}ml.`);
      }

      const diff = newRemaining.minus(oldRemaining);

      // Auto-detect if the bottle should be marked EMPTY (or re-activated after a recount)
      const newStatus = newRemaining.lessThanOrEqualTo(0.5)
        ? SourceBottleStatus.EMPTY
        : existing.status === SourceBottleStatus.EMPTY
        ? SourceBottleStatus.ACTIVE
        : existing.status;

      const updated = await tx.sourceBottle.update({
        where: { id: sourceBottleId },
        data: {
          remainingMl: newRemaining.toFixed(3),
          status: newStatus,
        },
      });

      await tx.stockMovement.create({
        data: {
          type: StockMovementType.ADJUST,
          sourceBottleId: sourceBottleId,
          quantityMl: diff.abs().toFixed(3),
          referenceId: sourceBottleId,
          referenceType: "SourceBottle",
          note: `Adjusted remaining from ${oldRemaining}ml → ${newRemaining}ml (${diff.isPositive() ? "+" : ""}${diff}ml). Reason: ${reason}`,
          createdByUserId: admin.id,
        },
      });

      return updated;
    });

    revalidateInventory();
    return { success: true, data: { id: result.id } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to adjust source bottle.";
    return { success: false, error: message };
  }
}

// ─── Retire / Remove Source Bottle ──────────────────────────────
export async function retireSourceBottleAction(
  sourceBottleId: string,
  reason: string
) {
  try {
    const admin = await requirePermission(Permission.INVENTORY_FILL);

    if (!reason.trim()) throw new Error("Reason is required to retire a source bottle.");

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.sourceBottle.findUnique({
        where: { id: sourceBottleId },
      });

      if (!existing) throw new Error("Source bottle not found.");

      const reserved = new Decimal(existing.reservedMl.toString());
      if (reserved.greaterThan(0)) {
        throw new Error(
          `Cannot retire: ${reserved}ml is still reserved for active orders. Fulfil or release reservations first.`
        );
      }

      const updated = await tx.sourceBottle.update({
        where: { id: sourceBottleId },
        data: { status: SourceBottleStatus.RETIRED },
      });

      await tx.stockMovement.create({
        data: {
          type: StockMovementType.ADJUST,
          sourceBottleId: sourceBottleId,
          quantityMl: existing.remainingMl.toString(),
          referenceId: sourceBottleId,
          referenceType: "SourceBottle",
          note: `Retired source bottle. Remaining ${existing.remainingMl}ml written off. Reason: ${reason}`,
          createdByUserId: admin.id,
        },
      });

      return updated;
    });

    revalidateInventory();
    return { success: true, data: { id: result.id } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to retire source bottle.";
    return { success: false, error: message };
  }
}

// ─── Delete Sealed Bottle Record ────────────────────────────────
export async function deleteSealedBottleAction(
  sealedBottleId: string,
  reason: string
) {
  try {
    const admin = await requirePermission(Permission.INVENTORY_FILL);

    if (!reason.trim()) throw new Error("Reason is required to delete inventory.");

    await prisma.$transaction(async (tx) => {
      const existing = await tx.sealedBottle.findUnique({
        where: { id: sealedBottleId },
        include: { conversions: { take: 1 } },
      });

      if (!existing) throw new Error("Sealed bottle not found.");

      if (existing.conversions.length > 0) {
        throw new Error(
          "Cannot delete: this sealed bottle has been converted to source bottles. Set quantity to 0 instead."
        );
      }

      // Log the removal before deleting
      await tx.stockMovement.create({
        data: {
          type: StockMovementType.ADJUST,
          quantityUnits: existing.quantity,
          referenceId: sealedBottleId,
          referenceType: "SealedBottle",
          note: `Deleted sealed bottle record (${existing.quantity} units of ${existing.volumeMl}ml). Reason: ${reason}`,
          createdByUserId: admin.id,
        },
      });

      // Delete associated movements first
      await tx.stockMovement.deleteMany({
        where: { sealedBottleId: sealedBottleId },
      });

      await tx.sealedBottle.delete({
        where: { id: sealedBottleId },
      });
    });

    revalidateInventory();
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete sealed bottle.";
    return { success: false, error: message };
  }
}

// ─── Get Products List (for dropdown) ───────────────────────────
export async function getProductsForDropdownAction() {
  try {
    await requirePermission(Permission.INVENTORY_READ);

    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        active: true,
        brand: { select: { name: true } },
        variants: { where: { format: "FULL_BOTTLE" }, select: { volumeMl: true }, take: 1 },
      },
      orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
    });

    return {
      success: true,
      data: products.map((p) => ({
        id: p.id,
        label: `${p.brand.name} — ${p.name}${p.active ? "" : " (archived)"}`,
        defaultVolumeMl: p.variants[0]?.volumeMl.toString() ?? "",
      })),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load products.";
    return { success: false, error: message, data: [] as { id: string; label: string; defaultVolumeMl: string }[] };
  }
}

// ─── Add an already-opened Source Bottle directly ───────────────
// For bottles bought partially used, or stock that was opened before
// the system was in use.
export async function addSourceBottleAction(data: {
  productId: string;
  totalMl: number;
  remainingMl: number;
  costBasis: number;
  batchRef?: string;
  notes?: string;
}) {
  try {
    const admin = await requirePermission(Permission.INVENTORY_FILL);

    if (!data.productId) throw new Error("Please select a product.");
    if (!Number.isFinite(data.totalMl) || data.totalMl <= 0) throw new Error("Enter the bottle's full size in ml.");
    if (!Number.isFinite(data.remainingMl) || data.remainingMl <= 0) throw new Error("Enter how many ml are left in the bottle.");
    if (data.remainingMl > data.totalMl) throw new Error("Remaining ml cannot be more than the bottle size.");
    if (!Number.isFinite(data.costBasis) || data.costBasis < 0) throw new Error("Enter a valid bottle cost (0 or more).");

    const total = new Decimal(data.totalMl);
    const costPerMl = new Decimal(data.costBasis).dividedBy(total);

    const bottle = await prisma.$transaction(async (tx) => {
      const b = await tx.sourceBottle.create({
        data: {
          productId: data.productId,
          batchRef: data.batchRef?.trim() || null,
          totalMl: total.toFixed(3),
          remainingMl: new Decimal(data.remainingMl).toFixed(3),
          reservedMl: "0",
          costBasis: new Decimal(data.costBasis).toFixed(2),
          costPerMl: costPerMl.toFixed(4),
          status: SourceBottleStatus.ACTIVE,
          notes: data.notes?.trim() || "Added directly as an open decant bottle",
        },
      });
      await tx.stockMovement.create({
        data: {
          type: StockMovementType.RECEIVE,
          sourceBottleId: b.id,
          quantityMl: new Decimal(data.remainingMl).toFixed(3),
          referenceId: b.id,
          referenceType: "SourceBottle",
          note: `Added open decant bottle: ${data.remainingMl}ml of ${data.totalMl}ml (Batch: ${data.batchRef || "N/A"})`,
          createdByUserId: admin.id,
        },
      });
      return b;
    });

    revalidateInventory();
    return { success: true, data: { id: bottle.id } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add source bottle.";
    return { success: false, error: message };
  }
}
