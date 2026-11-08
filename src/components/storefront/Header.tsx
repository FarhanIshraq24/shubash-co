"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ShoppingBag, User as UserIcon, Menu, X } from "lucide-react";
import { useCart } from "@/context/CartContext";

interface HeaderProps {
  cartItemCount?: number;
  customerName?: string | null;
}

export function Header({ cartItemCount: propCount, customerName }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { itemCount } = useCart();
  const effectiveCount = propCount !== undefined && propCount > 0 ? propCount : itemCount;

  const navLinks = [
    { label: "Shop All", href: "/products" },
    { label: "Decants", href: "/products?format=DECANT" },
    { label: "Full Bottles", href: "/products?format=FULL_BOTTLE" },
    { label: "Brands", href: "/brands" },
    { label: "Offers", href: "/offers" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[var(--background)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] transition-all">
      {/* Top Banner / Announcement */}
      <div className="bg-[var(--primary)] text-[var(--primary-foreground)] text-xs md:text-sm font-medium py-1.5 px-4 text-center">
        <span>Authentic Perfumes in Bangladesh · Decants & Full Bottles · Nationwide Delivery ৳</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-[var(--radius-md)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] min-h-[44px] min-w-[44px]"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* Brand Logo */}
          <Link
            href="/"
            className="flex items-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded-[var(--radius-sm)]"
          >
            <div className="relative h-14 w-36 sm:h-16 sm:w-44">
              <Image
                src="/images/logo-bengali.png"
                alt="Shubash & Co. — সুবাস & Co."
                fill
                priority
                className="object-contain"
                sizes="(max-width: 640px) 144px, 176px"
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-7" aria-label="Main Navigation">
            {navLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-[15px] font-semibold text-[var(--text-strong)] hover:text-[#1E1D19] transition-colors py-2 border-b-2 border-transparent hover:border-[var(--primary)] min-h-[44px] flex items-center"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Search bar & Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Desktop Search Bar */}
            <form onSubmit={handleSearchSubmit} className="hidden md:flex relative items-center w-56 lg:w-72">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search perfumes, brands..."
                className="w-full h-10 pl-9 pr-4 text-sm bg-[var(--surface)] text-[var(--text-strong)] rounded-[var(--radius-md)] border border-[var(--border-control)] focus:border-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] placeholder:text-[var(--text-muted)]"
              />
              <Search className="absolute left-3 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
            </form>

            {/* Account Link */}
            <Link
              href={customerName ? "/account" : "/login"}
              className="inline-flex items-center gap-1.5 p-2 rounded-[var(--radius-md)] text-[var(--text-strong)] hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] min-h-[44px] min-w-[44px] justify-center"
              aria-label={customerName ? `Account for ${customerName}` : "Sign In to your account"}
            >
              <UserIcon className="h-5 w-5" />
              {customerName ? (
                <span className="hidden xl:inline text-sm font-semibold max-w-[100px] truncate">
                  {customerName.split(" ")[0]}
                </span>
              ) : (
                <span className="hidden xl:inline text-sm font-medium">Account</span>
              )}
            </Link>

            {/* Cart Button */}
            <Link
              href="/cart"
              className="relative inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border-control)] hover:bg-[var(--surface-subtle)] text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] min-h-[44px]"
              aria-label={`Shopping bag with ${effectiveCount} items`}
            >
              <ShoppingBag className="h-5 w-5" />
              <span className="hidden sm:inline text-sm font-semibold">Cart</span>
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-bold rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] tabular-nums">
                {effectiveCount}
              </span>
            </Link>
          </div>
        </div>

        {/* Mobile Search Row (visible on small screens) */}
        <div className="md:hidden pb-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search perfumes, brands..."
              className="w-full h-11 pl-10 pr-4 text-base bg-[var(--surface)] text-[var(--text-strong)] rounded-[var(--radius-md)] border border-[var(--border-control)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] placeholder:text-[var(--text-muted)]"
            />
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
          </form>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border-subtle)] bg-[var(--background)] px-4 pt-3 pb-6 space-y-2 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 gap-1">
            {navLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-3 py-3 text-base font-semibold text-[var(--text-strong)] rounded-[var(--radius-md)] hover:bg-[var(--surface-subtle)] min-h-[44px]"
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-[var(--border-subtle)] my-2 pt-2">
              <Link
                href={customerName ? "/account" : "/login"}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 text-base font-semibold text-[var(--text-strong)] rounded-[var(--radius-md)] hover:bg-[var(--surface-subtle)] min-h-[44px]"
              >
                <UserIcon className="h-5 w-5" />
                {customerName ? `Signed in as ${customerName}` : "Sign In / Register"}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
