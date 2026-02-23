"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  Users,
  Shield,
  UserCheck,
  AlertTriangle,
  Clock,
  CalendarDays,
  Loader2,
  ChevronRight,
  Eye,
} from "lucide-react";

interface DashboardData {
  total_employees: number;
  active_employees: number;
  sponsored: number;
  non_sponsored: number;
  pending_leaves: number;
  visa_breakdown: {
    expired: number;
    expiring_30: number;
    expiring_60: number;
    expiring_90: number;
    valid: number;
    no_visa: number;
  };
  expiring_workers: {
    id: string;
    name: string;
    visa_expiry: string;
    days_left: number;
    category: string;
    department: string | null;
    job_title: string;
  }[];
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// SVG donut chart
function DonutChart({
  segments,
  size = 200,
  strokeWidth = 32,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth}
        />
        <text x={size / 2} y={size / 2} textAnchor="middle" dy="0.35em" className="fill-gray-400" style={{ fontSize: 14 }}>
          No data
        </text>
      </svg>
    );
  }

  let offset = 0;
  const arcs = segments.filter((s) => s.value > 0).map((seg) => {
    const pct = seg.value / total;
    const dashArray = `${pct * circumference} ${circumference}`;
    const rotation = (offset / total) * 360 - 90;
    offset += seg.value;
    return (
      <circle
        key={seg.label}
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={seg.color} strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        strokeLinecap="butt"
        transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
      />
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs}
      <text x={size / 2} y={size / 2 - 8} textAnchor="middle" className="fill-brand-900 font-bold" style={{ fontSize: 28 }}>
        {total}
      </text>
      <text x={size / 2} y={size / 2 + 14} textAnchor="middle" className="fill-gray-500" style={{ fontSize: 12 }}>
        Total
      </text>
    </svg>
  );
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const d = await api.get<DashboardData>("/dashboard/overview", token ?? undefined);
      setData(d);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 80 }}>
        <Loader2 className="animate-spin text-brand-500" style={{ width: 24, height: 24 }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 40 }}>
        <h1 className="text-2xl font-bold text-brand-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-[var(--muted-foreground)]" style={{ marginTop: 8 }}>
          Unable to load dashboard data.
        </p>
      </div>
    );
  }

  const v = data.visa_breakdown;
  const totalAlerts = v.expired + v.expiring_30 + v.expiring_60 + v.expiring_90;

  const sponsorSegments = [
    { value: data.sponsored, color: "#2563eb", label: "Sponsored" },
    { value: data.non_sponsored, color: "#8b5cf6", label: "Non-Sponsored" },
  ];

  const visaSegments = [
    { value: v.expired, color: "#dc2626", label: "Expired" },
    { value: v.expiring_30, color: "#f97316", label: "Within 30 days" },
    { value: v.expiring_60, color: "#eab308", label: "Within 60 days" },
    { value: v.expiring_90, color: "#3b82f6", label: "Within 90 days" },
    { value: v.valid, color: "#10b981", label: "Valid (>90 days)" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900 tracking-tight">Dashboard</h1>
      <p className="text-sm text-[var(--muted-foreground)]" style={{ marginTop: 4, marginBottom: 24 }}>
        Sponsor licence compliance overview
      </p>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 16, marginBottom: 24 }}>
        <StatCard
          icon={Users} iconBg="#dbeafe" iconColor="#2563eb"
          label="Total Employees" value={data.total_employees}
          sub={`${data.active_employees} active`}
        />
        <StatCard
          icon={Shield} iconBg="#ede9fe" iconColor="#7c3aed"
          label="Sponsored" value={data.sponsored}
          sub={`${data.non_sponsored} non-sponsored`}
        />
        <StatCard
          icon={AlertTriangle} iconBg={totalAlerts > 0 ? "#fef3c7" : "#d1fae5"} iconColor={totalAlerts > 0 ? "#d97706" : "#059669"}
          label="Visa Alerts" value={totalAlerts}
          sub={v.expired > 0 ? `${v.expired} expired!` : "All good"}
          alert={v.expired > 0}
        />
        <StatCard
          icon={CalendarDays} iconBg="#fce7f3" iconColor="#db2777"
          label="Pending Leaves" value={data.pending_leaves}
          sub="Awaiting approval"
          onClick={() => router.push("/leave")}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 20, marginBottom: 24 }}>
        {/* Sponsored vs Non-Sponsored */}
        <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: "24px 28px" }}>
          <h3 className="text-sm font-semibold text-brand-900 uppercase tracking-wide" style={{ marginBottom: 20 }}>
            Employee Sponsorship
          </h3>
          <div className="flex items-center justify-center" style={{ gap: 40 }}>
            <DonutChart segments={sponsorSegments} size={180} strokeWidth={28} />
            <div style={{ minWidth: 140 }}>
              {sponsorSegments.map((s) => (
                <div key={s.label} className="flex items-center" style={{ gap: 10, marginBottom: 14 }}>
                  <div className="rounded-full shrink-0" style={{ width: 12, height: 12, background: s.color }} />
                  <div>
                    <div className="text-sm font-bold text-brand-900">{s.value}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visa Expiry Breakdown */}
        <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: "24px 28px" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
            <h3 className="text-sm font-semibold text-brand-900 uppercase tracking-wide">
              Visa Expiry Status
            </h3>
            {totalAlerts > 0 && (
              <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 text-xs font-medium" style={{ padding: "3px 10px", gap: 4 }}>
                <AlertTriangle style={{ width: 12, height: 12 }} />
                {totalAlerts} alert{totalAlerts !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center justify-center" style={{ gap: 40 }}>
            <DonutChart segments={visaSegments} size={180} strokeWidth={28} />
            <div style={{ minWidth: 150 }}>
              {visaSegments.map((s) => (
                <div key={s.label} className="flex items-center" style={{ gap: 10, marginBottom: 10 }}>
                  <div className="rounded-full shrink-0" style={{ width: 10, height: 10, background: s.color }} />
                  <div className="flex items-center" style={{ gap: 6 }}>
                    <span className="text-sm font-bold text-brand-900" style={{ minWidth: 20 }}>{s.value}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">{s.label}</span>
                  </div>
                </div>
              ))}
              {v.no_visa > 0 && (
                <div className="flex items-center" style={{ gap: 10, marginTop: 4 }}>
                  <div className="rounded-full shrink-0" style={{ width: 10, height: 10, background: "#d1d5db" }} />
                  <div className="flex items-center" style={{ gap: 6 }}>
                    <span className="text-sm font-bold text-brand-900" style={{ minWidth: 20 }}>{v.no_visa}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">No visa set</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expiring Workers Table */}
      {data.expiring_workers.length > 0 && (
        <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="flex items-center justify-between" style={{ padding: "16px 24px" }}>
            <div className="flex items-center" style={{ gap: 10 }}>
              <AlertTriangle style={{ width: 18, height: 18 }} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-brand-900">
                Visa Expiry Alerts ({data.expiring_workers.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => router.push("/workers")}
              className="text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors cursor-pointer flex items-center"
              style={{ gap: 4 }}
            >
              View All Employees <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead>
                <tr className="border-t border-b border-[var(--border)] bg-[var(--muted)]">
                  {["Employee", "Department", "Visa Expiry", "Days Left", "Urgency", ""].map((h) => (
                    <th
                      key={h || "_a"}
                      className="text-left font-semibold text-[var(--muted-foreground)] uppercase"
                      style={{ padding: "10px 16px", fontSize: 11, letterSpacing: "0.05em" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.expiring_workers.map((w) => {
                  const urgency = getUrgency(w.category);
                  return (
                    <tr key={w.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-brand-50/50 transition-colors">
                      <td style={{ padding: "12px 16px" }}>
                        <div className="flex items-center" style={{ gap: 10 }}>
                          <div
                            className="flex items-center justify-center rounded-full bg-brand-100 text-brand-600 font-bold shrink-0"
                            style={{ width: 32, height: 32, fontSize: 11 }}
                          >
                            {w.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-brand-900 truncate">{w.name}</p>
                            <p className="text-[var(--muted-foreground)] truncate" style={{ fontSize: 11 }}>{w.job_title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-brand-800" style={{ padding: "12px 16px" }}>{w.department ?? "—"}</td>
                      <td className="text-brand-800" style={{ padding: "12px 16px" }}>{fmt(w.visa_expiry)}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className={`font-bold ${w.days_left <= 0 ? "text-red-600" : w.days_left <= 30 ? "text-orange-600" : "text-amber-600"}`}>
                          {w.days_left <= 0 ? `${Math.abs(w.days_left)}d overdue` : `${w.days_left}d`}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          className={`inline-flex items-center rounded-full text-xs font-medium ${urgency.color} ${urgency.bg}`}
                          style={{ padding: "3px 10px", gap: 4 }}
                        >
                          <urgency.icon style={{ width: 12, height: 12 }} />
                          {urgency.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          type="button"
                          onClick={() => router.push(`/workers/${w.id}`)}
                          className="inline-flex items-center rounded-lg bg-brand-50 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors cursor-pointer"
                          style={{ height: 28, padding: "0 10px", gap: 4 }}
                        >
                          <Eye style={{ width: 12, height: 12 }} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
  alert,
  onClick,
}: {
  icon: typeof Users;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number;
  sub: string;
  alert?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`bg-white rounded-2xl border border-[var(--border)] text-left transition-colors ${onClick ? "hover:bg-brand-50 cursor-pointer" : ""} ${alert ? "border-amber-300" : ""}`}
      style={{ padding: "20px 22px" }}
      type={onClick ? "button" : undefined}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <div
          className="flex items-center justify-center rounded-xl"
          style={{ width: 40, height: 40, background: iconBg }}
        >
          <Icon style={{ width: 20, height: 20, color: iconColor }} />
        </div>
        {alert && (
          <span className="inline-flex items-center rounded-full bg-red-100 text-red-700" style={{ padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>
            ACTION
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-brand-900" style={{ marginBottom: 2 }}>{value}</div>
      <div className="text-xs text-[var(--muted-foreground)]">{label}</div>
      <div className="text-xs text-[var(--muted-foreground)]" style={{ marginTop: 2 }}>{sub}</div>
    </Tag>
  );
}

function getUrgency(category: string) {
  switch (category) {
    case "expired":
      return { label: "Expired", color: "text-red-700", bg: "bg-red-50", icon: AlertTriangle };
    case "30_days":
      return { label: "Critical", color: "text-orange-700", bg: "bg-orange-50", icon: AlertTriangle };
    case "60_days":
      return { label: "Warning", color: "text-amber-700", bg: "bg-amber-50", icon: Clock };
    case "90_days":
      return { label: "Monitor", color: "text-blue-700", bg: "bg-blue-50", icon: Clock };
    default:
      return { label: "OK", color: "text-emerald-700", bg: "bg-emerald-50", icon: UserCheck };
  }
}
