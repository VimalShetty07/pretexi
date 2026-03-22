"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { ChecklistTemplateEditor } from "@/components/checklist-template-editor";

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
        const res = await api.get<OrgDetail>(`/platform/organisations/${id}`, token);
        setItem(res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load organisation");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token, id]);

  if (loading) return <p className="text-sm text-[var(--muted-foreground)]">Loading client details...</p>;
  if (error || !item) return <p className="text-sm text-red-600">{error || "Client not found"}</p>;

  const canEditClientChecklist = user?.role === "platform_owner";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 className="admin-page-title">{item.name}</h1>
        <p className="admin-page-subtitle" style={{ marginTop: 6 }}>
          Slug: <span className="font-semibold text-[#0f1f3a]">{item.slug || "-"}</span> · Licence:{" "}
          <span className="font-semibold text-[#0f1f3a]">{item.licence_number}</span>
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
        <InfoCard label="Plan" value={item.portal_plan} />
        <InfoCard label="Status" value={item.is_active ? "Active" : "Suspended"} />
        <InfoCard label="Portal expiry" value={item.portal_expires_at ? new Date(item.portal_expires_at).toLocaleDateString("en-GB") : "-"} />
      </div>

      <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: 14 }}>
        <h2 className="font-semibold text-[#0f1f3a]" style={{ fontSize: 14, marginBottom: 10 }}>Tenant Admin Users</h2>
        {item.admin_users.length === 0 ? (
          <p className="text-[13px] text-[var(--muted-foreground)]">No admin users found.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {item.admin_users.map((u) => (
              <div key={u.id} className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/50" style={{ padding: "10px 12px" }}>
                <p className="font-semibold text-[#0f1f3a]" style={{ fontSize: 13 }}>{u.full_name}</p>
                <p className="text-[12px] text-[var(--muted-foreground)]">{u.email} · {u.role}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: 14 }}>
        <h2 className="font-semibold text-[#0f1f3a]" style={{ fontSize: 14, marginBottom: 10 }}>Latest Subscription</h2>
        {!item.latest_subscription ? (
          <p className="text-[13px] text-[var(--muted-foreground)]">No subscription record.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10 }}>
            <InfoCard label="Status" value={item.latest_subscription.status} />
            <InfoCard label="Plan code" value={item.latest_subscription.plan_code} />
            <InfoCard
              label="Current period end"
              value={
                item.latest_subscription.current_period_end
                  ? new Date(item.latest_subscription.current_period_end).toLocaleDateString("en-GB")
                  : "-"
              }
            />
          </div>
        )}
      </div>

      {token && id && (
        <ChecklistTemplateEditor token={token} organisationId={id} canEdit={canEditClientChecklist} />
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-[var(--border)]" style={{ padding: 12 }}>
      <p className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)] font-semibold">{label}</p>
      <p className="font-semibold text-[#0f1f3a]" style={{ marginTop: 5, fontSize: 14 }}>{value}</p>
    </div>
  );
}
