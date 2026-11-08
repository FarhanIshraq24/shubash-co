import { UserRole } from "@prisma/client";

export enum Permission {
  // Products & Catalog
  PRODUCTS_READ = "products:read",
  PRODUCTS_WRITE = "products:write",
  PRODUCTS_DELETE = "products:delete",

  // Orders & Fulfillment
  ORDERS_READ = "orders:read",
  ORDERS_WRITE = "orders:write",
  ORDERS_STATUS_CHANGE = "orders:status_change",
  ORDERS_CANCEL = "orders:cancel",
  ORDERS_PACK_SHIP = "orders:pack_ship",

  // Decants & Inventory
  INVENTORY_READ = "inventory:read",
  INVENTORY_ADJUST = "inventory:adjust",
  INVENTORY_CONVERT = "inventory:convert", // convert sealed bottle to source bottle
  INVENTORY_FILL = "inventory:fill",       // record decant filling & wastage

  // Purchasing & Suppliers
  PURCHASES_READ = "purchases:read",
  PURCHASES_WRITE = "purchases:write",
  PURCHASES_RECEIVE = "purchases:receive",

  // Payments & Refunds
  PAYMENTS_READ = "payments:read",
  PAYMENTS_VERIFY = "payments:verify", // verify bKash/Nagad/Rocket manual payment
  REFUNDS_REQUEST = "refunds:request",
  REFUNDS_APPROVE = "refunds:approve",

  // Accounting & Financial Ledger
  ACCOUNTING_READ = "accounting:read",
  ACCOUNTING_EXPENSES = "accounting:expenses",
  ACCOUNTING_RECONCILE = "accounting:reconcile",
  ACCOUNTING_JOURNAL_POST = "accounting:journal_post",

  // Customers & Support
  CUSTOMERS_READ = "customers:read",
  CUSTOMERS_WRITE = "customers:write",
  SUPPORT_MESSAGES = "support:messages",
  REVIEWS_MODERATE = "reviews:moderate",

  // Marketing & Content
  COUPONS_MANAGE = "coupons:manage",
  CONTENT_MANAGE = "content:manage",

  // Administration & Security
  SETTINGS_MANAGE = "settings:manage",
  ADMINS_MANAGE = "admins:manage",
  AUDIT_LOGS_READ = "audit_logs:read",
}

/**
 * Granular Role-to-Permissions Mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: Object.values(Permission), // Full business access

  MANAGER: [
    Permission.PRODUCTS_READ,
    Permission.PRODUCTS_WRITE,
    Permission.PRODUCTS_DELETE,
    Permission.ORDERS_READ,
    Permission.ORDERS_WRITE,
    Permission.ORDERS_STATUS_CHANGE,
    Permission.ORDERS_CANCEL,
    Permission.ORDERS_PACK_SHIP,
    Permission.INVENTORY_READ,
    Permission.CUSTOMERS_READ,
    Permission.CUSTOMERS_WRITE,
    Permission.SUPPORT_MESSAGES,
    Permission.REVIEWS_MODERATE,
    Permission.COUPONS_MANAGE,
    Permission.CONTENT_MANAGE,
    Permission.PURCHASES_READ,
    Permission.PAYMENTS_READ,
  ],

  INVENTORY_STAFF: [
    Permission.PRODUCTS_READ,
    Permission.INVENTORY_READ,
    Permission.INVENTORY_ADJUST,
    Permission.INVENTORY_CONVERT,
    Permission.INVENTORY_FILL,
    Permission.PURCHASES_READ,
    Permission.PURCHASES_WRITE,
    Permission.PURCHASES_RECEIVE,
    Permission.ORDERS_READ,
  ],

  ACCOUNTS: [
    Permission.ORDERS_READ,
    Permission.PAYMENTS_READ,
    Permission.PAYMENTS_VERIFY,
    Permission.REFUNDS_REQUEST,
    Permission.REFUNDS_APPROVE,
    Permission.ACCOUNTING_READ,
    Permission.ACCOUNTING_EXPENSES,
    Permission.ACCOUNTING_RECONCILE,
    Permission.ACCOUNTING_JOURNAL_POST,
    Permission.PURCHASES_READ,
  ],

  SUPPORT_FULFILLMENT: [
    Permission.ORDERS_READ,
    Permission.ORDERS_STATUS_CHANGE,
    Permission.ORDERS_PACK_SHIP,
    Permission.CUSTOMERS_READ,
    Permission.SUPPORT_MESSAGES,
    Permission.REVIEWS_MODERATE,
    Permission.INVENTORY_FILL, // decant preparation for fulfillment
  ],
};

/**
 * Helper to check if a given user role possesses a specific permission
 */
export function hasPermission(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  if (role === UserRole.SUPER_ADMIN) return true;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}
