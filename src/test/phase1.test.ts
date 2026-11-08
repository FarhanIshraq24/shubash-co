import { describe, it, expect } from "vitest";
import { formatBDT, formatVolume, slugify } from "@/lib/utils";
import { Permission, hasPermission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import Decimal from "decimal.js";

describe("Phase 1: Financial & Volume Formatting (Exact Math)", () => {
  it("formats integer BDT prices with ৳ symbol and thousand separators", () => {
    expect(formatBDT(1250)).toBe("৳1,250");
    expect(formatBDT(100000)).toBe("৳100,000");
    expect(formatBDT(0)).toBe("৳0");
  });

  it("handles Decimal.js instances without floating point precision loss", () => {
    const amount = new Decimal("4500.50");
    expect(formatBDT(amount)).toBe("৳4,500.50");
  });

  it("formats volume in precise ml", () => {
    expect(formatVolume(3)).toBe("3ml");
    expect(formatVolume(5)).toBe("5ml");
    expect(formatVolume(10)).toBe("10ml");
    expect(formatVolume(new Decimal("2.5"))).toBe("2.5ml");
  });

  it("slugifies text cleanly for product and brand URLs", () => {
    expect(slugify("Club de Nuit Intense Man")).toBe("club-de-nuit-intense-man");
    expect(slugify("Lattafa Khamrah Qahwa (100ml)")).toBe("lattafa-khamrah-qahwa-100ml");
  });
});

describe("Phase 1: RBAC Permission Matrix", () => {
  it("grants SUPER_ADMIN access to all permissions", () => {
    expect(hasPermission(UserRole.SUPER_ADMIN, Permission.SETTINGS_MANAGE)).toBe(true);
    expect(hasPermission(UserRole.SUPER_ADMIN, Permission.ADMINS_MANAGE)).toBe(true);
    expect(hasPermission(UserRole.SUPER_ADMIN, Permission.ACCOUNTING_JOURNAL_POST)).toBe(true);
    expect(hasPermission(UserRole.SUPER_ADMIN, Permission.INVENTORY_ADJUST)).toBe(true);
  });

  it("restricts INVENTORY_STAFF from administrative and financial settings", () => {
    expect(hasPermission(UserRole.INVENTORY_STAFF, Permission.INVENTORY_READ)).toBe(true);
    expect(hasPermission(UserRole.INVENTORY_STAFF, Permission.INVENTORY_CONVERT)).toBe(true);
    expect(hasPermission(UserRole.INVENTORY_STAFF, Permission.INVENTORY_FILL)).toBe(true);
    expect(hasPermission(UserRole.INVENTORY_STAFF, Permission.SETTINGS_MANAGE)).toBe(false);
    expect(hasPermission(UserRole.INVENTORY_STAFF, Permission.ADMINS_MANAGE)).toBe(false);
    expect(hasPermission(UserRole.INVENTORY_STAFF, Permission.ACCOUNTING_JOURNAL_POST)).toBe(false);
  });

  it("restricts ACCOUNTS from unauthorized inventory adjustments", () => {
    expect(hasPermission(UserRole.ACCOUNTS, Permission.PAYMENTS_VERIFY)).toBe(true);
    expect(hasPermission(UserRole.ACCOUNTS, Permission.ACCOUNTING_JOURNAL_POST)).toBe(true);
    expect(hasPermission(UserRole.ACCOUNTS, Permission.REFUNDS_APPROVE)).toBe(true);
    expect(hasPermission(UserRole.ACCOUNTS, Permission.INVENTORY_ADJUST)).toBe(false);
  });

  it("restricts SUPPORT_FULFILLMENT to order status changes and pack/ship", () => {
    expect(hasPermission(UserRole.SUPPORT_FULFILLMENT, Permission.ORDERS_PACK_SHIP)).toBe(true);
    expect(hasPermission(UserRole.SUPPORT_FULFILLMENT, Permission.ORDERS_STATUS_CHANGE)).toBe(true);
    expect(hasPermission(UserRole.SUPPORT_FULFILLMENT, Permission.ACCOUNTING_READ)).toBe(false);
    expect(hasPermission(UserRole.SUPPORT_FULFILLMENT, Permission.PAYMENTS_VERIFY)).toBe(false);
  });

  it("handles undefined or null role safely", () => {
    expect(hasPermission(undefined, Permission.PRODUCTS_READ)).toBe(false);
    expect(hasPermission(null, Permission.PRODUCTS_READ)).toBe(false);
  });
});
