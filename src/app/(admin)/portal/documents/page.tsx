"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
  ListChecks,
} from "lucide-react";
import "../../dashboard/dashboard-marketing.css";
import "../../workers/workers-page.css";

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

const API_URL = "/api";

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

function itemStatusPill(status: ChecklistItem["status"]) {
  const map: Record<string, string> = {
    not_started: "border-[rgba(0,0,0,0.12)] bg-[#f8fafc] text-[#64748b]",
    uploaded: "border-[rgba(26,79,160,0.25)] bg-[rgba(26,79,160,0.08)] text-[#0f2d5e]",
    verified: "border-[rgba(22,163,74,0.35)] bg-[#f0fdf4] text-[#166534]",
    rejected: "border-[rgba(220,38,38,0.35)] bg-[rgba(254,242,242,0.85)] text-[#991b1b]",
    not_applicable: "border-[rgba(0,0,0,0.1)] bg-[#f1f5f9] text-[#64748b]",
  };
  const label: Record<string, string> = {
    not_started: "Not started",
    uploaded: "Uploaded",
    verified: "Verified",
    rejected: "Rejected",
    not_applicable: "N/A",
  };
  return { cls: map[status] ?? map.not_started, label: label[status] ?? status };
}

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
    if (!token) return;
    try {
      setError("");
      const data = await api.get<ChecklistItem[]>("/portal/checklist", token);
      setItems(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load checklist");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchChecklist();
  }, [token, fetchChecklist]);

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
          Sign in to manage your documents.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Loading your checklist…
        </p>
      </div>
    );
  }

  const completed = items.filter((i) => i.status === "verified" || i.status === "not_applicable").length;
  const uploaded = items.filter((i) => i.status === "uploaded").length;
  const rejected = items.filter((i) => i.status === "rejected").length;
  const notStarted = items.length - completed - uploaded - rejected;
  const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  const filtered =
    filter === "all"
      ? items
      : items.filter((i) => {
          if (filter === "pending") return i.status === "not_started";
          if (filter === "rejected") return i.status === "rejected";
          if (filter === "uploaded") return i.status === "uploaded";
          if (filter === "verified") return i.status === "verified" || i.status === "not_applicable";
          return true;
        });

  const setFilterToggle = (key: string) => {
    if (key === "all") setFilter("all");
    else setFilter(filter === key ? "all" : key);
  };

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

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
      />

      <div className="adm-ph adm-ph-portal">
        <div className="min-w-0">
          <div className="adm-ph-ey">Employee portal</div>
          <h1 className="adm-ph-title">
            My <em className="dash-title-em">documents</em>
          </h1>
          <div className="adm-ph-date">{todayStr}</div>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#64748b]">
            Upload compliance documents for each checklist item. HR reviews and verifies uploads.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className="adm-ph-badge inline-flex min-w-[100px] flex-col items-center border border-[rgba(22,163,74,0.3)] bg-[#f0fdf4] px-3 py-2 text-[#166534]"
            style={MONO}
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] opacity-80">Completion</span>
            <span className="text-xl font-extrabold tabular-nums">{pct}%</span>
          </span>
        </div>
      </div>

      <div
        className="adm-stat-row grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        style={{ gap: 2, background: "rgba(0,0,0,0.07)", marginBottom: 16 }}
      >
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`adm-sc adm-sc-b bg-white px-3 py-4 text-left transition-shadow ${filter === "all" ? "ring-2 ring-[var(--dash-blue)] ring-offset-2" : ""}`}
        >
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b">
              <ListChecks className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">All</span>
          </div>
          <div className="adm-sc-num">{items.length}</div>
          <div className="adm-sc-lbl">Items</div>
          <div className="adm-sc-sub">Full checklist</div>
        </button>
        <button
          type="button"
          onClick={() => setFilterToggle("pending")}
          className={`adm-sc adm-sc-a bg-white px-3 py-4 text-left transition-shadow ${filter === "pending" ? "ring-2 ring-[var(--dash-blue)] ring-offset-2" : ""}`}
        >
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-a">
              <Upload className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Todo</span>
          </div>
          <div className="adm-sc-num">{notStarted}</div>
          <div className="adm-sc-lbl">Pending upload</div>
          <div className="adm-sc-sub">Not started</div>
        </button>
        <button
          type="button"
          onClick={() => setFilterToggle("uploaded")}
          className={`adm-sc adm-sc-a bg-white px-3 py-4 text-left transition-shadow ${filter === "uploaded" ? "ring-2 ring-[var(--dash-blue)] ring-offset-2" : ""}`}
        >
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-a">
              <FileText className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Queue</span>
          </div>
          <div className="adm-sc-num">{uploaded}</div>
          <div className="adm-sc-lbl">Awaiting review</div>
          <div className="adm-sc-sub">With HR</div>
        </button>
        <button
          type="button"
          onClick={() => setFilterToggle("rejected")}
          className={`adm-sc adm-sc-r bg-white px-3 py-4 text-left transition-shadow ${filter === "rejected" ? "ring-2 ring-[var(--dash-blue)] ring-offset-2" : ""}`}
        >
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-r">
              <XCircle className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Fix</span>
          </div>
          <div className="adm-sc-num">{rejected}</div>
          <div className="adm-sc-lbl">Rejected</div>
          <div className="adm-sc-sub">Re-upload needed</div>
        </button>
        <button
          type="button"
          onClick={() => setFilterToggle("verified")}
          className={`adm-sc adm-sc-b bg-white px-3 py-4 text-left sm:col-span-3 lg:col-span-1 ${filter === "verified" ? "ring-2 ring-[var(--dash-blue)] ring-offset-2" : ""}`}
        >
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b">
              <CheckCircle2 className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">OK</span>
          </div>
          <div className="adm-sc-num">{completed}</div>
          <div className="adm-sc-lbl">Verified / N/A</div>
          <div className="adm-sc-sub">Complete</div>
        </button>
      </div>

      <div className="wem-surface">
        <div className="wem-toolbar">
          <span className="flex items-center gap-2 text-[11px] font-extrabold text-[#0a0a0a]">
            <ListChecks className="h-4 w-4 text-[var(--dash-blue)]" />
            Overall progress
          </span>
          <span className="wem-badge-mono" style={MONO}>
            {completed}/{items.length} complete
          </span>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.07)] bg-white px-4 py-3">
          <div className="h-2 overflow-hidden bg-[rgba(0,0,0,0.06)]">
            <div className="h-full bg-[var(--dash-blue)] transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {rejected > 0 && filter === "all" && (
        <div
          className="mt-3 flex items-center gap-2 border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-800"
          style={MONO}
        >
          <XCircle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{rejected}</strong> document{rejected !== 1 ? "s" : ""} rejected — please re-upload with corrections.
          </span>
        </div>
      )}

      <div className="mt-4 wem-surface">
        <div className="wem-toolbar flex-wrap">
          <span className="wem-badge-mono" style={MONO}>
            {filtered.length} shown
          </span>
          <div className="wlp-filter-group flex-wrap">
            {[
              { id: "all", label: "All" },
              { id: "pending", label: "Pending" },
              { id: "uploaded", label: "Uploaded" },
              { id: "rejected", label: "Rejected" },
              { id: "verified", label: "Verified" },
            ].map((f) => (
              <button key={f.id} type="button" onClick={() => setFilter(f.id)} className={`wlp-filter-chip ${filter === f.id ? "act" : ""}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-[rgba(0,0,0,0.07)] bg-[var(--dash-cream)] p-3">
          {filtered.map((item) => {
            const pill = itemStatusPill(item.status);
            const isExpanded = expandedId === item.id;
            const isUploading = uploading === item.id;

            return (
              <div key={item.id} className="overflow-hidden border border-[rgba(0,0,0,0.08)] bg-white">
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[rgba(26,79,160,0.04)]"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-[#94a3b8]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#94a3b8]" />
                  )}
                  <span className="w-7 shrink-0 text-[11px] font-bold text-[var(--dash-blue)]" style={MONO}>
                    #{item.item_number}
                  </span>
                  <span className="min-w-0 flex-1 text-[13px] font-medium text-[#0a0a0a]">{item.description}</span>
                  <span
                    className={`inline-flex shrink-0 border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] ${pill.cls}`}
                    style={MONO}
                  >
                    {pill.label}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-[rgba(0,0,0,0.07)] bg-[#f8fafc] px-4 py-4">
                    {item.documents.length > 0 && (
                      <div className="mb-4">
                        <h4 className="mb-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[#64748b]" style={MONO}>
                          Uploaded files
                        </h4>
                        <div className="space-y-2">
                          {item.documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex flex-wrap items-center gap-2 border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 sm:flex-nowrap"
                            >
                              <FileText className="h-4 w-4 shrink-0 text-[var(--dash-blue)]" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px] font-semibold text-[#0a0a0a]">{doc.file_name}</div>
                                <div className="text-[11px] text-[#94a3b8]" style={MONO}>
                                  {doc.upload_date
                                    ? `Uploaded ${new Date(doc.upload_date).toLocaleDateString("en-GB", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })}`
                                    : "Uploaded"}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleView(item.id, doc.id, doc.file_name)}
                                className="inline-flex h-8 shrink-0 items-center gap-1.5 border border-[rgba(0,0,0,0.1)] bg-[#f0f0eb] px-3 text-[9px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[rgba(26,79,160,0.08)]"
                                style={MONO}
                              >
                                <Eye className="h-3 w-3" /> View
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.status === "rejected" && item.rejection_reason && (
                      <div className="mb-4 border border-[rgba(220,38,38,0.35)] bg-[rgba(254,242,242,0.85)] px-3 py-2 text-[12px] text-[#991b1b]">
                        <strong style={MONO}>Rejection reason:</strong> {item.rejection_reason}
                      </div>
                    )}

                    {item.status === "verified" && item.verified_by && (
                      <div className="mb-4 border border-[rgba(22,163,74,0.35)] bg-[#f0fdf4] px-3 py-2 text-[12px] text-[#166534]">
                        <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                        Verified by {item.verified_by}
                        {item.verified_at &&
                          ` on ${new Date(item.verified_at).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}`}
                      </div>
                    )}

                    {item.notes && (
                      <div className="mb-4 border border-[rgba(26,79,160,0.2)] bg-[rgba(26,79,160,0.05)] px-3 py-2 text-[12px] text-[#0f2d5e]">
                        <MessageSquare className="mr-1 inline h-3.5 w-3.5" />
                        {item.notes}
                      </div>
                    )}

                    {item.status !== "verified" && item.status !== "not_applicable" && (
                      <button
                        type="button"
                        onClick={() => handleUploadClick(item.id)}
                        disabled={isUploading}
                        className="inline-flex h-9 items-center gap-2 border border-[rgba(0,0,0,0.12)] bg-[#0f2d5e] px-4 text-[9px] font-bold uppercase tracking-[0.07em] text-white hover:bg-[#1a4fa0] disabled:opacity-50"
                        style={MONO}
                      >
                        {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        {item.documents.length > 0 ? "Re-upload document" : "Upload document"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="mt-4 flex flex-col items-center justify-center border border-[rgba(0,0,0,0.08)] bg-white py-14">
          <div className="adm-ae-icon">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="adm-ae-t mt-3">{filter === "all" ? "No checklist items" : `No ${filter} items`}</div>
          <div className="adm-ae-s">Try another filter or contact HR if this looks wrong.</div>
          {filter !== "all" && (
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="mt-4 h-8 border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[9px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[#f8fafc]"
              style={MONO}
            >
              Show all items
            </button>
          )}
        </div>
      )}

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              URL.revokeObjectURL(viewing.url);
              setViewing(null);
            }
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="flex h-[88vh] w-full max-w-[960px] flex-col border border-[rgba(0,0,0,0.1)] bg-white shadow-lg">
            <div className="flex items-center justify-between gap-2 border-b border-[rgba(0,0,0,0.07)] px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-[#0a0a0a]">{viewing.name}</p>
                <p className="text-[10px] text-[#64748b]" style={MONO}>
                  View only · download disabled
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(viewing.url);
                  setViewing(null);
                }}
                className="h-8 shrink-0 border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[9px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[#f8fafc]"
                style={MONO}
              >
                Close
              </button>
            </div>
            <div className="relative min-h-0 flex-1 p-2">
              {viewing.mime.startsWith("image/") ? (
                <div className="flex h-full w-full items-center justify-center overflow-auto border border-[rgba(0,0,0,0.08)] bg-[#f8fafc]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={viewing.url} alt={viewing.name} className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <object
                  data={viewing.url}
                  type={viewing.mime || "application/pdf"}
                  className="h-full w-full border border-[rgba(0,0,0,0.08)] bg-white"
                >
                  <iframe src={viewing.url} title="Document viewer" className="h-full w-full border-0" />
                </object>
              )}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-2 grid grid-cols-3 grid-rows-4 overflow-hidden"
                style={{ borderRadius: 0 }}
              >
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-center text-base font-bold tracking-wide text-[rgba(15,23,42,0.18)] select-none"
                    style={{ transform: "rotate(-22deg)" }}
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
