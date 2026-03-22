"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  UserRound,
  Lock,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export default function LoginPage() {
  const { login, loading: authLoading } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(identifier, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="login-bg relative flex min-h-dvh items-center justify-center overflow-hidden">
        <div className="login-orb login-orb-1 pointer-events-none" aria-hidden />
        <div className="login-orb login-orb-2 pointer-events-none" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <Loader2 className="relative z-10 h-10 w-10 animate-spin text-white/90" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="login-page-root login-bg relative grid min-h-dvh w-full place-items-center overflow-x-hidden overflow-y-auto">
      <div className="login-orb login-orb-1 pointer-events-none" aria-hidden />
      <div className="login-orb login-orb-2 pointer-events-none" aria-hidden />
      <div className="login-orb login-orb-3 pointer-events-none hidden sm:block" aria-hidden />
      <div className="login-orb login-orb-4 pointer-events-none hidden md:block" aria-hidden />

      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 w-[min(100%,430px)] min-w-0 py-safe animate-slide-up">
        <div className="glass-card login-glass-panel login-glass-shell w-full min-w-0 text-left shadow-[0_32px_64px_-18px_rgba(0,0,0,0.45)]">
          {/* Accent rail */}
          <div
            className="h-1.5 w-full bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-600"
            aria-hidden
          />

          <div className="login-glass-shell-inner flex min-w-0 flex-col gap-7">
            {/* Brand row */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/"
                className="inline-flex w-fit shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.svg"
                  alt="Protexi"
                  width={200}
                  height={60}
                  className="h-9 w-auto max-w-[min(100%,200px)] object-contain object-left sm:h-10"
                  decoding="async"
                />
              </Link>
              <Link
                href="/"
                className="group inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-sky-100/90 backdrop-blur-sm transition hover:border-white/25 hover:bg-white/10 hover:text-white sm:self-auto"
              >
                <ArrowLeft className="h-3.5 w-3.5 shrink-0 transition group-hover:-translate-x-0.5" aria-hidden />
                Back
              </Link>
            </div>

            {/* Title stack */}
            <header className="min-w-0 space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sky-200/95">
                <Sparkles className="h-3.5 w-3.5 text-sky-300" aria-hidden />
                Workspace
              </span>
              <div className="space-y-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-[1.75rem] sm:leading-tight">
                  Sign in to Protexi
                </h1>
                <p className="max-w-[40ch] text-[0.9375rem] leading-relaxed text-white/65">
                  Enter your employee ID or email and password to open your sponsor compliance dashboard.
                </p>
              </div>
            </header>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-400/40 bg-red-500/[0.12] px-4 py-3 text-sm leading-snug text-red-100 backdrop-blur-sm"
              >
                {error}
              </div>
            )}

            {/* Form panel */}
            <div className="login-form-surface px-5 py-6 sm:px-6 sm:py-7">
              <form onSubmit={onSubmit} className="flex min-w-0 flex-col gap-5">
                <div className="min-w-0">
                  <label
                    htmlFor="login-identifier"
                    className="mb-2 block text-[0.8125rem] font-semibold text-white/80"
                  >
                    Employee ID or email
                  </label>
                  <div className="login-input-wrap flex min-w-0 items-stretch gap-0 overflow-hidden rounded-[0.875rem] border border-white/12 bg-[rgba(6,20,45,0.35)] transition-[border-color,box-shadow] focus-within:border-sky-400/45 focus-within:shadow-[0_0_0_3px_rgba(56,189,248,0.15)]">
                    <span className="flex shrink-0 items-center justify-center border-r border-white/10 bg-white/[0.04] px-3.5">
                      <UserRound className="login-field-icon h-[1.125rem] w-[1.125rem]" aria-hidden />
                    </span>
                    <input
                      id="login-identifier"
                      autoComplete="username"
                      className="login-input-v2 min-h-[3rem] min-w-0 flex-1 border-0 bg-transparent px-3.5 py-2.5 text-[15px] leading-normal placeholder:text-white/35 focus:ring-0"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. EMP001 or you@company.com"
                      required
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <label
                    htmlFor="login-password"
                    className="mb-2 block text-[0.8125rem] font-semibold text-white/80"
                  >
                    Password
                  </label>
                  <div className="login-input-wrap flex min-w-0 items-stretch gap-0 overflow-hidden rounded-[0.875rem] border border-white/12 bg-[rgba(6,20,45,0.35)] transition-[border-color,box-shadow] focus-within:border-sky-400/45 focus-within:shadow-[0_0_0_3px_rgba(56,189,248,0.15)]">
                    <span className="flex shrink-0 items-center justify-center border-r border-white/10 bg-white/[0.04] px-3.5">
                      <Lock className="login-field-icon h-[1.125rem] w-[1.125rem]" aria-hidden />
                    </span>
                    <input
                      id="login-password"
                      autoComplete="current-password"
                      className="login-input-v2 min-h-[3rem] min-w-0 flex-1 border-0 bg-transparent py-2.5 pl-3.5 pr-2 text-[15px] leading-normal placeholder:text-white/35 focus:ring-0"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      type={showPw ? "text" : "password"}
                      required
                    />
                    <div className="flex shrink-0 items-center pr-2">
                      <button
                        type="button"
                        className="rounded-lg p-2 text-white/50 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
                        onClick={() => setShowPw((v) => !v)}
                        aria-label={showPw ? "Hide password" : "Show password"}
                      >
                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="login-submit-v2 mt-1 flex min-h-[3.25rem] w-full items-center justify-center gap-2 text-[15px] font-bold text-white disabled:pointer-events-none disabled:opacity-55"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>
            </div>

            <p className="text-center text-[0.75rem] leading-relaxed text-white/40">
              Secure access for authorised organisation users only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
