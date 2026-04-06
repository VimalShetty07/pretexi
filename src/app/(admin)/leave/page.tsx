"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import "../dashboard/dashboard-marketing.css";
import "../workers/workers-page.css";

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

const STATUS_CONFIG: Record<string, { label: string; toneCls: string; icon: typeof Clock }> = {
  pending: {
    label: "Pending",
    toneCls: "border-[rgba(217,119,6,0.35)] bg-[rgba(255,251,235,0.9)] text-[#b45309]",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    toneCls: "border-[rgba(22,163,74,0.3)] bg-[#f0fdf4] text-[#166534]",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    toneCls: "border-[rgba(220,38,38,0.35)] bg-[rgba(254,242,242,0.85)] text-[#991b1b]",
    icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    toneCls: "border-[rgba(0,0,0,0.12)] bg-[#f8fafc] text-[#64748b]",
    icon: Ban,
  },
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const API_URL = "/api";

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

export default function LeaveManagementPage() {
  const { token } = useAuth();
  const [allLeaves, setAllLeaves] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<LeaveItem[]>(`/leave/all`, token ?? undefined);
      setAllLeaves(data);
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const leaves = useMemo(() => {
    if (!statusFilter) return allLeaves;
    return allLeaves.filter((l) => l.status === statusFilter);
  }, [allLeaves, statusFilter]);

  const counts = useMemo(() => {
    return {
      pending: allLeaves.filter((l) => l.status === "pending").length,
      approved: allLeaves.filter((l) => l.status === "approved").length,
      rejected: allLeaves.filter((l) => l.status === "rejected").length,
      cancelled: allLeaves.filter((l) => l.status === "cancelled").length,
      total: allLeaves.length,
    };
  }, [allLeaves]);

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = {};
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_URL}/leave/${id}/approve`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Approve failed (${res.status})`);
      }
      await fetchLeaves();
      setSuccess("Leave request approved.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_URL}/leave/${id}/reject`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ rejection_reason: rejectReason || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Reject failed (${res.status})`);
      }
      setRejectId(null);
      setRejectReason("");
      await fetchLeaves();
      setSuccess("Leave request rejected.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setActionLoading(null);
    }
  };

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const filterKeys = ["", "pending", "approved", "rejected", "cancelled"] as const;

  if (loading && allLeaves.length === 0 && !error) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Loading leave requests…
        </p>
      </div>
    );
  }

  if (error && allLeaves.length === 0) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#dc2626]" style={MONO}>
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="protexi-dash-marketing flex flex-col gap-0">
      {error && (
        <div
          className="mb-3 border border-red-200 bg-red-50 text-red-700"
          style={{ padding: "10px 12px", fontSize: 12, ...MONO }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="mb-3 border border-emerald-200 bg-emerald-50 text-emerald-700"
          style={{ padding: "10px 12px", fontSize: 12, ...MONO }}
        >
          {success}
        </div>
      )}

      <div className="adm-ph">
        <div className="min-w-0">
          <div className="adm-ph-ey">Workforce</div>
          <h1 className="adm-ph-title">
            Leave <em className="dash-title-em">management</em>
          </h1>
          <div className="adm-ph-date">{today}</div>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#64748b]">
            Review and approve employee leave. Filter by status or jump to pending from the summary tiles.
          </p>
        </div>
        {counts.pending > 0 ? (
          <div className="adm-ph-badge adm-ph-badge-warn inline-flex items-center gap-2 border-amber-200 bg-amber-50 text-amber-800">
            <Clock className="h-3.5 w-3.5" />
            {counts.pending} pending review
          </div>
        ) : (
          <div
            className="inline-flex items-center border border-[rgba(22,163,74,0.3)] bg-[#f0fdf4] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#166534]"
            style={MONO}
          >
            No pending requests
          </div>
        )}
      </div>

      <div className="adm-stat-row grid grid-cols-2 md:grid-cols-4" style={{ gap: 2, background: "rgba(0,0,0,0.07)", marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setStatusFilter("pending")}
          className={`adm-sc adm-sc-a bg-white px-4 py-4 text-left transition-colors ${statusFilter === "pending" ? "ring-2 ring-[var(--dash-blue)] ring-offset-2" : ""}`}
        >
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-a">
              <Clock className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Queue</span>
          </div>
          <div className="adm-sc-num">{counts.pending}</div>
          <div className="adm-sc-lbl">Pending</div>
          <div className="adm-sc-sub">Awaiting decision</div>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("approved")}
          className={`adm-sc adm-sc-b bg-white px-4 py-4 text-left transition-colors ${statusFilter === "approved" ? "ring-2 ring-[var(--dash-blue)] ring-offset-2" : ""}`}
        >
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b">
              <CheckCircle2 className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">OK</span>
          </div>
          <div className="adm-sc-num">{counts.approved}</div>
          <div className="adm-sc-lbl">Approved</div>
          <div className="adm-sc-sub">Booked leave</div>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("rejected")}
          className={`adm-sc adm-sc-r bg-white px-4 py-4 text-left transition-colors ${statusFilter === "rejected" ? "ring-2 ring-[var(--dash-blue)] ring-offset-2" : ""}`}
        >
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-r">
              <XCircle className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Declined</span>
          </div>
          <div className="adm-sc-num">{counts.rejected}</div>
          <div className="adm-sc-lbl">Rejected</div>
          <div className="adm-sc-sub">Not authorised</div>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("cancelled")}
          className={`adm-sc adm-sc-p bg-white px-4 py-4 text-left transition-colors ${statusFilter === "cancelled" ? "ring-2 ring-[var(--dash-blue)] ring-offset-2" : ""}`}
        >
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-p">
              <Ban className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Void</span>
          </div>
          <div className="adm-sc-num">{counts.cancelled}</div>
          <div className="adm-sc-lbl">Cancelled</div>
          <div className="adm-sc-sub">Withdrawn by employee</div>
        </button>
      </div>

      <div className="wem-surface">
        <div className="wem-toolbar">
          <span className="wem-badge-mono" style={MONO}>
            {statusFilter === "" ? `${counts.total} requests` : `${leaves.length} shown · ${counts.total} total`}
          </span>
          <div className="wlp-filter-group flex-wrap">
            {filterKeys.map((val) => {
              const active = statusFilter === val;
              const label = val === "" ? "All" : (STATUS_CONFIG[val]?.label ?? val);
              return (
                <button
                  key={val || "all"}
                  type="button"
                  onClick={() => setStatusFilter(val)}
                  className={`wlp-filter-chip ${active ? "act" : ""}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center bg-white py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#94a3b8]" />
            <p className="mt-3 text-[12px] text-[#94a3b8]" style={MONO}>
              Refreshing…
            </p>
          </div>
        ) : leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-white py-16">
            <div className="adm-ae-icon">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="adm-ae-t mt-3">No leave requests</div>
            <div className="adm-ae-s">
              {statusFilter ? `No ${STATUS_CONFIG[statusFilter]?.label.toLowerCase() ?? statusFilter} requests in this view.` : "No leave requests on record yet."}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white">
            <table className="wlp-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => {
                  const cfg = STATUS_CONFIG[l.status] ?? STATUS_CONFIG.pending;
                  const isLoading = actionLoading === l.id;
                  const initials = l.worker_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <tr key={l.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[rgba(0,0,0,0.08)] bg-[rgba(26,79,160,0.08)] text-[11px] font-extrabold text-[#1a4fa0]">
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#0a0a0a]">{l.worker_name}</p>
                            <p className="truncate text-[11px] uppercase tracking-[0.05em] text-[#94a3b8]" style={MONO}>
                              {l.worker_job_title}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="text-[#0f2d5e]">{LEAVE_TYPE_LABELS[l.leave_type] ?? l.leave_type}</td>
                      <td>
                        <div className="text-[#0a0a0a]">{fmt(l.start_date)}</div>
                        <div className="text-[11px] text-[#94a3b8]" style={MONO}>
                          to {fmt(l.end_date)}
                        </div>
                      </td>
                      <td className="font-semibold text-[#0f2d5e]">{l.days}</td>
                      <td>
                        <p className="max-w-[180px] truncate text-[#0a0a0a]" title={l.reason ?? ""}>
                          {l.reason || "—"}
                        </p>
                        {l.rejection_reason && (
                          <p
                            className="mt-1 max-w-[180px] truncate text-[11px] text-[#991b1b]"
                            title={l.rejection_reason}
                          >
                            Rejected: {l.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] ${cfg.toneCls}`}
                          style={MONO}
                        >
                          <cfg.icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                        {l.reviewed_by && (
                          <p className="mt-1 text-[10px] text-[#94a3b8]" style={MONO}>
                            by {l.reviewed_by}
                          </p>
                        )}
                      </td>
                      <td>
                        {l.status === "pending" && (
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleApprove(l.id)}
                                disabled={isLoading}
                                className="inline-flex h-8 items-center gap-1.5 border border-[rgba(22,163,74,0.35)] bg-[#f0fdf4] px-3 text-[9px] font-bold uppercase tracking-[0.07em] text-[#166534] hover:bg-[rgba(22,163,74,0.12)] disabled:opacity-50"
                                style={MONO}
                              >
                                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectId(rejectId === l.id ? null : l.id)}
                                disabled={isLoading}
                                className="inline-flex h-8 items-center gap-1.5 border border-[rgba(220,38,38,0.35)] bg-[rgba(254,242,242,0.85)] px-3 text-[9px] font-bold uppercase tracking-[0.07em] text-[#991b1b] hover:bg-[rgba(254,242,242,1)] disabled:opacity-50"
                                style={MONO}
                              >
                                <XCircle className="h-3 w-3" />
                                Reject
                              </button>
                            </div>
                            {rejectId === l.id && (
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="text"
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  placeholder="Reason…"
                                  className="h-8 min-w-[140px] flex-1 border border-[rgba(0,0,0,0.12)] bg-white px-2 text-[11px] outline-none focus:border-[var(--dash-blue)]"
                                  style={MONO}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleReject(l.id)}
                                  className="inline-flex h-8 items-center border border-[rgba(0,0,0,0.12)] bg-[#0f2d5e] px-3 text-[9px] font-bold uppercase tracking-[0.07em] text-white hover:bg-[#1a4fa0]"
                                  style={MONO}
                                >
                                  Confirm
                                </button>
                              </div>
                            )}
                          </div>
                        )}
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
