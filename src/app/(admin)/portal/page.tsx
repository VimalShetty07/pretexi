"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { UserCircle, ShieldCheck, FileText, AlertTriangle, ArrowRight, Clock3, ListChecks } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { parseChecklistListPayload } from "@/lib/parse-checklist-response";
import "../dashboard/dashboard-marketing.css";
import "../workers/workers-page.css";

interface WorkerProfile {
  name: string;
  job_title: string;
  department: string | null;
  route: string;
  risk_level: string;
  visa_expiry: string | null;
}

interface ChecklistItem {
  id: string;
  status: string;
}

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

export default function PortalPage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError("");
        const [p, rawChecklist] = await Promise.all([
          api.get<WorkerProfile>("/portal/me", token),
          api.get<unknown>("/portal/checklist", token),
        ]);
        setProfile(p);
        setChecklist(parseChecklistListPayload<ChecklistItem>(rawChecklist).items);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load portal");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const stats = useMemo(() => {
    const total = checklist.length;
    const hrVerified = checklist.filter((x) => x.status === "verified").length;
    const notApplicable = checklist.filter((x) => x.status === "not_applicable").length;
    const uploaded = checklist.filter((x) => x.status === "uploaded").length;
    const rejected = checklist.filter((x) => x.status === "rejected").length;
    return { total, hrVerified, notApplicable, uploaded, rejected };
  }, [checklist]);

  const progressPct = stats.total > 0 ? Math.round((stats.hrVerified / stats.total) * 100) : 0;
  const pending = Math.max(stats.total - stats.hrVerified - stats.notApplicable, 0);
  const visaDate = profile?.visa_expiry ? new Date(profile.visa_expiry) : null;
  const visaDaysLeft = visaDate ? Math.ceil((visaDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  const riskLabel =
    profile?.risk_level === "critical"
      ? "Critical"
      : profile?.risk_level === "high"
        ? "High"
        : profile?.risk_level === "medium"
          ? "Medium"
          : "Low";

  const riskScClass =
    profile?.risk_level === "critical"
      ? "adm-sc-r"
      : profile?.risk_level === "high"
        ? "adm-sc-a"
        : profile?.risk_level === "medium"
          ? "adm-sc-a"
          : "adm-sc-b";

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
          Sign in to open your portal.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Loading your dashboard…
        </p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#dc2626]" style={MONO}>
          {error || "Dashboard unavailable"}
        </p>
      </div>
    );
  }

  const routeDisplay = profile.route?.trim() || "—";

  return (
    <div className="protexi-dash-marketing flex flex-col gap-0">
      <div className="adm-ph adm-ph-portal">
        <div className="min-w-0">
          <div className="adm-ph-ey">Employee portal</div>
          <h1 className="adm-ph-title">
            Your <em className="dash-title-em">dashboard</em>
          </h1>
          <div className="adm-ph-date">{todayStr}</div>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#64748b]">
            Profile, document checklist progress, and shortcuts to upload files and review your details.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className="adm-ph-badge inline-flex max-w-full items-center gap-2 border border-[rgba(26,79,160,0.25)] bg-[rgba(26,79,160,0.06)] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#0f2d5e]"
            style={MONO}
          >
            <UserCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{profile.name}</span>
          </span>
          {profile.risk_level === "critical" || profile.risk_level === "high" ? (
            <span className="inline-flex items-center gap-2 border border-red-200 bg-red-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-red-800" style={MONO}>
              <AlertTriangle className="h-3.5 w-3.5" />
              Risk: {riskLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="adm-stat-row grid grid-cols-2 lg:grid-cols-4" style={{ gap: 2, background: "rgba(0,0,0,0.07)", marginBottom: 16 }}>
        <div className="adm-sc adm-sc-b bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b">
              <UserCircle className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Route</span>
          </div>
          <div className="line-clamp-2 min-h-[2.25rem] text-[15px] font-extrabold leading-tight tracking-tight text-[var(--dash-black)]">
            {routeDisplay}
          </div>
          <div className="adm-sc-lbl">Visa route</div>
          <div className="adm-sc-sub">Immigration track</div>
        </div>
        <div className={`adm-sc ${riskScClass} bg-white px-4 py-4 text-left`}>
          <div className="adm-sc-top">
            <div className={`adm-sc-icon ${profile.risk_level === "critical" || profile.risk_level === "high" ? "adm-si-r" : profile.risk_level === "medium" ? "adm-si-a" : "adm-si-b"}`}>
              <ShieldCheck className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Score</span>
          </div>
          <div className="adm-sc-num">{riskLabel}</div>
          <div className="adm-sc-lbl">Risk level</div>
          <div className="adm-sc-sub">Compliance posture</div>
        </div>
        <div className="adm-sc adm-sc-p bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-p">
              <FileText className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Docs</span>
          </div>
          <div className="adm-sc-num">
            {stats.hrVerified}/{stats.total}
          </div>
          <div className="adm-sc-lbl">HR verified</div>
          <div className="adm-sc-sub">
            {stats.notApplicable > 0 ? `${stats.notApplicable} marked N/A` : "Checklist items"}
          </div>
        </div>
        <div className="adm-sc adm-sc-a bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-a">
              <AlertTriangle className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Open</span>
          </div>
          <div className="adm-sc-num">{pending}</div>
          <div className="adm-sc-lbl">Pending docs</div>
          <div className="adm-sc-sub">Still to complete</div>
        </div>
      </div>

      <div className="wem-surface">
        <div className="wem-toolbar">
          <span className="flex items-center gap-2 text-[11px] font-extrabold text-[#0a0a0a]">
            <ListChecks className="h-4 w-4 text-[var(--dash-blue)]" />
            Document progress
          </span>
          <span className="wem-badge-mono" style={MONO}>
            {progressPct}% complete
          </span>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
          <div className="h-2 overflow-hidden bg-[rgba(0,0,0,0.06)]">
            <div
              className="h-full bg-[var(--dash-blue)] transition-[width] duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            <MiniStat label="Total" value={String(stats.total)} />
            <MiniStat label="HR verified" value={String(stats.hrVerified)} />
            <MiniStat label="N/A" value={String(stats.notApplicable)} />
            <MiniStat label="Uploaded" value={String(stats.uploaded)} />
            <MiniStat label="Rejected" value={String(stats.rejected)} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="wem-surface">
          <div className="wem-toolbar">
            <span className="text-[11px] font-extrabold text-[#0a0a0a]">My profile</span>
          </div>
          <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Info label="Name" value={profile.name} />
              <Info label="Job title" value={profile.job_title} />
              <Info label="Department" value={profile.department || "—"} />
              <Info
                label="Visa expiry"
                value={
                  profile.visa_expiry
                    ? new Date(profile.visa_expiry).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"
                }
              />
            </div>
          </div>
        </div>

        <div className="wem-surface">
          <div className="wem-toolbar">
            <span className="text-[11px] font-extrabold text-[#0a0a0a]">Priority & actions</span>
          </div>
          <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
            <div
              className={`border px-3 py-2.5 ${
                profile.risk_level === "critical"
                  ? "border-[rgba(220,38,38,0.35)] bg-[rgba(254,242,242,0.85)]"
                  : profile.risk_level === "high"
                    ? "border-[rgba(217,119,6,0.35)] bg-[rgba(255,251,235,0.9)]"
                    : profile.risk_level === "medium"
                      ? "border-[rgba(217,119,6,0.25)] bg-[rgba(255,251,235,0.5)]"
                      : "border-[rgba(22,163,74,0.3)] bg-[#f0fdf4]"
              }`}
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#64748b]" style={MONO}>
                Risk status
              </p>
              <p
                className={`mt-1 text-[15px] font-extrabold ${
                  profile.risk_level === "critical"
                    ? "text-[#991b1b]"
                    : profile.risk_level === "high"
                      ? "text-[#b45309]"
                      : profile.risk_level === "medium"
                        ? "text-[#b45309]"
                        : "text-[#166534]"
                }`}
              >
                {riskLabel}
              </p>
            </div>

            <div className="mt-2 border border-[rgba(0,0,0,0.08)] bg-[#f8fafc] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Clock3 className="h-3.5 w-3.5 text-[#94a3b8]" />
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#64748b]" style={MONO}>
                  Visa timeline
                </p>
              </div>
              <p className="mt-1 text-[13px] font-semibold text-[#0a0a0a]">
                {visaDaysLeft == null
                  ? "No visa expiry date"
                  : visaDaysLeft >= 0
                    ? `${visaDaysLeft} day${visaDaysLeft === 1 ? "" : "s"} remaining`
                    : `${Math.abs(visaDaysLeft)} day${Math.abs(visaDaysLeft) === 1 ? "" : "s"} overdue`}
              </p>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              <Link
                href="/portal/documents"
                className="group flex flex-col border border-[rgba(0,0,0,0.08)] bg-white p-3 transition-colors hover:border-[rgba(26,79,160,0.25)] hover:bg-[rgba(26,79,160,0.04)] no-underline"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-bold text-[#0a0a0a]">My documents</p>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#94a3b8] transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-1 text-[11px] leading-snug text-[#64748b]" style={MONO}>
                  Upload and track document review
                </p>
              </Link>
              <Link
                href="/portal/details"
                className="group flex flex-col border border-[rgba(0,0,0,0.08)] bg-white p-3 transition-colors hover:border-[rgba(26,79,160,0.25)] hover:bg-[rgba(26,79,160,0.04)] no-underline"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-bold text-[#0a0a0a]">My details</p>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#94a3b8] transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-1 text-[11px] leading-snug text-[#64748b]" style={MONO}>
                  Review profile and contact fields
                </p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[rgba(0,0,0,0.08)] bg-[#f8fafc] px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={MONO}>
        {label}
      </p>
      <p className="mt-0.5 text-[14px] font-bold tabular-nums text-[#0a0a0a]">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[rgba(0,0,0,0.08)] bg-[#f8fafc] px-3 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#64748b]" style={MONO}>
        {label}
      </p>
      <p className="mt-1 text-[13px] font-semibold text-[#0a0a0a]">{value}</p>
    </div>
  );
}
