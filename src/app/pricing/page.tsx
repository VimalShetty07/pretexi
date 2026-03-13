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
};

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16, marginTop: 20 }}>
            {plans.map((plan) => (
              <div key={plan.code} className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: 18 }}>
                <p className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)] font-semibold">{plan.code}</p>
                <h2 className="font-bold text-[#0f1f3a]" style={{ fontSize: 20, marginTop: 6 }}>{plan.name}</h2>
                <p style={{ marginTop: 8, fontSize: 26, fontWeight: 800, color: "#1a5296" }}>
                  {plan.currency} {plan.amount}
                  <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 4 }}>/ {plan.billing_interval}</span>
                </p>
                <ul style={{ marginTop: 12, paddingLeft: 18, color: "#374151", fontSize: 13 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ marginBottom: 6 }}>{f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
