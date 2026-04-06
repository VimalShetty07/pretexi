"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import {
  CalendarDays,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Ban,
  CalendarClock,
} from "lucide-react";
import "../../dashboard/dashboard-marketing.css";
import "../../workers/workers-page.css";

interface LeaveItem {
  id: string;
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

const LEAVE_TYPES = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "paternity", label: "Paternity Leave" },
  { value: "compassionate", label: "Compassionate Leave" },
  { value: "other", label: "Other" },
];

const STATUS_META: Record<
  string,
  { label: string; cls: string; icon: typeof Clock }
> = {
  pending: {
    label: "Pending",
    cls: "border-[rgba(217,119,6,0.35)] bg-[rgba(255,251,235,0.9)] text-[#b45309]",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    cls: "border-[rgba(22,163,74,0.35)] bg-[#f0fdf4] text-[#166534]",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    cls: "border-[rgba(220,38,38,0.35)] bg-[rgba(254,242,242,0.85)] text-[#991b1b]",
    icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    cls: "border-[rgba(0,0,0,0.12)] bg-[#f8fafc] text-[#64748b]",
    icon: Ban,
  },
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function typeLabel(val: string): string {
  return LEAVE_TYPES.find((t) => t.value === val)?.label ?? val;
}

const API_URL = "/api";

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

export default function PortalLeavePage() {
  const { token } = useAuth();
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [leaveType, setLeaveType] = useState("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");

  const fetchLeaves = useCallback(async () => {
    if (!token) return;
    try {
      setLoadError("");
      const data = await api.get<LeaveItem[]>("/leave/my", token);
      setLeaves(data);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchLeaves();
  }, [token, fetchLeaves]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!startDate || !endDate) {
      setFormError("Please select both start and end dates.");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setFormError("End date must be on or after start date.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(
        "/leave",
        { leave_type: leaveType, start_date: startDate, end_date: endDate, reason: reason || null },
        token ?? undefined
      );
      setShowForm(false);
      setLeaveType("annual");
      setStartDate("");
      setEndDate("");
      setReason("");
      await fetchLeaves();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to apply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!token) return;
    setCancellingId(id);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      await fetch(`${API_URL}/leave/${id}/cancel`, { method: "POST", headers });
      await fetchLeaves();
    } catch {
      /* ignore */
    } finally {
      setCancellingId(null);
    }
  };

  const todayStr = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    []
  );

  const counts = useMemo(() => {
    return {
      pending: leaves.filter((l) => l.status === "pending").length,
      approved: leaves.filter((l) => l.status === "approved").length,
      rejected: leaves.filter((l) => l.status === "rejected").length,
      cancelled: leaves.filter((l) => l.status === "cancelled").length,
    };
  }, [leaves]);

  if (!token) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Sign in to manage leave.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Loading your leave…
        </p>
      </div>
    );
  }

  return (
    <div className="protexi-dash-marketing flex flex-col gap-0">
      {loadError && (
        <div className="mb-3 border border-red-200 bg-red-50 text-red-700" style={{ padding: "10px 12px", fontSize: 12, ...MONO }}>
          {loadError}
        </div>
      )}

      <div className="adm-ph adm-ph-portal">
        <div className="min-w-0">
          <div className="adm-ph-ey">Employee portal</div>
          <h1 className="adm-ph-title">
            My <em className="dash-title-em">leave</em>
          </h1>
          <div className="adm-ph-date">{todayStr}</div>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#64748b]">
            Apply for time off and track your requests.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex h-9 shrink-0 items-center gap-2 border border-[rgba(0,0,0,0.12)] bg-[#0f2d5e] px-4 text-[9px] font-bold uppercase tracking-[0.07em] text-white hover:bg-[#1a4fa0]"
          style={MONO}
        >
          <Plus className="h-3.5 w-3.5" />
          Apply for leave
        </button>
      </div>

      <div className="adm-stat-row grid grid-cols-2 md:grid-cols-4" style={{ gap: 2, background: "rgba(0,0,0,0.07)", marginBottom: 16 }}>
        <div className="adm-sc adm-sc-a bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-a">
              <Clock className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Queue</span>
          </div>
          <div className="adm-sc-num">{counts.pending}</div>
          <div className="adm-sc-lbl">Pending</div>
          <div className="adm-sc-sub">Awaiting HR</div>
        </div>
        <div className="adm-sc adm-sc-p bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-p">
              <CheckCircle2 className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">OK</span>
          </div>
          <div className="adm-sc-num">{counts.approved}</div>
          <div className="adm-sc-lbl">Approved</div>
          <div className="adm-sc-sub">Authorised</div>
        </div>
        <div className="adm-sc adm-sc-r bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-r">
              <XCircle className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">No</span>
          </div>
          <div className="adm-sc-num">{counts.rejected}</div>
          <div className="adm-sc-lbl">Rejected</div>
          <div className="adm-sc-sub">Not authorised</div>
        </div>
        <div className="adm-sc adm-sc-b bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b">
              <Ban className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Void</span>
          </div>
          <div className="adm-sc-num">{counts.cancelled}</div>
          <div className="adm-sc-lbl">Cancelled</div>
          <div className="adm-sc-sub">Withdrawn</div>
        </div>
      </div>

      <div className="wem-surface">
        <div className="wem-toolbar">
          <span className="flex items-center gap-2 text-[11px] font-extrabold text-[#0a0a0a]">
            <CalendarClock className="h-4 w-4 text-[var(--dash-blue)]" />
            Your requests
          </span>
          <span className="wem-badge-mono" style={MONO}>
            {leaves.length} total
          </span>
        </div>

        <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
          {leaves.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14">
              <div className="adm-ae-icon">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="adm-ae-t mt-3">No leave requests yet</div>
              <div className="adm-ae-s">Use “Apply for leave” to submit your first request.</div>
            </div>
          ) : (
            <div className="grid gap-2">
              {leaves.map((l) => {
                const meta = STATUS_META[l.status] ?? STATUS_META.pending;
                const Icon = meta.icon;
                return (
                  <div
                    key={l.id}
                    className="flex flex-col gap-3 border border-[rgba(0,0,0,0.08)] bg-[#f8fafc] p-3 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-bold text-[#0a0a0a]">{typeLabel(l.leave_type)}</span>
                        <span
                          className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] ${meta.cls}`}
                          style={MONO}
                        >
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px] text-[#0f2d5e]">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#94a3b8]" />
                        <span>
                          {fmt(l.start_date)} — {fmt(l.end_date)}
                        </span>
                        <span className="text-[11px] text-[#94a3b8]" style={MONO}>
                          ({l.days} day{l.days !== 1 ? "s" : ""})
                        </span>
                      </div>
                      {l.reason && (
                        <p className="mt-2 text-[12px] text-[#64748b]" style={MONO}>
                          Reason: {l.reason}
                        </p>
                      )}
                      {l.status === "rejected" && l.rejection_reason && (
                        <div className="mt-2 border border-[rgba(220,38,38,0.35)] bg-[rgba(254,242,242,0.85)] px-3 py-2 text-[12px] text-[#991b1b]">
                          <strong style={MONO}>Rejected by {l.reviewed_by}:</strong> {l.rejection_reason}
                        </div>
                      )}
                      {l.status === "approved" && l.reviewed_by && (
                        <p className="mt-2 text-[11px] text-[#166534]" style={MONO}>
                          Approved by {l.reviewed_by}
                          {l.reviewed_at ? ` on ${fmt(l.reviewed_at)}` : ""}
                        </p>
                      )}
                    </div>
                    {l.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => handleCancel(l.id)}
                        disabled={cancellingId === l.id}
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[9px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[#f8fafc] disabled:opacity-50"
                        style={MONO}
                      >
                        {cancellingId === l.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                        Cancel
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}
        >
          <div
            className="w-full max-w-md border border-[rgba(0,0,0,0.1)] bg-white p-5 shadow-lg"
            role="dialog"
            aria-labelledby="portal-leave-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h2 id="portal-leave-title" className="text-base font-extrabold tracking-tight text-[#0a0a0a]">
                Apply for leave
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center border border-[rgba(0,0,0,0.08)] text-[#64748b] hover:bg-[#f8fafc]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-[11px] text-[#64748b]" style={MONO}>
              HR will review your request.
            </p>

            {formError && (
              <div className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800" style={MONO}>
                {formError}
              </div>
            )}

            <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
              <label className="grid gap-1">
                <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={MONO}>
                  Leave type
                </span>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="h-9 w-full border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[13px] text-[#0a0a0a] outline-none focus:border-[var(--dash-blue)]"
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={MONO}>
                    Start date
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="h-9 w-full border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[13px] outline-none focus:border-[var(--dash-blue)]"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={MONO}>
                    End date
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="h-9 w-full border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[13px] outline-none focus:border-[var(--dash-blue)]"
                  />
                </label>
              </div>

              <label className="grid gap-1">
                <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={MONO}>
                  Reason <span className="font-normal normal-case text-[#94a3b8]">(optional)</span>
                </span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe the reason for your leave..."
                  rows={3}
                  className="min-h-[72px] w-full resize-y border border-[rgba(0,0,0,0.12)] bg-white p-3 text-[13px] text-[#0a0a0a] outline-none focus:border-[var(--dash-blue)]"
                />
              </label>

              <div className="mt-1 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="h-9 border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[9px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[#f8fafc]"
                  style={MONO}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-9 items-center gap-2 border border-[rgba(0,0,0,0.12)] bg-[#0f2d5e] px-4 text-[9px] font-bold uppercase tracking-[0.07em] text-white hover:bg-[#1a4fa0] disabled:opacity-50"
                  style={MONO}
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {submitting ? "Submitting…" : "Submit request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
