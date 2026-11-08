import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { Permission } from "@/lib/permissions";
import { ArrowLeft } from "lucide-react";
import { NewProductClient } from "./NewProductClient";

export const metadata = {
  title: "Add New Product | Shubash & Co. Admin",
};

export default async function NewProductPage() {
  await requirePermission(Permission.PRODUCTS_WRITE);

  const brands = await prisma.brand.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  }).catch(() => []);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-subtle)]">
        <Link
          href="/admin/products"
          className="p-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-strong)]">
            Add New Perfume
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Fill in product details, fragrance notes, and add decant sizes or full bottle pricing.
          </p>
        </div>
      </div>

      <NewProductClient brands={brands} />
    </div>
  );
}
