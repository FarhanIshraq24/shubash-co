"use client";

import React, { useState, useTransition, useEffect } from "react";
import { addBrandAction, updateBrandAction, deleteBrandAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, AlertCircle, CheckCircle, X } from "lucide-react";
import { SingleImagePicker } from "@/components/admin/ImageUploader";

interface BrandRow {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  description: string | null;
  logoUrl: string | null;
  active: boolean;
  productCount: number;
}

interface BrandsClientProps {
  brands: BrandRow[];
}

function ModalOverlay({
  open,
  onClose,
  title,
  error,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <h3 className="text-lg font-bold text-[var(--text-strong)]">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-subtle)] text-[var(--text-muted)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div role="alert" className="p-3 rounded-[var(--radius-md)] border text-sm flex items-start gap-2 bg-[var(--status-error-bg)] border-[var(--status-error-border)] text-[var(--status-error)]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full h-10 px-3 text-sm rounded-[var(--radius-md)] border border-[var(--border-control)] bg-[var(--surface)] text-[var(--text-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--text-strong)] mb-1">
        {label} {required && <span className="text-[var(--status-error)]">*</span>}
      </label>
      {children}
    </div>
  );
}

export function BrandsClient({ brands: initialBrands }: BrandsClientProps) {
  const [brands, setBrands] = useState(initialBrands);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [modal, setModal] = useState<
    null | { type: "add" } | { type: "edit"; brand: BrandRow } | { type: "delete"; brand: BrandRow }
  >(null);

  const [formName, setFormName] = useState("");
  const [formCountry, setFormCountry] = useState("");
  const [formLogoUrl, setFormLogoUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formActive, setFormActive] = useState(true);

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  // Keep brands in sync when server revalidates
  useEffect(() => {
    setBrands(initialBrands);
  }, [initialBrands]);

  const openAdd = () => {
    setFormName(""); setFormCountry(""); setFormDescription(""); setFormActive(true); setFormLogoUrl("");
    setModal({ type: "add" });
    setFeedback(null);
  };

  const openEdit = (brand: BrandRow) => {
    setFormName(brand.name);
    setFormCountry(brand.country || "");
    setFormLogoUrl(brand.logoUrl || "");
    setFormDescription(brand.description || "");
    setFormActive(brand.active);
    setModal({ type: "edit", brand });
    setFeedback(null);
  };

  const closeModal = () => setModal(null);

  const handleAdd = () => {
    startTransition(async () => {
      const res = await addBrandAction({ name: formName, country: formCountry, description: formDescription, logoUrl: formLogoUrl });
      if (res.success) {
        setFeedback({ type: "success", message: `Brand "${formName}" added successfully!` });
        closeModal();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to add brand." });
      }
    });
  };

  const handleEdit = () => {
    if (!modal || modal.type !== "edit") return;
    startTransition(async () => {
      const res = await updateBrandAction(modal.brand.id, {
        name: formName,
        country: formCountry,
        description: formDescription,
        logoUrl: formLogoUrl,
        active: formActive,
      });
      if (res.success) {
        setFeedback({ type: "success", message: `Brand "${formName}" updated.` });
        closeModal();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update brand." });
      }
    });
  };

  const handleDelete = () => {
    if (!modal || modal.type !== "delete") return;
    startTransition(async () => {
      const res = await deleteBrandAction(modal.brand.id);
      if (res.success) {
        setFeedback({ type: "success", message: `Brand "${modal.brand.name}" deleted.` });
        closeModal();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to delete brand." });
      }
    });
  };

  const BrandForm = (
    <div className="space-y-4">
      <Field label="Brand Name" required>
        <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Lattafa" className={inputClass} />
      </Field>
      <Field label="Logo">
        <SingleImagePicker value={formLogoUrl} onChange={setFormLogoUrl} folder="brands" />
      </Field>
      <Field label="Country of Origin">
        <input type="text" value={formCountry} onChange={(e) => setFormCountry(e.target.value)} placeholder="e.g. UAE" className={inputClass} />
      </Field>
      <Field label="Description">
        <textarea
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          placeholder="Brief description of the brand..."
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--border-control)] bg-[var(--surface)] text-[var(--text-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] resize-none"
        />
      </Field>
      {modal?.type === "edit" && (
        <Field label="Status">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="h-4 w-4 rounded" />
            <span className="text-sm text-[var(--text-strong)]">Active (visible on storefront)</span>
          </label>
        </Field>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Feedback */}
      {feedback && (
        <div className={`p-4 rounded-[var(--radius-md)] border text-sm flex items-start gap-2 ${feedback.type === "success" ? "bg-[var(--status-success-bg)] border-[var(--status-success-border)] text-[var(--status-success)]" : "bg-[var(--status-error-bg)] border-[var(--status-error-border)] text-[var(--status-error)]"}`}>
          {feedback.type === "success" ? <CheckCircle className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">{brands.length} brand{brands.length !== 1 ? "s" : ""} cataloged</p>
        <Button variant="primary" size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          <span>Add Brand</span>
        </Button>
      </div>

      {brands.length === 0 ? (
        <div className="p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-muted)] text-sm">
          No brands added yet. Click &quot;Add Brand&quot; to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-bold text-[var(--text-strong)]">{b.name}</TableCell>
                  <TableCell className="text-xs text-[var(--text-muted)] font-mono">{b.slug}</TableCell>
                  <TableCell className="text-sm text-[var(--text-secondary)]">{b.country || "—"}</TableCell>
                  <TableCell className="tabular-nums font-semibold">{b.productCount}</TableCell>
                  <TableCell>
                    <Badge variant={b.active ? "success" : "default"}>{b.active ? "Active" : "Archived"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(b)} title="Edit brand" className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-strong)]">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => { setModal({ type: "delete", brand: b }); setFeedback(null); }} title="Delete brand" className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--status-error)] disabled:opacity-40" disabled={b.productCount > 0}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Modal */}
      <ModalOverlay open={modal?.type === "add"} onClose={closeModal} error={modal && feedback?.type === "error" ? feedback.message : null} title="Add New Brand">
        <div className="space-y-5">
          {BrandForm}
          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={handleAdd} isLoading={isPending}>Add Brand</Button>
            <Button variant="secondary" onClick={closeModal} disabled={isPending}>Cancel</Button>
          </div>
        </div>
      </ModalOverlay>

      {/* Edit Modal */}
      <ModalOverlay open={modal?.type === "edit"} onClose={closeModal} error={modal && feedback?.type === "error" ? feedback.message : null} title={`Edit: ${modal?.type === "edit" ? modal.brand.name : ""}`}>
        <div className="space-y-5">
          {BrandForm}
          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={handleEdit} isLoading={isPending}>Save Changes</Button>
            <Button variant="secondary" onClick={closeModal} disabled={isPending}>Cancel</Button>
          </div>
        </div>
      </ModalOverlay>

      {/* Delete Modal */}
      <ModalOverlay open={modal?.type === "delete"} onClose={closeModal} error={modal && feedback?.type === "error" ? feedback.message : null} title="Delete Brand">
        {modal?.type === "delete" && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Are you sure you want to permanently delete <strong className="text-[var(--text-strong)]">{modal.brand.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="destructive" onClick={handleDelete} isLoading={isPending}>Delete Permanently</Button>
              <Button variant="secondary" onClick={closeModal} disabled={isPending}>Cancel</Button>
            </div>
          </div>
        )}
      </ModalOverlay>
    </div>
  );
}
