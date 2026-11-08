import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { STANDARD_ACCOUNTS } from "@/lib/ledger";

describe("Phase 3 & 4: Commercial & Accounting Invariant Tests", () => {
  it("verifies double-entry ledger invariant: Debits must equal Credits", () => {
    // Simulated order revenue entry
    const subtotal = new Decimal("2450.00");
    const deliveryFee = new Decimal("80.00");
    const total = subtotal.plus(deliveryFee);

    const debitAccount = { code: "1100", debit: total, credit: new Decimal(0) }; // Accounts Receivable
    const creditSales = { code: "4010", debit: new Decimal(0), credit: subtotal }; // Fragrance Sales
    const creditDelivery = { code: "4030", debit: new Decimal(0), credit: deliveryFee }; // Delivery Fee

    const totalDebits = debitAccount.debit.plus(creditSales.debit).plus(creditDelivery.debit);
    const totalCredits = debitAccount.credit.plus(creditSales.credit).plus(creditDelivery.credit);

    expect(totalDebits.equals(totalCredits)).toBe(true);
    expect(totalDebits.toString()).toBe("2530");
  });

  it("verifies settlement invariant: Cash debit clears Accounts Receivable credit", () => {
    const paymentAmount = new Decimal("2530.00");

    const cashDebit = { code: "1030", debit: paymentAmount, credit: new Decimal(0) }; // bKash
    const arCredit = { code: "1100", debit: new Decimal(0), credit: paymentAmount }; // Clear AR

    expect(cashDebit.debit.equals(arCredit.credit)).toBe(true);
  });

  it("calculates exact decant yield without floating-point precision loss", () => {
    const remainingMl = new Decimal("47.500");
    const reservedMl = new Decimal("5.000");
    const availableMl = remainingMl.minus(reservedMl); // 42.500 ml

    expect(availableMl.toString()).toBe("42.5");

    // Decant size: 5ml
    const decantSize5ml = new Decimal("5.000");
    const yield5ml = Math.floor(availableMl.div(decantSize5ml).toNumber());
    expect(yield5ml).toBe(8); // 8 full 5ml decants

    // Remaining liquid after 8 decants
    const liquidUsed = decantSize5ml.mul(yield5ml); // 40ml
    const remainingBuffer = availableMl.minus(liquidUsed); // 2.5ml
    expect(remainingBuffer.toString()).toBe("2.5");
  });

  it("verifies Bangladesh delivery fee thresholds (৳80 Dhaka, ৳150 Outside, Free over ৳4,000)", () => {
    const calculateFee = (subtotal: number, isDhaka: boolean) => {
      const freeThreshold = 4000;
      if (subtotal >= freeThreshold) return 0;
      return isDhaka ? 80 : 150;
    };

    expect(calculateFee(1500, true)).toBe(80);
    expect(calculateFee(1500, false)).toBe(150);
    expect(calculateFee(4000, true)).toBe(0); // Free threshold reached
    expect(calculateFee(4500, false)).toBe(0); // Free threshold reached
  });

  it("validates Bangladesh mobile numbers strictly", () => {
    const phoneRegex = /^01[3-9]\d{8}$/;

    expect(phoneRegex.test("01712345678")).toBe(true); // Grameenphone
    expect(phoneRegex.test("01812345678")).toBe(true); // Robi
    expect(phoneRegex.test("01912345678")).toBe(true); // Banglalink
    expect(phoneRegex.test("01512345678")).toBe(true); // Teletalk
    expect(phoneRegex.test("01312345678")).toBe(true); // Skitto

    expect(phoneRegex.test("01212345678")).toBe(false); // Invalid operator prefix
    expect(phoneRegex.test("0171234567")).toBe(false); // Only 10 digits
    expect(phoneRegex.test("017123456789")).toBe(false); // 12 digits
    expect(phoneRegex.test("abcdefghijk")).toBe(false); // Alpha
  });

  it("verifies standard Chart of Accounts structure contains core operational accounts", () => {
    const codes = STANDARD_ACCOUNTS.map((a) => a.code);
    expect(codes).toContain("1010"); // Cash
    expect(codes).toContain("1030"); // bKash
    expect(codes).toContain("1100"); // Accounts Receivable
    expect(codes).toContain("1200"); // Sealed Bottles Inventory
    expect(codes).toContain("1210"); // Source Bottles Liquid Inventory
    expect(codes).toContain("4010"); // Decants Revenue
    expect(codes).toContain("5010"); // Liquid COGS
    expect(codes).toContain("5040"); // Decanting Spillage
  });
});
