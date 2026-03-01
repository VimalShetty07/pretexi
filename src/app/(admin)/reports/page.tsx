"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, BriefcaseBusiness, type LucideIcon, ShieldCheck, TrendingUp } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { AdminDataTable } from "@/components/admin-data-table";

interface DashboardOverview {
  cos_allocated: number;
  cos_used: number;
  cos_available: number;
  cos_forecasted_required: number;
  cos_projected_required: number;
  cos_forecasted_demand: number;
  cos_projected_demand: number;
}

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

  if (loading) return <p className="text-sm text-gray-500">Loading reports...</p>;
  if (error || !data) return <p className="text-sm text-red-600">{error || "Reports unavailable"}</p>;
  const canViewCos = user?.role !== "hr_officer";

  if (!canViewCos) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h1 className="admin-page-title">Reports</h1>
          <p className="admin-page-subtitle" style={{ marginTop: 6 }}>
            CoS planning reports are restricted for HR role.
          </p>
        </div>
        <div className="data-card" style={{ padding: 16 }}>
          <p className="text-sm text-[var(--muted-foreground)]">
            Contact Super Admin or Compliance Manager if you need CoS allocation and demand reports.
          </p>
        </div>
      </div>
    );
  }

  const utilisation = data.cos_allocated > 0 ? Math.round((data.cos_used / data.cos_allocated) * 100) : 0;
  const shortfall90 = Math.max(0, data.cos_forecasted_required - data.cos_available);
  const shortfall12m = Math.max(0, data.cos_projected_required - data.cos_available);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 className="admin-page-title">Reports</h1>
        <p className="admin-page-subtitle" style={{ marginTop: 6 }}>
          Capacity outlook and risk view for CoS planning.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4" style={{ gap: 12 }}>
        <MetricCard
          icon={BriefcaseBusiness}
          label="CoS Available"
          value={data.cos_available}
          sub={`Allocated ${data.cos_allocated} · Used ${data.cos_used}`}
          tone="blue"
        />
        <MetricCard
          icon={TrendingUp}
          label="Utilisation"
          value={`${utilisation}%`}
          sub="Current CoS usage rate"
          tone="purple"
        />
        <MetricCard
          icon={AlertTriangle}
          label="90d Shortfall Risk"
          value={shortfall90}
          sub={`Required ${data.cos_forecasted_required}`}
          tone={shortfall90 > 0 ? "amber" : "emerald"}
        />
        <MetricCard
          icon={BarChart3}
          label="12m Shortfall Risk"
          value={shortfall12m}
          sub={`Required ${data.cos_projected_required}`}
          tone={shortfall12m > 0 ? "red" : "emerald"}
        />
      </div>

      <AdminDataTable
        headers={["Report Metric", "Current", "Demand Input", "Gap", "Status"]}
        colSpan={5}
        loading={false}
        isEmpty={false}
        loadingContent=""
        emptyContent=""
      >
        <tr className="border-b border-[var(--border)] hover:bg-brand-50/50 transition-colors">
          <td style={{ padding: "14px 16px" }}>
            <p className="font-semibold text-brand-900">CoS Availability</p>
            <p className="text-xs text-[var(--muted-foreground)]" style={{ marginTop: 2 }}>
              Current licence capacity left to allocate
            </p>
          </td>
          <td className="text-brand-900 font-semibold" style={{ padding: "14px 16px" }}>{data.cos_available}</td>
          <td className="text-brand-700" style={{ padding: "14px 16px" }}>{data.cos_allocated} allocated / {data.cos_used} used</td>
          <td style={{ padding: "14px 16px" }}>-</td>
          <td style={{ padding: "14px 16px" }}>
            <StatusPill good={data.cos_available > 0} goodLabel="Healthy" badLabel="At Risk" />
          </td>
        </tr>

        <tr className="border-b border-[var(--border)] hover:bg-brand-50/50 transition-colors">
          <td style={{ padding: "14px 16px" }}>
            <p className="font-semibold text-brand-900">Forecast (90 days)</p>
            <p className="text-xs text-[var(--muted-foreground)]" style={{ marginTop: 2 }}>
              Near-term requirement from active demand
            </p>
          </td>
          <td className="text-brand-900 font-semibold" style={{ padding: "14px 16px" }}>{data.cos_available}</td>
          <td className="text-brand-700" style={{ padding: "14px 16px" }}>
            Need {data.cos_forecasted_required} · Demand {data.cos_forecasted_demand}
          </td>
          <td className="font-semibold" style={{ padding: "14px 16px", color: shortfall90 > 0 ? "#b45309" : "#047857" }}>
            {shortfall90 > 0 ? shortfall90 : "No gap"}
          </td>
          <td style={{ padding: "14px 16px" }}>
            <StatusPill good={shortfall90 === 0} goodLabel="Covered" badLabel="Shortfall" />
          </td>
        </tr>

        <tr className="hover:bg-brand-50/50 transition-colors">
          <td style={{ padding: "14px 16px" }}>
            <p className="font-semibold text-brand-900">Projection (12 months)</p>
            <p className="text-xs text-[var(--muted-foreground)]" style={{ marginTop: 2 }}>
              Year-long planning outlook
            </p>
          </td>
          <td className="text-brand-900 font-semibold" style={{ padding: "14px 16px" }}>{data.cos_available}</td>
          <td className="text-brand-700" style={{ padding: "14px 16px" }}>
            Need {data.cos_projected_required} · Demand {data.cos_projected_demand}
          </td>
          <td className="font-semibold" style={{ padding: "14px 16px", color: shortfall12m > 0 ? "#b91c1c" : "#047857" }}>
            {shortfall12m > 0 ? shortfall12m : "No gap"}
          </td>
          <td style={{ padding: "14px 16px" }}>
            <StatusPill good={shortfall12m === 0} goodLabel="Covered" badLabel="Needs Action" />
          </td>
        </tr>
      </AdminDataTable>

      <div className="data-card" style={{ padding: 14 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <ShieldCheck style={{ width: 16, height: 16, color: "#1d4ed8" }} />
          <p className="text-sm font-semibold text-brand-900">Recommendation</p>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]" style={{ marginTop: 8 }}>
          {shortfall90 > 0 || shortfall12m > 0
            ? "Demand exceeds available CoS in one or more horizons. Prioritize high-risk sponsorship cases and request additional allocation early."
            : "Current CoS capacity covers forecasted and projected requirements. Continue weekly monitoring for demand changes."}
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sub: string;
  tone: "blue" | "purple" | "amber" | "red" | "emerald";
}) {
  const tones = {
    blue: { bg: "linear-gradient(135deg,#e9f2ff 0%,#dbeafe 100%)", border: "#bfdbfe", text: "#1e3a8a", icon: "#2563eb" },
    purple: { bg: "linear-gradient(135deg,#f3e8ff 0%,#ede9fe 100%)", border: "#ddd6fe", text: "#5b21b6", icon: "#7c3aed" },
    amber: { bg: "linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)", border: "#fde68a", text: "#b45309", icon: "#d97706" },
    red: { bg: "linear-gradient(135deg,#fef2f2 0%,#fee2e2 100%)", border: "#fecaca", text: "#b91c1c", icon: "#dc2626" },
    emerald: { bg: "linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%)", border: "#a7f3d0", text: "#047857", icon: "#059669" },
  }[tone];

  return (
    <div className="rounded-2xl border" style={{ background: tones.bg, borderColor: tones.border, padding: "14px 14px" }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: tones.text }}>{label}</p>
        <div className="rounded-lg bg-white/80" style={{ padding: 6 }}>
          <Icon style={{ width: 14, height: 14, color: tones.icon }} />
        </div>
      </div>
      <p className="admin-value-number" style={{ marginTop: 8, fontSize: 30, color: tones.text }}>
        {value}
      </p>
      <p className="text-xs" style={{ marginTop: 4, color: tones.text, opacity: 0.85 }}>
        {sub}
      </p>
    </div>
  );
}

function StatusPill({ good, goodLabel, badLabel }: { good: boolean; goodLabel: string; badLabel: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full font-medium"
      style={{
        padding: "3px 10px",
        fontSize: 12,
        background: good ? "#ecfdf5" : "#fef2f2",
        color: good ? "#047857" : "#b91c1c",
      }}
    >
      {good ? goodLabel : badLabel}
    </span>
  );
}
