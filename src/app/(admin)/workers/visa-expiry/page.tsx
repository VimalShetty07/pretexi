"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Eye } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";

interface Worker {
  id: string;
  name: string;
  department: string | null;
  visa_expiry: string | null;
  status: string;
}

function daysLeft(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function visaTone(days: number) {
  if (days <= 0) {
    return {
      badge: "bg-red-100 text-red-700 border-red-200",
      dot: "#ef4444",
      label: "Expired",
      rowBg: "#fff5f5",
    };
  }
  if (days <= 30) {
    return {
      badge: "bg-orange-100 text-orange-700 border-orange-200",
      dot: "#f97316",
      label: "0-30 days",
      rowBg: "#fff7ed",
    };
  }
  if (days <= 60) {
    return {
      badge: "bg-amber-100 text-amber-700 border-amber-200",
      dot: "#f59e0b",
      label: "31-60 days",
      rowBg: "#fffbeb",
    };
  }
  if (days <= 90) {
    return {
      badge: "bg-sky-100 text-sky-700 border-sky-200",
      dot: "#0ea5e9",
      label: "61-90 days",
      rowBg: "#f0f9ff",
    };
  }
  return {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "#10b981",
    label: "90+ days",
    rowBg: "#f0fdf4",
  };
}

export default function VisaExpiryPage() {
  const { token } = useAuth();
  const router = useRouter();
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
        setError(e instanceof Error ? e.message : "Failed to load workers");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const rows = useMemo(() => {
    return workers
      .filter((w) => Boolean(w.visa_expiry))
      .map((w) => ({
        ...w,
        visa_expiry: w.visa_expiry as string,
        days_left: daysLeft(w.visa_expiry as string),
      }))
      .sort((a, b) => new Date(a.visa_expiry).getTime() - new Date(b.visa_expiry).getTime());
  }, [workers]);

  const expiredCount = rows.filter((w) => w.days_left <= 0).length;
  const exp30 = rows.filter((w) => w.days_left > 0 && w.days_left <= 30).length;
  const exp60 = rows.filter((w) => w.days_left > 30 && w.days_left <= 60).length;
  const exp90 = rows.filter((w) => w.days_left > 60 && w.days_left <= 90).length;

  if (loading) return <p className="text-sm text-gray-500">Loading visa expiries...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Visa Expiry</h1>
          <p className="text-sm text-gray-500" style={{ marginTop: 6 }}>
            Employees ordered by nearest visa expiry date
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 border border-red-200" style={{ padding: "7px 12px", fontSize: 12, gap: 6 }}>
          <AlertTriangle style={{ width: 13, height: 13 }} />
          {expiredCount} expired
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10 }}>
        <div className="rounded-2xl border border-red-200 bg-red-50" style={{ padding: "12px 14px" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600">Expired</p>
          <p className="text-2xl font-extrabold text-red-700" style={{ marginTop: 2 }}>{expiredCount}</p>
        </div>
        <div className="rounded-2xl border border-orange-200 bg-orange-50" style={{ padding: "12px 14px" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-600">0-30 Days</p>
          <p className="text-2xl font-extrabold text-orange-700" style={{ marginTop: 2 }}>{exp30}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50" style={{ padding: "12px 14px" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">31-60 Days</p>
          <p className="text-2xl font-extrabold text-amber-700" style={{ marginTop: 2 }}>{exp60}</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50" style={{ padding: "12px 14px" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-600">61-90 Days</p>
          <p className="text-2xl font-extrabold text-sky-700" style={{ marginTop: 2 }}>{exp90}</p>
        </div>
      </div>

      <div className="data-card" style={{ padding: 14 }}>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-600">No workers have visa expiry data.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-slate-100 to-slate-50">
                <tr className="text-left border-b border-slate-200">
                  <th className="py-4 px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Employee</th>
                  <th className="py-4 px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Department</th>
                  <th className="py-4 px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Visa Expiry</th>
                  <th className="py-4 px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Days Left</th>
                  <th className="py-4 px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Risk Band</th>
                  <th className="py-4 px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((w, idx) => {
                  const tone = visaTone(w.days_left);
                  const stripe = tone.dot;

                  return (
                    <tr
                      key={w.id}
                      className="transition-colors hover:bg-slate-50/80"
                      style={{
                        borderBottom: idx < rows.length - 1 ? "1px solid #eef2f7" : "none",
                        boxShadow: `inset 4px 0 0 ${stripe}`,
                        background: idx % 2 === 0 ? "#ffffff" : "#fcfdff",
                      }}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="inline-flex items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
                            style={{ width: 30, height: 30, background: `linear-gradient(135deg, ${stripe}, ${stripe}aa)` }}
                          >
                            {w.name.charAt(0)}
                          </span>
                          <div>
                            <p className="font-semibold text-gray-900 text-[14px] leading-tight">{w.name}</p>
                            <p className="text-[11px] text-gray-400 leading-tight" style={{ marginTop: 2 }}>{w.status.replaceAll("_", " ")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1">
                          {w.department || "Unassigned"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-700 font-medium text-[13px]">
                        {new Date(w.visa_expiry).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${tone.badge}`}>
                          {w.days_left <= 0 ? "Expired" : `${w.days_left} days`}
                        </span>
                      </td>
                      <td className="py-4 px-4 capitalize">
                        <span
                          className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
                          style={{ borderColor: `${tone.dot}44`, color: tone.dot, background: `${tone.dot}14`, gap: 6 }}
                        >
                          <span className="rounded-full" style={{ width: 8, height: 8, background: tone.dot }} />
                          <span>{tone.label}</span>
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => router.push(`/workers/${w.id}`)}
                          className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
                          style={{ gap: 6, padding: "7px 13px", fontSize: 12, fontWeight: 600 }}
                        >
                          <Eye style={{ width: 13, height: 13 }} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

