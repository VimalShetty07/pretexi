"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  LayoutDashboard,
  CalendarClock,
  Layers,
  Timer,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { AdminDataTable } from "@/components/admin-data-table";
import "../../dashboard/dashboard-marketing.css";
import "../../workers/workers-page.css";

type ExpiringSub = {
  organisation_id: string;
  organisation_name: string;
  organisation_slug: string | null;
  subscription_id: string;
  status: string;
  plan_code: string;
  current_period_end: string | null;
};

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

export default function SuperAdminSubscriptionsPage() {
  const { token } = useAuth();
  const [days, setDays] = useState(30);
  const [items, setItems] = useState<ExpiringSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError("");
        const res = await api.get<ExpiringSub[]>(`/platform/subscriptions/expiring?days=${days}`, token);
        setItems(res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load subscriptions");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token, days]);

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

  const stats = useMemo(() => {
    const uniquePlans = new Set(items.map((i) => i.plan_code)).size;
    const activeLike = items.filter((i) => /active|trialing/i.test(i.status)).length;
    return {
      count: items.length,
      uniquePlans,
      activeLike,
    };
  }, [items]);

  if (!token) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Sign in to view subscription renewals.
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
            Subscription <em className="dash-title-em">renewals</em>
          </h1>
          <div className="adm-ph-date">{todayDisplay}</div>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#64748b]">
            Expiring subscriptions and renewal visibility across tenant billing periods.
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

      <div className="adm-stat-row grid grid-cols-2 md:grid-cols-4" style={{ gap: 2, background: "rgba(0,0,0,0.07)", marginBottom: 16 }}>
        <div className="adm-sc adm-sc-b bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b">
              <ClipboardList className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Due</span>
          </div>
          <div className="adm-sc-num">{stats.count}</div>
          <div className="adm-sc-lbl">In window</div>
          <div className="adm-sc-sub">Subscriptions</div>
        </div>
        <div className="adm-sc adm-sc-a bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-a">
              <Layers className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Mix</span>
          </div>
          <div className="adm-sc-num">{stats.uniquePlans}</div>
          <div className="adm-sc-lbl">Plan types</div>
          <div className="adm-sc-sub">Distinct codes</div>
        </div>
        <div className="adm-sc adm-sc-p bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-p">
              <CheckCircle2 className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-g">OK</span>
          </div>
          <div className="adm-sc-num">{stats.activeLike}</div>
          <div className="adm-sc-lbl">Active / trialing</div>
          <div className="adm-sc-sub">Status match</div>
        </div>
        <div className="adm-sc adm-sc-r bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-r">
              <Timer className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">{days}d</span>
          </div>
          <div className="adm-sc-num">{days}</div>
          <div className="adm-sc-lbl">Horizon</div>
          <div className="adm-sc-sub">Day window</div>
        </div>
      </div>

      <div className="wem-surface">
        <div className="wem-toolbar flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[11px] font-extrabold text-[#0a0a0a]">
            <CalendarClock className="h-4 w-4 text-[var(--dash-blue)]" />
            Expiring subscriptions
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="wem-badge-mono" style={MONO}>
              {items.length} in list
            </span>
            <label className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]" style={MONO}>
                Window
              </span>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="portal-details-input !h-9 !min-h-0 !py-0 text-[13px]"
                style={{ maxWidth: 140 }}
              >
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </label>
          </div>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.07)] p-0">
          <div className="[&>div]:rounded-none [&>div]:border-0 [&>div]:bg-transparent">
            <AdminDataTable
              headers={["Company", "Plan", "Status", "Renewal", "Actions"]}
              colSpan={5}
              loading={loading}
              isEmpty={!loading && items.length === 0}
              loadingContent={<p style={MONO}>Loading subscriptions…</p>}
              emptyContent={
                <div className="flex flex-col items-center py-10">
                  <div className="adm-ae-icon">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="adm-ae-t mt-3">Nothing in this window</div>
                  <div className="adm-ae-s">Try a longer horizon or check clients directly.</div>
                </div>
              }
            >
              {items.map((row) => (
                <tr key={row.subscription_id} className="border-b border-[rgba(0,0,0,0.06)] last:border-0">
                  <td style={{ padding: "12px 16px" }}>
                    <p className="font-semibold text-[#0a0a0a]">{row.organisation_name}</p>
                    <p className="text-[11px] text-[#64748b]">{row.organisation_slug || "—"}</p>
                  </td>
                  <td className="text-[13px] text-[#1f2a3d]" style={{ padding: "12px 16px" }}>
                    {row.plan_code}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      className="inline-flex rounded-full text-[9px] font-bold uppercase tracking-[0.07em]"
                      style={{
                        padding: "3px 8px",
                        background: "rgba(26,79,160,0.12)",
                        color: "#0f2d5e",
                        ...MONO,
                      }}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="text-[13px] text-[#1f2a3d]" style={{ padding: "12px 16px" }}>
                    {row.current_period_end
                      ? new Date(row.current_period_end).toLocaleDateString("en-GB")
                      : "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <Link
                      href={`/super-admin/clients/${row.organisation_id}`}
                      className="inline-flex items-center border border-[rgba(0,0,0,0.12)] bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[#f8fafc]"
                      style={MONO}
                    >
                      View client
                    </Link>
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
