"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Mail, UserPlus, XCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";

interface RefItem {
  id: string;
  referee_name: string;
  referee_email: string;
  status: string;
}

export default function PortalBgVerifyPage() {
  const { token } = useAuth();
  const [workerId, setWorkerId] = useState<string>("");
  const [refs, setRefs] = useState<RefItem[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const me = await api.get<{ id: string }>("/portal/me", token);
      setWorkerId(me.id);
      const bg = await api.get<{ references: RefItem[] }>(`/bgverify/worker/${me.id}`, token);
      setRefs(bg.references || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load background verification.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const add = async () => {
    if (!token || !workerId) return;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      setError("Please enter both referee name and email.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await api.post(
        `/bgverify/worker/${workerId}/references`,
        {
          referee_name: trimmedName,
          referee_email: trimmedEmail,
          referee_company: "Previous Employer",
        },
        token
      );
      setName("");
      setEmail("");
      setSuccess("Reference added successfully.");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add reference.");
    } finally {
      setSaving(false);
    }
  };

  const counts = useMemo(() => {
    const get = (status: string) => refs.filter((r) => normalizeStatus(r.status) === status).length;
    return {
      total: refs.length,
      pending: get("pending"),
      inProgress: get("in_progress"),
      completed: get("completed"),
      declined: get("declined"),
    };
  }, [refs]);

  if (loading) return <p className="text-sm text-gray-500">Loading BG verification...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 className="admin-page-title">Background Verification</h1>
        <p className="admin-page-subtitle" style={{ marginTop: 6 }}>
          Add referees and track verification progress for your profile.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 10 }}>
        <Stat title="Total References" value={counts.total} tone="blue" />
        <Stat title="Pending" value={counts.pending + counts.inProgress} tone="amber" />
        <Stat title="Completed" value={counts.completed} tone="emerald" />
        <Stat title="Declined" value={counts.declined} tone="red" />
      </div>

      <div className="data-card" style={{ padding: 14 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <UserPlus style={{ width: 16, height: 16, color: "#1d4ed8" }} />
          <h3 className="text-sm font-semibold text-gray-900">Add Reference</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 8, marginTop: 8 }}>
          <input
            className="rounded-xl border border-gray-300 bg-white text-sm text-gray-900 outline-none focus:border-brand-400"
            style={{ height: 38, padding: "0 12px" }}
            placeholder="Referee name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="rounded-xl border border-gray-300 bg-white text-sm text-gray-900 outline-none focus:border-brand-400"
            style={{ height: 38, padding: "0 12px" }}
            placeholder="Referee email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between flex-wrap" style={{ marginTop: 10, gap: 8 }}>
          <p className="text-xs text-gray-500">We will email this referee for verification.</p>
          <button
            className="inline-flex items-center rounded-xl text-white text-xs font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              height: 36,
              padding: "0 14px",
              gap: 6,
              background: "linear-gradient(135deg, #1a5296, #2b6cd4)",
              boxShadow: "0 3px 10px rgba(26,82,150,0.30)",
            }}
            onClick={add}
            disabled={saving}
          >
            <UserPlus style={{ width: 13, height: 13 }} />
            {saving ? "Adding..." : "Add Reference"}
          </button>
        </div>
        {success && <p className="text-xs text-emerald-700" style={{ marginTop: 8 }}>{success}</p>}
      </div>

      <div className="data-card" style={{ padding: 14 }}>
        <h3 className="text-sm font-semibold text-gray-900">Reference Status</h3>
        {error && <p className="text-xs text-red-600" style={{ marginTop: 6 }}>{error}</p>}
        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
          {refs.length === 0 ? (
            <p className="text-sm text-gray-500">No references added yet.</p>
          ) : (
            refs.map((r) => (
              <div key={r.id} className="rounded-xl border border-gray-200 bg-gray-50" style={{ padding: "10px 12px" }}>
                <div className="flex items-center justify-between" style={{ gap: 8 }}>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{r.referee_name}</p>
                    <p className="text-xs text-gray-600 inline-flex items-center" style={{ gap: 5, marginTop: 2 }}>
                      <Mail style={{ width: 12, height: 12 }} />
                      {r.referee_email}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function normalizeStatus(status: string) {
  const s = status?.toLowerCase?.() || "";
  if (s.includes("complete")) return "completed";
  if (s.includes("decline")) return "declined";
  if (s.includes("progress")) return "in_progress";
  return "pending";
}

function StatusBadge({ status }: { status: string }) {
  const state = normalizeStatus(status);
  const conf =
    state === "completed"
      ? { icon: CheckCircle2, text: "Completed", bg: "#ecfdf5", color: "#047857" }
      : state === "declined"
      ? { icon: XCircle, text: "Declined", bg: "#fef2f2", color: "#b91c1c" }
      : { icon: Clock3, text: "Pending", bg: "#fffbeb", color: "#b45309" };
  const Icon = conf.icon;
  return (
    <span
      className="inline-flex items-center rounded-full font-medium"
      style={{ padding: "3px 10px", fontSize: 12, gap: 5, background: conf.bg, color: conf.color }}
    >
      <Icon style={{ width: 12, height: 12 }} />
      {conf.text}
    </span>
  );
}

function Stat({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "blue" | "amber" | "emerald" | "red";
}) {
  const c = {
    blue: { bg: "#eff6ff", border: "#dbeafe", text: "#1d4ed8" },
    amber: { bg: "#fffbeb", border: "#fde68a", text: "#b45309" },
    emerald: { bg: "#ecfdf5", border: "#a7f3d0", text: "#047857" },
    red: { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" },
  }[tone];

  return (
    <div className="rounded-xl border" style={{ padding: "11px 12px", background: c.bg, borderColor: c.border }}>
      <p className="text-xs text-[var(--muted-foreground)]">{title}</p>
      <p className="text-2xl font-bold" style={{ marginTop: 4, color: c.text }}>{value}</p>
    </div>
  );
}
