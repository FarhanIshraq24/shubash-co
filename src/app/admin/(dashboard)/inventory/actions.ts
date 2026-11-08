"use server";

import { requirePermission } from "@/lib/auth-helpers";
import { Permission } from "@/lib/permissions";
import { convertSealedToSourceBottle } from "@/lib/inventory";
import { revalidatePath } from "next/cache";

export async function convertSealedBottleAction(sealedBottleId: string, notes?: string) {
  try {
    const admin = await requirePermission(Permission.INVENTORY_CONVERT);
    const result = await convertSealedToSourceBottle({
      sealedBottleId,
      userId: admin.id,
      notes,
    });

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/products");
    revalidatePath("/products");

    return { success: true, data: result };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to convert bottle.";
    return { success: false, error: message };
  }
}
