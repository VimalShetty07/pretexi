"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { UserCircle, ShieldCheck, FileText, AlertTriangle, ArrowRight, Clock3 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";

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
        const [p, c] = await Promise.all([
          api.get<WorkerProfile>("/portal/me", token),
          api.get<ChecklistItem[]>("/portal/checklist", token),
        ]);
        setProfile(p);
        setChecklist(c);
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
    const verified = checklist.filter((x) => x.status === "verified" || x.status === "not_applicable").length;
    const uploaded = checklist.filter((x) => x.status === "uploaded").length;
    const rejected = checklist.filter((x) => x.status === "rejected").length;
    return { total, verified, uploaded, rejected };
  }, [checklist]);

  const progressPct = stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0;
  const pending = Math.max(stats.total - stats.verified, 0);
  const visaDate = profile?.visa_expiry ? new Date(profile.visa_expiry) : null;
  const visaDaysLeft = visaDate ? Math.ceil((visaDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  const riskMeta =
    profile?.risk_level === "critical"
      ? { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c", label: "Critical" }
      : profile?.risk_level === "high"
        ? { bg: "#fff7ed", border: "#fed7aa", color: "#c2410c", label: "High" }
        : profile?.risk_level === "medium"
          ? { bg: "#fffbeb", border: "#fde68a", color: "#a16207", label: "Medium" }
          : { bg: "#ecfdf3", border: "#bbf7d0", color: "#15803d", label: "Low" };

  if (loading) return <p className="text-sm text-gray-500">Loading dashboard...</p>;
  if (error || !profile) return <p className="text-sm text-red-600">{error || "Dashboard unavailable"}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 className="admin-page-title">Employee Dashboard</h1>
        <p className="admin-page-subtitle" style={{ marginTop: 6 }}>
          Your profile, document progress, and priority actions.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 10 }}>
        <PortalKpi icon={UserCircle} label="Visa Route" value={profile.route || "—"} tone="blue" />
        <PortalKpi icon={ShieldCheck} label="Risk Level" value={riskMeta.label} tone="green" />
        <PortalKpi icon={FileText} label="Verified Docs" value={`${stats.verified}/${stats.total}`} tone="indigo" />
        <PortalKpi icon={AlertTriangle} label="Pending Docs" value={String(pending)} tone="amber" />
      </div>

      <div className="data-card" style={{ padding: 14 }}>
        <div className="flex items-center justify-between flex-wrap" style={{ gap: 8 }}>
          <h3 className="text-sm font-semibold text-gray-900">Document Progress</h3>
          <p className="text-xs text-[var(--muted-foreground)]">{progressPct}% complete</p>
        </div>
        <div className="rounded-full bg-gray-100 overflow-hidden" style={{ height: 8, marginTop: 10 }}>
          <div
            style={{
              width: `${progressPct}%`,
              height: "100%",
              transition: "width 220ms ease",
              background: progressPct >= 100 ? "#10b981" : progressPct >= 60 ? "#2563eb" : "#f59e0b",
            }}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 8, marginTop: 10 }}>
          <MiniStat label="Total" value={String(stats.total)} />
          <MiniStat label="Verified" value={String(stats.verified)} />
          <MiniStat label="Uploaded" value={String(stats.uploaded)} />
          <MiniStat label="Rejected" value={String(stats.rejected)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 12 }}>
        <div className="data-card" style={{ padding: 14 }}>
          <h3 className="text-sm font-semibold text-gray-900">My Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 10, marginTop: 8 }}>
            <Info label="Name" value={profile.name} />
            <Info label="Job Title" value={profile.job_title} />
            <Info label="Department" value={profile.department || "—"} />
            <Info
              label="Visa Expiry"
              value={
                profile.visa_expiry
                  ? new Date(profile.visa_expiry).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                  : "—"
              }
            />
          </div>
        </div>

        <div className="data-card" style={{ padding: 14 }}>
          <h3 className="text-sm font-semibold text-gray-900">Priority & Actions</h3>
          <div
            className="rounded-xl border"
            style={{ marginTop: 8, padding: "10px 12px", background: riskMeta.bg, borderColor: riskMeta.border }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: riskMeta.color }}>
              Risk Status
            </p>
            <p className="text-sm font-semibold" style={{ marginTop: 2, color: riskMeta.color }}>
              {riskMeta.label}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50" style={{ marginTop: 8, padding: "10px 12px" }}>
            <div className="flex items-center" style={{ gap: 6 }}>
              <Clock3 style={{ width: 14, height: 14, color: "#64748b" }} />
              <p className="text-xs text-gray-500">Visa timeline</p>
            </div>
            <p className="text-sm font-semibold text-gray-900" style={{ marginTop: 2 }}>
              {visaDaysLeft == null
                ? "No visa expiry date"
                : visaDaysLeft >= 0
                  ? `${visaDaysLeft} day${visaDaysLeft === 1 ? "" : "s"} remaining`
                  : `${Math.abs(visaDaysLeft)} day${Math.abs(visaDaysLeft) === 1 ? "" : "s"} overdue`}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 8, marginTop: 10 }}>
            <Link href="/portal/documents" className="rounded-xl border border-[var(--border)] bg-white hover:bg-gray-50 transition-colors" style={{ padding: "10px 12px" }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#0f1f3a]">My Documents</p>
                <ArrowRight style={{ width: 14, height: 14, color: "#64748b" }} />
              </div>
              <p className="text-xs text-[var(--muted-foreground)]" style={{ marginTop: 2 }}>Upload and track document review</p>
            </Link>
            <Link href="/portal/details" className="rounded-xl border border-[var(--border)] bg-white hover:bg-gray-50 transition-colors" style={{ padding: "10px 12px" }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#0f1f3a]">My Details</p>
                <ArrowRight style={{ width: 14, height: 14, color: "#64748b" }} />
              </div>
              <p className="text-xs text-[var(--muted-foreground)]" style={{ marginTop: 2 }}>Review profile and contact fields</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function PortalKpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  tone: "blue" | "green" | "indigo" | "amber";
}) {
  const tones = {
    blue: { bg: "linear-gradient(135deg,#e9f2ff 0%,#dbeafe 100%)", border: "#bfdbfe", icon: "#2563eb", text: "#1e3a8a" },
    green: { bg: "linear-gradient(135deg,#ecfdf3 0%,#dcfce7 100%)", border: "#bbf7d0", icon: "#16a34a", text: "#166534" },
    indigo: { bg: "linear-gradient(135deg,#eef2ff 0%,#e0e7ff 100%)", border: "#c7d2fe", icon: "#4f46e5", text: "#312e81" },
    amber: { bg: "linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%)", border: "#fed7aa", icon: "#ea580c", text: "#9a3412" },
  } as const;
  const t = tones[tone];

  return (
    <div
      className="rounded-2xl border"
      style={{
        minHeight: 110,
        padding: "12px 12px",
        background: t.bg,
        borderColor: t.border,
      }}
    >
      <div className="flex items-center justify-between">
        <Icon style={{ width: 15, height: 15, color: t.icon }} />
        <p className="text-base font-bold" style={{ color: t.text }}>{value}</p>
      </div>
      <p className="text-xs font-semibold" style={{ marginTop: 8, color: t.text }}>{label}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50" style={{ padding: "8px 10px" }}>
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900" style={{ marginTop: 2 }}>{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50" style={{ padding: "10px 12px" }}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900" style={{ marginTop: 2 }}>{value}</p>
    </div>
  );
}
