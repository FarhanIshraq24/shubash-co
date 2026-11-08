import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  phone: z
    .string()
    .regex(/^(\+8801|8801|01)[3-9]\d{8}$/, "Please enter a valid Bangladesh mobile number (e.g. 01712345678)"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { name, phone, email, password } = result.data;

    // Normalize phone number to standard 11-digit local format: 01XXXXXXXXX
    let normalizedPhone = phone.trim();
    if (normalizedPhone.startsWith("+88")) {
      normalizedPhone = normalizedPhone.substring(3);
    } else if (normalizedPhone.startsWith("88")) {
      normalizedPhone = normalizedPhone.substring(2);
    }

    // Check if phone is already registered
    const existingPhone = await prisma.customer.findUnique({
      where: { phone: normalizedPhone },
    });

    if (existingPhone) {
      return NextResponse.json(
        { error: "An account with this mobile number already exists. Please sign in." },
        { status: 409 }
      );
    }

    // Check if email is provided and already taken
    if (email && email.trim() !== "") {
      const existingEmail = await prisma.customer.findUnique({
        where: { email: email.trim().toLowerCase() },
      });

      if (existingEmail) {
        return NextResponse.json(
          { error: "An account with this email address already exists." },
          { status: 409 }
        );
      }
    }

    // Hash password with bcrypt salt rounds 10
    const passwordHash = await bcrypt.hash(password, 10);

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: normalizedPhone,
        email: email && email.trim() !== "" ? email.trim().toLowerCase() : undefined,
        passwordHash,
        active: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account successfully created. You can now sign in.",
        customer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Customer registration error:", error);
    return NextResponse.json(
      { error: "Internal server error during registration. Please try again later." },
      { status: 500 }
    );
  }
}
