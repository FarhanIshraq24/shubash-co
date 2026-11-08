import React from "react";
import Link from "next/link";
import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { ProductCard } from "@/components/storefront/ProductCard";
import { Button } from "@/components/ui/button";
import { getStorefrontProducts } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth-helpers";
import { ProductFormat, FragranceFamily, Gender, Concentration } from "@prisma/client";
import { X, Droplet, Package, Sparkles } from "lucide-react";

interface ProductsPageProps {
  searchParams: Promise<{
    q?: string;
    format?: string;
    brand?: string;
    family?: string;
    gender?: string;
    concentration?: string;
    sort?: string;
    page?: string;
  }>;
}

export async function generateMetadata({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  let title = "Shop Fragrances & Perfume Decants | Shubash & Co.";
  if (params.format === "DECANT") {
    title = "Authentic Perfume Decants (3ml, 5ml, 10ml) | Shubash & Co.";
  } else if (params.format === "FULL_BOTTLE") {
    title = "Sealed Retail Full Bottles | Shubash & Co.";
  }

  return {
    title,
    description:
      "Browse 100% authentic perfume decants and full retail bottles in Bangladesh. Hand-decanted into premium glass atomizers.",
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();

  const query = params.q || undefined;
  const format =
    params.format === "DECANT"
      ? ProductFormat.DECANT
      : params.format === "FULL_BOTTLE"
      ? ProductFormat.FULL_BOTTLE
      : undefined;

  const brandSlug = params.brand || undefined;
  const family = params.family ? (params.family as FragranceFamily) : undefined;
  const gender = params.gender ? (params.gender as Gender) : undefined;
  const concentration = params.concentration ? (params.concentration as Concentration) : undefined;
  const sortValues = ["newest", "price_asc", "price_desc", "featured"] as const;
  type SortOption = (typeof sortValues)[number];
  const sortBy: SortOption = sortValues.includes(params.sort as SortOption)
    ? (params.sort as SortOption)
    : "newest";
  const currentPage = params.page ? parseInt(params.page, 10) : 1;

  const { products, totalCount, totalPages } = await getStorefrontProducts({
    search: query,
    format,
    brandSlug,
    family,
    gender,
    concentration,
    sortBy,
    page: currentPage,
    pageSize: 12,
  });

  const hasActiveFilters = Boolean(
    query || format || brandSlug || family || gender || concentration
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Header customerName={currentUser?.name || null} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Page Header Banner */}
        <div className="pb-6 border-b border-[var(--border-subtle)] space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-strong)]">
                {format === ProductFormat.DECANT
                  ? "Authentic Perfume Decants"
                  : format === ProductFormat.FULL_BOTTLE
                  ? "Full Retail Bottles"
                  : "All Fragrances & Decants"}
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Showing {products.length} of {totalCount} authentic scents in stock
              </p>
            </div>

            {/* Format Quick Toggles */}
            <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--border-control)] bg-[var(--surface)] p-1">
              <Link
                href="/products"
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors ${
                  !format
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "text-[var(--text-strong)] hover:bg-[var(--surface-subtle)]"
                }`}
              >
                All
              </Link>
              <Link
                href="/products?format=DECANT"
                className={`flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors ${
                  format === ProductFormat.DECANT
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "text-[var(--text-strong)] hover:bg-[var(--surface-subtle)]"
                }`}
              >
                <Droplet className="h-3 w-3" />
                <span>Decants</span>
              </Link>
              <Link
                href="/products?format=FULL_BOTTLE"
                className={`flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors ${
                  format === ProductFormat.FULL_BOTTLE
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "text-[var(--text-strong)] hover:bg-[var(--surface-subtle)]"
                }`}
              >
                <Package className="h-3 w-3" />
                <span>Full Bottles</span>
              </Link>
            </div>
          </div>

          {/* Active Filter Chips & Reset */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-3">
              <span className="text-xs font-medium text-[var(--text-muted)]">Active filters:</span>
              {query && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-strong)]">
                  Keyword: &quot;{query}&quot;
                </span>
              )}
              {format && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-strong)]">
                  Format: {format === "DECANT" ? "Decant Only" : "Full Bottle Only"}
                </span>
              )}
              {brandSlug && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-strong)]">
                  Brand: {brandSlug}
                </span>
              )}
              {family && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-strong)]">
                  Family: {family}
                </span>
              )}
              <Link
                href="/products"
                className="inline-flex items-center gap-1 text-xs font-bold text-[var(--status-error)] hover:underline ml-2"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset Filters</span>
              </Link>
            </div>
          )}
        </div>

        {/* Catalog Grid */}
        {products.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <Sparkles className="h-12 w-12 text-[var(--text-muted)] mx-auto opacity-40" />
            <h3 className="text-xl font-bold text-[var(--text-strong)]">No fragrances found</h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
              We couldn&apos;t find any fragrances matching your current search or filters. Try resetting
              filters or searching for a different perfume house.
            </p>
            <div className="pt-2">
              <Link href="/products">
                <Button variant="primary">View All Available Fragrances</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-12 border-t border-[var(--border-subtle)] mt-12">
            {currentPage > 1 && (
              <Link
                href={`/products?page=${currentPage - 1}${format ? `&format=${format}` : ""}${
                  brandSlug ? `&brand=${brandSlug}` : ""
                }`}
              >
                <Button variant="secondary" size="sm">
                  Previous Page
                </Button>
              </Link>
            )}
            <span className="text-sm font-semibold text-[var(--text-strong)] px-3 py-1.5">
              Page {currentPage} of {totalPages}
            </span>
            {currentPage < totalPages && (
              <Link
                href={`/products?page=${currentPage + 1}${format ? `&format=${format}` : ""}${
                  brandSlug ? `&brand=${brandSlug}` : ""
                }`}
              >
                <Button variant="secondary" size="sm">
                  Next Page
                </Button>
              </Link>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
