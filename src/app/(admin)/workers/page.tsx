"use client";

import { useEffect, useState, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import {
  Users,
  Search,
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
  UserPlus,
  SlidersHorizontal,
  UserCheck,
  CalendarClock,
  FileWarning,
} from "lucide-react";
import "../dashboard/dashboard-marketing.css";
import "./workers-page.css";

interface Worker {
  id: string;
  name: string;
  job_title: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  department: string | null;
  salary: number | null;
  route: string;
  work_location: string | null;
  status: string;
  /** HR employment status (org-configurable): Active, Inactive, Finished, … */
  employment_status?: string;
  stage: string;
  risk_level: string;
  visa_expiry: string | null;
  start_date: string | null;
  created_at: string;
  has_profile_photo?: boolean;
}

type WorkerTableColumnKey = "name" | "job_title" | "employment" | "status" | "email" | "docs";
interface WorkerTableColumnsResponse {
  visible_columns: WorkerTableColumnKey[];
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
const COLUMN_PREF_ROLES = ["super_admin", "tenant_admin", "compliance_manager", "hr_officer"];
const DEFAULT_WORKER_COLUMNS: WorkerTableColumnKey[] = ["name", "job_title", "employment", "status", "email", "docs"];
const WORKER_COLUMN_OPTIONS: Array<{ key: WorkerTableColumnKey; label: string }> = [
  { key: "name", label: "Name" },
  { key: "job_title", label: "Role" },
  { key: "employment", label: "Employment" },
  { key: "status", label: "Sponsor" },
  { key: "email", label: "Email" },
  { key: "docs", label: "Docs" },
];

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
        <div className="protexi-dash-marketing worker-list-page flex justify-center py-20">
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
  const [visibleColumns, setVisibleColumns] = useState<WorkerTableColumnKey[]>(DEFAULT_WORKER_COLUMNS);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [savingColumns, setSavingColumns] = useState(false);
  const [starred, setStarred] = useState<Record<string, boolean>>({});

  const [compliance, setCompliance] = useState<Record<string, { total: number; verified: number; uploaded: number; rejected: number }>>({});
  const [employmentStatusOptions, setEmploymentStatusOptions] = useState<string[]>(["Active", "Inactive", "Finished"]);

  const canManage = user ? STAFF_ROLES.includes(user.role) : false;
  const canEditTableColumns = user ? COLUMN_PREF_ROLES.includes(user.role) : false;

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

  const fetchEmploymentStatusOptions = async () => {
    if (!token) return;
    try {
      const s = await api.get<{ employment_status_options: string[] }>("/organisation/settings", token);
      if (s.employment_status_options?.length) setEmploymentStatusOptions(s.employment_status_options);
    } catch {
      /* defaults */
    }
  };

  const fetchWorkerTableColumns = async () => {
    if (!token) return;
    try {
      const resp = await api.get<WorkerTableColumnsResponse>("/organisation/workers-table-columns", token);
      if (resp.visible_columns?.length) setVisibleColumns(resp.visible_columns);
      else setVisibleColumns(DEFAULT_WORKER_COLUMNS);
    } catch {
      setVisibleColumns(DEFAULT_WORKER_COLUMNS);
    }
  };

  const saveWorkerTableColumns = async (next: WorkerTableColumnKey[]) => {
    if (!token || !canEditTableColumns) return;
    try {
      setSavingColumns(true);
      const resp = await api.patch<WorkerTableColumnsResponse>(
        "/organisation/workers-table-columns",
        { visible_columns: next },
        token
      );
      setVisibleColumns(resp.visible_columns?.length ? resp.visible_columns : DEFAULT_WORKER_COLUMNS);
    } finally {
      setSavingColumns(false);
    }
  };

  const toggleColumn = (key: WorkerTableColumnKey) => {
    const has = visibleColumns.includes(key);
    if (has && visibleColumns.length === 1) return;
    const next = has ? visibleColumns.filter((c) => c !== key) : [...visibleColumns, key];
    setVisibleColumns(next);
    void saveWorkerTableColumns(next);
  };

  const patchEmploymentStatus = async (workerId: string, value: string) => {
    if (!token) return;
    await api.patch(`/workers/${workerId}`, { employment_status: value }, token);
    setWorkers((prev) => prev.map((w) => (w.id === workerId ? { ...w, employment_status: value } : w)));
    setStatsWorkers((prev) => prev.map((w) => (w.id === workerId ? { ...w, employment_status: value } : w)));
  };

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
      fetchEmploymentStatusOptions();
      fetchWorkerTableColumns();
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

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="protexi-dash-marketing flex flex-col gap-0">

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="adm-ph">
        <div>
          <div className="adm-ph-ey">Workforce</div>
          <h1 className="adm-ph-title">
            Employee <em className="dash-title-em">directory</em>
          </h1>
          <div className="adm-ph-date">{today}</div>
        </div>
      </div>

      {/* ── Stat strip ──────────────────────────────────────── */}
      <div className="adm-stat-row">
        <button type="button" className="adm-sc adm-sc-b" onClick={() => router.push("/workers?tab=active")}>
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b"><Users className="h-[17px] w-[17px]" /></div>
            <span className="adm-sc-pill adm-pill-g">Active</span>
          </div>
          <div className="adm-sc-num">{miniStats.active}</div>
          <div className="adm-sc-lbl">Active Employees</div>
          <div className="adm-sc-sub">{workers.length} total on record</div>
        </button>
        <button type="button" className="adm-sc adm-sc-p" onClick={() => router.push("/workers?tab=sponsored")}>
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-p"><UserCheck className="h-[17px] w-[17px]" /></div>
            <span className="adm-sc-pill adm-pill-n">Visa</span>
          </div>
          <div className="adm-sc-num">{miniStats.sponsored}</div>
          <div className="adm-sc-lbl">Sponsored Workers</div>
          <div className="adm-sc-sub">On active visa routes</div>
        </button>
        <button type="button" className="adm-sc adm-sc-a" onClick={() => router.push("/workers?tab=on_leave")}>
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-a"><CalendarClock className="h-[17px] w-[17px]" /></div>
            <span className="adm-sc-pill adm-pill-n">—</span>
          </div>
          <div className="adm-sc-num">{miniStats.onLeave}</div>
          <div className="adm-sc-lbl">On Leave</div>
          <div className="adm-sc-sub">Currently away</div>
        </button>
        <button type="button" className="adm-sc adm-sc-r">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-r"><FileWarning className="h-[17px] w-[17px]" /></div>
            <span className="adm-sc-pill adm-pill-n">—</span>
          </div>
          <div className="adm-sc-num">{miniStats.docsPending}</div>
          <div className="adm-sc-lbl">Docs Pending</div>
          <div className="adm-sc-sub">Awaiting verification</div>
        </button>
      </div>

      {/* ── Toolbar + Content — unified surface ─────────────── */}
      <div className="wem-surface">

        {/* Toolbar row */}
        <div className="wem-toolbar overflow-visible">
          <div className="wlp-tb-search flex-1 min-w-[180px]">
            <Search className="h-[14px] w-[14px] shrink-0 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search by name, role, or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="wem-badge-mono">
            {loading ? "…" : `${filteredWorkers.length} results`}
          </span>
          <div className="flex items-center gap-[2px] border border-[rgba(0,0,0,0.1)] bg-[#f0f0eb] p-[3px]">
            <button type="button" onClick={() => setViewMode("grid")} aria-label="Grid view"
              className={`flex h-7 w-7 items-center justify-center transition-colors ${viewMode === "grid" ? "bg-white text-[#1a4fa0]" : "text-[#94a3b8] hover:text-[#0f2d5e]"}`}>
              <LayoutGrid className="h-[13px] w-[13px]" />
            </button>
            <button type="button" onClick={() => setViewMode("list")} aria-label="List view"
              className={`flex h-7 w-7 items-center justify-center transition-colors ${viewMode === "list" ? "bg-white text-[#1a4fa0]" : "text-[#94a3b8] hover:text-[#0f2d5e]"}`}>
              <List className="h-[13px] w-[13px]" />
            </button>
          </div>
          {canEditTableColumns && (
            <div className="relative">
              <button type="button" onClick={() => setColumnMenuOpen((v) => !v)}
                className="wem-badge-mono cursor-pointer hover:bg-[rgba(26,79,160,0.08)] flex items-center gap-2">
                <SlidersHorizontal className="h-[11px] w-[11px]" /> Columns
              </button>
              {columnMenuOpen && (
                <div className="absolute right-0 top-[110%] z-20 min-w-[220px] border border-[rgba(0,0,0,0.1)] bg-white p-2 shadow-lg">
                  {WORKER_COLUMN_OPTIONS.map((col) => (
                    <label key={col.key} className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm hover:bg-[#f5f5f0]">
                      <input type="checkbox" checked={visibleColumns.includes(col.key)}
                        disabled={savingColumns || (visibleColumns.length === 1 && visibleColumns.includes(col.key))}
                        onChange={() => toggleColumn(col.key)} />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="border-b border-[rgba(220,38,38,0.3)] bg-[rgba(254,242,242,0.8)] px-5 py-2.5 text-[12px] text-[#991b1b]">{error}</div>
        )}

        {/* ── Content ─────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center bg-white py-20">
            <Loader2 className="h-10 w-10 animate-spin text-[#1a4fa0]" />
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-white py-16">
            <div className="adm-ae-icon"><Users className="h-5 w-5" /></div>
            <div className="adm-ae-t mt-3">{search || tab !== "all" ? "No employees match your filters" : "No employees found"}</div>
            <div className="adm-ae-s">Try adjusting your search or tab filter.</div>
          </div>
        ) : viewMode === "grid" ? (
          <>
            <div className="wem-grid">
              {paginatedWorkers.map((w) => (
                <EmployeeHtmlCard
                  key={w.id}
                  worker={w}
                  employmentOptions={[...new Set([...employmentStatusOptions, w.employment_status || "Active"])]}
                  canEditEmployment={canManage}
                  onEmploymentChange={(value) => patchEmploymentStatus(w.id, value)}
                  compliance={compliance[w.id]}
                  starred={!!starred[w.id]}
                  onToggleStar={(e) => toggleStar(w.id, e)}
                  onOpen={() => router.push(`/workers/${w.id}?tab=records`)}
                  onProfile={(e) => openProfile(w.id, e)}
                  onMore={moreOptions}
                  token={token ?? ""}
                />
              ))}
              {canManage && page === 1 && (
                <button type="button" className="wlp-add-card" onClick={() => router.push("/workers/new")}>
                  <div className="flex h-11 w-11 items-center justify-center bg-[rgba(26,79,160,0.08)] text-[#1a4fa0]">
                    <UserPlus className="h-[20px] w-[20px]" />
                  </div>
                  <div className="text-center">
                    <div className="wem-badge-mono inline-block">Add Employee</div>
                    <div className="mt-1 text-[11px] text-[#94a3b8]">Onboard a new worker</div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 bg-[#0f2d5e] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.06em] text-white"
                    style={{ fontFamily: "var(--dash-mono)" }}>
                    <Plus className="h-3 w-3" /> New
                  </span>
                </button>
              )}
            </div>
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-3 border-t border-[rgba(0,0,0,0.07)] bg-[#f5f5f0] py-3.5">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="wem-page-btn disabled:opacity-40">
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                <span className="wem-badge-mono">{page} / {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="wem-page-btn disabled:opacity-40">
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="overflow-x-auto bg-white">
              <table className="wlp-table">
                <thead>
                  <tr>
                    {visibleColumns.includes("name") && <th>Name</th>}
                    {visibleColumns.includes("job_title") && <th>Role</th>}
                    {visibleColumns.includes("employment") && <th>Employment</th>}
                    {visibleColumns.includes("status") && <th>Sponsor</th>}
                    {visibleColumns.includes("email") && <th>Email</th>}
                    {visibleColumns.includes("docs") && <th>Docs</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedWorkers.map((w) => {
                    const c = compliance[w.id];
                    const pct = c && c.total > 0 ? Math.round((c.verified / c.total) * 100) : null;
                    const st = STATUS_CONFIG[w.status] ?? STATUS_CONFIG.active;
                    const empOpts = [...new Set([...employmentStatusOptions, w.employment_status || "Active"])];
                    return (
                      <tr key={w.id} className="cursor-pointer" onClick={() => router.push(`/workers/${w.id}?tab=records`)}>
                        {visibleColumns.includes("name") && <td className="font-semibold">{w.name}</td>}
                        {visibleColumns.includes("job_title") && <td>{w.job_title || "—"}</td>}
                        {visibleColumns.includes("employment") && <td onClick={(e) => e.stopPropagation()}>
                          {canManage ? (
                            <select className="cursor-pointer border border-[rgba(0,0,0,0.1)] bg-[#f5f5f0] px-2 py-1 text-[11px] font-bold text-[#0f2d5e]"
                              style={{ fontFamily: "var(--dash-mono)" }}
                              value={w.employment_status || "Active"}
                              onChange={(e) => { e.stopPropagation(); patchEmploymentStatus(w.id, e.target.value); }}>
                              {empOpts.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : (
                            <span className="text-[12px] font-semibold text-[#0f2d5e]">{w.employment_status || "—"}</span>
                          )}
                        </td>}
                        {visibleColumns.includes("status") && <td>
                          <span className={`inline-flex items-center border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] ${w.status === "active" ? "border-[rgba(22,163,74,0.3)] bg-[#f0fdf4] text-[#166534]" : w.status === "suspended" ? "border-[rgba(0,0,0,0.08)] bg-[#f0f0eb] text-[#0f2d5e]" : "border-[rgba(220,38,38,0.3)] bg-[rgba(254,242,242,0.6)] text-[#991b1b]"}`}
                            style={{ fontFamily: "var(--dash-mono)" }}>
                            {st.label}
                          </span>
                        </td>}
                        {visibleColumns.includes("email") && <td className="max-w-[200px] truncate text-[#1a4fa0]">{w.email || "—"}</td>}
                        {visibleColumns.includes("docs") && <td className="text-[#0f2d5e]" style={{ fontFamily: "var(--dash-mono)", fontSize: 11 }}>{pct !== null ? `${pct}%` : "—"}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-3 border-t border-[rgba(0,0,0,0.07)] bg-[#f5f5f0] py-3.5">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="wem-page-btn disabled:opacity-40">
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                <span className="wem-badge-mono">{page} / {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="wem-page-btn disabled:opacity-40">
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        )}

      </div>{/* /wem-surface */}

      {/* ── Bulk upload modal ───────────────────────────────── */}
      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeBulkModal(); }}>
          <div className="w-full max-w-[520px] border border-[rgba(0,0,0,0.14)] bg-white px-8 py-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-[rgba(26,79,160,0.08)] text-[#1a4fa0]">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-[#0f2d5e]" style={{ fontFamily: "var(--dash-mono)", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>Bulk Upload</h2>
                  <p className="text-sm text-[#64748b]">Import employees from Excel</p>
                </div>
              </div>
              <button type="button" onClick={closeBulkModal} className="flex h-8 w-8 cursor-pointer items-center justify-center hover:bg-[#f5f5f0]">
                <X className="h-[18px] w-[18px] text-[#64748b]" />
              </button>
            </div>
            <div className="mb-4 border border-dashed border-[rgba(26,79,160,0.3)] bg-[rgba(26,79,160,0.03)] px-5 py-4">
              <p className="mb-1 font-bold text-[#0f2d5e]" style={{ fontFamily: "var(--dash-mono)", fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase" }}>Step 1 — Download template</p>
              <p className="mb-3 text-xs text-[#64748b]">Fill in the column headers and upload below.</p>
              <button type="button" onClick={handleDownloadTemplate}
                className="inline-flex h-[34px] cursor-pointer items-center gap-1.5 border border-[rgba(0,0,0,0.14)] bg-[#f0f0eb] px-3.5 font-bold text-[#0f2d5e] hover:bg-[rgba(26,79,160,0.08)]"
                style={{ fontFamily: "var(--dash-mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                <Download className="h-3.5 w-3.5" /> Download
              </button>
            </div>
            <div className="mb-5 border border-dashed border-[rgba(0,0,0,0.12)] px-5 py-4">
              <p className="mb-1 font-bold text-[#0f2d5e]" style={{ fontFamily: "var(--dash-mono)", fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase" }}>Step 2 — Upload file</p>
              <p className="mb-3 text-xs text-[#64748b]">Accepted: .xlsx</p>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={(e) => { setBulkFile(e.target.files?.[0] ?? null); setBulkResult(null); }} />
              <div className="flex items-center gap-2.5">
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-[34px] cursor-pointer items-center gap-1.5 border border-[rgba(0,0,0,0.14)] bg-[#f0f0eb] px-3.5 font-bold text-[#0f2d5e] hover:bg-[rgba(26,79,160,0.08)]"
                  style={{ fontFamily: "var(--dash-mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  <Upload className="h-3.5 w-3.5" /> Choose file
                </button>
                {bulkFile && <span className="max-w-[200px] truncate text-sm text-[#0f2d5e]">{bulkFile.name}</span>}
              </div>
            </div>
            {bulkResult && (
              <div className={`mb-4 border px-4 py-3 ${bulkResult.created > 0 ? "border-[rgba(22,163,74,0.35)] bg-[rgba(240,253,244,0.8)] text-[#166534]" : "border-[rgba(220,38,38,0.3)] bg-[rgba(254,242,242,0.6)] text-[#991b1b]"}`}>
                {bulkResult.created > 0 && <p className="text-sm font-medium">Added {bulkResult.created} employee{bulkResult.created !== 1 ? "s" : ""}</p>}
                {bulkResult.errors.map((err, i) => <p key={i} className="text-sm">{err}</p>)}
              </div>
            )}
            <div className="flex justify-end gap-2.5">
              <button type="button" onClick={closeBulkModal}
                className="h-10 cursor-pointer border border-[rgba(0,0,0,0.14)] bg-[#f0f0eb] px-4 font-bold text-[#0f2d5e] hover:bg-[rgba(26,79,160,0.08)]"
                style={{ fontFamily: "var(--dash-mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {bulkResult && bulkResult.created > 0 ? "Done" : "Cancel"}
              </button>
              {!(bulkResult && bulkResult.created > 0) && (
                <button type="button" disabled={!bulkFile || bulkUploading} onClick={handleBulkUpload}
                  className="inline-flex h-10 cursor-pointer items-center gap-2 bg-[#0f2d5e] px-5 font-bold text-white hover:bg-[#1a4fa0] disabled:opacity-50"
                  style={{ fontFamily: "var(--dash-mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {bulkUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {bulkUploading ? "Uploading..." : "Upload"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Fetches an auth-protected image and renders it via a blob URL. */
function AuthImage({ src, token, alt, className }: { src: string; token: string; alt: string; className?: string }) {
  const [blobSrc, setBlobSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    fetch(src, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setBlobSrc(objectUrl);
      })
      .catch(() => setBlobSrc(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, token]);

  if (!blobSrc) return null;
  return <img src={blobSrc} alt={alt} className={className} />;
}

function EmployeeHtmlCard({
  worker: w,
  employmentOptions,
  canEditEmployment,
  onEmploymentChange,
  compliance: c,
  starred,
  onToggleStar,
  onOpen,
  onProfile,
  token,
}: {
  worker: Worker;
  employmentOptions: string[];
  canEditEmployment: boolean;
  onEmploymentChange: (value: string) => void;
  compliance?: { total: number; verified: number; uploaded: number; rejected: number };
  starred: boolean;
  onToggleStar: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onProfile: (e: React.MouseEvent) => void;
  onMore: (e: React.MouseEvent) => void;
  token: string;
}) {
  const st = STATUS_CONFIG[w.status] ?? STATUS_CONFIG.active;
  const emp = w.employment_status || "Active";
  const initials = w.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const pct = c && c.total > 0 ? Math.round((c.verified / c.total) * 100) : null;
  const pctFill = pct === null ? 0 : Math.min(100, Math.max(0, pct));
  const pctColor = pct === null ? "#94a3b8" : pct < 50 ? "#dc2626" : pct < 100 ? "#d97706" : "#16a34a";
  const fillBg = pct === null ? "#e2e8f0" : pct < 50 ? "#dc2626" : pct < 100 ? "#f59e0b" : "#16a34a";
  const stCls = st.cls === "wlp-st-active" ? "wem-st-active" : st.cls === "wlp-st-warn" ? "wem-st-warn" : "wem-st-inactive";
  const photoUrl = w.has_profile_photo ? `${API_URL}/workers/${w.id}/profile-photo` : null;

  return (
    <button type="button" className="wem-card" onClick={onOpen}>
      {/* Top — avatar + name + status */}
      <div className="wem-top">
        <div className="wem-avatar">
          {photoUrl && token ? (
            <AuthImage src={photoUrl} token={token} alt={w.name} className="wem-avatar-img" />
          ) : null}
          {/* Initials shown as fallback when no photo loaded */}
          <span className={photoUrl ? "wem-avatar-initials" : undefined}>{initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="wem-name truncate">{w.name}</div>
          <div className="wem-role">{w.job_title || "—"}</div>
        </div>
        <span className={`wem-status ${stCls}`}>{st.label}</span>
      </div>

      {/* Details */}
      <div className="wem-details">
        {w.department && (
          <div className="wem-detail-row">
            <span className="wem-detail-label">Dept</span>
            <span className="wem-detail-val truncate">{w.department}</span>
          </div>
        )}
        <div className="wem-detail-row">
          <Phone className="h-[11px] w-[11px] shrink-0 text-[#94a3b8]" />
          <span className="wem-detail-val">{w.phone || "—"}</span>
        </div>
        <div className="wem-detail-row">
          <Mail className="h-[11px] w-[11px] shrink-0 text-[#94a3b8]" />
          {w.email ? (
            <a href={`mailto:${w.email}`} onClick={(e) => e.stopPropagation()} className="wem-detail-link truncate">{w.email}</a>
          ) : <span className="wem-detail-val">—</span>}
        </div>
      </div>

      {/* Progress */}
      <div className="wem-prog-wrap">
        <div className="wem-prog-top">
          <span className="wem-prog-lbl">Docs verified</span>
          <span className="wem-prog-pct" style={{ color: pctColor }}>{pct !== null ? `${pct}%` : "—"}</span>
        </div>
        <div className="wem-prog-track">
          <div className="wem-prog-fill" style={{ width: `${pctFill}%`, background: fillBg }} />
        </div>
      </div>

      {/* Footer */}
      <div className="wem-footer">
        <span className="wem-added">{w.nationality || "—"} · {relativeShort(w.created_at)}</span>
        <div className="flex items-center gap-1">
          {canEditEmployment && (
            <div onClick={(e) => e.stopPropagation()}>
              <select className="wem-emp-select" value={emp} onChange={(e) => onEmploymentChange(e.target.value)}>
                {employmentOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          )}
          <button type="button" className="wem-action-btn" title="Star" onClick={onToggleStar}>
            <Star className={`h-[12px] w-[12px] ${starred ? "fill-amber-400 text-amber-500" : ""}`} />
          </button>
          <button type="button" className="wem-action-btn" title="View Profile" onClick={onProfile}>
            <Eye className="h-[12px] w-[12px]" />
          </button>
        </div>
      </div>
    </button>
  );
}
