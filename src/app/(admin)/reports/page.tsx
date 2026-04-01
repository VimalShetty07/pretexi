"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, BriefcaseBusiness, type LucideIcon, ShieldCheck, TrendingUp } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import "../dashboard/dashboard-marketing.css";
import "../workers/workers-page.css";

interface DashboardOverview {
  cos_allocated: number;
  cos_used: number;
  cos_available: number;
  cos_forecasted_required: number;
  cos_projected_required: number;
  cos_forecasted_demand: number;
  cos_projected_demand: number;
}

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

export default function ReportsPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const res = await api.get<DashboardOverview>("/dashboard/overview", token);
        setData(res);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load reports");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  if (loading)
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>Loading reports…</p>
      </div>
    );

  if (error || !data)
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#dc2626]" style={MONO}>{error || "Reports unavailable"}</p>
      </div>
    );

  const canViewCos = user?.role !== "hr_officer";

  if (!canViewCos) {
    return (
      <div className="protexi-dash-marketing flex flex-col gap-0">
        <div className="adm-ph">
          <div>
            <div className="adm-ph-ey">Analytics</div>
            <h1 className="adm-ph-title">Reports</h1>
            <div className="adm-ph-date">CoS planning reports are restricted for HR role</div>
          </div>
        </div>
        <div className="border border-[rgba(0,0,0,0.07)] bg-white px-5 py-4">
          <p className="text-[12px] text-[#94a3b8]">
            Contact Super Admin or Compliance Manager if you need CoS allocation and demand reports.
          </p>
        </div>
      </div>
    );
  }

  const utilisation = data.cos_allocated > 0 ? Math.round((data.cos_used / data.cos_allocated) * 100) : 0;
  const shortfall90 = Math.max(0, data.cos_forecasted_required - data.cos_available);
  const shortfall12m = Math.max(0, data.cos_projected_required - data.cos_available);

  const tableRows: {
    label: string;
    desc: string;
    current: number;
    demand: string;
    gap: number | string;
    good: boolean;
    goodLabel: string;
    badLabel: string;
  }[] = [
    {
      label: "CoS Availability",
      desc: "Current licence capacity left to allocate",
      current: data.cos_available,
      demand: `${data.cos_allocated} allocated / ${data.cos_used} used`,
      gap: "—",
      good: data.cos_available > 0,
      goodLabel: "Healthy",
      badLabel: "At Risk",
    },
    {
      label: "Forecast (90 days)",
      desc: "Near-term requirement from active demand",
      current: data.cos_available,
      demand: `Need ${data.cos_forecasted_required} · Demand ${data.cos_forecasted_demand}`,
      gap: shortfall90 > 0 ? shortfall90 : "No gap",
      good: shortfall90 === 0,
      goodLabel: "Covered",
      badLabel: "Shortfall",
    },
    {
      label: "Projection (12 months)",
      desc: "Year-long planning outlook",
      current: data.cos_available,
      demand: `Need ${data.cos_projected_required} · Demand ${data.cos_projected_demand}`,
      gap: shortfall12m > 0 ? shortfall12m : "No gap",
      good: shortfall12m === 0,
      goodLabel: "Covered",
      badLabel: "Needs Action",
    },
  ];

  return (
    <div className="protexi-dash-marketing flex w-full flex-col gap-0">
      {/* ── Page header ──────────────────────────────────── */}
      <div className="adm-ph">
        <div>
          <div className="adm-ph-ey">Analytics</div>
          <h1 className="adm-ph-title">
            Reports <em className="dash-title-em">CoS</em>
          </h1>
          <div className="adm-ph-date">Capacity outlook and risk view for CoS planning</div>
        </div>
      </div>

      {/* ── KPI stat strip ───────────────────────────────── */}
      <div
        className="adm-stat-row grid grid-cols-2 md:grid-cols-4"
        style={{ gap: 2, background: "rgba(0,0,0,0.07)", marginBottom: 16 }}
      >
        <MetricTile
          icon={BriefcaseBusiness}
          label="CoS Available"
          value={data.cos_available}
          sub={`Allocated ${data.cos_allocated} · Used ${data.cos_used}`}
          accent="#1a4fa0"
        />
        <MetricTile
          icon={TrendingUp}
          label="Utilisation"
          value={`${utilisation}%`}
          sub="Current CoS usage rate"
          accent="#0f2d5e"
        />
        <MetricTile
          icon={AlertTriangle}
          label="90d Shortfall"
          value={shortfall90}
          sub={`Required ${data.cos_forecasted_required}`}
          accent={shortfall90 > 0 ? "#d97706" : "#16a34a"}
        />
        <MetricTile
          icon={BarChart3}
          label="12m Shortfall"
          value={shortfall12m}
          sub={`Required ${data.cos_projected_required}`}
          accent={shortfall12m > 0 ? "#dc2626" : "#16a34a"}
        />
      </div>

      {/* ── Planning table ───────────────────────────────── */}
      <div className="border border-[rgba(0,0,0,0.07)] bg-white" style={{ marginBottom: 16 }}>
        {/* Table header */}
        <div className="border-b border-[rgba(0,0,0,0.07)] px-5 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center bg-[rgba(26,79,160,0.08)] text-[#1a4fa0]">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-[#0a0a0a]">CoS Planning Detail</p>
            <p className="text-[11px] text-[#94a3b8]">Availability, forecast and projection breakdown</p>
          </div>
        </div>

        {/* Column headings */}
        <div
          className="grid border-b border-[rgba(0,0,0,0.07)] px-5 py-2"
          style={{ gridTemplateColumns: "2fr 80px 1fr 80px 90px", gap: 12 }}
        >
          {["Metric", "Current", "Demand / Input", "Gap", "Status"].map((h) => (
            <span
              key={h}
              className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#94a3b8]"
              style={MONO}
            >
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {tableRows.map((row, i) => (
          <div
            key={row.label}
            className={`grid items-center px-5 py-3.5 transition-colors hover:bg-[#f8f8f5] ${i < tableRows.length - 1 ? "border-b border-[rgba(0,0,0,0.06)]" : ""}`}
            style={{ gridTemplateColumns: "2fr 80px 1fr 80px 90px", gap: 12 }}
          >
            <div>
              <p className="text-[13px] font-semibold text-[#0f2d5e]">{row.label}</p>
              <p className="text-[11px] text-[#94a3b8]">{row.desc}</p>
            </div>
            <span className="text-[13px] font-bold text-[#0f2d5e]">{row.current}</span>
            <span className="text-[11px] text-[#94a3b8]">{row.demand}</span>
            <span
              className="text-[12px] font-bold"
              style={{ color: row.good ? "#16a34a" : row.gap === shortfall12m && !row.good ? "#dc2626" : "#d97706" }}
            >
              {row.gap}
            </span>
            <StatusPill good={row.good} goodLabel={row.goodLabel} badLabel={row.badLabel} />
          </div>
        ))}
      </div>

      {/* ── Recommendation ───────────────────────────────── */}
      <div className="border border-[rgba(0,0,0,0.07)] bg-white px-5 py-4 flex items-start gap-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center bg-[rgba(26,79,160,0.08)] text-[#1a4fa0]">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e]" style={MONO}>
            Recommendation
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-[#64748b]">
            {shortfall90 > 0 || shortfall12m > 0
              ? "Demand exceeds available CoS in one or more horizons. Prioritize high-risk sponsorship cases and request additional allocation early."
              : "Current CoS capacity covers forecasted and projected requirements. Continue weekly monitoring for demand changes."}
          </p>
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="bg-white px-5 py-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#94a3b8]" style={{ fontFamily: "var(--dash-mono)" }}>
          {label}
        </p>
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center"
          style={{ background: `${accent}14` }}
        >
          <Icon style={{ width: 14, height: 14, color: accent }} />
        </div>
      </div>
      <p className="mt-1 text-[26px] font-extrabold tracking-tight" style={{ color: accent }}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] leading-snug text-[#94a3b8]">{sub}</p>
    </div>
  );
}

function StatusPill({ good, goodLabel, badLabel }: { good: boolean; goodLabel: string; badLabel: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em]"
      style={{
        fontFamily: "var(--dash-mono)",
        background: good ? "#f0fdf4" : "#fef2f2",
        color: good ? "#166534" : "#dc2626",
        border: `1px solid ${good ? "rgba(22,163,74,0.25)" : "rgba(220,38,38,0.25)"}`,
      }}
    >
      {good ? goodLabel : badLabel}
    </span>
  );
}
