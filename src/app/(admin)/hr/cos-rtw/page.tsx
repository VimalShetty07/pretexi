"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plane, RefreshCw, ShieldCheck, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import "../../dashboard/dashboard-marketing.css";
import "../../workers/workers-page.css";

interface HrCosRtwWorkerRow {
  id: string;
  name: string;
  job_title: string;
  department: string | null;
  stage: string;
  hr_onboarding_stage: string | null;
  right_to_work_category: string | null;
  route: string;
  sponsorship_number: string | null;
  cos_assigned_date: string | null;
  visa_expiry: string | null;
  last_rtw_check: string | null;
  next_rtw_check: string | null;
}

interface HrCosRtwQueue {
  cos_allocated: number;
  cos_used: number;
  cos_available: number;
  workers: HrCosRtwWorkerRow[];
}

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function stageLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function HrCosRtwPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<HrCosRtwQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const res = await api.get<HrCosRtwQueue>("/workers/hr-cos-rtw-queue", token);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load queue");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

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
          Sign in to view CoS &amp; RTW.
        </p>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="protexi-dash-marketing flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-[#1a4fa0]" />
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Loading immigration queue…
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#dc2626]" style={MONO}>
          {error}
        </p>
      </div>
    );
  }

  const q = data!;

  return (
    <div className="protexi-dash-marketing flex flex-col gap-0">
      <div className="adm-ph">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="adm-ph-ey">HR immigration</div>
            <h1 className="adm-ph-title">
              CoS &amp; <em className="dash-title-em">right to work</em>
            </h1>
            <div className="adm-ph-date">{todayStr}</div>
            <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#64748b]">
              Sponsorship numbers, CoS assignment dates, visa expiry, and RTW check cadence. Open an employee to update
              records. Not visible to payroll-only or inspector roles.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex h-9 shrink-0 items-center gap-2 border border-[rgba(0,0,0,0.1)] bg-white px-3 text-[10px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[#f8fafc] disabled:opacity-50"
            style={MONO}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="adm-stat-row grid max-w-3xl grid-cols-1 sm:grid-cols-2" style={{ gap: 2, background: "rgba(0,0,0,0.07)", marginBottom: 16 }}>
        <div className="adm-sc adm-sc-b bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b">
              <Plane className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Pool</span>
          </div>
          <div className="adm-sc-num">{q.cos_available}</div>
          <div className="adm-sc-lbl">CoS available</div>
          <div className="adm-sc-sub">
            {q.cos_used} used / {q.cos_allocated} allocated
          </div>
        </div>
        <div className="adm-sc adm-sc-p bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-p">
              <ShieldCheck className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Queue</span>
          </div>
          <div className="adm-sc-num">{q.workers.length}</div>
          <div className="adm-sc-lbl">In sponsor / visa / RTW</div>
          <div className="adm-sc-sub">Filtered list</div>
        </div>
      </div>

      <div className="wem-surface">
        <div className="wem-toolbar">
          <span className="text-[11px] font-extrabold tracking-tight text-[#0a0a0a]">Immigration queue</span>
          <Link
            href="/workers/new"
            className="wem-badge-mono border border-[rgba(0,0,0,0.1)] bg-[#0f2d5e] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.07em] text-white no-underline hover:bg-[#1a4fa0]"
            style={MONO}
          >
            Add employee
          </Link>
        </div>
        {q.workers.length === 0 ? (
          <div className="flex flex-col items-center justify-center border-t border-[rgba(0,0,0,0.07)] bg-white px-4 py-16">
            <p className="text-sm font-semibold text-[#64748b]">No one in the sponsor or visa pipeline yet.</p>
            <p className="mt-2 max-w-md text-center text-[12px] text-[#94a3b8]">
              Workers appear here when they have a CoS assignment date, sponsorship number, visa expiry, or are in CoS /
              pre-start / active sponsorship stages.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-[rgba(0,0,0,0.07)] bg-white">
            <table className="wlp-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Stage</th>
                  <th>RTW category</th>
                  <th>Sponsor ref</th>
                  <th>CoS assigned</th>
                  <th>Visa expiry</th>
                  <th>Next RTW</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {q.workers.map((w) => (
                  <tr
                    key={w.id}
                    className="cursor-pointer"
                    tabIndex={0}
                    role="link"
                    onClick={() => router.push(`/workers/${w.id}?tab=details`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/workers/${w.id}?tab=details`);
                      }
                    }}
                  >
                    <td>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#0a0a0a]">{w.name}</p>
                        <p className="truncate text-[11px] text-[#64748b]">
                          {w.job_title}
                          {w.department ? ` · ${w.department}` : ""}
                        </p>
                      </div>
                    </td>
                    <td className="text-[#0f2d5e]">
                      <span className="block text-[12px] font-medium">{stageLabel(w.stage)}</span>
                      {w.hr_onboarding_stage ? (
                        <span className="text-[10px] text-[#94a3b8]" style={MONO}>
                          {w.hr_onboarding_stage}
                        </span>
                      ) : null}
                    </td>
                    <td className="max-w-[140px] truncate text-[12px] text-[#334155]" title={w.right_to_work_category ?? ""}>
                      {w.right_to_work_category || "—"}
                    </td>
                    <td className="text-[11px] text-[#0f2d5e]" style={MONO}>
                      {w.sponsorship_number || "—"}
                    </td>
                    <td className="text-[11px] text-[#64748b]" style={MONO}>
                      {fmt(w.cos_assigned_date)}
                    </td>
                    <td className="text-[11px] text-[#64748b]" style={MONO}>
                      {fmt(w.visa_expiry)}
                    </td>
                    <td className="text-[11px] text-[#64748b]" style={MONO}>
                      {fmt(w.next_rtw_check)}
                    </td>
                    <td className="w-[100px]">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.07em] text-[#1a4fa0]" style={MONO}>
                        Open
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
