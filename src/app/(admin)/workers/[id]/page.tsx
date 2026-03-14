"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import DocumentChecklist, { type ChecklistItem } from "./checklist";
import { ArrowLeft, ShieldAlert, FileCheck2, Clock3 } from "lucide-react";

interface WorkerDetail {
  id: string;
  name: string;
  job_title: string;
  email: string | null;
  department: string | null;
  status: string;
  risk_level: string;
  visa_expiry: string | null;
}

export default function WorkerDetailPage() {
  const { token } = useAuth();
  const params = useParams<{ id: string }>();
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "checklist" | "bgverify">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bgRefName, setBgRefName] = useState("");
  const [bgRefEmail, setBgRefEmail] = useState("");
  const [bgRefs, setBgRefs] = useState<Array<{ id: string; referee_name: string; referee_email: string; status: string }>>([]);

  const loadAll = async () => {
    if (!token || !params?.id) return;
    try {
      setLoading(true);
      const [data, items, bg] = await Promise.all([
        api.get<WorkerDetail>(`/workers/${params.id}`, token),
        api.get<ChecklistItem[]>(`/workers/${params.id}/checklist`, token),
        api.get<{ references: Array<{ id: string; referee_name: string; referee_email: string; status: string }> }>(`/bgverify/worker/${params.id}`, token),
      ]);
      setWorker(data);
      setChecklist(items);
      setBgRefs(bg.references || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load worker");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, params?.id]);

  const addReference = async () => {
    if (!token || !params?.id || !bgRefName || !bgRefEmail) return;
    await api.post(`/bgverify/worker/${params.id}/references`, {
      referee_name: bgRefName,
      referee_email: bgRefEmail,
      referee_company: "Previous Employer",
    }, token);
    setBgRefName("");
    setBgRefEmail("");
    await loadAll();
  };

  const sendEmails = async () => {
    if (!token || !params?.id) return;
    await api.post(`/bgverify/worker/${params.id}/send-emails`, {}, token);
    await loadAll();
  };

  const verifiedDocs = checklist.filter((c) => c.status === "verified" || c.status === "not_applicable").length;
  const pendingDocs = Math.max(checklist.length - verifiedDocs, 0);
  const checklistPct = checklist.length > 0 ? Math.round((verifiedDocs / checklist.length) * 100) : 0;
  const visaDays =
    worker?.visa_expiry
      ? Math.ceil((new Date(worker.visa_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

  const riskTone =
    worker?.risk_level === "critical"
      ? { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" }
      : worker?.risk_level === "high"
        ? { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" }
        : worker?.risk_level === "medium"
          ? { bg: "#fffbeb", border: "#fde68a", text: "#a16207" }
          : { bg: "#ecfdf3", border: "#bbf7d0", text: "#15803d" };

  if (loading) return <p className="text-sm text-[var(--muted-foreground)]">Loading worker...</p>;
  if (error || !worker) return <p className="text-sm text-red-600">{error || "Worker not found"}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <Link href="/workers" className="inline-flex items-center text-xs text-[#1a5296] hover:underline" style={{ gap: 6 }}>
          <ArrowLeft style={{ width: 13, height: 13 }} />
          Back to Employees
        </Link>
      </div>

      <div className="data-card" style={{ padding: 16 }}>
        <h1 className="text-2xl font-bold text-brand-900 tracking-tight">{worker.name}</h1>
        <p className="text-sm text-[var(--muted-foreground)]" style={{ marginTop: 4 }}>
          {worker.job_title} · {worker.department || "—"}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 8, marginTop: 12 }}>
          <MiniStat icon={<ShieldAlert style={{ width: 13, height: 13 }} />} label="Risk" value={worker.risk_level} />
          <MiniStat icon={<FileCheck2 style={{ width: 13, height: 13 }} />} label="Checklist" value={`${verifiedDocs}/${checklist.length}`} />
          <MiniStat icon={<Clock3 style={{ width: 13, height: 13 }} />} label="Visa" value={visaDays == null ? "—" : `${visaDays} days`} />
          <MiniStat icon={<ShieldAlert style={{ width: 13, height: 13 }} />} label="Status" value={worker.status} />
        </div>
        <div
          className="inline-flex flex-wrap rounded-xl border border-[var(--border)] bg-white"
          style={{ gap: 6, marginTop: 12, padding: 6 }}
        >
          <button
            className={`rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "overview"
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100"
            }`}
            style={{ padding: "7px 12px" }}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={`rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "checklist"
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100"
            }`}
            style={{ padding: "7px 12px" }}
            onClick={() => setActiveTab("checklist")}
          >
            Checklist
          </button>
          <button
            className={`rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "bgverify"
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100"
            }`}
            style={{ padding: "7px 12px" }}
            onClick={() => setActiveTab("bgverify")}
          >
            BG Verification
          </button>
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="data-card" style={{ padding: 18 }}>
          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 10, marginBottom: 12 }}>
            <div className="rounded-xl border" style={{ padding: "10px 12px", background: riskTone.bg, borderColor: riskTone.border }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: riskTone.text }}>Risk Level</p>
              <p className="text-sm font-semibold" style={{ marginTop: 2, color: riskTone.text }}>{worker.risk_level}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50" style={{ padding: "10px 12px" }}>
              <p className="text-xs text-gray-500">Checklist progress</p>
              <p className="text-sm font-semibold text-gray-900" style={{ marginTop: 2 }}>{checklistPct}% complete · {pendingDocs} pending</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>
            <Info label="Email" value={worker.email || "—"} />
            <Info label="Status" value={worker.status} />
            <Info label="Risk Level" value={worker.risk_level} />
            <Info
              label="Visa Expiry"
              value={
                worker.visa_expiry
                  ? new Date(worker.visa_expiry).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                  : "—"
              }
            />
          </div>
        </div>
      )}

      {activeTab === "checklist" && (
        <DocumentChecklist workerId={params.id} items={checklist} onRefresh={loadAll} />
      )}

      {activeTab === "bgverify" && (
        <div className="data-card" style={{ padding: 14 }}>
          <h3 className="text-sm font-semibold text-gray-900">Reference Checks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 8, marginTop: 8 }}>
            <input className="rounded-xl border border-gray-300 bg-white text-sm text-gray-900" style={{ height: 38, padding: "0 12px" }} placeholder="Reference name" value={bgRefName} onChange={(e) => setBgRefName(e.target.value)} />
            <input className="rounded-xl border border-gray-300 bg-white text-sm text-gray-900" style={{ height: 38, padding: "0 12px" }} placeholder="Reference email" value={bgRefEmail} onChange={(e) => setBgRefEmail(e.target.value)} />
          </div>
          <div className="flex" style={{ gap: 8, marginTop: 8 }}>
            <button
              className="rounded-lg border border-brand-700 bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors shadow-sm"
              style={{ padding: "8px 12px" }}
              onClick={addReference}
            >
              Add Reference
            </button>
            <button
              className="rounded-lg border border-indigo-700 bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
              style={{ padding: "8px 12px" }}
              onClick={sendEmails}
            >
              Send Emails
            </button>
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {bgRefs.map((r) => (
              <div key={r.id} className="rounded-xl border border-gray-200 bg-gray-50" style={{ padding: "8px 10px" }}>
                <p className="text-sm font-semibold text-gray-900">{r.referee_name}</p>
                <p className="text-xs text-gray-600">{r.referee_email} · {r.status}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50" style={{ padding: "8px 10px" }}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-500">{label}</p>
        <span style={{ color: "#64748b" }}>{icon}</span>
      </div>
      <p className="text-sm font-semibold text-gray-900" style={{ marginTop: 2 }}>{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50" style={{ padding: "10px 12px" }}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900" style={{ marginTop: 2 }}>{value}</p>
    </div>
  );
}
