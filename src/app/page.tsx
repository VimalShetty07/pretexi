"use client";

import Link from "next/link";

export default function MarketingHomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Protexi" className="h-8 w-auto" />
            <span className="text-sm font-semibold text-slate-700">Protexi</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-[#1657ad]">Features</a>
            <a href="/pricing" className="text-sm font-semibold text-slate-600 hover:text-[#1657ad]">Pricing</a>
            <Link href="/book-demo" className="text-sm font-semibold text-slate-600 hover:text-[#1657ad]">Book Demo</Link>
            <Link href="/login" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-30" />
        <div className="absolute -left-28 -top-24 h-72 w-72 rounded-full bg-blue-100 blur-3xl" />
        <div className="absolute -right-24 top-8 h-64 w-64 rounded-full bg-sky-100 blur-3xl" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="text-4xl font-black leading-tight text-[#1657ad] md:text-6xl">
              UK Sponsor Compliance, Simplified.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-600">
              Run visa tracking, document workflows, and compliance reporting from one platform.
              Built for UK sponsor licence teams that need speed and audit readiness.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book-demo" className="btn-primary px-6 py-3 text-sm">
                Book a Demo
              </Link>
              <Link href="/pricing" className="btn-secondary px-6 py-3 text-sm">
                View Pricing
              </Link>
              <Link href="/login" className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Login to SaaS
              </Link>
            </div>
          </div>
          <div className="card-l2 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live Platform Snapshot</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Stat label="Active Workers" value="142" tone="text-blue-700" />
              <Stat label="Visa Expiring Soon" value="7" tone="text-amber-700" />
              <Stat label="Pending Docs" value="23" tone="text-indigo-700" />
              <Stat label="Compliance Score" value="97%" tone="text-emerald-700" />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-slate-100 bg-slate-50/50 py-16">
        <div className="mx-auto w-full max-w-7xl px-6">
          <h2 className="text-3xl font-bold text-slate-900">Why teams choose Protexi</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Feature title="Visa Expiry Tracking" desc="Alerts at 90/60/30/7 days with clear owner visibility." />
            <Feature title="Document Control" desc="Role-based checklists with upload history and review statuses." />
            <Feature title="Audit-Ready Reporting" desc="Real-time dashboard and exportable records for inspections." />
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} Protexi Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/book-demo" className="text-slate-600 hover:text-[#1657ad]">Book Demo</Link>
            <Link href="/pricing" className="text-slate-600 hover:text-[#1657ad]">Pricing</Link>
            <Link href="/login" className="text-slate-600 hover:text-[#1657ad]">Login</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{desc}</p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-black ${tone}`}>{value}</p>
    </div>
  );
}
