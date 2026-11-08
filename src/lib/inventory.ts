import { prisma } from "@/lib/prisma";
import { StockMovementType, SourceBottleStatus, ReservationStatus } from "@prisma/client";
import Decimal from "decimal.js";

export interface ConvertBottleParams {
  sealedBottleId: string;
  userId: string;
  notes?: string;
}

export interface AdjustStockParams {
  sourceBottleId: string;
  newRemainingMl: number;
  reason: string;
  userId: string;
}

/**
 * Convert a sealed retail bottle into an active decant source bottle
 * Core Rule: Reduces 1 sealed unit, opens a source bottle tracked in ml,
 * calculates exact cost per ml, and logs bidirectional stock movements.
 */
export async function convertSealedToSourceBottle(params: ConvertBottleParams) {
  const { sealedBottleId, userId, notes } = params;

  return await prisma.$transaction(async (tx) => {
    const sealedBottle = await tx.sealedBottle.findUnique({
      where: { id: sealedBottleId },
      include: { product: true },
    });

    if (!sealedBottle) {
      throw new Error("Sealed bottle not found.");
    }

    if (sealedBottle.quantity < 1) {
      throw new Error(`Cannot convert bottle: stock has 0 units remaining.`);
    }

    const volumeMl = new Decimal(sealedBottle.volumeMl.toString());
    const costBasis = new Decimal(sealedBottle.costPerUnit.toString());

    if (volumeMl.isZero() || volumeMl.isNegative()) {
      throw new Error("Invalid volume on sealed bottle.");
    }

    // Exact cost per ml = cost basis / total volume
    const costPerMl = costBasis.dividedBy(volumeMl);

    // 1. Decrement sealed bottle unit
    const updatedSealed = await tx.sealedBottle.update({
      where: { id: sealedBottleId },
      data: {
        quantity: { decrement: 1 },
      },
    });

    // 2. Create the decant source bottle
    const sourceBottle = await tx.sourceBottle.create({
      data: {
        productId: sealedBottle.productId,
        locationId: sealedBottle.locationId,
        batchRef: sealedBottle.batchRef,
        totalMl: volumeMl.toString(),
        remainingMl: volumeMl.toString(),
        reservedMl: "0",
        costBasis: costBasis.toString(),
        costPerMl: costPerMl.toFixed(4),
        convertedFromBottleId: sealedBottle.id,
        status: SourceBottleStatus.ACTIVE,
        notes: notes || `Converted from sealed bottle (Batch: ${sealedBottle.batchRef || "N/A"})`,
      },
    });

    // 3. Log Stock Movements (audit trail)
    await tx.stockMovement.create({
      data: {
        type: StockMovementType.CONVERSION_OUT,
        sealedBottleId: sealedBottle.id,
        quantityUnits: 1,
        referenceId: sourceBottle.id,
        referenceType: "SourceBottle",
        note: `Converted 1 sealed unit into decant source bottle ${sourceBottle.id}`,
        createdByUserId: userId,
      },
    });

    await tx.stockMovement.create({
      data: {
        type: StockMovementType.CONVERSION_IN,
        sourceBottleId: sourceBottle.id,
        quantityMl: volumeMl.toString(),
        referenceId: sealedBottle.id,
        referenceType: "SealedBottle",
        note: `Opened ${volumeMl}ml decant source from sealed bottle ${sealedBottle.id}`,
        createdByUserId: userId,
      },
    });

    return {
      sourceBottle,
      remainingSealedUnits: updatedSealed.quantity,
    };
  });
}

/**
 * Reserve liquid from an active source bottle for an order item
 */
export async function reserveLiquidForOrderItem(params: {
  productId: string;
  variantId: string;
  volumeMl: Decimal | number;
  orderItemId: string;
  expiresInMinutes?: number;
}) {
  const { productId, variantId, volumeMl, orderItemId, expiresInMinutes = 60 } = params;
  const requestedMl = new Decimal(volumeMl.toString());

  return await prisma.$transaction(async (tx) => {
    // Find active source bottles for this product with sufficient available liquid
    const sourceBottles = await tx.sourceBottle.findMany({
      where: {
        productId,
        status: SourceBottleStatus.ACTIVE,
      },
      orderBy: { openedAt: "asc" }, // FIFO order of opened bottles
    });

    let chosenBottle = null;

    for (const bottle of sourceBottles) {
      const remaining = new Decimal(bottle.remainingMl.toString());
      const reserved = new Decimal(bottle.reservedMl.toString());
      const available = remaining.minus(reserved);

      if (available.greaterThanOrEqualTo(requestedMl)) {
        chosenBottle = bottle;
        break;
      }
    }

    if (!chosenBottle) {
      throw new Error(
        `Insufficient liquid stock for ${requestedMl}ml decant of product ${productId}`
      );
    }

    // Atomically increment reservedMl on the source bottle
    const updatedBottle = await tx.sourceBottle.update({
      where: { id: chosenBottle.id },
      data: {
        reservedMl: { increment: requestedMl.toString() },
      },
    });

    // Create reservation record
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    const reservation = await tx.stockReservation.create({
      data: {
        orderItemId,
        sourceBottleId: chosenBottle.id,
        variantId,
        volumeMl: requestedMl.toString(),
        status: ReservationStatus.ACTIVE,
        expiresAt,
      },
    });

    // Log stock reservation movement
    await tx.stockMovement.create({
      data: {
        type: StockMovementType.RESERVE,
        sourceBottleId: chosenBottle.id,
        quantityMl: requestedMl.toString(),
        referenceId: reservation.id,
        referenceType: "StockReservation",
        note: `Reserved ${requestedMl}ml for order item ${orderItemId}`,
      },
    });

    return {
      reservation,
      sourceBottle: updatedBottle,
    };
  });
}

/**
 * Complete decant preparation/filling for an order item
 * Consumes the reserved liquid and records any physical wastage.
 */
export async function recordDecantFilling(params: {
  orderItemId: string;
  wasteMl?: number;
  userId?: string;
  notes?: string;
}) {
  const { orderItemId, wasteMl = 0, userId, notes } = params;
  const wasteDecimal = new Decimal(wasteMl.toString());

  return await prisma.$transaction(async (tx) => {
    const reservation = await tx.stockReservation.findUnique({
      where: { orderItemId },
      include: { sourceBottle: true },
    });

    if (!reservation) {
      throw new Error(`No stock reservation found for order item ${orderItemId}`);
    }

    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new Error(`Reservation is already ${reservation.status}`);
    }

    const reservedVolume = new Decimal(reservation.volumeMl.toString());
    const totalDeducted = reservedVolume.plus(wasteDecimal);

    // Update reservation status to FULFILLED
    await tx.stockReservation.update({
      where: { id: reservation.id },
      data: {
        status: ReservationStatus.FULFILLED,
        fulfilledAt: new Date(),
      },
    });

    // Deduct physical remaining liquid and release reserved status
    const updatedSource = await tx.sourceBottle.update({
      where: { id: reservation.sourceBottleId },
      data: {
        remainingMl: { decrement: totalDeducted.toString() },
        reservedMl: { decrement: reservedVolume.toString() },
        status:
          new Decimal(reservation.sourceBottle.remainingMl.toString())
            .minus(totalDeducted)
            .lessThanOrEqualTo(0.5) // Mark empty if <= 0.5ml left
            ? SourceBottleStatus.EMPTY
            : SourceBottleStatus.ACTIVE,
      },
    });

    // Create production record
    const production = await tx.decantProduction.create({
      data: {
        orderItemId,
        sourceBottleId: reservation.sourceBottleId,
        volumeMl: reservedVolume.toString(),
        wasteMl: wasteDecimal.toString(),
        producedByUserId: userId,
        notes,
      },
    });

    // Log FILL movement
    await tx.stockMovement.create({
      data: {
        type: StockMovementType.FILL,
        sourceBottleId: reservation.sourceBottleId,
        quantityMl: reservedVolume.toString(),
        referenceId: production.id,
        referenceType: "DecantProduction",
        note: `Filled ${reservedVolume}ml decant for order item ${orderItemId}`,
        createdByUserId: userId,
      },
    });

    // Log WASTE movement if waste was reported
    if (wasteDecimal.greaterThan(0)) {
      await tx.stockMovement.create({
        data: {
          type: StockMovementType.WASTE,
          sourceBottleId: reservation.sourceBottleId,
          quantityMl: wasteDecimal.toString(),
          referenceId: production.id,
          referenceType: "DecantProduction",
          note: `Filling wastage of ${wasteDecimal}ml recorded`,
          createdByUserId: userId,
        },
      });
    }

    return {
      production,
      sourceBottle: updatedSource,
    };
  });
}

/**
 * Release unconsumed reservation on order cancellation
 */
export async function releaseStockReservation(orderItemId: string, reason?: string) {
  return await prisma.$transaction(async (tx) => {
    const reservation = await tx.stockReservation.findUnique({
      where: { orderItemId },
    });

    if (!reservation || reservation.status !== ReservationStatus.ACTIVE) {
      return null;
    }

    const volume = new Decimal(reservation.volumeMl.toString());

    // Update reservation
    await tx.stockReservation.update({
      where: { id: reservation.id },
      data: {
        status: ReservationStatus.RELEASED,
        releasedAt: new Date(),
      },
    });

    // Decrement reservedMl on source bottle
    await tx.sourceBottle.update({
      where: { id: reservation.sourceBottleId },
      data: {
        reservedMl: { decrement: volume.toString() },
      },
    });

    // Log UNRESERVE movement
    await tx.stockMovement.create({
      data: {
        type: StockMovementType.UNRESERVE,
        sourceBottleId: reservation.sourceBottleId,
        quantityMl: volume.toString(),
        referenceId: reservation.id,
        referenceType: "StockReservation",
        note: `Released reservation of ${volume}ml: ${reason || "Order cancelled before filling"}`,
      },
    });

    return true;
  });
}
