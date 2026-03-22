"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Plan = {
  code: string;
  name: string;
  amount: number;
  currency: string;
  billing_interval: string;
  features: string[];
  included_users: number | null;
  extra_user_price: number | null;
  premium_features: string[];
};

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userCount, setUserCount] = useState(25);
  const [addons, setAddons] = useState<string[]>([]);

  const addonCatalog: Record<string, { label: string; amount: number }> = {
    bg_verification: { label: "Background Verification", amount: 49 },
    leave_approval: { label: "Leave Approval Workflow", amount: 29 },
  };

  const toggleAddon = (code: string) => {
    setAddons((prev) => (prev.includes(code) ? prev.filter((v) => v !== code) : [...prev, code]));
  };

  const addonsAmount = addons.reduce((sum, code) => sum + (addonCatalog[code]?.amount ?? 0), 0);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const res = await api.get<Plan[]>("/public/plans");
        setPlans(res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load plans");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#f4f7fb", padding: "40px 20px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 className="admin-page-title">Pricing</h1>
        <p className="admin-page-subtitle" style={{ marginTop: 8 }}>
          Choose a plan for your organisation portal.
        </p>

        {loading && <p style={{ marginTop: 24, color: "#6b7280" }}>Loading plans...</p>}
        {error && <p style={{ marginTop: 24, color: "#dc2626" }}>{error}</p>}

        {!loading && !error && (
          <div style={{ marginTop: 20 }}>
            <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: 16, marginBottom: 16 }}>
              <p className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)] font-semibold">Estimator</p>
              <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 10, marginTop: 8 }}>
                <div>
                  <p className="text-xs text-gray-600">Estimated users</p>
                  <input
                    type="number"
                    min={1}
                    value={userCount}
                    onChange={(e) => setUserCount(Math.max(1, Number(e.target.value || 1)))}
                    className="rounded-xl border border-gray-300 bg-white text-sm text-gray-900"
                    style={{ height: 36, padding: "0 10px", marginTop: 4, width: "100%" }}
                  />
                </div>
                {Object.entries(addonCatalog).map(([code, conf]) => (
                  <label key={code} className="rounded-xl border border-gray-200 bg-gray-50" style={{ padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{conf.label}</p>
                      <p className="text-xs text-gray-500">+£{conf.amount}/month</p>
                    </div>
                    <input type="checkbox" checked={addons.includes(code)} onChange={() => toggleAddon(code)} />
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16 }}>
            {plans.map((plan) => (
              <div key={plan.code} className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: 18 }}>
                <p className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)] font-semibold">{plan.code}</p>
                <h2 className="font-bold text-[#0f1f3a]" style={{ fontSize: 20, marginTop: 6 }}>{plan.name}</h2>
                <p style={{ marginTop: 8, fontSize: 26, fontWeight: 800, color: "#1a5296" }}>
                  {plan.currency} {plan.amount}
                  <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 4 }}>/ {plan.billing_interval}</span>
                </p>
                <p className="text-xs text-gray-600" style={{ marginTop: 8 }}>
                  Included users: {plan.included_users == null ? "Unlimited" : plan.included_users}
                </p>
                {plan.included_users != null && (
                  <p className="text-xs text-gray-500" style={{ marginTop: 2 }}>
                    Extra user: £{plan.extra_user_price ?? 0}/month
                  </p>
                )}
                {(() => {
                  const included = plan.included_users ?? userCount;
                  const overageUsers = Math.max(0, userCount - included);
                  const overageAmount = overageUsers * (plan.extra_user_price ?? 0);
                  const total = plan.amount + overageAmount + addonsAmount;
                  return (
                    <div className="rounded-xl border border-blue-100 bg-blue-50" style={{ marginTop: 10, padding: "8px 10px" }}>
                      <p className="text-xs text-blue-700">Estimated total</p>
                      <p className="text-sm font-bold text-blue-900">
                        £{total.toFixed(0)}/month
                      </p>
                    </div>
                  );
                })()}
                <ul style={{ marginTop: 12, paddingLeft: 18, color: "#374151", fontSize: 13 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ marginBottom: 6 }}>{f}</li>
                  ))}
                </ul>
                {plan.premium_features?.length > 0 && (
                  <p className="text-xs text-gray-500" style={{ marginTop: 8 }}>
                    Premium optional: {plan.premium_features.join(", ").replaceAll("_", " ")}
                  </p>
                )}
              </div>
            ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
