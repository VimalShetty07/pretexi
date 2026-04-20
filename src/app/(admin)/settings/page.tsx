"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Loader2, UserPlus, Users, UserCheck, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast-provider";
import "../dashboard/dashboard-marketing.css";
import "../workers/workers-page.css";

interface UserItem {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  worker_id?: string | null;
}

interface WorkerItem {
  id: string;
  name: string;
}

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

export default function SettingsPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("hr_officer");
  const [workerId, setWorkerId] = useState("");
  const [saving, setSaving] = useState(false);
  const [resettingPrefs, setResettingPrefs] = useState(false);
  const isTenantAdmin = user?.role === "tenant_admin";
  const canLinkOrgEmploymentStatuses =
    user?.role === "tenant_admin" ||
    user?.role === "compliance_manager" ||
    user?.role === "super_admin" ||
    user?.role === "hr_officer";

  const resetViewPreferences = async () => {
    try {
      setResettingPrefs(true);
      const keys = [
        "protexi-workers-table-density",
        "protexi-leave-table-density",
        "protexi-worker-stars",
      ];
      for (const key of keys) {
        localStorage.removeItem(key);
      }
      showToast("View preferences reset. Reloading current page…", "success");
      window.setTimeout(() => window.location.reload(), 500);
    } catch {
      showToast("Could not reset preferences on this device.", "error");
    } finally {
      setResettingPrefs(false);
    }
  };

  const load = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const [u, w] = await Promise.all([
        api.get<UserItem[]>("/auth/users", token),
        api.get<WorkerItem[]>("/workers", token),
      ]);
      setUsers(u);
      setWorkers(w);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const createUser = async () => {
    if (!token || !fullName || !email || !password) return;
    try {
      setSaving(true);
      setError("");
      await api.post(
        "/auth/users",
        {
          full_name: fullName,
          email,
          password,
          role: isTenantAdmin ? "hr_officer" : role,
          worker_id: role === "employee" ? workerId || null : null,
        },
        token
      );
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("hr_officer");
      setWorkerId("");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: UserItem) => {
    if (!token) return;
    try {
      setError("");
      await api.patch(`/auth/users/${u.id}`, { is_active: !u.is_active }, token);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update user");
    }
  };

  const todayStr = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    []
  );

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active).length;
  const hrUsers = users.filter((u) => u.role === "hr_officer").length;

  if (!token) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Sign in to manage settings.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Loading settings…
        </p>
      </div>
    );
  }

  return (
    <div className="protexi-dash-marketing flex flex-col gap-0">
      {error && (
        <div className="mb-3 border border-red-200 bg-red-50 text-red-700" style={{ padding: "10px 12px", fontSize: 12, ...MONO }}>
          {error}
        </div>
      )}

      <div className="adm-ph">
        <div className="min-w-0">
          <div className="adm-ph-ey">Administration</div>
          <h1 className="adm-ph-title">
            Settings <em className="dash-title-em">& access</em>
          </h1>
          <div className="adm-ph-date">{todayStr}</div>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#64748b]">
            {isTenantAdmin
              ? "HR user management for your tenant organisation."
              : "Create internal users, assign roles, and control portal access."}
            {canLinkOrgEmploymentStatuses ? (
              <>
                {" "}
                To configure which <strong className="text-[#475569]">Status</strong> labels apply to every employee
                (Active, Inactive, Finished, and custom values), open{" "}
                <Link href="/organisation#employment-statuses" className="font-semibold text-[#1a4fa0] underline-offset-2 hover:underline">
                  Organisation
                </Link>
                → Employment statuses.
              </>
            ) : null}
          </p>
        </div>
        <span
          className="adm-ph-badge inline-flex items-center gap-2 border border-[rgba(26,79,160,0.25)] bg-[rgba(26,79,160,0.06)] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#0f2d5e]"
          style={MONO}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {(user?.role ?? "admin").replaceAll("_", " ")}
        </span>
      </div>

      <div className="adm-stat-row grid grid-cols-1 sm:grid-cols-3" style={{ gap: 2, background: "rgba(0,0,0,0.07)", marginBottom: 16 }}>
        <div className="adm-sc adm-sc-b bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b">
              <Users className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Accounts</span>
          </div>
          <div className="adm-sc-num">{totalUsers}</div>
          <div className="adm-sc-lbl">Total users</div>
          <div className="adm-sc-sub">Provisioned</div>
        </div>
        <div className="adm-sc adm-sc-p bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-p">
              <UserCheck className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Live</span>
          </div>
          <div className="adm-sc-num">{activeUsers}</div>
          <div className="adm-sc-lbl">Active</div>
          <div className="adm-sc-sub">Can sign in</div>
        </div>
        <div className="adm-sc adm-sc-a bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-a">
              <ShieldCheck className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">HR</span>
          </div>
          <div className="adm-sc-num">{hrUsers}</div>
          <div className="adm-sc-lbl">HR officers</div>
          <div className="adm-sc-sub">Role count</div>
        </div>
      </div>

      <div className="wem-surface">
        <div className="wem-toolbar">
          <span className="flex min-w-0 items-center gap-2 text-[11px] font-extrabold text-[#0a0a0a]">
            <UserPlus className="h-4 w-4 shrink-0 text-[var(--dash-blue)]" />
            {isTenantAdmin ? "Add HR user" : "Create user"}
          </span>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
          <p className="text-[12px] leading-relaxed text-[#64748b]" style={{ marginBottom: 12 }}>
            {isTenantAdmin
              ? "Tenant admins can only create HR users in their own organisation."
              : "Create internal users and assign portal access roles. Employees can be linked to a worker record."}
          </p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={MONO}>
                Full name
              </span>
              <input
                className="h-9 w-full border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[13px] text-[#0a0a0a] outline-none focus:border-[var(--dash-blue)]"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={MONO}>
                Email
              </span>
              <input
                className="h-9 w-full border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[13px] text-[#0a0a0a] outline-none focus:border-[var(--dash-blue)]"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={MONO}>
                Password
              </span>
              <input
                className="h-9 w-full border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[13px] text-[#0a0a0a] outline-none focus:border-[var(--dash-blue)]"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={MONO}>
                Role
              </span>
              {isTenantAdmin ? (
                <input
                  className="h-9 w-full border border-[rgba(0,0,0,0.08)] bg-[var(--dash-card)] px-3 text-[13px] text-[#64748b]"
                  value="HR Officer"
                  disabled
                  readOnly
                />
              ) : (
                <select
                  className="h-9 w-full border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[13px] text-[#0a0a0a] outline-none focus:border-[var(--dash-blue)]"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="hr_officer">HR Officer</option>
                  <option value="employee">Employee</option>
                  <option value="compliance_manager">Compliance Manager</option>
                  <option value="payroll_officer">Payroll Officer</option>
                  <option value="inspector">Inspector</option>
                </select>
              )}
            </label>
            {role === "employee" && (
              <label className="grid gap-1 md:col-span-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={MONO}>
                  Linked worker
                </span>
                <select
                  className="h-9 w-full border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[13px] text-[#0a0a0a] outline-none focus:border-[var(--dash-blue)]"
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                >
                  <option value="">Select linked worker</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <button
            type="button"
            onClick={createUser}
            disabled={saving}
            className="mt-4 inline-flex h-9 items-center gap-2 border border-[rgba(0,0,0,0.12)] bg-[#0f2d5e] px-4 text-[9px] font-bold uppercase tracking-[0.07em] text-white hover:bg-[#1a4fa0] disabled:opacity-50"
            style={MONO}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {saving ? "Creating…" : "Create user"}
          </button>
        </div>
      </div>

      <div className="mt-4 wem-surface">
        <div className="wem-toolbar">
          <span className="text-[11px] font-extrabold text-[#0a0a0a]">{isTenantAdmin ? "HR users" : "Existing users"}</span>
          <span className="wem-badge-mono" style={MONO}>
            {users.length} account{users.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="adm-ae-icon">
                <Users className="h-5 w-5" />
              </div>
              <div className="adm-ae-t mt-3">No users yet</div>
              <div className="adm-ae-s">Create the first account using the form above.</div>
            </div>
          ) : (
            <div className="grid gap-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-col gap-3 border border-[rgba(0,0,0,0.08)] bg-[#f8fafc] p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#0a0a0a]">{u.full_name}</p>
                    <p className="truncate text-[12px] text-[#64748b]" style={MONO}>
                      {u.email}
                    </p>
                    <span
                      className="mt-2 inline-flex border border-[rgba(26,79,160,0.2)] bg-[rgba(26,79,160,0.06)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e]"
                      style={MONO}
                    >
                      {u.role.replaceAll("_", " ")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleActive(u)}
                    className={`h-8 shrink-0 border px-3 text-[9px] font-bold uppercase tracking-[0.07em] transition-colors ${
                      u.is_active
                        ? "border-[rgba(22,163,74,0.35)] bg-[#f0fdf4] text-[#166534] hover:bg-[rgba(22,163,74,0.12)]"
                        : "border-[rgba(220,38,38,0.35)] bg-[rgba(254,242,242,0.85)] text-[#991b1b] hover:bg-[rgba(254,242,242,1)]"
                    }`}
                    style={MONO}
                  >
                    {u.is_active ? "Active" : "Inactive"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 wem-surface">
        <div className="wem-toolbar">
          <span className="text-[11px] font-extrabold text-[#0a0a0a]">Personal UI preferences</span>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
          <p className="text-[12px] leading-relaxed text-[#64748b]" style={{ marginBottom: 12 }}>
            Reset locally saved view preferences for this browser, including table density and starred worker cards.
          </p>
          <button
            type="button"
            onClick={resetViewPreferences}
            disabled={resettingPrefs}
            className="inline-flex h-9 items-center gap-2 border border-[rgba(0,0,0,0.12)] bg-[#0f2d5e] px-4 text-[9px] font-bold uppercase tracking-[0.07em] text-white hover:bg-[#1a4fa0] disabled:opacity-50"
            style={MONO}
          >
            {resettingPrefs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {resettingPrefs ? "Resetting…" : "Reset view preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
