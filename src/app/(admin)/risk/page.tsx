"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";

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

  if (loading) return <p className="text-sm text-white/80">Loading risk monitor...</p>;
  if (error) return <p className="text-sm text-red-200">{error}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Risk Monitor</h1>
        <p className="text-sm text-white/70 mt-1">Risk intelligence from worker status, visa and compliance.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 10 }}>
        <RiskCard label="Critical" value={stats.critical} tone="bg-red-50 text-red-700 border-red-200" />
        <RiskCard label="High" value={stats.high} tone="bg-orange-50 text-orange-700 border-orange-200" />
        <RiskCard label="Medium" value={stats.medium} tone="bg-amber-50 text-amber-700 border-amber-200" />
        <RiskCard label="Low" value={stats.low} tone="bg-emerald-50 text-emerald-700 border-emerald-200" />
      </div>

      <div className="data-card" style={{ padding: 14 }}>
        <h3 className="text-sm font-semibold text-gray-900">High / Critical Employees</h3>
        {flagged.length === 0 ? (
          <p className="text-sm text-gray-500" style={{ marginTop: 8 }}>No high-priority risks right now.</p>
        ) : (
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            {flagged.map((w) => (
              <div key={w.id} className="rounded-xl border border-gray-200 bg-gray-50" style={{ padding: "10px 12px" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{w.name}</p>
                    <p className="text-xs text-gray-600">{w.job_title} · {w.department || "—"}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 text-xs font-semibold" style={{ padding: "4px 8px", gap: 5 }}>
                    <AlertTriangle style={{ width: 12, height: 12 }} />
                    {w.risk_level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RiskCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-xl border ${tone}`} style={{ padding: "12px 12px" }}>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-2xl font-bold" style={{ marginTop: 4 }}>{value}</p>
    </div>
  );
}
