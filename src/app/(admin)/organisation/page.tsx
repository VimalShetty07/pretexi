"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BriefcaseBusiness, Building2, Mail, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";

interface Me {
  email: string;
  full_name: string;
  organisation_id: string;
}

interface Overview {
  total_employees: number;
  active_employees: number;
  sponsored?: number;
  non_sponsored?: number;
  cos_allocated: number;
  cos_used: number;
  cos_available: number;
  visa_breakdown?: {
    expired: number;
    expiring_30: number;
    expiring_60: number;
    expiring_90: number;
    valid: number;
    no_visa: number;
  };
}

export default function OrganisationPage() {
  const { token, user } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [ov, setOv] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const [m, o] = await Promise.all([
          api.get<Me>("/auth/me", token),
          api.get<Overview>("/dashboard/overview", token),
        ]);
        setMe(m);
        setOv(o);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load organisation");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  if (loading) return <p className="text-sm text-gray-500">Loading organisation...</p>;
  if (error || !me || !ov) return <p className="text-sm text-red-600">{error || "Organisation unavailable"}</p>;

  const activeRate = ov.total_employees > 0 ? Math.round((ov.active_employees / ov.total_employees) * 100) : 0;
  const cosUtilisation = ov.cos_allocated > 0 ? Math.round((ov.cos_used / ov.cos_allocated) * 100) : 0;
  const sponsored = ov.sponsored ?? 0;
  const nonSponsored = ov.non_sponsored ?? Math.max(ov.total_employees - sponsored, 0);
  const expiring90 = ov.visa_breakdown
    ? ov.visa_breakdown.expired + ov.visa_breakdown.expiring_30 + ov.visa_breakdown.expiring_60 + ov.visa_breakdown.expiring_90
    : 0;
  const orgCode = me.organisation_id.slice(0, 8).toUpperCase();
  const canViewCos = user?.role !== "hr_officer";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 className="admin-page-title">Organisation</h1>
        <p className="admin-page-subtitle" style={{ marginTop: 6 }}>
          Organisation health, sponsorship capacity, and admin context.
        </p>
      </div>

      <div className="data-card" style={{ padding: 16 }}>
        <div className="flex items-center justify-between flex-wrap" style={{ gap: 10 }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Organisation Profile</p>
            <h2 className="text-lg font-semibold text-gray-900" style={{ marginTop: 2 }}>Protexi Tenant {orgCode}</h2>
          </div>
          <span
            className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
            style={{ padding: "5px 10px", fontSize: 12, gap: 6 }}
          >
            <ShieldCheck style={{ width: 13, height: 13 }} />
            Active
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 10, marginTop: 12 }}>
          <Info icon={Building2} label="Organisation ID" value={me.organisation_id} />
          <Info icon={Mail} label="Admin Email" value={me.email} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 12 }}>
        <div className="data-card" style={{ padding: 16 }}>
          <h3 className="text-sm font-semibold text-gray-900">Workforce & Sponsorship</h3>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <StatRow icon={Users} label="Total Employees" value={String(ov.total_employees)} />
            <StatRow icon={Users} label="Active Employees" value={String(ov.active_employees)} />
            <StatRow icon={Users} label="Sponsored Workers" value={String(sponsored)} />
            <StatRow icon={Users} label="Non-Sponsored Workers" value={String(nonSponsored)} />
            <ProgressRow label="Active Rate" value={activeRate} color="emerald" />
          </div>
        </div>

        {canViewCos ? (
          <div className="data-card" style={{ padding: 16 }}>
            <h3 className="text-sm font-semibold text-gray-900">CoS Capacity & Compliance</h3>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <StatRow icon={BriefcaseBusiness} label="CoS Allocated" value={String(ov.cos_allocated)} />
              <StatRow icon={BriefcaseBusiness} label="CoS Used" value={String(ov.cos_used)} />
              <StatRow icon={BriefcaseBusiness} label="CoS Available" value={String(ov.cos_available)} />
              <ProgressRow label="CoS Utilisation" value={cosUtilisation} color="blue" />
              <StatRow icon={AlertTriangle} label="Visa Risk (next 90 days)" value={String(expiring90)} />
            </div>
          </div>
        ) : (
          <div className="data-card" style={{ padding: 16 }}>
            <h3 className="text-sm font-semibold text-gray-900">Compliance Overview</h3>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <StatRow icon={AlertTriangle} label="Visa Risk (next 90 days)" value={String(expiring90)} />
              <p className="text-xs text-gray-500" style={{ marginTop: 6 }}>
                CoS capacity details are hidden for HR role.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="data-card" style={{ padding: 16 }}>
        <h3 className="text-sm font-semibold text-gray-900">Admin Account Context</h3>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 10, marginTop: 10 }}>
          <Info icon={Building2} label="Admin Name" value={me.full_name} />
          <Info icon={Mail} label="Email" value={me.email} />
          <Info icon={Building2} label="Organisation ID" value={me.organisation_id} />
          {canViewCos ? (
            <Info icon={BriefcaseBusiness} label="Current CoS Used" value={String(ov.cos_used)} />
          ) : (
            <Info icon={AlertTriangle} label="Visa Risk (next 90 days)" value={String(expiring90)} />
          )}
        </div>
        <p className="text-xs text-gray-500" style={{ marginTop: 10 }}>
          Organisation profile editing APIs are not available in the current backend build.
        </p>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50" style={{ padding: "10px 12px" }}>
      <div className="flex items-center" style={{ gap: 6 }}>
        <Icon style={{ width: 12, height: 12, color: "#64748b" }} />
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className="text-sm font-semibold text-gray-900" style={{ marginTop: 2 }}>{value}</p>
    </div>
  );
}

function StatRow({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: "4px 0", borderBottom: "1px solid #e6edf6" }}>
      <div className="flex items-center" style={{ gap: 8 }}>
        <Icon style={{ width: 14, height: 14, color: "#64748b" }} />
        <p className="text-sm text-gray-600">{label}</p>
      </div>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function ProgressRow({ label, value, color }: { label: string; value: number; color: "emerald" | "blue" }) {
  const barClass = color === "emerald" ? "bg-emerald-500" : "bg-blue-500";
  const textClass = color === "emerald" ? "text-emerald-700" : "text-blue-700";
  return (
    <div style={{ paddingTop: 4 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
        <p className="text-sm text-gray-600">{label}</p>
        <p className={`text-sm font-semibold ${textClass}`}>{value}%</p>
      </div>
      <div className="rounded-full bg-gray-100 overflow-hidden" style={{ height: 6 }}>
        <div className={`${barClass}`} style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: "100%" }} />
      </div>
    </div>
  );
}

