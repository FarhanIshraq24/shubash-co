import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const customerLoginSchema = z.object({
  phone: z.string().min(10),
  password: z.string().min(6),
});

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  totpCode: z.string().optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.type = user.type;
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
        token.phone = user.phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) || "";
        session.user.type = token.type as "customer" | "admin" | undefined;
        session.user.role = token.role as UserRole | undefined;
        session.user.phone = token.phone as string | undefined;
      }
      return session;
    },
  },
  providers: [
    // Customer login — by phone + password
    Credentials({
      id: "customer-credentials",
      name: "Customer",
      credentials: {
        phone: { label: "Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = customerLoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const customer = await prisma.customer.findUnique({
          where: { phone: parsed.data.phone },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            passwordHash: true,
            active: true,
          },
        });

        if (!customer || !customer.active || !customer.passwordHash) return null;

        const passwordMatch = await bcrypt.compare(
          parsed.data.password,
          customer.passwordHash,
        );
        if (!passwordMatch) return null;

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email ?? undefined,
          type: "customer" as const,
          phone: customer.phone,
        };
      },
    }),

    // Admin login — by email + password (+ optional TOTP)
    Credentials({
      id: "admin-credentials",
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "2FA Code", type: "text" },
      },
      async authorize(credentials) {
        const parsed = adminLoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            role: true,
            active: true,
            mfaEnabled: true,
            mfaSecret: true,
          },
        });

        if (!user || !user.active) return null;

        const passwordMatch = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!passwordMatch) return null;

        // TOTP check if MFA is enabled
        if (user.mfaEnabled && user.mfaSecret) {
          if (!parsed.data.totpCode) return null;
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          type: "admin" as const,
          role: user.role,
        };
      },
    }),
  ],
});
