"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Shield, CheckCircle2, BarChart3, FileCheck2, Loader2, Eye, EyeOff } from "lucide-react";

const FEATURES = [
  {
    icon: Shield,
    title: "Full Sponsor Compliance",
    desc: "Stay audit-ready with automated checks and real-time alerts.",
  },
  {
    icon: FileCheck2,
    title: "Document Management",
    desc: "Centralise visa documents and track renewals before they expire.",
  },
  {
    icon: BarChart3,
    title: "Live Compliance Dashboard",
    desc: "Monitor your entire workforce's compliance status at a glance.",
  },
];

export default function LoginPage() {
  const { login, loading: authLoading } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(identifier, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1657ad" }}>
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex w-[52%] relative overflow-hidden flex-col"
        style={{
          background: "linear-gradient(145deg, #0d4a96 0%, #1657ad 45%, #1e6ec7 100%)",
          minHeight: "100vh",
        }}
      >
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.06 }}>
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
                <path d="M 44 0 L 0 0 0 44" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        {/* Glow orbs */}
        <div className="absolute pointer-events-none" style={{ width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.09) 0%, transparent 70%)", top: -120, left: -120 }} />
        <div className="absolute pointer-events-none" style={{ width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)", bottom: -80, right: -80 }} />

        {/* Content — padded, fully visible */}
        <div className="relative z-10 flex flex-col h-full" style={{ padding: "48px 52px" }}>

          {/* Logo */}
          <div style={{ marginBottom: 52 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpeg"
              alt="Protexi"
              className="rounded-2xl"
              style={{ width: 160, height: 94, objectFit: "cover" }}
            />
          </div>

          {/* Hero */}
          <div className="flex-1" style={{ maxWidth: 440 }}>
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full"
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                padding: "5px 14px",
                marginBottom: 24,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block", flexShrink: 0 }} />
              <span className="text-white font-medium" style={{ fontSize: 12, letterSpacing: "0.02em" }}>
                Trusted by 500+ UK Sponsors
              </span>
            </div>

            {/* Headline */}
            <h1
              className="text-white font-bold leading-tight"
              style={{ fontSize: 36, marginBottom: 16, lineHeight: 1.2 }}
            >
              UK Sponsor Compliance,{" "}
              <span style={{ color: "#93c5fd" }}>Simplified.</span>
            </h1>

            <p className="leading-relaxed" style={{ color: "rgba(219,234,254,0.8)", fontSize: 15, marginBottom: 44 }}>
              Protexi gives HR teams a single platform to manage sponsored workers,
              track visa renewals, and stay audit-ready — effortlessly.
            </p>

            {/* Features */}
            <div className="flex flex-col" style={{ gap: 24, marginBottom: 48 }}>
              {FEATURES.map((f) => (
                <div key={f.title} className="flex items-start" style={{ gap: 16 }}>
                  <div
                    className="flex items-center justify-center rounded-xl shrink-0"
                    style={{
                      width: 42, height: 42,
                      background: "rgba(255,255,255,0.12)",
                      border: "1px solid rgba(255,255,255,0.18)",
                    }}
                  >
                    <f.icon style={{ width: 18, height: 18, color: "#93c5fd" }} />
                  </div>
                  <div>
                    <p className="text-white font-semibold" style={{ fontSize: 14, marginBottom: 3 }}>{f.title}</p>
                    <p style={{ color: "rgba(186,214,254,0.7)", fontSize: 13, lineHeight: 1.5 }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom trust badge */}
          <div
            className="flex items-center gap-3 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.14)",
              padding: "16px 20px",
            }}
          >
            <CheckCircle2 style={{ width: 20, height: 20, color: "#4ade80", flexShrink: 0 }} />
            <div>
              <p className="text-white font-semibold" style={{ fontSize: 13 }}>Home Office Compliant</p>
              <p style={{ color: "rgba(186,214,254,0.65)", fontSize: 12, marginTop: 2 }}>
                Meets all UK Visas &amp; Immigration record-keeping requirements
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div
        className="flex-1 flex flex-col"
        style={{ minHeight: "100vh", background: "#f5f7fa" }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden flex justify-center" style={{ paddingTop: 40, paddingBottom: 32 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpeg" alt="Protexi" className="rounded-xl" style={{ height: 64, objectFit: "cover" }} />
        </div>

        {/* Form centred vertically */}
        <div className="flex-1 flex items-center justify-center" style={{ padding: "40px 24px" }}>
          <div className="w-full" style={{ maxWidth: 420 }}>

            {/* Card */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: 24,
                padding: "40px 40px 36px",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.04), 0 20px 40px -8px rgba(22,87,173,0.10), 0 0 0 1px rgba(0,0,0,0.04)",
              }}
            >
              {/* Top accent bar */}
              <div
                style={{
                  height: 4,
                  width: 48,
                  borderRadius: 99,
                  background: "linear-gradient(90deg, #1657ad, #3b82f6)",
                  marginBottom: 28,
                }}
              />

              {/* Heading */}
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", marginBottom: 6, letterSpacing: "-0.3px" }}>
                  Welcome back 👋
                </h2>
                <p style={{ fontSize: 14, color: "#64748b" }}>
                  Sign in to continue to your workspace
                </p>
              </div>

              {/* Error */}
              {error && (
                <div
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    background: "#fef2f2", border: "1px solid #fecaca",
                    borderRadius: 12, padding: "12px 16px",
                    fontSize: 13, color: "#b91c1c", marginBottom: 20,
                  }}
                >
                  <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                {/* ID field */}
                <div>
                  <label htmlFor="identifier" style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 7 }}>
                    Employee ID or Email
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                      color: "#94a3b8", fontSize: 15, pointerEvents: "none",
                    }}>
                      ✉
                    </span>
                    <input
                      id="identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="EMP001 or name@company.com"
                      required
                      autoComplete="username"
                      style={{
                        width: "100%", height: 48, paddingLeft: 40, paddingRight: 16,
                        fontSize: 14, borderRadius: 12,
                        border: "1.5px solid #e2e8f0",
                        background: "#f8fafc", color: "#0f172a",
                        outline: "none", transition: "all 0.2s",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#1657ad";
                        e.target.style.background = "#fff";
                        e.target.style.boxShadow = "0 0 0 3px rgba(22,87,173,0.09)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#e2e8f0";
                        e.target.style.background = "#f8fafc";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  </div>
                </div>

                {/* Password field */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                    <label htmlFor="password" style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
                      Password
                    </label>
                    <a href="#" style={{ fontSize: 12, fontWeight: 500, color: "#1657ad", textDecoration: "none" }}>
                      Forgot password?
                    </a>
                  </div>
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                      color: "#94a3b8", fontSize: 15, pointerEvents: "none",
                    }}>
                      🔒
                    </span>
                    <input
                      id="password"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      style={{
                        width: "100%", height: 48, paddingLeft: 40, paddingRight: 48,
                        fontSize: 14, borderRadius: 12,
                        border: "1.5px solid #e2e8f0",
                        background: "#f8fafc", color: "#0f172a",
                        outline: "none", transition: "all 0.2s",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#1657ad";
                        e.target.style.background = "#fff";
                        e.target.style.boxShadow = "0 0 0 3px rgba(22,87,173,0.09)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#e2e8f0";
                        e.target.style.background = "#f8fafc";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      style={{
                        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer", color: "#94a3b8",
                        display: "flex", alignItems: "center",
                      }}
                    >
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%", height: 50, marginTop: 6,
                    borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer",
                    fontSize: 15, fontWeight: 600, color: "#fff",
                    background: loading
                      ? "#5a8fd6"
                      : "linear-gradient(135deg, #1251a3 0%, #1e6ec7 100%)",
                    boxShadow: loading ? "none" : "0 4px 14px rgba(22,87,173,0.4), 0 1px 3px rgba(0,0,0,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all 0.2s",
                    opacity: loading ? 0.75 : 1,
                  }}
                >
                  {loading ? (
                    <><Loader2 size={17} className="animate-spin" />Signing in...</>
                  ) : (
                    <>Sign in &nbsp;→</>
                  )}
                </button>
              </form>

              {/* Divider + CTA */}
              <div style={{ marginTop: 24, paddingTop: 22, borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "#94a3b8" }}>
                  New to Protexi?{" "}
                  <a href="#" style={{ color: "#1657ad", fontWeight: 600, textDecoration: "none" }}>
                    Request a demo →
                  </a>
                </p>
              </div>
            </div>

            {/* Security note below card */}
            <div
              style={{
                marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, color: "#94a3b8", fontSize: 12,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Secured with 256-bit encryption</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "#cbd5e1" }}>
            © 2025 Protexi Ltd.&nbsp;·&nbsp;
            <a href="#" style={{ color: "#94a3b8", textDecoration: "none" }}>Privacy</a>
            &nbsp;·&nbsp;
            <a href="#" style={{ color: "#94a3b8", textDecoration: "none" }}>Terms</a>
          </p>
        </div>
      </div>
    </div>
  );
}
