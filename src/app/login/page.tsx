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
import { ArrowRight, AlertCircle } from "lucide-react";

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center text-sm text-[var(--text-muted)]">Loading login...</div>}>
      <CustomerLoginForm />
    </Suspense>
  );
}

function CustomerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/account";

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await signIn("customer-credentials", {
        phone: phone.trim(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        setErrorMessage("Invalid phone number or password. Please verify and try again.");
        setIsLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block focus:outline-none">
            <div className="relative h-14 w-44 mx-auto">
              <Image
                src="/images/logo-bengali.png"
                alt="Shubash & Co. — সুবাস & Co."
                fill
                priority
                className="object-contain"
                sizes="176px"
              />
            </div>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-strong)]">
            Welcome to Shubash & Co.
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Sign in to access your orders, wishlist, and profile.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Sign In</CardTitle>
            <CardDescription>
              Enter your registered Bangladesh mobile number.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--status-error-bg)] border border-[var(--status-error-border)] text-[var(--status-error)] text-sm flex items-start gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="customer-phone" required>
                  Mobile Number
                </Label>
                <Input
                  id="customer-phone"
                  type="tel"
                  required
                  placeholder="017XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="customer-password" required className="mb-0">
                    Password
                  </Label>
                </div>
                <Input
                  id="customer-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] text-center text-sm space-y-2">
              <p className="text-[var(--text-secondary)]">
                Don&apos;t have an account yet?{" "}
                <Link
                  href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                  className="font-semibold text-[var(--text-strong)] underline hover:text-black"
                >
                  Create Account
                </Link>
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                You can also checkout as a guest without creating an account.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
