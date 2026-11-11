import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { hasPermission, Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { storeImage, MAX_UPLOAD_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/media";

export const runtime = "nodejs";

/**
 * POST /api/admin/upload  (multipart/form-data, field "file", optional "folder")
 * Returns { url } of the stored, optimised image.
 *
 * A route handler is used (not a server action) because server actions
 * reject request bodies over 1 MB by default — phone photos are larger.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.type !== "admin") {
    return NextResponse.json({ error: "Please sign in to the admin panel." }, { status: 401 });
  }
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { active: true, role: true },
  });
  if (!dbUser?.active || !hasPermission(dbUser.role, Permission.PRODUCTS_WRITE)) {
    return NextResponse.json({ error: "You do not have permission to upload images." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type (${file.type || "unknown"}). Use JPG, PNG, WebP, AVIF or GIF.` },
      { status: 400 }
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image is larger than 8 MB." }, { status: 413 });
  }

  const folderRaw = String(form.get("folder") || "products");
  const folder = /^[a-z0-9-]{1,30}$/.test(folderRaw) ? folderRaw : "products";

  try {
    const url = await storeImage(Buffer.from(await file.arrayBuffer()), folder);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[upload]", err);
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
