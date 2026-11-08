/**
 * ledger.ts — Double-Entry Accounting Engine for Shubash & Co.
 *
 * Implements strict double-entry principles:
 * Invariant: Sum(Debits) === Sum(Credits) on every journal entry.
 * Decimal.js is used for exact financial mathematics.
 */

import { prisma } from "@/lib/prisma";
import { LedgerAccountType, NormalBalance, Prisma } from "@prisma/client";
import Decimal from "decimal.js";

export const STANDARD_ACCOUNTS = [
  { code: "1010", name: "Cash on Hand", type: LedgerAccountType.ASSET, normal: NormalBalance.DEBIT },
  { code: "1020", name: "Bank Account (Operating)", type: LedgerAccountType.ASSET, normal: NormalBalance.DEBIT },
  { code: "1030", name: "bKash MFS Settlement", type: LedgerAccountType.ASSET, normal: NormalBalance.DEBIT },
  { code: "1031", name: "Nagad MFS Settlement", type: LedgerAccountType.ASSET, normal: NormalBalance.DEBIT },
  { code: "1032", name: "Rocket MFS Settlement", type: LedgerAccountType.ASSET, normal: NormalBalance.DEBIT },
  { code: "1100", name: "Accounts Receivable (COD in transit)", type: LedgerAccountType.ASSET, normal: NormalBalance.DEBIT },
  { code: "1200", name: "Inventory - Sealed Bottles", type: LedgerAccountType.ASSET, normal: NormalBalance.DEBIT },
  { code: "1210", name: "Inventory - Decant Liquid (Source Bottles)", type: LedgerAccountType.ASSET, normal: NormalBalance.DEBIT },
  { code: "1220", name: "Inventory - Glass Atomizers & Packaging", type: LedgerAccountType.ASSET, normal: NormalBalance.DEBIT },
  { code: "2010", name: "Accounts Payable (Fragrance Suppliers)", type: LedgerAccountType.LIABILITY, normal: NormalBalance.CREDIT },
  { code: "4010", name: "Sales Revenue - Perfume Decants", type: LedgerAccountType.REVENUE, normal: NormalBalance.CREDIT },
  { code: "4020", name: "Sales Revenue - Full Bottles", type: LedgerAccountType.REVENUE, normal: NormalBalance.CREDIT },
  { code: "4030", name: "Delivery Fee Revenue", type: LedgerAccountType.REVENUE, normal: NormalBalance.CREDIT },
  { code: "5010", name: "Cost of Goods Sold - Fragrance Liquid", type: LedgerAccountType.EXPENSE, normal: NormalBalance.DEBIT },
  { code: "5020", name: "Cost of Goods Sold - Full Bottles", type: LedgerAccountType.EXPENSE, normal: NormalBalance.DEBIT },
  { code: "5030", name: "Cost of Goods Sold - Atomizers & Packaging", type: LedgerAccountType.EXPENSE, normal: NormalBalance.DEBIT },
  { code: "5040", name: "Decanting Waste & Spillage Loss", type: LedgerAccountType.EXPENSE, normal: NormalBalance.DEBIT },
  { code: "6010", name: "Courier Shipping Expense", type: LedgerAccountType.EXPENSE, normal: NormalBalance.DEBIT },
  { code: "6020", name: "Payment Gateway & MFS Fees", type: LedgerAccountType.EXPENSE, normal: NormalBalance.DEBIT },
];

export interface JournalLineInput {
  accountCode: string;
  debit?: Decimal | number | string;
  credit?: Decimal | number | string;
  description?: string;
}

export interface CreateJournalEntryInput {
  date?: Date;
  reference?: string;
  description: string;
  lines: JournalLineInput[];
  userId?: string;
}

/**
 * Ensures standard chart of accounts exists in database
 */
export async function ensureChartOfAccounts(tx: Prisma.TransactionClient = prisma): Promise<void> {
  for (const acc of STANDARD_ACCOUNTS) {
    const existing = await tx.ledgerAccount.findUnique({ where: { code: acc.code } });
    if (!existing) {
      await tx.ledgerAccount.create({
        data: {
          code: acc.code,
          name: acc.name,
          type: acc.type,
          normal: acc.normal,
          description: `System account: ${acc.name}`,
        },
      });
    }
  }
}

/**
 * Creates a balanced double-entry Journal Entry with lines.
 * Throws error if Debits !== Credits.
 */
export async function createJournalEntry(
  input: CreateJournalEntryInput,
  tx: Prisma.TransactionClient = prisma
) {
  await ensureChartOfAccounts(tx);

  let totalDebit = new Decimal(0);
  let totalCredit = new Decimal(0);

  const preparedLines = [];

  for (const line of input.lines) {
    const debit = line.debit ? new Decimal(line.debit.toString()) : new Decimal(0);
    const credit = line.credit ? new Decimal(line.credit.toString()) : new Decimal(0);

    totalDebit = totalDebit.plus(debit);
    totalCredit = totalCredit.plus(credit);

    const account = await tx.ledgerAccount.findUnique({
      where: { code: line.accountCode },
    });

    if (!account) {
      throw new Error(`Ledger account code "${line.accountCode}" not found.`);
    }

    preparedLines.push({
      accountId: account.id,
      debit,
      credit,
      description: line.description || input.description,
    });
  }

  // INVARIANT CHECK: Sum of Debits must equal Sum of Credits
  const difference = totalDebit.minus(totalCredit).abs();
  if (difference.gt(new Decimal("0.001"))) {
    throw new Error(
      `Accounting Invariant Violation: Debits (৳${totalDebit.toFixed(2)}) must equal Credits (৳${totalCredit.toFixed(2)}). Difference: ৳${difference.toFixed(2)}`
    );
  }

  let userId = input.userId;
  if (!userId) {
    const defaultUser = await tx.user.findFirst();
    userId = defaultUser?.id || "system";
  }

  // Create Journal Entry and Lines
  const entry = await tx.journalEntry.create({
    data: {
      ref: input.reference || `JE-${Date.now()}`,
      description: input.description,
      createdByUserId: userId,
      lines: {
        create: preparedLines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          description: l.description,
        })),
      },
    },
    include: {
      lines: {
        include: { account: true },
      },
    },
  });

  return entry;
}

/**
 * Record revenue and accounts receivable / cash for an order
 */
export async function recordOrderConfirmedEntry(
  order: {
    id: string;
    orderNumber: string;
    subtotal: Decimal | string;
    deliveryFee: Decimal | string;
    total: Decimal | string;
    paymentMethod: string;
  },
  userId?: string,
  tx: Prisma.TransactionClient = prisma
) {
  const subtotal = new Decimal(order.subtotal.toString());
  const delivery = new Decimal(order.deliveryFee.toString());
  const total = new Decimal(order.total.toString());

  // If COD: Accounts Receivable (1100). If prepaid bKash: bKash (1030)
  const debitAccount = order.paymentMethod === "BKASH" ? "1030" : "1100";

  return createJournalEntry(
    {
      reference: order.orderNumber,
      description: `Sales revenue recognized for Order ${order.orderNumber} (${order.paymentMethod})`,
      userId,
      lines: [
        { accountCode: debitAccount, debit: total },
        { accountCode: "4010", credit: subtotal, description: "Fragrance Sales" },
        ...(delivery.gt(0)
          ? [{ accountCode: "4030", credit: delivery, description: "Delivery Fee Collected" }]
          : []),
      ],
    },
    tx
  );
}

/**
 * Record payment collection (e.g. COD cash collected by courier or bKash Trx verified)
 */
export async function recordPaymentCollectionEntry(
  payment: {
    orderNumber: string;
    amount: Decimal | string;
    method: string;
  },
  userId?: string,
  tx: Prisma.TransactionClient = prisma
) {
  const amount = new Decimal(payment.amount.toString());
  const cashAccount =
    payment.method === "BKASH"
      ? "1030"
      : payment.method === "NAGAD"
      ? "1031"
      : payment.method === "ROCKET"
      ? "1032"
      : "1010"; // Cash on Delivery

  return createJournalEntry(
    {
      reference: payment.orderNumber,
      description: `Settlement received for Order ${payment.orderNumber} via ${payment.method}`,
      userId,
      lines: [
        { accountCode: cashAccount, debit: amount, description: `Received via ${payment.method}` },
        { accountCode: "1100", credit: amount, description: "Clear Accounts Receivable" },
      ],
    },
    tx
  );
}
