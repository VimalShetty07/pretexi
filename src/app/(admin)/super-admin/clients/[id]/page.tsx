"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  Ban,
  CalendarClock,
  Users,
  ClipboardList,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { ChecklistTemplateEditor } from "@/components/checklist-template-editor";
import "../../../dashboard/dashboard-marketing.css";
import "../../../workers/workers-page.css";

type UserOut = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

type OrgDetail = {
  id: string;
  name: string;
  licence_number: string;
  slug: string | null;
  is_active: boolean;
  portal_plan: string;
  portal_expires_at: string | null;
  admin_users: UserOut[];
  latest_subscription: {
    status: string;
    plan_code: string;
    current_period_end: string | null;
  } | null;
};

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

export default function SuperAdminClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const [item, setItem] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      if (!token || !id) return;
      try {
        setLoading(true);
        setError("");
        const res = await api.get<OrgDetail>(`/platform/organisations/${id}`, token);
        setItem(res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load organisation");
        setItem(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token, id]);

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

  const canEditClientChecklist = user?.role === "platform_owner";

  if (!token) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Sign in to view this client.
        </p>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="protexi-dash-marketing">
        <div className="border border-red-200 bg-red-50 text-red-700" style={{ padding: "10px 12px", fontSize: 12, ...MONO }}>
          Missing organisation id.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Loading client details…
        </p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="protexi-dash-marketing flex flex-col gap-4">
        <div className="border border-red-200 bg-red-50 text-red-700" style={{ padding: "10px 12px", fontSize: 12, ...MONO }}>
          {error || "Client not found"}
        </div>
        <Link
          href="/super-admin/clients"
          className="inline-flex w-fit items-center gap-2 border border-[rgba(0,0,0,0.12)] bg-[#0f2d5e] px-4 py-2 text-[9px] font-bold uppercase tracking-[0.07em] text-white hover:bg-[#1a4fa0]"
          style={MONO}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All clients
        </Link>
      </div>
    );
  }

  const portalExpiryLabel = item.portal_expires_at
    ? new Date(item.portal_expires_at).toLocaleDateString("en-GB")
    : "—";

  return (
    <div className="protexi-dash-marketing flex flex-col gap-0">
      <div className="adm-ph adm-ph-portal">
        <div className="min-w-0">
          <div className="adm-ph-ey">Platform owner</div>
          <h1 className="adm-ph-title break-words">{item.name}</h1>
          <div className="adm-ph-date">{todayDisplay}</div>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#64748b]">
            Slug <span className="font-semibold text-[#0a0a0a]">{item.slug || "—"}</span>
            {" · "}
            Licence <span className="font-semibold text-[#0a0a0a]">{item.licence_number}</span>
          </p>
        </div>
        <Link
          href="/super-admin/clients"
          className="inline-flex h-9 shrink-0 items-center gap-2 border border-[rgba(0,0,0,0.12)] bg-[#0f2d5e] px-4 text-[9px] font-bold uppercase tracking-[0.07em] text-white hover:bg-[#1a4fa0]"
          style={MONO}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All clients
        </Link>
      </div>

      <div className="adm-stat-row grid grid-cols-2 md:grid-cols-4" style={{ gap: 2, background: "rgba(0,0,0,0.07)", marginBottom: 16 }}>
        <div className="adm-sc adm-sc-b bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b">
              <CreditCard className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Plan</span>
          </div>
          <div className="adm-sc-num truncate text-[18px] leading-tight md:text-[22px]">{item.portal_plan}</div>
          <div className="adm-sc-lbl">Portal plan</div>
          <div className="adm-sc-sub">Billing tier</div>
        </div>
        <div className="adm-sc adm-sc-p bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-p">
              {item.is_active ? (
                <ShieldCheck className="h-[17px] w-[17px]" />
              ) : (
                <Ban className="h-[17px] w-[17px]" />
              )}
            </div>
            <span className={`adm-sc-pill ${item.is_active ? "adm-pill-g" : "adm-pill-n"}`}>
              {item.is_active ? "On" : "Off"}
            </span>
          </div>
          <div className="adm-sc-num">{item.is_active ? "Active" : "Suspended"}</div>
          <div className="adm-sc-lbl">Tenant status</div>
          <div className="adm-sc-sub">Access</div>
        </div>
        <div className="adm-sc adm-sc-a bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-a">
              <CalendarClock className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Portal</span>
          </div>
          <div className="adm-sc-num text-[18px] leading-tight md:text-[22px]">{portalExpiryLabel}</div>
          <div className="adm-sc-lbl">Portal expiry</div>
          <div className="adm-sc-sub">Access end</div>
        </div>
        <div className="adm-sc adm-sc-r bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-r">
              <Users className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Admins</span>
          </div>
          <div className="adm-sc-num">{item.admin_users.length}</div>
          <div className="adm-sc-lbl">Tenant admins</div>
          <div className="adm-sc-sub">Provisioned</div>
        </div>
      </div>

      <div className="mb-4 wem-surface">
        <div className="wem-toolbar">
          <span className="flex items-center gap-2 text-[11px] font-extrabold text-[#0a0a0a]">
            <Users className="h-4 w-4 text-[var(--dash-blue)]" />
            Tenant admin users
          </span>
          <span className="wem-badge-mono" style={MONO}>
            {item.admin_users.length} {item.admin_users.length === 1 ? "user" : "users"}
          </span>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
          {item.admin_users.length === 0 ? (
            <div className="flex flex-col items-center py-10">
              <div className="adm-ae-icon">
                <Users className="h-5 w-5" />
              </div>
              <div className="adm-ae-t mt-3">No admin users</div>
              <div className="adm-ae-s">Provision a tenant admin from the clients list.</div>
            </div>
          ) : (
            <div className="grid gap-2">
              {item.admin_users.map((u) => (
                <div
                  key={u.id}
                  className="border border-[rgba(0,0,0,0.08)] bg-[#f8fafc] p-3"
                >
                  <p className="font-semibold text-[#0a0a0a]" style={{ fontSize: 14 }}>
                    {u.full_name}
                  </p>
                  <p className="text-[12px] text-[#64748b]">
                    {u.email} · {u.role}
                    {!u.is_active ? (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[#64748b]" style={MONO}>
                        (inactive)
                      </span>
                    ) : null}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 wem-surface">
        <div className="wem-toolbar">
          <span className="flex items-center gap-2 text-[11px] font-extrabold text-[#0a0a0a]">
            <ClipboardList className="h-4 w-4 text-[var(--dash-blue)]" />
            Latest subscription
          </span>
          <span className="wem-badge-mono" style={MONO}>
            Stripe / billing
          </span>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
          {!item.latest_subscription ? (
            <div className="flex flex-col items-center py-10">
              <div className="adm-ae-icon">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="adm-ae-t mt-3">No subscription record</div>
              <div className="adm-ae-s">Billing may not be attached yet.</div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]" style={MONO}>
                  Status
                </p>
                <p className="mt-1 text-[14px] font-bold text-[#0a0a0a]">{item.latest_subscription.status}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]" style={MONO}>
                  Plan code
                </p>
                <p className="mt-1 text-[14px] font-bold text-[#0a0a0a]">{item.latest_subscription.plan_code}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]" style={MONO}>
                  Current period end
                </p>
                <p className="mt-1 text-[14px] font-bold text-[#0a0a0a]">
                  {item.latest_subscription.current_period_end
                    ? new Date(item.latest_subscription.current_period_end).toLocaleDateString("en-GB")
                    : "—"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {token && id && (
        <ChecklistTemplateEditor token={token} organisationId={id} canEdit={canEditClientChecklist} />
      )}
    </div>
  );
}
