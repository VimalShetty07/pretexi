"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Send, Plus } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { AdminDataTable } from "@/components/admin-data-table";

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

export default function SuperAdminClientsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<OrgSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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
      await api.patch(`/platform/organisations/${id}`, { is_active: !current }, token);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update organisation");
    }
  };

  const resendInvite = async (id: string) => {
    if (!token) return;
    try {
      await api.post(`/platform/organisations/${id}/resend-invite`, {}, token);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend invite");
    }
  };

  const renderExpiry = (item: OrgSummary) => {
    const rawExpiry = item.portal_expires_at || item.subscription_current_period_end;
    if (!rawExpiry) {
      return <span className="text-[12px] text-[var(--muted-foreground)]">-</span>;
    }

    const expiryDate = new Date(rawExpiry);
    if (Number.isNaN(expiryDate.getTime())) {
      return <span className="text-[12px] text-[var(--muted-foreground)]">-</span>;
    }

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const expiryMidnight = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate()).getTime();
    const daysLeft = Math.floor((expiryMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

    let chipBg = "#dbeafe";
    let chipText = "#1d4ed8";
    let chipLabel = `${daysLeft}d left`;
    if (daysLeft < 0) {
      chipBg = "#fee2e2";
      chipText = "#b91c1c";
      chipLabel = `${Math.abs(daysLeft)}d overdue`;
    } else if (daysLeft <= 30) {
      chipBg = "#fef3c7";
      chipText = "#b45309";
    }

    return (
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-[var(--muted-foreground)]">
          {expiryDate.toLocaleDateString("en-GB")}
        </span>
        <span
          className="rounded-full"
          style={{ padding: "2px 7px", fontSize: 10, fontWeight: 700, background: chipBg, color: chipText }}
        >
          {chipLabel}
        </span>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 className="admin-page-title">Client Organisations</h1>
        <p className="admin-page-subtitle" style={{ marginTop: 6 }}>
          Create tenants, manage status, and open details.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700" style={{ padding: "10px 12px", fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
        <Stat label="Total" value={stats.total} />
        <Stat label="Active" value={stats.active} />
        <Stat label="Suspended" value={stats.suspended} />
      </div>

      <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: 14 }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
          <Plus size={15} className="text-[#1a5296]" />
          <p className="font-semibold text-[#0f1f3a]" style={{ fontSize: 14 }}>Add Client</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10 }}>
          <input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Company name" className="rounded-xl border border-[var(--border)] bg-white" style={{ height: 38, padding: "0 12px", fontSize: 13 }} />
          <input value={form.slug} onChange={(e) => setField("slug", e.target.value)} placeholder="Slug" className="rounded-xl border border-[var(--border)] bg-white" style={{ height: 38, padding: "0 12px", fontSize: 13 }} />
          <input value={form.admin_name} onChange={(e) => setField("admin_name", e.target.value)} placeholder="Admin name" className="rounded-xl border border-[var(--border)] bg-white" style={{ height: 38, padding: "0 12px", fontSize: 13 }} />
          <input value={form.admin_email} onChange={(e) => setField("admin_email", e.target.value)} placeholder="Admin email" className="rounded-xl border border-[var(--border)] bg-white" style={{ height: 38, padding: "0 12px", fontSize: 13 }} />
          <select
            value={form.plan_code}
            onChange={(e) => setField("plan_code", e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-white"
            style={{ height: 38, padding: "0 12px", fontSize: 13 }}
          >
            <option value="free">Free</option>
            <option value="starter_monthly">Starter Monthly</option>
            <option value="growth_monthly">Growth Monthly</option>
            <option value="enterprise_monthly">Enterprise Monthly</option>
          </select>
          <input
            type="date"
            value={form.portal_expires_at ? form.portal_expires_at.slice(0, 10) : ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                portal_expires_at: e.target.value ? `${e.target.value}T00:00:00Z` : null,
              }))
            }
            className="rounded-xl border border-[var(--border)] bg-white"
            style={{ height: 38, padding: "0 12px", fontSize: 13 }}
          />
          <input value={form.admin_password} onChange={(e) => setField("admin_password", e.target.value)} placeholder="Temp password" className="rounded-xl border border-[var(--border)] bg-white" style={{ height: 38, padding: "0 12px", fontSize: 13 }} />
          <button onClick={createOrg} disabled={saving} className="rounded-xl text-white font-semibold disabled:opacity-60" style={{ height: 38, fontSize: 13, background: "linear-gradient(135deg,#1a5296,#2b6cd4)" }}>
            {saving ? "Creating..." : "Create"}
          </button>
        </div>
      </div>

      <AdminDataTable
        headers={["Company", "Admin", "Plan", "Status", "Expiry", "Actions"]}
        colSpan={6}
        loading={loading}
        isEmpty={!loading && items.length === 0}
        loadingContent={<p>Loading clients...</p>}
        emptyContent={<p className="text-[var(--muted-foreground)]">No organisations found.</p>}
      >
        {items.map((item) => (
          <tr key={item.id} className="border-b last:border-0 border-[var(--border)]">
            <td>
              <div>
                <p className="font-semibold text-[#0f1f3a]">{item.name}</p>
                <p className="text-[11px] text-[var(--muted-foreground)]">{item.slug || "-"}</p>
              </div>
            </td>
            <td className="text-[13px] text-[#1f2a3d]">{item.tenant_admin_email || "-"}</td>
            <td className="text-[13px] text-[#1f2a3d]">{item.portal_plan}</td>
            <td>
              <span className="rounded-full" style={{ padding: "3px 8px", fontSize: 11, fontWeight: 700, background: item.is_active ? "#dcfce7" : "#fee2e2", color: item.is_active ? "#166534" : "#b91c1c" }}>
                {item.is_active ? "Active" : "Suspended"}
              </span>
            </td>
            <td>{renderExpiry(item)}</td>
            <td>
              <div className="flex items-center gap-2">
                <Link href={`/super-admin/clients/${item.id}`} className="rounded-lg border border-[var(--border)]" style={{ padding: "4px 8px", fontSize: 12 }}>
                  View
                </Link>
                <button onClick={() => toggleStatus(item.id, item.is_active)} className="rounded-lg border border-[var(--border)]" style={{ padding: "4px 8px", fontSize: 12 }}>
                  {item.is_active ? "Suspend" : "Activate"}
                </button>
                <button onClick={() => resendInvite(item.id)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)]" style={{ padding: "4px 8px", fontSize: 12 }}>
                  <Send size={12} /> Invite
                </button>
              </div>
            </td>
          </tr>
        ))}
      </AdminDataTable>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: 14 }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{label}</p>
      <p className="admin-value-number text-[#0f1f3a]" style={{ marginTop: 8 }}>{value}</p>
    </div>
  );
}
