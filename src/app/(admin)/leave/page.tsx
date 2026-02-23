"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Ban,
} from "lucide-react";

interface LeaveItem {
  id: string;
  worker_id: string;
  worker_name: string;
  worker_department: string | null;
  worker_job_title: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: "Annual",
  sick: "Sick",
  unpaid: "Unpaid",
  maternity: "Maternity",
  paternity: "Paternity",
  compassionate: "Compassionate",
  other: "Other",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "text-amber-700", bg: "bg-amber-50", icon: Clock },
  approved: { label: "Approved", color: "text-emerald-700", bg: "bg-emerald-50", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "text-red-700", bg: "bg-red-50", icon: XCircle },
  cancelled: { label: "Cancelled", color: "text-gray-600", bg: "bg-gray-100", icon: Ban },
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function LeaveManagementPage() {
  const { token } = useAuth();
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const qs = statusFilter ? `?status_filter=${statusFilter}` : "";
      const data = await api.get<LeaveItem[]>(`/leave/all${qs}`, token ?? undefined);
      setLeaves(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = {};
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch(`${API_URL}/leave/${id}/approve`, {
        method: "POST",
        headers: authHeaders(),
      });
      await fetchLeaves();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch(`${API_URL}/leave/${id}/reject`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ rejection_reason: rejectReason || null }),
      });
      setRejectId(null);
      setRejectReason("");
      await fetchLeaves();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  };

  const pending = leaves.filter((l) => l.status === "pending").length;

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap" style={{ gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="text-2xl font-bold text-brand-900 tracking-tight">Leave Management</h1>
          <p className="text-sm text-[var(--muted-foreground)]" style={{ marginTop: 4 }}>
            Review and manage employee leave requests.
          </p>
        </div>
        {pending > 0 && statusFilter !== "pending" && (
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className="inline-flex items-center rounded-xl bg-amber-50 border border-amber-200 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
            style={{ height: 36, padding: "0 14px", gap: 6 }}
          >
            <Clock style={{ width: 14, height: 14 }} />
            {pending} pending
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center" style={{ gap: 8, marginBottom: 20 }}>
        {["", "pending", "approved", "rejected", "cancelled"].map((val) => {
          const active = statusFilter === val;
          const label = val === "" ? "All" : (STATUS_CONFIG[val]?.label ?? val);
          return (
            <button
              key={val}
              type="button"
              onClick={() => setStatusFilter(val)}
              className={`rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                active
                  ? "bg-brand-600 text-white"
                  : "bg-white border border-[var(--border)] text-brand-800 hover:bg-brand-50"
              }`}
              style={{ height: 32, padding: "0 14px" }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 13 }}>
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                {["Employee", "Type", "Dates", "Days", "Reason", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="text-left font-semibold text-[var(--muted-foreground)] uppercase"
                    style={{ padding: "12px 16px", fontSize: 11, letterSpacing: "0.05em" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center text-[var(--muted-foreground)]" style={{ padding: 40 }}>
                    <Loader2 className="animate-spin mx-auto" style={{ width: 20, height: 20 }} />
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center" style={{ padding: 40 }}>
                    <CalendarDays className="mx-auto text-[var(--muted-foreground)]" style={{ width: 32, height: 32, marginBottom: 8 }} />
                    <p className="text-sm text-[var(--muted-foreground)]">No leave requests found.</p>
                  </td>
                </tr>
              ) : (
                leaves.map((l) => {
                  const cfg = STATUS_CONFIG[l.status] ?? STATUS_CONFIG.pending;
                  const isLoading = actionLoading === l.id;
                  return (
                    <tr
                      key={l.id}
                      className="border-b border-[var(--border)] last:border-b-0 hover:bg-brand-50/50 transition-colors"
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <div className="flex items-center" style={{ gap: 10 }}>
                          <div
                            className="flex items-center justify-center rounded-full bg-brand-100 text-brand-600 font-bold shrink-0"
                            style={{ width: 34, height: 34, fontSize: 11 }}
                          >
                            {l.worker_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-brand-900 truncate" style={{ fontSize: 13 }}>
                              {l.worker_name}
                            </p>
                            <p className="text-[var(--muted-foreground)] truncate" style={{ fontSize: 11 }}>
                              {l.worker_job_title}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="text-brand-800" style={{ padding: "14px 16px" }}>
                        {LEAVE_TYPE_LABELS[l.leave_type] ?? l.leave_type}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div className="text-brand-800" style={{ fontSize: 13 }}>
                          {fmt(l.start_date)}
                        </div>
                        <div className="text-[var(--muted-foreground)]" style={{ fontSize: 11 }}>
                          to {fmt(l.end_date)}
                        </div>
                      </td>

                      <td className="text-brand-800 font-medium" style={{ padding: "14px 16px" }}>
                        {l.days}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <p className="text-brand-800 truncate" style={{ maxWidth: 180 }} title={l.reason ?? ""}>
                          {l.reason || "—"}
                        </p>
                        {l.rejection_reason && (
                          <p className="text-red-600 truncate" style={{ fontSize: 11, maxWidth: 180, marginTop: 2 }} title={l.rejection_reason}>
                            Rejected: {l.rejection_reason}
                          </p>
                        )}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <span
                          className={`inline-flex items-center rounded-full font-medium ${cfg.color} ${cfg.bg}`}
                          style={{ padding: "3px 10px", gap: 4, fontSize: 12 }}
                        >
                          <cfg.icon style={{ width: 12, height: 12 }} />
                          {cfg.label}
                        </span>
                        {l.reviewed_by && (
                          <p className="text-[var(--muted-foreground)]" style={{ fontSize: 10, marginTop: 2 }}>
                            by {l.reviewed_by}
                          </p>
                        )}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        {l.status === "pending" && (
                          <div className="flex items-center" style={{ gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => handleApprove(l.id)}
                              disabled={isLoading}
                              className="inline-flex items-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                              style={{ padding: "5px 10px", gap: 4, fontSize: 12 }}
                            >
                              {isLoading ? (
                                <Loader2 className="animate-spin" style={{ width: 12, height: 12 }} />
                              ) : (
                                <CheckCircle2 style={{ width: 12, height: 12 }} />
                              )}
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectId(rejectId === l.id ? null : l.id)}
                              disabled={isLoading}
                              className="inline-flex items-center rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
                              style={{ padding: "5px 10px", gap: 4, fontSize: 12 }}
                            >
                              <XCircle style={{ width: 12, height: 12 }} />
                              Reject
                            </button>
                          </div>
                        )}

                        {rejectId === l.id && (
                          <div className="flex" style={{ gap: 6, marginTop: 8 }}>
                            <input
                              type="text"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Reason..."
                              className="flex-1 rounded-lg border border-[var(--border)] bg-white text-sm outline-none focus:border-brand-400"
                              style={{ height: 32, padding: "0 10px", fontSize: 12 }}
                            />
                            <button
                              type="button"
                              onClick={() => handleReject(l.id)}
                              className="rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                              style={{ padding: "0 12px", fontSize: 12, height: 32 }}
                            >
                              Confirm
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
