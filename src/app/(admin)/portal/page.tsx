"use client";

import { useEffect, useMemo, useState } from "react";
import { UserCircle, ShieldCheck, FileText, AlertTriangle } from "lucide-react";
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
        <PortalKpi icon={UserCircle} label="Profile" value={profile.route || "—"} />
        <PortalKpi icon={ShieldCheck} label="Risk Level" value={profile.risk_level || "low"} />
        <PortalKpi icon={FileText} label="Verified Docs" value={`${stats.verified}/${stats.total}`} />
        <PortalKpi icon={AlertTriangle} label="Need Action" value={String(stats.rejected + stats.uploaded)} />
      </div>

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
    </div>
  );
}

function PortalKpi({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; value: string }) {
  return (
    <div
      className="rounded-2xl border"
      style={{
        minHeight: 110,
        padding: "12px 12px",
        background: "linear-gradient(135deg,#e9f2ff 0%,#dbeafe 100%)",
        borderColor: "#bfdbfe",
      }}
    >
      <div className="flex items-center justify-between">
        <Icon style={{ width: 15, height: 15, color: "#2563eb" }} />
        <p className="text-base font-bold" style={{ color: "#1e3a8a" }}>{value}</p>
      </div>
      <p className="text-xs font-semibold" style={{ marginTop: 8, color: "#1e3a8a" }}>{label}</p>
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
