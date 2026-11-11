/**
 * media.ts — image upload storage.
 *
 * If S3/R2 credentials are configured (S3_ENDPOINT, S3_ACCESS_KEY_ID,
 * S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_PUBLIC_URL) images go to the bucket.
 * Otherwise they are stored in Postgres (MediaAsset) and served from
 * /api/media/[id], which works on Vercel with zero extra setup.
 */
import { prisma } from "@/lib/prisma";
import sharp from "sharp";
import { randomUUID } from "crypto";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB raw input
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

const LOCAL_MEDIA_PREFIX = "/api/media/";

function s3Configured() {
  return Boolean(
    process.env.S3_ENDPOINT &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY &&
      process.env.S3_BUCKET &&
      process.env.S3_PUBLIC_URL &&
      !process.env.S3_ACCESS_KEY_ID.startsWith("REPLACE")
  );
}

/** Normalise any uploaded image to an optimised WebP (max 1600px). */
async function optimise(input: Buffer) {
  const pipeline = sharp(input, { failOn: "error" })
    .rotate() // respect EXIF orientation
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 });
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export async function storeImage(input: Buffer, folder = "products"): Promise<string> {
  let optimised;
  try {
    optimised = await optimise(input);
  } catch {
    throw new Error("The file could not be read as an image. Please upload a JPG, PNG or WebP.");
  }

  if (s3Configured()) {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
    const key = `${folder}/${randomUUID()}.webp`;
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: optimised.data,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    return `${process.env.S3_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
  }

  const asset = await prisma.mediaAsset.create({
    data: {
      mimeType: "image/webp",
      data: optimised.data,
      sizeBytes: optimised.data.length,
      width: optimised.width,
      height: optimised.height,
    },
    select: { id: true },
  });
  return `${LOCAL_MEDIA_PREFIX}${asset.id}`;
}

/** Best-effort removal of a stored image (DB-backed or bucket). */
export async function deleteStoredImage(url: string | null | undefined) {
  if (!url) return;
  try {
    if (url.startsWith(LOCAL_MEDIA_PREFIX)) {
      const id = url.slice(LOCAL_MEDIA_PREFIX.length).split(/[/?#]/)[0];
      await prisma.mediaAsset.deleteMany({ where: { id } });
      return;
    }
    if (s3Configured() && url.startsWith(process.env.S3_PUBLIC_URL!)) {
      const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const client = new S3Client({
        region: process.env.S3_REGION || "auto",
        endpoint: process.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
      });
      const key = url.slice(process.env.S3_PUBLIC_URL!.replace(/\/$/, "").length + 1);
      await client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }));
    }
  } catch (err) {
    console.error("[media] failed to delete stored image", url, err);
  }
}

/** Accept only our own uploads or absolute http(s) URLs. */
export function isAcceptableImageUrl(url: string) {
  if (url.startsWith(LOCAL_MEDIA_PREFIX)) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
