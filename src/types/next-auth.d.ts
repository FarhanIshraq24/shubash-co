import { UserRole } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      type?: "customer" | "admin";
      role?: UserRole;
      phone?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    type?: "customer" | "admin";
    role?: UserRole;
    phone?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    type?: "customer" | "admin";
    role?: UserRole;
    phone?: string;
  }
}
