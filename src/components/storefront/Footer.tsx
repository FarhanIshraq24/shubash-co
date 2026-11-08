import React from "react";
import Link from "next/link";
import Image from "next/image";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[var(--surface-subtle)] border-t border-[var(--border-subtle)] text-[var(--foreground)] mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="relative h-14 w-40">
              <Image
                src="/images/logo-bengali.png"
                alt="Shubash & Co. — সুবাস & Co."
                fill
                className="object-contain object-left"
                sizes="160px"
              />
            </div>
            <p className="text-sm font-medium text-[var(--text-strong)]">
              সুবাস & Co. · <span className="font-normal italic">smell good everyday</span>
            </p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Curating authentic perfume decants and genuine full bottles for fragrance enthusiasts in Bangladesh. Try before committing to a full bottle.
            </p>
            <div className="pt-2 text-xs text-[var(--text-muted)] space-y-1">
              <p>Currency: Bangladeshi Taka (৳ BDT)</p>
              <p>Timezone: Asia/Dhaka</p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-strong)] mb-4">
              Explore Fragrances
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/products"
                  className="hover:text-[var(--text-strong)] hover:underline underline-offset-4 py-1 inline-block"
                >
                  Shop All Fragrances
                </Link>
              </li>
              <li>
                <Link
                  href="/products?format=DECANT"
                  className="hover:text-[var(--text-strong)] hover:underline underline-offset-4 py-1 inline-block"
                >
                  Perfume Decants (3ml, 5ml, 10ml)
                </Link>
              </li>
              <li>
                <Link
                  href="/products?format=FULL_BOTTLE"
                  className="hover:text-[var(--text-strong)] hover:underline underline-offset-4 py-1 inline-block"
                >
                  Full Retail Bottles
                </Link>
              </li>
              <li>
                <Link
                  href="/brands"
                  className="hover:text-[var(--text-strong)] hover:underline underline-offset-4 py-1 inline-block"
                >
                  Browse by Brand
                </Link>
              </li>
              <li>
                <Link
                  href="/offers"
                  className="hover:text-[var(--text-strong)] hover:underline underline-offset-4 py-1 inline-block"
                >
                  Special Offers & Bundles
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Care & Policies */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-strong)] mb-4">
              Customer Support
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/track"
                  className="hover:text-[var(--text-strong)] hover:underline underline-offset-4 py-1 inline-block"
                >
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link
                  href="/policies/shipping"
                  className="hover:text-[var(--text-strong)] hover:underline underline-offset-4 py-1 inline-block"
                >
                  Shipping & Delivery Info
                </Link>
              </li>
              <li>
                <Link
                  href="/policies/returns"
                  className="hover:text-[var(--text-strong)] hover:underline underline-offset-4 py-1 inline-block"
                >
                  Returns & Replacements
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="hover:text-[var(--text-strong)] hover:underline underline-offset-4 py-1 inline-block"
                >
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link
                  href="/policies/terms"
                  className="hover:text-[var(--text-strong)] hover:underline underline-offset-4 py-1 inline-block"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/policies/privacy"
                  className="hover:text-[var(--text-strong)] hover:underline underline-offset-4 py-1 inline-block"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Hours */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-strong)] mb-4">
              Contact Us
            </h4>
            <div className="space-y-3 text-sm text-[var(--text-secondary)]">
              <p>
                <strong className="text-[var(--text-strong)]">Location:</strong>
                <br />
                Dhaka, Bangladesh
              </p>
              <p>
                <strong className="text-[var(--text-strong)]">Support Hours:</strong>
                <br />
                Saturday – Thursday, 10:00 AM – 8:00 PM (BST)
              </p>
              <p>
                <strong className="text-[var(--text-strong)]">Email:</strong>
                <br />
                <a
                  href="mailto:hello@shubashco.com"
                  className="hover:underline text-[var(--text-strong)]"
                >
                  hello@shubashco.com
                </a>
              </p>
              <div className="pt-2">
                <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-strong)]">
                  100% Authentic Guarantee
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment & Copyright Strip */}
        <div className="border-t border-[var(--border-subtle)] mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <p>
            © {currentYear} Shubash & Co. (সুবাস & Co.). All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[var(--text-secondary)]">Payment Methods:</span>
            <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border-subtle)] font-medium text-[var(--text-strong)]">
              Cash on Delivery (COD)
            </span>
            <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border-subtle)] font-medium text-[var(--text-strong)]">
              bKash
            </span>
            <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border-subtle)] font-medium text-[var(--text-strong)]">
              Nagad
            </span>
            <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border-subtle)] font-medium text-[var(--text-strong)]">
              Rocket
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
