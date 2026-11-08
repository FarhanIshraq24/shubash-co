import React from "react";
import Link from "next/link";
import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { getActiveBrands } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth-helpers";
import { Award, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Fragrance Brands & Perfume Houses | Shubash & Co.",
  description:
    "Explore genuine perfumes and decants from top international houses: Lattafa, Armaf, Rasasi, Afnan, Nishane, and more.",
};

export default async function BrandsPage() {
  const [currentUser, brands] = await Promise.all([
    getCurrentUser(),
    getActiveBrands(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Header customerName={currentUser?.name || null} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-8">
        <div className="max-w-2xl space-y-2 pb-6 border-b border-[var(--border-subtle)]">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-strong)]">
            Fragrance Houses & Brands
          </h1>
          <p className="text-base text-[var(--text-secondary)]">
            Every bottle sourced from authorized overseas distributors and verified suppliers.
          </p>
        </div>

        {brands.length === 0 ? (
          <div className="p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-muted)]">
            No brands cataloged yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/products?brand=${brand.slug}`}
                className="group p-6 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--primary)] hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xl font-bold text-[var(--text-strong)] group-hover:text-black transition-colors">
                      {brand.name}
                    </h2>
                    <Award className="h-5 w-5 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
                  </div>
                  {brand.country && (
                    <p className="text-xs font-semibold text-[var(--text-secondary)] mt-1">
                      Origin: {brand.country}
                    </p>
                  )}
                  {brand.description && (
                    <p className="text-xs text-[var(--text-muted)] mt-2 line-clamp-2 leading-relaxed">
                      {brand.description}
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-bold text-[var(--primary)]">
                  <span>{brand._count.products} fragrances available</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
