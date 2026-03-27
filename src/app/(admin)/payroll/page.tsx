"use client";

import { useEffect, useState, useMemo } from "react";
import { Wallet } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";

interface PayrollRow {
  id: string;
  worker_id: string;
  worker_name: string;
  job_title: string | null;
  employee_id: string | null;
  pay_period: string;
  gross_pay: number;
  income_tax: number;
  employee_ni: number;
  pension_employee: number;
  net_pay: number;
  payment_date: string | null;
}

function gbp(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

export default function PayrollPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const data = await api.get<PayrollRow[]>("/payroll", token);
        setRows(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load payroll");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const byPeriod = useMemo(() => {
    const m = new Map<string, PayrollRow[]>();
    for (const r of rows) {
      const list = m.get(r.pay_period) ?? [];
      list.push(r);
      m.set(r.pay_period, list);
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  if (loading) {
    return <p className="text-sm text-[var(--muted-foreground)]">Loading payroll…</p>;
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF]"
          aria-hidden
        >
          <Wallet className="h-5 w-5 text-[#2563EB]" />
        </div>
        <div>
          <h1 className="admin-page-title">Payroll</h1>
          <p className="admin-page-subtitle" style={{ marginTop: 6 }}>
            Monthly payroll register for all employees. Visible to HR team only — managers do not have access.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="data-card rounded-2xl border border-[var(--border)] bg-white p-8 text-center text-sm text-[var(--muted-foreground)]">
          No payroll runs found. Seed demo data with{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">python seed_payroll.py</code> from the backend
          directory.
        </div>
      ) : (
        byPeriod.map(([period, periodRows]) => (
          <div key={period} className="data-card overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            <div
              className="border-b border-[var(--border)] bg-[var(--muted)]/40 px-4 py-3"
              style={{ fontSize: 13, fontWeight: 700 }}
            >
              Pay period {period}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
                    <th className="px-4 py-2 font-semibold">Employee</th>
                    <th className="px-4 py-2 font-semibold">Job title</th>
                    <th className="px-4 py-2 font-semibold text-right">Gross</th>
                    <th className="px-4 py-2 font-semibold text-right">Tax</th>
                    <th className="px-4 py-2 font-semibold text-right">NI</th>
                    <th className="px-4 py-2 font-semibold text-right">Pension</th>
                    <th className="px-4 py-2 font-semibold text-right">Net</th>
                    <th className="px-4 py-2 font-semibold">Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {periodRows.map((r) => (
                    <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-2.5 font-medium text-[#0f1f3a]">
                        {r.worker_name}
                        {r.employee_id ? (
                          <span className="ml-2 text-[11px] font-normal text-[var(--muted-foreground)]">
                            {r.employee_id}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--muted-foreground)]">{r.job_title || "—"}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{gbp(r.gross_pay)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-rose-700">{gbp(r.income_tax)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-amber-800">{gbp(r.employee_ni)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{gbp(r.pension_employee)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-800">
                        {gbp(r.net_pay)}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--muted-foreground)]">
                        {r.payment_date
                          ? new Date(r.payment_date).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
