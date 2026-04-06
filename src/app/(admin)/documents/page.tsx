"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, FileText, ShieldAlert, XCircle, ListChecks } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import "../dashboard/dashboard-marketing.css";
import "../workers/workers-page.css";

interface Worker {
  id: string;
  name: string;
  department: string | null;
}

interface Compliance {
  total: number;
  verified: number;
  uploaded: number;
  rejected: number;
}

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

export default function DocumentsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [summary, setSummary] = useState<Record<string, Compliance>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const [w, s] = await Promise.all([
          api.get<Worker[]>("/workers", token),
          api.get<Record<string, Compliance>>("/workers/compliance-summary", token),
        ]);
        setWorkers(w);
        setSummary(s);
        setError("");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load documents data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const totals = useMemo(() => {
    let total = 0;
    let verified = 0;
    let uploaded = 0;
    let rejected = 0;
    Object.values(summary).forEach((s) => {
      total += s.total;
      verified += s.verified;
      uploaded += s.uploaded;
      rejected += s.rejected;
    });
    return { total, verified, uploaded, rejected };
  }, [summary]);

  const rows = useMemo(() => {
    return workers
      .map((w) => {
        const c = summary[w.id] || { total: 0, verified: 0, uploaded: 0, rejected: 0 };
        const pct = c.total > 0 ? Math.round((c.verified / c.total) * 100) : 0;
        return { worker: w, c, pct };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [workers, summary]);

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

  const needsAttention = useMemo(() => rows.filter((r) => r.c.rejected > 0 || r.c.uploaded > 0).length, [rows]);
  const fullyCompliant = useMemo(() => rows.filter((r) => r.pct === 100 && r.c.total > 0).length, [rows]);

  if (!token) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Sign in to view document compliance.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Loading documents…
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
          <div className="adm-ph-ey">Compliance</div>
          <h1 className="adm-ph-title">
            Document <em className="dash-title-em">checklists</em>
          </h1>
          <div className="adm-ph-date">{todayStr}</div>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#64748b]">
            Checklist progress across employees — verified uploads, items in review, and rejections.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="adm-ph-badge inline-flex items-center gap-2 border border-[rgba(26,79,160,0.25)] bg-[rgba(26,79,160,0.06)] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#0f2d5e]" style={MONO}>
            <FileText className="h-3.5 w-3.5" />
            {workers.length} employees
          </span>
          {needsAttention > 0 && (
            <span className="inline-flex items-center gap-2 border border-amber-200 bg-amber-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-amber-900" style={MONO}>
              <Clock3 className="h-3.5 w-3.5" />
              {needsAttention} need attention
            </span>
          )}
        </div>
      </div>

      <div className="adm-stat-row grid grid-cols-2 md:grid-cols-4" style={{ gap: 2, background: "rgba(0,0,0,0.07)", marginBottom: 16 }}>
        <div className="adm-sc adm-sc-b bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b">
              <ListChecks className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Items</span>
          </div>
          <div className="adm-sc-num">{totals.total}</div>
          <div className="adm-sc-lbl">Checklist items</div>
          <div className="adm-sc-sub">Across all workers</div>
        </div>
        <div className="adm-sc adm-sc-p bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-p">
              <CheckCircle2 className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">OK</span>
          </div>
          <div className="adm-sc-num">{totals.verified}</div>
          <div className="adm-sc-lbl">Verified</div>
          <div className="adm-sc-sub">{fullyCompliant} fully complete</div>
        </div>
        <div className="adm-sc adm-sc-a bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-a">
              <Clock3 className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Queue</span>
          </div>
          <div className="adm-sc-num">{totals.uploaded}</div>
          <div className="adm-sc-lbl">Awaiting review</div>
          <div className="adm-sc-sub">Uploaded, not verified</div>
        </div>
        <div className="adm-sc adm-sc-r bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-r">
              <XCircle className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Fix</span>
          </div>
          <div className="adm-sc-num">{totals.rejected}</div>
          <div className="adm-sc-lbl">Rejected</div>
          <div className="adm-sc-sub">Needs re-upload</div>
        </div>
      </div>

      <div className="wem-surface">
        <div className="wem-toolbar">
          <span className="wem-badge-mono" style={MONO}>
            {rows.length} rows · sorted by completion
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-white py-16">
            <div className="adm-ae-icon">
              <FileText className="h-5 w-5" />
            </div>
            <div className="adm-ae-t mt-3">No compliance data</div>
            <div className="adm-ae-s">No employees or checklist summary returned for this organisation.</div>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white">
            <table className="wlp-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Completion</th>
                  <th>Verified</th>
                  <th>Pending</th>
                  <th>Rejected</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ worker: w, c, pct }) => {
                  const initials = w.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  const status =
                    pct === 100 && c.total > 0
                      ? { label: "Compliant", cls: "border-[rgba(22,163,74,0.35)] bg-[#f0fdf4] text-[#166534]" }
                      : c.rejected > 0
                        ? { label: "Needs fix", cls: "border-[rgba(220,38,38,0.35)] bg-[rgba(254,242,242,0.85)] text-[#991b1b]" }
                        : c.uploaded > 0
                          ? { label: "In review", cls: "border-[rgba(217,119,6,0.35)] bg-[rgba(255,251,235,0.9)] text-[#b45309]" }
                          : { label: "Pending", cls: "border-[rgba(0,0,0,0.12)] bg-[#f8fafc] text-[#64748b]" };

                  return (
                    <tr
                      key={w.id}
                      className="cursor-pointer"
                      tabIndex={0}
                      role="link"
                      aria-label={`Open ${w.name} checklist`}
                      onClick={() => router.push(`/workers/${w.id}?tab=checklist`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/workers/${w.id}?tab=checklist`);
                        }
                      }}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[rgba(0,0,0,0.08)] bg-[rgba(26,79,160,0.08)] text-[11px] font-extrabold text-[#1a4fa0]">
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#0a0a0a]">{w.name}</p>
                            <p className="truncate text-[11px] uppercase tracking-[0.05em] text-[#94a3b8]" style={MONO}>
                              {c.total} item{c.total !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="text-[#0f2d5e]">{w.department || "—"}</td>
                      <td>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-[#0f2d5e]" style={MONO}>
                            {pct}%
                          </span>
                          <span className="text-[10px] text-[#94a3b8]" style={MONO}>
                            {c.verified}/{c.total}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden bg-[rgba(0,0,0,0.06)]">
                          <div className="h-full bg-[var(--dash-blue)]" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td>
                        <span
                          className="inline-flex items-center gap-1 border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] border-[rgba(22,163,74,0.3)] bg-[#f0fdf4] text-[#166534]"
                          style={MONO}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {c.verified}
                        </span>
                      </td>
                      <td>
                        <span
                          className="inline-flex items-center gap-1 border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] border-[rgba(217,119,6,0.35)] bg-[rgba(255,251,235,0.9)] text-[#b45309]"
                          style={MONO}
                        >
                          <Clock3 className="h-3 w-3" />
                          {c.uploaded}
                        </span>
                      </td>
                      <td>
                        <span
                          className="inline-flex items-center gap-1 border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] border-[rgba(220,38,38,0.35)] bg-[rgba(254,242,242,0.85)] text-[#991b1b]"
                          style={MONO}
                        >
                          <XCircle className="h-3 w-3" />
                          {c.rejected}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] ${status.cls}`}
                          style={MONO}
                        >
                          <ShieldAlert className="h-3 w-3" />
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
