import React from "react";
import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { CartClient } from "./CartClient";
import { getCurrentUser } from "@/lib/auth-helpers";

export const metadata = {
  title: "Shopping Bag | Shubash & Co. (সুবাস & Co.)",
  description: "Review your selected luxury perfume decants and full retail bottles before checkout.",
};

export default async function CartPage() {
  const currentUser = await getCurrentUser();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Header customerName={(currentUser?.type === "customer" ? currentUser.name : null)} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="pb-6 mb-6 border-b border-[var(--border-subtle)]">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-strong)]">
            Your Fragrance Bag
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Carefully decanted upon order with authentic glass atomizers and zero leakage guarantee.
          </p>
        </div>

        <CartClient />
      </main>

      <Footer />
    </div>
  );
}
