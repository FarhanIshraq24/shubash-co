import React from "react";
import Link from "next/link";
import Image from "next/image";
import { formatBDT } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Droplet, Package, Sparkles } from "lucide-react";
import Decimal from "decimal.js";
import { ProductFormat } from "@prisma/client";

export interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    brand: { name: string; slug: string };
    format: ProductFormat;
    concentration?: string | null;
    images: { url: string; altText?: string | null }[];
    lowestDecantPrice?: Decimal | number | string | null;
    lowestFullBottlePrice?: Decimal | number | string | null;
    hasDecants: boolean;
    hasFullBottles: boolean;
    totalAvailableMl: number;
    totalSealedUnits: number;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const primaryImage = product.images[0]?.url || null;

  return (
    <div className="group relative flex flex-col rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 transition-all hover:border-[var(--primary)] hover:shadow-md">
      {/* Image Area */}
      <Link
        href={`/products/${product.slug}`}
        className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-subtle)] focus:outline-none"
      >
        {primaryImage ? (
          <Image
            src={primaryImage}
            alt={product.images[0]?.altText || `${product.brand.name} - ${product.name}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
            <Sparkles className="h-10 w-10 opacity-30" />
          </div>
        )}

        {!product.hasDecants && !product.hasFullBottles && (
          <span className="absolute right-2.5 top-2.5 rounded bg-[var(--foreground)] px-2 py-0.5 text-[11px] font-bold text-[var(--background)]">
            Sold out
          </span>
        )}

        {/* Format Badges */}
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
          {product.hasDecants && (
            <span className="inline-flex items-center gap-1 rounded bg-[var(--surface)]/95 px-2 py-0.5 text-[11px] font-bold text-[var(--text-strong)] shadow-xs backdrop-blur-xs">
              <Droplet className="h-3 w-3 text-[var(--primary)]" />
              <span>Decant</span>
            </span>
          )}
          {product.hasFullBottles && (
            <span className="inline-flex items-center gap-1 rounded bg-[var(--surface)]/95 px-2 py-0.5 text-[11px] font-bold text-[var(--text-strong)] shadow-xs backdrop-blur-xs">
              <Package className="h-3 w-3 text-[var(--text-secondary)]" />
              <span>Full Bottle</span>
            </span>
          )}
        </div>
      </Link>

      {/* Details */}
      <div className="mt-4 flex flex-1 flex-col">
        {/* Brand */}
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          {product.brand.name}
        </div>

        {/* Product Name */}
        <Link
          href={`/products/${product.slug}`}
          className="mt-1 font-bold text-[var(--text-strong)] group-hover:text-black line-clamp-1 text-[17px] focus:outline-none"
        >
          {product.name}
        </Link>

        {/* Concentration & Category */}
        <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          {product.concentration && <span>{product.concentration}</span>}
          {product.concentration && <span>·</span>}
          <span>Authentic Fragrance</span>
        </div>

        {/* Honest Pricing Block: Clearly distinguishes decant vs full bottle */}
        <div className="mt-3 border-t border-[var(--border-subtle)] pt-3 space-y-1">
          {product.lowestDecantPrice && (
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-xs text-[var(--text-secondary)] font-medium">Decants from</span>
              <span className="text-base font-bold text-[var(--text-strong)] tabular-nums">
                {formatBDT(product.lowestDecantPrice)}
              </span>
            </div>
          )}

          {product.lowestFullBottlePrice && (
            <div className="flex items-baseline justify-between text-xs text-[var(--text-secondary)]">
              <span>Full bottle</span>
              <span className="font-semibold text-[var(--text-strong)] tabular-nums">
                {formatBDT(product.lowestFullBottlePrice)}
              </span>
            </div>
          )}

          {!product.lowestDecantPrice && !product.lowestFullBottlePrice && (
            <div className="text-xs text-[var(--text-muted)] italic">Price on request</div>
          )}
        </div>

        {/* Availability & CTA */}
        <div className="mt-4 pt-2">
          <Link href={`/products/${product.slug}`} className="block">
            <Button variant="secondary" size="sm" className="w-full">
              <span>Select Format & Size</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
