"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import {
  UserSearch,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
} from "lucide-react";

interface BgReference {
  id: string;
  referee_name: string;
  referee_email: string;
  referee_phone: string | null;
  referee_company: string;
  referee_job_title: string | null;
  relation_to_employee: string | null;
  employment_start: string | null;
  employment_end: string | null;
  status: string;
  email_sent_at: string | null;
  response_confirm_employment: boolean | null;
  response_confirm_dates: boolean | null;
  response_confirm_title: boolean | null;
  response_recommend: boolean | null;
  response_rating: number | null;
  responded_at: string | null;
  token: string;
}

interface BgVerificationData {
  id: string | null;
  status: string | null;
  references: BgReference[];
}

const BG_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending_references: { label: "Pending – Add your references below", color: "text-amber-700", bg: "bg-amber-50" },
  emails_sent: { label: "Emails Sent – Waiting for responses", color: "text-blue-700", bg: "bg-blue-50" },
  in_progress: { label: "In Progress – Some references responded", color: "text-blue-700", bg: "bg-blue-50" },
  completed: { label: "Verification Complete", color: "text-emerald-700", bg: "bg-emerald-50" },
  failed: { label: "Verification Failed", color: "text-red-700", bg: "bg-red-50" },
};

const REF_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-gray-700", bg: "bg-gray-100" },
  email_sent: { label: "Email Sent", color: "text-blue-700", bg: "bg-blue-50" },
  completed: { label: "Responded", color: "text-emerald-700", bg: "bg-emerald-50" },
  declined: { label: "Declined", color: "text-red-700", bg: "bg-red-50" },
};

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PortalBgVerifyPage() {
  const { user, token } = useAuth();
  const [bgData, setBgData] = useState<BgVerificationData>({ id: null, status: null, references: [] });
  const [loading, setLoading] = useState(true);
  const [showAddRef, setShowAddRef] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refForm, setRefForm] = useState({
    referee_name: "", referee_email: "", referee_phone: "", referee_company: "",
    referee_job_title: "", relation_to_employee: "", employment_start: "", employment_end: "",
  });

  const workerId = user?.worker_id;

  const fetchBg = useCallback(async () => {
    if (!workerId) return;
    try {
      const data = await api.get<BgVerificationData>(`/bgverify/worker/${workerId}`, token ?? undefined);
      setBgData(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [workerId, token]);

  useEffect(() => { fetchBg(); }, [fetchBg]);

  const addReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId) return;
    setSaving(true);
    try {
      await api.post(`/bgverify/worker/${workerId}/references`, refForm, token ?? undefined);
      await fetchBg();
      setShowAddRef(false);
      setRefForm({ referee_name: "", referee_email: "", referee_phone: "", referee_company: "", referee_job_title: "", relation_to_employee: "", employment_start: "", employment_end: "" });
    } catch { /* ignore */ }
    setSaving(false);
  };

  const deleteRef = async (refId: string) => {
    if (!confirm("Remove this reference?")) return;
    try {
      await api.delete(`/bgverify/references/${refId}`, token ?? undefined);
      await fetchBg();
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 80 }}>
        <Loader2 className="animate-spin text-blue-500" style={{ width: 24, height: 24 }} />
      </div>
    );
  }

  if (!bgData.id) {
    return (
      <div>
        <h1 className="text-xl font-bold text-brand-900 tracking-tight" style={{ marginBottom: 4 }}>
          Background Verification
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]" style={{ marginBottom: 32 }}>
          Employment reference checks
        </p>
        <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: "48px 28px", textAlign: "center" }}>
          <UserSearch className="mx-auto text-gray-400" style={{ width: 48, height: 48, marginBottom: 16 }} />
          <h3 className="text-lg font-semibold text-gray-900" style={{ marginBottom: 8 }}>No Verification Started</h3>
          <p className="text-sm text-gray-500" style={{ maxWidth: 400, margin: "0 auto" }}>
            Your background verification has not been initiated yet. HR will start this process when ready.
          </p>
        </div>
      </div>
    );
  }

  const bgStatus = BG_STATUS_MAP[bgData.status ?? ""] ?? BG_STATUS_MAP.pending_references;
  const canAdd = bgData.status === "pending_references" || bgData.status === "emails_sent";

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-900 tracking-tight" style={{ marginBottom: 4 }}>
        Background Verification
      </h1>
      <p className="text-sm text-[var(--muted-foreground)]" style={{ marginBottom: 24 }}>
        Provide your previous employer references for verification
      </p>

      {/* Status banner */}
      <div className={`rounded-xl border ${bgStatus.bg} ${bgStatus.color}`} style={{ padding: "14px 20px", marginBottom: 24, fontSize: 14 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          {bgData.status === "completed" ? (
            <CheckCircle2 style={{ width: 18, height: 18 }} />
          ) : bgData.status === "failed" ? (
            <XCircle style={{ width: 18, height: 18 }} />
          ) : (
            <Clock style={{ width: 18, height: 18 }} />
          )}
          <span className="font-medium">{bgStatus.label}</span>
        </div>
      </div>

      {/* Instruction card */}
      {canAdd && (
        <div className="bg-blue-50 rounded-xl border border-blue-200" style={{ padding: "16px 20px", marginBottom: 24 }}>
          <h3 className="text-sm font-semibold text-blue-900" style={{ marginBottom: 6 }}>How it works</h3>
          <ol className="list-decimal text-sm text-blue-800" style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Add your previous employer(s) as references below</li>
            <li>HR will review and send verification emails to your referees</li>
            <li>Your referees will fill in a short reference form</li>
            <li>Once all references respond, verification is complete</li>
          </ol>
        </div>
      )}

      {/* References */}
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <h3 className="text-sm font-semibold text-gray-800">Your References ({bgData.references.length})</h3>
        {canAdd && (
          <button
            type="button"
            onClick={() => setShowAddRef(!showAddRef)}
            className="inline-flex items-center rounded-lg text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
            style={{ gap: 5 }}
          >
            <Plus style={{ width: 14, height: 14 }} /> Add Reference
          </button>
        )}
      </div>

      {/* Add form */}
      {showAddRef && (
        <form onSubmit={addReference} className="bg-white rounded-xl border border-blue-200" style={{ padding: 20, marginBottom: 16 }}>
          <h4 className="text-sm font-semibold text-gray-900" style={{ marginBottom: 14 }}>Add Previous Employer Reference</h4>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>
            {([
              { key: "referee_name", label: "Reference Name *", required: true },
              { key: "referee_email", label: "Reference Email *", required: true, type: "email" },
              { key: "referee_phone", label: "Phone Number" },
              { key: "referee_company", label: "Company Name *", required: true },
              { key: "referee_job_title", label: "Their Job Title" },
              { key: "relation_to_employee", label: "Relationship to You" },
              { key: "employment_start", label: "Your Employment Start Date", type: "date" },
              { key: "employment_end", label: "Your Employment End Date", type: "date" },
            ] as { key: string; label: string; required?: boolean; type?: string }[]).map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-700" style={{ marginBottom: 4 }}>{f.label}</label>
                <input
                  type={f.type || "text"}
                  required={f.required}
                  value={refForm[f.key]}
                  onChange={(e) => setRefForm({ ...refForm, [f.key]: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white text-sm text-gray-900 outline-none focus:border-blue-400"
                  style={{ height: 38, padding: "0 12px" }}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end" style={{ gap: 8, marginTop: 16 }}>
            <button type="button" onClick={() => setShowAddRef(false)} className="rounded-xl border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer" style={{ height: 34, padding: "0 14px" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="inline-flex items-center rounded-xl bg-blue-600 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer" style={{ height: 34, padding: "0 14px", gap: 5 }}>
              {saving && <Loader2 className="animate-spin" style={{ width: 12, height: 12 }} />}
              Add Reference
            </button>
          </div>
        </form>
      )}

      {bgData.references.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50" style={{ padding: "32px 20px", textAlign: "center" }}>
          <p className="text-sm text-gray-500">No references added yet. Click "Add Reference" to add your previous employer details.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bgData.references.map((ref) => {
            const refSt = REF_STATUS_MAP[ref.status] ?? REF_STATUS_MAP.draft;
            return (
              <div key={ref.id} className="bg-white rounded-xl border border-gray-200" style={{ padding: "16px 20px" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center" style={{ gap: 12 }}>
                    <div className="flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 font-semibold" style={{ width: 40, height: 40, fontSize: 14 }}>
                      {ref.referee_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{ref.referee_name}</div>
                      <div className="text-xs text-gray-500">{ref.referee_company} · {ref.referee_email}</div>
                    </div>
                  </div>
                  <div className="flex items-center" style={{ gap: 8 }}>
                    <span className={`inline-flex items-center rounded-full text-xs font-medium ${refSt.color} ${refSt.bg}`} style={{ padding: "3px 10px" }}>
                      {refSt.label}
                    </span>
                    {ref.status === "draft" && (
                      <button
                        type="button"
                        onClick={() => deleteRef(ref.id)}
                        className="rounded-lg text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                        style={{ padding: 4 }}
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 8, marginTop: 12 }}>
                  {ref.referee_job_title && (
                    <div><span className="text-xs text-gray-500">Title</span><br /><span className="text-xs text-gray-800">{ref.referee_job_title}</span></div>
                  )}
                  {ref.relation_to_employee && (
                    <div><span className="text-xs text-gray-500">Relationship</span><br /><span className="text-xs text-gray-800">{ref.relation_to_employee}</span></div>
                  )}
                  {ref.employment_start && (
                    <div><span className="text-xs text-gray-500">From</span><br /><span className="text-xs text-gray-800">{fmt(ref.employment_start)}</span></div>
                  )}
                  {ref.employment_end && (
                    <div><span className="text-xs text-gray-500">To</span><br /><span className="text-xs text-gray-800">{fmt(ref.employment_end)}</span></div>
                  )}
                </div>
                {ref.status === "email_sent" && (
                  <div className="flex items-center rounded-lg bg-amber-50 border border-amber-200 text-amber-700" style={{ padding: "8px 12px", marginTop: 12, gap: 6, fontSize: 12 }}>
                    <Clock style={{ width: 13, height: 13 }} /> Verification email sent – waiting for response
                  </div>
                )}
                {ref.status === "completed" && (
                  <div className="flex items-center rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700" style={{ padding: "8px 12px", marginTop: 12, gap: 6, fontSize: 12 }}>
                    <CheckCircle2 style={{ width: 13, height: 13 }} /> Reference submitted on {fmt(ref.responded_at)}
                  </div>
                )}
                {ref.status === "declined" && (
                  <div className="flex items-center rounded-lg bg-red-50 border border-red-200 text-red-700" style={{ padding: "8px 12px", marginTop: 12, gap: 6, fontSize: 12 }}>
                    <XCircle style={{ width: 13, height: 13 }} /> Referee declined to provide a reference
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
