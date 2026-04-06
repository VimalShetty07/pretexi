"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff, Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import "@/app/login/protexi-login.css";

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const emailParam = searchParams.get("email")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token || !emailParam) {
      setError("Invalid invite link. Check your email for the full link.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.post<{ status: string }>("/portal/bootstrap", {
        token,
        email: emailParam,
        password,
        full_name: fullName.trim() || null,
      });
      setDone(true);
      setTimeout(() => router.push("/login?invited=1"), 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not complete setup.");
    } finally {
      setLoading(false);
    }
  };

  if (!token || !emailParam) {
    return (
      <div className="protexi-login">
        <header className="login-topnav">
          <Link href="/" className="login-brand" aria-label="Protexi home">
            <Image src="/logo.png" alt="Protexi" width={48} height={48} priority />
          </Link>
        </header>
        <div className="login-shell">
          <div className="login-card" style={{ maxWidth: 480 }}>
            <div className="login-card-inner">
              <div className="login-alert" role="alert">
                This invite link is incomplete. Open the link from your invitation email, or ask your platform contact
                to resend the invite.
              </div>
              <Link href="/login" className="login-submit" style={{ textAlign: "center", textDecoration: "none" }}>
                Go to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="protexi-login">
        <div className="login-shell">
          <div className="login-card" style={{ maxWidth: 480 }}>
            <div className="login-card-inner" style={{ textAlign: "center" }}>
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" aria-hidden />
              <h1 className="mt-4 text-xl font-semibold text-white" style={{ fontFamily: "var(--font-outfit)" }}>
                Password set
              </h1>
              <p className="mt-2 text-sm text-white/70">Redirecting to sign in…</p>
            </div>
          </div>
        </div>
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
          <Link href="/login" className="login-btn-outline">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Sign in
          </Link>
        </div>
      </header>

      <div className="login-shell">
        <aside className="login-aside">
          <div className="login-aside-badge">
            <span className="login-aside-badge-dot" />
            Tenant admin
          </div>
          <h2>
            Set your password to
            <br />
            <em>activate your account.</em>
          </h2>
          <p>
            Use a strong password you have not used elsewhere. After this step you can sign in to your organisation
            workspace.
          </p>
        </aside>

        <div className="login-card">
          <div className="login-card-top">
            <div className="login-card-top-label">Invite</div>
            <div className="login-card-top-title">Complete your account</div>
          </div>
          <div className="login-card-inner">
            <div className="login-card-header">
              <h1>Welcome</h1>
              <p className="break-all text-sm opacity-90">{emailParam}</p>
            </div>

            {error && (
              <div className="login-alert" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="login-form">
              <div>
                <label htmlFor="invite-name" className="login-label">
                  Full name (optional)
                </label>
                <div className="login-field">
                  <input
                    id="invite-name"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="As shown on your account"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="invite-password" className="login-label">
                  New password
                </label>
                <div className="login-field">
                  <span className="login-field-icon-wrap">
                    <Lock className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <input
                    id="invite-password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    type={showPw ? "text" : "password"}
                    required
                    minLength={8}
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

              <div>
                <label htmlFor="invite-confirm" className="login-label">
                  Confirm password
                </label>
                <div className="login-field">
                  <span className="login-field-icon-wrap">
                    <Lock className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <input
                    id="invite-confirm"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    type={showPw ? "text" : "password"}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="login-submit">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  "Set password & continue"
                )}
              </button>
            </form>

            <p className="login-footnote">Link expires in 7 days · Secure setup</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="protexi-login login-loading" role="status">
          <Loader2 className="login-loading-spinner h-10 w-10 animate-spin" aria-label="Loading" />
        </div>
      }
    >
      <AcceptInviteForm />
    </Suspense>
  );
}
