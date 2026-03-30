"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./dashboard-marketing.css";
import {
  Users,
  UserCheck,
  CalendarClock,
  FileWarning,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  UserPlus,
  CreditCard,
  CalendarRange,
  FileUp,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import {
  DEFAULT_DASHBOARD_FEATURES,
  orderDashboardFeatures,
  type DashboardFeatureKey,
} from "@/lib/dashboard-features";
import { VisaStatusBreakdownBarChart, VisaDoughnutChart } from "@/components/dashboard-charts";

interface DashboardOverview {
  total_employees: number;
  active_employees: number;
  sponsored: number;
  non_sponsored: number;
  pending_leaves: number;
  cos_allocated: number;
  cos_used: number;
  cos_available: number;
  cos_forecasted_required: number;
  cos_projected_required: number;
  cos_forecasted_demand: number;
  cos_projected_demand: number;
  visa_breakdown: {
    expired: number;
    expiring_30: number;
    expiring_60: number;
    expiring_90: number;
    valid: number;
    no_visa: number;
  };
  expiring_workers: Array<{
    id: string;
    name: string;
    visa_expiry: string;
    days_left: number;
    category: string;
    department?: string | null;
    job_title?: string | null;
  }>;
}

interface DashboardAdminMessage {
  id: string;
  message: string;
  created_at: string;
  created_by_user_id: string;
  created_by_name: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [chatMessages, setChatMessages] = useState<DashboardAdminMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashFeatures, setDashFeatures] = useState<DashboardFeatureKey[]>(DEFAULT_DASHBOARD_FEATURES);
  const canPostAdminChat = ["super_admin", "tenant_admin", "compliance_manager"].includes(user?.role ?? "");

  const showFeat = (key: DashboardFeatureKey) => dashFeatures.includes(key);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const [overview, chat, featResp] = await Promise.all([
          api.get<DashboardOverview>("/dashboard/overview", token),
          api.get<DashboardAdminMessage[]>("/organisation/dashboard-chat", token),
          api.get<{ features: string[] }>("/organisation/dashboard-features", token).catch(() => ({
            features: DEFAULT_DASHBOARD_FEATURES,
          })),
        ]);
        setData(overview);
        setChatMessages(chat);
        setDashFeatures(orderDashboardFeatures(featResp.features));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const sendChatMessage = async () => {
    if (!token || !canPostAdminChat) return;
    const text = chatInput.trim();
    if (!text) return;
    try {
      setSendingChat(true);
      const created = await api.post<DashboardAdminMessage>(
        "/organisation/dashboard-chat",
        { message: text },
        token
      );
      setChatMessages((prev) => [...prev, created]);
      setChatInput("");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSendingChat(false);
    }
  };

  const topAlerts = useMemo(() => data?.expiring_workers.slice(0, 6) ?? [], [data]);

  /** Attention items derived from the same `/dashboard/overview` payload (not placeholder copy). */
  const activityItems = useMemo(() => {
    if (!data) return [];
    const vb = data.visa_breakdown;
    const items: Array<{
      key: string;
      title: string;
      sub: string;
      tag: string;
      tagClass: string;
      dotClass: string;
    }> = [];
    if (data.pending_leaves > 0) {
      items.push({
        key: "leave",
        title: `${data.pending_leaves} leave request${data.pending_leaves !== 1 ? "s" : ""} awaiting review`,
        sub: "Pending approval",
        tag: "Leave",
        tagClass: "bg-amber-50 text-amber-700",
        dotClass: "adm-ad-a",
      });
    }
    if (vb.expired > 0) {
      items.push({
        key: "expired",
        title: `${vb.expired} expired visa${vb.expired !== 1 ? "s" : ""} on record`,
        sub: "Requires immediate attention",
        tag: "Urgent",
        tagClass: "bg-red-50 text-red-700",
        dotClass: "adm-ad-b",
      });
    }
    if (vb.expiring_30 > 0) {
      items.push({
        key: "30d",
        title: `${vb.expiring_30} visa${vb.expiring_30 !== 1 ? "s" : ""} expiring within 30 days`,
        sub: "Renewal window closing",
        tag: "Visa",
        tagClass: "bg-blue-50 text-blue-700",
        dotClass: "adm-ad-b",
      });
    }
    if (data.non_sponsored > 0) {
      items.push({
        key: "ns",
        title: `${data.non_sponsored} worker${data.non_sponsored !== 1 ? "s" : ""} not marked sponsored`,
        sub: "Review workforce records",
        tag: "HR",
        tagClass: "bg-emerald-50 text-emerald-700",
        dotClass: "adm-ad-g",
      });
    }
    if (vb.no_visa > 0) {
      items.push({
        key: "novisa",
        title: `${vb.no_visa} worker${vb.no_visa !== 1 ? "s" : ""} with no visa on file`,
        sub: "Check records and uploads",
        tag: "Records",
        tagClass: "bg-slate-100 text-slate-700",
        dotClass: "adm-ad-a",
      });
    }
    return items.slice(0, 5);
  }, [data]);

  if (loading) {
    return (
      <div className="protexi-dash-marketing-loading" role="status" aria-live="polite">
        Loading dashboard&hellip;
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="protexi-dash-marketing-error" role="alert">
        {error || "Dashboard unavailable"}
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const expired = data.visa_breakdown.expired;
  const expiring90 =
    expired +
    data.visa_breakdown.expiring_30 +
    data.visa_breakdown.expiring_60 +
    data.visa_breakdown.expiring_90;
  const canViewCos = user?.role !== "hr_officer";

  const validVisas = data.visa_breakdown.valid;
  const expiringSoon = data.visa_breakdown.expiring_30 + data.visa_breakdown.expiring_60 + data.visa_breakdown.expiring_90;
  const compliancePct =
    data.total_employees > 0
      ? Math.min(100, Math.round((validVisas / Math.max(data.total_employees, 1)) * 100))
      : 100;

  return (
    <div className="protexi-dash-marketing flex flex-col gap-0">
      {/* Page header */}
      <div className="adm-ph">
        <div>
          <div className="adm-ph-ey">Sponsor Compliance</div>
          <h1 className="adm-ph-title">
            Compliance <em className="dash-title-em">overview</em>
          </h1>
          <div className="adm-ph-date">{today}</div>
        </div>

        <div className="dash-ph-right">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {expired > 0 ? (
              <div className="adm-ph-badge adm-ph-badge-warn inline-flex items-center gap-2 border-red-200 bg-red-50 text-red-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                {expired} visa{expired > 1 ? "s" : ""} expired — action required
              </div>
            ) : null}
          </div>

          {showFeat("admin_chat") ? (
          <div className="dash-admin-note">
            <div className="dash-admin-note-top">
              <div className="dash-admin-note-head">
                <div className="dash-admin-note-title">Admin chat</div>
                <div className="dash-admin-note-meta">Shared with dashboard users in your organisation</div>
              </div>
            </div>

            <div className="dash-admin-chat-list">
              {chatMessages.length === 0 ? (
                <div className="dash-admin-chat-empty">No messages yet.</div>
              ) : (
                chatMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`dash-admin-chat-item ${m.created_by_user_id === user?.id ? "mine" : ""}`}
                  >
                    <div className="dash-admin-chat-meta">
                      <span className="dash-admin-chat-author">{m.created_by_name}</span>
                      <span className="dash-admin-chat-time">
                        {new Date(m.created_at).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="dash-admin-chat-msg">{m.message}</div>
                  </div>
                ))
              )}
            </div>

            {canPostAdminChat && (
              <div className="dash-admin-chat-compose">
                <textarea
                  className="dash-admin-note-textarea"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message for the admin chat..."
                  maxLength={2000}
                />
                <button
                  type="button"
                  className="dash-admin-note-save"
                  onClick={sendChatMessage}
                  disabled={sendingChat || chatInput.trim().length === 0}
                >
                  {sendingChat ? "Sending..." : "Send"}
                </button>
              </div>
            )}
          </div>
          ) : null}
        </div>
      </div>

      {/* Stat cards */}
      {showFeat("stats") ? (
      <div className="adm-stat-row">
        <button type="button" className="adm-sc adm-sc-b" onClick={() => router.push("/workers")}>
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b">
              <Users className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-g">Active</span>
          </div>
          <div className="adm-sc-num">{data.total_employees}</div>
          <div className="adm-sc-lbl">Total Employees</div>
          <div className="adm-sc-sub">
            {data.active_employees} active
            {data.pending_leaves ? ` · ${data.pending_leaves} pending leave` : ""}
          </div>
        </button>
        <button type="button" className="adm-sc adm-sc-p">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-p">
              <UserCheck className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-g">
              {data.sponsored + data.non_sponsored > 0
                ? `${Math.round((data.sponsored / (data.sponsored + data.non_sponsored)) * 100)}%`
                : "—"}
            </span>
          </div>
          <div className="adm-sc-num">{data.sponsored}</div>
          <div className="adm-sc-lbl">Sponsored Workers</div>
          <div className="adm-sc-sub">{data.non_sponsored} not sponsored</div>
        </button>
        <button type="button" className="adm-sc adm-sc-a" onClick={() => router.push("/leave")}>
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-a">
              <CalendarClock className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">—</span>
          </div>
          <div className="adm-sc-num">{data.pending_leaves}</div>
          <div className="adm-sc-lbl">Pending Leaves</div>
          <div className="adm-sc-sub">Awaiting review</div>
        </button>
        <button type="button" className="adm-sc adm-sc-r" onClick={() => router.push("/workers/visa-expiry")}>
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-r">
              <FileWarning className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">—</span>
          </div>
          <div className="adm-sc-num">{expiring90}</div>
          <div className="adm-sc-lbl">Visa Expiring 90d</div>
          <div className="adm-sc-sub">{expired} already expired</div>
        </button>
      </div>
      ) : null}

      {/* CoS row */}
      {showFeat("cos") && canViewCos && (
        <div className="dash-cos-row mb-0">
          <div className="adm-card">
            <div className="adm-card-h border-b border-[#E8EEFF] pb-3">
              <div>
                <div className="adm-card-title">CoS Available</div>
                <div className="adm-card-sub">Allocated {data.cos_allocated} · Used {data.cos_used}</div>
              </div>
            </div>
            <div className="adm-card-body">
              <div className="text-4xl font-black tracking-tight text-[#0A0F1E]">{data.cos_available}</div>
            </div>
          </div>
          <div className="adm-card">
            <div className="adm-card-h border-b border-[#E8EEFF] pb-3">
              <div>
                <div className="adm-card-title">Forecasted CoS 90d</div>
                <div className="adm-card-sub">Demand: {data.cos_forecasted_demand}</div>
              </div>
            </div>
            <div className="adm-card-body">
              <div className="text-4xl font-black tracking-tight text-[#0A0F1E]">{data.cos_forecasted_required}</div>
            </div>
          </div>
          <div className="adm-card">
            <div className="adm-card-h border-b border-[#E8EEFF] pb-3">
              <div>
                <div className="adm-card-title">Projected CoS 12m</div>
                <div className="adm-card-sub">Demand: {data.cos_projected_demand}</div>
              </div>
            </div>
            <div className="adm-card-body">
              <div className="text-4xl font-black tracking-tight text-[#0A0F1E]">{data.cos_projected_required}</div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {showFeat("charts") ? (
      <div className="adm-chart-grid">
        <div className="adm-card">
          <div className="adm-card-h">
            <div>
              <div className="adm-card-title">Compliance Overview</div>
              <div className="adm-card-sub">Visa status counts from your workforce data</div>
            </div>
            <div className="adm-card-legend">
              <div className="adm-leg">
                <div className="adm-leg-dot bg-[#2563EB]" />
                Valid
              </div>
              <div className="adm-leg">
                <div className="adm-leg-dot bg-[#F97316]" />
                Expiring
              </div>
              <div className="adm-leg">
                <div className="adm-leg-dot bg-[#DC2626]" />
                Risk
              </div>
            </div>
          </div>
          <div className="adm-card-body">
            <VisaStatusBreakdownBarChart breakdown={data.visa_breakdown} />
          </div>
        </div>
        <div className="adm-card">
          <div className="adm-card-h">
            <div>
              <div className="adm-card-title">Visa Status Breakdown</div>
              <div className="adm-card-sub">Current visa distribution</div>
            </div>
          </div>
          <div className="adm-card-body">
            <VisaDoughnutChart
              valid={validVisas}
              expiring={expiringSoon}
              expired={expired}
              noVisa={data.visa_breakdown.no_visa}
            />
          </div>
        </div>
      </div>
      ) : null}

      {/* Bottom grid */}
      {(showFeat("visa_alerts") || showFeat("quick_actions") || showFeat("activity")) ? (
      <div className="adm-btm-grid">
        {/* Visa alerts */}
        {showFeat("visa_alerts") ? (
        <div className="adm-card">
          <div className="adm-card-h pb-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="adm-card-title">Visa Expiry Alerts</span>
              <span className="adm-chdr-badge adm-cb-a">{data.expiring_workers.length}</span>
            </div>
            <Link href="/workers/visa-expiry" className="adm-view-all">
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {topAlerts.length === 0 ? (
            <div className="adm-alert-empty">
              <div className="adm-ae-icon">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="adm-ae-t">All clear!</div>
              <div className="adm-ae-s">No upcoming visa expiry alerts.</div>
            </div>
          ) : (
            <div className="px-3 pb-3">
              {topAlerts.map((w, i) => {
                const urgent = w.days_left <= 0;
                const badge = urgent
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-amber-50 text-amber-800 border-amber-200";
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => router.push(`/workers/${w.id}?tab=records`)}
                    className="flex w-full items-center justify-between border-b border-[#F8FAFF] py-2.5 text-left last:border-0"
                  >
                    <div>
                      <div className="text-[13px] font-semibold text-[#1E293B]">{w.name}</div>
                      <div className="text-[11px] text-[#CBD5E1]">
                        {w.department || "—"} · {w.job_title || "—"} · {fmtDate(w.visa_expiry)}
                      </div>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge}`}>
                      {urgent ? "Expired" : `${w.days_left}d left`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="adm-comp-wrap">
            <div className="adm-comp-top">
              <span className="adm-comp-lbl">Compliance Score</span>
              <span className="adm-comp-val">{compliancePct}%</span>
            </div>
            <div className="adm-comp-track">
              <div className="adm-comp-fill" style={{ width: `${compliancePct}%` }} />
            </div>
          </div>
        </div>
        ) : null}

        {/* Quick actions */}
        {showFeat("quick_actions") ? (
        <div className="adm-card">
          <div className="adm-card-h pb-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="adm-card-title">Quick Actions</span>
              <span className="adm-chdr-badge adm-cb-b">4</span>
            </div>
          </div>
          <div className="adm-qa-wrap">
            <Link href="/workers/new" className="adm-qa">
              <div className="adm-qa-ic adm-qi-b">
                <UserPlus className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="adm-qa-t">Add Employee</div>
                <div className="adm-qa-d">Onboard a new member</div>
              </div>
              <ChevronRight className="adm-qa-arr h-4 w-4 shrink-0 text-slate-200" />
            </Link>
            <Link href="/workers/visa-expiry" className="adm-qa">
              <div className="adm-qa-ic adm-qi-p">
                <CreditCard className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="adm-qa-t">Check Visa Status</div>
                <div className="adm-qa-d">Review active visas</div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-200" />
            </Link>
            <Link href="/documents" className="adm-qa">
              <div className="adm-qa-ic adm-qi-g">
                <FileUp className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="adm-qa-t">Upload Document</div>
                <div className="adm-qa-d">Add compliance docs</div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-200" />
            </Link>
            <Link href="/leave" className="adm-qa">
              <div className="adm-qa-ic adm-qi-a">
                <CalendarRange className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="adm-qa-t">Approve Leave</div>
                <div className="adm-qa-d">Review pending requests</div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-200" />
            </Link>
          </div>
        </div>
        ) : null}

        {/* Activity */}
        {showFeat("activity") ? (
        <div className="adm-card">
          <div className="adm-card-h pb-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="adm-card-title">Attention &amp; activity</span>
              <span className="adm-chdr-badge adm-cb-g">{activityItems.length}</span>
            </div>
          </div>
          {activityItems.length === 0 ? (
            <div className="adm-alert-empty border-0 py-8">
              <div className="adm-ae-icon">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="adm-ae-t">Nothing urgent</div>
              <div className="adm-ae-s">No pending leave or visa issues flagged from your current data.</div>
            </div>
          ) : (
            <div className="adm-act-wrap">
              {activityItems.map((row) => (
                <div key={row.key} className="adm-act-row">
                  <div className={`adm-a-dot ${row.dotClass}`} />
                  <div className="min-w-0 flex-1">
                    <div className="adm-a-t">{row.title}</div>
                    <div className="adm-a-s">{row.sub}</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${row.tagClass}`}>{row.tag}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
