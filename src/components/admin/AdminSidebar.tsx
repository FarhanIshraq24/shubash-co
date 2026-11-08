"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Droplet,
  ShoppingBag,
  CreditCard,
  Truck,
  BookOpen,
  BarChart3,
  Users,
  Tag,
  Settings,
  FileText,
  ShieldAlert,
} from "lucide-react";

interface AdminSidebarProps {
  role: UserRole;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: UserRole[];
}

export function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname();

  const allRoles: UserRole[] = [
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.INVENTORY_STAFF,
    UserRole.ACCOUNTS,
    UserRole.SUPPORT_FULFILLMENT,
  ];

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      allowedRoles: allRoles,
    },
    {
      label: "Orders & Shipping",
      href: "/admin/orders",
      icon: ShoppingBag,
      allowedRoles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.SUPPORT_FULFILLMENT, UserRole.ACCOUNTS],
    },
    {
      label: "Products & Brands",
      href: "/admin/products",
      icon: Package,
      allowedRoles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF],
    },
    {
      label: "Decants & Inventory",
      href: "/admin/inventory",
      icon: Droplet,
      allowedRoles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF, UserRole.SUPPORT_FULFILLMENT],
    },
    {
      label: "Purchasing & Bills",
      href: "/admin/purchases",
      icon: Truck,
      allowedRoles: [UserRole.SUPER_ADMIN, UserRole.INVENTORY_STAFF, UserRole.MANAGER, UserRole.ACCOUNTS],
    },
    {
      label: "Payments & Verification",
      href: "/admin/payments",
      icon: CreditCard,
      allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ACCOUNTS, UserRole.MANAGER],
    },
    {
      label: "Financial Ledger",
      href: "/admin/accounting",
      icon: BookOpen,
      allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ACCOUNTS],
    },
    {
      label: "Business Reports",
      href: "/admin/reports",
      icon: BarChart3,
      allowedRoles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.ACCOUNTS],
    },
    {
      label: "Customers",
      href: "/admin/customers",
      icon: Users,
      allowedRoles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.SUPPORT_FULFILLMENT],
    },
    {
      label: "Coupons & Offers",
      href: "/admin/coupons",
      icon: Tag,
      allowedRoles: [UserRole.SUPER_ADMIN, UserRole.MANAGER],
    },
    {
      label: "Content & FAQs",
      href: "/admin/content",
      icon: FileText,
      allowedRoles: [UserRole.SUPER_ADMIN, UserRole.MANAGER],
    },
    {
      label: "Settings & Delivery",
      href: "/admin/settings",
      icon: Settings,
      allowedRoles: [UserRole.SUPER_ADMIN],
    },
    {
      label: "Audit Logs",
      href: "/admin/audit-logs",
      icon: ShieldAlert,
      allowedRoles: [UserRole.SUPER_ADMIN],
    },
  ];

  const visibleItems = navItems.filter((item) => item.allowedRoles.includes(role));

  return (
    <aside className="w-64 bg-[var(--surface-subtle)] border-r border-[var(--border-subtle)] flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 flex-1 space-y-1">
        <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Operations
        </p>
        <nav className="space-y-1" aria-label="Admin Navigation">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold transition-colors min-h-[44px]",
                  isActive
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs"
                    : "text-[var(--text-strong)] hover:bg-[var(--surface)] hover:text-[#1E1D19]"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[var(--primary-foreground)]" : "text-[var(--text-secondary)]")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface)]/50">
        <div className="text-xs text-[var(--text-muted)] space-y-1">
          <p className="font-semibold text-[var(--text-strong)]">Shubash & Co. OS</p>
          <p>Timezone: Asia/Dhaka</p>
          <p>Currency: BDT (৳)</p>
        </div>
      </div>
    </aside>
  );
}
