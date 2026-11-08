"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, ShieldAlert } from "lucide-react";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)] flex items-center justify-center text-sm text-[var(--text-muted)]">Loading Admin Portal...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    errorParam === "account_suspended"
      ? "This administrator account is currently suspended. Please contact the Super Admin."
      : ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await signIn("admin-credentials", {
        email,
        password,
        totpCode: totpCode.trim() || undefined,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        setErrorMessage("Invalid email, password, or authentication code.");
        setIsLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setErrorMessage("An unexpected error occurred during login. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block focus:outline-none">
            <div className="relative h-14 w-48 mx-auto">
              <Image
                src="/images/logo-english.png"
                alt="Shubash & Co. — English Logo"
                fill
                priority
                className="object-contain"
                sizes="192px"
              />
            </div>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-strong)]">
            Administration Portal
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Sign in to manage catalog, inventory, orders, and ledger.
          </p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Staff Login</CardTitle>
            <CardDescription>
              Authorized personnel only. All access is audited.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--status-error-bg)] border border-[var(--status-error-border)] text-[var(--status-error)] text-sm flex items-start gap-2"
              >
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="admin-email" required>
                  Email Address
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@shubashco.com"
                />
              </div>

              <div>
                <Label htmlFor="admin-password" required>
                  Password
                </Label>
                <Input
                  id="admin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                />
              </div>

              <div>
                <Label htmlFor="admin-totp">
                  2FA Authenticator Code <span className="text-xs text-[var(--text-muted)] font-normal">(if configured)</span>
                </Label>
                <Input
                  id="admin-totp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="6-digit code"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                  <Lock className="h-4 w-4" />
                  <span>Authenticate Session</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footnote */}
        <div className="text-center text-xs text-[var(--text-muted)] space-y-1">
          <p>Protected by Shubash & Co. RBAC Security Layer</p>
          <p>
            Customer looking for orders?{" "}
            <Link href="/login" className="underline hover:text-[var(--text-strong)]">
              Customer Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
