"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateProductAction,
  addVariantAction,
  updateVariantAction,
  deleteVariantAction,
  toggleProductActiveAction,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Plus, Trash2, Pencil, ExternalLink, Package, Droplet } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────

interface VariantData {
  id: string;
  format: string;
  volumeMl: string;
  price: string;
  compareAtPrice: string;
  sku: string;
  packagingNote: string;
  active: boolean;
}

interface ProductData {
  id: string;
  name: string;
  slug: string;
  brandId: string;
  brandName: string;
  description: string;
  topNotes: string;
  middleNotes: string;
  baseNotes: string;
  concentration: string;
  fragranceFamily: string;
  gender: string;
  format: string;
  active: boolean;
  featured: boolean;
  metaTitle: string;
  metaDescription: string;
  variants: VariantData[];
  images: { id: string; url: string; altText: string; isPrimary: boolean }[];
  stockSummary: { sealedUnits: number; availableMl: number };
}

interface Brand { id: string; name: string; }

// ─── Helpers ────────────────────────────────────────────────────

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

function Feedback({ type, message }: { type: "success" | "error"; message: string }) {
  return (
    <div className={`p-3 rounded-[var(--radius-md)] border text-sm flex items-start gap-2 ${type === "success" ? "bg-[var(--status-success-bg)] border-[var(--status-success-border)] text-[var(--status-success)]" : "bg-[var(--status-error-bg)] border-[var(--status-error-border)] text-[var(--status-error)]"}`}>
      {type === "success" ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
      <span>{message}</span>
    </div>
  );
}

// ─── Variant Row ─────────────────────────────────────────────────

function VariantRow({ variant, onRefresh }: { variant: VariantData; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [price, setPrice] = useState(variant.price);
  const [compareAtPrice, setCompareAtPrice] = useState(variant.compareAtPrice);
  const [packagingNote, setPackagingNote] = useState(variant.packagingNote);
  const [active, setActive] = useState(variant.active);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const save = () => {
    startTransition(async () => {
      const res = await updateVariantAction(variant.id, {
        price: parseFloat(price),
        compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : undefined,
        active,
        packagingNote,
      });
      if (res.success) {
        setFeedback({ type: "success", message: "Saved!" });
        setEditing(false);
        setTimeout(() => setFeedback(null), 3000);
        onRefresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to save." });
      }
    });
  };

  const remove = () => {
    if (!confirm("Delete this variant? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await deleteVariantAction(variant.id);
      if (res.success) {
        onRefresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to delete." });
      }
    });
  };

  return (
    <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={variant.format === "DECANT" ? "primary" : "default"}>
            {variant.format === "DECANT" ? <><Droplet className="h-3 w-3" /> Decant</> : <><Package className="h-3 w-3" /> Full Bottle</>}
          </Badge>
          <span className="font-bold text-[var(--text-strong)]">{variant.volumeMl}ml</span>
          <span className="text-sm font-semibold text-[var(--text-strong)]">৳{parseFloat(variant.price).toLocaleString()}</span>
          {variant.compareAtPrice && (
            <span className="text-xs text-[var(--text-muted)] line-through">৳{parseFloat(variant.compareAtPrice).toLocaleString()}</span>
          )}
          <Badge variant={variant.active ? "success" : "default"}>{variant.active ? "Active" : "Hidden"}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setEditing(!editing)} className="p-1.5 rounded hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={remove} disabled={isPending} className="p-1.5 rounded hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--status-error)]">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {feedback && <Feedback type={feedback.type} message={feedback.message} />}

      {editing && (
        <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price ৳" required>
              <input type="number" step="1" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Compare-at ৳">
              <input type="number" step="1" min="0" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} placeholder="Sale / crossed-out price" className={inputClass} />
            </Field>
          </div>
          <Field label="Packaging Note">
            <input type="text" value={packagingNote} onChange={(e) => setPackagingNote(e.target.value)} placeholder="e.g. Glass atomizer in kraft box" className={inputClass} />
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 rounded" />
            <span className="text-sm text-[var(--text-strong)]">Active (visible on storefront)</span>
          </label>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={save} isLoading={isPending}>Save</Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)} disabled={isPending}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Edit Component ─────────────────────────────────────────

export function EditProductClient({ product: initial, brands }: { product: ProductData; brands: Brand[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Product fields
  const [name, setName] = useState(initial.name);
  const [brandId, setBrandId] = useState(initial.brandId);
  const [description, setDescription] = useState(initial.description);
  const [topNotes, setTopNotes] = useState(initial.topNotes);
  const [middleNotes, setMiddleNotes] = useState(initial.middleNotes);
  const [baseNotes, setBaseNotes] = useState(initial.baseNotes);
  const [concentration, setConcentration] = useState(initial.concentration);
  const [fragranceFamily, setFragranceFamily] = useState(initial.fragranceFamily);
  const [gender, setGender] = useState(initial.gender);
  const [format, setFormat] = useState(initial.format);
  const [active, setActive] = useState(initial.active);
  const [featured, setFeatured] = useState(initial.featured);
  const [metaTitle, setMetaTitle] = useState(initial.metaTitle);
  const [metaDescription, setMetaDescription] = useState(initial.metaDescription);

  // New variant state
  const [addingVariant, setAddingVariant] = useState(false);
  const [newVFormat, setNewVFormat] = useState<"DECANT" | "FULL_BOTTLE">("DECANT");
  const [newVVolume, setNewVVolume] = useState("");
  const [newVPrice, setNewVPrice] = useState("");
  const [newVCompare, setNewVCompare] = useState("");
  const [newVPacking, setNewVPacking] = useState("");

  const saveProduct = () => {
    startTransition(async () => {
      const res = await updateProductAction(initial.id, {
        name, brandId, description, topNotes, middleNotes, baseNotes,
        concentration, fragranceFamily, gender, format,
        active, featured, metaTitle, metaDescription,
      });
      if (res.success) {
        setFeedback({ type: "success", message: "Product details saved!" });
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to save." });
      }
    });
  };

  const toggleActive = () => {
    startTransition(async () => {
      const res = await toggleProductActiveAction(initial.id, !active);
      if (res.success) {
        setActive(!active);
        setFeedback({ type: "success", message: active ? "Product archived (hidden from storefront)." : "Product published to storefront!" });
        setTimeout(() => setFeedback(null), 4000);
      }
    });
  };

  const submitNewVariant = () => {
    if (!newVVolume || !newVPrice) { setFeedback({ type: "error", message: "Volume and price are required for new variant." }); return; }
    startTransition(async () => {
      const res = await addVariantAction(initial.id, {
        format: newVFormat,
        volumeMl: parseFloat(newVVolume),
        price: parseFloat(newVPrice),
        compareAtPrice: newVCompare ? parseFloat(newVCompare) : undefined,
        packagingNote: newVPacking,
      });
      if (res.success) {
        setAddingVariant(false);
        setNewVVolume(""); setNewVPrice(""); setNewVCompare(""); setNewVPacking("");
        setFeedback({ type: "success", message: "Variant added!" });
        setTimeout(() => { setFeedback(null); router.refresh(); }, 1000);
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to add variant." });
      }
    });
  };

  return (
    <div className="space-y-5">
      {feedback && <Feedback type={feedback.type} message={feedback.message} />}

      {/* Status bar */}
      <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
        <Badge variant={active ? "success" : "default"}>{active ? "Published" : "Archived"}</Badge>
        <span className="text-xs text-[var(--text-secondary)] flex-1">
          Stock: <strong>{initial.stockSummary.availableMl.toFixed(1)}ml</strong> liquid available · <strong>{initial.stockSummary.sealedUnits}</strong> sealed units
        </span>
        <div className="flex items-center gap-2">
          <Link href={`/products/${initial.slug}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-strong)]">
            <ExternalLink className="h-3.5 w-3.5" />View
          </Link>
          <Button size="sm" variant={active ? "secondary" : "primary"} onClick={toggleActive} isLoading={isPending}>
            {active ? "Archive" : "Publish"}
          </Button>
        </div>
      </div>

      {/* Basic info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Product Name" required>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Brand" required>
          <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={selectClass}>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={textareaClass} />
      </Field>

      {/* Notes */}
      <SectionTitle>🎵 Fragrance Notes Pyramid</SectionTitle>
      <div className="space-y-3">
        <Field label="Top Notes" hint="Comma-separated">
          <input type="text" value={topNotes} onChange={(e) => setTopNotes(e.target.value)} placeholder="e.g. Bergamot, Cardamom" className={inputClass} />
        </Field>
        <Field label="Heart Notes">
          <input type="text" value={middleNotes} onChange={(e) => setMiddleNotes(e.target.value)} placeholder="e.g. Rose, Oud" className={inputClass} />
        </Field>
        <Field label="Base Notes">
          <input type="text" value={baseNotes} onChange={(e) => setBaseNotes(e.target.value)} placeholder="e.g. Sandalwood, Amber, Musk" className={inputClass} />
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

      {/* Options */}
      <div className="flex items-center gap-6 pt-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 rounded" />
          <span className="text-sm font-semibold text-[var(--text-strong)]">Featured on homepage</span>
        </label>
      </div>

      {/* SEO */}
      <SectionTitle>🔍 SEO</SectionTitle>
      <div className="space-y-3">
        <Field label="Meta Title">
          <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Meta Description">
          <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} className={textareaClass} />
        </Field>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="primary" onClick={saveProduct} isLoading={isPending}>Save Product Details</Button>
      </div>

      {/* Variants */}
      <SectionTitle>💰 Sizes & Pricing</SectionTitle>
      <div className="space-y-3">
        {initial.variants.map((v) => (
          <VariantRow key={v.id} variant={v} onRefresh={() => router.refresh()} />
        ))}

        {!addingVariant ? (
          <button
            onClick={() => setAddingVariant(true)}
            className="w-full h-10 rounded-[var(--radius-md)] border-2 border-dashed border-[var(--border-control)] text-sm text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Size / Variant
          </button>
        ) : (
          <div className="p-4 rounded-[var(--radius-md)] border-2 border-[var(--primary)] bg-[var(--surface-subtle)] space-y-3">
            <span className="text-xs font-bold text-[var(--text-strong)]">New Variant</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Type">
                <select value={newVFormat} onChange={(e) => setNewVFormat(e.target.value as "DECANT" | "FULL_BOTTLE")} className={selectClass}>
                  <option value="DECANT">Decant</option>
                  <option value="FULL_BOTTLE">Full Bottle</option>
                </select>
              </Field>
              <Field label="Volume (ml)" required>
                <input type="number" step="0.5" min="0.5" value={newVVolume} onChange={(e) => setNewVVolume(e.target.value)} placeholder="e.g. 10" className={inputClass} />
              </Field>
              <Field label="Price ৳" required>
                <input type="number" step="1" min="0" value={newVPrice} onChange={(e) => setNewVPrice(e.target.value)} placeholder="e.g. 600" className={inputClass} />
              </Field>
              <Field label="Compare-at ৳">
                <input type="number" step="1" min="0" value={newVCompare} onChange={(e) => setNewVCompare(e.target.value)} placeholder="Optional" className={inputClass} />
              </Field>
            </div>
            <Field label="Packaging Note">
              <input type="text" value={newVPacking} onChange={(e) => setNewVPacking(e.target.value)} placeholder="e.g. Glass atomizer" className={inputClass} />
            </Field>
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={submitNewVariant} isLoading={isPending}>Add Variant</Button>
              <Button size="sm" variant="secondary" onClick={() => setAddingVariant(false)} disabled={isPending}>Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {/* Inventory quick-link */}
      <SectionTitle>📦 Inventory</SectionTitle>
      <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] flex items-center justify-between">
        <div className="text-sm text-[var(--text-secondary)]">
          To add sealed bottles or manage decant liquid for this product, go to the Inventory panel.
        </div>
        <Link href="/admin/inventory">
          <Button size="sm" variant="secondary">Open Inventory</Button>
        </Link>
      </div>
    </div>
  );
}
