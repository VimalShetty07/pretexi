"use client";

import { useMemo, useRef, useState } from "react";
import { Download, Upload, CheckCircle2, XCircle, Loader2, MinusCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

const API_PROXY_URL = "/api";
const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

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
  /** Optional group label from the organisation checklist template */
  category?: string | null;
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
  organisationId,
  items,
  onRefresh,
}: {
  workerId: string;
  /** Required for platform users; optional for tenant users (still sent when known for consistency). */
  organisationId?: string | null;
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

  const orgQuery = useMemo(
    () => (organisationId ? `?organisation_id=${encodeURIComponent(organisationId)}` : ""),
    [organisationId]
  );

  const groupedItems = useMemo(() => {
    const order: string[] = [];
    const seen = new Set<string>();
    for (const it of items) {
      const k = (it.category ?? "").trim();
      if (!seen.has(k)) {
        seen.add(k);
        order.push(k);
      }
    }
    const map = new Map<string, ChecklistItem[]>();
    for (const it of items) {
      const k = (it.category ?? "").trim();
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return order.map((k) => [k, map.get(k)!] as const);
  }, [items]);

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
      const res = await fetch(
        `${API_PROXY_URL}/workers/${workerId}/checklist/${pendingItem}/upload${orgQuery}`,
        {
          method: "POST",
          headers: authHeaders,
          body: fd,
        }
      );
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
        const res = await fetch(`${API_PROXY_URL}/workers/${workerId}/checklist/${itemId}/reject${orgQuery}`, {
          method: "POST",
          headers: authHeaders,
          body: fd,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `Reject failed (${res.status})`);
        }
      } else {
        const res = await fetch(`${API_PROXY_URL}/workers/${workerId}/checklist/${itemId}/${action}${orgQuery}`, {
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
    const res = await fetch(
      `${API_PROXY_URL}/workers/${workerId}/checklist/${itemId}/download/${docId}${orgQuery}`,
      { headers: authHeaders }
    );
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
    <div className="wem-surface">
      <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange} />

      <div className="wem-toolbar">
        <h3 className="text-[11px] font-extrabold text-[#0a0a0a]">Document Checklist</h3>
      </div>

      <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
        {error && (
          <div className="mb-3 border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700" style={MONO}>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700" style={MONO}>
            {success}
          </div>
        )}

        {items.length === 0 && (
          <div className="border border-amber-200 bg-amber-50 px-3 py-3 text-[12px] text-amber-950">
            <p className="font-semibold">No documents configured for this client</p>
            <p className="mt-1 text-amber-900/90">
              Add required document types under <strong>Organisation</strong> (tenant admins) or{" "}
              <strong>Super admin → Clients → [client]</strong> (platform).
            </p>
          </div>
        )}

        <div className="mt-2 grid gap-3">
          {groupedItems.map(([categoryKey, group]) => (
            <div key={categoryKey || "__default"} className="grid gap-2">
              {categoryKey ? (
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#1a4fa0]" style={MONO}>
                  {categoryKey}
                </p>
              ) : null}
              {group.map((it) => (
                <div key={it.id} className="border border-[#E5EAF4] bg-white">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EEF3FA] px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#94a3b8]" style={MONO}>
                        #{it.item_number}
                      </p>
                    <p className="mt-1 text-[15px] font-semibold leading-snug text-[#0f2d5e]">
                        {it.description}
                      </p>
                      {it.rejection_reason && (
                        <p className="mt-1 text-[11px] text-red-600">{it.rejection_reason}</p>
                      )}
                    </div>
                    <span className={`border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] ${STATUS_STYLE[it.status]}`} style={MONO}>
                      {STATUS_LABEL[it.status]}
                    </span>
                  </div>

                  {it.documents.length > 0 && (
                    <div className="border-b border-[#EEF3FA] px-4 py-2">
                      <div className="grid gap-1.5">
                        {it.documents.map((d) => (
                          <div key={d.id} className="flex items-center justify-between border border-[#E8EEFF] bg-[#f8fafc] px-2.5 py-2">
                            <p className="truncate text-[12px] font-medium text-[#0f2d5e]">{d.file_name}</p>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#1a4fa0] hover:underline"
                              style={MONO}
                              onClick={() => download(it.id, d.id, d.file_name)}
                            >
                              <Download className="h-3 w-3" />
                              Download
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                    <button
                      type="button"
                      className="inline-flex h-8 items-center gap-1.5 border border-[rgba(0,0,0,0.12)] bg-[#0f2d5e] px-3 text-[9px] font-semibold uppercase tracking-[0.06em] text-white hover:bg-[#1a4fa0]"
                      style={MONO}
                      onClick={() => triggerUpload(it.id)}
                    >
                      {uploading === it.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {it.documents.length > 0 ? "Re-upload" : "Upload"}
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 items-center gap-1.5 border border-emerald-300 bg-emerald-50 px-3 text-[9px] font-semibold uppercase tracking-[0.06em] text-emerald-700 disabled:opacity-50"
                      style={MONO}
                      onClick={() => callAction(it.id, "verify")}
                      disabled={it.documents.length === 0}
                    >
                      {acting === it.id + "verify" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Verify
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 items-center gap-1.5 border border-red-300 bg-red-50 px-3 text-[9px] font-semibold uppercase tracking-[0.06em] text-red-700 disabled:opacity-50"
                      style={MONO}
                      onClick={() => callAction(it.id, "reject")}
                      disabled={it.documents.length === 0}
                    >
                      {acting === it.id + "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                      Reject
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 items-center gap-1.5 border border-gray-300 bg-white px-3 text-[9px] font-semibold uppercase tracking-[0.06em] text-gray-700 disabled:opacity-50"
                      style={MONO}
                      onClick={() => callAction(it.id, "mark-na")}
                      disabled={it.status === "verified" || it.status === "not_applicable"}
                    >
                      {acting === it.id + "mark-na" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MinusCircle className="h-3.5 w-3.5" />}
                      N/A
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
