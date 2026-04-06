"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Send,
  Plus,
  Building2,
  ShieldCheck,
  Ban,
  LayoutDashboard,
  Users,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { AdminDataTable } from "@/components/admin-data-table";
import "../../dashboard/dashboard-marketing.css";
import "../../workers/workers-page.css";

type OrgSummary = {
  id: string;
  name: string;
  slug: string | null;
  is_active: boolean;
  portal_plan: string;
  portal_expires_at: string | null;
  tenant_admin_email: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
};

type OrgCreatePayload = {
  name: string;
  slug: string;
  admin_email: string;
  admin_name: string;
  admin_password: string;
  plan_code: string;
  portal_expires_at?: string | null;
};

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

export default function SuperAdminClientsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<OrgSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [form, setForm] = useState<OrgCreatePayload>({
    name: "",
    slug: "",
    admin_email: "",
    admin_name: "",
    admin_password: "demo123",
    plan_code: "starter_monthly",
    portal_expires_at: null,
  });

  const load = useCallback(async () => {
    if (!token) return;
    const res = await api.get<OrgSummary[]>("/platform/organisations", token);
    setItems(res);
  }, [token]);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError("");
        await load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load organisations");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [load, token]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      active: items.filter((x) => x.is_active).length,
      suspended: items.filter((x) => !x.is_active).length,
    };
  }, [items]);

  const todayDisplay = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    []
  );

  const setField = (key: keyof OrgCreatePayload, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const createOrg = async () => {
    if (!token) return;
    try {
      setSaving(true);
      setError("");
      await api.post("/platform/organisations", form, token);
      setForm({
        name: "",
        slug: "",
        admin_email: "",
        admin_name: "",
        admin_password: "demo123",
        plan_code: "starter_monthly",
        portal_expires_at: null,
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create organisation");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, current: boolean) => {
    if (!token) return;
    try {
      setError("");
      await api.patch(`/platform/organisations/${id}`, { is_active: !current }, token);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update organisation");
    }
  };

  const resendInvite = async (id: string) => {
    if (!token) return;
    try {
      setError("");
      await api.post(`/platform/organisations/${id}/resend-invite`, {}, token);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend invite");
    }
  };

  const renderExpiry = (item: OrgSummary) => {
    const rawExpiry = item.portal_expires_at || item.subscription_current_period_end;
    if (!rawExpiry) {
      return <span className="text-[12px] text-[#64748b]">—</span>;
    }

    const expiryDate = new Date(rawExpiry);
    if (Number.isNaN(expiryDate.getTime())) {
      return <span className="text-[12px] text-[#64748b]">—</span>;
    }

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const expiryMidnight = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate()).getTime();
    const daysLeft = Math.floor((expiryMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

    let chipBg = "rgba(26,79,160,0.12)";
    let chipText = "#0f2d5e";
    let chipLabel = `${daysLeft}d left`;
    if (daysLeft < 0) {
      chipBg = "rgba(220,38,38,0.12)";
      chipText = "#991b1b";
      chipLabel = `${Math.abs(daysLeft)}d overdue`;
    } else if (daysLeft <= 30) {
      chipBg = "rgba(217,119,6,0.15)";
      chipText = "#b45309";
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-[#64748b]">{expiryDate.toLocaleDateString("en-GB")}</span>
        <span
          className="rounded-full text-[10px] font-bold uppercase tracking-[0.06em]"
          style={{ padding: "2px 7px", background: chipBg, color: chipText, ...MONO }}
        >
          {chipLabel}
        </span>
      </div>
    );
  };

  if (!token) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Sign in to manage client organisations.
        </p>
      </div>
    );
  }

  return (
    <div className="protexi-dash-marketing flex flex-col gap-0">
      {error && (
        <div className="mb-3 border border-red-200 bg-red-50 text-red-700" style={{ padding: "10px 12px", fontSize: 12, ...MONO }}>
          {error}
        </div>
      )}

      <div className="adm-ph adm-ph-portal">
        <div className="min-w-0">
          <div className="adm-ph-ey">Platform owner</div>
          <h1 className="adm-ph-title">
            Client <em className="dash-title-em">organisations</em>
          </h1>
          <div className="adm-ph-date">{todayDisplay}</div>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#64748b]">
            Create tenants, manage status, resend invites, and open tenant details.
          </p>
        </div>
        <Link
          href="/super-admin/dashboard"
          className="inline-flex h-9 shrink-0 items-center gap-2 border border-[rgba(0,0,0,0.12)] bg-[#0f2d5e] px-4 text-[9px] font-bold uppercase tracking-[0.07em] text-white hover:bg-[#1a4fa0]"
          style={MONO}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Platform overview
        </Link>
      </div>

      <div className="adm-stat-row grid grid-cols-1 sm:grid-cols-3" style={{ gap: 2, background: "rgba(0,0,0,0.07)", marginBottom: 16 }}>
        <div className="adm-sc adm-sc-b bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b">
              <Building2 className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">All</span>
          </div>
          <div className="adm-sc-num">{stats.total}</div>
          <div className="adm-sc-lbl">Total</div>
          <div className="adm-sc-sub">Organisations</div>
        </div>
        <div className="adm-sc adm-sc-p bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-p">
              <ShieldCheck className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-g">Live</span>
          </div>
          <div className="adm-sc-num">{stats.active}</div>
          <div className="adm-sc-lbl">Active</div>
          <div className="adm-sc-sub">Tenants enabled</div>
        </div>
        <div className="adm-sc adm-sc-r bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-r">
              <Ban className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Off</span>
          </div>
          <div className="adm-sc-num">{stats.suspended}</div>
          <div className="adm-sc-lbl">Suspended</div>
          <div className="adm-sc-sub">Access paused</div>
        </div>
      </div>

      <div className="wem-surface mb-4">
        <div className="wem-toolbar">
          <span className="flex items-center gap-2 text-[11px] font-extrabold text-[#0a0a0a]">
            <Plus className="h-4 w-4 text-[var(--dash-blue)]" />
            Add organisation
          </span>
          <span className="wem-badge-mono" style={MONO}>
            New tenant
          </span>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]" style={MONO}>
                Company name
              </span>
              <input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Acme Ltd"
                className="portal-details-input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]" style={MONO}>
                Slug
              </span>
              <input
                value={form.slug}
                onChange={(e) => setField("slug", e.target.value)}
                placeholder="acme"
                className="portal-details-input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]" style={MONO}>
                Admin name
              </span>
              <input
                value={form.admin_name}
                onChange={(e) => setField("admin_name", e.target.value)}
                placeholder="Jane Smith"
                className="portal-details-input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]" style={MONO}>
                Admin email
              </span>
              <input
                value={form.admin_email}
                onChange={(e) => setField("admin_email", e.target.value)}
                placeholder="admin@company.com"
                type="email"
                className="portal-details-input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]" style={MONO}>
                Plan
              </span>
              <select
                value={form.plan_code}
                onChange={(e) => setField("plan_code", e.target.value)}
                className="portal-details-input"
              >
                <option value="free">Free</option>
                <option value="starter_monthly">Starter Monthly</option>
                <option value="growth_monthly">Growth Monthly</option>
                <option value="enterprise_monthly">Enterprise Monthly</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]" style={MONO}>
                Portal expiry
              </span>
              <input
                type="date"
                value={form.portal_expires_at ? form.portal_expires_at.slice(0, 10) : ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    portal_expires_at: e.target.value ? `${e.target.value}T00:00:00Z` : null,
                  }))
                }
                className="portal-details-input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]" style={MONO}>
                Temp password
              </span>
              <div className="relative">
                <input
                  value={form.admin_password}
                  onChange={(e) => setField("admin_password", e.target.value)}
                  placeholder="Initial password"
                  type={showAdminPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="portal-details-input w-full pr-11"
                />
                <button
                  type="button"
                  aria-label={showAdminPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowAdminPassword((v) => !v)}
                  className="absolute right-0 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center text-[#64748b] transition-colors hover:bg-[rgba(0,0,0,0.04)] hover:text-[#0f2d5e]"
                >
                  {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <div className="flex flex-col justify-end gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-transparent" style={MONO}>
                —
              </span>
              <button
                type="button"
                onClick={createOrg}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center border border-[rgba(0,0,0,0.12)] bg-[#0f2d5e] px-4 text-[9px] font-bold uppercase tracking-[0.07em] text-white hover:bg-[#1a4fa0] disabled:opacity-60"
                style={MONO}
              >
                {saving ? "Creating…" : "Create organisation"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="wem-surface">
        <div className="wem-toolbar">
          <span className="flex items-center gap-2 text-[11px] font-extrabold text-[#0a0a0a]">
            <Users className="h-4 w-4 text-[var(--dash-blue)]" />
            All organisations
          </span>
          <span className="wem-badge-mono" style={MONO}>
            {items.length} total
          </span>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.07)] p-0">
          <div className="[&>div]:rounded-none [&>div]:border-0 [&>div]:bg-transparent">
            <AdminDataTable
              headers={["Company", "Admin", "Plan", "Status", "Expiry", "Actions"]}
              colSpan={6}
              loading={loading}
              isEmpty={!loading && items.length === 0}
              loadingContent={<p style={MONO}>Loading clients…</p>}
              emptyContent={
                <div className="flex flex-col items-center py-10">
                  <div className="adm-ae-icon">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="adm-ae-t mt-3">No organisations yet</div>
                  <div className="adm-ae-s">Create a tenant above to get started.</div>
                </div>
              }
            >
              {items.map((item) => (
                <tr key={item.id} className="border-b border-[rgba(0,0,0,0.06)] last:border-0">
                  <td style={{ padding: "12px 16px" }}>
                    <div>
                      <p className="font-semibold text-[#0a0a0a]">{item.name}</p>
                      <p className="text-[11px] text-[#64748b]">{item.slug || "—"}</p>
                    </div>
                  </td>
                  <td className="text-[13px] text-[#1f2a3d]" style={{ padding: "12px 16px" }}>
                    {item.tenant_admin_email || "—"}
                  </td>
                  <td className="text-[13px] text-[#1f2a3d]" style={{ padding: "12px 16px" }}>
                    {item.portal_plan}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      className="inline-flex rounded-full text-[9px] font-bold uppercase tracking-[0.07em]"
                      style={{
                        padding: "3px 8px",
                        background: item.is_active ? "rgba(22,163,74,0.12)" : "rgba(220,38,38,0.12)",
                        color: item.is_active ? "#166534" : "#991b1b",
                        ...MONO,
                      }}
                    >
                      {item.is_active ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>{renderExpiry(item)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/super-admin/clients/${item.id}`}
                        className="inline-flex items-center border border-[rgba(0,0,0,0.12)] bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[#f8fafc]"
                        style={MONO}
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleStatus(item.id, item.is_active)}
                        className="inline-flex items-center border border-[rgba(0,0,0,0.12)] bg-[#f8fafc] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.07em] text-[#0a0a0a] hover:bg-[#f1f5f9]"
                        style={MONO}
                      >
                        {item.is_active ? "Suspend" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => resendInvite(item.id)}
                        className="inline-flex items-center gap-1 border border-[rgba(0,0,0,0.12)] bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[#f8fafc]"
                        style={MONO}
                      >
                        <Send className="h-3 w-3" /> Invite
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </AdminDataTable>
          </div>
        </div>
      </div>
    </div>
  );
}
