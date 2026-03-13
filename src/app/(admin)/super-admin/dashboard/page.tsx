"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarClock, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";

type OrgSummary = {
  id: string;
  name: string;
  slug: string | null;
  is_active: boolean;
  portal_plan: string;
  portal_expires_at: string | null;
  tenant_admin_email: string | null;
  subscription_status: string | null;
};

function Stat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: 16 }}>
      <div className="flex items-center justify-between">
        <span className="text-[var(--muted-foreground)] text-xs font-semibold uppercase tracking-wide">{label}</span>
        <span className="text-[#1a5296]">{icon}</span>
      </div>
      <p className="admin-value-number text-[#0f1f3a]" style={{ marginTop: 10 }}>{value}</p>
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<OrgSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const res = await api.get<OrgSummary[]>("/platform/organisations", token);
        setItems(res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load platform dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const metrics = useMemo(() => {
    const total = items.length;
    const active = items.filter((x) => x.is_active).length;
    const withAdmin = items.filter((x) => !!x.tenant_admin_email).length;
    const expiring30 = items.filter((x) => {
      if (!x.portal_expires_at) return false;
      const expiry = new Date(x.portal_expires_at).getTime();
      const now = Date.now();
      const days = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 30;
    }).length;
    return { total, active, withAdmin, expiring30 };
  }, [items]);

  if (loading) return <p className="text-sm text-[var(--muted-foreground)]">Loading platform dashboard...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 className="admin-page-title">Platform Dashboard</h1>
        <p className="admin-page-subtitle" style={{ marginTop: 6 }}>
          Overview of tenant organisations, status, and subscription health.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14 }}>
        <Stat label="Total Organisations" value={metrics.total} icon={<Building2 size={16} />} />
        <Stat label="Active Organisations" value={metrics.active} icon={<ShieldCheck size={16} />} />
        <Stat label="Admins Provisioned" value={metrics.withAdmin} icon={<Users size={16} />} />
        <Stat label="Expiring in 30d" value={metrics.expiring30} icon={<CalendarClock size={16} />} />
      </div>
    </div>
  );
}
