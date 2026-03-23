"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Eye, EyeOff, ArrowLeft, UserRound, Lock } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import "./protexi-login.css";

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
      <div className="protexi-login login-loading" role="status" aria-live="polite">
        <Loader2 className="login-loading-spinner h-10 w-10 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="protexi-login">
      <header className="login-topnav">
        <Link href="/" className="login-brand" aria-label="Protexi home">
          <Image src="/logo.png" alt="Protexi" width={48} height={48} priority />
        </Link>
        <div className="login-topnav-actions">
          <Link href="/" className="login-btn-outline">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back
          </Link>
          <Link href="/book-demo" className="login-btn-fill">
            Book a Demo
          </Link>
        </div>
      </header>

      <div className="login-shell">
        <aside className="login-aside">
          <div className="login-aside-badge">
            <span className="login-aside-badge-dot" />
            UK Sponsor Compliance
          </div>
          <h2>
            Sign in to your
            <br />
            <em>compliance workspace.</em>
          </h2>
          <p>
            Visa expiry tracking, document checklists, and UKVI-ready records — all in one secure dashboard for your
            organisation.
          </p>
          <div className="login-aside-pills">
            <span className="login-pill">UK-hosted data</span>
            <span className="login-pill">Role-based access</span>
            <span className="login-pill">Audit-ready</span>
          </div>
        </aside>

        <div className="login-card">
          <div className="login-card-top">
            <div className="login-card-top-label">Secure access</div>
            <div className="login-card-top-title">Workspace sign-in</div>
          </div>
          <div className="login-card-inner">
            <div className="login-card-header">
              <h1>Welcome back</h1>
              <p>Use your employee ID or work email and password to open your dashboard.</p>
            </div>

            {error && (
              <div className="login-alert" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="login-form">
              <div>
                <label htmlFor="login-identifier" className="login-label">
                  Employee ID or email
                </label>
                <div className="login-field">
                  <span className="login-field-icon-wrap">
                    <UserRound className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <input
                    id="login-identifier"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. EMP001 or you@company.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="login-label">
                  Password
                </label>
                <div className="login-field">
                  <span className="login-field-icon-wrap">
                    <Lock className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <input
                    id="login-password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    type={showPw ? "text" : "password"}
                    required
                  />
                  <div className="login-field-toggle">
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading} className="login-submit">
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

            <p className="login-footnote">Authorised organisation users only · Encrypted session</p>
          </div>
        </div>
      </div>
    </div>
  );
}
