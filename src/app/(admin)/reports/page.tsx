"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";

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
  const { token } = useAuth();
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

  if (loading) return <p className="text-sm text-white/80">Loading reports...</p>;
  if (error || !data) return <p className="text-sm text-red-200">{error || "Reports unavailable"}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Reports</h1>
        <p className="text-sm text-white/70 mt-1">CoS allotment requirement outlook.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 12 }}>
        <div className="cos-card cos-neutral dashboard-soft-3d" style={{ padding: "18px 20px" }}>
          <p className="text-white/85 text-sm font-medium">CoS Available</p>
          <p className="text-3xl font-bold text-white" style={{ marginTop: 8 }}>{data.cos_available}</p>
          <p className="text-xs text-white/80" style={{ marginTop: 6 }}>
            Allocated: {data.cos_allocated} · Used: {data.cos_used}
          </p>
        </div>
        <div className="cos-card cos-warn dashboard-soft-3d" style={{ padding: "18px 20px" }}>
          <p className="text-white/85 text-sm font-medium">Forecasted CoS Required (90d)</p>
          <p className="text-3xl font-bold text-white" style={{ marginTop: 8 }}>{data.cos_forecasted_required}</p>
          <p className="text-xs text-white/80" style={{ marginTop: 6 }}>Demand: {data.cos_forecasted_demand}</p>
        </div>
        <div className="cos-card cos-danger dashboard-soft-3d" style={{ padding: "18px 20px" }}>
          <p className="text-white/85 text-sm font-medium">Projected CoS Required (12m)</p>
          <p className="text-3xl font-bold text-white" style={{ marginTop: 8 }}>{data.cos_projected_required}</p>
          <p className="text-xs text-white/80" style={{ marginTop: 6 }}>Demand: {data.cos_projected_demand}</p>
        </div>
      </div>
    </div>
  );
}
