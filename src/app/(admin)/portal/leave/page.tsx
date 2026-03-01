"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";

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

function typeLabel(val: string): string {
  return LEAVE_TYPES.find((t) => t.value === val)?.label ?? val;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pretexi-backend.onrender.com/api";

export default function PortalLeavePage() {
  const { token } = useAuth();
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [leaveType, setLeaveType] = useState("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");

  const fetchLeaves = useCallback(async () => {
    try {
      const data = await api.get<LeaveItem[]>("/leave/my", token ?? undefined);
      setLeaves(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 80 }}>
        <Loader2 className="animate-spin text-brand-500" style={{ width: 24, height: 24 }} />
      </div>
    );
  }

  const pending = leaves.filter((l) => l.status === "pending").length;
  const approved = leaves.filter((l) => l.status === "approved").length;
  const rejected = leaves.filter((l) => l.status === "rejected").length;

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap" style={{ gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="text-2xl font-bold text-brand-900 tracking-tight">My Leave</h1>
          <p className="text-sm text-[var(--muted-foreground)]" style={{ marginTop: 4 }}>
            Apply for leave and track your requests.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center rounded-xl bg-brand-600 text-sm font-medium text-white hover:bg-brand-700 transition-colors cursor-pointer"
          style={{ height: 40, padding: "0 18px", gap: 8 }}
        >
          <Plus style={{ width: 15, height: 15 }} />
          Apply for Leave
        </button>
      </div>

      {/* Summary */}
      <div
        className="grid grid-cols-3 bg-white rounded-xl border border-[var(--border)]"
        style={{ padding: 16, marginBottom: 20, gap: 12 }}
      >
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-600">{pending}</div>
          <div className="text-xs text-[var(--muted-foreground)]">Pending</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600">{approved}</div>
          <div className="text-xs text-[var(--muted-foreground)]">Approved</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{rejected}</div>
          <div className="text-xs text-[var(--muted-foreground)]">Rejected</div>
        </div>
      </div>

      {/* Leave List */}
      {leaves.length === 0 ? (
        <div className="text-center bg-white rounded-xl border border-[var(--border)]" style={{ padding: 40 }}>
          <CalendarDays className="mx-auto text-[var(--muted-foreground)]" style={{ width: 32, height: 32, marginBottom: 8 }} />
          <p className="text-sm text-[var(--muted-foreground)]">No leave requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaves.map((l) => {
            const cfg = STATUS_CONFIG[l.status] ?? STATUS_CONFIG.pending;
            return (
              <div
                key={l.id}
                className="bg-white rounded-xl border border-[var(--border)]"
                style={{ padding: "16px 20px" }}
              >
                <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap" style={{ gap: 8, marginBottom: 6 }}>
                      <span className="text-sm font-semibold text-brand-900">
                        {typeLabel(l.leave_type)}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full text-xs font-medium ${cfg.color} ${cfg.bg}`}
                        style={{ padding: "2px 10px", gap: 4 }}
                      >
                        <cfg.icon style={{ width: 12, height: 12 }} />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-brand-800" style={{ gap: 6, marginBottom: 4 }}>
                      <CalendarDays style={{ width: 14, height: 14 }} className="text-[var(--muted-foreground)]" />
                      {fmt(l.start_date)} — {fmt(l.end_date)}
                      <span className="text-xs text-[var(--muted-foreground)]">({l.days} day{l.days !== 1 ? "s" : ""})</span>
                    </div>
                    {l.reason && (
                      <p className="text-xs text-[var(--muted-foreground)]" style={{ marginTop: 4 }}>
                        Reason: {l.reason}
                      </p>
                    )}
                    {l.status === "rejected" && l.rejection_reason && (
                      <div
                        className="rounded-lg bg-red-50 border border-red-200 text-red-800"
                        style={{ padding: "8px 12px", fontSize: 12, marginTop: 8 }}
                      >
                        Rejected by {l.reviewed_by}: {l.rejection_reason}
                      </div>
                    )}
                    {l.status === "approved" && l.reviewed_by && (
                      <p className="text-xs text-emerald-600" style={{ marginTop: 4 }}>
                        Approved by {l.reviewed_by} on {fmt(l.reviewed_at)}
                      </p>
                    )}
                  </div>
                  {l.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => handleCancel(l.id)}
                      disabled={cancellingId === l.id}
                      className="inline-flex items-center rounded-lg border border-[var(--border)] bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer"
                      style={{ height: 30, padding: "0 10px", gap: 5 }}
                    >
                      {cancellingId === l.id ? (
                        <Loader2 className="animate-spin" style={{ width: 12, height: 12 }} />
                      ) : (
                        <X style={{ width: 12, height: 12 }} />
                      )}
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Apply Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div
            className="bg-white rounded-2xl border border-[var(--border)] shadow-xl w-full"
            style={{ maxWidth: 480, padding: "28px 32px" }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
              <h2 className="text-lg font-bold text-brand-900">Apply for Leave</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex items-center justify-center rounded-lg hover:bg-brand-50 transition-colors cursor-pointer"
                style={{ width: 32, height: 32 }}
              >
                <X className="text-[var(--muted-foreground)]" style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {formError && (
              <div
                className="rounded-xl bg-red-50 border border-red-200 text-red-800"
                style={{ padding: "10px 14px", fontSize: 13, marginBottom: 16 }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="block text-sm font-medium text-brand-800" style={{ marginBottom: 6 }}>
                  Leave Type
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-white text-sm text-brand-900 outline-none focus:border-brand-400 cursor-pointer"
                  style={{ height: 40, padding: "0 14px" }}
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2" style={{ gap: 12 }}>
                <div>
                  <label className="block text-sm font-medium text-brand-800" style={{ marginBottom: 6 }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[var(--border)] bg-white text-sm text-brand-900 outline-none focus:border-brand-400"
                    style={{ height: 40, padding: "0 14px" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-800" style={{ marginBottom: 6 }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[var(--border)] bg-white text-sm text-brand-900 outline-none focus:border-brand-400"
                    style={{ height: 40, padding: "0 14px" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-800" style={{ marginBottom: 6 }}>
                  Reason <span className="text-[var(--muted-foreground)] font-normal">(optional)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe the reason for your leave..."
                  rows={3}
                  className="w-full rounded-xl border border-[var(--border)] bg-white text-sm text-brand-900 outline-none focus:border-brand-400 resize-none"
                  style={{ padding: "10px 14px" }}
                />
              </div>

              <div className="flex items-center justify-end" style={{ gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-[var(--border)] bg-white text-sm font-medium text-brand-800 hover:bg-brand-50 transition-colors cursor-pointer"
                  style={{ height: 40, padding: "0 18px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center rounded-xl bg-brand-600 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors cursor-pointer"
                  style={{ height: 40, padding: "0 20px", gap: 8 }}
                >
                  {submitting && <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />}
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
