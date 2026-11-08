import React from "react";
import { requireAdmin } from "@/lib/auth-helpers";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata = {
  title: "Admin Dashboard | Shubash & Co.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-[var(--surface-subtle)] text-[var(--foreground)] flex flex-col">
      <AdminHeader
        user={{
          name: admin.name,
          email: admin.email || "",
          role: admin.role!,
        }}
      />
      <div className="flex-1 flex">
        <AdminSidebar role={admin.role!} />
        <main className="flex-1 p-6 sm:p-8 bg-[var(--surface)] border-l border-[var(--border-subtle)] overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
