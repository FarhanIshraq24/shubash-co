import React from "react";
import Link from "next/link";
import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth-helpers";
import {
  Droplet,
  Package,
  ShieldCheck,
  Truck,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Check,
} from "lucide-react";

export default async function HomePage() {
  const currentUser = await getCurrentUser();

  const fragranceFamilies = [
    { name: "Fresh & Citrus", desc: "Zesty bergamot, aquatic, and lively clean notes", href: "/products?family=FRESH" },
    { name: "Woody & Earthy", desc: "Cedarwood, sandalwood, vetiver, and rich woods", href: "/products?family=WOODY" },
    { name: "Warm Oriental", desc: "Amber, spices, incense, and luxurious resinous warmth", href: "/products?family=ORIENTAL" },
    { name: "Sweet Gourmand", desc: "Vanilla, caramel, tonka bean, and indulgent scents", href: "/products?family=GOURMAND" },
  ];

  const faqs = [
    {
      q: "What exactly is a perfume decant?",
      a: "A decant is 100% authentic perfume transferred directly from an original, sealed retail bottle into a smaller, high-grade glass atomizer (typically 3ml, 5ml, or 10ml). It lets you test a fragrance on your skin over days or weeks before deciding whether to purchase a full retail bottle.",
    },
    {
      q: "How do you guarantee authenticity?",
      a: "We only source original bottles from verified distributors and authorized overseas suppliers. We never dilute, alter, or blend fragrances. Every decant is drawn using dedicated, sterile laboratory syringes into clean glass atomizers.",
    },
    {
      q: "Do you deliver all over Bangladesh?",
      a: "Yes! We deliver across all districts in Bangladesh via reliable courier partners. Both Cash on Delivery (COD) and manual mobile payment options (bKash, Nagad, Rocket) are available at checkout.",
    },
    {
      q: "Can I buy full sealed bottles as well?",
      a: "Absolutely. Shubash & Co. offers both decants for sampling and brand-new, sealed retail full bottles for your signature everyday scents.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      {/* Header */}
      <Header
        cartItemCount={0}
        customerName={currentUser?.name || null}
      />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32 border-b border-[var(--border-subtle)] bg-[var(--background)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border-control)] text-xs font-semibold text-[var(--text-strong)]">
                <Sparkles className="h-3.5 w-3.5 text-[var(--foreground)]" />
                <span>Authentic Decants & Full Bottles in Bangladesh</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-strong)] leading-[1.15]">
                Your next favourite scent starts here.
              </h1>

              <p className="text-lg sm:text-xl text-[var(--text-secondary)] leading-relaxed font-normal">
                Explore perfumes in decant sizes and full bottles. Discover masterfully crafted niche and designer fragrances at honest, accessible prices.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Link href="/products?format=DECANT">
                  <Button variant="primary" size="lg" className="min-w-[170px]">
                    <Droplet className="h-4 w-4" />
                    <span>Shop Decants</span>
                  </Button>
                </Link>

                <Link href="/products?format=FULL_BOTTLE">
                  <Button variant="secondary" size="lg" className="min-w-[170px]">
                    <Package className="h-4 w-4" />
                    <span>Shop Full Bottles</span>
                  </Button>
                </Link>
              </div>

              {/* Guarantees bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[var(--primary)] shrink-0" />
                  <span>100% Authentic Guaranteed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Droplet className="h-4 w-4 text-[var(--primary)] shrink-0" />
                  <span>Precise Sterile Decanting</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[var(--primary)] shrink-0" />
                  <span>Nationwide Courier Delivery</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What is a Decant? Section */}
        <section className="py-16 sm:py-20 bg-[var(--surface)] border-b border-[var(--border-subtle)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-5">
                <Badge variant="default">The Smart Way to Wear Perfume</Badge>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--text-strong)]">
                  What is a Decant & Why Choose It?
                </h2>
                <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                  Buying a full 100ml bottle of luxury perfume blind is a costly gamble. A decant provides an affordable, travel-friendly way to experience the complete fragrance journey—from opening top notes to dry-down—on your skin and in your daily environment.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5 text-[var(--primary)]" />
                    </div>
                    <p className="text-sm text-[var(--text-strong)]">
                      <strong>Wear it for days:</strong> 5ml gives approx. 65–70 sprays; 10ml gives 130–140 sprays.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5 text-[var(--primary)]" />
                    </div>
                    <p className="text-sm text-[var(--text-strong)]">
                      <strong>Pocket & Travel Ready:</strong> Premium glass atomizers that fit comfortably in any pocket, pouch, or handbag.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5 text-[var(--primary)]" />
                    </div>
                    <p className="text-sm text-[var(--text-strong)]">
                      <strong>Zero Risk:</strong> Fall in love with the scent before deciding on an expensive full bottle.
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  <Link href="/products?format=DECANT">
                    <Button variant="primary">
                      <span>Explore Decant Catalog</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Visual Card */}
              <div className="bg-[var(--surface-subtle)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] p-8 space-y-6">
                <h3 className="text-xl font-bold text-[var(--text-strong)]">
                  Available Decant Sizes
                </h3>

                <div className="space-y-4">
                  <div className="p-4 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border-subtle)] flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[var(--text-strong)]">3ml Glass Atomizer</p>
                      <p className="text-xs text-[var(--text-secondary)]">~40 to 45 sprays · Perfect skin test</p>
                    </div>
                    <Badge variant="outline">Sample</Badge>
                  </div>

                  <div className="p-4 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border-subtle)] flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[var(--text-strong)]">5ml Glass Atomizer</p>
                      <p className="text-xs text-[var(--text-secondary)]">~65 to 70 sprays · 1 to 2 weeks of daily wear</p>
                    </div>
                    <Badge variant="primary">Most Popular</Badge>
                  </div>

                  <div className="p-4 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border-subtle)] flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[var(--text-strong)]">10ml Glass Atomizer</p>
                      <p className="text-xs text-[var(--text-secondary)]">~130 to 140 sprays · Extended travel size</p>
                    </div>
                    <Badge variant="outline">Extended</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Fragrance Families Section */}
        <section className="py-16 sm:py-20 bg-[var(--background)] border-b border-[var(--border-subtle)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-strong)]">
                Shop by Fragrance Family
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Find the aroma profile that matches your style and climate.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {fragranceFamilies.map((family) => (
                <Link
                  key={family.name}
                  href={family.href}
                  className="group block p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:shadow-md transition-all"
                >
                  <h3 className="text-lg font-bold text-[var(--text-strong)] group-hover:text-black transition-colors">
                    {family.name}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                    {family.desc}
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[var(--primary)] group-hover:underline">
                    <span>Browse scents</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 sm:py-20 bg-[var(--surface)] border-b border-[var(--border-subtle)]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center space-y-2">
              <HelpCircle className="h-8 w-8 text-[var(--primary)] mx-auto" />
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-strong)]">
                Frequently Asked Questions
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Honest answers about our products, filling process, and delivery.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2"
                >
                  <h3 className="text-base font-bold text-[var(--text-strong)]">{faq.q}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="py-16 sm:py-20 bg-[var(--background)]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-strong)]">
              Stay in the Scent Circle
            </h2>
            <p className="text-sm text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
              Get notified when rare decant batches are opened and new arrivals land in Dhaka. No spam, ever.
            </p>

            <form className="max-w-md mx-auto space-y-3">
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  className="flex-1 h-11 px-4 text-base rounded-[var(--radius-md)] border border-[var(--border-control)] bg-[var(--surface)] text-[var(--text-strong)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                />
                <Button type="submit" variant="primary">
                  Subscribe
                </Button>
              </div>
              <p className="text-xs text-[var(--text-muted)] text-left">
                By subscribing, you consent to receive periodic fragrance updates. You can unsubscribe at any time.
              </p>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
