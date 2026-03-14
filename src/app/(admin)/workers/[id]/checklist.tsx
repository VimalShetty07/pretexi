"use client";

import { useMemo, useRef, useState } from "react";
import { Download, Upload, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pretexi-backend.onrender.com/api";
const API_PROXY_URL = "/api";

interface DocFile {
  id: string;
  file_name: string;
  status: string;
  upload_date: string | null;
}

export interface ChecklistItem {
  id: string;
  item_number: number;
  description: string;
  status: "not_started" | "uploaded" | "verified" | "rejected" | "not_applicable";
  rejection_reason: string | null;
  documents: DocFile[];
}

const STATUS_LABEL: Record<ChecklistItem["status"], string> = {
  not_started: "Approval Pending",
  uploaded: "Approval Pending",
  verified: "Verified",
  rejected: "Rejected",
  not_applicable: "Approval Pending",
};

const STATUS_STYLE: Record<ChecklistItem["status"], string> = {
  not_started: "bg-amber-50 border-amber-200 text-amber-700",
  uploaded: "bg-amber-50 border-amber-200 text-amber-700",
  verified: "bg-emerald-50 border-emerald-200 text-emerald-700",
  rejected: "bg-red-50 border-red-200 text-red-700",
  not_applicable: "bg-gray-50 border-gray-200 text-gray-700",
};

export default function DocumentChecklist({
  workerId,
  items,
  onRefresh,
}: {
  workerId: string;
  items: ChecklistItem[];
  onRefresh: () => Promise<void>;
}) {
  const { token } = useAuth();
  const [uploading, setUploading] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingItem, setPendingItem] = useState<string | null>(null);

  const authHeaders = useMemo(() => {
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const triggerUpload = (itemId: string) => {
    setPendingItem(itemId);
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingItem) return;
    setUploading(pendingItem);
    setError("");
    setSuccess("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_PROXY_URL}/workers/${workerId}/checklist/${pendingItem}/upload`, {
        method: "POST",
        headers: authHeaders,
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Upload failed (${res.status})`);
      }
      await onRefresh();
      setSuccess("Document uploaded successfully.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(null);
      setPendingItem(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const callAction = async (itemId: string, action: "verify" | "reject" | "mark-na") => {
    setActing(itemId + action);
    setError("");
    setSuccess("");
    try {
      if (action === "reject") {
        const fd = new FormData();
        fd.append("reason", "Please re-upload with corrections");
        const res = await fetch(`${API_PROXY_URL}/workers/${workerId}/checklist/${itemId}/reject`, {
          method: "POST",
          headers: authHeaders,
          body: fd,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `Reject failed (${res.status})`);
        }
      } else {
        const res = await fetch(`${API_PROXY_URL}/workers/${workerId}/checklist/${itemId}/${action}`, {
          method: "POST",
          headers: authHeaders,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `${action} failed (${res.status})`);
        }
      }
      await onRefresh();
      setSuccess(action === "verify" ? "Document verified." : action === "reject" ? "Document rejected." : "Marked as not applicable.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setActing(null);
    }
  };

  const download = async (itemId: string, docId: string, fileName: string) => {
    const res = await fetch(`${API_PROXY_URL}/workers/${workerId}/checklist/${itemId}/download/${docId}`, { headers: authHeaders });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.detail || `Download failed (${res.status})`);
      return;
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="data-card" style={{ padding: 14 }}>
      <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange} />
      <h3 className="text-sm font-semibold text-gray-900">Document Checklist</h3>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700" style={{ marginTop: 8, padding: "8px 10px", fontSize: 12 }}>
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700" style={{ marginTop: 8, padding: "8px 10px", fontSize: 12 }}>
          {success}
        </div>
      )}

      <div style={{ marginTop: 10, display: "grid", gap: 8, maxHeight: 560, overflow: "auto" }}>
        {items.map((it) => (
          <div key={it.id} className="rounded-xl border border-gray-200 bg-gray-50" style={{ padding: "10px 12px" }}>
            <div className="flex items-start justify-between" style={{ gap: 8 }}>
              <div>
                <p className="text-xs text-gray-500">#{it.item_number}</p>
                <p className="text-sm font-semibold text-gray-900">{it.description}</p>
                {it.rejection_reason && <p className="text-xs text-red-600" style={{ marginTop: 4 }}>{it.rejection_reason}</p>}
              </div>
              <span
                className={`rounded-full border text-xs font-semibold ${STATUS_STYLE[it.status]}`}
                style={{ padding: "3px 8px" }}
              >
                {STATUS_LABEL[it.status]}
              </span>
            </div>

            {it.documents.length > 0 && (
              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                {it.documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg bg-white border border-gray-200" style={{ padding: "6px 8px" }}>
                    <p className="text-xs text-gray-700 truncate">{d.file_name}</p>
                    <button className="text-xs text-blue-700 hover:underline" onClick={() => download(it.id, d.id, d.file_name)}>
                      <Download style={{ width: 12, height: 12, display: "inline", marginRight: 4 }} />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap" style={{ gap: 8, marginTop: 8 }}>
              <button className="rounded-lg bg-blue-600 text-white text-xs" style={{ padding: "6px 9px" }} onClick={() => triggerUpload(it.id)}>
                {uploading === it.id ? <Loader2 className="inline animate-spin" style={{ width: 12, height: 12 }} /> : <Upload className="inline" style={{ width: 12, height: 12 }} />} {it.documents.length > 0 ? "Re-upload" : "Upload"}
              </button>
              <button
                className="rounded-lg bg-emerald-600 text-white text-xs disabled:opacity-50"
                style={{ padding: "6px 9px" }}
                onClick={() => callAction(it.id, "verify")}
                disabled={it.documents.length === 0}
              >
                {acting === it.id + "verify" ? <Loader2 className="inline animate-spin" style={{ width: 12, height: 12 }} /> : <CheckCircle2 className="inline" style={{ width: 12, height: 12 }} />} Verify
              </button>
              <button
                className="rounded-lg bg-red-600 text-white text-xs disabled:opacity-50"
                style={{ padding: "6px 9px" }}
                onClick={() => callAction(it.id, "reject")}
                disabled={it.documents.length === 0}
              >
                {acting === it.id + "reject" ? <Loader2 className="inline animate-spin" style={{ width: 12, height: 12 }} /> : <XCircle className="inline" style={{ width: 12, height: 12 }} />} Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
