"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Eye, Clock, Clock3, ShieldAlert, CalendarClock, type LucideIcon } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";

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

function visaTone(days: number) {
  if (days <= 0) {
    return {
      daysBadge: "text-red-700 bg-red-50",
      riskBadge: "text-red-700 bg-red-50",
      label: "Expired",
    };
  }
  if (days <= 30) {
    return {
      daysBadge: "text-amber-700 bg-amber-50",
      riskBadge: "text-amber-700 bg-amber-50",
      label: "0-30 days",
    };
  }
  if (days <= 60) {
    return {
      daysBadge: "text-orange-700 bg-orange-50",
      riskBadge: "text-orange-700 bg-orange-50",
      label: "31-60 days",
    };
  }
  if (days <= 90) {
    return {
      daysBadge: "text-blue-700 bg-blue-50",
      riskBadge: "text-blue-700 bg-blue-50",
      label: "61-90 days",
    };
  }
  return {
    daysBadge: "bg-emerald-50 text-emerald-700",
    riskBadge: "bg-emerald-50 text-emerald-700",
    label: "90+ days",
  };
}

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

  if (loading) return <p className="text-sm text-gray-500">Loading visa expiries...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
        <div>
          <h1 className="admin-page-title">Visa Expiry</h1>
          <p className="admin-page-subtitle" style={{ marginTop: 6 }}>
            Employees ordered by nearest visa expiry date
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 border border-red-200" style={{ padding: "7px 12px", fontSize: 12, gap: 6 }}>
          <AlertTriangle style={{ width: 13, height: 13 }} />
          {expiredCount} expired
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
        <VisaKpiCard icon={ShieldAlert} label="Expired" value={expiredCount} sub="Needs immediate action" colors={PINK} />
        <VisaKpiCard icon={AlertTriangle} label="0-30 Days" value={exp30} sub="Urgent upcoming expiry" colors={AMBER} />
        <VisaKpiCard icon={Clock3} label="31-60 Days" value={exp60} sub="Plan and notify teams" colors={PURPLE} />
        <VisaKpiCard icon={CalendarClock} label="61-90 Days" value={exp90} sub="Monitor and prepare" colors={BLUE} />
      </div>

      <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]" style={{ padding: 24 }}>
            No workers have visa expiry data.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full admin-uniform-table" style={{ fontSize: 13 }}>
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                  <th className="text-left font-semibold text-[var(--muted-foreground)] uppercase">Employee</th>
                  <th className="text-left font-semibold text-[var(--muted-foreground)] uppercase">Department</th>
                  <th className="text-left font-semibold text-[var(--muted-foreground)] uppercase">Visa Expiry</th>
                  <th className="text-left font-semibold text-[var(--muted-foreground)] uppercase">Days Left</th>
                  <th className="text-left font-semibold text-[var(--muted-foreground)] uppercase">Risk Band</th>
                  <th className="text-left font-semibold text-[var(--muted-foreground)] uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((w, idx) => {
                  const tone = visaTone(w.days_left);
                  const visaUrgent = w.days_left <= 90;

                  return (
                    <tr
                      key={w.id}
                      className="border-b border-[var(--border)] last:border-b-0 hover:bg-brand-50/50 transition-colors"
                    >
                      <td>
                        <div className="flex items-center" style={{ gap: 12 }}>
                          <span
                            className="inline-flex items-center justify-center rounded-full bg-brand-100 text-brand-600 font-bold shrink-0"
                            style={{ width: 36, height: 36, fontSize: 12 }}
                          >
                            {w.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-brand-900 truncate">{w.name}</p>
                            <p className="text-[var(--muted-foreground)] truncate" style={{ fontSize: 12, marginTop: 1 }}>
                              {w.status.replaceAll("_", " ")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="text-brand-800">
                        {w.department || "—"}
                      </td>
                      <td className="text-brand-800 font-medium">
                        <div className="flex items-center" style={{ gap: 6 }}>
                          {visaUrgent && <Clock className="text-amber-500 shrink-0" style={{ width: 14, height: 14 }} />}
                          <span className={visaUrgent ? "text-amber-700 font-medium" : "text-brand-800"}>
                            {new Date(w.visa_expiry).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center rounded-full font-medium ${tone.daysBadge}`}
                          style={{ padding: "3px 10px", fontSize: 12 }}
                        >
                          {w.days_left <= 0 ? "Expired" : `${w.days_left} days left`}
                        </span>
                      </td>
                      <td className="capitalize">
                        <span
                          className={`inline-flex items-center rounded-full font-medium ${tone.riskBadge}`}
                          style={{ padding: "3px 10px", fontSize: 12 }}
                        >
                          <span>{tone.label}</span>
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => router.push(`/workers/${w.id}`)}
                          className="inline-flex items-center rounded-lg bg-brand-50 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors cursor-pointer"
                          style={{ height: 30, padding: "0 10px", gap: 5 }}
                        >
                          <Eye style={{ width: 13, height: 13 }} />
                          Show
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

const BLUE = { from: "#1e5fe0", via: "#2f7cf6", to: "#22b2ff", edge: "#1644a6", glow: "rgba(47,124,246,0.40)", dot: "rgba(255,255,255,0.12)" };
const PURPLE = { from: "#7a3ff2", via: "#9656ff", to: "#c35cff", edge: "#5629aa", glow: "rgba(150,86,255,0.38)", dot: "rgba(255,255,255,0.12)" };
const AMBER = { from: "#ea7a1f", via: "#f79a1d", to: "#f7be35", edge: "#a55a19", glow: "rgba(247,154,29,0.38)", dot: "rgba(255,255,255,0.13)" };
const PINK = { from: "#d83d77", via: "#ee4f8c", to: "#ff6ca6", edge: "#9c2b59", glow: "rgba(238,79,140,0.36)", dot: "rgba(255,255,255,0.12)" };

function VisaKpiCard({
  icon: Icon,
  label,
  value,
  sub,
  colors,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  sub: string;
  colors: { from: string; via: string; to: string; edge: string; glow: string; dot: string };
}) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 22,
        background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.via} 50%, ${colors.to} 100%)`,
        border: "1px solid rgba(255,255,255,0.24)",
        padding: "16px 16px 14px",
        minHeight: 136,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), 0 3px 0 ${colors.edge}, 0 10px 20px -14px ${colors.glow}, 0 2px 8px rgba(0,0,0,0.14)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 22,
          backgroundImage: `radial-gradient(circle, ${colors.dot} 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
          pointerEvents: "none",
        }}
      />
      <div className="flex items-center justify-between" style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "rgba(255,255,255,0.16)",
            border: "1px solid rgba(255,255,255,0.22)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28), 0 2px 8px rgba(0,0,0,0.14)",
          }}
        >
          <Icon style={{ width: 18, height: 18, color: "#fff" }} />
        </div>
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
        <p className="admin-value-number" style={{ color: "#fff" }}>{value}</p>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 6 }}>{label}</p>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.70)", marginTop: 3 }}>{sub}</p>
      </div>
    </div>
  );
}

