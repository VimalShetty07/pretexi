"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ShieldAlert, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import "../dashboard/dashboard-marketing.css";
import "../workers/workers-page.css";

interface Worker {
  id: string;
  name: string;
  job_title: string;
  department: string | null;
  risk_level: string;
  visa_expiry: string | null;
}

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

export default function RiskPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError("");
        const data = await api.get<Worker[]>("/workers", token);
        setWorkers(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load risk data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const stats = useMemo(() => {
    const by = { critical: 0, high: 0, medium: 0, low: 0 };
    workers.forEach((w) => {
      const k = (w.risk_level || "low").toLowerCase() as keyof typeof by;
      if (k in by) by[k] += 1;
    });
    return by;
  }, [workers]);

  const flagged = workers.filter((w) => ["critical", "high"].includes((w.risk_level || "").toLowerCase()));
  const flaggedSorted = [...flagged].sort((a, b) => riskRank(a.risk_level) - riskRank(b.risk_level));
  const highPriorityShare = workers.length > 0 ? Math.round((flagged.length / workers.length) * 100) : 0;

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
          Sign in to view risk monitoring.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Loading risk monitor…
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
            Risk <em className="dash-title-em">monitor</em>
          </h1>
          <div className="adm-ph-date">{todayStr}</div>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#64748b]">
            Worker risk from status, visa timeline, and compliance posture. High and critical cases are listed below for
            action.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="adm-ph-badge inline-flex items-center gap-2 border border-[rgba(26,79,160,0.25)] bg-[rgba(26,79,160,0.06)] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#0f2d5e]" style={MONO}>
            <Users className="h-3.5 w-3.5" />
            {workers.length} workers scored
          </span>
          {flagged.length > 0 ? (
            <span className="inline-flex items-center gap-2 border border-red-200 bg-red-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-red-800" style={MONO}>
              <AlertTriangle className="h-3.5 w-3.5" />
              {highPriorityShare}% high / critical
            </span>
          ) : (
            <span
              className="inline-flex items-center border border-[rgba(22,163,74,0.3)] bg-[#f0fdf4] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#166534]"
              style={MONO}
            >
              No priority queue
            </span>
          )}
        </div>
      </div>

      <div
        className="adm-stat-row grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        style={{ gap: 2, background: "rgba(0,0,0,0.07)", marginBottom: 16 }}
      >
        <div className="adm-sc adm-sc-r bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-r">
              <AlertTriangle className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">P1</span>
          </div>
          <div className="adm-sc-num">{stats.critical}</div>
          <div className="adm-sc-lbl">Critical</div>
          <div className="adm-sc-sub">Immediate review</div>
        </div>
        <div className="adm-sc adm-sc-a bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-a">
              <ShieldAlert className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">P2</span>
          </div>
          <div className="adm-sc-num">{stats.high}</div>
          <div className="adm-sc-lbl">High</div>
          <div className="adm-sc-sub">Escalate this week</div>
        </div>
        <div className="adm-sc adm-sc-p bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-p">
              <TrendingUp className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">P3</span>
          </div>
          <div className="adm-sc-num">{stats.medium}</div>
          <div className="adm-sc-lbl">Medium</div>
          <div className="adm-sc-sub">Monitor</div>
        </div>
        <div className="adm-sc adm-sc-b bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b">
              <ShieldCheck className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">OK</span>
          </div>
          <div className="adm-sc-num">{stats.low}</div>
          <div className="adm-sc-lbl">Low</div>
          <div className="adm-sc-sub">Within tolerance</div>
        </div>
        <div className="adm-sc adm-sc-b bg-white px-4 py-4 text-left sm:col-span-3 lg:col-span-1">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b">
              <Users className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Share</span>
          </div>
          <div className="adm-sc-num">{highPriorityShare}%</div>
          <div className="adm-sc-lbl">High + critical</div>
          <div className="adm-sc-sub">Of workforce</div>
        </div>
      </div>

      <div className="wem-surface">
        <div className="wem-toolbar">
          <span className="text-[11px] font-extrabold text-[#0a0a0a]">Priority queue</span>
          <span className="wem-badge-mono" style={MONO}>
            {flaggedSorted.length} high / critical
          </span>
        </div>

        {flaggedSorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center border-t border-[rgba(0,0,0,0.07)] bg-white py-16">
            <div className="adm-ae-icon">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="adm-ae-t mt-3">No high-priority risks</div>
            <div className="adm-ae-s">Critical and high bands are clear. Keep monitoring visa timelines and compliance reviews.</div>
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-[rgba(0,0,0,0.07)] bg-white">
            <table className="wlp-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role & department</th>
                  <th>Risk</th>
                  <th>Visa expiry</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {flaggedSorted.map((w) => {
                  const risk = normalizeRisk(w.risk_level);
                  const visaText = w.visa_expiry
                    ? new Date(w.visa_expiry).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "Not set";
                  const p = priorityConfig(risk);
                  const initials = w.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  const riskCls =
                    risk === "Critical"
                      ? "border-[rgba(220,38,38,0.35)] bg-[rgba(254,242,242,0.85)] text-[#991b1b]"
                      : "border-[rgba(217,119,6,0.35)] bg-[rgba(255,251,235,0.9)] text-[#b45309]";

                  const priCls =
                    risk === "Critical"
                      ? "border-[rgba(220,38,38,0.45)] bg-[#991b1b] text-white"
                      : "border-[rgba(217,119,6,0.45)] bg-[#b45309] text-white";

                  return (
                    <tr
                      key={w.id}
                      className="cursor-pointer"
                      tabIndex={0}
                      role="link"
                      aria-label={`Open ${w.name}`}
                      onClick={() => router.push(`/workers/${w.id}?tab=records`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/workers/${w.id}?tab=records`);
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
                              {w.id.slice(0, 8)}…
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="text-[13px] font-medium text-[#0a0a0a]">{w.job_title}</p>
                        <p className="text-[11px] text-[#64748b]" style={MONO}>
                          {w.department || "—"}
                        </p>
                      </td>
                      <td>
                        <span
                          className={`inline-flex border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] ${riskCls}`}
                          style={MONO}
                        >
                          {risk}
                        </span>
                      </td>
                      <td className="text-[13px] text-[#0f2d5e]">{visaText}</td>
                      <td>
                        <span
                          className={`inline-flex border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] ${priCls}`}
                          style={MONO}
                        >
                          {p.priority}
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

      <div className="mt-4 wem-surface">
        <div className="wem-toolbar">
          <span className="flex items-center gap-2 text-[11px] font-extrabold text-[#0a0a0a]">
            <ShieldAlert className="h-4 w-4 text-[var(--dash-blue)]" />
            Risk summary
          </span>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
          <p className="text-[13px] leading-relaxed text-[#475569]">
            {flagged.length === 0
              ? "No critical or high-risk workers are currently flagged. Keep monitoring visa timelines and compliance reviews."
              : `${flagged.length} workers are in high or critical bands (${highPriorityShare}% of workforce). Prioritize document checks and visa actions for this group.`}
          </p>
        </div>
      </div>
    </div>
  );
}

function normalizeRisk(riskLevel: string) {
  const r = (riskLevel || "low").toLowerCase();
  if (r === "critical") return "Critical";
  if (r === "high") return "High";
  if (r === "medium") return "Medium";
  return "Low";
}

function riskRank(riskLevel: string) {
  const risk = normalizeRisk(riskLevel);
  if (risk === "Critical") return 0;
  if (risk === "High") return 1;
  if (risk === "Medium") return 2;
  return 3;
}

function priorityConfig(risk: string) {
  if (risk === "Critical") return { priority: "Immediate" };
  if (risk === "High") return { priority: "High" };
  if (risk === "Medium") return { priority: "Monitor" };
  return { priority: "Low" };
}
