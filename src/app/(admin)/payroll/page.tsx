"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Wallet, CalendarRange, Users, TrendingUp, PiggyBank } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import "../dashboard/dashboard-marketing.css";
import "../workers/workers-page.css";

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

/** Calendar days from today until payment; past dates show as Paid. */
function daysToPayLabel(paymentDateIso: string | null): string {
  if (!paymentDateIso) return "—";
  const pay = new Date(paymentDateIso);
  if (Number.isNaN(pay.getTime())) return "—";
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const payDay = new Date(pay);
  payDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((payDay.getTime() - startToday.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return "Paid";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day";
  return `${diffDays} days`;
}

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

export default function PayrollPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError("");
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

  const aggregates = useMemo(() => {
    const uniqueWorkers = new Set(rows.map((r) => r.worker_id)).size;
    let totalGross = 0;
    let totalNet = 0;
    for (const r of rows) {
      totalGross += r.gross_pay;
      totalNet += r.net_pay;
    }
    return {
      periods: byPeriod.length,
      records: rows.length,
      uniqueWorkers,
      totalGross,
      totalNet,
    };
  }, [rows, byPeriod.length]);

  const todayStr = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    []
  );

  if (!token) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Sign in to view payroll.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Loading payroll…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#dc2626]" style={MONO}>
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="protexi-dash-marketing flex flex-col gap-0">
      <div className="adm-ph">
        <div className="min-w-0">
          <div className="adm-ph-ey">Finance</div>
          <h1 className="adm-ph-title">
            Payroll <em className="dash-title-em">register</em>
          </h1>
          <div className="adm-ph-date">{todayStr}</div>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#64748b]">
            Monthly payroll by period. Restricted to HR and payroll roles — line managers do not see this view.
          </p>
        </div>
        <div className="adm-ph-badge inline-flex items-center gap-2 border border-[rgba(26,79,160,0.25)] bg-[rgba(26,79,160,0.06)] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#0f2d5e]" style={MONO}>
          <Wallet className="h-3.5 w-3.5" />
          HR / payroll
        </div>
      </div>

      <div className="adm-stat-row grid grid-cols-2 md:grid-cols-4" style={{ gap: 2, background: "rgba(0,0,0,0.07)", marginBottom: 16 }}>
        <div className="adm-sc adm-sc-b bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b">
              <CalendarRange className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Runs</span>
          </div>
          <div className="adm-sc-num">{aggregates.periods}</div>
          <div className="adm-sc-lbl">Pay periods</div>
          <div className="adm-sc-sub">In register</div>
        </div>
        <div className="adm-sc adm-sc-p bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-p">
              <Users className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">People</span>
          </div>
          <div className="adm-sc-num">{aggregates.uniqueWorkers}</div>
          <div className="adm-sc-lbl">Employees</div>
          <div className="adm-sc-sub">{aggregates.records} payslip lines</div>
        </div>
        <div className="adm-sc adm-sc-a bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-a">
              <TrendingUp className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Gross</span>
          </div>
          <div className="adm-sc-num text-[clamp(1.1rem,2.5vw,1.75rem)]">{gbp(aggregates.totalGross)}</div>
          <div className="adm-sc-lbl">Total gross</div>
          <div className="adm-sc-sub">All loaded rows</div>
        </div>
        <div className="adm-sc adm-sc-r bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-r">
              <PiggyBank className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Net</span>
          </div>
          <div className="adm-sc-num text-[clamp(1.1rem,2.5vw,1.75rem)]">{gbp(aggregates.totalNet)}</div>
          <div className="adm-sc-lbl">Total net pay</div>
          <div className="adm-sc-sub">After deductions</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="wem-surface">
          <div className="wem-toolbar">
            <span className="wem-badge-mono" style={MONO}>
              No data
            </span>
          </div>
          <div className="flex flex-col items-center justify-center border-t border-[rgba(0,0,0,0.07)] bg-white px-4 py-16">
            <div className="adm-ae-icon">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="adm-ae-t mt-3">No payroll runs</div>
            <div className="adm-ae-s max-w-md text-center">
              Seed demo data with{" "}
              <code className="rounded border border-[rgba(0,0,0,0.1)] bg-[var(--dash-card)] px-1.5 py-0.5 text-[11px]" style={MONO}>
                python seed_payroll.py
              </code>{" "}
              from the backend directory.
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {byPeriod.map(([period, periodRows]) => (
            <div key={period} className="wem-surface">
              <div className="wem-toolbar">
                <span className="text-[11px] font-extrabold tracking-tight text-[#0a0a0a]">Pay period {period}</span>
                <span className="wem-badge-mono" style={MONO}>
                  {periodRows.length} payslip{periodRows.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="overflow-x-auto border-t border-[rgba(0,0,0,0.07)] bg-white">
                <table className="wlp-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Job title</th>
                      <th className="!text-right">Gross</th>
                      <th className="!text-right">Tax</th>
                      <th className="!text-right">NI</th>
                      <th className="!text-right">Pension</th>
                      <th className="!text-right">Net</th>
                      <th>Days to pay</th>
                      <th>Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodRows.map((r) => (
                      <tr
                        key={r.id}
                        className="cursor-pointer"
                        tabIndex={0}
                        role="link"
                        aria-label={`Open ${r.worker_name} profile`}
                        onClick={() => router.push(`/workers/${r.worker_id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(`/workers/${r.worker_id}`);
                          }
                        }}
                      >
                        <td>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#0a0a0a]">{r.worker_name}</p>
                            {r.employee_id ? (
                              <p className="truncate text-[11px] uppercase tracking-[0.05em] text-[#94a3b8]" style={MONO}>
                                {r.employee_id}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="text-[#475569]">{r.job_title || "—"}</td>
                        <td className="text-right tabular-nums text-[#0a0a0a]">{gbp(r.gross_pay)}</td>
                        <td className="text-right tabular-nums text-[#991b1b]">{gbp(r.income_tax)}</td>
                        <td className="text-right tabular-nums text-[#b45309]">{gbp(r.employee_ni)}</td>
                        <td className="text-right tabular-nums text-[#64748b]">{gbp(r.pension_employee)}</td>
                        <td className="text-right tabular-nums font-bold text-[#0f2d5e]">{gbp(r.net_pay)}</td>
                        <td className="text-[11px] text-[#0f2d5e]" style={MONO}>
                          {daysToPayLabel(r.payment_date)}
                        </td>
                        <td className="text-[11px] text-[#64748b]" style={MONO}>
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
          ))}
        </div>
      )}
    </div>
  );
}
