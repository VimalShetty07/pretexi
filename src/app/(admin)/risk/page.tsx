"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ShieldAlert, ShieldCheck, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { AdminDataTable } from "@/components/admin-data-table";

interface Worker {
  id: string;
  name: string;
  job_title: string;
  department: string | null;
  risk_level: string;
  visa_expiry: string | null;
}

export default function RiskPage() {
  const { token } = useAuth();
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

  if (loading) return <p className="text-sm text-gray-500">Loading risk monitor...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 className="admin-page-title">Risk Monitor</h1>
        <p className="admin-page-subtitle" style={{ marginTop: 6 }}>
          Worker risk intelligence from status, visa timeline, and compliance posture.
        </p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5" style={{ gap: 12 }}>
        <RiskCard icon={AlertTriangle} label="Critical" value={stats.critical} tone="red" />
        <RiskCard icon={ShieldAlert} label="High" value={stats.high} tone="amber" />
        <RiskCard icon={TrendingUp} label="Medium" value={stats.medium} tone="purple" />
        <RiskCard icon={ShieldCheck} label="Low" value={stats.low} tone="emerald" />
        <RiskCard icon={Users} label="High/Critical %" value={`${highPriorityShare}%`} tone="blue" />
      </div>

      <AdminDataTable
        headers={["Employee", "Role & Department", "Risk", "Visa Expiry", "Priority"]}
        colSpan={5}
        loading={false}
        isEmpty={flaggedSorted.length === 0}
        loadingContent=""
        emptyContent={<p className="text-[var(--muted-foreground)]" style={{ fontSize: 14 }}>No high-priority risks right now.</p>}
      >
        {flaggedSorted.map((w) => {
          const risk = normalizeRisk(w.risk_level);
          const visaText = w.visa_expiry
            ? new Date(w.visa_expiry).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "Not set";
          const p = priorityConfig(risk);

          return (
            <tr key={w.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-brand-50/50 transition-colors">
              <td style={{ padding: "14px 16px" }}>
                <div className="flex items-center" style={{ gap: 10 }}>
                  <div
                    className="flex items-center justify-center rounded-full bg-brand-100 text-brand-600 font-bold shrink-0"
                    style={{ width: 34, height: 34, fontSize: 12 }}
                  >
                    {w.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-brand-900">{w.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]" style={{ marginTop: 1 }}>
                      Worker ID: {w.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
              </td>

              <td style={{ padding: "14px 16px" }}>
                <p className="text-sm text-brand-900">{w.job_title}</p>
                <p className="text-xs text-[var(--muted-foreground)]" style={{ marginTop: 1 }}>{w.department || "—"}</p>
              </td>

              <td style={{ padding: "14px 16px" }}>
                <span
                  className="inline-flex items-center rounded-full font-medium"
                  style={{ padding: "3px 10px", fontSize: 12, background: p.softBg, color: p.text }}
                >
                  {risk}
                </span>
              </td>

              <td style={{ padding: "14px 16px" }} className="text-brand-800">
                {visaText}
              </td>

              <td style={{ padding: "14px 16px" }}>
                <span
                  className="inline-flex items-center rounded-full font-semibold"
                  style={{ padding: "3px 10px", fontSize: 12, background: p.bg, color: "#fff" }}
                >
                  {p.priority}
                </span>
              </td>
            </tr>
          );
        })}
      </AdminDataTable>

      <div className="data-card" style={{ padding: 14 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <ShieldAlert style={{ width: 16, height: 16, color: "#1d4ed8" }} />
          <p className="text-sm font-semibold text-brand-900">Risk Summary</p>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]" style={{ marginTop: 8 }}>
          {flagged.length === 0
            ? "No critical or high-risk workers are currently flagged. Keep monitoring visa timelines and compliance reviews."
            : `${flagged.length} workers are currently in high or critical bands (${highPriorityShare}% of workforce). Prioritize document checks and visa actions for this group.`}
        </p>
      </div>
    </div>
  );
}

function RiskCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  tone: "red" | "amber" | "purple" | "emerald" | "blue";
}) {
  const tones = {
    red: { bg: "linear-gradient(135deg,#fef2f2 0%,#fee2e2 100%)", border: "#fecaca", text: "#b91c1c", icon: "#dc2626" },
    amber: { bg: "linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)", border: "#fde68a", text: "#b45309", icon: "#d97706" },
    purple: { bg: "linear-gradient(135deg,#f3e8ff 0%,#ede9fe 100%)", border: "#ddd6fe", text: "#5b21b6", icon: "#7c3aed" },
    emerald: { bg: "linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%)", border: "#a7f3d0", text: "#047857", icon: "#059669" },
    blue: { bg: "linear-gradient(135deg,#e9f2ff 0%,#dbeafe 100%)", border: "#bfdbfe", text: "#1e3a8a", icon: "#2563eb" },
  }[tone];

  return (
    <div className="rounded-2xl border" style={{ background: tones.bg, borderColor: tones.border, padding: "12px 12px" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: tones.text }}>
          {label}
        </p>
        <Icon style={{ width: 14, height: 14, color: tones.icon }} />
      </div>
      <p className="admin-value-number" style={{ marginTop: 6, fontSize: 30, color: tones.text }}>
        {value}
      </p>
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
  if (risk === "Critical") {
    return { priority: "Immediate", bg: "#dc2626", softBg: "#fef2f2", text: "#b91c1c" };
  }
  if (risk === "High") {
    return { priority: "High", bg: "#d97706", softBg: "#fffbeb", text: "#b45309" };
  }
  if (risk === "Medium") {
    return { priority: "Monitor", bg: "#7c3aed", softBg: "#f3e8ff", text: "#5b21b6" };
  }
  return { priority: "Low", bg: "#059669", softBg: "#ecfdf5", text: "#047857" };
}
