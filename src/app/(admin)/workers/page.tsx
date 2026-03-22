"use client";

import { useEffect, useState, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import {
  Users,
  Search,
  ChevronDown,
  Plus,
  Upload,
  Download,
  FileSpreadsheet,
  X,
  Loader2,
  Star,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Phone,
  Mail,
  Eye,
  MoreHorizontal,
  UserPlus,
} from "lucide-react";
import "./workers-page.css";

interface Worker {
  id: string;
  name: string;
  job_title: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  department: string | null;
  salary: number;
  route: string;
  work_location: string | null;
  status: string;
  stage: string;
  risk_level: string;
  visa_expiry: string | null;
  start_date: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "wlp-st-active" },
  suspended: { label: "Suspended", cls: "wlp-st-warn" },
  terminated: { label: "Terminated", cls: "wlp-st-inactive" },
};

const PAGE_SIZE = 9;

function relativeShort(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 48) return `${hours}h ago`;
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

const STAFF_ROLES = ["super_admin", "tenant_admin", "compliance_manager", "hr_officer"];

const API_URL = "/api";

function tabToApiStatus(tab: string): string {
  if (tab === "active" || tab === "sponsored") return "active";
  return "";
}

function isSponsoredRoute(route: string | null | undefined): boolean {
  if (!route || !route.trim()) return false;
  return true;
}

export default function WorkersPage() {
  return (
    <Suspense
      fallback={
        <div className="worker-list-page flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-[#1d4ed8]" />
        </div>
      }
    >
      <WorkersPageInner />
    </Suspense>
  );
}

function WorkersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "all";

  const { token, user } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [statsWorkers, setStatsWorkers] = useState<Worker[]>([]);
  const [onLeaveIds, setOnLeaveIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ created: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [starred, setStarred] = useState<Record<string, boolean>>({});

  const [compliance, setCompliance] = useState<Record<string, { total: number; verified: number; uploaded: number; rejected: number }>>({});

  const canManage = user ? STAFF_ROLES.includes(user.role) : false;

  useEffect(() => {
    try {
      const raw = localStorage.getItem("protexi-worker-stars");
      if (raw) setStarred(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (searchParams.get("bulk") === "1") {
      setBulkOpen(true);
      const t = searchParams.get("tab") || "all";
      router.replace(`/workers?tab=${t}`, { scroll: false });
    }
  }, [searchParams, router]);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const st = tabToApiStatus(tab);
      if (st) params.set("status", st);
      const qs = params.toString();
      const data = await api.get<Worker[]>(`/workers${qs ? `?${qs}` : ""}`, token ?? undefined);
      setWorkers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatsWorkers = async () => {
    try {
      const data = await api.get<Worker[]>("/workers", token ?? undefined);
      setStatsWorkers(data);
    } catch {
      setStatsWorkers([]);
    }
  };

  const fetchOnLeave = async () => {
    if (!token) return;
    try {
      const leaves = await api.get<Array<{ worker_id: string; start_date: string; end_date: string }>>(
        `/leave/all?status_filter=approved`,
        token
      );
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const ids = new Set<string>();
      for (const l of leaves) {
        const s = new Date(l.start_date);
        const e = new Date(l.end_date);
        s.setHours(0, 0, 0, 0);
        e.setHours(23, 59, 59, 999);
        if (today >= s && today <= e) ids.add(l.worker_id);
      }
      setOnLeaveIds(ids);
    } catch {
      setOnLeaveIds(new Set());
    }
  };

  const fetchCompliance = async () => {
    try {
      const data = await api.get<Record<string, { total: number; verified: number; uploaded: number; rejected: number }>>(
        "/workers/compliance-summary",
        token ?? undefined
      );
      setCompliance(data);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, search, tab]);

  useEffect(() => {
    if (token) {
      fetchStatsWorkers();
      fetchOnLeave();
    }
  }, [token]);

  useEffect(() => {
    if (canManage && token) fetchCompliance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, canManage]);

  useEffect(() => {
    setPage(1);
  }, [search, tab]);

  const filteredWorkers = useMemo(() => {
    let list = workers;
    if (tab === "sponsored") {
      list = list.filter((w) => isSponsoredRoute(w.route));
    }
    if (tab === "on_leave") {
      list = list.filter((w) => onLeaveIds.has(w.id));
    }
    return list;
  }, [workers, tab, onLeaveIds]);

  const totalPages = Math.max(1, Math.ceil(filteredWorkers.length / PAGE_SIZE));
  const paginatedWorkers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredWorkers.slice(start, start + PAGE_SIZE);
  }, [filteredWorkers, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const miniStats = useMemo(() => {
    const sw = statsWorkers;
    const active = sw.filter((w) => w.status === "active").length;
    const sponsored = sw.filter((w) => isSponsoredRoute(w.route)).length;
    const onLeave = onLeaveIds.size;
    const docsPending = sw.filter((w) => {
      const c = compliance[w.id];
      if (!c) return true;
      if (c.total === 0) return false;
      return c.verified < c.total;
    }).length;
    return { active, sponsored, onLeave, docsPending };
  }, [statsWorkers, onLeaveIds, compliance]);

  const tabLabel =
    tab === "all"
      ? "All"
      : tab === "active"
        ? "Active"
        : tab === "sponsored"
          ? "Sponsored"
          : tab === "on_leave"
            ? "On leave"
            : "All";

  const handleDownloadTemplate = async () => {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/workers/template`, { headers });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee_bulk_template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return;
    setBulkUploading(true);
    setBulkResult(null);
    try {
      const formData = new FormData();
      formData.append("file", bulkFile);

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/workers/bulk`, {
        method: "POST",
        body: formData,
        headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Upload failed: ${res.status}`);
      }

      const data = await res.json();
      setBulkResult(data);
      if (data.created > 0) {
        fetchWorkers();
        fetchStatsWorkers();
        if (canManage) fetchCompliance();
      }
    } catch (err: unknown) {
      setBulkResult({ created: 0, errors: [err instanceof Error ? err.message : "Upload failed"] });
    } finally {
      setBulkUploading(false);
    }
  };

  const closeBulkModal = () => {
    setBulkOpen(false);
    setBulkFile(null);
    setBulkResult(null);
  };

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarred((s) => {
      const n = { ...s, [id]: !s[id] };
      try {
        localStorage.setItem("protexi-worker-stars", JSON.stringify(n));
      } catch {
        /* ignore */
      }
      return n;
    });
  };

  const openProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/workers/${id}?tab=records`);
  };

  const moreOptions = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="worker-list-page">
      {/* Page header — matches HTML (actions live in subnav) */}
      <div className="wlp-ph">
        <div>
          <div className="wlp-ph-ey">Workforce</div>
          <h1 className="wlp-ph-title">Employees</h1>
          <p className="wlp-ph-sub">
            {miniStats.sponsored} sponsored worker{miniStats.sponsored !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Mini stats — from API-backed stats + compliance */}
      <div className="wlp-mini-stats">
        <div className="wlp-ms">
          <div className="wlp-ms-dot bg-[#22C55E]" />
          <span className="wlp-ms-label">Active</span>
          <span className="wlp-ms-val">{miniStats.active}</span>
        </div>
        <div className="wlp-ms">
          <div className="wlp-ms-dot bg-[#2563EB]" />
          <span className="wlp-ms-label">Sponsored</span>
          <span className="wlp-ms-val">{miniStats.sponsored}</span>
        </div>
        <div className="wlp-ms">
          <div className="wlp-ms-dot bg-[#F59E0B]" />
          <span className="wlp-ms-label">On Leave</span>
          <span className="wlp-ms-val">{miniStats.onLeave}</span>
        </div>
        <div className="wlp-ms">
          <div className="wlp-ms-dot bg-[#E11D48]" />
          <span className="wlp-ms-label">Docs Pending</span>
          <span className="wlp-ms-val">{miniStats.docsPending}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="wlp-toolbar">
        <div className="wlp-tb-search">
          <Search className="h-[15px] w-[15px] shrink-0 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by name, role, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="wlp-tb-results">
          <Search className="h-[13px] w-[13px] opacity-90" />
          {loading ? "…" : `${filteredWorkers.length} results`}
        </div>
        <div className="wlp-tb-sep" />
        <div className="wlp-tb-filter">
          <ChevronDown className="h-[13px] w-[13px] opacity-50" />
          Filter
        </div>
        <div className="wlp-tb-filter">
          Status: {tabLabel}
          <ChevronDown className="h-[13px] w-[13px] opacity-50" />
        </div>
        <div className="wlp-view-toggle">
          <button
            type="button"
            className={`wlp-vt-btn ${viewMode === "grid" ? "act" : ""}`}
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-[14px] w-[14px]" />
          </button>
          <button
            type="button"
            className={`wlp-vt-btn ${viewMode === "list" ? "act" : ""}`}
            onClick={() => setViewMode("list")}
            aria-label="List view"
          >
            <List className="h-[14px] w-[14px]" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-[#1d4ed8]" />
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="wlp-empty-state">
          <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">
            {search || tab !== "all" ? "No employees match your filters" : "No employees found"}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <>
          <div className="wlp-emp-grid">
            {paginatedWorkers.map((w) => (
              <EmployeeHtmlCard
                key={w.id}
                worker={w}
                compliance={compliance[w.id]}
                starred={!!starred[w.id]}
                onToggleStar={(e) => toggleStar(w.id, e)}
                onOpen={() => router.push(`/workers/${w.id}?tab=records`)}
                onProfile={(e) => openProfile(w.id, e)}
                onMore={moreOptions}
              />
            ))}
            {canManage && page === 1 && (
              <button
                type="button"
                className="wlp-add-card"
                onClick={() => router.push("/workers/new")}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-[#BFDBFE] bg-[#EFF6FF]">
                  <UserPlus className="h-[22px] w-[22px] text-[#2563EB]" />
                </div>
                <div className="text-center">
                  <div className="text-[14px] font-bold text-[#1D4ED8]">Add New Employee</div>
                  <div className="mt-1 text-[12px] text-[#94A3B8]">Click to onboard a new sponsored worker</div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-[9px] bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] px-4 py-2 text-[13px] font-semibold text-white shadow-md">
                  <Plus className="h-3 w-3" />
                  Add Employee
                </span>
              </button>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#E8EEFF] bg-white px-3 text-sm font-medium text-slate-700 shadow-sm disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <span className="text-sm text-slate-600">
                Page <span className="font-bold text-[#1d4ed8]">{page}</span> of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#E8EEFF] bg-white px-3 text-sm font-medium text-slate-700 shadow-sm disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E8EEFF] bg-white">
          <table className="wlp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Email</th>
                <th>Docs</th>
              </tr>
            </thead>
            <tbody>
              {paginatedWorkers.map((w) => {
                const c = compliance[w.id];
                const pct = c && c.total > 0 ? Math.round((c.verified / c.total) * 100) : null;
                const st = STATUS_CONFIG[w.status] ?? STATUS_CONFIG.active;
                return (
                  <tr
                    key={w.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/workers/${w.id}?tab=records`)}
                  >
                    <td className="font-semibold">{w.name}</td>
                    <td>{w.job_title || "—"}</td>
                    <td>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          w.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : w.status === "suspended"
                              ? "bg-amber-50 text-amber-800"
                              : "bg-red-50 text-red-700"
                        }`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate text-[#2563EB]">{w.email || "—"}</td>
                    <td>{pct !== null ? `${pct}%` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-3 border-t border-[#F0F4FF] py-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#E8EEFF] bg-white px-3 text-sm font-medium text-slate-700 shadow-sm disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <span className="text-sm text-slate-600">
                Page <span className="font-bold text-[#1d4ed8]">{page}</span> of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#E8EEFF] bg-white px-3 text-sm font-medium text-slate-700 shadow-sm disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {bulkOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeBulkModal();
          }}
        >
          <div
            className="w-full max-w-[520px] rounded-2xl border border-[var(--border)] bg-white px-8 py-7 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
                  <FileSpreadsheet className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-brand-900">Bulk Upload</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">Import employees from Excel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeBulkModal}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg hover:bg-brand-50"
              >
                <X className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 px-5 py-4">
              <p className="mb-1 text-sm font-medium text-brand-800">Step 1: Download the template</p>
              <p className="mb-3 text-xs text-[var(--muted-foreground)]">
                The template includes column headers and sample rows. Fill in your data and upload below.
              </p>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                <Download className="h-3.5 w-3.5" />
                Download Template
              </button>
            </div>

            <div className="mb-5 rounded-xl border border-dashed border-[var(--border)] px-5 py-4">
              <p className="mb-1 text-sm font-medium text-brand-800">Step 2: Upload your filled file</p>
              <p className="mb-3 text-xs text-[var(--muted-foreground)]">Accepted format: .xlsx</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  setBulkFile(e.target.files?.[0] ?? null);
                  setBulkResult(null);
                }}
              />
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Choose File
                </button>
                {bulkFile && <span className="max-w-[200px] truncate text-sm text-brand-800">{bulkFile.name}</span>}
              </div>
            </div>

            {bulkResult && (
              <div
                className={`mb-4 rounded-xl border px-4 py-3 ${bulkResult.created > 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}
              >
                {bulkResult.created > 0 && (
                  <p className="text-sm font-medium text-emerald-800">
                    Successfully added {bulkResult.created} employee{bulkResult.created !== 1 ? "s" : ""}
                  </p>
                )}
                {bulkResult.errors.length > 0 &&
                  bulkResult.errors.map((err, i) => (
                    <p key={i} className="text-sm text-red-700">
                      {err}
                    </p>
                  ))}
              </div>
            )}

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={closeBulkModal}
                className="h-10 cursor-pointer rounded-xl border border-[var(--border)] bg-white px-4.5 text-sm font-medium text-brand-800 hover:bg-brand-50"
              >
                {bulkResult && bulkResult.created > 0 ? "Done" : "Cancel"}
              </button>
              {!(bulkResult && bulkResult.created > 0) && (
                <button
                  type="button"
                  disabled={!bulkFile || bulkUploading}
                  onClick={handleBulkUpload}
                  className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {bulkUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {bulkUploading ? "Uploading..." : "Upload & Import"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeHtmlCard({
  worker: w,
  compliance: c,
  starred,
  onToggleStar,
  onOpen,
  onProfile,
  onMore,
}: {
  worker: Worker;
  compliance?: { total: number; verified: number; uploaded: number; rejected: number };
  starred: boolean;
  onToggleStar: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onProfile: (e: React.MouseEvent) => void;
  onMore: (e: React.MouseEvent) => void;
}) {
  const st = STATUS_CONFIG[w.status] ?? STATUS_CONFIG.active;
  const initials = w.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const pct = c && c.total > 0 ? Math.round((c.verified / c.total) * 100) : null;
  const pctClass = pct === null ? "wlp-pct-ok" : pct < 50 ? "wlp-pct-bad" : pct < 100 ? "wlp-pct-ok" : "wlp-pct-good";
  const fillClass = pct === null ? "wlp-pf-ok" : pct < 50 ? "wlp-pf-bad" : pct < 100 ? "wlp-pf-ok" : "wlp-pf-good";
  const width = pct === null ? 0 : Math.min(100, Math.max(0, pct));

  return (
    <button type="button" className="wlp-emp-card" onClick={onOpen}>
      <div className="wlp-ec-body">
        <div className="wlp-ec-top">
          <div className="wlp-ec-name-block">
            <div className="wlp-ec-avatar">{initials}</div>
            <div className="min-w-0">
              <div className="wlp-ec-name truncate">{w.name}</div>
              <div className="wlp-ec-role-badge">{w.job_title || "—"}</div>
            </div>
          </div>
          <div className={`wlp-ec-status ${st.cls}`}>{st.label}</div>
        </div>
        <div className="wlp-ec-info">
          <div className="wlp-ec-info-row">
            <Phone className="h-[13px] w-[13px] text-[#94A3B8]" />
            <span>Mob: {w.phone || "—"}</span>
          </div>
          <div className="wlp-ec-info-row">
            <Mail className="h-[13px] w-[13px] text-[#94A3B8]" />
            {w.email ? (
              <a href={`mailto:${w.email}`} onClick={(e) => e.stopPropagation()}>
                {w.email}
              </a>
            ) : (
              <span>—</span>
            )}
          </div>
        </div>
        <div>
          <div className="wlp-ec-prog-top">
            <span className="wlp-ec-prog-label">Docs verified</span>
            <span className={`wlp-ec-prog-pct ${pctClass}`}>{pct !== null ? `${pct}%` : "—"}</span>
          </div>
          <div className="wlp-prog-track">
            <div className={`wlp-prog-fill ${fillClass}`} style={{ width: `${width}%` }} />
          </div>
        </div>
      </div>
      <div className="wlp-ec-footer">
        <span className="wlp-ec-added">Added {relativeShort(w.created_at)}</span>
        <div className="wlp-ec-actions">
          <button type="button" className="wlp-ec-action-btn" title="Star" onClick={onToggleStar}>
            <Star className={`h-[13px] w-[13px] ${starred ? "fill-amber-400 text-amber-500" : ""}`} />
          </button>
          <button type="button" className="wlp-ec-action-btn" title="View Profile" onClick={onProfile}>
            <Eye className="h-[13px] w-[13px]" />
          </button>
          <button type="button" className="wlp-ec-action-btn" title="More options" onClick={onMore}>
            <MoreHorizontal className="h-[13px] w-[13px]" />
          </button>
        </div>
      </div>
    </button>
  );
}
