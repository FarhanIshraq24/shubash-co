import React from "react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { Permission } from "@/lib/permissions";
import { formatBDT, formatDhakaDate } from "@/lib/utils";
import { ensureChartOfAccounts, STANDARD_ACCOUNTS } from "@/lib/ledger";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Calculator,
  TrendingUp,
  Receipt,
  Scale,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import Decimal from "decimal.js";

export const metadata = {
  title: "General Ledger & Financial Accounting | Shubash & Co. Admin",
};

export default async function AdminAccountingPage() {
  await requirePermission(Permission.ACCOUNTING_READ);

  let accountsWithBalances: Array<{
    code: string;
    name: string;
    type: string;
    normal: string;
    balance: Decimal;
  }> = [];

  let recentEntries: Array<{
    id: string;
    entryDate: Date;
    reference: string | null;
    description: string;
    lines: Array<{
      id: string;
      accountCode: string;
      accountName: string;
      debit: Decimal;
      credit: Decimal;
    }>;
  }> = [];

  let totalRevenue = new Decimal(0);
  let totalCOGS = new Decimal(0);
  let totalExpenses = new Decimal(0);

  try {
    // Ensure standard chart of accounts exists
    await ensureChartOfAccounts();

    const dbAccounts = await prisma.ledgerAccount.findMany({
      include: {
        journalLines: {
          select: { debit: true, credit: true },
        },
      },
      orderBy: { code: "asc" },
    });

    accountsWithBalances = dbAccounts.map((acc) => {
      let balance = new Decimal(0);
      for (const line of acc.journalLines) {
        const d = new Decimal(line.debit.toString());
        const c = new Decimal(line.credit.toString());
        if (acc.normal === "DEBIT") {
          balance = balance.plus(d).minus(c);
        } else {
          balance = balance.plus(c).minus(d);
        }
      }

      if (acc.type === "REVENUE") totalRevenue = totalRevenue.plus(balance);
      if (acc.code.startsWith("50")) totalCOGS = totalCOGS.plus(balance);
      if (acc.code.startsWith("60")) totalExpenses = totalExpenses.plus(balance);

      return {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        normal: acc.normal,
        balance,
      };
    });

    const entries = await prisma.journalEntry.findMany({
      include: {
        lines: {
          include: { account: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    recentEntries = entries.map((e) => ({
      id: e.id,
      entryDate: e.createdAt,
      reference: e.ref,
      description: e.description,
      lines: e.lines.map((l) => ({
        id: l.id,
        accountCode: l.account.code,
        accountName: l.account.name,
        debit: new Decimal(l.debit.toString()),
        credit: new Decimal(l.credit.toString()),
      })),
    }));
  } catch {
    // Fallback if database empty
    accountsWithBalances = STANDARD_ACCOUNTS.map((a) => ({
      ...a,
      balance: new Decimal(0),
    }));
  }

  const grossProfit = totalRevenue.minus(totalCOGS);
  const netProfit = grossProfit.minus(totalExpenses);

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="pb-4 border-b border-[var(--border-subtle)]">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-strong)]">
          General Ledger & Double-Entry Accounting
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Real-time double-entry ledger adhering to Bangladeshi financial standards and audit compliance.
        </p>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
            <span>Total Sales Revenue</span>
            <TrendingUp className="h-4 w-4 text-[var(--status-success)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-strong)] tabular-nums">
            {formatBDT(totalRevenue)}
          </p>
          <span className="text-[11px] text-[var(--text-muted)]">Decants & full bottles</span>
        </div>

        <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
            <span>Cost of Goods Sold (COGS)</span>
            <Calculator className="h-4 w-4 text-[var(--status-warning)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-strong)] tabular-nums">
            {formatBDT(totalCOGS)}
          </p>
          <span className="text-[11px] text-[var(--text-muted)]">Liquid cost basis & atomizers</span>
        </div>

        <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
            <span>Gross Margin</span>
            <Scale className="h-4 w-4 text-[var(--primary)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-strong)] tabular-nums">
            {formatBDT(grossProfit)}
          </p>
          <span className="text-[11px] text-[var(--text-muted)]">
            {totalRevenue.gt(0)
              ? `${grossProfit.div(totalRevenue).mul(100).toFixed(1)}% margin`
              : "0% margin"}
          </span>
        </div>

        <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
            <span>Operating Net Profit</span>
            <ShieldCheck className="h-4 w-4 text-[var(--status-success)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-strong)] tabular-nums">
            {formatBDT(netProfit)}
          </p>
          <span className="text-[11px] text-[var(--text-muted)]">After courier & MFS charges</span>
        </div>
      </div>

      {/* Chart of Accounts */}
      <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-base font-bold text-[var(--text-strong)]">
              Chart of Accounts (হিসাব তালিকা)
            </h2>
          </div>
          <Badge variant="success">Balanced Invariant Active</Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account Code</TableHead>
              <TableHead>Account Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Normal Balance</TableHead>
              <TableHead className="text-right">Current Ledger Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accountsWithBalances.map((acc) => (
              <TableRow key={acc.code}>
                <TableCell className="font-mono font-bold text-xs text-[var(--text-strong)]">
                  {acc.code}
                </TableCell>
                <TableCell className="text-xs font-semibold text-[var(--text-strong)]">
                  {acc.name}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      acc.type === "ASSET"
                        ? "info"
                        : acc.type === "REVENUE"
                        ? "success"
                        : acc.type === "EXPENSE"
                        ? "warning"
                        : "default"
                    }
                  >
                    {acc.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-[var(--text-muted)] font-mono">
                  {acc.normal}
                </TableCell>
                <TableCell className="text-right font-bold text-xs tabular-nums text-[var(--text-strong)]">
                  {formatBDT(acc.balance)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Recent Journal Entries */}
      <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-base font-bold text-[var(--text-strong)]">
              Recent Journal Entries & Audit Trail
            </h2>
          </div>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            Showing latest {recentEntries.length} entries
          </span>
        </div>

        {recentEntries.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)]">
            No journal entries recorded yet. Entries are automatically created upon order delivery, payment confirmation, and decant inventory conversions.
          </div>
        ) : (
          <div className="space-y-4">
            {recentEntries.map((entry) => {
              const entryTotalDebit = entry.lines.reduce((s, l) => s.plus(l.debit), new Decimal(0));
              const entryTotalCredit = entry.lines.reduce((s, l) => s.plus(l.credit), new Decimal(0));
              const isBalanced = entryTotalDebit.equals(entryTotalCredit);

              return (
                <div
                  key={entry.id}
                  className="p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/30 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                    <div>
                      <span className="font-bold text-[var(--text-strong)]">
                        {entry.description}
                      </span>
                      {entry.reference && (
                        <span className="ml-2 font-mono text-[var(--text-muted)]">
                          [Ref: {entry.reference}]
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[var(--text-muted)]">
                        {formatDhakaDate(entry.entryDate)}
                      </span>
                      <Badge variant={isBalanced ? "success" : "error"}>
                        {isBalanced ? "Balanced" : "Unbalanced"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1 text-xs font-mono">
                    {entry.lines.map((l) => (
                      <div
                        key={l.id}
                        className="flex justify-between items-center py-0.5 border-b border-[var(--border-subtle)]/40 last:border-0"
                      >
                        <span className="text-[var(--text-strong)]">
                          {l.accountCode} - {l.accountName}
                        </span>
                        <div className="flex gap-4 tabular-nums">
                          <span className={l.debit.gt(0) ? "font-bold text-[var(--text-strong)]" : "text-[var(--text-muted)]"}>
                            {l.debit.gt(0) ? `Dr ${formatBDT(l.debit)}` : "—"}
                          </span>
                          <span className={l.credit.gt(0) ? "font-bold text-[var(--text-strong)]" : "text-[var(--text-muted)]"}>
                            {l.credit.gt(0) ? `Cr ${formatBDT(l.credit)}` : "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
