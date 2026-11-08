"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatBDT } from "@/lib/utils";
import { BANGLADESH_DIVISIONS, DHAKA_CITY_THANAS } from "@/lib/bangladesh-locations";
import { placeOrder } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Lock,
  Sparkles,
} from "lucide-react";

interface CheckoutClientProps {
  initialCustomer?: {
    name: string;
    phone: string;
    email?: string | null;
  } | null;
}

export function CheckoutClient({ initialCustomer }: CheckoutClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { summary, items, clearCart, syncCart, isLoading } = useCart();

  // URL pre-fills
  const initialDistrictParam = searchParams.get("district") || "Dhaka";
  const initialCouponParam = searchParams.get("coupon") || "";

  // Form states
  const [name, setName] = useState(initialCustomer?.name || "");
  const [phone, setPhone] = useState(initialCustomer?.phone || "");
  const [email, setEmail] = useState(initialCustomer?.email || "");

  const [division, setDivision] = useState<string>("dhaka");
  const [district, setDistrict] = useState<string>(
    initialDistrictParam.toLowerCase().includes("outside") ? "Chattogram" : "Dhaka"
  );
  const [thana, setThana] = useState<string>("");
  const [fullAddress, setFullAddress] = useState<string>("");
  const [deliveryNote, setDeliveryNote] = useState<string>("");

  const [paymentMethod, setPaymentMethod] = useState<"COD" | "BKASH" | "NAGAD" | "ROCKET">("COD");
  const [senderPhone, setSenderPhone] = useState<string>("");
  const [trxId, setTrxId] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync cart prices whenever district changes
  useEffect(() => {
    const districtSlug = district.toLowerCase() === "dhaka" ? "dhaka" : "outside-dhaka";
    void syncCart(districtSlug, initialCouponParam);
  }, [district, initialCouponParam, syncCart]);

  // Available districts for chosen division
  const currentDistricts = BANGLADESH_DIVISIONS[division]?.districts || [];

  const handleDivisionChange = (newDivision: string) => {
    setDivision(newDivision);
    const newDistricts = BANGLADESH_DIVISIONS[newDivision]?.districts || [];
    if (newDistricts.length > 0) {
      setDistrict(newDistricts[0]);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage("Your bag is empty. Please add fragrances before checking out.");
      return;
    }

    if (!name.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    const cleanPhone = phone.trim().replace(/^(?:\+?88)?0?/, "0");
    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      setErrorMessage("Please enter a valid 11-digit Bangladesh phone number (01XXXXXXXXX).");
      return;
    }

    if (!fullAddress.trim()) {
      setErrorMessage("Please enter your complete street address / building / flat.");
      return;
    }

    if (paymentMethod !== "COD") {
      if (!trxId.trim() || trxId.trim().length < 4) {
        setErrorMessage(`Please enter the ${paymentMethod} Transaction ID (TrxID).`);
        return;
      }
      const cleanSender = senderPhone.trim().replace(/^(?:\+?88)?0?/, "0");
      if (!/^01[3-9]\d{8}$/.test(cleanSender)) {
        setErrorMessage("Please enter the 11-digit mobile number you sent the money from.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await placeOrder({
        customer: {
          name,
          phone: cleanPhone,
          email: email.trim() || undefined,
        },
        address: {
          division: BANGLADESH_DIVISIONS[division]?.name || division,
          district,
          thana: thana.trim() || "City Center",
          fullAddress,
          deliveryNote: deliveryNote.trim() || undefined,
        },
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        payment: {
          method: paymentMethod,
          senderPhone: senderPhone.trim() || undefined,
          trxId: trxId.trim() || undefined,
        },
        couponCode: initialCouponParam || undefined,
      });

      if (res.success && res.orderId) {
        clearCart();
        router.push(`/orders/${res.orderId}?token=${res.trackingToken}`);
      } else {
        setErrorMessage(res.error || "Failed to place order. Please try again.");
      }
    } catch {
      setErrorMessage("A network error occurred. Please check your connection and retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="h-10 w-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-[var(--text-secondary)]">Preparing checkout...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-[var(--text-strong)]">Your bag is empty</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          You cannot checkout without items. Explore our decants and retail bottles.
        </p>
        <Link href="/products">
          <Button variant="primary">Shop Fragrances</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmitOrder} className="space-y-8">
      {errorMessage && (
        <div className="p-4 rounded-[var(--radius-md)] bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Form (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Step 1: Contact Information */}
          <section className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-subtle)]">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-bold">
                1
              </span>
              <h2 className="text-lg font-bold text-[var(--text-strong)]">Contact Information</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-[var(--text-strong)] uppercase tracking-wider block">
                  Full Name <span className="text-[var(--status-error)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Farhan Chowdhury"
                  className="w-full h-11 px-3 text-sm bg-[var(--surface)] border border-[var(--border-control)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-strong)] uppercase tracking-wider block">
                  Mobile Number (BD) <span className="text-[var(--status-error)]">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full h-11 px-3 text-sm bg-[var(--surface)] border border-[var(--border-control)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] font-mono"
                />
                <p className="text-[11px] text-[var(--text-muted)]">Courier updates will be sent via SMS</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-strong)] uppercase tracking-wider block">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="farhan@example.com"
                  className="w-full h-11 px-3 text-sm bg-[var(--surface)] border border-[var(--border-control)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                />
                <p className="text-[11px] text-[var(--text-muted)]">Order invoice sent here</p>
              </div>
            </div>
          </section>

          {/* Step 2: Delivery Address */}
          <section className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-subtle)]">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-bold">
                2
              </span>
              <h2 className="text-lg font-bold text-[var(--text-strong)]">Shipping Address in Bangladesh</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-strong)] uppercase tracking-wider block">
                  Division <span className="text-[var(--status-error)]">*</span>
                </label>
                <select
                  value={division}
                  onChange={(e) => handleDivisionChange(e.target.value)}
                  className="w-full h-11 px-3 text-sm bg-[var(--surface)] border border-[var(--border-control)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                >
                  {Object.entries(BANGLADESH_DIVISIONS).map(([key, div]) => (
                    <option key={key} value={key}>
                      {div.name} ({div.nameBn})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-strong)] uppercase tracking-wider block">
                  District <span className="text-[var(--status-error)]">*</span>
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full h-11 px-3 text-sm bg-[var(--surface)] border border-[var(--border-control)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                >
                  {currentDistricts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-[var(--text-strong)] uppercase tracking-wider block">
                  Thana / Upazila / Area <span className="text-[var(--status-error)]">*</span>
                </label>
                {district.toLowerCase() === "dhaka" ? (
                  <select
                    value={thana}
                    onChange={(e) => setThana(e.target.value)}
                    className="w-full h-11 px-3 text-sm bg-[var(--surface)] border border-[var(--border-control)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  >
                    <option value="">Select Dhaka City Thana...</option>
                    {DHAKA_CITY_THANAS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={thana}
                    onChange={(e) => setThana(e.target.value)}
                    placeholder="e.g. Kotwali / Sadar / Agrabad"
                    className="w-full h-11 px-3 text-sm bg-[var(--surface)] border border-[var(--border-control)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  />
                )}
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-[var(--text-strong)] uppercase tracking-wider block">
                  Detailed Street Address, House & Flat <span className="text-[var(--status-error)]">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  placeholder="House # 12, Road # 4, Sector # 3, Flat 4B, Near Landmark..."
                  className="w-full p-3 text-sm bg-[var(--surface)] border border-[var(--border-control)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] resize-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-[var(--text-strong)] uppercase tracking-wider block">
                  Courier Delivery Note (Optional)
                </label>
                <input
                  type="text"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="e.g. Call before delivery, deliver after 2 PM"
                  className="w-full h-11 px-3 text-sm bg-[var(--surface)] border border-[var(--border-control)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                />
              </div>
            </div>
          </section>

          {/* Step 3: Payment Method */}
          <section className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-subtle)]">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-bold">
                3
              </span>
              <h2 className="text-lg font-bold text-[var(--text-strong)]">Payment Method</h2>
            </div>

            <div className="space-y-3">
              {/* COD Option */}
              <label
                className={`flex items-start gap-3 p-4 rounded-[var(--radius-md)] border cursor-pointer transition-all ${
                  paymentMethod === "COD"
                    ? "border-[var(--primary)] bg-[var(--surface-subtle)] ring-1 ring-[var(--primary)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)]/50"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "COD"}
                  onChange={() => setPaymentMethod("COD")}
                  className="mt-1 h-4 w-4 text-[var(--primary)] focus:ring-[var(--focus-ring)]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-[var(--text-strong)]" />
                    <strong className="text-sm font-bold text-[var(--text-strong)]">
                      Cash on Delivery (ক্যাশ অন ডেলিভারি)
                    </strong>
                    <Badge variant="success">Popular</Badge>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Pay with cash when the courier delivers the package to your doorstep. Inspect package authenticity upon arrival.
                  </p>
                </div>
              </label>

              {/* bKash Option */}
              <label
                className={`flex items-start gap-3 p-4 rounded-[var(--radius-md)] border cursor-pointer transition-all ${
                  paymentMethod === "BKASH"
                    ? "border-[var(--primary)] bg-[var(--surface-subtle)] ring-1 ring-[var(--primary)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)]/50"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "BKASH"}
                  onChange={() => setPaymentMethod("BKASH")}
                  className="mt-1 h-4 w-4 text-[var(--primary)] focus:ring-[var(--focus-ring)]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-[#E2136E]" />
                    <strong className="text-sm font-bold text-[var(--text-strong)]">
                      bKash Manual Send Money / Payment
                    </strong>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Send exact amount to our official bKash account: <strong className="font-mono text-[var(--text-strong)]">01712-345678</strong> (Personal).
                  </p>
                </div>
              </label>

              {/* Nagad Option */}
              <label
                className={`flex items-start gap-3 p-4 rounded-[var(--radius-md)] border cursor-pointer transition-all ${
                  paymentMethod === "NAGAD"
                    ? "border-[var(--primary)] bg-[var(--surface-subtle)] ring-1 ring-[var(--primary)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)]/50"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "NAGAD"}
                  onChange={() => setPaymentMethod("NAGAD")}
                  className="mt-1 h-4 w-4 text-[var(--primary)] focus:ring-[var(--focus-ring)]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-[#F7931E]" />
                    <strong className="text-sm font-bold text-[var(--text-strong)]">
                      Nagad Send Money
                    </strong>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Send to our Nagad account: <strong className="font-mono text-[var(--text-strong)]">01712-345678</strong>.
                  </p>
                </div>
              </label>

              {/* Mobile Banking Verification Fields */}
              {paymentMethod !== "COD" && (
                <div className="p-4 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border-control)] space-y-3 mt-3 animate-in fade-in duration-200">
                  <h4 className="text-xs font-bold text-[var(--text-strong)] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[var(--primary)]" />
                    Enter {paymentMethod} Transaction Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--text-strong)] block">
                        Sender Mobile Number <span className="text-[var(--status-error)]">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full h-10 px-3 text-sm bg-[var(--surface)] border border-[var(--border-control)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--text-strong)] block">
                        Transaction ID (TrxID) <span className="text-[var(--status-error)]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={trxId}
                        onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                        placeholder="e.g. BL9A8Z1K"
                        className="w-full h-10 px-3 text-sm uppercase bg-[var(--surface)] border border-[var(--border-control)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] space-y-6 shadow-xs sticky top-28">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h3 className="text-lg font-bold text-[var(--text-strong)]">Review Your Order</h3>
              <Link href="/cart" className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                <span>Edit Bag</span>
              </Link>
            </div>

            {/* Items Mini List */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {summary?.items.map((item) => (
                <div key={item.variantId} className="flex items-center gap-3 py-1.5 border-b border-[var(--border-subtle)]/50 last:border-0">
                  <div className="relative h-12 w-12 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] shrink-0 overflow-hidden border border-[var(--border-subtle)]">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" sizes="48px" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[var(--text-muted)]">
                        <Sparkles className="h-4 w-4 opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[var(--text-strong)] truncate">{item.productName}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {item.format === "DECANT" ? `${item.volumeMl}ml Decant` : "Full Bottle"} · Qty {item.quantity}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[var(--text-strong)] tabular-nums">
                    {formatBDT(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-2.5 pt-2 border-t border-[var(--border-subtle)] text-sm">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Subtotal ({summary?.itemCount} items)</span>
                <span className="font-semibold text-[var(--text-strong)] tabular-nums">{summary?.subtotalFormatted}</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5" />
                  <span>Delivery ({district.toLowerCase() === "dhaka" ? "Dhaka City" : "Outside Dhaka"})</span>
                </span>
                <span className="font-semibold text-[var(--text-strong)] tabular-nums">{summary?.deliveryFeeFormatted}</span>
              </div>
              {parseFloat(summary?.discount || "0") > 0 && (
                <div className="flex justify-between text-[var(--status-success)] font-semibold">
                  <span>Discount</span>
                  <span className="tabular-nums">- {summary?.discountFormatted}</span>
                </div>
              )}
              <div className="flex justify-between text-base sm:text-lg font-bold text-[var(--text-strong)] pt-3 border-t border-[var(--border-subtle)]">
                <span>Total Due</span>
                <span className="tabular-nums text-[22px]">{summary?.totalFormatted}</span>
              </div>
            </div>

            {/* Submit CTA */}
            <div className="space-y-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-4 text-base"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Place Order · {summary?.totalFormatted}</span>
                  </>
                )}
              </Button>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-muted)] text-center">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--status-success)]" />
                <span>Zero leakage teflon seal guarantee · Authentic scents</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
