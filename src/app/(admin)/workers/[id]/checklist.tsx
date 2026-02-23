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
  Eye,
  Ban,
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
  verified_by: string | null;
  verified_date: string | null;
  rejection_reason: string | null;
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

const STAFF_ROLES = ["super_admin", "compliance_manager", "hr_officer"];

export default function DocumentChecklist({ workerId }: { workerId: string }) {
  const { token, user } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadItemId, setUploadItemId] = useState<string | null>(null);
  const [rejectItemId, setRejectItemId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isStaff = user ? STAFF_ROLES.includes(user.role) : false;

  const fetchChecklist = useCallback(async () => {
    try {
      const data = await api.get<ChecklistItem[]>(
        `/workers/${workerId}/checklist`,
        token ?? undefined
      );
      setItems(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [workerId, token]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const handleUploadClick = (itemId: string) => {
    setUploadItemId(itemId);
    fileInputRef.current?.click();
  };

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = {};
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadItemId) return;

    setUploading(uploadItemId);
    try {
      const formData = new FormData();
      formData.append("file", file);

      await fetch(`http://localhost:8000/api/workers/${workerId}/checklist/${uploadItemId}/upload`, {
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

  const handleVerify = async (itemId: string) => {
    setActionLoading(itemId);
    try {
      await fetch(`http://localhost:8000/api/workers/${workerId}/checklist/${itemId}/verify`, {
        method: "POST",
        headers: authHeaders(),
      });
      await fetchChecklist();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (itemId: string) => {
    setActionLoading(itemId);
    try {
      const formData = new FormData();
      formData.append("reason", rejectReason);

      await fetch(`http://localhost:8000/api/workers/${workerId}/checklist/${itemId}/reject`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      setRejectItemId(null);
      setRejectReason("");
      await fetchChecklist();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkNA = async (itemId: string) => {
    setActionLoading(itemId);
    try {
      await fetch(`http://localhost:8000/api/workers/${workerId}/checklist/${itemId}/mark-na`, {
        method: "POST",
        headers: authHeaders(),
      });
      await fetchChecklist();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = (itemId: string, docId: string, fileName: string) => {
    const url = `http://localhost:8000/api/workers/${workerId}/checklist/${itemId}/download/${docId}`;
    fetch(url, {
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
      <div className="flex items-center justify-center" style={{ padding: 40 }}>
        <Loader2 className="animate-spin text-brand-500" style={{ width: 24, height: 24 }} />
      </div>
    );
  }

  const completed = items.filter((i) => i.status === "verified" || i.status === "not_applicable").length;
  const uploaded = items.filter((i) => i.status === "uploaded").length;
  const rejected = items.filter((i) => i.status === "rejected").length;

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
      />

      {/* Progress Summary */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 bg-white rounded-xl border border-[var(--border)]"
        style={{ padding: 16, marginBottom: 20, gap: 12 }}
      >
        <div className="text-center">
          <div className="text-2xl font-bold text-brand-900">{completed}</div>
          <div className="text-xs text-[var(--muted-foreground)]">Verified / N/A</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{uploaded}</div>
          <div className="text-xs text-[var(--muted-foreground)]">Awaiting Review</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{rejected}</div>
          <div className="text-xs text-[var(--muted-foreground)]">Rejected</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-500">
            {items.length - completed - uploaded - rejected}
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">Not Started</div>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="rounded-full bg-gray-100 overflow-hidden"
        style={{ height: 8, marginBottom: 24 }}
      >
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${(completed / items.length) * 100}%` }}
        />
      </div>

      {/* Checklist Items */}
      <div className="space-y-2">
        {items.map((item) => {
          const badge = STATUS_BADGES[item.status] ?? STATUS_BADGES.not_started;
          const isExpanded = expandedId === item.id;
          const isItemLoading = actionLoading === item.id || uploading === item.id;

          return (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-[var(--border)] overflow-hidden"
            >
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

                <span
                  className="text-xs font-bold text-brand-500 shrink-0"
                  style={{ width: 28 }}
                >
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
                <div
                  className="border-t border-[var(--border)] bg-gray-50"
                  style={{ padding: "16px 20px" }}
                >
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
                              <div className="text-sm font-medium text-brand-900 truncate">
                                {doc.file_name}
                              </div>
                              <div className="text-xs text-[var(--muted-foreground)]">
                                Uploaded by {doc.uploaded_by ?? "—"} ({doc.uploaded_by_role})
                                {doc.upload_date && ` on ${new Date(doc.upload_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`}
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

                  {/* Actions */}
                  <div className="flex flex-wrap" style={{ gap: 8 }}>
                    {/* Upload button (available to everyone unless verified) */}
                    {item.status !== "verified" && item.status !== "not_applicable" && (
                      <button
                        type="button"
                        onClick={() => handleUploadClick(item.id)}
                        disabled={isItemLoading}
                        className="inline-flex items-center rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors cursor-pointer"
                        style={{ padding: "7px 14px", gap: 6, fontSize: 13 }}
                      >
                        {uploading === item.id ? (
                          <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
                        ) : (
                          <Upload style={{ width: 14, height: 14 }} />
                        )}
                        {item.documents.length > 0 ? "Re-upload" : "Upload Document"}
                      </button>
                    )}

                    {/* HR-only actions */}
                    {isStaff && item.status === "uploaded" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleVerify(item.id)}
                          disabled={isItemLoading}
                          className="inline-flex items-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                          style={{ padding: "7px 14px", gap: 6, fontSize: 13 }}
                        >
                          {actionLoading === item.id ? (
                            <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
                          ) : (
                            <CheckCircle2 style={{ width: 14, height: 14 }} />
                          )}
                          Verify
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectItemId(rejectItemId === item.id ? null : item.id)}
                          disabled={isItemLoading}
                          className="inline-flex items-center rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
                          style={{ padding: "7px 14px", gap: 6, fontSize: 13 }}
                        >
                          <XCircle style={{ width: 14, height: 14 }} />
                          Reject
                        </button>
                      </>
                    )}

                    {isStaff && item.status !== "not_applicable" && item.status !== "verified" && (
                      <button
                        type="button"
                        onClick={() => handleMarkNA(item.id)}
                        disabled={isItemLoading}
                        className="inline-flex items-center rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 transition-colors cursor-pointer"
                        style={{ padding: "7px 14px", gap: 6, fontSize: 13 }}
                      >
                        <Ban style={{ width: 14, height: 14 }} />
                        N/A
                      </button>
                    )}
                  </div>

                  {/* Reject reason input */}
                  {rejectItemId === item.id && (
                    <div className="flex" style={{ gap: 8, marginTop: 12 }}>
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection..."
                        className="flex-1 rounded-lg border border-[var(--border)] bg-white text-sm outline-none focus:border-brand-400"
                        style={{ height: 36, padding: "0 12px" }}
                      />
                      <button
                        type="button"
                        onClick={() => handleReject(item.id)}
                        className="rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                        style={{ padding: "0 16px", fontSize: 13 }}
                      >
                        Confirm Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
