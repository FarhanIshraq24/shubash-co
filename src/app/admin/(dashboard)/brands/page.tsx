import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { Permission } from "@/lib/permissions";
import { ArrowLeft } from "lucide-react";
import { BrandsClient } from "./BrandsClient";

export const metadata = {
  title: "Perfume Brands | Shubash & Co. Admin",
};

export default async function AdminBrandsPage() {
  await requirePermission(Permission.PRODUCTS_READ);

  const brandsRaw = await prisma.brand.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  }).catch(() => []);

  const brands = brandsRaw.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    country: b.country,
    logoUrl: b.logoUrl,
    description: b.description,
    active: b.active,
    productCount: b._count.products,
  }));

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
              Add, edit, or remove perfume brands. Brands must exist before you can add products.
            </p>
          </div>
        </div>
      </div>

      <BrandsClient brands={brands} />
    </div>
  );
}
