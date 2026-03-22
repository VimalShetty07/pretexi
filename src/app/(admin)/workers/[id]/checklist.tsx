"use client";

import { useMemo, useRef, useState } from "react";
import { Download, Upload, CheckCircle2, XCircle, Loader2, MinusCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

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

      {items.length === 0 && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 text-amber-950"
          style={{ marginTop: 10, padding: "10px 12px", fontSize: 12, lineHeight: 1.5 }}
        >
          <p className="font-semibold">No documents configured for this client</p>
          <p className="mt-1 text-amber-900/90">
            Add required document types under <strong>Organisation</strong> (tenant admins) or{" "}
            <strong>Super admin → Clients → [client]</strong> (platform). Each client can have a different checklist.
          </p>
        </div>
      )}

      <div style={{ marginTop: 10, display: "grid", gap: 12, maxHeight: 560, overflow: "auto" }}>
        {groupedItems.map(([categoryKey, group]) => (
          <div key={categoryKey || "__default"} style={{ display: "grid", gap: 8 }}>
            {categoryKey ? (
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#2563EB]">{categoryKey}</p>
            ) : null}
            {group.map((it) => (
              <div key={it.id} className="rounded-xl border border-[#E8EEFF] bg-[#F8FAFF]" style={{ padding: "10px 12px" }}>
                <div className="flex items-start justify-between" style={{ gap: 8 }}>
                  <div>
                    <p className="text-xs text-gray-500">#{it.item_number}</p>
                    <p className="text-sm font-semibold text-gray-900">{it.description}</p>
                    {it.rejection_reason && (
                      <p className="text-xs text-red-600" style={{ marginTop: 4 }}>
                        {it.rejection_reason}
                      </p>
                    )}
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
                      <div
                        key={d.id}
                        className="flex items-center justify-between rounded-lg bg-white border border-gray-200"
                        style={{ padding: "6px 8px" }}
                      >
                        <p className="text-xs text-gray-700 truncate">{d.file_name}</p>
                        <button
                          type="button"
                          className="text-xs font-medium text-[#2563EB] hover:underline"
                          onClick={() => download(it.id, d.id, d.file_name)}
                        >
                          <Download style={{ width: 12, height: 12, display: "inline", marginRight: 4 }} />
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap" style={{ gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    className="rounded-lg bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] text-xs font-semibold text-white shadow-sm"
                    style={{ padding: "6px 9px" }}
                    onClick={() => triggerUpload(it.id)}
                  >
                    {uploading === it.id ? (
                      <Loader2 className="inline animate-spin" style={{ width: 12, height: 12 }} />
                    ) : (
                      <Upload className="inline" style={{ width: 12, height: 12 }} />
                    )}{" "}
                    {it.documents.length > 0 ? "Re-upload" : "Upload"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-emerald-600 text-white text-xs disabled:opacity-50"
                    style={{ padding: "6px 9px" }}
                    onClick={() => callAction(it.id, "verify")}
                    disabled={it.documents.length === 0}
                  >
                    {acting === it.id + "verify" ? (
                      <Loader2 className="inline animate-spin" style={{ width: 12, height: 12 }} />
                    ) : (
                      <CheckCircle2 className="inline" style={{ width: 12, height: 12 }} />
                    )}{" "}
                    Verify
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-red-600 text-white text-xs disabled:opacity-50"
                    style={{ padding: "6px 9px" }}
                    onClick={() => callAction(it.id, "reject")}
                    disabled={it.documents.length === 0}
                  >
                    {acting === it.id + "reject" ? (
                      <Loader2 className="inline animate-spin" style={{ width: 12, height: 12 }} />
                    ) : (
                      <XCircle className="inline" style={{ width: 12, height: 12 }} />
                    )}{" "}
                    Reject
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-gray-300 bg-white text-gray-800 text-xs disabled:opacity-50"
                    style={{ padding: "6px 9px" }}
                    onClick={() => callAction(it.id, "mark-na")}
                    disabled={it.status === "verified" || it.status === "not_applicable"}
                  >
                    {acting === it.id + "mark-na" ? (
                      <Loader2 className="inline animate-spin" style={{ width: 12, height: 12 }} />
                    ) : (
                      <MinusCircle className="inline" style={{ width: 12, height: 12 }} />
                    )}{" "}
                    N/A
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
