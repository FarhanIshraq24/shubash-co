"use server";

import { requirePermission } from "@/lib/auth-helpers";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  ProductFormat,
  Concentration,
  FragranceFamily,
  Gender,
  InventoryPolicy,
} from "@prisma/client";
import Decimal from "decimal.js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function revalidateProducts() {
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/products");
  revalidatePath("/");
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface VariantInput {
  format: "DECANT" | "FULL_BOTTLE";
  volumeMl: number;
  price: number;
  compareAtPrice?: number;
  sku?: string;
  packagingNote?: string;
}

export interface ProductInput {
  name: string;
  brandId: string;
  description?: string;
  topNotes?: string;
  middleNotes?: string;
  baseNotes?: string;
  concentration?: string;
  fragranceFamily?: string;
  gender?: string;
  format: string;
  active: boolean;
  featured: boolean;
  metaTitle?: string;
  metaDescription?: string;
  variants: VariantInput[];
}

export async function createProductAction(data: ProductInput) {
  try {
    await requirePermission(Permission.PRODUCTS_WRITE);

    if (!data.name.trim()) throw new Error("Product name is required.");
    if (!data.brandId) throw new Error("Brand is required.");
    if (data.variants.length === 0) throw new Error("At least one variant (size + price) is required.");

    for (const v of data.variants) {
      if (v.volumeMl <= 0) throw new Error("Variant volume must be positive.");
      if (v.price < 0) throw new Error("Variant price cannot be negative.");
    }

    const baseSlug = slugify(data.name);
    // ensure uniqueness by appending a counter if needed
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          name: data.name.trim(),
          slug,
          brandId: data.brandId,
          description: data.description?.trim() || null,
          topNotes: data.topNotes?.trim() || null,
          middleNotes: data.middleNotes?.trim() || null,
          baseNotes: data.baseNotes?.trim() || null,
          concentration: (data.concentration as Concentration) || null,
          fragranceFamily: (data.fragranceFamily as FragranceFamily) || null,
          gender: (data.gender as Gender) || null,
          format: (data.format as ProductFormat) || ProductFormat.BOTH,
          active: data.active,
          featured: data.featured,
          metaTitle: data.metaTitle?.trim() || null,
          metaDescription: data.metaDescription?.trim() || null,
        },
      });

      // Create variants
      for (let i = 0; i < data.variants.length; i++) {
        const v = data.variants[i];
        const sku = v.sku?.trim() || `${slug}-${v.format.toLowerCase()}-${v.volumeMl}ml-${Date.now()}-${i}`;
        await tx.productVariant.create({
          data: {
            productId: p.id,
            sku,
            format: v.format as ProductFormat,
            volumeMl: new Decimal(v.volumeMl).toFixed(2),
            price: new Decimal(v.price).toFixed(2),
            compareAtPrice: v.compareAtPrice
              ? new Decimal(v.compareAtPrice).toFixed(2)
              : null,
            inventoryPolicy: InventoryPolicy.TRACK,
            active: true,
            packagingNote: v.packagingNote?.trim() || null,
            position: i,
          },
        });
      }

      return p;
    });

    revalidateProducts();
    return { success: true, data: { id: product.id, slug: product.slug } };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create product." };
  }
}

export async function updateProductAction(id: string, data: Omit<ProductInput, "variants">) {
  try {
    await requirePermission(Permission.PRODUCTS_WRITE);
    if (!data.name.trim()) throw new Error("Product name is required.");
    if (!data.brandId) throw new Error("Brand is required.");

    await prisma.product.update({
      where: { id },
      data: {
        name: data.name.trim(),
        brandId: data.brandId,
        description: data.description?.trim() || null,
        topNotes: data.topNotes?.trim() || null,
        middleNotes: data.middleNotes?.trim() || null,
        baseNotes: data.baseNotes?.trim() || null,
        concentration: (data.concentration as Concentration) || null,
        fragranceFamily: (data.fragranceFamily as FragranceFamily) || null,
        gender: (data.gender as Gender) || null,
        format: (data.format as ProductFormat) || ProductFormat.BOTH,
        active: data.active,
        featured: data.featured,
        metaTitle: data.metaTitle?.trim() || null,
        metaDescription: data.metaDescription?.trim() || null,
      },
    });

    revalidateProducts();
    revalidatePath(`/admin/products/${id}`);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update product." };
  }
}

export async function addVariantAction(productId: string, v: VariantInput) {
  try {
    await requirePermission(Permission.PRODUCTS_WRITE);
    if (v.volumeMl <= 0) throw new Error("Volume must be positive.");
    if (v.price < 0) throw new Error("Price cannot be negative.");

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { slug: true } });
    if (!product) throw new Error("Product not found.");

    const sku = v.sku?.trim() || `${product.slug}-${v.format.toLowerCase()}-${v.volumeMl}ml-${Date.now()}`;
    const count = await prisma.productVariant.count({ where: { productId } });

    await prisma.productVariant.create({
      data: {
        productId,
        sku,
        format: v.format as ProductFormat,
        volumeMl: new Decimal(v.volumeMl).toFixed(2),
        price: new Decimal(v.price).toFixed(2),
        compareAtPrice: v.compareAtPrice ? new Decimal(v.compareAtPrice).toFixed(2) : null,
        inventoryPolicy: InventoryPolicy.TRACK,
        active: true,
        packagingNote: v.packagingNote?.trim() || null,
        position: count,
      },
    });

    revalidateProducts();
    revalidatePath(`/admin/products/${productId}`);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to add variant." };
  }
}

export async function updateVariantAction(
  variantId: string,
  data: { price: number; compareAtPrice?: number; active: boolean; packagingNote?: string }
) {
  try {
    await requirePermission(Permission.PRODUCTS_WRITE);

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { productId: true },
    });
    if (!variant) throw new Error("Variant not found.");

    await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        price: new Decimal(data.price).toFixed(2),
        compareAtPrice: data.compareAtPrice ? new Decimal(data.compareAtPrice).toFixed(2) : null,
        active: data.active,
        packagingNote: data.packagingNote?.trim() || null,
      },
    });

    revalidateProducts();
    revalidatePath(`/admin/products/${variant.productId}`);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update variant." };
  }
}

export async function deleteVariantAction(variantId: string) {
  try {
    await requirePermission(Permission.PRODUCTS_DELETE);

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { _count: { select: { orderItems: true } } },
    });
    if (!variant) throw new Error("Variant not found.");
    if (variant._count.orderItems > 0) {
      throw new Error("Cannot delete: this variant has order history. Deactivate it instead.");
    }

    await prisma.productVariant.delete({ where: { id: variantId } });
    revalidateProducts();
    revalidatePath(`/admin/products/${variant.productId}`);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete variant." };
  }
}

export async function toggleProductActiveAction(id: string, active: boolean) {
  try {
    await requirePermission(Permission.PRODUCTS_WRITE);
    await prisma.product.update({ where: { id }, data: { active } });
    revalidateProducts();
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to toggle product." };
  }
}

export async function deleteProductAction(id: string) {
  try {
    await requirePermission(Permission.PRODUCTS_DELETE);

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: { select: { variants: { where: { orderItems: { some: {} } } } } },
      },
    });
    if (!product) throw new Error("Product not found.");

    // soft-delete — archive instead of hard delete if it has order history
    await prisma.product.update({ where: { id }, data: { active: false } });
    revalidateProducts();
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete product." };
  }
}

export async function getBrandsForDropdownAction() {
  try {
    await requirePermission(Permission.PRODUCTS_READ);
    const brands = await prisma.brand.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return { success: true, data: brands };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load brands.", data: [] as { id: string; name: string }[] };
  }
}

export async function createProductAndRedirect(data: ProductInput) {
  let productId = "";
  try {
    const res = await createProductAction(data);
    if (!res.success || !res.data) throw new Error(res.error);
    productId = res.data.id;
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create product." };
  }
  redirect(`/admin/products/${productId}`);
}
