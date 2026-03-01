"use client";

import { useEffect, useState } from "react";
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
  cos_allocated: number;
  cos_used: number;
  cos_available: number;
}

export default function OrganisationPage() {
  const { token } = useAuth();
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

  if (loading) return <p className="text-sm text-white/80">Loading organisation...</p>;
  if (error || !me || !ov) return <p className="text-sm text-red-200">{error || "Organisation unavailable"}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Organisation</h1>
        <p className="text-sm text-white/70 mt-1">Current organisation metrics and account context.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: 10 }}>
        <Card label="Total Employees" value={String(ov.total_employees)} />
        <Card label="Active Employees" value={String(ov.active_employees)} />
        <Card label="CoS Allocated" value={String(ov.cos_allocated)} />
        <Card label="CoS Available" value={String(ov.cos_available)} />
      </div>

      <div className="data-card" style={{ padding: 14 }}>
        <h3 className="text-sm font-semibold text-gray-900">Admin Account Context</h3>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 10, marginTop: 8 }}>
          <Info label="Name" value={me.full_name} />
          <Info label="Email" value={me.email} />
          <Info label="Organisation ID" value={me.organisation_id} />
          <Info label="CoS Used" value={String(ov.cos_used)} />
        </div>
        <p className="text-xs text-gray-500" style={{ marginTop: 10 }}>
          Note: editable organisation profile endpoints are not available in the current backend build.
        </p>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white" style={{ padding: "12px 12px" }}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-brand-900" style={{ marginTop: 4 }}>{value}</p>
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
