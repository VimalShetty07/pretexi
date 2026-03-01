"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import {
  Upload,
  CheckCircle2,
  XCircle,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface DocFile {
  id: string;
  file_name: string;
  file_mime: string;
  status: string;
  uploaded_by: string | null;
  uploaded_by_role: string | null;
  upload_date: string | null;
  notes: string | null;
}

interface ChecklistItem {
  id: string;
  item_number: number;
  description: string;
  status: "not_started" | "uploaded" | "verified" | "rejected" | "not_applicable";
  notes: string | null;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  documents: DocFile[];
}

const STATUS_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  not_started: { label: "Not Started", color: "text-gray-600", bg: "bg-gray-100" },
  uploaded: { label: "Uploaded", color: "text-blue-700", bg: "bg-blue-50" },
  verified: { label: "Verified", color: "text-emerald-700", bg: "bg-emerald-50" },
  rejected: { label: "Rejected", color: "text-red-700", bg: "bg-red-50" },
  not_applicable: { label: "N/A", color: "text-gray-500", bg: "bg-gray-50" },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pretexi-backend.onrender.com/api";

export default function PortalDocumentsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadItemId, setUploadItemId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const fetchChecklist = useCallback(async () => {
    try {
      const data = await api.get<ChecklistItem[]>("/portal/checklist", token ?? undefined);
      setItems(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = {};
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  };

  const handleUploadClick = (itemId: string) => {
    setUploadItemId(itemId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadItemId) return;

    setUploading(uploadItemId);
    try {
      const formData = new FormData();
      formData.append("file", file);

      await fetch(`${API_URL}/portal/checklist/${uploadItemId}/upload`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });

      await fetchChecklist();
    } catch {
      /* ignore */
    } finally {
      setUploading(null);
      setUploadItemId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = (itemId: string, docId: string, fileName: string) => {
    fetch(`${API_URL}/portal/checklist/${itemId}/download/${docId}`, {
      headers: authHeaders(),
    })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 80 }}>
        <Loader2 className="animate-spin text-brand-500" style={{ width: 24, height: 24 }} />
      </div>
    );
  }

  const completed = items.filter((i) => i.status === "verified" || i.status === "not_applicable").length;
  const uploaded = items.filter((i) => i.status === "uploaded").length;
  const rejected = items.filter((i) => i.status === "rejected").length;
  const notStarted = items.length - completed - uploaded - rejected;
  const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  const filtered = filter === "all"
    ? items
    : items.filter((i) => {
        if (filter === "pending") return i.status === "not_started";
        if (filter === "rejected") return i.status === "rejected";
        if (filter === "uploaded") return i.status === "uploaded";
        if (filter === "verified") return i.status === "verified" || i.status === "not_applicable";
        return true;
      });

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
      />

      <div className="flex items-center justify-between flex-wrap" style={{ gap: 12, marginBottom: 20 }}>
        <div>
          <h1 className="text-2xl font-bold text-brand-900 tracking-tight">My Documents</h1>
          <p className="text-sm text-[var(--muted-foreground)]" style={{ marginTop: 4 }}>
            Upload your compliance documents below. HR will review and verify them.
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-brand-900">{pct}%</span>
          <p className="text-xs text-[var(--muted-foreground)]">Complete</p>
        </div>
      </div>

      {/* Progress Summary */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 bg-white rounded-xl border border-[var(--border)]"
        style={{ padding: 16, marginBottom: 16, gap: 12 }}
      >
        <button type="button" onClick={() => setFilter(filter === "pending" ? "all" : "pending")} className={`text-center rounded-lg cursor-pointer transition-colors ${filter === "pending" ? "bg-gray-100" : ""}`} style={{ padding: 8 }}>
          <div className="text-2xl font-bold text-gray-500">{notStarted}</div>
          <div className="text-xs text-[var(--muted-foreground)]">Pending Upload</div>
        </button>
        <button type="button" onClick={() => setFilter(filter === "uploaded" ? "all" : "uploaded")} className={`text-center rounded-lg cursor-pointer transition-colors ${filter === "uploaded" ? "bg-blue-50" : ""}`} style={{ padding: 8 }}>
          <div className="text-2xl font-bold text-blue-600">{uploaded}</div>
          <div className="text-xs text-[var(--muted-foreground)]">Awaiting Review</div>
        </button>
        <button type="button" onClick={() => setFilter(filter === "rejected" ? "all" : "rejected")} className={`text-center rounded-lg cursor-pointer transition-colors ${filter === "rejected" ? "bg-red-50" : ""}`} style={{ padding: 8 }}>
          <div className="text-2xl font-bold text-red-600">{rejected}</div>
          <div className="text-xs text-[var(--muted-foreground)]">Rejected</div>
        </button>
        <button type="button" onClick={() => setFilter(filter === "verified" ? "all" : "verified")} className={`text-center rounded-lg cursor-pointer transition-colors ${filter === "verified" ? "bg-emerald-50" : ""}`} style={{ padding: 8 }}>
          <div className="text-2xl font-bold text-emerald-600">{completed}</div>
          <div className="text-xs text-[var(--muted-foreground)]">Verified</div>
        </button>
      </div>

      {/* Progress bar */}
      <div className="rounded-full bg-gray-100 overflow-hidden" style={{ height: 8, marginBottom: 24 }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: pct === 100 ? "#10b981" : pct >= 50 ? "#3b82f6" : "#f59e0b",
          }}
        />
      </div>

      {/* Rejected banner */}
      {rejected > 0 && filter === "all" && (
        <div
          className="flex items-center rounded-xl bg-red-50 border border-red-200 text-red-800"
          style={{ padding: "12px 18px", marginBottom: 16, gap: 10, fontSize: 13 }}
        >
          <XCircle style={{ width: 16, height: 16 }} className="shrink-0" />
          <span><strong>{rejected}</strong> document{rejected !== 1 ? "s" : ""} rejected — please re-upload with corrections.</span>
        </div>
      )}

      {/* Checklist Items */}
      <div className="space-y-2">
        {filtered.map((item) => {
          const badge = STATUS_BADGES[item.status] ?? STATUS_BADGES.not_started;
          const isExpanded = expandedId === item.id;
          const isUploading = uploading === item.id;

          return (
            <div key={item.id} className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
              {/* Row header */}
              <button
                type="button"
                className="w-full flex items-center text-left cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ padding: "12px 16px", gap: 12 }}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                {isExpanded ? (
                  <ChevronDown style={{ width: 16, height: 16 }} className="text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight style={{ width: 16, height: 16 }} className="text-gray-400 shrink-0" />
                )}

                <span className="text-xs font-bold text-brand-500 shrink-0" style={{ width: 28 }}>
                  #{item.item_number}
                </span>

                <span className="text-sm text-brand-900 flex-1">{item.description}</span>

                <span
                  className={`inline-flex items-center rounded-full text-xs font-medium shrink-0 ${badge.color} ${badge.bg}`}
                  style={{ padding: "3px 10px" }}
                >
                  {badge.label}
                </span>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-[var(--border)] bg-gray-50" style={{ padding: "16px 20px" }}>
                  {/* Uploaded documents */}
                  {item.documents.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <h4 className="text-xs font-semibold text-brand-800 uppercase" style={{ marginBottom: 8 }}>
                        Uploaded Documents
                      </h4>
                      <div className="space-y-2">
                        {item.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center bg-white rounded-lg border border-[var(--border)]"
                            style={{ padding: "10px 14px", gap: 10 }}
                          >
                            <FileText style={{ width: 16, height: 16 }} className="text-brand-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-brand-900 truncate">{doc.file_name}</div>
                              <div className="text-xs text-[var(--muted-foreground)]">
                                Uploaded {doc.upload_date ? `on ${new Date(doc.upload_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDownload(item.id, doc.id, doc.file_name)}
                              className="flex items-center rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors cursor-pointer"
                              style={{ padding: "6px 10px", gap: 4, fontSize: 12 }}
                            >
                              <Download style={{ width: 13, height: 13 }} /> Download
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rejection reason */}
                  {item.status === "rejected" && item.rejection_reason && (
                    <div
                      className="rounded-lg bg-red-50 border border-red-200 text-red-800"
                      style={{ padding: "10px 14px", fontSize: 13, marginBottom: 16 }}
                    >
                      <strong>Rejection reason:</strong> {item.rejection_reason}
                    </div>
                  )}

                  {/* Verified info */}
                  {item.status === "verified" && item.verified_by && (
                    <div
                      className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800"
                      style={{ padding: "10px 14px", fontSize: 13, marginBottom: 16 }}
                    >
                      <CheckCircle2 style={{ width: 14, height: 14, display: "inline", marginRight: 4 }} />
                      Verified by {item.verified_by}
                      {item.verified_at && ` on ${new Date(item.verified_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`}
                    </div>
                  )}

                  {/* Notes */}
                  {item.notes && (
                    <div
                      className="rounded-lg bg-blue-50 border border-blue-200 text-blue-800"
                      style={{ padding: "10px 14px", fontSize: 13, marginBottom: 16 }}
                    >
                      <MessageSquare style={{ width: 14, height: 14, display: "inline", marginRight: 4 }} />
                      {item.notes}
                    </div>
                  )}

                  {/* Upload button */}
                  {item.status !== "verified" && item.status !== "not_applicable" && (
                    <button
                      type="button"
                      onClick={() => handleUploadClick(item.id)}
                      disabled={isUploading}
                      className="inline-flex items-center rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors cursor-pointer"
                      style={{ padding: "7px 14px", gap: 6, fontSize: 13 }}
                    >
                      {isUploading ? (
                        <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
                      ) : (
                        <Upload style={{ width: 14, height: 14 }} />
                      )}
                      {item.documents.length > 0 ? "Re-upload Document" : "Upload Document"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center bg-white rounded-xl border border-[var(--border)]" style={{ padding: 40 }}>
          <CheckCircle2 className="mx-auto text-emerald-500" style={{ width: 32, height: 32, marginBottom: 8 }} />
          <p className="text-sm text-[var(--muted-foreground)]">
            {filter === "all" ? "No checklist items found." : `No ${filter} items.`}
          </p>
        </div>
      )}
    </div>
  );
}
