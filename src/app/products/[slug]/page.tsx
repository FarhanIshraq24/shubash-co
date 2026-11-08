import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { ProductDetailClient } from "./ProductDetailClient";
import { getProductBySlug } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth-helpers";
import { ChevronRight } from "lucide-react";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found | Shubash & Co.",
    };
  }

  const primaryImage = product.images[0]?.url;

  return {
    title: `${product.name} by ${product.brand.name} | Decants & Full Bottles`,
    description:
      product.description ||
      `Buy authentic ${product.name} perfume decants (3ml, 5ml, 10ml) and full bottles in Bangladesh. 100% original guaranteed.`,
    openGraph: {
      title: `${product.name} — ${product.brand.name}`,
      description: `Authentic perfume decants and full bottles in Bangladesh.`,
      images: primaryImage ? [{ url: primaryImage }] : [],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const [currentUser, product] = await Promise.all([
    getCurrentUser(),
    getProductBySlug(slug),
  ]);

  if (!product) {
    notFound();
  }

  // Format serializable props
  const serializableProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brand: {
      name: product.brand.name,
      slug: product.brand.slug,
      country: product.brand.country,
    },
    description: product.description,
    topNotes: product.topNotes,
    middleNotes: product.middleNotes,
    baseNotes: product.baseNotes,
    concentration: product.concentration,
    fragranceFamily: product.fragranceFamily,
    gender: product.gender,
    format: product.format,
    images: product.images.map((img) => ({
      url: img.url,
      altText: img.altText,
      isPrimary: img.isPrimary,
    })),
    availableMl: product.availableMl,
    sealedUnits: product.sealedUnits,
    decantVariants: product.decantVariants.map((v) => ({
      id: v.id,
      sku: v.sku,
      format: v.format,
      volumeMl: v.volumeMl.toString(),
      price: v.price.toString(),
      compareAtPrice: v.compareAtPrice ? v.compareAtPrice.toString() : null,
      packagingNote: v.packagingNote,
    })),
    fullBottleVariants: product.fullBottleVariants.map((v) => ({
      id: v.id,
      sku: v.sku,
      format: v.format,
      volumeMl: v.volumeMl.toString(),
      price: v.price.toString(),
      compareAtPrice: v.compareAtPrice ? v.compareAtPrice.toString() : null,
      packagingNote: v.packagingNote,
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Header customerName={currentUser?.name || null} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]"
        >
          <Link href="/" className="hover:text-[var(--text-strong)] hover:underline">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 text-[var(--text-muted)]" />
          <Link href="/products" className="hover:text-[var(--text-strong)] hover:underline">
            Fragrances
          </Link>
          <ChevronRight className="h-3 w-3 text-[var(--text-muted)]" />
          <Link
            href={`/products?brand=${product.brand.slug}`}
            className="hover:text-[var(--text-strong)] hover:underline"
          >
            {product.brand.name}
          </Link>
          <ChevronRight className="h-3 w-3 text-[var(--text-muted)]" />
          <span className="text-[var(--text-strong)] truncate max-w-[200px] sm:max-w-none">
            {product.name}
          </span>
        </nav>

        {/* Interactive Product Details */}
        <ProductDetailClient product={serializableProduct} />
      </main>

      <Footer />
    </div>
  );
}
