import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** GET /api/media/[id] — serves a DB-stored image with long-lived caching. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const asset = await prisma.mediaAsset
    .findUnique({ where: { id }, select: { data: true, mimeType: true } })
    .catch(() => null);

  if (!asset) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(asset.data), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.data.length),
      // ids are immutable — content never changes for a given id
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
