"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import {
  Users,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  Plus,
  Upload,
  Download,
  FileSpreadsheet,
  X,
  Loader2,
  Eye,
} from "lucide-react";

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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  active: { label: "Active", color: "text-emerald-700", bg: "bg-emerald-50", icon: CheckCircle2 },
  suspended: { label: "Suspended", color: "text-amber-700", bg: "bg-amber-50", icon: AlertTriangle },
  terminated: { label: "Terminated", color: "text-red-700", bg: "bg-red-50", icon: XCircle },
};

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: "Low", color: "text-emerald-700", bg: "bg-emerald-50" },
  medium: { label: "Medium", color: "text-amber-700", bg: "bg-amber-50" },
  high: { label: "High", color: "text-orange-700", bg: "bg-orange-50" },
  critical: { label: "Critical", color: "text-red-700", bg: "bg-red-50" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatSalary(amount: number): string {
  return `£${amount.toLocaleString("en-GB")}`;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const STAFF_ROLES = ["super_admin", "compliance_manager", "hr_officer"];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pretexi-backend.onrender.com/api";

export default function WorkersPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ created: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [compliance, setCompliance] = useState<Record<string, { total: number; verified: number; uploaded: number; rejected: number }>>({});

  const canManage = user ? STAFF_ROLES.includes(user.role) : false;

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const qs = params.toString();
      const data = await api.get<Worker[]>(`/workers${qs ? `?${qs}` : ""}`, token ?? undefined);
      setWorkers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load employees");
    } finally {
      setLoading(false);
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
      /* ignore for non-staff */
    }
  };

  useEffect(() => {
    fetchWorkers();
    if (canManage) fetchCompliance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, search, statusFilter]);

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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="text-2xl font-bold text-brand-900 tracking-tight">Employees</h1>
          <p className="text-sm text-[var(--muted-foreground)]" style={{ marginTop: 4 }}>
            {workers.length} sponsored worker{workers.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canManage && (
          <div className="flex items-center" style={{ gap: 10 }}>
            <button
              type="button"
              onClick={() => setBulkOpen(true)}
              className="inline-flex items-center rounded-xl border border-[var(--border)] bg-white text-sm font-medium text-brand-800 hover:bg-brand-50 transition-colors cursor-pointer"
              style={{ height: 40, padding: "0 16px", gap: 8 }}
            >
              <Upload style={{ width: 15, height: 15 }} />
              Add in Bulk
            </button>
            <button
              type="button"
              onClick={() => router.push("/workers/new")}
              className="inline-flex items-center rounded-xl bg-brand-600 text-sm font-medium text-white hover:bg-brand-700 transition-colors cursor-pointer"
              style={{ height: 40, padding: "0 18px", gap: 8 }}
            >
              <Plus style={{ width: 15, height: 15 }} />
              Add Employee
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center flex-wrap gap-3" style={{ marginBottom: 20 }}>
        <div className="relative flex-1" style={{ maxWidth: 320 }}>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none"
            style={{ width: 16, height: 16 }}
          />
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-white text-sm text-brand-900 placeholder:text-[var(--muted-foreground)] outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            style={{ height: 40, paddingLeft: 38, paddingRight: 16 }}
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded-xl border border-[var(--border)] bg-white text-sm text-brand-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all cursor-pointer"
            style={{ height: 40, paddingLeft: 14, paddingRight: 36 }}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="terminated">Terminated</option>
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none"
            style={{ width: 14, height: 14 }}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl bg-red-50 border border-red-200 text-red-800"
          style={{ padding: "12px 16px", fontSize: 13, marginBottom: 20 }}
        >
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 13 }}>
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                {["Employee", "Department", "Status", "Risk", "Docs", "Visa Expiry", "Salary", ""].map((h) => (
                  <th
                    key={h || "_action"}
                    className="text-left font-semibold text-[var(--muted-foreground)] uppercase"
                    style={{ padding: "12px 16px", fontSize: 11, letterSpacing: "0.05em" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center text-[var(--muted-foreground)]" style={{ padding: 40 }}>
                    Loading employees...
                  </td>
                </tr>
              ) : workers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center" style={{ padding: 40 }}>
                    <Users className="mx-auto text-[var(--muted-foreground)]" style={{ width: 32, height: 32, marginBottom: 8 }} />
                    <p className="text-[var(--muted-foreground)]" style={{ fontSize: 14 }}>
                      {search || statusFilter ? "No employees match your filters" : "No employees found"}
                    </p>
                  </td>
                </tr>
              ) : (
                workers.map((w) => {
                  const st = STATUS_CONFIG[w.status] ?? STATUS_CONFIG.active;
                  const risk = RISK_CONFIG[w.risk_level] ?? RISK_CONFIG.low;
                  const visaDays = daysUntil(w.visa_expiry);
                  const visaUrgent = visaDays !== null && visaDays <= 90;

                  return (
                    <tr
                      key={w.id}
                      className="border-b border-[var(--border)] last:border-b-0 hover:bg-brand-50/50 transition-colors"
                    >
                      {/* Employee */}
                      <td style={{ padding: "14px 16px" }}>
                        <div className="flex items-center" style={{ gap: 12 }}>
                          <div
                            className="flex items-center justify-center rounded-full bg-brand-100 text-brand-600 font-bold shrink-0"
                            style={{ width: 36, height: 36, fontSize: 12 }}
                          >
                            {w.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-brand-900 truncate">{w.name}</p>
                            <p className="text-[var(--muted-foreground)] truncate" style={{ fontSize: 12, marginTop: 1 }}>
                              {w.job_title}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="text-brand-800" style={{ padding: "14px 16px" }}>
                        {w.department ?? "—"}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          className={`inline-flex items-center rounded-full font-medium ${st.color} ${st.bg}`}
                          style={{ padding: "3px 10px", gap: 5, fontSize: 12 }}
                        >
                          <st.icon style={{ width: 12, height: 12 }} />
                          {st.label}
                        </span>
                      </td>

                      {/* Risk */}
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          className={`inline-flex items-center rounded-full font-medium ${risk.color} ${risk.bg}`}
                          style={{ padding: "3px 10px", fontSize: 12 }}
                        >
                          {risk.label}
                        </span>
                      </td>

                      {/* Docs compliance */}
                      <td style={{ padding: "14px 16px" }}>
                        {(() => {
                          const c = compliance[w.id];
                          if (!c || c.total === 0) {
                            return <span className="text-xs text-gray-400">—</span>;
                          }
                          const pct = Math.round((c.verified / c.total) * 100);
                          const color = pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : "bg-amber-500";
                          const textColor = pct === 100 ? "text-emerald-700" : pct >= 50 ? "text-blue-700" : "text-amber-700";
                          return (
                            <div style={{ minWidth: 70 }}>
                              <div className="flex items-center" style={{ gap: 6, marginBottom: 3 }}>
                                <span className={`text-xs font-semibold ${textColor}`}>{pct}%</span>
                                {c.rejected > 0 && (
                                  <span className="text-xs text-red-600 font-medium">{c.rejected} rej</span>
                                )}
                              </div>
                              <div className="rounded-full bg-gray-100 overflow-hidden" style={{ height: 4 }}>
                                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Visa Expiry */}
                      <td style={{ padding: "14px 16px" }}>
                        <div className="flex items-center" style={{ gap: 6 }}>
                          {visaUrgent && <Clock className="text-amber-500 shrink-0" style={{ width: 14, height: 14 }} />}
                          <span className={visaUrgent ? "text-amber-700 font-medium" : "text-brand-800"}>
                            {formatDate(w.visa_expiry)}
                          </span>
                        </div>
                        {visaDays !== null && visaDays <= 90 && visaDays > 0 && (
                          <p className="text-amber-600" style={{ fontSize: 11, marginTop: 2 }}>
                            {visaDays} days left
                          </p>
                        )}
                      </td>

                      {/* Salary */}
                      <td className="text-brand-800 font-medium" style={{ padding: "14px 16px" }}>
                        {formatSalary(w.salary)}
                      </td>

                      {/* Action */}
                      <td style={{ padding: "14px 16px" }}>
                        <button
                          type="button"
                          onClick={() => router.push(`/workers/${w.id}`)}
                          className="inline-flex items-center rounded-lg bg-brand-50 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors cursor-pointer"
                          style={{ height: 30, padding: "0 10px", gap: 5 }}
                        >
                          <Eye style={{ width: 13, height: 13 }} />
                          Show
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bulk Upload Modal ── */}
      {bulkOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeBulkModal(); }}
        >
          <div
            className="bg-white rounded-2xl border border-[var(--border)] shadow-xl w-full"
            style={{ maxWidth: 520, padding: "28px 32px" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
              <div className="flex items-center" style={{ gap: 12 }}>
                <div
                  className="flex items-center justify-center rounded-xl bg-brand-100"
                  style={{ width: 40, height: 40 }}
                >
                  <FileSpreadsheet className="text-brand-600" style={{ width: 20, height: 20 }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-brand-900">Bulk Upload</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">Import employees from Excel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeBulkModal}
                className="flex items-center justify-center rounded-lg hover:bg-brand-50 transition-colors cursor-pointer"
                style={{ width: 32, height: 32 }}
              >
                <X className="text-[var(--muted-foreground)]" style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Step 1: Download template */}
            <div
              className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50"
              style={{ padding: "16px 20px", marginBottom: 16 }}
            >
              <p className="text-sm font-medium text-brand-800" style={{ marginBottom: 4 }}>
                Step 1: Download the template
              </p>
              <p className="text-xs text-[var(--muted-foreground)]" style={{ marginBottom: 12 }}>
                The template includes column headers and 2 sample rows. Fill in your data and upload below.
              </p>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center rounded-lg bg-white border border-[var(--border)] text-sm font-medium text-brand-700 hover:bg-brand-50 transition-colors cursor-pointer"
                style={{ height: 34, padding: "0 14px", gap: 6 }}
              >
                <Download style={{ width: 14, height: 14 }} />
                Download Template
              </button>
            </div>

            {/* Step 2: Upload file */}
            <div
              className="rounded-xl border border-dashed border-[var(--border)]"
              style={{ padding: "16px 20px", marginBottom: 20 }}
            >
              <p className="text-sm font-medium text-brand-800" style={{ marginBottom: 4 }}>
                Step 2: Upload your filled file
              </p>
              <p className="text-xs text-[var(--muted-foreground)]" style={{ marginBottom: 12 }}>
                Accepted format: .xlsx
              </p>
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
              <div className="flex items-center" style={{ gap: 10 }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center rounded-lg bg-white border border-[var(--border)] text-sm font-medium text-brand-700 hover:bg-brand-50 transition-colors cursor-pointer"
                  style={{ height: 34, padding: "0 14px", gap: 6 }}
                >
                  <Upload style={{ width: 14, height: 14 }} />
                  Choose File
                </button>
                {bulkFile && (
                  <span className="text-sm text-brand-800 truncate" style={{ maxWidth: 200 }}>
                    {bulkFile.name}
                  </span>
                )}
              </div>
            </div>

            {/* Result */}
            {bulkResult && (
              <div
                className={`rounded-xl border ${bulkResult.created > 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}
                style={{ padding: "12px 16px", marginBottom: 16 }}
              >
                {bulkResult.created > 0 && (
                  <p className="text-sm font-medium text-emerald-800">
                    Successfully added {bulkResult.created} employee{bulkResult.created !== 1 ? "s" : ""}
                  </p>
                )}
                {bulkResult.errors.length > 0 && (
                  <div>
                    {bulkResult.errors.map((err, i) => (
                      <p key={i} className="text-sm text-red-700">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end" style={{ gap: 10 }}>
              <button
                type="button"
                onClick={closeBulkModal}
                className="rounded-xl border border-[var(--border)] bg-white text-sm font-medium text-brand-800 hover:bg-brand-50 transition-colors cursor-pointer"
                style={{ height: 40, padding: "0 18px" }}
              >
                {bulkResult && bulkResult.created > 0 ? "Done" : "Cancel"}
              </button>
              {!(bulkResult && bulkResult.created > 0) && (
                <button
                  type="button"
                  disabled={!bulkFile || bulkUploading}
                  onClick={handleBulkUpload}
                  className="inline-flex items-center rounded-xl bg-brand-600 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors cursor-pointer"
                  style={{ height: 40, padding: "0 20px", gap: 8 }}
                >
                  {bulkUploading ? (
                    <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} />
                  ) : (
                    <Upload style={{ width: 15, height: 15 }} />
                  )}
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
