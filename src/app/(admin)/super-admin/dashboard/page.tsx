"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarClock,
  ShieldCheck,
  Users,
  ArrowRight,
  ClipboardList,
  LayoutGrid,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
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
};

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

export default function SuperAdminDashboardPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<OrgSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError("");
        const res = await api.get<OrgSummary[]>("/platform/organisations", token);
        setItems(res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load platform dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const metrics = useMemo(() => {
    const total = items.length;
    const active = items.filter((x) => x.is_active).length;
    const withAdmin = items.filter((x) => !!x.tenant_admin_email).length;
    const expiring30 = items.filter((x) => {
      if (!x.portal_expires_at) return false;
      const expiry = new Date(x.portal_expires_at).getTime();
      const now = Date.now();
      const days = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 30;
    }).length;
    return { total, active, withAdmin, expiring30 };
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

  if (!token) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Sign in to access the platform dashboard.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Loading platform overview…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="protexi-dash-marketing">
        <div className="border border-red-200 bg-red-50 text-red-700" style={{ padding: "10px 12px", fontSize: 12, ...MONO }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="protexi-dash-marketing flex flex-col gap-0">
      <div className="adm-ph adm-ph-portal">
        <div className="min-w-0">
          <div className="adm-ph-ey">Platform owner</div>
          <h1 className="adm-ph-title">
            Platform <em className="dash-title-em">overview</em>
          </h1>
          <div className="adm-ph-date">{todayDisplay}</div>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#64748b]">
            Tenant organisations, provisioning status, and subscription health across Protexi.
          </p>
        </div>
        <Link
          href="/super-admin/clients"
          className="inline-flex h-9 shrink-0 items-center gap-2 border border-[rgba(0,0,0,0.12)] bg-[#0f2d5e] px-4 text-[9px] font-bold uppercase tracking-[0.07em] text-white hover:bg-[#1a4fa0]"
          style={MONO}
        >
          <Building2 className="h-3.5 w-3.5" />
          Manage clients
        </Link>
      </div>

      <div className="adm-stat-row grid grid-cols-2 md:grid-cols-4" style={{ gap: 2, background: "rgba(0,0,0,0.07)", marginBottom: 16 }}>
        <div className="adm-sc adm-sc-b bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b">
              <Building2 className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">All</span>
          </div>
          <div className="adm-sc-num">{metrics.total}</div>
          <div className="adm-sc-lbl">Organisations</div>
          <div className="adm-sc-sub">On platform</div>
        </div>
        <div className="adm-sc adm-sc-p bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-p">
              <ShieldCheck className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-g">Live</span>
          </div>
          <div className="adm-sc-num">{metrics.active}</div>
          <div className="adm-sc-lbl">Active</div>
          <div className="adm-sc-sub">Tenants enabled</div>
        </div>
        <div className="adm-sc adm-sc-a bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-a">
              <Users className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Admin</span>
          </div>
          <div className="adm-sc-num">{metrics.withAdmin}</div>
          <div className="adm-sc-lbl">Admins set</div>
          <div className="adm-sc-sub">Email provisioned</div>
        </div>
        <div className="adm-sc adm-sc-r bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-r">
              <CalendarClock className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">30d</span>
          </div>
          <div className="adm-sc-num">{metrics.expiring30}</div>
          <div className="adm-sc-lbl">Expiring soon</div>
          <div className="adm-sc-sub">Portal renewal</div>
        </div>
      </div>

      <div className="wem-surface">
        <div className="wem-toolbar">
          <span className="flex items-center gap-2 text-[11px] font-extrabold text-[#0a0a0a]">
            <LayoutGrid className="h-4 w-4 text-[var(--dash-blue)]" />
            Platform navigation
          </span>
          <span className="wem-badge-mono" style={MONO}>
            Owner tools
          </span>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/super-admin/clients"
              className="group flex items-center justify-between gap-3 border border-[rgba(0,0,0,0.08)] bg-[#f8fafc] p-4 transition-colors hover:border-[rgba(26,79,160,0.35)] hover:bg-[rgba(235,242,252,0.9)]"
            >
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]" style={MONO}>
                  Directory
                </div>
                <div className="mt-1 text-[14px] font-bold text-[#0a0a0a]">Clients &amp; organisations</div>
                <div className="mt-0.5 text-[12px] text-[#64748b]">Create tenants, suspend, resend invites</div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-[var(--dash-blue)] transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/super-admin/subscriptions"
              className="group flex items-center justify-between gap-3 border border-[rgba(0,0,0,0.08)] bg-[#f8fafc] p-4 transition-colors hover:border-[rgba(26,79,160,0.35)] hover:bg-[rgba(235,242,252,0.9)]"
            >
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]" style={MONO}>
                  Billing
                </div>
                <div className="mt-1 text-[14px] font-bold text-[#0a0a0a]">Subscriptions</div>
                <div className="mt-0.5 text-[12px] text-[#64748b]">Plans and renewal posture</div>
              </div>
              <ClipboardList className="h-5 w-5 shrink-0 text-[var(--dash-blue)] transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
