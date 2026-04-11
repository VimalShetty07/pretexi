"use client";

import { useEffect, useMemo, useState, useRef, Suspense, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { getRtwUiProfile } from "@/lib/rtw-profile";
import DocumentChecklist, { type ChecklistItem } from "./checklist";
import "../../dashboard/dashboard-marketing.css";
import "../workers-page.css";
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock3,
  FileText,
  FolderOpen,
  FileSignature,
  Plus,
  LayoutDashboard,
  User,
  ClipboardList,
  ScrollText,
  ShieldCheck,
  Briefcase,
  Plane,
  ShieldAlert,
  ArrowRight,
  Camera,
  Trash2,
} from "lucide-react";

interface WorkerDetail {
  id: string;
  name: string;
  first_name?: string | null;
  second_name?: string | null;
  last_name?: string | null;
  job_title: string;
  email: string | null;
  phone?: string | null;
  nationality?: string | null;
  department: string | null;
  employment_status?: string;
  salary?: number | null;
  salary_pay_type?: string | null;
  route?: string;
  work_location?: string | null;
  status: string;
  stage?: string;
  hr_onboarding_stage?: string | null;
  risk_level: string;
  visa_expiry: string | null;
  start_date?: string | null;
  termination_date?: string | null;
  sex?: string | null;
  date_of_birth?: string | null;
  age_years?: number | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  address_line_3?: string | null;
  postal_code?: string | null;
  uk_residence_country?: string | null;
  last_rtw_check?: string | null;
  next_rtw_check?: string | null;
  right_to_work_category?: string | null;
  /** Tenant that owns this worker — used for per-client checklist templates */
  organisation_id?: string | null;
  has_profile_photo?: boolean;
}

type MainTab = "overview" | "details" | "checklist" | "records" | "bgverify";
type RecordsSub = "documents" | "files" | "contract" | "right_to_work";

const CAN_EDIT_EMPLOYMENT_ROLES = [
  "super_admin",
  "tenant_admin",
  "compliance_manager",
  "hr_officer",
  "payroll_officer",
];

function formatDetailDate(iso: string | null | undefined): string {
  return iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
}

function formatSalaryGbp(salary: number | null | undefined): string {
  if (salary == null || Number.isNaN(Number(salary))) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(
    Number(salary)
  );
}

const DEFAULT_DEPT_OPTIONS = ["Operations", "People", "Finance", "Engineering", "Care"];
const DEFAULT_LOC_OPTIONS = ["London HQ", "Manchester Office", "Remote", "Hybrid — UK"];
const DEFAULT_ONBOARDING_OPTIONS = ["Recruitment", "CoS assignment", "Pre-start", "Active sponsorship"];
const DEFAULT_RTW_CATEGORY_OPTIONS = [
  "British Citizen",
  "Irish Citizen",
  "ILR / Settled Status",
  "Pre-settled Status",
  "Visa – Sponsored Worker",
  "Visa – Non-Sponsored Worker",
];

const UK_RESIDENCE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "—" },
  { value: "england", label: "England" },
  { value: "northern_ireland", label: "Northern Ireland" },
  { value: "wales", label: "Wales" },
  { value: "scotland", label: "Scotland" },
  { value: "outside_uk", label: "Outside the UK" },
];

const SALARY_PAY_OPTIONS: { value: string; label: string }[] = [
  { value: "hourly", label: "Hourly rate" },
  { value: "daily", label: "Daily rate" },
  { value: "weekly", label: "Weekly rate" },
  { value: "monthly", label: "Monthly rate" },
  { value: "annual", label: "Annual rate" },
];

function ukCountryLabel(v: string | null | undefined): string {
  if (!v) return "—";
  const m: Record<string, string> = {
    england: "England",
    northern_ireland: "Northern Ireland",
    wales: "Wales",
    scotland: "Scotland",
    outside_uk: "Outside the UK",
  };
  return m[v] ?? v;
}

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
}

function dateInputToIso(d: string): string | null {
  if (!d) return null;
  return `${d}T00:00:00.000Z`;
}

function WorkerDetailInner() {
  const { token, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [mainTab, setMainTab] = useState<MainTab>("overview");
  const [recordsSub, setRecordsSub] = useState<RecordsSub>("documents");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const managerPayrollRestricted =
    user?.role === "tenant_admin" || user?.role === "compliance_manager";
  const canEditEmployment = Boolean(user && CAN_EDIT_EMPLOYMENT_ROLES.includes(user.role));
  const [bgRefName, setBgRefName] = useState("");
  const [bgRefEmail, setBgRefEmail] = useState("");
  const [bgRefs, setBgRefs] = useState<Array<{ id: string; referee_name: string; referee_email: string; status: string }>>([]);
  const [employmentOptions, setEmploymentOptions] = useState<string[]>(["Active", "Inactive", "Finished"]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>(DEFAULT_DEPT_OPTIONS);
  const [workLocationOptions, setWorkLocationOptions] = useState<string[]>(DEFAULT_LOC_OPTIONS);
  const [onboardingStageOptions, setOnboardingStageOptions] = useState<string[]>(DEFAULT_ONBOARDING_OPTIONS);
  const [rtwCategoryOptions, setRtwCategoryOptions] = useState<string[]>(DEFAULT_RTW_CATEGORY_OPTIONS);
  const [savingEmployment, setSavingEmployment] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const firstNameRef = useRef<HTMLInputElement | null>(null);
  const secondNameRef = useRef<HTMLInputElement | null>(null);
  const lastNameRef = useRef<HTMLInputElement | null>(null);
  const canUploadProfilePhoto = Boolean(user && user.role !== "employee");

  const rtwUi = useMemo(() => getRtwUiProfile(worker?.right_to_work_category), [worker?.right_to_work_category]);

  const patchWorker = async (body: Record<string, unknown>) => {
    if (!token || !params?.id) return;
    setSavingEmployment(true);
    try {
      await api.patch(`/workers/${params.id}`, body, token);
      const data = await api.get<WorkerDetail>(`/workers/${params.id}`, token);
      setWorker(data);
    } finally {
      setSavingEmployment(false);
    }
  };

  const syncNameBlur = async () => {
    if (!token || !params?.id || !canEditEmployment || !worker) return;
    const fn = firstNameRef.current?.value?.trim() ?? "";
    const sn = secondNameRef.current?.value?.trim() ?? "";
    const ln = lastNameRef.current?.value?.trim() ?? "";
    if (
      fn === (worker.first_name ?? "") &&
      sn === (worker.second_name ?? "") &&
      ln === (worker.last_name ?? "")
    )
      return;
    const full = [fn, sn, ln].filter(Boolean).join(" ").trim();
    await patchWorker({
      first_name: fn || null,
      second_name: sn || null,
      last_name: ln || null,
      name: full || worker.name,
    });
  };

  const loadAll = async () => {
    if (!token || !params?.id) return;
    try {
      setLoading(true);
      const [data, bg] = await Promise.all([
        api.get<WorkerDetail>(`/workers/${params.id}`, token),
        api.get<{ references: Array<{ id: string; referee_name: string; referee_email: string; status: string }> }>(
          `/bgverify/worker/${params.id}`,
          token
        ),
      ]);
      const orgForChecklist =
        data.organisation_id?.trim() || user?.organisation_id?.trim() || "";
      const checklistPath =
        orgForChecklist.length > 0
          ? `/workers/${params.id}/checklist?organisation_id=${encodeURIComponent(orgForChecklist)}`
          : `/workers/${params.id}/checklist`;
      const items = await api.get<ChecklistItem[]>(checklistPath, token);
      try {
        const s = await api.get<{
          employment_status_options: string[];
          department_options: string[];
          work_location_options: string[];
          onboarding_stage_options: string[];
          rtw_category_options: string[];
        }>("/organisation/settings", token);
        if (s.employment_status_options?.length) setEmploymentOptions(s.employment_status_options);
        if (s.department_options?.length) setDepartmentOptions(s.department_options);
        if (s.work_location_options?.length) setWorkLocationOptions(s.work_location_options);
        if (s.onboarding_stage_options?.length) setOnboardingStageOptions(s.onboarding_stage_options);
        if (s.rtw_category_options?.length) setRtwCategoryOptions(s.rtw_category_options);
      } catch {
        /* defaults */
      }
      setWorker(data);
      setChecklist(items);
      setBgRefs(bg.references || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load worker");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, params?.id, user?.organisation_id]);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "records" || t === "overview" || t === "details" || t === "checklist" || t === "bgverify") {
      setMainTab(t);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!token || !params?.id || !worker?.has_profile_photo) {
      setProfilePhotoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/workers/${params.id}/profile-photo`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setProfilePhotoUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, params?.id, worker?.has_profile_photo]);

  const setTab = (tab: MainTab) => {
    setMainTab(tab);
    const u = new URLSearchParams(searchParams.toString());
    u.set("tab", tab);
    router.replace(`/workers/${params.id}?${u.toString()}`, { scroll: false });
  };

  const addReference = async () => {
    if (!token || !params?.id || !bgRefName || !bgRefEmail) return;
    await api.post(
      `/bgverify/worker/${params.id}/references`,
      { referee_name: bgRefName, referee_email: bgRefEmail, referee_company: "Previous Employer" },
      token
    );
    setBgRefName("");
    setBgRefEmail("");
    await loadAll();
  };

  const sendEmails = async () => {
    if (!token || !params?.id) return;
    await api.post(`/bgverify/worker/${params.id}/send-emails`, {}, token);
    await loadAll();
  };

  const verifiedDocs = checklist.filter((c) => c.status === "verified" || c.status === "not_applicable").length;
  const checklistPct = checklist.length > 0 ? Math.round((verifiedDocs / checklist.length) * 100) : 0;
  const rejectedDocs = checklist.filter((c) => c.status === "rejected").length;
  const inReviewDocs = checklist.filter((c) => c.status === "uploaded" || c.status === "not_started").length;
  const visaDays =
    worker?.visa_expiry ? Math.ceil((new Date(worker.visa_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  const riskTone =
    worker?.risk_level === "critical"
      ? { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" }
      : worker?.risk_level === "high"
        ? { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" }
        : worker?.risk_level === "medium"
          ? { bg: "#fffbeb", border: "#fde68a", text: "#a16207" }
          : { bg: "#ecfdf3", border: "#bbf7d0", text: "#15803d" };

  const initials = useMemo(() => {
    if (!worker?.name) return "?";
    const parts = worker.name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  }, [worker?.name]);

  const handleProfilePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token || !params?.id) return;
    setProfilePhotoUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.postForm(`/workers/${params.id}/profile-photo`, fd, token);
      setWorker((prev) => (prev ? { ...prev, has_profile_photo: true } : null));
      await loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setProfilePhotoUploading(false);
    }
  };

  const handleRemoveProfilePhoto = async () => {
    if (!token || !params?.id) return;
    setProfilePhotoUploading(true);
    setError("");
    try {
      await api.delete(`/workers/${params.id}/profile-photo`, token);
      setWorker((prev) => (prev ? { ...prev, has_profile_photo: false } : null));
      setProfilePhotoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      await loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not remove photo");
    } finally {
      setProfilePhotoUploading(false);
    }
  };

  const allFiles = useMemo(() => {
    const out: { name: string; date: string; item: string }[] = [];
    for (const item of checklist) {
      for (const d of item.documents) {
        out.push({
          name: d.file_name,
          date: d.upload_date || "",
          item: item.description,
        });
      }
    }
    return out.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [checklist]);

  if (loading) return <p className="text-sm text-gray-500">Loading employee…</p>;
  if (error || !worker) return <p className="text-sm text-red-600">{error || "Employee not found"}</p>;

  const isActive = worker.status?.toLowerCase() === "active";

  const mainTabs: { id: MainTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "details", label: "Details", icon: User },
    { id: "checklist", label: "Checklist", icon: ClipboardList },
    { id: "records", label: "Records", icon: ScrollText },
    { id: "bgverify", label: "BG verify", icon: ShieldCheck },
  ];

  return (
    <div className="protexi-dash-marketing flex w-full min-w-0 max-w-none flex-col gap-0">
      {canUploadProfilePhoto && (
        <input
          ref={profilePhotoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          aria-hidden
          onChange={handleProfilePhotoSelect}
        />
      )}
      {/* Back link */}
      <Link
        href="/workers"
        className="mb-1 inline-flex w-fit max-w-full items-center gap-1.5 self-start border border-[rgba(0,0,0,0.1)] bg-[#f0f0eb] px-3 py-1.5 font-bold text-[#0f2d5e] hover:bg-[rgba(26,79,160,0.08)]"
        style={{ fontFamily: "var(--dash-mono)", fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase" }}
      >
        <ArrowLeft className="h-3 w-3" /> Back to Employees
      </Link>

      {/* ── Marketing page header ───────────────────────── */}
      <div className="adm-ph relative" style={{ alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        <div className="flex w-fit min-w-[320px] max-w-full flex-col items-center px-2 py-0 text-center">
            {/* Avatar */}
            <div
              className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#DCE7FF] bg-[#F3F8FF] text-[28px] font-extrabold text-[#1a4fa0]"
            >
              {profilePhotoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={profilePhotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <span className="relative z-[1]">{initials}</span>
              )}
              {canUploadProfilePhoto && (
                <button
                  type="button"
                  disabled={profilePhotoUploading}
                  onClick={() => profilePhotoInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 z-[2] flex h-7 w-7 items-center justify-center rounded-md border border-[#0f2d5e] bg-[#0f2d5e] text-white transition hover:bg-[#1a4fa0] disabled:opacity-50"
                  title="Upload photo"
                >
                  <Camera className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[26px] font-extrabold leading-none tracking-[-0.02em] text-[#0f2d5e]">
                {worker.name}
              </h1>
              <div className="mt-2 flex flex-col gap-0.5 text-[12px] leading-[1.25] text-[#64748b]">
                <span className="truncate">{worker.email || "—"}</span>
                {worker.phone ? <span className="truncate">{worker.phone}</span> : null}
              </div>
              <div className="mt-2">
                <span
                  className={`inline-flex items-center border px-3 py-1 text-[9px] font-bold uppercase tracking-[0.1em] ${isActive ? "border-[rgba(22,163,74,0.3)] bg-[#f0fdf4] text-[#166534]" : "border-[rgba(0,0,0,0.1)] bg-[#f0f0eb] text-[#0f2d5e]"}`}
                  style={{ fontFamily: "var(--dash-mono)" }}
                >
                  {isActive ? "Active" : worker.status || "—"}
                </span>
              </div>
            </div>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2 md:w-auto">
          {visaDays != null && (
            <span
              className="inline-flex items-center border border-[rgba(0,0,0,0.1)] bg-[#f0f0eb] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#0f2d5e]"
              style={{ fontFamily: "var(--dash-mono)" }}
            >
              Visa {visaDays}d
            </span>
          )}
        </div>
      </div>

      {/* ── Main tab nav ────────────────────────────────── */}
      <div className="wem-surface" style={{ marginBottom: 10 }}>
        <div className="wem-toolbar flex-wrap gap-1">
          {mainTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.07em] transition-colors ${mainTab === id ? "border-[rgba(26,79,160,0.4)] bg-[rgba(26,79,160,0.08)] text-[#1a4fa0]" : "border-transparent text-[#94a3b8] hover:text-[#0f2d5e]"}`}
              style={{ fontFamily: "var(--dash-mono)" }}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
          {canUploadProfilePhoto && (
            <button
              type="button"
              onClick={() => setTab("details")}
              className="ml-auto inline-flex items-center gap-1.5 border border-[rgba(0,0,0,0.1)] bg-[#f0f0eb] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[rgba(26,79,160,0.08)]"
              style={{ fontFamily: "var(--dash-mono)" }}
            >
              <Camera className="h-3 w-3" /> Profile &amp; details
            </button>
          )}
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────── */}
      <div className="worker-tab-content">
          {mainTab === "overview" && (
            <EmployeeDashboard
              worker={worker}
              managerPayrollRestricted={managerPayrollRestricted}
              checklist={checklist}
              bgRefs={bgRefs}
              verifiedDocs={verifiedDocs}
              rejectedDocs={rejectedDocs}
              inReviewDocs={inReviewDocs}
              checklistPct={checklistPct}
              visaDays={visaDays}
              riskTone={riskTone}
              onGoChecklist={() => setTab("checklist")}
              onGoBg={() => setTab("bgverify")}
              onGoDetails={() => setTab("details")}
            />
          )}

          {mainTab === "details" && (
            <div className="flex flex-col gap-6">
              <header className="border-b border-[rgba(0,0,0,0.07)] pb-4">
                <h2 className="text-[20px] font-extrabold tracking-tight text-[#0a0a0a]">Details</h2>
                <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-[#94a3b8]">
                  Full field list grouped by area. Use the tabs above for checklist, files, and references.
                </p>
              </header>

              <div className="grid grid-cols-1 gap-6 lg:gap-8 xl:grid-cols-2">
                <AspectCard title="Profile & contact" subtitle="Identity and how to reach this person" icon={User} barClass="bg-[#2563EB]">
                  <div className="mb-4 flex flex-col gap-4 border-b border-[#F0F4FF] pb-4 sm:flex-row sm:items-start">
                    <div className="flex shrink-0 flex-col items-center gap-2 sm:items-start">
                      <p className="w-full text-center text-[11px] font-bold uppercase tracking-wide text-[#64748B] sm:text-left">
                        Profile photo
                      </p>
                      <div
                        className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-[#E8EEFF] bg-[#F8FAFF] text-2xl font-bold text-[#94A3B8]"
                        style={{ boxShadow: "0 4px 14px rgba(37, 99, 235, 0.08)" }}
                      >
                        {profilePhotoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={profilePhotoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[#2563EB]">{initials}</span>
                        )}
                      </div>
                      {canUploadProfilePhoto && (
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                          <button
                            type="button"
                            disabled={profilePhotoUploading}
                            onClick={() => profilePhotoInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#BFDBFE] bg-white px-3 py-1.5 text-[11px] font-bold text-[#1d4ed8] shadow-sm hover:bg-[#EFF6FF] disabled:opacity-50"
                          >
                            <Camera className="h-3.5 w-3.5" />
                            {profilePhotoUploading ? "…" : "Upload photo"}
                          </button>
                          {worker.has_profile_photo && (
                            <button
                              type="button"
                              disabled={profilePhotoUploading}
                              onClick={handleRemoveProfilePhoto}
                              className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-[11px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                      <p className="max-w-[200px] text-center text-[10px] leading-snug text-[#94A3B8] sm:text-left">
                        JPEG, PNG, WebP or GIF · max 5 MB · stored in your configured S3 bucket when{" "}
                        <code className="rounded bg-slate-100 px-1">STORAGE_PROVIDER=s3</code>
                      </p>
                    </div>
                  </div>
                  {!canEditEmployment ? (
                    <div className="">
                      <DashRow label="Full name" value={worker.name} />
                      <DashRow label="First name" value={worker.first_name || "—"} />
                      <DashRow label="Second name" value={worker.second_name || "—"} />
                      <DashRow label="Surname" value={worker.last_name || "—"} />
                      <DashRow label="Sex" value={worker.sex || "—"} />
                      <DashRow label="Date of birth" value={formatDetailDate(worker.date_of_birth)} />
                      <DashRow label="Age" value={worker.age_years != null ? String(worker.age_years) : "—"} />
                      <DashRow
                        label="Email"
                        value={
                          worker.email ? (
                            <a href={`mailto:${worker.email}`} className="text-[#2563EB] hover:underline">
                              {worker.email}
                            </a>
                          ) : (
                            "—"
                          )
                        }
                      />
                      <DashRow label="Phone" value={worker.phone || "—"} />
                      <DashRow label="Nationality" value={worker.nationality || "—"} />
                      <DashRow label="Address line 1" value={worker.address_line_1 || "—"} />
                      <DashRow label="Address line 2" value={worker.address_line_2 || "—"} />
                      <DashRow label="Address line 3" value={worker.address_line_3 || "—"} />
                      <DashRow label="Postcode" value={worker.postal_code || "—"} />
                      <DashRow label="Country" value={ukCountryLabel(worker.uk_residence_country)} />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-[11px] text-[#94A3B8]">
                        Address and salary changes are logged for reporting. Configure department, location, and onboarding
                        lists under Organisation.
                      </p>
                      <div
                        key={`nm-${worker.id}-${worker.first_name ?? ""}-${worker.second_name ?? ""}-${worker.last_name ?? ""}`}
                        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                      >
                        <label className="text-[12px] font-semibold text-[#64748B]">
                          First name
                          <input
                            ref={firstNameRef}
                            defaultValue={worker.first_name ?? ""}
                            onBlur={syncNameBlur}
                            className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                          />
                        </label>
                        <label className="text-[12px] font-semibold text-[#64748B]">
                          Second name
                          <input
                            ref={secondNameRef}
                            defaultValue={worker.second_name ?? ""}
                            onBlur={syncNameBlur}
                            className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                          />
                        </label>
                        <label className="text-[12px] font-semibold text-[#64748B]">
                          Surname
                          <input
                            ref={lastNameRef}
                            defaultValue={worker.last_name ?? ""}
                            onBlur={syncNameBlur}
                            className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                          />
                        </label>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="text-[12px] font-semibold text-[#64748B]">
                          Sex
                          <select
                            className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                            disabled={savingEmployment}
                            value={worker.sex ?? ""}
                            onChange={async (e) => {
                              const v = e.target.value;
                              await patchWorker({ sex: v || null });
                            }}
                          >
                            <option value="">—</option>
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Non-binary">Non-binary</option>
                            <option value="Other">Other</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                          </select>
                        </label>
                        <label className="text-[12px] font-semibold text-[#64748B]">
                          Date of birth
                          <input
                            type="date"
                            className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                            disabled={savingEmployment}
                            defaultValue={toDateInput(worker.date_of_birth)}
                            key={`dob-${worker.id}-${toDateInput(worker.date_of_birth)}`}
                            onBlur={async (e) => {
                              const raw = e.target.value;
                              const next = dateInputToIso(raw);
                              const prev = worker.date_of_birth
                                ? dateInputToIso(toDateInput(worker.date_of_birth))
                                : null;
                              if (next === prev) return;
                              await patchWorker({ date_of_birth: next });
                            }}
                          />
                        </label>
                      </div>
                      <DashRow label="Age (from DOB)" value={worker.age_years != null ? String(worker.age_years) : "—"} />
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="text-[12px] font-semibold text-[#64748B]">
                          Phone
                          <input
                            defaultValue={worker.phone ?? ""}
                            key={`ph-${worker.id}-${worker.phone ?? ""}`}
                            onBlur={async (e) => {
                              const v = e.target.value.trim();
                              if (v === (worker.phone ?? "")) return;
                              await patchWorker({ phone: v || null });
                            }}
                            className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                          />
                        </label>
                        <label className="text-[12px] font-semibold text-[#64748B]">
                          Email
                          <input
                            type="email"
                            defaultValue={worker.email ?? ""}
                            key={`em-${worker.id}-${worker.email ?? ""}`}
                            onBlur={async (e) => {
                              const v = e.target.value.trim();
                              if (v === (worker.email ?? "")) return;
                              await patchWorker({ email: v || null });
                            }}
                            className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                          />
                        </label>
                      </div>
                      <DashRow label="Nationality" value={worker.nationality || "—"} />
                      <label className="text-[12px] font-semibold text-[#64748B]">
                        Address line 1
                        <input
                          defaultValue={worker.address_line_1 ?? ""}
                          key={`a1-${worker.id}-${worker.address_line_1 ?? ""}`}
                          onBlur={async (e) => {
                            const v = e.target.value.trim();
                            if (v === (worker.address_line_1 ?? "")) return;
                            await patchWorker({ address_line_1: v || null });
                          }}
                          className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                        />
                      </label>
                      <label className="text-[12px] font-semibold text-[#64748B]">
                        Address line 2
                        <input
                          defaultValue={worker.address_line_2 ?? ""}
                          key={`a2-${worker.id}-${worker.address_line_2 ?? ""}`}
                          onBlur={async (e) => {
                            const v = e.target.value.trim();
                            if (v === (worker.address_line_2 ?? "")) return;
                            await patchWorker({ address_line_2: v || null });
                          }}
                          className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                        />
                      </label>
                      <label className="text-[12px] font-semibold text-[#64748B]">
                        Address line 3
                        <input
                          defaultValue={worker.address_line_3 ?? ""}
                          key={`a3-${worker.id}-${worker.address_line_3 ?? ""}`}
                          onBlur={async (e) => {
                            const v = e.target.value.trim();
                            if (v === (worker.address_line_3 ?? "")) return;
                            await patchWorker({ address_line_3: v || null });
                          }}
                          className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                        />
                      </label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="text-[12px] font-semibold text-[#64748B]">
                          Postcode
                          <input
                            defaultValue={worker.postal_code ?? ""}
                            key={`pc-${worker.id}-${worker.postal_code ?? ""}`}
                            onBlur={async (e) => {
                              const v = e.target.value.trim();
                              if (v === (worker.postal_code ?? "")) return;
                              await patchWorker({ postal_code: v || null });
                            }}
                            className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                          />
                        </label>
                        <label className="text-[12px] font-semibold text-[#64748B]">
                          Country
                          <select
                            className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                            disabled={savingEmployment}
                            value={worker.uk_residence_country ?? ""}
                            onChange={async (e) => {
                              const v = e.target.value;
                              await patchWorker({ uk_residence_country: v || null });
                            }}
                          >
                            {UK_RESIDENCE_OPTIONS.map((o) => (
                              <option key={o.value || "unset"} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                  )}
                </AspectCard>

                <AspectCard
                  title="Employment & role"
                  subtitle="Job, site, and contract-related fields"
                  icon={Briefcase}
                  barClass="bg-[#7C3AED]"
                >
                  {!canEditEmployment ? (
                    <div className="">
                      <DashRow label="Job title" value={worker.job_title || "—"} />
                      <DashRow label="Department" value={worker.department || "—"} />
                      <DashRow label="Work location" value={worker.work_location || "—"} />
                      <DashRow label="Onboarding (HR label)" value={worker.hr_onboarding_stage || worker.stage || "—"} />
                      <DashRow label="Workflow stage" value={worker.stage || "—"} />
                      <DashRow label="Lifecycle status" value={worker.status || "—"} />
                      <DashRow label="Status" value={worker.employment_status || "—"} />
                      <DashRow label="Start date" value={formatDetailDate(worker.start_date)} />
                      <DashRow label="End date" value={formatDetailDate(worker.termination_date)} />
                      <DashRow
                        label="Salary (reported)"
                        value={
                          managerPayrollRestricted
                            ? "Not visible (managers cannot view payroll-related data)"
                            : `${formatSalaryGbp(worker.salary)} (${worker.salary_pay_type || "annual"})`
                        }
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-[12px] font-semibold text-[#64748B]">
                        Job title
                        <input
                          defaultValue={worker.job_title ?? ""}
                          key={`jt-${worker.id}-${worker.job_title ?? ""}`}
                            onBlur={async (e) => {
                            const v = e.target.value.trim();
                            if (v === (worker.job_title ?? "")) return;
                            if (!v) return;
                            await patchWorker({ job_title: v });
                          }}
                          className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                        />
                      </label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="text-[12px] font-semibold text-[#64748B]">
                          Department
                          <select
                            className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                            disabled={savingEmployment}
                            value={worker.department ?? ""}
                            onChange={async (e) => {
                              const v = e.target.value;
                              await patchWorker({ department: v || null });
                            }}
                          >
                            <option value="">—</option>
                            {[...new Set([...departmentOptions, worker.department || ""])].filter(Boolean).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-[12px] font-semibold text-[#64748B]">
                          Work location
                          <select
                            className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                            disabled={savingEmployment}
                            value={worker.work_location ?? ""}
                            onChange={async (e) => {
                              const v = e.target.value;
                              await patchWorker({ work_location: v || null });
                            }}
                          >
                            <option value="">—</option>
                            {[...new Set([...workLocationOptions, worker.work_location || ""])].filter(Boolean).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className="text-[12px] font-semibold text-[#64748B]">
                        Onboarding stage
                        <select
                          className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                          disabled={savingEmployment}
                          value={worker.hr_onboarding_stage ?? ""}
                          onChange={async (e) => {
                            const v = e.target.value;
                            await patchWorker({ hr_onboarding_stage: v || null });
                          }}
                        >
                          <option value="">—</option>
                          {[...new Set([...onboardingStageOptions, worker.hr_onboarding_stage || ""])].filter(Boolean).map(
                            (opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            )
                          )}
                        </select>
                      </label>
                      <div className="grid grid-cols-1 gap-2 rounded-xl border border-[#F0F4FF] bg-[#FAFCFF] p-3 sm:grid-cols-2">
                        <DashRow label="Workflow stage" value={worker.stage || "—"} />
                        <DashRow label="Lifecycle status" value={worker.status || "—"} />
                      </div>
                      <label className="text-[12px] font-semibold text-[#64748B]">
                        Status
                        <select
                          className="mt-1 w-full max-w-md rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                          disabled={savingEmployment}
                          value={worker.employment_status || "Active"}
                          onChange={async (e) => {
                            await patchWorker({ employment_status: e.target.value });
                          }}
                        >
                          {[...new Set([...employmentOptions, worker.employment_status || "Active"])].map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="text-[12px] font-semibold text-[#64748B]">
                          Start date
                          <input
                            type="date"
                            className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                            disabled={savingEmployment}
                            defaultValue={toDateInput(worker.start_date)}
                            key={`sd-${worker.id}-${toDateInput(worker.start_date)}`}
                            onBlur={async (e) => {
                              const raw = e.target.value;
                              const next = dateInputToIso(raw);
                              const prev = worker.start_date ? dateInputToIso(toDateInput(worker.start_date)) : null;
                              if (next === prev) return;
                              await patchWorker({ start_date: next });
                            }}
                          />
                        </label>
                        <label className="text-[12px] font-semibold text-[#64748B]">
                          End date
                          <input
                            type="date"
                            className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                            disabled={savingEmployment}
                            defaultValue={toDateInput(worker.termination_date)}
                            key={`ed-${worker.id}-${toDateInput(worker.termination_date)}`}
                            onBlur={async (e) => {
                              const raw = e.target.value;
                              const next = dateInputToIso(raw);
                              const prev = worker.termination_date
                                ? dateInputToIso(toDateInput(worker.termination_date))
                                : null;
                              if (next === prev) return;
                              await patchWorker({ termination_date: next });
                            }}
                          />
                        </label>
                      </div>
                      {!managerPayrollRestricted ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <label className="text-[12px] font-semibold text-[#64748B]">
                            Salary amount
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              defaultValue={worker.salary != null ? String(worker.salary) : ""}
                              key={`sal-${worker.id}-${worker.salary ?? ""}`}
                              onBlur={async (e) => {
                                const raw = e.target.value;
                                const num = raw === "" ? null : Number(raw);
                                if (num !== null && Number.isNaN(num)) return;
                                if (num === worker.salary || (num == null && worker.salary == null)) return;
                                await patchWorker({ salary: num ?? 0 });
                              }}
                              className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                            />
                          </label>
                          <label className="text-[12px] font-semibold text-[#64748B]">
                            Salary basis
                            <select
                              className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                              disabled={savingEmployment}
                              value={worker.salary_pay_type || "annual"}
                              onChange={async (e) => {
                                await patchWorker({ salary_pay_type: e.target.value });
                              }}
                            >
                              {SALARY_PAY_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      ) : (
                        <DashRow
                          label="Salary (reported)"
                          value="Not visible (managers cannot view payroll-related data)"
                        />
                      )}
                    </div>
                  )}
                </AspectCard>

                <AspectCard
                  title="Immigration / Right to work"
                  subtitle="Right to work category, sponsor route, visa dates, and RTW checks"
                  icon={Plane}
                  barClass="bg-[#0D9488]"
                >
                  <div className="space-y-3">
                    {canEditEmployment ? (
                      <label className="block text-[12px] font-semibold text-[#64748B]">
                        Right to work category
                        <select
                          className="mt-1 w-full rounded-xl border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                          disabled={savingEmployment}
                          value={worker.right_to_work_category ?? ""}
                          onChange={async (e) => {
                            const v = e.target.value;
                            await patchWorker({ right_to_work_category: v || null });
                          }}
                        >
                          <option value="">—</option>
                          {[...new Set([...rtwCategoryOptions, worker.right_to_work_category || ""])]
                            .filter(Boolean)
                            .map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                        </select>
                      </label>
                    ) : null}
                    <div className="">
                      {!canEditEmployment ? (
                        <DashRow label="Right to work category" value={worker.right_to_work_category || "—"} />
                      ) : null}
                      {(rtwUi.showVisaImmigration || rtwUi.showSponsorshipCos) && (
                        <DashRow label="Immigration route" value={worker.route || "—"} />
                      )}
                      {rtwUi.showVisaImmigration ? (
                        <>
                          <DashRow label="Visa expiry" value={formatDetailDate(worker.visa_expiry)} />
                          <DashRow
                            label="Days to expiry"
                            value={
                              worker.visa_expiry
                                ? (() => {
                                    const d = Math.ceil(
                                      (new Date(worker.visa_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                                    );
                                    if (d < 0) return `${Math.abs(d)} days overdue`;
                                    return `${d} days`;
                                  })()
                                : "—"
                            }
                          />
                        </>
                      ) : null}
                      <DashRow label="Last RTW check" value={formatDetailDate(worker.last_rtw_check)} />
                      <DashRow label="Next RTW check" value={formatDetailDate(worker.next_rtw_check)} />
                    </div>
                  </div>
                </AspectCard>

                <AspectCard title="Risk & monitoring" subtitle="Compliance posture for this worker" icon={ShieldAlert} barClass="bg-[#DC2626]">
                  <div
                    className="rounded-xl border p-4"
                    style={{ background: riskTone.bg, borderColor: riskTone.border }}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#64748B]">Risk level</p>
                    <p className="mt-1 text-2xl font-extrabold capitalize" style={{ color: riskTone.text }}>
                      {worker.risk_level}
                    </p>
                    <p className="mt-3 text-xs leading-relaxed text-[#64748B]">
                      Keep documents and visa evidence aligned with this rating. Review checklist and records if level is elevated.
                    </p>
                  </div>
                </AspectCard>
              </div>
            </div>
          )}

          {mainTab === "checklist" && (
            <DocumentChecklist
              workerId={params.id}
              organisationId={worker.organisation_id?.trim() || user?.organisation_id || null}
              items={checklist}
              onRefresh={loadAll}
            />
          )}

          {mainTab === "records" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#E5EAF4] bg-white p-5 shadow-sm md:p-6">
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-start">
                  <div className="min-w-0">
                    <h3 className="text-[20px] font-extrabold tracking-tight text-[#0a0a0a]">Documents, files, contract and right to work</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab("checklist")}
                    className="inline-flex h-9 items-center gap-1.5 justify-self-start md:justify-self-end border border-[rgba(0,0,0,0.1)] bg-[#0f2d5e] px-4 text-[10px] font-bold uppercase tracking-[0.07em] text-white hover:bg-[#1a4fa0]"
                    style={{ fontFamily: "var(--dash-mono)" }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add / upload
                  </button>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="min-h-[82px] rounded-xl border border-[#E8EEFF] bg-white px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#94A3B8]" style={{ fontFamily: "var(--dash-mono)" }}>Checklist items</p>
                    <p className="mt-1 text-xl font-extrabold text-[#0F172A]">{checklist.length}</p>
                  </div>
                  <div className="min-h-[82px] rounded-xl border border-[#E8EEFF] bg-white px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#94A3B8]" style={{ fontFamily: "var(--dash-mono)" }}>Uploaded files</p>
                    <p className="mt-1 text-xl font-extrabold text-[#0F172A]">{allFiles.length}</p>
                  </div>
                  <div className="min-h-[82px] rounded-xl border border-[#E8EEFF] bg-white px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#94A3B8]" style={{ fontFamily: "var(--dash-mono)" }}>RTW category</p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-[#0F2D5E]">{worker.right_to_work_category || "—"}</p>
                  </div>
                  <div className="min-h-[82px] rounded-xl border border-[#E8EEFF] bg-white px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#94A3B8]" style={{ fontFamily: "var(--dash-mono)" }}>Visa expiry</p>
                    <p className="mt-1 text-sm font-semibold text-[#0F2D5E]">
                      {rtwUi.showVisaImmigration ? formatDetailDate(worker.visa_expiry) : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E8EEFF] bg-[#f8fafc] p-2">
                  {(
                    [
                      { id: "documents" as const, label: "Documents", icon: FileText },
                      { id: "files" as const, label: "Files", icon: FolderOpen },
                      { id: "contract" as const, label: "Contract", icon: FileSignature },
                      { id: "right_to_work" as const, label: "Right to work", icon: ShieldCheck },
                    ] as const
                  ).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setRecordsSub(id)}
                      className={`inline-flex h-9 items-center gap-2 border px-3 text-[10px] font-bold uppercase tracking-[0.07em] transition-colors ${
                        recordsSub === id
                          ? "border-[rgba(26,79,160,0.4)] bg-white text-[#1a4fa0]"
                          : "border-transparent text-[#64748B] hover:border-[rgba(0,0,0,0.1)] hover:bg-white"
                      }`}
                      style={{ fontFamily: "var(--dash-mono)" }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {recordsSub === "documents" && (
                <div className="overflow-hidden rounded-2xl border border-[#E5EAF4] bg-white shadow-sm">
                  {checklist.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-[#94a3b8]">No compliance items yet.</p>
                  ) : (
                    checklist.map((item, i) => (
                      <DocumentRow
                        key={item.id}
                        item={item}
                        isLast={i === checklist.length - 1}
                        hovered={hoverRow === item.id}
                        onHover={(v) => setHoverRow(v ? item.id : null)}
                        onOpen={() => setTab("checklist")}
                      />
                    ))
                  )}
                </div>
              )}

              {recordsSub === "files" && (
                <div className="overflow-hidden rounded-2xl border border-[#E5EAF4] bg-white shadow-sm">
                  {allFiles.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-[#94a3b8]">No uploaded files yet. Use Checklist to upload.</p>
                  ) : (
                    allFiles.map((f, i) => (
                      <div
                        key={`${f.name}-${i}`}
                        className={`flex items-center justify-between gap-4 px-5 py-3.5 ${i < allFiles.length - 1 ? "border-b border-[#EEF3FA]" : ""}`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#f0fdf4] text-[#16a34a]">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-[#0f2d5e]">{f.name}</p>
                            <p className="truncate text-[11px] text-[#94a3b8]">{f.item}</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.07em] text-[#94a3b8]" style={{ fontFamily: "var(--dash-mono)" }}>
                          {f.date ? new Date(f.date).toLocaleDateString("en-GB") : "—"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {recordsSub === "contract" && (
                <div className="rounded-2xl border border-dashed border-[rgba(0,0,0,0.16)] bg-white px-6 py-14 text-center shadow-sm">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center bg-[rgba(26,79,160,0.06)] text-[#1D4ED8]">
                    <FileSignature className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-sm font-bold text-[#0f2d5e]">Contract &amp; terms</p>
                  <p className="mt-1 text-xs text-[#94a3b8]">Link employment contracts here when available in Protexi.</p>
                </div>
              )}

              {recordsSub === "right_to_work" && (
                <div className="overflow-hidden rounded-2xl border border-[#E5EAF4] bg-white shadow-sm">
                  <div className="flex items-center gap-3 border-b border-[#EEF3FA] bg-[#f8fafc] px-5 py-4">
                    <div className="flex h-9 w-9 items-center justify-center bg-[rgba(26,79,160,0.08)] text-[#1a4fa0]">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0a0a0a]">Right to Work</p>
                      <p className="text-xs text-[#94a3b8]">Immigration status and RTW check record</p>
                    </div>
                  </div>
                  <div>
                    <DashRow label="Right to work category" value={worker.right_to_work_category || "—"} />
                    {(rtwUi.showVisaImmigration || rtwUi.showSponsorshipCos) && (
                      <DashRow label="Immigration route" value={worker.route || "—"} />
                    )}
                    {rtwUi.showVisaImmigration ? (
                      <DashRow label="Visa expiry" value={formatDetailDate(worker.visa_expiry)} />
                    ) : null}
                    <DashRow label="Last RTW check" value={formatDetailDate(worker.last_rtw_check)} />
                    <DashRow label="Next RTW check" value={formatDetailDate(worker.next_rtw_check)} />
                  </div>
                </div>
              )}
            </div>
          )}

          {mainTab === "bgverify" && (
            <div className="rounded-2xl border border-[#E5EAF4] bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-[#EEF3FA] px-5 py-4">
                <div className="flex h-8 w-8 items-center justify-center bg-[rgba(26,79,160,0.08)] text-[#1a4fa0]">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#0a0a0a]">Reference checks</p>
                  <p className="text-[11px] text-[#94a3b8]">Background verification references</p>
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <input
                    className="border border-[rgba(0,0,0,0.1)] bg-white px-3 py-2 text-[13px] text-[#0f2d5e] placeholder:text-[#94a3b8] focus:border-[#1a4fa0] focus:outline-none"
                    placeholder="Reference name"
                    value={bgRefName}
                    onChange={(e) => setBgRefName(e.target.value)}
                  />
                  <input
                    className="border border-[rgba(0,0,0,0.1)] bg-white px-3 py-2 text-[13px] text-[#0f2d5e] placeholder:text-[#94a3b8] focus:border-[#1a4fa0] focus:outline-none"
                    placeholder="Reference email"
                    value={bgRefEmail}
                    onChange={(e) => setBgRefEmail(e.target.value)}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center border border-[rgba(0,0,0,0.1)] bg-[#0f2d5e] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.07em] text-white hover:bg-[#1a4fa0]"
                    style={{ fontFamily: "var(--dash-mono)" }}
                    onClick={addReference}
                  >
                    Add reference
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center border border-[rgba(0,0,0,0.1)] bg-[#f0f0eb] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[rgba(26,79,160,0.08)]"
                    style={{ fontFamily: "var(--dash-mono)" }}
                    onClick={sendEmails}
                  >
                    Send emails
                  </button>
                </div>
                <div className="mt-4 space-y-2">
                  {bgRefs.map((r) => (
                    <div key={r.id} className="border border-[rgba(0,0,0,0.07)] bg-[#f8f8f5] px-4 py-3">
                      <p className="text-[13px] font-semibold text-[#0f2d5e]">{r.referee_name}</p>
                      <p className="text-[11px] text-[#94a3b8]" style={{ fontFamily: "var(--dash-mono)" }}>
                        {r.referee_email} · {r.status}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

type RiskTone = { bg: string; border: string; text: string };

function EmployeeDashboard({
  worker,
  managerPayrollRestricted,
  checklist,
  bgRefs,
  verifiedDocs,
  rejectedDocs,
  inReviewDocs,
  checklistPct,
  visaDays,
  riskTone,
  onGoChecklist,
  onGoBg,
  onGoDetails,
}: {
  worker: WorkerDetail;
  managerPayrollRestricted: boolean;
  checklist: ChecklistItem[];
  bgRefs: Array<{ id: string; referee_name: string; referee_email: string; status: string }>;
  verifiedDocs: number;
  rejectedDocs: number;
  inReviewDocs: number;
  checklistPct: number;
  visaDays: number | null;
  riskTone: RiskTone;
  onGoChecklist: () => void;
  onGoBg: () => void;
  onGoDetails: () => void;
}) {
  const rtwUi = useMemo(() => getRtwUiProfile(worker.right_to_work_category), [worker.right_to_work_category]);

  const fmtDate = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      : "—";

  const salaryStr =
    worker.salary != null && worker.salary !== undefined && !Number.isNaN(Number(worker.salary))
      ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(
          Number(worker.salary)
        )
      : "—";
  const salaryReportedDisplay = managerPayrollRestricted
    ? "Not visible (managers cannot view payroll-related data)"
    : salaryStr;

  const topChecklist = [...checklist].slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip — multiple lenses */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <DashboardKpi label="Compliance" value={`${checklistPct}%`} sub={`${verifiedDocs}/${checklist.length} done`} tone="blue" />
        <DashboardKpi label="In review" value={String(inReviewDocs)} sub="Awaiting verification" tone="amber" />
        <DashboardKpi label="Rejected" value={String(rejectedDocs)} sub="Need re-upload" tone="rose" />
        <DashboardKpi label="Risk" value={worker.risk_level} sub="Posture" tone="slate" accentColor={riskTone.text} />
        <DashboardKpi
          label="Visa"
          value={!rtwUi.showVisaImmigration ? "—" : visaDays == null ? "—" : `${visaDays}d`}
          sub={!rtwUi.showVisaImmigration ? "Not applicable" : "Days left"}
          tone="teal"
        />
        <DashboardKpi label="References" value={String(bgRefs.length)} sub="BG verify" tone="indigo" />
      </div>

      {/* Perspective grid */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AspectCard
          title="Profile & contact"
          subtitle="Who to reach and how"
          icon={User}
          barClass="bg-[#2563EB]"
          action={
            <button type="button" onClick={onGoDetails} className="inline-flex items-center gap-1 border border-[rgba(0,0,0,0.1)] bg-[#f0f0eb] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[rgba(26,79,160,0.08)]" style={{ fontFamily: "var(--dash-mono)" }}>
              All fields →
            </button>
          }
        >
          <div className="">
            <DashRow label="Full name" value={worker.name} />
            <DashRow label="Email" value={worker.email ? <a href={`mailto:${worker.email}`} className="text-[#2563EB] hover:underline">{worker.email}</a> : "—"} />
            <DashRow label="Phone" value={worker.phone || "—"} />
            <DashRow label="Age" value={worker.age_years != null ? String(worker.age_years) : "—"} />
            <DashRow label="Nationality" value={worker.nationality || "—"} />
          </div>
        </AspectCard>

        <AspectCard title="Employment" subtitle="Role, location & contract context" icon={Briefcase} barClass="bg-[#7C3AED]">
          <div className="">
            <DashRow label="Job title" value={worker.job_title || "—"} />
            <DashRow label="Department" value={worker.department || "—"} />
            <DashRow label="Work location" value={worker.work_location || "—"} />
            <DashRow label="Status" value={worker.employment_status || "—"} />
            <DashRow label="Onboarding stage" value={worker.hr_onboarding_stage || worker.stage || "—"} />
            <DashRow label="Start date" value={fmtDate(worker.start_date)} />
            <DashRow label="Salary (reported)" value={salaryReportedDisplay} />
          </div>
        </AspectCard>

        <AspectCard title="Immigration & visa" subtitle="Sponsor compliance lens" icon={Plane} barClass="bg-[#0D9488]">
          <div className="">
            <DashRow label="Right to work category" value={worker.right_to_work_category || "—"} />
            {(rtwUi.showVisaImmigration || rtwUi.showSponsorshipCos) && (
              <DashRow label="Immigration route" value={worker.route || "—"} />
            )}
            {rtwUi.showVisaImmigration ? (
              <>
                <DashRow label="Visa expiry" value={fmtDate(worker.visa_expiry)} />
                <DashRow
                  label="Countdown"
                  value={visaDays == null ? "—" : visaDays < 0 ? `${Math.abs(visaDays)} days overdue` : `${visaDays} days remaining`}
                />
              </>
            ) : null}
          </div>
        </AspectCard>

        <AspectCard
          title="Compliance & documents"
          subtitle="Checklist progress and latest items"
          icon={ClipboardList}
          barClass="bg-[#1D4ED8]"
          action={
            <button type="button" onClick={onGoChecklist} className="inline-flex items-center gap-1 border border-[rgba(0,0,0,0.1)] bg-[#f0f0eb] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[rgba(26,79,160,0.08)]" style={{ fontFamily: "var(--dash-mono)" }}>
              Open checklist <ArrowRight className="h-3 w-3" />
            </button>
          }
        >
          <div className="mb-4">
            <div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-[0.07em] text-[#94a3b8]" style={{ fontFamily: "var(--dash-mono)" }}>
              <span>Overall completion</span>
              <span className="text-[#0f2d5e]">{checklistPct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden bg-[#f0f0eb]">
              <div
                className="h-full bg-[#1a4fa0] transition-all duration-500"
                style={{ width: `${checklistPct}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] text-[#94a3b8]" style={{ fontFamily: "var(--dash-mono)" }}>
              {verifiedDocs} complete · {inReviewDocs} in review · {rejectedDocs} rejected
            </p>
          </div>
          {topChecklist.length === 0 ? (
            <p className="text-[12px] text-[#94a3b8]">No checklist items yet.</p>
          ) : (
            <ul className="space-y-0">
              {topChecklist.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between gap-2 border-b border-[rgba(0,0,0,0.06)] px-0 py-2.5 last:border-b-0"
                >
                  <span className="min-w-0 truncate text-[12px] font-semibold text-[#0f2d5e]">{it.description}</span>
                  <span
                    className={`shrink-0 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] ${
                      it.status === "verified" || it.status === "not_applicable"
                        ? "bg-[#f0fdf4] text-[#166534]"
                        : it.status === "rejected"
                          ? "bg-[#fef2f2] text-[#dc2626]"
                          : "bg-[#fffbeb] text-[#d97706]"
                    }`}
                    style={{ fontFamily: "var(--dash-mono)" }}
                  >
                    {it.status.replace("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AspectCard>

        <AspectCard title="Risk & monitoring" subtitle="Sponsor risk posture" icon={ShieldAlert} barClass="bg-[#DC2626]">
          <div className="border border-[rgba(0,0,0,0.07)] px-5 py-4" style={{ background: riskTone.bg }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#94a3b8]" style={{ fontFamily: "var(--dash-mono)" }}>Current risk level</p>
            <p className="mt-1 text-[24px] font-extrabold capitalize tracking-tight" style={{ color: riskTone.text }}>
              {worker.risk_level}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-[#94a3b8]">
              Use checklist, visa dates, and right-to-work evidence to keep this worker audit-ready.
            </p>
          </div>
        </AspectCard>

        <AspectCard
          title="Background verification"
          subtitle="References and referee status"
          icon={ShieldCheck}
          barClass="bg-[#4F46E5]"
          action={
            <button type="button" onClick={onGoBg} className="inline-flex items-center gap-1 border border-[rgba(0,0,0,0.1)] bg-[#f0f0eb] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[rgba(26,79,160,0.08)]" style={{ fontFamily: "var(--dash-mono)" }}>
              Manage refs <ArrowRight className="h-3 w-3" />
            </button>
          }
        >
          {bgRefs.length === 0 ? (
            <p className="text-[12px] text-[#94a3b8]">No references added yet. Add referees from the BG verify tab.</p>
          ) : (
            <ul className="space-y-0">
              {bgRefs.slice(0, 4).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 border-b border-[rgba(0,0,0,0.06)] py-2.5 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-[#0f2d5e]">{r.referee_name}</p>
                    <p className="truncate text-[10px] text-[#94a3b8]">{r.referee_email}</p>
                  </div>
                  <span className="shrink-0 bg-[rgba(26,79,160,0.08)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] text-[#1a4fa0]" style={{ fontFamily: "var(--dash-mono)" }}>
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AspectCard>
      </div>
    </div>
  );
}

function DashboardKpi({
  label,
  value,
  sub,
  tone,
  accentColor,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "blue" | "amber" | "rose" | "slate" | "teal" | "indigo";
  accentColor?: string;
}) {
  // tone kept for API compat — not used visually
  void tone;
  return (
    <div className="border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#94a3b8]" style={{ fontFamily: "var(--dash-mono)" }}>{label}</p>
      <p className="mt-1 truncate text-[22px] font-extrabold tracking-tight text-[#0f2d5e]" style={accentColor ? { color: accentColor } : undefined}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-medium leading-tight text-[#94a3b8]">{sub}</p>
    </div>
  );
}

function AspectCard({
  title,
  subtitle,
  icon: Icon,
  barClass,
  children,
  action,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  barClass: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  // barClass kept for API compatibility but not rendered visually
  void barClass;
  return (
    <section className="overflow-hidden border border-[rgba(0,0,0,0.08)] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(0,0,0,0.07)] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-[rgba(26,79,160,0.08)] text-[#1a4fa0]">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[13px] font-bold text-[#0a0a0a]">{title}</h2>
            <p className="text-[11px] text-[#94a3b8]">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function DashRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[rgba(0,0,0,0.06)] px-5 py-3 last:border-b-0">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.07em] text-[#94a3b8]" style={{ fontFamily: "var(--dash-mono)", minWidth: 140 }}>{label}</span>
      <span className="min-w-0 text-[13px] font-semibold leading-snug text-[#0f2d5e] text-right">{value}</span>
    </div>
  );
}

function DocumentRow({
  item,
  isLast,
  hovered,
  onHover,
  onOpen,
}: {
  item: ChecklistItem;
  isLast: boolean;
  hovered: boolean;
  onHover: (v: boolean) => void;
  onOpen: () => void;
}) {
  const dateStr = useMemo(() => {
    const dates = item.documents.map((d) => d.upload_date).filter(Boolean) as string[];
    if (dates.length === 0) return "—";
    const latest = [...dates].sort().reverse()[0];
    return new Date(latest).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  }, [item.documents]);

  const ok = item.status === "verified" || item.status === "not_applicable";
  const bad = item.status === "rejected";

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors ${
        !isLast ? "border-b border-[rgba(0,0,0,0.06)]" : ""
      } ${hovered ? "bg-[#f8f8f5]" : "bg-white"}`}
    >
      <span className="flex shrink-0 items-center justify-center">
        {ok ? (
          <span className="flex h-7 w-7 items-center justify-center bg-[#f0fdf4] text-[#16a34a]">
            <CheckCircle2 className="h-4 w-4" />
          </span>
        ) : bad ? (
          <span className="flex h-7 w-7 items-center justify-center bg-[#fef2f2] text-[#dc2626]">
            <XCircle className="h-4 w-4" />
          </span>
        ) : (
          <span className="flex h-7 w-7 items-center justify-center bg-[#fffbeb] text-[#d97706]">
            <Clock3 className="h-4 w-4" />
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold leading-snug text-[#0f2d5e]">{item.description}</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.07em] text-[#94a3b8]" style={{ fontFamily: "var(--dash-mono)" }}>Item {item.item_number}</p>
      </div>
      <div className="hidden shrink-0 flex-col items-end text-right sm:flex">
        <span className="text-[9px] font-bold uppercase tracking-[0.07em] text-[#94a3b8]" style={{ fontFamily: "var(--dash-mono)" }}>Updated</span>
        <span className="text-[11px] font-semibold text-[#0f2d5e]">{dateStr}</span>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#d1d5db]" />
    </button>
  );
}

export default function WorkerDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">Loading employee…</p>}>
      <WorkerDetailInner />
    </Suspense>
  );
}
