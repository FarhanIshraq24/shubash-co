import React, { Suspense } from "react";
import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { CheckoutClient } from "./CheckoutClient";
import { getCurrentUser } from "@/lib/auth-helpers";

export const metadata = {
  title: "Secure Checkout | Shubash & Co. (সুবাস & Co.)",
  description: "Complete your authentic fragrance order. Cash on Delivery or Mobile Banking in Bangladesh.",
};

export default async function CheckoutPage() {
  const currentUser = await getCurrentUser();

  const initialCustomer = currentUser
    ? {
        name: currentUser.name,
        phone: currentUser.phone || "",
        email: currentUser.email || null,
      }
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Header customerName={currentUser?.name || null} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="pb-6 mb-6 border-b border-[var(--border-subtle)]">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-strong)]">
            Checkout & Delivery
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Complete your order with Cash on Delivery or Mobile Banking across all 64 districts of Bangladesh.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="py-20 text-center space-y-4">
              <div className="h-10 w-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-[var(--text-secondary)]">Loading checkout...</p>
            </div>
          }
        >
          <CheckoutClient initialCustomer={initialCustomer} />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
