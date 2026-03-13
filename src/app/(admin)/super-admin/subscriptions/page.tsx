"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { AdminDataTable } from "@/components/admin-data-table";

type ExpiringSub = {
  organisation_id: string;
  organisation_name: string;
  organisation_slug: string | null;
  subscription_id: string;
  status: string;
  plan_code: string;
  current_period_end: string | null;
};

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="admin-page-title">Subscriptions</h1>
          <p className="admin-page-subtitle" style={{ marginTop: 6 }}>
            Expiring subscriptions and renewal visibility.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[var(--muted-foreground)]">Window</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-xl border border-[var(--border)] bg-white"
            style={{ height: 34, padding: "0 10px", fontSize: 12 }}
          >
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700" style={{ padding: "10px 12px", fontSize: 13 }}>
          {error}
        </div>
      )}

      <AdminDataTable
        headers={["Company", "Plan", "Status", "Renewal Date"]}
        colSpan={4}
        loading={loading}
        isEmpty={!loading && items.length === 0}
        loadingContent={<p>Loading subscriptions...</p>}
        emptyContent={<p className="text-[var(--muted-foreground)]">No subscriptions in this window.</p>}
      >
        {items.map((row) => (
          <tr key={row.subscription_id} className="border-b last:border-0 border-[var(--border)]">
            <td>
              <p className="font-semibold text-[#0f1f3a]">{row.organisation_name}</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">{row.organisation_slug || "-"}</p>
            </td>
            <td className="text-[13px] text-[#1f2a3d]">{row.plan_code}</td>
            <td>
              <span className="rounded-full" style={{ padding: "3px 8px", fontSize: 11, fontWeight: 700, background: "#dbeafe", color: "#1d4ed8" }}>
                {row.status}
              </span>
            </td>
            <td className="text-[13px] text-[#1f2a3d]">
              {row.current_period_end ? new Date(row.current_period_end).toLocaleDateString("en-GB") : "-"}
            </td>
          </tr>
        ))}
      </AdminDataTable>
    </div>
  );
}
