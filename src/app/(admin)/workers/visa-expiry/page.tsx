"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Eye, Clock, Clock3, ShieldAlert, CalendarClock } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import "../../dashboard/dashboard-marketing.css";
import "../workers-page.css";

interface Worker {
  id: string;
  name: string;
  department: string | null;
  visa_expiry: string | null;
  status: string;
}

function daysLeft(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

/** Marketing-style band labels (navy / mono, flat) */
function visaBand(days: number): { daysCls: string; bandCls: string; bandLabel: string } {
  if (days <= 0) {
    return {
      daysCls: "border-[rgba(220,38,38,0.35)] bg-[rgba(254,242,242,0.85)] text-[#991b1b]",
      bandCls: "border-[rgba(220,38,38,0.35)] bg-[rgba(254,242,242,0.85)] text-[#991b1b]",
      bandLabel: "Expired",
    };
  }
  if (days <= 30) {
    return {
      daysCls: "border-[rgba(0,0,0,0.12)] bg-[#f0f0eb] text-[#0f2d5e]",
      bandCls: "border-[rgba(0,0,0,0.12)] bg-[#f0f0eb] text-[#0f2d5e]",
      bandLabel: "0–30 days",
    };
  }
  if (days <= 60) {
    return {
      daysCls: "border-[rgba(26,79,160,0.25)] bg-[rgba(26,79,160,0.08)] text-[#1a4fa0]",
      bandCls: "border-[rgba(26,79,160,0.25)] bg-[rgba(26,79,160,0.08)] text-[#1a4fa0]",
      bandLabel: "31–60 days",
    };
  }
  if (days <= 90) {
    return {
      daysCls: "border-[rgba(26,79,160,0.2)] bg-white text-[#0f2d5e]",
      bandCls: "border-[rgba(26,79,160,0.2)] bg-white text-[#0f2d5e]",
      bandLabel: "61–90 days",
    };
  }
  return {
    daysCls: "border-[rgba(22,163,74,0.3)] bg-[#f0fdf4] text-[#166534]",
    bandCls: "border-[rgba(22,163,74,0.3)] bg-[#f0fdf4] text-[#166534]",
    bandLabel: "90+ days",
  };
}

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

export default function VisaExpiryPage() {
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
        const data = await api.get<Worker[]>("/workers", token);
        setWorkers(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load workers");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const rows = useMemo(() => {
    return workers
      .filter((w) => Boolean(w.visa_expiry))
      .map((w) => ({
        ...w,
        visa_expiry: w.visa_expiry as string,
        days_left: daysLeft(w.visa_expiry as string),
      }))
      .sort((a, b) => new Date(a.visa_expiry).getTime() - new Date(b.visa_expiry).getTime());
  }, [workers]);

  const expiredCount = rows.filter((w) => w.days_left <= 0).length;
  const exp30 = rows.filter((w) => w.days_left > 0 && w.days_left <= 30).length;
  const exp60 = rows.filter((w) => w.days_left > 30 && w.days_left <= 60).length;
  const exp90 = rows.filter((w) => w.days_left > 60 && w.days_left <= 90).length;

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Loading visa expiries…
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
          <div className="adm-ph-ey">Sponsor compliance</div>
          <h1 className="adm-ph-title">
            Visa <em className="dash-title-em">expiry</em>
          </h1>
          <div className="adm-ph-date">{today}</div>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#64748b]">
            Employees ordered by nearest visa expiry date. Review urgent cases first.
          </p>
        </div>
        {expiredCount > 0 ? (
          <div className="adm-ph-badge adm-ph-badge-warn inline-flex items-center gap-2 border-red-200 bg-red-50 text-red-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {expiredCount} expired — action required
          </div>
        ) : (
          <div
            className="inline-flex items-center border border-[rgba(22,163,74,0.3)] bg-[#f0fdf4] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#166534]"
            style={MONO}
          >
            No expired visas
          </div>
        )}
      </div>

      <div className="adm-stat-row grid grid-cols-2 md:grid-cols-4" style={{ gap: 2, background: "rgba(0,0,0,0.07)", marginBottom: 16 }}>
        <div className="adm-sc adm-sc-r bg-white px-4 py-4">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-r">
              <ShieldAlert className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Urgent</span>
          </div>
          <div className="adm-sc-num">{expiredCount}</div>
          <div className="adm-sc-lbl">Expired</div>
          <div className="adm-sc-sub">Needs immediate action</div>
        </div>
        <div className="adm-sc adm-sc-a bg-white px-4 py-4">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-a">
              <AlertTriangle className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">0–30d</span>
          </div>
          <div className="adm-sc-num">{exp30}</div>
          <div className="adm-sc-lbl">0–30 days</div>
          <div className="adm-sc-sub">Urgent upcoming</div>
        </div>
        <div className="adm-sc adm-sc-p bg-white px-4 py-4">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-p">
              <Clock3 className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">31–60d</span>
          </div>
          <div className="adm-sc-num">{exp60}</div>
          <div className="adm-sc-lbl">31–60 days</div>
          <div className="adm-sc-sub">Plan and notify</div>
        </div>
        <div className="adm-sc adm-sc-b bg-white px-4 py-4">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b">
              <CalendarClock className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">61–90d</span>
          </div>
          <div className="adm-sc-num">{exp90}</div>
          <div className="adm-sc-lbl">61–90 days</div>
          <div className="adm-sc-sub">Monitor and prepare</div>
        </div>
      </div>

      <div className="wem-surface">
        <div className="wem-toolbar">
          <span className="wem-badge-mono">{rows.length} with visa date</span>
          <button
            type="button"
            onClick={() => router.push("/workers")}
            className="wem-badge-mono cursor-pointer border-[rgba(0,0,0,0.1)] hover:bg-[rgba(26,79,160,0.08)]"
            style={MONO}
          >
            All employees
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-white py-16">
            <div className="adm-ae-icon">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="adm-ae-t mt-3">No visa expiry data</div>
            <div className="adm-ae-s">No workers have a visa expiry date on record.</div>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white">
            <table className="wlp-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Visa expiry</th>
                  <th>Days left</th>
                  <th>Band</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => {
                  const tone = visaBand(w.days_left);
                  const visaUrgent = w.days_left <= 90;
                  const initials = w.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={w.id} className="cursor-pointer" onClick={() => router.push(`/workers/${w.id}?tab=records`)}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[rgba(0,0,0,0.08)] bg-[rgba(26,79,160,0.08)] text-[11px] font-extrabold text-[#1a4fa0]">
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#0a0a0a]">{w.name}</p>
                            <p className="truncate text-[11px] uppercase tracking-[0.05em] text-[#94a3b8]" style={MONO}>
                              {w.status.replaceAll("_", " ")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="text-[#0f2d5e]">{w.department || "—"}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {visaUrgent && <Clock className="h-3.5 w-3.5 shrink-0 text-[#d97706]" />}
                          <span className={visaUrgent ? "font-semibold text-[#0f2d5e]" : "text-[#0a0a0a]"}>
                            {new Date(w.visa_expiry).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`inline-flex border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] ${tone.daysCls}`}
                          style={MONO}
                        >
                          {w.days_left <= 0 ? "Expired" : `${w.days_left}d left`}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`inline-flex border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] ${tone.bandCls}`}
                          style={MONO}
                        >
                          {tone.bandLabel}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => router.push(`/workers/${w.id}?tab=records`)}
                          className="inline-flex h-8 items-center gap-1.5 border border-[rgba(0,0,0,0.1)] bg-[#f0f0eb] px-3 text-[9px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[rgba(26,79,160,0.08)]"
                          style={MONO}
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
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
