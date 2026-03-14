"use client";

import { useState } from "react";
import Link from "next/link";

export default function BookDemoPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-3xl px-6 py-14">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">Book a Demo</h1>
          <Link href="/" className="text-sm font-semibold text-[#1657ad] hover:underline">
            Back to website
          </Link>
        </div>

        {!submitted ? (
          <form
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            <p className="mb-5 text-sm text-slate-600">
              Share your details and we will contact you to schedule a personalised walkthrough.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full Name"><input required className={inputCls} /></Field>
              <Field label="Work Email"><input type="email" required className={inputCls} /></Field>
              <Field label="Company"><input required className={inputCls} /></Field>
              <Field label="Team Size"><input placeholder="e.g. 50 employees" className={inputCls} /></Field>
            </div>
            <Field label="What do you want help with?">
              <textarea className={`${inputCls} min-h-[90px] py-2`} />
            </Field>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="submit" className="rounded-xl bg-[#1657ad] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#13498f]">
                Submit request
              </button>
              <Link href="/pricing" className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                View pricing
              </Link>
            </div>
          </form>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
            <p className="text-base font-semibold">Thanks! Demo request submitted.</p>
            <p className="mt-1 text-sm">Our team will contact you shortly.</p>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#1657ad]";
