import React from "react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { Permission } from "@/lib/permissions";
import { InventoryClient } from "./InventoryClient";
import { Prisma } from "@prisma/client";
import Decimal from "decimal.js";

export const metadata = {
  title: "Decant Inventory & Conversions | Shubash & Co. Admin",
};

export default async function AdminInventoryPage() {
  await requirePermission(Permission.INVENTORY_READ);

  type RawSourceBottle = Prisma.SourceBottleGetPayload<{
    include: { product: { include: { brand: true } } };
  }>;
  type RawSealedBottle = Prisma.SealedBottleGetPayload<{
    include: { product: { include: { brand: true } } };
  }>;
  type RawMovement = Prisma.StockMovementGetPayload<Record<string, never>>;

  let sourceBottlesRaw: RawSourceBottle[] = [];
  let sealedBottlesRaw: RawSealedBottle[] = [];
  let recentMovementsRaw: RawMovement[] = [];

  try {
    [sourceBottlesRaw, sealedBottlesRaw, recentMovementsRaw] = await Promise.all([
      prisma.sourceBottle.findMany({
        include: {
          product: {
            include: { brand: true },
          },
        },
        orderBy: [{ status: "asc" }, { openedAt: "desc" }],
      }),
      prisma.sealedBottle.findMany({
        where: { quantity: { gt: 0 } },
        include: {
          product: {
            include: { brand: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.stockMovement.findMany({
        take: 30,
        orderBy: { createdAt: "desc" },
      }),
    ]);
  } catch {
    // Database empty or not connected during local build phase
  }

  // Calculate totals
  let totalAvailableMl = 0;
  let totalReservedMl = 0;

  const sourceBottles = sourceBottlesRaw.map((b) => {
    const remaining = new Decimal(b.remainingMl.toString());
    const reserved = new Decimal(b.reservedMl.toString());
    const available = remaining.minus(reserved);

    if (b.status === "ACTIVE") {
      totalAvailableMl += (available.isPositive() ? available : new Decimal(0)).toNumber();
      totalReservedMl += reserved.toNumber();
    }

    return {
      id: b.id,
      productName: b.product.name,
      brandName: b.product.brand.name,
      batchRef: b.batchRef,
      totalMl: b.totalMl.toString(),
      remainingMl: b.remainingMl.toString(),
      reservedMl: b.reservedMl.toString(),
      availableMl: (available.isPositive() ? available : new Decimal(0)).toString(),
      costBasis: b.costBasis.toString(),
      costPerMl: b.costPerMl.toString(),
      status: b.status,
      openedAt: b.openedAt.toISOString(),
    };
  });

  const sealedBottles = sealedBottlesRaw.map((b) => ({
    id: b.id,
    productName: b.product.name,
    brandName: b.product.brand.name,
    batchRef: b.batchRef,
    volumeMl: b.volumeMl.toString(),
    quantity: b.quantity,
    costPerUnit: b.costPerUnit.toString(),
  }));

  const recentMovements = recentMovementsRaw.map((m) => {
    let quantityDisplay = "—";
    if (m.quantityMl) {
      quantityDisplay = `${m.quantityMl.toString()}ml`;
    } else if (m.quantityUnits) {
      quantityDisplay = `${m.quantityUnits} unit(s)`;
    }

    return {
      id: m.id,
      type: m.type,
      quantity: quantityDisplay,
      note: m.note,
      createdAt: m.createdAt.toISOString(),
    };
  });

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-[var(--border-subtle)]">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-strong)]">
          Decants & Inventory Engine
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Precision liquid volume tracking, sealed bottle conversion, and audit logs.
        </p>
      </div>

      <InventoryClient
        sourceBottles={sourceBottles}
        sealedBottles={sealedBottles}
        recentMovements={recentMovements}
        totalAvailableMl={totalAvailableMl}
        totalReservedMl={totalReservedMl}
      />
    </div>
  );
}
