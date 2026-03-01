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

  if (loading) return <p className="text-sm text-white/80">Loading portal...</p>;
  if (error || !profile) return <p className="text-sm text-red-200">{error || "Portal unavailable"}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">My Compliance</h1>
        <p className="text-sm text-white/70 mt-1">Your sponsorship profile and document status.</p>
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
    <div className="kpi-card kpi-blue dashboard-soft-3d" style={{ minHeight: 104, padding: "12px 12px" }}>
      <div className="flex items-center justify-between">
        <Icon className="text-white" style={{ width: 15, height: 15 }} />
        <p className="text-base font-bold text-white">{value}</p>
      </div>
      <p className="text-xs text-white/85" style={{ marginTop: 8 }}>{label}</p>
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
