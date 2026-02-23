"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

export default function LoginPage() {
  const { login, loading: authLoading } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(identifier, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center login-bg">
        <div className="glass-card px-10 py-6">
          <p className="text-white/70 text-sm tracking-wide">Loading&hellip;</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center login-bg relative overflow-hidden px-6 py-10">
      {/* Animated orbs */}
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />
      <div className="login-orb login-orb-4" />

      {/* Watermark logo blended into BG */}
      <span
        className="logo-watermark absolute text-[clamp(6rem,22vw,16rem)]"
        style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
        aria-hidden
      >
        Protexi
      </span>

      {/* ── Glass card ── */}
      <div className="w-full max-w-[440px] relative z-10 animate-slide-up">
        <div className="glass-card" style={{ padding: "40px 36px 36px" }}>

          {/* Logo */}
          <div className="flex items-center justify-center" style={{ marginBottom: 32 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="Protexi"
              style={{ width: 200, height: 60 }}
            />
          </div>

          {/* Subtitle */}
          <p
            className="text-center font-medium text-white/55 uppercase tracking-widest"
            style={{ fontSize: 12, letterSpacing: "0.12em", marginBottom: 28 }}
          >
            Sign in to your account
          </p>

          {error && (
            <div
              className="rounded-2xl bg-red-500/15 border border-red-400/25 text-red-200"
              style={{ padding: "12px 16px", fontSize: 13, marginBottom: 20 }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label htmlFor="identifier" className="block font-medium text-white/60" style={{ fontSize: 13, marginBottom: 8 }}>
                ID
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Employee ID or email"
                required
                className="glass-field w-full"
                style={{ padding: "12px 16px", fontSize: 14 }}
              />
            </div>

            <div>
              <label htmlFor="password" className="block font-medium text-white/60" style={{ fontSize: 13, marginBottom: 8 }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="glass-field w-full"
                style={{ padding: "12px 16px", fontSize: 14 }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="glass-cta w-full text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ padding: "12px 16px", fontSize: 14, marginTop: 4 }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Footer */}
          <div className="border-t border-white/[0.08]" style={{ marginTop: 28, paddingTop: 24 }}>
            <p className="text-center text-white/35" style={{ fontSize: 13 }}>
              Don&apos;t have an account?{" "}
              <a href="#" className="text-white/60 hover:text-white font-medium transition-colors">
                Contact Sales
              </a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
