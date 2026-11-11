"use client";

import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, Link2, Star, Trash2, ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";

/* eslint-disable @next/next/no-img-element -- admin previews may be any host; plain <img> avoids optimizer config */

const MAX_CLIENT_BYTES = 3.5 * 1024 * 1024; // keep request under Vercel's 4.5 MB body limit

/** Downscale large photos in the browser before upload. */
async function shrinkIfNeeded(file: File): Promise<Blob> {
  if (file.size <= MAX_CLIENT_BYTES || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Upload one file to /api/admin/upload and return its public URL. */
export async function uploadImageFile(file: File, folder = "products"): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(`"${file.name}" is not an image.`);
  const body = new FormData();
  const blob = await shrinkIfNeeded(file);
  body.append("file", blob, file.name.replace(/\.\w+$/, "") + (blob === file ? "" : ".jpg"));
  body.append("folder", folder);

  const res = await fetch("/api/admin/upload", { method: "POST", body });
  let data: { url?: string; error?: string } = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok || !data.url) {
    if (res.status === 413) throw new Error("Image is too large. Try a smaller photo.");
    throw new Error(data.error || `Upload failed (HTTP ${res.status}).`);
  }
  return data.url;
}

export interface ManagedImage {
  id: string; // server id, or a temp id for staged images
  url: string;
  altText: string;
  isPrimary: boolean;
}

interface ImageGalleryEditorProps {
  images: ManagedImage[];
  busy?: boolean;
  folder?: string;
  /** Called with the uploaded URL for each new image (persist it, return the saved image). */
  onAdd: (url: string) => Promise<ManagedImage | null>;
  onDelete: (img: ManagedImage) => Promise<void>;
  onSetPrimary: (img: ManagedImage) => Promise<void>;
  onReorder: (ordered: ManagedImage[]) => Promise<void>;
  onAltChange?: (img: ManagedImage, alt: string) => Promise<void>;
}

/**
 * Drag & drop / click / paste-URL image gallery editor.
 * Persistence is delegated to the callbacks so it works for both
 * "new product" (staged locally) and "edit product" (saved immediately).
 */
export function ImageGalleryEditor({
  images,
  busy,
  folder = "products",
  onAdd,
  onDelete,
  onSetPrimary,
  onReorder,
  onAltChange,
}: ImageGalleryEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<number>(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [showUrl, setShowUrl] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    setError(null);
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) {
      setError("Please choose image files (JPG, PNG, WebP).");
      return;
    }
    setUploading((n) => n + list.length);
    const errors: string[] = [];
    // sequential keeps ordering predictable and avoids hammering the server
    for (const file of list) {
      try {
        const url = await uploadImageFile(file, folder);
        await onAdd(url);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : `Failed to upload ${file.name}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (errors.length) setError(errors.join(" "));
  };

  const addByUrl = async () => {
    const url = urlInput.trim();
    setError(null);
    if (!/^https?:\/\/.+/i.test(url)) {
      setError("Enter a full image URL starting with https://");
      return;
    }
    setUploading((n) => n + 1);
    try {
      await onAdd(url);
      setUrlInput("");
      setShowUrl(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add image.");
    } finally {
      setUploading((n) => n - 1);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    await onReorder(next);
  };

  const disabled = busy || uploading > 0;

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 rounded-[var(--radius-md)] border text-sm flex items-start gap-2 bg-[var(--status-error-bg)] border-[var(--status-error-border)] text-[var(--status-error)]">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {images.map((img, i) => (
            <div
              key={img.id}
              className={`group relative rounded-[var(--radius-md)] border bg-[var(--surface)] overflow-hidden ${
                img.isPrimary ? "border-[var(--primary)] ring-2 ring-[var(--focus-ring)]" : "border-[var(--border-subtle)]"
              }`}
            >
              <div className="aspect-square bg-[var(--surface-subtle)]">
                <img src={img.url} alt={img.altText} className="h-full w-full object-cover" loading="lazy" />
              </div>
              {img.isPrimary && (
                <span className="absolute left-1.5 top-1.5 rounded bg-[var(--primary)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--primary-foreground)]">
                  COVER
                </span>
              )}
              <div className="flex items-center justify-between gap-1 p-1.5 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-0.5">
                  <IconBtn title="Move left" disabled={disabled || i === 0} onClick={() => move(i, -1)}>
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </IconBtn>
                  <IconBtn title="Move right" disabled={disabled || i === images.length - 1} onClick={() => move(i, 1)}>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </IconBtn>
                </div>
                <div className="flex items-center gap-0.5">
                  {!img.isPrimary && (
                    <IconBtn title="Set as cover image" disabled={disabled} onClick={() => onSetPrimary(img)}>
                      <Star className="h-3.5 w-3.5" />
                    </IconBtn>
                  )}
                  <IconBtn
                    title="Delete image"
                    danger
                    disabled={disabled}
                    onClick={() => {
                      if (confirm("Remove this image?")) void onDelete(img);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconBtn>
                </div>
              </div>
              {onAltChange && (
                <input
                  type="text"
                  defaultValue={img.altText}
                  placeholder="Alt text (SEO)"
                  onBlur={(e) => {
                    if (e.target.value !== img.altText) void onAltChange(img, e.target.value);
                  }}
                  className="w-full px-2 py-1 text-[11px] border-t border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-secondary)] focus:outline-none"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled && e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-1.5 rounded-[var(--radius-md)] border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
          dragOver
            ? "border-[var(--primary)] bg-[var(--surface-subtle)]"
            : "border-[var(--border-control)] hover:border-[var(--primary)]"
        } ${disabled ? "opacity-60 cursor-wait" : ""}`}
      >
        {uploading > 0 ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
            <span className="text-sm font-semibold text-[var(--text-strong)]">
              Uploading {uploading} image{uploading > 1 ? "s" : ""}…
            </span>
          </>
        ) : (
          <>
            <ImagePlus className="h-6 w-6 text-[var(--text-muted)]" />
            <span className="text-sm font-semibold text-[var(--text-strong)]">
              Click to upload or drag & drop photos
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              JPG, PNG, WebP · up to 8 MB each · auto-optimised · first image is the cover
            </span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {showUrl ? (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addByUrl();
              }
            }}
            placeholder="https://example.com/perfume.jpg"
            className="flex-1 h-9 px-3 text-sm rounded-[var(--radius-md)] border border-[var(--border-control)] bg-[var(--surface)] text-[var(--text-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
          <button
            type="button"
            onClick={addByUrl}
            disabled={disabled}
            className="h-9 px-3 text-sm font-semibold rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--primary-foreground)] disabled:opacity-50"
          >
            Add
          </button>
          <button type="button" onClick={() => setShowUrl(false)} className="h-9 px-2 text-sm text-[var(--text-muted)]">
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowUrl(true)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-strong)]"
        >
          <Link2 className="h-3.5 w-3.5" /> Or add an image by URL
        </button>
      )}
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-1 rounded text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] disabled:opacity-30 ${
        danger ? "hover:text-[var(--status-error)]" : "hover:text-[var(--text-strong)]"
      }`}
    >
      {children}
    </button>
  );
}

/** Single-image picker (e.g. brand logo). */
export function SingleImagePicker({
  value,
  onChange,
  folder = "brands",
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] overflow-hidden flex items-center justify-center">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-contain" />
          ) : (
            <ImagePlus className="h-5 w-5 text-[var(--text-muted)]" />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-control)] hover:bg-[var(--surface-subtle)] disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            {value ? "Replace" : "Upload"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--status-error)] text-left"
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setError(null);
            setUploading(true);
            try {
              onChange(await uploadImageFile(file, folder));
            } catch (err) {
              setError(err instanceof Error ? err.message : "Upload failed.");
            } finally {
              setUploading(false);
            }
          }}
        />
      </div>
      {error && <p className="text-xs text-[var(--status-error)]">{error}</p>}
    </div>
  );
}
