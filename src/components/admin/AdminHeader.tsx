"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { UserRole } from "@prisma/client";
import { Badge } from "@/lib/../components/ui/badge";
import { LogOut, ExternalLink } from "lucide-react";
import { signOut } from "next-auth/react";

interface AdminHeaderProps {
  user: {
    name: string;
    email: string;
    role: UserRole;
  };
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const roleDisplayNames: Record<UserRole, string> = {
    SUPER_ADMIN: "Super Admin",
    MANAGER: "Manager",
    INVENTORY_STAFF: "Inventory Staff",
    ACCOUNTS: "Accounts & Cashier",
    SUPPORT_FULFILLMENT: "Support & Fulfillment",
  };

  return (
    <header className="h-16 border-b border-[var(--border-subtle)] bg-[var(--surface)] px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand logo (English version on clean white workspace) */}
      <div className="flex items-center gap-4">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="relative h-10 w-32">
            <Image
              src="/images/logo-english.png"
              alt="Shubash & Co. Admin"
              fill
              className="object-contain object-left"
              sizes="128px"
            />
          </div>
          <span className="text-xs uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-strong)] border border-[var(--border-subtle)]">
            Admin Portal
          </span>
        </Link>
      </div>

      {/* User profile & actions */}
      <div className="flex items-center gap-5">
        <Link
          href="/"
          target="_blank"
          className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-strong)] flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)] min-h-[36px]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>View Live Store</span>
        </Link>

        <div className="h-4 w-px bg-[var(--border-subtle)]" aria-hidden="true" />

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-[var(--text-strong)] leading-tight">
              {user.name}
            </p>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <Badge variant={user.role === UserRole.SUPER_ADMIN ? "primary" : "default"}>
                {roleDisplayNames[user.role] || user.role}
              </Badge>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="p-2 rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--status-error)] hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
