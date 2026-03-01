"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";

interface Worker {
  id: string;
  name: string;
  department: string | null;
}

interface Compliance {
  total: number;
  verified: number;
  uploaded: number;
  rejected: number;
}

export default function DocumentsPage() {
  const { token } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [summary, setSummary] = useState<Record<string, Compliance>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const [w, s] = await Promise.all([
          api.get<Worker[]>("/workers", token),
          api.get<Record<string, Compliance>>("/workers/compliance-summary", token),
        ]);
        setWorkers(w);
        setSummary(s);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load documents data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const totals = useMemo(() => {
    let total = 0;
    let verified = 0;
    let uploaded = 0;
    let rejected = 0;
    Object.values(summary).forEach((s) => {
      total += s.total;
      verified += s.verified;
      uploaded += s.uploaded;
      rejected += s.rejected;
    });
    return { total, verified, uploaded, rejected };
  }, [summary]);

  if (loading) return <p className="text-sm text-white/80">Loading documents...</p>;
  if (error) return <p className="text-sm text-red-200">{error}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Documents</h1>
        <p className="text-sm text-white/70 mt-1">Compliance checklist summary across all employees.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 10 }}>
        <Stat label="Total Items" value={totals.total} />
        <Stat label="Verified" value={totals.verified} />
        <Stat label="Awaiting Review" value={totals.uploaded} />
        <Stat label="Rejected" value={totals.rejected} />
      </div>

      <div className="data-card" style={{ padding: 14 }}>
        <h3 className="text-sm font-semibold text-gray-900">Employee Compliance</h3>
        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
          {workers.map((w) => {
            const c = summary[w.id] || { total: 0, verified: 0, uploaded: 0, rejected: 0 };
            const pct = c.total > 0 ? Math.round((c.verified / c.total) * 100) : 0;
            return (
              <div key={w.id} className="rounded-xl border border-gray-200 bg-gray-50" style={{ padding: "10px 12px" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{w.name}</p>
                    <p className="text-xs text-gray-600">{w.department || "—"}</p>
                  </div>
                  <p className="text-xs text-gray-600">{c.verified}/{c.total} verified</p>
                </div>
                <div className="w-full rounded-full bg-gray-200" style={{ height: 6, marginTop: 8 }}>
                  <div className="rounded-full bg-brand-600" style={{ height: 6, width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white text-brand-900" style={{ padding: "12px 12px" }}>
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="text-2xl font-bold" style={{ marginTop: 4 }}>{value}</p>
    </div>
  );
}
