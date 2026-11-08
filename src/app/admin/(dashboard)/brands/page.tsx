import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { Permission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Award, ArrowLeft } from "lucide-react";
import { Prisma } from "@prisma/client";

export const metadata = {
  title: "Perfume Brands | Shubash & Co. Admin",
};

export default async function AdminBrandsPage() {
  await requirePermission(Permission.PRODUCTS_READ);

  type RawBrand = Prisma.BrandGetPayload<{
    include: {
      _count: { select: { products: true } };
    };
  }>;

  let brandsRaw: RawBrand[] = [];

  try {
    brandsRaw = await prisma.brand.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });
  } catch {
    // Database empty or not migrated
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="p-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
            title="Back to Products"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-strong)]">
              Fragrance Brands & Houses
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Verified perfume houses cataloged at Shubash & Co.
            </p>
          </div>
        </div>
      </div>

      {brandsRaw.length === 0 ? (
        <div className="p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] space-y-3">
          <Award className="h-10 w-10 text-[var(--text-muted)] mx-auto" />
          <h3 className="text-lg font-bold text-[var(--text-strong)]">No brands added yet</h3>
          <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
            Brands will be automatically populated through the seed script or catalog manager.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Country of Origin</TableHead>
              <TableHead>Cataloged Scents</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brandsRaw.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-bold text-[var(--text-strong)]">
                  {b.name}
                </TableCell>
                <TableCell className="text-xs text-[var(--text-muted)] font-mono">
                  {b.slug}
                </TableCell>
                <TableCell className="text-sm text-[var(--text-secondary)]">
                  {b.country || "—"}
                </TableCell>
                <TableCell className="tabular-nums font-semibold text-[var(--text-strong)]">
                  {b._count.products} products
                </TableCell>
                <TableCell>
                  <Badge variant={b.active ? "success" : "default"}>
                    {b.active ? "Active" : "Archived"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
