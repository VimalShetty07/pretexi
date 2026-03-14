"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { UserPlus, Users, UserCheck, ShieldCheck } from "lucide-react";

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

export default function SettingsPage() {
  const { token, user } = useAuth();
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
  const isTenantAdmin = user?.role === "tenant_admin";

  const load = async () => {
    if (!token) return;
    try {
      setLoading(true);
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
      await api.post("/auth/users", {
        full_name: fullName,
        email,
        password,
        role: isTenantAdmin ? "hr_officer" : role,
        worker_id: role === "employee" ? workerId || null : null,
      }, token);
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
      await api.patch(`/auth/users/${u.id}`, { is_active: !u.is_active }, token);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update user");
    }
  };

  if (loading) return <p className="text-sm text-[var(--muted-foreground)]">Loading settings...</p>;

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active).length;
  const hrUsers = users.filter((u) => u.role === "hr_officer").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 className="admin-page-title">Settings</h1>
        <p className="admin-page-subtitle" style={{ marginTop: 6 }}>
          {isTenantAdmin
            ? "HR management for your tenant organisation."
            : "User management for HR and employee access."}
        </p>
      </div>

      {error && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 text-red-700"
          style={{ padding: "10px 12px", fontSize: 13 }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
        <StatCard icon={<Users size={15} />} label="Total Users" value={totalUsers} />
        <StatCard icon={<UserCheck size={15} />} label="Active Users" value={activeUsers} />
        <StatCard icon={<ShieldCheck size={15} />} label="HR Users" value={hrUsers} />
      </div>

      <div className="data-card" style={{ padding: 14 }}>
        <div className="flex items-center gap-2">
          <UserPlus size={15} className="text-[#1a5296]" />
          <h3 className="text-sm font-semibold text-gray-900">
            {isTenantAdmin ? "Add HR User" : "Create User"}
          </h3>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]" style={{ marginTop: 4 }}>
          {isTenantAdmin
            ? "Tenant admins can only create HR users in their own organisation."
            : "Create internal users and assign portal access roles."}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 10, marginTop: 10 }}>
          <input className="rounded-xl border border-gray-300 bg-white text-sm text-gray-900" style={{ height: 38, padding: "0 12px" }} placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className="rounded-xl border border-gray-300 bg-white text-sm text-gray-900" style={{ height: 38, padding: "0 12px" }} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="rounded-xl border border-gray-300 bg-white text-sm text-gray-900" style={{ height: 38, padding: "0 12px" }} placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {isTenantAdmin ? (
            <input
              className="rounded-xl border border-gray-300 bg-gray-100 text-sm text-gray-700"
              style={{ height: 38, padding: "0 12px" }}
              value="HR Officer"
              disabled
            />
          ) : (
            <select className="rounded-xl border border-gray-300 bg-white text-sm text-gray-900" style={{ height: 38, padding: "0 12px" }} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="hr_officer">HR Officer</option>
              <option value="employee">Employee</option>
              <option value="compliance_manager">Compliance Manager</option>
              <option value="payroll_officer">Payroll Officer</option>
              <option value="inspector">Inspector</option>
            </select>
          )}
          {role === "employee" && (
            <select className="rounded-xl border border-gray-300 bg-white text-sm text-gray-900 md:col-span-2" style={{ height: 38, padding: "0 12px" }} value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
              <option value="">Select linked worker</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={createUser}
          className="rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 transition-all"
          style={{ height: 36, padding: "0 14px", marginTop: 10 }}
          disabled={saving}
        >
          {saving ? "Creating..." : "Create User"}
        </button>
      </div>

      <div className="data-card" style={{ padding: 14 }}>
        <h3 className="text-sm font-semibold text-gray-900">
          {isTenantAdmin ? "HR Users" : "Existing Users"}
        </h3>
        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
          {users.map((u) => (
            <div key={u.id} className="rounded-xl border border-gray-200 bg-gray-50" style={{ padding: "10px 12px" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{u.full_name}</p>
                  <p className="text-xs text-gray-600" style={{ marginTop: 2 }}>
                    {u.email}
                  </p>
                  <div style={{ marginTop: 6 }}>
                    <span
                      className="rounded-full"
                      style={{
                        padding: "2px 8px",
                        fontSize: 10,
                        fontWeight: 700,
                        background: u.role === "hr_officer" ? "#e0ecff" : "#eef2ff",
                        color: u.role === "hr_officer" ? "#1e40af" : "#4338ca",
                      }}
                    >
                      {u.role.replaceAll("_", " ")}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(u)}
                  className={`rounded-lg text-xs font-semibold ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                  style={{ padding: "6px 10px" }}
                >
                  {u.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: 14 }}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          {label}
        </p>
        <span className="text-[#1a5296]">{icon}</span>
      </div>
      <p className="admin-value-number text-[#0f1f3a]" style={{ marginTop: 8 }}>
        {value}
      </p>
    </div>
  );
}
