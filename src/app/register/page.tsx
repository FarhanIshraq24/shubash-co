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
import { ArrowRight, AlertCircle, CheckCircle } from "lucide-react";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-[85vh] flex items-center justify-center text-sm text-[var(--text-muted)]">Loading registration...</div>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/account";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to create account.");
        setIsLoading(false);
        return;
      }

      setSuccessMessage("Account created successfully! Signing you in...");

      // Automatically sign in the newly registered customer
      const signInRes = await signIn("customer-credentials", {
        phone: phone.trim(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (signInRes?.error) {
        router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setErrorMessage("Something went wrong. Please check your network and try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6">
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
            Create an Account
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Track decant orders and save delivery addresses.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Registration</CardTitle>
            <CardDescription>
              We&apos;ll use your mobile number for delivery updates.
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

            {successMessage && (
              <div
                role="status"
                className="mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--status-success-bg)] border border-[var(--status-success-border)] text-[var(--status-success)] text-sm flex items-start gap-2"
              >
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="reg-name" required>
                  Full Name
                </Label>
                <Input
                  id="reg-name"
                  type="text"
                  required
                  placeholder="e.g. Farhan Ahmed"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>

              <div>
                <Label htmlFor="reg-phone" required>
                  Mobile Number (BD)
                </Label>
                <Input
                  id="reg-phone"
                  type="tel"
                  required
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  helperText="11-digit mobile number for courier confirmation"
                />
              </div>

              <div>
                <Label htmlFor="reg-email">
                  Email Address <span className="text-xs text-[var(--text-muted)] font-normal">(Optional)</span>
                </Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  helperText="For order invoice and shipping tracking emails"
                />
              </div>

              <div>
                <Label htmlFor="reg-password" required>
                  Create Password
                </Label>
                <Input
                  id="reg-password"
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] text-center text-sm">
              <p className="text-[var(--text-secondary)]">
                Already have an account?{" "}
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                  className="font-semibold text-[var(--text-strong)] underline hover:text-black"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
