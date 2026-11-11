"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProductAction } from "../actions";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Plus, Trash2 } from "lucide-react";
import { ImageGalleryEditor, type ManagedImage } from "@/components/admin/ImageUploader";

interface Brand { id: string; name: string; }

interface VariantDraft {
  format: "DECANT" | "FULL_BOTTLE";
  volumeMl: string;
  price: string;
  compareAtPrice: string;
  packagingNote: string;
}

const inputClass = "w-full h-10 px-3 text-sm rounded-[var(--radius-md)] border border-[var(--border-control)] bg-[var(--surface)] text-[var(--text-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]";
const selectClass = inputClass;
const textareaClass = "w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--border-control)] bg-[var(--surface)] text-[var(--text-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] resize-y min-h-[80px]";

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--text-strong)] mb-1">
        {label} {required && <span className="text-[var(--status-error)]">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-[var(--text-muted)] mt-1">{hint}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-4 border-t border-[var(--border-subtle)]">
      <h2 className="text-base font-bold text-[var(--text-strong)]">{children}</h2>
    </div>
  );
}

export function NewProductClient({ brands }: { brands: Brand[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Product fields
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [description, setDescription] = useState("");
  const [topNotes, setTopNotes] = useState("");
  const [middleNotes, setMiddleNotes] = useState("");
  const [baseNotes, setBaseNotes] = useState("");
  const [concentration, setConcentration] = useState("");
  const [fragranceFamily, setFragranceFamily] = useState("");
  const [gender, setGender] = useState("");
  const [format, setFormat] = useState("BOTH");
  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  // Images (uploaded immediately, attached to the product on create)
  const [images, setImages] = useState<ManagedImage[]>([]);

  // Variants
  const [variants, setVariants] = useState<VariantDraft[]>([
    { format: "DECANT", volumeMl: "3", price: "", compareAtPrice: "", packagingNote: "Glass atomizer" },
  ]);

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      { format: "DECANT", volumeMl: "", price: "", compareAtPrice: "", packagingNote: "" },
    ]);
  };

  const removeVariant = (i: number) => setVariants((prev) => prev.filter((_, idx) => idx !== i));

  const updateVariant = (i: number, key: keyof VariantDraft, value: string) => {
    setVariants((prev) => prev.map((v, idx) => (idx === i ? { ...v, [key]: value } : v)));
  };

  const handleSubmit = () => {
    setError(null);

    if (!name.trim()) { setError("Product name is required."); return; }
    if (!brandId) { setError("Please select a brand."); return; }
    if (variants.length === 0) { setError("Add at least one size/price variant."); return; }
    for (const v of variants) {
      if (!(parseFloat(v.volumeMl) > 0)) { setError("All variants need a valid volume."); return; }
      if (!(parseFloat(v.price) >= 0)) { setError("All variants need a valid price."); return; }
      if (v.compareAtPrice && parseFloat(v.compareAtPrice) <= parseFloat(v.price)) {
        setError("Compare-at price must be higher than the selling price (it is shown crossed out).");
        return;
      }
    }

    startTransition(async () => {
      const res = await createProductAction({
        name,
        brandId,
        description,
        topNotes,
        middleNotes,
        baseNotes,
        concentration: concentration || undefined,
        fragranceFamily: fragranceFamily || undefined,
        gender: gender || undefined,
        format,
        active,
        featured,
        metaTitle,
        metaDescription,
        variants: variants.map((v) => ({
          format: v.format,
          volumeMl: parseFloat(v.volumeMl),
          price: parseFloat(v.price),
          compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : undefined,
          packagingNote: v.packagingNote || undefined,
        })),
        images: images.map((img) => ({ url: img.url, altText: img.altText })),
      });

      if (res.success && res.data) {
        setSuccess(true);
        setTimeout(() => router.push(`/admin/products/${res.data!.id}`), 800);
      } else {
        setError(res.error || "Failed to create product.");
      }
    });
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3 rounded-[var(--radius-md)] bg-[var(--status-error-bg)] border border-[var(--status-error-border)] text-[var(--status-error)] text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-[var(--radius-md)] bg-[var(--status-success-bg)] border border-[var(--status-success-border)] text-[var(--status-success)] text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>Product created! Redirecting…</span>
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Product Name" required>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Khamrah" className={inputClass} />
          </Field>
          <Field label="Brand" required>
            <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={selectClass}>
              <option value="">— Select a brand —</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the fragrance, its character, and what makes it special…" className={textareaClass} />
        </Field>
      </div>

      {/* Images */}
      <SectionTitle>📷 Product Images</SectionTitle>
      <ImageGalleryEditor
        images={images}
        onAdd={async (url) => {
          const img: ManagedImage = { id: `tmp-${Date.now()}-${Math.random()}`, url, altText: name, isPrimary: false };
          setImages((prev) => {
            const next = [...prev, img];
            return next.map((i, idx) => ({ ...i, isPrimary: prev.some((x) => x.isPrimary) ? i.isPrimary : idx === 0 }));
          });
          return img;
        }}
        onDelete={async (img) =>
          setImages((prev) => {
            const rest = prev.filter((i) => i.id !== img.id);
            if (img.isPrimary && rest.length) rest[0] = { ...rest[0], isPrimary: true };
            return rest;
          })
        }
        onSetPrimary={async (img) =>
          // cover image goes first so it is saved as position 0 / primary
          setImages((prev) => [img, ...prev.filter((i) => i.id !== img.id)].map((i, idx) => ({ ...i, isPrimary: idx === 0 })))
        }
        onReorder={async (ordered) => setImages(ordered.map((i, idx) => ({ ...i, isPrimary: idx === 0 })))}
      />

      {/* Fragrance Notes */}
      <SectionTitle>🎵 Fragrance Notes Pyramid</SectionTitle>
      <div className="space-y-3">
        <Field label="Top Notes" hint="First impression — citrus, herbs, light florals. Comma-separated.">
          <input type="text" value={topNotes} onChange={(e) => setTopNotes(e.target.value)} placeholder="e.g. Bergamot, Lemon, Cardamom" className={inputClass} />
        </Field>
        <Field label="Heart / Middle Notes" hint="The core character of the fragrance.">
          <input type="text" value={middleNotes} onChange={(e) => setMiddleNotes(e.target.value)} placeholder="e.g. Rose, Oud, Jasmine" className={inputClass} />
        </Field>
        <Field label="Base Notes" hint="The lasting dry-down — woods, musks, resins.">
          <input type="text" value={baseNotes} onChange={(e) => setBaseNotes(e.target.value)} placeholder="e.g. Sandalwood, Amber, Musk, Vanilla" className={inputClass} />
        </Field>
      </div>

      {/* Classification */}
      <SectionTitle>📋 Classification</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label="Concentration">
          <select value={concentration} onChange={(e) => setConcentration(e.target.value)} className={selectClass}>
            <option value="">— Any —</option>
            <option value="EDP">EDP (Eau de Parfum)</option>
            <option value="EDT">EDT (Eau de Toilette)</option>
            <option value="EDC">EDC (Eau de Cologne)</option>
            <option value="PARFUM">Parfum</option>
            <option value="EXTRAIT">Extrait de Parfum</option>
            <option value="ATTAR">Attar / Oil</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>
        <Field label="Fragrance Family">
          <select value={fragranceFamily} onChange={(e) => setFragranceFamily(e.target.value)} className={selectClass}>
            <option value="">— Any —</option>
            <option value="WOODY">Woody</option>
            <option value="FLORAL">Floral</option>
            <option value="ORIENTAL">Oriental</option>
            <option value="FRESH">Fresh</option>
            <option value="CITRUS">Citrus</option>
            <option value="GOURMAND">Gourmand</option>
            <option value="AQUATIC">Aquatic</option>
            <option value="FOUGERE">Fougère</option>
            <option value="CHYPRE">Chypre</option>
            <option value="SPICY">Spicy</option>
            <option value="LEATHER">Leather</option>
            <option value="POWDERY">Powdery</option>
            <option value="GREEN">Green</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>
        <Field label="Gender">
          <select value={gender} onChange={(e) => setGender(e.target.value)} className={selectClass}>
            <option value="">— Any —</option>
            <option value="MASCULINE">Masculine</option>
            <option value="FEMININE">Feminine</option>
            <option value="UNISEX">Unisex</option>
          </select>
        </Field>
        <Field label="Sold As">
          <select value={format} onChange={(e) => setFormat(e.target.value)} className={selectClass}>
            <option value="BOTH">Decants & Full Bottle</option>
            <option value="DECANT">Decants Only</option>
            <option value="FULL_BOTTLE">Full Bottle Only</option>
          </select>
        </Field>
      </div>

      {/* Variants / Pricing */}
      <SectionTitle>💰 Sizes & Pricing (BDT ৳)</SectionTitle>
      <div className="space-y-3">
        {variants.map((v, i) => (
          <div key={i} className="p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-strong)]">Variant {i + 1}</span>
              {variants.length > 1 && (
                <button type="button" title="Remove variant" onClick={() => removeVariant(i)} className="p-1 text-[var(--text-muted)] hover:text-[var(--status-error)]">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Type">
                <select value={v.format} onChange={(e) => updateVariant(i, "format", e.target.value)} className={selectClass}>
                  <option value="DECANT">Decant</option>
                  <option value="FULL_BOTTLE">Full Bottle</option>
                </select>
              </Field>
              <Field label="Volume (ml)" required>
                <input type="number" step="0.5" min="0.5" value={v.volumeMl} onChange={(e) => updateVariant(i, "volumeMl", e.target.value)} placeholder="e.g. 5" className={inputClass} />
              </Field>
              <Field label="Price ৳" required>
                <input type="number" step="1" min="0" value={v.price} onChange={(e) => updateVariant(i, "price", e.target.value)} placeholder="e.g. 350" className={inputClass} />
              </Field>
              <Field label="Compare-at ৳" hint="Optional sale price">
                <input type="number" step="1" min="0" value={v.compareAtPrice} onChange={(e) => updateVariant(i, "compareAtPrice", e.target.value)} placeholder="e.g. 450" className={inputClass} />
              </Field>
            </div>
            <Field label="Packaging Note">
              <input type="text" value={v.packagingNote} onChange={(e) => updateVariant(i, "packagingNote", e.target.value)} placeholder="e.g. Glass atomizer in kraft box" className={inputClass} />
            </Field>
          </div>
        ))}
        <button
          type="button"
          onClick={addVariant}
          className="w-full h-10 rounded-[var(--radius-md)] border-2 border-dashed border-[var(--border-control)] text-sm text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Another Size / Variant
        </button>
      </div>

      {/* Options */}
      <SectionTitle>⚙️ Options</SectionTitle>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 rounded" />
          <span className="text-sm font-semibold text-[var(--text-strong)]">Active (visible on storefront)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 rounded" />
          <span className="text-sm font-semibold text-[var(--text-strong)]">Featured (homepage highlight)</span>
        </label>
      </div>

      {/* SEO */}
      <SectionTitle>🔍 SEO (Optional)</SectionTitle>
      <div className="space-y-3">
        <Field label="Meta Title">
          <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="Leave blank to auto-generate from product name" className={inputClass} />
        </Field>
        <Field label="Meta Description">
          <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Short description for search engines (150 chars ideal)" className={textareaClass} />
        </Field>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4 pt-4 border-t border-[var(--border-subtle)]">
        <Button variant="primary" onClick={handleSubmit} isLoading={isPending} disabled={success}>
          Create Product
        </Button>
        <Button variant="secondary" onClick={() => router.push("/admin/products")} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
