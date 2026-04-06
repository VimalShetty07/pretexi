"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Mail, UserPlus, XCircle, Loader2, ShieldCheck, ListChecks } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import "../../dashboard/dashboard-marketing.css";
import "../../workers/workers-page.css";

interface RefItem {
  id: string;
  referee_name: string;
  referee_email: string;
  status: string;
}

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

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

  const queueCount = counts.pending + counts.inProgress;

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

  if (!token) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Sign in to manage background verification.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Loading background verification…
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
      {success && (
        <div className="mb-3 border border-emerald-200 bg-emerald-50 text-emerald-700" style={{ padding: "10px 12px", fontSize: 12, ...MONO }}>
          {success}
        </div>
      )}

      <div className="adm-ph adm-ph-portal">
        <div className="min-w-0">
          <div className="adm-ph-ey">Employee portal</div>
          <h1 className="adm-ph-title">
            Background <em className="dash-title-em">verification</em>
          </h1>
          <div className="adm-ph-date">{todayStr}</div>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#64748b]">
            Add referees and track verification progress. We email each referee to complete their response.
          </p>
        </div>
        <span
          className="adm-ph-badge inline-flex items-center gap-2 border border-[rgba(26,79,160,0.25)] bg-[rgba(26,79,160,0.06)] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#0f2d5e]"
          style={MONO}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          References
        </span>
      </div>

      <div className="adm-stat-row grid grid-cols-2 lg:grid-cols-4" style={{ gap: 2, background: "rgba(0,0,0,0.07)", marginBottom: 16 }}>
        <div className="adm-sc adm-sc-b bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b">
              <ListChecks className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">All</span>
          </div>
          <div className="adm-sc-num">{counts.total}</div>
          <div className="adm-sc-lbl">Total references</div>
          <div className="adm-sc-sub">On your profile</div>
        </div>
        <div className="adm-sc adm-sc-a bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-a">
              <Clock3 className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Queue</span>
          </div>
          <div className="adm-sc-num">{queueCount}</div>
          <div className="adm-sc-lbl">Pending / in progress</div>
          <div className="adm-sc-sub">Awaiting outcome</div>
        </div>
        <div className="adm-sc adm-sc-p bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-p">
              <CheckCircle2 className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Done</span>
          </div>
          <div className="adm-sc-num">{counts.completed}</div>
          <div className="adm-sc-lbl">Completed</div>
          <div className="adm-sc-sub">Verified</div>
        </div>
        <div className="adm-sc adm-sc-r bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-r">
              <XCircle className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">No</span>
          </div>
          <div className="adm-sc-num">{counts.declined}</div>
          <div className="adm-sc-lbl">Declined</div>
          <div className="adm-sc-sub">Could not proceed</div>
        </div>
      </div>

      <div className="wem-surface">
        <div className="wem-toolbar">
          <span className="flex items-center gap-2 text-[11px] font-extrabold text-[#0a0a0a]">
            <UserPlus className="h-4 w-4 text-[var(--dash-blue)]" />
            Add reference
          </span>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
          <p className="text-[12px] leading-relaxed text-[#64748b]" style={{ marginBottom: 12 }}>
            We will email this referee with a secure link to provide verification.
          </p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={MONO}>
                Referee name
              </span>
              <input
                className="h-9 w-full border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[13px] text-[#0a0a0a] outline-none focus:border-[var(--dash-blue)]"
                placeholder="Referee name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={MONO}>
                Referee email
              </span>
              <input
                className="h-9 w-full border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[13px] text-[#0a0a0a] outline-none focus:border-[var(--dash-blue)]"
                placeholder="Referee email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="mt-4 inline-flex h-9 items-center gap-2 border border-[rgba(0,0,0,0.12)] bg-[#0f2d5e] px-4 text-[9px] font-bold uppercase tracking-[0.07em] text-white hover:bg-[#1a4fa0] disabled:opacity-50"
            style={MONO}
            onClick={add}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            {saving ? "Adding…" : "Add reference"}
          </button>
        </div>
      </div>

      <div className="mt-4 wem-surface">
        <div className="wem-toolbar">
          <span className="text-[11px] font-extrabold text-[#0a0a0a]">Reference status</span>
          <span className="wem-badge-mono" style={MONO}>
            {refs.length} record{refs.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
          {refs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="adm-ae-icon">
                <UserPlus className="h-5 w-5" />
              </div>
              <div className="adm-ae-t mt-3">No references yet</div>
              <div className="adm-ae-s">Add a referee using the form above. They will receive an email to complete verification.</div>
            </div>
          ) : (
            <div className="grid gap-2">
              {refs.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-3 border border-[rgba(0,0,0,0.08)] bg-[#f8fafc] p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#0a0a0a]">{r.referee_name}</p>
                    <p className="mt-1 inline-flex items-center gap-1.5 truncate text-[12px] text-[#64748b]" style={MONO}>
                      <Mail className="h-3.5 w-3.5 shrink-0 text-[#94a3b8]" />
                      <span className="truncate">{r.referee_email}</span>
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
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
      ? {
          icon: CheckCircle2,
          text: "Completed",
          cls: "border-[rgba(22,163,74,0.35)] bg-[#f0fdf4] text-[#166534]",
        }
      : state === "declined"
        ? {
            icon: XCircle,
            text: "Declined",
            cls: "border-[rgba(220,38,38,0.35)] bg-[rgba(254,242,242,0.85)] text-[#991b1b]",
          }
        : {
            icon: Clock3,
            text: "Pending",
            cls: "border-[rgba(217,119,6,0.35)] bg-[rgba(255,251,235,0.9)] text-[#b45309]",
          };
  const Icon = conf.icon;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] ${conf.cls}`}
      style={MONO}
    >
      <Icon className="h-3 w-3" />
      {conf.text}
    </span>
  );
}
