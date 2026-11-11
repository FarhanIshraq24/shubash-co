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
import { deleteStoredImage, isAcceptableImageUrl } from "@/lib/media";

function revalidateProducts() {
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/products");
  revalidatePath("/");
}

function makeSku(slug: string, format: string, volumeMl: number) {
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slug}-${format === "DECANT" ? "d" : "fb"}-${volumeMl}ml-${suffix}`.toUpperCase();
}

function friendlyError(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002") return "That SKU or slug is already used by another product. Please choose a different one.";
    if (code === "P2025") return "Record not found — it may have been deleted. Refresh the page.";
    if (code === "P2003") return "This record is linked to other data (orders or stock) and cannot be removed.";
  }
  if (error instanceof Error) {
    // Never leak raw Prisma messages to the UI
    if (error.message.includes("prisma.") || error.message.includes("Invalid `")) return fallback;
    return error.message;
  }
  return fallback;
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
  images?: { url: string; altText?: string }[];
}

export async function createProductAction(data: ProductInput) {
  try {
    await requirePermission(Permission.PRODUCTS_WRITE);

    if (!data.name.trim()) throw new Error("Product name is required.");
    if (!data.brandId) throw new Error("Brand is required.");
    if (data.variants.length === 0) throw new Error("At least one variant (size + price) is required.");

    for (const v of data.variants) {
      if (!Number.isFinite(v.volumeMl) || v.volumeMl <= 0) throw new Error("Variant volume must be positive.");
      if (!Number.isFinite(v.price) || v.price < 0) throw new Error("Variant price cannot be negative.");
    }
    for (const img of data.images ?? []) {
      if (!isAcceptableImageUrl(img.url)) throw new Error("One of the image URLs is invalid.");
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
        const sku = v.sku?.trim() || makeSku(slug, v.format, v.volumeMl);
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

      // Attach images (first one is primary)
      const imgs = data.images ?? [];
      for (let i = 0; i < imgs.length; i++) {
        await tx.productImage.create({
          data: {
            productId: p.id,
            url: imgs[i].url,
            altText: imgs[i].altText?.trim() || data.name.trim(),
            position: i,
            isPrimary: i === 0,
          },
        });
      }

      return p;
    }, { timeout: 20000, maxWait: 10000 });

    revalidateProducts();
    return { success: true, data: { id: product.id, slug: product.slug } };
  } catch (error: unknown) {
    return { success: false, error: friendlyError(error, "Failed to create product.") };
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
    return { success: false, error: friendlyError(error, "Failed to update product.") };
  }
}

export async function addVariantAction(productId: string, v: VariantInput) {
  try {
    await requirePermission(Permission.PRODUCTS_WRITE);
    if (!Number.isFinite(v.volumeMl) || v.volumeMl <= 0) throw new Error("Volume must be positive.");
    if (!Number.isFinite(v.price) || v.price < 0) throw new Error("Price cannot be negative.");

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { slug: true } });
    if (!product) throw new Error("Product not found.");

    const sku = v.sku?.trim() || makeSku(product.slug, v.format, v.volumeMl);
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
    return { success: false, error: friendlyError(error, "Failed to add variant.") };
  }
}

export async function updateVariantAction(
  variantId: string,
  data: {
    price: number;
    compareAtPrice?: number;
    active: boolean;
    packagingNote?: string;
    volumeMl?: number;
    format?: "DECANT" | "FULL_BOTTLE";
    sku?: string;
  }
) {
  try {
    await requirePermission(Permission.PRODUCTS_WRITE);
    if (!Number.isFinite(data.price) || data.price < 0) throw new Error("Price must be a valid non-negative number.");
    if (data.volumeMl !== undefined && (!Number.isFinite(data.volumeMl) || data.volumeMl <= 0)) {
      throw new Error("Volume must be positive.");
    }
    if (data.compareAtPrice && data.compareAtPrice <= data.price) {
      throw new Error("Compare-at price must be higher than the selling price (it is shown crossed out).");
    }

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
        ...(data.volumeMl !== undefined ? { volumeMl: new Decimal(data.volumeMl).toFixed(2) } : {}),
        ...(data.format ? { format: data.format as ProductFormat } : {}),
        ...(data.sku?.trim() ? { sku: data.sku.trim() } : {}),
      },
    });

    revalidateProducts();
    revalidatePath(`/admin/products/${variant.productId}`);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: friendlyError(error, "Failed to update variant.") };
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

    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { variantId } }),
      prisma.productVariant.delete({ where: { id: variantId } }),
    ]);
    revalidateProducts();
    revalidatePath(`/admin/products/${variant.productId}`);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: friendlyError(error, "Failed to delete variant.") };
  }
}

export async function toggleProductActiveAction(id: string, active: boolean) {
  try {
    await requirePermission(Permission.PRODUCTS_WRITE);
    await prisma.product.update({ where: { id }, data: { active } });
    revalidateProducts();
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: friendlyError(error, "Failed to toggle product.") };
  }
}

/**
 * Delete a product. If it has order history or stock records it is archived
 * instead, so order snapshots and inventory audit trails stay intact.
 */
export async function deleteProductAction(id: string) {
  try {
    await requirePermission(Permission.PRODUCTS_DELETE);

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: { select: { url: true } },
        _count: { select: { sealedBottles: true, sourceBottles: true, reviews: true } },
        variants: { select: { id: true, _count: { select: { orderItems: true, reservations: true } } } },
      },
    });
    if (!product) throw new Error("Product not found.");

    const hasOrders = product.variants.some((v) => v._count.orderItems > 0 || v._count.reservations > 0);
    const hasStock =
      product._count.sealedBottles > 0 || product._count.sourceBottles > 0 || product._count.reviews > 0;

    if (hasOrders || hasStock) {
      await prisma.product.update({ where: { id }, data: { active: false } });
      revalidateProducts();
      return {
        success: true,
        archived: true,
        message: hasOrders
          ? "This product has order history, so it was archived (hidden from the shop) instead of deleted."
          : "This product has inventory records, so it was archived (hidden from the shop) instead of deleted. Delete its stock records first to remove it permanently.",
      };
    }

    const variantIds = product.variants.map((v) => v.id);
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { variantId: { in: variantIds } } }),
      prisma.wishlistItem.deleteMany({ where: { variantId: { in: variantIds } } }),
      prisma.product.delete({ where: { id } }), // cascades variants, images, categories
    ]);
    await Promise.all(product.images.map((img) => deleteStoredImage(img.url)));

    revalidateProducts();
    return { success: true, archived: false, message: "Product permanently deleted." };
  } catch (error: unknown) {
    return { success: false, error: friendlyError(error, "Failed to delete product.") };
  }
}

// ─── Product Images ─────────────────────────────────────────────

async function revalidateProductById(productId: string) {
  revalidateProducts();
  revalidatePath(`/admin/products/${productId}`);
  const p = await prisma.product.findUnique({ where: { id: productId }, select: { slug: true } });
  if (p) revalidatePath(`/products/${p.slug}`);
}

export async function addProductImageAction(productId: string, url: string, altText?: string) {
  try {
    await requirePermission(Permission.PRODUCTS_WRITE);
    if (!url || !isAcceptableImageUrl(url)) throw new Error("Invalid image URL.");

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { name: true } });
    if (!product) throw new Error("Product not found.");

    const last = await prisma.productImage.findFirst({
      where: { productId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const hasPrimary = (await prisma.productImage.count({ where: { productId, isPrimary: true } })) > 0;

    const image = await prisma.productImage.create({
      data: {
        productId,
        url,
        altText: altText?.trim() || product.name,
        position: last ? last.position + 1 : 0,
        isPrimary: !hasPrimary,
      },
    });

    await revalidateProductById(productId);
    return {
      success: true,
      data: { id: image.id, url: image.url, altText: image.altText || "", isPrimary: image.isPrimary },
    };
  } catch (error: unknown) {
    return { success: false, error: friendlyError(error, "Failed to add image.") };
  }
}

export async function deleteProductImageAction(imageId: string) {
  try {
    await requirePermission(Permission.PRODUCTS_WRITE);
    const image = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image) throw new Error("Image not found.");

    await prisma.productImage.delete({ where: { id: imageId } });

    // Promote the next image to primary if we removed the primary one
    if (image.isPrimary) {
      const next = await prisma.productImage.findFirst({
        where: { productId: image.productId },
        orderBy: { position: "asc" },
      });
      if (next) await prisma.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
    }

    // Only remove the stored file if no other image row references it
    const stillUsed = await prisma.productImage.count({ where: { url: image.url } });
    if (stillUsed === 0) await deleteStoredImage(image.url);

    await revalidateProductById(image.productId);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: friendlyError(error, "Failed to delete image.") };
  }
}

export async function setPrimaryImageAction(imageId: string) {
  try {
    await requirePermission(Permission.PRODUCTS_WRITE);
    const image = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image) throw new Error("Image not found.");

    await prisma.$transaction([
      prisma.productImage.updateMany({ where: { productId: image.productId }, data: { isPrimary: false } }),
      prisma.productImage.update({ where: { id: imageId }, data: { isPrimary: true } }),
    ]);

    await revalidateProductById(image.productId);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: friendlyError(error, "Failed to set cover image.") };
  }
}

export async function updateImageAltAction(imageId: string, altText: string) {
  try {
    await requirePermission(Permission.PRODUCTS_WRITE);
    const image = await prisma.productImage.update({
      where: { id: imageId },
      data: { altText: altText.trim() || null },
    });
    await revalidateProductById(image.productId);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: friendlyError(error, "Failed to update image.") };
  }
}

/** Persist a new display order. `orderedIds` must contain all of the product's image ids. */
export async function reorderProductImagesAction(productId: string, orderedIds: string[]) {
  try {
    await requirePermission(Permission.PRODUCTS_WRITE);
    const images = await prisma.productImage.findMany({ where: { productId }, select: { id: true } });
    const known = new Set(images.map((i) => i.id));
    if (orderedIds.length !== known.size || !orderedIds.every((id) => known.has(id))) {
      throw new Error("Image list is out of date. Refresh the page and try again.");
    }
    await prisma.$transaction(
      orderedIds.map((id, position) => prisma.productImage.update({ where: { id }, data: { position } }))
    );
    await revalidateProductById(productId);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: friendlyError(error, "Failed to reorder images.") };
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
    return { success: false, error: friendlyError(error, "Failed to load brands."), data: [] as { id: string; name: string }[] };
  }
}

export async function createProductAndRedirect(data: ProductInput) {
  let productId = "";
  try {
    const res = await createProductAction(data);
    if (!res.success || !res.data) throw new Error(res.error);
    productId = res.data.id;
  } catch (error: unknown) {
    return { success: false, error: friendlyError(error, "Failed to create product.") };
  }
  redirect(`/admin/products/${productId}`);
}
