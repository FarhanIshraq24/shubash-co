"use server";

import { requirePermission } from "@/lib/auth-helpers";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function revalidateBrands() {
  revalidatePath("/admin/brands");
  revalidatePath("/admin/products");
  revalidatePath("/brands");
  revalidatePath("/products");
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function addBrandAction(data: {
  name: string;
  country?: string;
  description?: string;
}) {
  try {
    await requirePermission(Permission.PRODUCTS_WRITE);
    if (!data.name.trim()) throw new Error("Brand name is required.");

    const slug = slugify(data.name);
    const existing = await prisma.brand.findUnique({ where: { slug } });
    if (existing) throw new Error(`A brand with slug "${slug}" already exists.`);

    const brand = await prisma.brand.create({
      data: {
        name: data.name.trim(),
        slug,
        country: data.country?.trim() || null,
        description: data.description?.trim() || null,
        active: true,
      },
    });

    revalidateBrands();
    return { success: true, data: { id: brand.id, slug: brand.slug } };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to add brand." };
  }
}

export async function updateBrandAction(
  id: string,
  data: { name: string; country?: string; description?: string; active: boolean }
) {
  try {
    await requirePermission(Permission.PRODUCTS_WRITE);
    if (!data.name.trim()) throw new Error("Brand name is required.");

    await prisma.brand.update({
      where: { id },
      data: {
        name: data.name.trim(),
        country: data.country?.trim() || null,
        description: data.description?.trim() || null,
        active: data.active,
      },
    });

    revalidateBrands();
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update brand." };
  }
}

export async function deleteBrandAction(id: string) {
  try {
    await requirePermission(Permission.PRODUCTS_DELETE);

    const brand = await prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!brand) throw new Error("Brand not found.");
    if (brand._count.products > 0) {
      throw new Error(
        `Cannot delete: ${brand._count.products} product(s) are linked to this brand. Archive them first.`
      );
    }

    await prisma.brand.delete({ where: { id } });
    revalidateBrands();
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete brand." };
  }
}
