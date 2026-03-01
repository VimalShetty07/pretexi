"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import DocumentChecklist, { type ChecklistItem } from "./checklist";

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

  if (loading) return <p className="text-sm text-white/80">Loading worker...</p>;
  if (error || !worker) return <p className="text-sm text-red-200">{error || "Worker not found"}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="data-card" style={{ padding: 16 }}>
        <h1 className="text-2xl font-bold text-brand-900 tracking-tight">{worker.name}</h1>
        <p className="text-sm text-[var(--muted-foreground)]" style={{ marginTop: 4 }}>
          {worker.job_title} · {worker.department || "—"}
        </p>
        <div className="flex flex-wrap" style={{ gap: 8, marginTop: 12 }}>
          <button className={`rounded-lg text-xs px-3 py-1.5 ${activeTab === "overview" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700"}`} onClick={() => setActiveTab("overview")}>Overview</button>
          <button className={`rounded-lg text-xs px-3 py-1.5 ${activeTab === "checklist" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700"}`} onClick={() => setActiveTab("checklist")}>Checklist</button>
          <button className={`rounded-lg text-xs px-3 py-1.5 ${activeTab === "bgverify" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700"}`} onClick={() => setActiveTab("bgverify")}>BG Verification</button>
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="data-card" style={{ padding: 18 }}>
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
            <button className="rounded-lg bg-brand-600 text-white text-xs px-3 py-2" onClick={addReference}>Add Reference</button>
            <button className="rounded-lg bg-indigo-600 text-white text-xs px-3 py-2" onClick={sendEmails}>Send Emails</button>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50" style={{ padding: "10px 12px" }}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900" style={{ marginTop: 2 }}>{value}</p>
    </div>
  );
}
