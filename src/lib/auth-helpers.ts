import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission, hasPermission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

export interface CurrentUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: "customer" | "admin";
  role?: UserRole;
}

/**
 * Retrieve active session user
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as unknown as CurrentUser;
}

/**
 * Require customer session or redirect to customer login
 */
export async function requireCustomer(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.type !== "customer") {
    redirect("/login?callbackUrl=/account");
  }
  return user;
}

/**
 * Require admin session or redirect to admin login
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.type !== "admin" || !user.role) {
    redirect("/admin/login");
  }

  // Verify that the admin account is still active in the database (handles suspension immediately)
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { active: true, role: true },
  });

  if (!dbUser || !dbUser.active) {
    redirect("/admin/login?error=account_suspended");
  }

  return {
    ...user,
    role: dbUser.role,
  };
}

/**
 * Require specific granular permission for admin action
 */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const admin = await requireAdmin();
  if (!hasPermission(admin.role, permission)) {
    throw new Error(`Forbidden: Missing required permission ${permission}`);
  }
  return admin;
}

/**
 * Helper to record audit log events
 */
export async function createAuditLog(params: {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  diff?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        diff: params.diff ? JSON.stringify(params.diff) : undefined,
        ip: params.ip,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log entry:", error);
  }
}
