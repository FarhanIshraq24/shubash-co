import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { Permission } from "@/lib/permissions";
import { ArrowLeft } from "lucide-react";
import { EditProductClient } from "./EditProductClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, select: { name: true } }).catch(() => null);
  return { title: product ? `Edit: ${product.name} | Admin` : "Edit Product | Admin" };
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(Permission.PRODUCTS_WRITE);
  const { id } = await params;

  const [product, brands] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        variants: { orderBy: [{ format: "asc" }, { volumeMl: "asc" }] },
        images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
        sealedBottles: {
          select: { id: true, quantity: true, volumeMl: true, batchRef: true },
        },
        sourceBottles: {
          where: { status: "ACTIVE" },
          select: { id: true, remainingMl: true, reservedMl: true, batchRef: true },
        },
      },
    }).catch(() => null),
    prisma.brand.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }).catch(() => []),
  ]);

  if (!product) notFound();

  const productData = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brandId: product.brandId,
    brandName: product.brand.name,
    description: product.description || "",
    topNotes: product.topNotes || "",
    middleNotes: product.middleNotes || "",
    baseNotes: product.baseNotes || "",
    concentration: product.concentration || "",
    fragranceFamily: product.fragranceFamily || "",
    gender: product.gender || "",
    format: product.format,
    active: product.active,
    featured: product.featured,
    metaTitle: product.metaTitle || "",
    metaDescription: product.metaDescription || "",
    variants: product.variants.map((v) => ({
      id: v.id,
      format: v.format as string,
      volumeMl: v.volumeMl.toString(),
      price: v.price.toString(),
      compareAtPrice: v.compareAtPrice?.toString() || "",
      sku: v.sku,
      packagingNote: v.packagingNote || "",
      active: v.active,
    })),
    images: product.images.map((img) => ({
      id: img.id,
      url: img.url,
      altText: img.altText || "",
      isPrimary: img.isPrimary,
    })),
    stockSummary: {
      sealedUnits: product.sealedBottles.reduce((s, b) => s + b.quantity, 0),
      availableMl: product.sourceBottles.reduce((s, b) => {
        const rem = parseFloat(b.remainingMl.toString());
        const res = parseFloat(b.reservedMl.toString());
        return s + Math.max(0, rem - res);
      }, 0),
    },
  };

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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-strong)]">
            {product.name}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {product.brand.name} · <span className="font-mono text-xs">/products/{product.slug}</span>
          </p>
        </div>
      </div>

      <EditProductClient product={productData} brands={brands} />
    </div>
  );
}
