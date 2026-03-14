"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import {
  Upload,
  CheckCircle2,
  XCircle,
  Eye,
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

const API_URL = "/api";

export default function PortalDocumentsPage() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [viewing, setViewing] = useState<{ name: string; url: string; mime: string; watermark: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadItemId, setUploadItemId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const fetchChecklist = useCallback(async () => {
    try {
      const data = await api.get<ChecklistItem[]>("/portal/checklist", token ?? undefined);
      setItems(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load checklist");
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
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/portal/checklist/${uploadItemId}/upload`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Upload failed (${res.status})`);
      }

      await fetchChecklist();
      setFilter("uploaded");
      setExpandedId(uploadItemId);
      setSuccess("Document uploaded successfully.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setUploading(null);
      setUploadItemId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleView = async (itemId: string, docId: string, fileName: string) => {
    setError("");
    const res = await fetch(`${API_URL}/portal/checklist/${itemId}/view/${docId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.detail || "Unable to open document");
      return;
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const payload = await res.json();
      if (payload?.mode === "wrapped" && payload?.payload_b64) {
        const binary = atob(payload.payload_b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: payload.mime || "application/pdf" });
        const url = URL.createObjectURL(blob);
        const wm = `CONFIDENTIAL | ${user?.email || "employee"} | ${new Date().toLocaleString()}`;
        setViewing({ name: payload.name || fileName, url, mime: payload.mime || "application/pdf", watermark: wm });
      }
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const wm = `CONFIDENTIAL | ${user?.email || "employee"} | ${new Date().toLocaleString()}`;
    setViewing({ name: fileName, url, mime: blob.type || "application/pdf", watermark: wm });
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
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700" style={{ padding: "10px 12px", fontSize: 13 }}>
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700" style={{ padding: "10px 12px", fontSize: 13 }}>
          {success}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
      />

      <div className="data-card" style={{ padding: 16 }}>
        <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
          <div>
            <h1 className="admin-page-title">My Documents</h1>
            <p className="admin-page-subtitle" style={{ marginTop: 6 }}>
              Upload your compliance documents. HR reviews and verifies each item.
            </p>
          </div>
          <div
            className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700"
            style={{ padding: "10px 12px", minWidth: 120, textAlign: "center" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide">Completion</p>
            <p className="text-xl font-bold" style={{ marginTop: 2 }}>{pct}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 10 }}>
        <SummaryCard
          label="Pending Upload"
          value={notStarted}
          active={filter === "pending"}
          tone="gray"
          onClick={() => setFilter(filter === "pending" ? "all" : "pending")}
        />
        <SummaryCard
          label="Awaiting Review"
          value={uploaded}
          active={filter === "uploaded"}
          tone="blue"
          onClick={() => setFilter(filter === "uploaded" ? "all" : "uploaded")}
        />
        <SummaryCard
          label="Rejected"
          value={rejected}
          active={filter === "rejected"}
          tone="red"
          onClick={() => setFilter(filter === "rejected" ? "all" : "rejected")}
        />
        <SummaryCard
          label="Verified"
          value={completed}
          active={filter === "verified"}
          tone="green"
          onClick={() => setFilter(filter === "verified" ? "all" : "verified")}
        />
      </div>

      <div className="data-card" style={{ padding: 12 }}>
        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Progress
            </p>
            <p className="text-xs font-semibold text-brand-700">{completed}/{items.length} complete</p>
          </div>
          <div className="rounded-full bg-gray-100 overflow-hidden" style={{ height: 8, marginTop: 8 }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: pct === 100 ? "#10b981" : pct >= 50 ? "#3b82f6" : "#f59e0b",
              }}
            />
          </div>
        </div>
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

      <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
        {[
          { id: "all", label: "All" },
          { id: "pending", label: "Pending" },
          { id: "uploaded", label: "Uploaded" },
          { id: "rejected", label: "Rejected" },
          { id: "verified", label: "Verified" },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full text-xs font-semibold transition-colors ${
              filter === f.id
                ? "bg-brand-600 text-white"
                : "border border-[var(--border)] bg-white text-gray-700 hover:bg-gray-50"
            }`}
            style={{ padding: "6px 12px" }}
          >
            {f.label}
          </button>
        ))}
      </div>

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
                className="w-full flex items-center text-left cursor-pointer hover:bg-brand-50/40 transition-colors"
                style={{ padding: "13px 16px", gap: 12 }}
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
                              onClick={() => handleView(item.id, doc.id, doc.file_name)}
                              className="flex items-center rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors cursor-pointer"
                              style={{ padding: "6px 10px", gap: 4, fontSize: 12 }}
                            >
                              <Eye style={{ width: 13, height: 13 }} /> View
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
          {filter !== "all" && (
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="mt-3 rounded-lg border border-[var(--border)] bg-white text-xs text-brand-700 hover:bg-gray-50"
              style={{ padding: "6px 10px" }}
            >
              Show all items
            </button>
          )}
        </div>
      )}

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(12, 20, 36, 0.62)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              URL.revokeObjectURL(viewing.url);
              setViewing(null);
            }
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-xl w-full" style={{ maxWidth: 960, height: "88vh", padding: 12 }}>
            <div className="flex items-center justify-between" style={{ gap: 8, marginBottom: 8 }}>
              <div>
                <p className="text-sm font-semibold text-brand-900">{viewing.name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">View only. Download is disabled.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(viewing.url);
                  setViewing(null);
                }}
                className="rounded-lg border border-[var(--border)] bg-white text-xs text-brand-700 hover:bg-gray-50"
                style={{ padding: "6px 10px" }}
              >
                Close
              </button>
            </div>
            <div style={{ position: "relative", width: "100%", height: "calc(88vh - 70px)" }}>
              {viewing.mime.startsWith("image/") ? (
                <div className="flex items-center justify-center bg-gray-50" style={{ width: "100%", height: "100%", border: "1px solid var(--border)", borderRadius: 12, overflow: "auto" }}>
                  <img src={viewing.url} alt={viewing.name} style={{ maxWidth: "100%", maxHeight: "100%" }} />
                </div>
              ) : (
                <object
                  data={viewing.url}
                  type={viewing.mime || "application/pdf"}
                  style={{ width: "100%", height: "100%", border: "1px solid var(--border)", borderRadius: 12, background: "#fff" }}
                >
                  <iframe
                    src={viewing.url}
                    title="Document viewer"
                    style={{ width: "100%", height: "100%", border: "none", borderRadius: 12 }}
                  />
                </object>
              )}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  overflow: "hidden",
                  borderRadius: 12,
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                  gridTemplateRows: "repeat(4, minmax(0,1fr))",
                }}
              >
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: "rotate(-22deg)",
                      color: "rgba(15, 23, 42, 0.22)",
                      fontSize: 16,
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                      userSelect: "none",
                      textTransform: "none",
                    }}
                  >
                    {viewing.watermark}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  active,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  tone: "gray" | "blue" | "red" | "green";
  onClick: () => void;
}) {
  const tones = {
    gray: { text: "text-gray-600", bg: active ? "bg-gray-100" : "bg-white" },
    blue: { text: "text-blue-600", bg: active ? "bg-blue-50" : "bg-white" },
    red: { text: "text-red-600", bg: active ? "bg-red-50" : "bg-white" },
    green: { text: "text-emerald-600", bg: active ? "bg-emerald-50" : "bg-white" },
  } as const;
  const conf = tones[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border border-[var(--border)] text-center transition-colors hover:bg-gray-50 ${conf.bg}`}
      style={{ padding: 10 }}
    >
      <p className={`text-2xl font-bold ${conf.text}`}>{value}</p>
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
    </button>
  );
}
