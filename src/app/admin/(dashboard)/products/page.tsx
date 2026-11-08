import React from "react";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { Permission } from "@/lib/permissions";
import { formatBDT, formatVolume } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Package, ExternalLink } from "lucide-react";
import Decimal from "decimal.js";
import { Prisma } from "@prisma/client";

export const metadata = {
  title: "Products & Variants | Shubash & Co. Admin",
};

export default async function AdminProductsPage() {
  await requirePermission(Permission.PRODUCTS_READ);

  type RawProduct = Prisma.ProductGetPayload<{
    include: {
      brand: true;
      images: true;
      variants: true;
      sourceBottles: { select: { remainingMl: true; reservedMl: true } };
      sealedBottles: { select: { quantity: true } };
    };
  }>;

  let productsRaw: RawProduct[] = [];

  try {
    productsRaw = await prisma.product.findMany({
      include: {
        brand: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          take: 1,
        },
        variants: {
          orderBy: [{ format: "asc" }, { price: "asc" }],
        },
        sourceBottles: {
          where: { status: "ACTIVE" },
          select: { remainingMl: true, reservedMl: true },
        },
        sealedBottles: {
          select: { quantity: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // Database empty or not migrated yet during build
  }

  const products = productsRaw.map((p) => {
    const decantVariants = p.variants.filter((v) => v.format === "DECANT");
    const fullBottleVariants = p.variants.filter((v) => v.format === "FULL_BOTTLE");

    const availableLiquid = p.sourceBottles.reduce((acc, sb) => {
      const remaining = new Decimal(sb.remainingMl.toString());
      const reserved = new Decimal(sb.reservedMl.toString());
      const avail = remaining.minus(reserved);
      return acc.plus(avail.isPositive() ? avail : 0);
    }, new Decimal(0));

    const sealedUnits = p.sealedBottles.reduce((acc, sb) => acc + sb.quantity, 0);

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand.name,
      format: p.format,
      concentration: p.concentration,
      fragranceFamily: p.fragranceFamily,
      active: p.active,
      imageUrl: p.images[0]?.url || null,
      decantCount: decantVariants.length,
      fullBottleCount: fullBottleVariants.length,
      lowestDecantPrice: decantVariants.length > 0 ? decantVariants[0].price : null,
      lowestFullBottlePrice: fullBottleVariants.length > 0 ? fullBottleVariants[0].price : null,
      availableLiquid: availableLiquid.toNumber(),
      sealedUnits,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-strong)]">
            Fragrance Products
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage product descriptions, fragrance pyramids, decant sizes, and retail pricing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/brands">
            <Button variant="secondary" size="sm">
              Manage Brands
            </Button>
          </Link>
          <Link href="/admin/inventory">
            <Button variant="primary" size="sm">
              <Package className="h-4 w-4" />
              <span>Decant Liquid Status</span>
            </Button>
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] space-y-3">
          <Package className="h-10 w-10 text-[var(--text-muted)] mx-auto" />
          <h3 className="text-lg font-bold text-[var(--text-strong)]">No products cataloged</h3>
          <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
            Populate sample products using the development seed script or add your inventory.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product & Brand</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Concentration</TableHead>
              <TableHead>Decant Liquid</TableHead>
              <TableHead>Sealed Stock</TableHead>
              <TableHead>Pricing (BDT)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] relative shrink-0 overflow-hidden flex items-center justify-center">
                      {p.imageUrl ? (
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-[var(--text-muted)]" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-[var(--text-strong)]">{p.name}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{p.brand}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="default">{p.format}</Badge>
                </TableCell>
                <TableCell className="text-xs font-semibold text-[var(--text-strong)]">
                  {p.concentration || "—"}
                </TableCell>
                <TableCell className="tabular-nums">
                  <span className="font-bold text-[var(--text-strong)]">
                    {formatVolume(p.availableLiquid)}
                  </span>
                  <div className="text-xs text-[var(--text-muted)]">{p.decantCount} size(s)</div>
                </TableCell>
                <TableCell className="tabular-nums">
                  <span className="font-bold text-[var(--text-strong)]">
                    {p.sealedUnits} unit(s)
                  </span>
                  <div className="text-xs text-[var(--text-muted)]">
                    {p.fullBottleCount} bottle size(s)
                  </div>
                </TableCell>
                <TableCell className="text-xs space-y-0.5">
                  {p.lowestDecantPrice && (
                    <div className="text-[var(--text-strong)] font-semibold">
                      Decants from {formatBDT(p.lowestDecantPrice)}
                    </div>
                  )}
                  {p.lowestFullBottlePrice && (
                    <div className="text-[var(--text-secondary)]">
                      Bottle: {formatBDT(p.lowestFullBottlePrice)}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={p.active ? "success" : "default"}>
                    {p.active ? "Active" : "Archived"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/products/${p.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-strong)] p-1.5 rounded hover:bg-[var(--surface-subtle)]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>View</span>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
