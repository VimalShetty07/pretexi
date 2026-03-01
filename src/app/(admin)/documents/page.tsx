"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, FileText, ShieldAlert, XCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { AdminDataTable } from "@/components/admin-data-table";

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

  const rows = useMemo(() => {
    return workers
      .map((w) => {
        const c = summary[w.id] || { total: 0, verified: 0, uploaded: 0, rejected: 0 };
        const pct = c.total > 0 ? Math.round((c.verified / c.total) * 100) : 0;
        return { worker: w, c, pct };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [workers, summary]);

  if (loading) return <p className="text-sm text-gray-500">Loading documents...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
        <div>
          <h1 className="admin-page-title">Documents</h1>
          <p className="admin-page-subtitle" style={{ marginTop: 6 }}>
            Compliance checklist progress across all employees.
          </p>
        </div>
        <span
          className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200"
          style={{ padding: "6px 12px", fontSize: 12, gap: 6 }}
        >
          <FileText style={{ width: 13, height: 13 }} />
          {workers.length} employees tracked
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 10 }}>
        <Stat label="Total Checklist Items" value={totals.total} tone="blue" />
        <Stat label="Verified" value={totals.verified} tone="emerald" />
        <Stat label="Awaiting Review" value={totals.uploaded} tone="amber" />
        <Stat label="Rejected" value={totals.rejected} tone="red" />
      </div>

      <AdminDataTable
        headers={["Employee", "Department", "Completion", "Verified", "Pending", "Rejected", "Status"]}
        colSpan={7}
        loading={loading}
        isEmpty={rows.length === 0}
        loadingContent="Loading compliance rows..."
        emptyContent={<p className="text-[var(--muted-foreground)]" style={{ fontSize: 14 }}>No employee compliance data found.</p>}
      >
        {rows.map(({ worker: w, c, pct }) => {
          const status =
            pct === 100 ? { label: "Compliant", cls: "text-emerald-700 bg-emerald-50" } :
            c.rejected > 0 ? { label: "Needs Fix", cls: "text-red-700 bg-red-50" } :
            c.uploaded > 0 ? { label: "In Review", cls: "text-amber-700 bg-amber-50" } :
            { label: "Pending", cls: "text-slate-700 bg-slate-100" };

          return (
            <tr key={w.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-brand-50/50 transition-colors">
              <td style={{ padding: "14px 16px" }}>
                <div className="flex items-center" style={{ gap: 12 }}>
                  <div
                    className="flex items-center justify-center rounded-full bg-brand-100 text-brand-600 font-bold shrink-0"
                    style={{ width: 36, height: 36, fontSize: 12 }}
                  >
                    {w.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-brand-900">{w.name}</p>
                    <p className="text-[var(--muted-foreground)]" style={{ fontSize: 12, marginTop: 1 }}>
                      {c.total} checklist item{c.total !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </td>

              <td className="text-brand-800" style={{ padding: "14px 16px" }}>
                {w.department || "—"}
              </td>

              <td style={{ padding: "14px 16px", minWidth: 160 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                  <span className="text-xs font-semibold text-brand-700">{pct}%</span>
                  <span className="text-xs text-[var(--muted-foreground)]">{c.verified}/{c.total}</span>
                </div>
                <div className="rounded-full bg-gray-100 overflow-hidden" style={{ height: 6 }}>
                  <div className="rounded-full bg-brand-600" style={{ height: 6, width: `${pct}%` }} />
                </div>
              </td>

              <td style={{ padding: "14px 16px" }}>
                <span className="inline-flex items-center rounded-full font-medium text-emerald-700 bg-emerald-50" style={{ padding: "3px 10px", gap: 5, fontSize: 12 }}>
                  <CheckCircle2 style={{ width: 12, height: 12 }} />
                  {c.verified}
                </span>
              </td>

              <td style={{ padding: "14px 16px" }}>
                <span className="inline-flex items-center rounded-full font-medium text-amber-700 bg-amber-50" style={{ padding: "3px 10px", gap: 5, fontSize: 12 }}>
                  <Clock3 style={{ width: 12, height: 12 }} />
                  {c.uploaded}
                </span>
              </td>

              <td style={{ padding: "14px 16px" }}>
                <span className="inline-flex items-center rounded-full font-medium text-red-700 bg-red-50" style={{ padding: "3px 10px", gap: 5, fontSize: 12 }}>
                  <XCircle style={{ width: 12, height: 12 }} />
                  {c.rejected}
                </span>
              </td>

              <td style={{ padding: "14px 16px" }}>
                <span className={`inline-flex items-center rounded-full font-medium ${status.cls}`} style={{ padding: "3px 10px", gap: 5, fontSize: 12 }}>
                  <ShieldAlert style={{ width: 12, height: 12 }} />
                  {status.label}
                </span>
              </td>
            </tr>
          );
        })}
      </AdminDataTable>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "emerald" | "amber" | "red";
}) {
  const toneMap = {
    blue: {
      border: "#dbeafe",
      bg: "#eff6ff",
      text: "#1d4ed8",
    },
    emerald: {
      border: "#d1fae5",
      bg: "#ecfdf5",
      text: "#047857",
    },
    amber: {
      border: "#fde68a",
      bg: "#fffbeb",
      text: "#b45309",
    },
    red: {
      border: "#fecaca",
      bg: "#fef2f2",
      text: "#b91c1c",
    },
  }[tone];

  return (
    <div
      className="rounded-xl border bg-white text-brand-900"
      style={{ padding: "12px 12px", borderColor: toneMap.border, background: toneMap.bg }}
    >
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="text-2xl font-bold" style={{ marginTop: 4, color: toneMap.text }}>{value}</p>
    </div>
  );
}
