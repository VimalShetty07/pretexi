"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { pricingPlans, featureMatrix, premiumAddons } from "@/components/marketing/pricing-data";
import Card3D from "./Card3D";

function Check({ active }: { active: boolean }) {
  return active ? (
    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 border border-blue-200">
      <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    </span>
  ) : (
    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100">
      <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </span>
  );
}

export default function Pricing() {
  const [userCount, setUserCount] = useState(25);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const addonsTotal = useMemo(
    () => premiumAddons.filter((a) => selectedAddons.includes(a.code)).reduce((sum, a) => sum + a.amount, 0),
    [selectedAddons]
  );

  const quoteByPlan = useMemo(() => {
    return pricingPlans.reduce<Record<string, { overageUsers: number; overageAmount: number; total: number }>>((acc, plan) => {
      const included = plan.includedUsers ?? userCount;
      const overageUsers = Math.max(0, userCount - included);
      const overageAmount = overageUsers * plan.extraUserPrice;
      const total = plan.baseAmount + overageAmount + addonsTotal;
      acc[plan.name] = { overageUsers, overageAmount, total };
      return acc;
    }, {});
  }, [addonsTotal, userCount]);

  const recommendedPlan = useMemo(() => {
    if (userCount <= 25) return "Starter";
    if (userCount <= 100) return "Growth";
    return "Enterprise";
  }, [userCount]);

  const toggleAddon = (code: string) => {
    setSelectedAddons((prev) => (prev.includes(code) ? prev.filter((v) => v !== code) : [...prev, code]));
  };

  return (
    <section id="pricing" className="py-28 bg-white relative overflow-hidden">
      <div className="absolute inset-0 dot-grid opacity-30" />
      <div className="absolute top-0 right-1/4 w-[600px] h-[500px] bg-blue-50 rounded-full blur-[140px] pointer-events-none opacity-80" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[400px] bg-blue-50 rounded-full blur-[120px] pointer-events-none opacity-80" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
            Plans that grow<br /><span className="gradient-text">with your team.</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">No hidden fees. No per-user surprises. Transparent pricing for every team size.</p>
        </div>

        <div className="card-l2 p-5 md:p-6 mb-12">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pricing Estimator</p>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Size-based with optional premium features</h3>
              <p className="text-sm text-slate-500 mt-1">Recommended plan: <span className="font-semibold text-[#1657ad]">{recommendedPlan}</span></p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
              <p className="text-xs text-blue-700 font-semibold">Users</p>
              <input
                type="number"
                min={1}
                value={userCount}
                onChange={(e) => setUserCount(Math.max(1, Number(e.target.value || 1)))}
                className="mt-1 w-24 rounded-md border border-blue-200 bg-white px-2 py-1 text-sm text-blue-900 outline-none"
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {premiumAddons.map((addon) => (
              <label key={addon.code} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 cursor-pointer">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{addon.name}</p>
                  <p className="text-xs text-slate-500">+£{addon.amount}/month</p>
                </div>
                <input
                  type="checkbox"
                  checked={selectedAddons.includes(addon.code)}
                  onChange={() => toggleAddon(addon.code)}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-center mb-20">
          {pricingPlans.map((plan, i) => {
            const hi = plan.highlighted;
            const quote = quoteByPlan[plan.name] || { overageUsers: 0, overageAmount: 0, total: plan.baseAmount };
            return hi ? (
              <div key={plan.name} className="relative rounded-3xl p-7 flex flex-col scale-[1.05]"
                style={{
                  background: "linear-gradient(145deg, #1a6bc4 0%, #1657ad 40%, #0e3f82 100%)",
                  boxShadow: "0 24px 80px rgba(22,87,173,0.45), 0 8px 24px rgba(22,87,173,0.3), 0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}>
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-white text-[#1657ad] font-black text-xs px-5 py-1.5 rounded-full"
                      style={{ boxShadow: "0 4px 20px rgba(22,87,173,0.3)" }}>✦ {plan.badge}</span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-black text-white mb-1">{plan.name}</h3>
                  <p className="text-sm text-blue-200 mb-5">{plan.description}</p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    <span className="text-blue-200 mb-1">{plan.period}</span>
                  </div>
                  <p className="text-xs text-blue-200 font-medium">{plan.teamSize}</p>
                  <p className="text-xs text-blue-100 mt-2">
                    Est. total for {userCount} users: <span className="font-bold">£{quote.total.toFixed(0)}/month</span>
                  </p>
                  {quote.overageUsers > 0 && (
                    <p className="text-[11px] text-blue-200 mt-1">
                      Includes {quote.overageUsers} extra user(s): +£{quote.overageAmount.toFixed(0)}
                    </p>
                  )}
                </div>
                <div className="h-px bg-white/15 mb-6" />
                <ul className="space-y-2.5 flex-1 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <svg className="w-4 h-4 mt-0.5 shrink-0 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-blue-50">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/book-demo" className="w-full text-center bg-white text-[#1657ad] font-black py-3.5 rounded-xl text-sm block transition-all hover:-translate-y-1"
                  style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>{plan.cta}</Link>
              </div>
            ) : (
              <Card3D key={plan.name}
                className={`card-l2 border-t-4 ${i === 2 ? "border-t-blue-600" : "border-t-slate-200"}`}
                shadowColor={i === 2 ? "rgba(22,87,173,0.12)" : "rgba(22,87,173,0.1)"}
                intensity={8}>
                <div className="p-7 flex flex-col">
                  <div className="mb-6">
                    <h3 className="text-xl font-black text-slate-900 mb-1">{plan.name}</h3>
                    <p className="text-sm text-slate-500 mb-5">{plan.description}</p>
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                      <span className="text-slate-400 mb-1">{plan.period}</span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium">{plan.teamSize}</p>
                  <p className="text-xs text-slate-600 mt-2">
                    Est. total for {userCount} users: <span className="font-bold text-[#1657ad]">£{quote.total.toFixed(0)}/month</span>
                  </p>
                  {quote.overageUsers > 0 && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Includes {quote.overageUsers} extra user(s): +£{quote.overageAmount.toFixed(0)}
                    </p>
                  )}
                  </div>
                  <div className="divider-gradient mb-6" />
                  <ul className="space-y-2.5 flex-1 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <svg className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-slate-600">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/book-demo" className="btn-primary w-full justify-center text-sm py-3.5">{plan.cta}</Link>
                </div>
              </Card3D>
            );
          })}
        </div>

        <div className="card-l2 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-900">Full Feature Comparison</h3>
            <p className="text-sm text-slate-500 mt-1">See exactly what&apos;s included in each plan</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-500">Feature</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-500">Starter</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-[#1657ad] bg-blue-50/60">Growth</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-blue-700">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {featureMatrix.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                    <td className="px-6 py-3.5 text-sm font-medium text-slate-700">{row.feature}</td>
                    <td className="px-6 py-3.5 text-center"><div className="flex justify-center"><Check active={row.starter} /></div></td>
                    <td className="px-6 py-3.5 text-center bg-blue-50/30"><div className="flex justify-center"><Check active={row.growth} /></div></td>
                    <td className="px-6 py-3.5 text-center"><div className="flex justify-center"><Check active={row.enterprise} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
