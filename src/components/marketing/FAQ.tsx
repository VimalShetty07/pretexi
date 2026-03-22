"use client";
import { useState } from "react";

const faqs = [
  { q: "How long does it take to set up Protexi?",             a: "Most teams are up and running within 48 hours. Our onboarding specialist guides you through importing worker data, configuring alert thresholds, and setting up your compliance calendar. No technical expertise required." },
  { q: "How does Protexi keep our data secure?",               a: "Protexi is hosted on ISO 27001 certified UK infrastructure. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). Fully GDPR compliant with a Data Processing Agreement on all paid plans." },
  { q: "Is Protexi aligned with UKVI requirements?",           a: "Yes. Built specifically around UK Visas and Immigration Sponsor Guidance. Every workflow, report template, and alert maps directly to Home Office expectations. We update instantly when UKVI guidance changes." },
  { q: "Can I upgrade or downgrade my plan at any time?",      a: "Absolutely. Upgrade instantly from the billing dashboard - features activate immediately. Downgrades take effect at the end of your billing cycle. No lock-in periods on Starter or Growth." },
  { q: "What happens if a worker's visa expiry is missed?",    a: "Protexi sends escalating alerts at 90, 60, 30, and 7 days before expiry. If an expiry passes without action, the profile is auto-flagged 'Action Required' and your HR admin receives an urgent notification." },
  { q: "Does Protexi integrate with our existing HR system?",  a: "Growth and Enterprise plans include API access. Enterprise includes pre-built connectors for Workday, BambooHR, HiBob, and major ATS systems. Custom integrations also available." },
  { q: "What support is available?",                           a: "Starter includes email support. Growth adds live chat. Enterprise includes a dedicated compliance account manager, phone support, and a guaranteed 4-hour response SLA." },
  { q: "Can I book a demo?",                                   a: "Yes. You can book a personalised demo and we will walk you through workflows, setup, and the best plan for your team." },
];

const leftColors = ["border-l-[#1657ad]","border-l-blue-600","border-l-blue-600","border-l-blue-600","border-l-blue-600","border-l-blue-600","border-l-[#1657ad]","border-l-blue-600"];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-28 bg-white relative overflow-hidden">
      <div className="absolute inset-0 dot-grid opacity-30" />
      <div className="absolute top-1/2 -translate-y-1/2 left-0 w-[400px] h-[400px] bg-blue-50 rounded-full blur-[120px] pointer-events-none opacity-80" />

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
            Got questions?<br /><span className="gradient-text-blue">We&apos;ve got answers.</span>
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i}
              className={`bg-white rounded-2xl overflow-hidden transition-all duration-300 ${open === i ? `border-l-4 ${leftColors[i]}` : ""}`}
              style={{ boxShadow: open === i ? "0 8px 32px rgba(22,87,173,0.12), 0 2px 8px rgba(0,0,0,0.04)" : "0 2px 8px rgba(22,87,173,0.06), 0 1px 3px rgba(0,0,0,0.03)", border: open === i ? undefined : "1px solid rgba(22,87,173,0.08)" }}>
              <button className="w-full flex items-center justify-between px-6 py-5 text-left gap-4" onClick={() => setOpen(open === i ? null : i)}>
                <span className={`text-base font-semibold transition-colors ${open === i ? "text-slate-900" : "text-slate-700"}`}>{faq.q}</span>
                <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${open === i ? "bg-[#1657ad] text-white rotate-45" : "bg-blue-50 text-[#1657ad]"}`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </span>
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
