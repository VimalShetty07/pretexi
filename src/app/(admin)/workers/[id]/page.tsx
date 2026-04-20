"use client";

import { useEffect, useMemo, useState, useRef, useCallback, Suspense, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { getRtwUiProfile } from "@/lib/rtw-profile";
import DocumentChecklist, { type ChecklistItem, type SupersededDocument } from "./checklist";
import { parseChecklistListPayload } from "@/lib/parse-checklist-response";
import { RtwVerificationChecklistSection, type RtwVerificationChecklist } from "@/components/rtw-verification-checklist";
import "../../dashboard/dashboard-marketing.css";
import "../workers-page.css";
import {
  ChevronRight,
  CheckCircle2,
  XCircle,
  MinusCircle,
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
  Camera,
  Trash2,
  StickyNote,
  Mail,
  Phone,
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
  rtw_check_signed_at?: string | null;
  rtw_check_signed_by_name?: string | null;
  right_to_work_category?: string | null;
  /** Tenant that owns this worker — used for checklist API scoping (platform users) */
  organisation_id?: string | null;
  has_profile_photo?: boolean;
  /** HR/compliance notes — per employee; omitted for portal self-view */
  internal_notes?: string | null;
  /** Admin RTW verification checklist — omitted for employees on portal */
  rtw_verification_checklist?: RtwVerificationChecklist | null;
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

/** Profile header pill — driven by org employment status (same field as the dropdown), not sponsor `status`. */
function employmentStatusHeaderBadge(employment: string | null | undefined): { label: string; tone: "active" | "warn" | "muted" } {
  const label = (employment?.trim() || "Active") || "Active";
  const low = label.toLowerCase();
  if (low === "active") return { label, tone: "active" };
  if (
    low.includes("inactive") ||
    low === "finished" ||
    low.includes("terminated") ||
    low.includes("former") ||
    low.endsWith("ended")
  )
    return { label, tone: "muted" };
  if (
    low.includes("leave") ||
    low.includes("probation") ||
    low.includes("sabbatical") ||
    low.includes("suspension") ||
    low.includes("notice")
  )
    return { label, tone: "warn" };
  return { label, tone: "muted" };
}

function formatRtwSignedAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function BritishIrishRtwPanel({
  worker,
  canEditEmployment,
  savingEmployment,
  patchWorker,
  loadAll,
  token,
  workerId,
}: {
  worker: WorkerDetail;
  canEditEmployment: boolean;
  savingEmployment: boolean;
  patchWorker: (body: Record<string, unknown>) => Promise<void>;
  loadAll: () => Promise<void>;
  token: string | null;
  workerId: string;
}) {
  const [signing, setSigning] = useState(false);

  const signRtw = async () => {
    if (!token || !workerId) return;
    setSigning(true);
    try {
      await api.post<WorkerDetail>(`/workers/${workerId}/rtw-british-irish-sign`, {}, token);
      await loadAll();
    } finally {
      setSigning(false);
    }
  };

  const labelMono = { fontFamily: "var(--dash-mono)" } as const;

  return (
    <div className="mt-3 overflow-hidden rounded-none border border-[rgba(0,0,0,0.08)] bg-white shadow-[inset_3px_0_0_0_#0d9488]">
      <div className="border-b border-[rgba(0,0,0,0.06)] bg-[#f8fafc] px-4 py-2.5">
        <p className="text-[11px] font-semibold leading-tight text-[#0f2d5e]">British / Irish — RTW verification</p>
      </div>

      <div className="divide-y divide-[rgba(0,0,0,0.06)]">
        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <span
            className="shrink-0 text-[10px] font-bold uppercase tracking-[0.07em] text-[#94a3b8] sm:w-[10.5rem]"
            style={labelMono}
          >
            RTW check date
          </span>
          <div className="min-w-0 flex-1 sm:flex sm:justify-end">
            <input
              type="date"
              className="w-full max-w-[11rem] rounded-none border border-[rgba(0,0,0,0.1)] bg-[#fafafa] px-3 py-2 text-[13px] font-medium text-[#0f1f3a] outline-none transition-colors focus:border-[rgba(26,79,160,0.45)] focus:bg-white disabled:opacity-60"
              disabled={!canEditEmployment || savingEmployment}
              defaultValue={toDateInput(worker.last_rtw_check)}
              key={`british-rtw-date-${worker.id}-${worker.last_rtw_check ?? ""}`}
              onBlur={async (e) => {
                const raw = e.target.value;
                const next = dateInputToIso(raw);
                const prev = worker.last_rtw_check ? dateInputToIso(toDateInput(worker.last_rtw_check)) : null;
                if (next === prev) return;
                await patchWorker({ last_rtw_check: next });
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <span
            className="shrink-0 text-[10px] font-bold uppercase tracking-[0.07em] text-[#94a3b8] sm:mt-0.5 sm:w-[10.5rem]"
            style={labelMono}
          >
            Checked by (HR)
          </span>
          <p className="min-w-0 flex-1 text-right text-[13px] font-semibold leading-snug text-[#0f2d5e] sm:max-w-[min(100%,20rem)]">
            {worker.rtw_check_signed_by_name && worker.rtw_check_signed_at
              ? `${worker.rtw_check_signed_by_name} · ${formatRtwSignedAt(worker.rtw_check_signed_at)}`
              : <span className="font-medium text-[#cbd5e1]">Not signed yet</span>}
          </p>
        </div>

        {canEditEmployment ? (
          <div className="bg-[#fafaf8] px-4 py-3">
            <button
              type="button"
              disabled={signing || savingEmployment || !!worker.rtw_check_signed_at}
              onClick={() => void signRtw()}
              className="inline-flex h-10 w-full items-center justify-center rounded-none border border-[rgba(26,79,160,0.25)] bg-[#0f2d5e] px-4 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-[#1a4fa0] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:min-w-[14rem]"
            >
              {signing ? "Signing…" : worker.rtw_check_signed_at ? "Signed" : "Sign RTW verification"}
            </button>
            {worker.rtw_check_signed_at ? (
              <p className="mt-2 text-[10px] text-[#94a3b8]" style={labelMono}>
                This record is locked after sign-off.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function WorkerDetailInner() {
  const { token, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [supersededDocuments, setSupersededDocuments] = useState<SupersededDocument[]>([]);
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
  const [savingInternalNotes, setSavingInternalNotes] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const firstNameRef = useRef<HTMLInputElement | null>(null);
  const secondNameRef = useRef<HTMLInputElement | null>(null);
  const lastNameRef = useRef<HTMLInputElement | null>(null);
  const canUploadProfilePhoto = Boolean(user && user.role === "employee" && user.worker_id === params?.id);
  const showStaffNotes = Boolean(user && user.role !== "employee");
  const [notesDraft, setNotesDraft] = useState("");

  const rtwUi = useMemo(() => getRtwUiProfile(worker?.right_to_work_category), [worker?.right_to_work_category]);

  const patchWorker = async (body: Record<string, unknown>) => {
    if (!token || !params?.id) return;
    const keys = Object.keys(body);
    const internalNotesOnly = keys.length === 1 && keys[0] === "internal_notes";
    if (internalNotesOnly) setSavingInternalNotes(true);
    else setSavingEmployment(true);
    try {
      await api.patch(`/workers/${params.id}`, body, token);
      const data = await api.get<WorkerDetail>(`/workers/${params.id}`, token);
      setWorker((prev) => {
        if (!prev) return data;
        const merged = { ...data };
        if (data.internal_notes === undefined && prev.internal_notes !== undefined) {
          merged.internal_notes = prev.internal_notes;
        }
        return merged;
      });
    } finally {
      if (internalNotesOnly) setSavingInternalNotes(false);
      else setSavingEmployment(false);
    }
  };

  const saveInternalNotesIfChanged = async () => {
    if (!canEditEmployment || !worker || !token || !params?.id) return;
    const next = notesDraft;
    const prev = worker.internal_notes ?? "";
    if (next === prev) return;
    await patchWorker({ internal_notes: next.trim() ? next : null });
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
      const rawChecklist = await api.get<unknown>(checklistPath, token);
      const parsed = parseChecklistListPayload<ChecklistItem, SupersededDocument>(rawChecklist);
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
      setChecklist(parsed.items);
      setSupersededDocuments(parsed.superseded_documents);
      setBgRefs(bg.references || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load worker");
    } finally {
      setLoading(false);
    }
  };

  const reloadChecklist = useCallback(async () => {
    if (!token || !params?.id) return;
    const orgForChecklist =
      worker?.organisation_id?.trim() || user?.organisation_id?.trim() || "";
    const checklistPath =
      orgForChecklist.length > 0
        ? `/workers/${params.id}/checklist?organisation_id=${encodeURIComponent(orgForChecklist)}`
        : `/workers/${params.id}/checklist`;
    try {
      const rawChecklist = await api.get<unknown>(checklistPath, token);
      const parsed = parseChecklistListPayload<ChecklistItem, SupersededDocument>(rawChecklist);
      setChecklist(parsed.items);
      setSupersededDocuments(parsed.superseded_documents);
    } catch {
      /* ignore */
    }
  }, [token, params?.id, worker?.organisation_id, user?.organisation_id]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, params?.id, user?.organisation_id]);

  useEffect(() => {
    if (mainTab === "checklist") reloadChecklist();
  }, [mainTab, reloadChecklist]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") reloadChecklist();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [reloadChecklist]);

  useEffect(() => {
    const onTemplateSaved = () => {
      reloadChecklist();
    };
    window.addEventListener("protexi-checklist-template-saved", onTemplateSaved);
    return () => window.removeEventListener("protexi-checklist-template-saved", onTemplateSaved);
  }, [reloadChecklist]);

  /** Initialise notes when opening a different employee only — avoids resetting the draft on every PATCH refetch. */
  useEffect(() => {
    if (worker) setNotesDraft(worker.internal_notes ?? "");
  }, [worker?.id]);

  useEffect(() => {
    const t = searchParams.getAll("tab").at(-1) ?? searchParams.get("tab");
    if (t === "records" || t === "overview" || t === "details" || t === "checklist" || t === "bgverify") {
      setMainTab(t);
      return;
    }
    setMainTab("overview");
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

  const checklistItems = Array.isArray(checklist) ? checklist : [];

  /** HR-verified uploads only — N/A items do not inflate the headline % */
  const verifiedHrCount = checklistItems.filter((c) => c.status === "verified").length;
  const notApplicableCount = checklistItems.filter((c) => c.status === "not_applicable").length;
  const checklistPct =
    checklistItems.length > 0 ? Math.round((verifiedHrCount / checklistItems.length) * 100) : 0;
  const rejectedDocs = checklistItems.filter((c) => c.status === "rejected").length;
  const inReviewDocs = checklistItems.filter((c) => c.status === "uploaded" || c.status === "not_started").length;
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
    for (const item of checklistItems) {
      for (const d of item.documents) {
        out.push({
          name: d.file_name,
          date: d.upload_date || "",
          item: item.description,
        });
      }
    }
    for (const s of supersededDocuments) {
      out.push({
        name: s.file_name ?? "File",
        date: s.superseded_at || "",
        item: `(archived) ${s.legacy_checklist_description ?? "checklist"}`,
      });
    }
    return out.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [checklistItems, supersededDocuments]);

  /** 1-based row labels for UI — API `item_number` is often sort_order (e.g. 100) and must not be shown as the item id */
  const checklistDisplayOrder = useMemo(() => {
    const sorted = [...checklistItems].sort((a, b) => {
      const an = Number(a.item_number);
      const bn = Number(b.item_number);
      if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
      return String(a.id).localeCompare(String(b.id));
    });
    return new Map(sorted.map((it, i) => [it.id, i + 1]));
  }, [checklistItems]);

  if (loading) return <p className="text-sm text-gray-500">Loading employee…</p>;
  if (error || !worker) return <p className="text-sm text-red-600">{error || "Employee not found"}</p>;

  const empHeader = employmentStatusHeaderBadge(worker.employment_status);
  const empHeaderStyles =
    empHeader.tone === "active"
      ? {
          wrap: "border-[#bbf7d0] bg-[#f0fdf4] text-[#16a34a]",
          dot: "bg-[#22c55e]",
        }
      : empHeader.tone === "warn"
        ? {
            wrap: "border-[#fde68a] bg-[#fffbeb] text-[#a16207]",
            dot: "bg-[#d97706]",
          }
        : {
            wrap: "border-[rgba(0,0,0,0.12)] bg-[#f5f5f0] text-[#64748b]",
            dot: "bg-[#94a3b8]",
          };

  const visaChipTone =
    visaDays == null
      ? null
      : visaDays < 0
        ? { bg: "#fef2f2", border: "#fecaca", label: "#991b1b", num: "#b91c1c" }
        : visaDays < 30
          ? { bg: "#fffbeb", border: "#fde68a", label: "#a16207", num: "#b45309" }
          : visaDays < 90
            ? { bg: "#fff7ed", border: "#fed7aa", label: "#c2410c", num: "#9a3412" }
            : { bg: "#eef4ff", border: "#bfdbfe", label: "#1e40af", num: "#1a4fa0" };

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

      {/* ── Header: profile + notes — marketing flat boxes (0 radius) ─ */}
      <div
        className={`mb-3 grid w-full min-w-0 grid-cols-1 border border-[rgba(0,0,0,0.08)] bg-[#f5f5f0] ${
          showStaffNotes ? "gap-2 sm:grid-cols-2 sm:gap-3" : "gap-0 sm:grid-cols-1"
        }`}
      >
        {/* ── Profile card — marketing hero ── */}
        <div className="min-w-0 border-b border-[rgba(0,0,0,0.08)] bg-[#f0f0eb] sm:border-b-0">
          <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.07)] bg-white px-3 py-2">
            <div
              className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.13em] text-[#0f2d5e]"
              style={{ fontFamily: "var(--dash-mono)" }}
            >
              <User className="h-3.5 w-3.5 text-[#0f2d5e]" aria-hidden />
              Profile
            </div>
            <span
              className={`inline-flex max-w-[min(100%,14rem)] items-center gap-1.5 border px-2.5 py-1 text-[11px] font-semibold leading-snug ${empHeaderStyles.wrap}`}
              style={{ fontFamily: "var(--dash-mono)", letterSpacing: "0.04em" }}
              title={`Sponsor lifecycle (separate from employment status): ${worker.status || "—"}`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${empHeaderStyles.dot}`} />
              <span className="min-w-0 truncate">{empHeader.label}</span>
            </span>
          </div>

          {/* Band 1: portrait left, identity + contact right */}
          <div className="border-b border-[rgba(0,0,0,0.07)] bg-white pt-2.5 sm:pt-3">
            <div className="flex flex-row items-stretch gap-3 px-3 pb-3 pt-0 sm:gap-4 sm:px-4 sm:pb-3.5">
              <div className="relative shrink-0 self-stretch pb-0.5 pr-0.5">
                <div className="flex h-full min-h-[3.75rem] border border-[rgba(0,0,0,0.12)] bg-white p-0.5">
                  <div className="relative flex h-full w-auto min-w-[3rem] max-w-[7.5rem] items-center justify-center overflow-hidden border border-[rgba(15,45,94,0.14)] bg-[#e8f0ff] text-sm font-bold text-[#1a4fa0] sm:max-w-[8.5rem] sm:text-base">
                    {profilePhotoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={profilePhotoUrl}
                        alt={worker.name}
                        className="max-h-full w-auto object-contain"
                      />
                    ) : (
                      <span className="select-none px-2">{initials}</span>
                    )}
                  </div>
                </div>
                {canUploadProfilePhoto && (
                  <button
                    type="button"
                    disabled={profilePhotoUploading}
                    onClick={() => profilePhotoInputRef.current?.click()}
                    className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center border-2 border-white bg-[#0f2d5e] text-white transition hover:bg-[#1a4fa0] disabled:opacity-50"
                    title="Upload photo"
                  >
                    <Camera className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col items-stretch gap-0 text-left">
                <h1 className="max-w-full text-[1.2rem] font-extrabold leading-tight tracking-[-0.02em] text-[#0a0a0a] sm:text-[1.35rem]">
                  {worker.name}
                </h1>

                {(worker.job_title ||
                  worker.department ||
                  worker.work_location ||
                  worker.email ||
                  worker.phone) && (
                  <div className="my-4 flex w-full min-w-0 flex-col gap-3">
                    {(worker.job_title || worker.department || worker.work_location) && (
                      <div className="border border-[rgba(0,0,0,0.08)] border-l-[3px] border-l-[#1a4fa0] bg-[#f5f5f0] px-3 py-2">
                        <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] font-semibold leading-snug text-[#475569]">
                          {worker.job_title && (
                            <span className="inline-flex items-center gap-1 text-[#0a0a0a]">
                              <Briefcase className="h-3 w-3 shrink-0 text-[#94a3b8]" aria-hidden />
                              {worker.job_title}
                            </span>
                          )}
                          {worker.department && (
                            <>
                              <span className="text-[rgba(0,0,0,0.18)]">·</span>
                              <span>{worker.department}</span>
                            </>
                          )}
                          {worker.work_location && (
                            <>
                              <span className="text-[rgba(0,0,0,0.18)]">·</span>
                              <span>{worker.work_location}</span>
                            </>
                          )}
                        </p>
                      </div>
                    )}

                    {(worker.email || worker.phone) && (
                      <div className="w-full max-w-full border border-[rgba(0,0,0,0.1)] bg-white px-2 py-1.5">
                        <p
                          className="text-[10px] font-bold uppercase leading-none tracking-[0.1em] text-[#64748b]"
                          style={{ fontFamily: "var(--dash-mono)" }}
                        >
                          Contact
                        </p>
                        <div className="mt-1 flex flex-col gap-1">
                          {worker.email && (
                            <a
                              href={`mailto:${worker.email}`}
                              className="inline-flex min-w-0 items-center gap-1.5 text-[12px] font-medium leading-tight text-[#0f2d5e] transition hover:text-[#1a4fa0]"
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-[rgba(0,0,0,0.08)] bg-[#f5f5f0] text-[#64748b]">
                                <Mail className="h-2.5 w-2.5" aria-hidden />
                              </span>
                              <span className="min-w-0 break-all underline-offset-2 hover:underline">{worker.email}</span>
                            </a>
                          )}
                          {worker.phone && (
                            <a
                              href={`tel:${worker.phone.replace(/\s+/g, "")}`}
                              className="inline-flex min-w-0 items-center gap-1.5 text-[12px] font-medium leading-tight text-[#0f2d5e] transition hover:text-[#1a4fa0]"
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-[rgba(0,0,0,0.08)] bg-[#f5f5f0] text-[#64748b]">
                                <Phone className="h-2.5 w-2.5" aria-hidden />
                              </span>
                              <span className="min-w-0 underline-offset-2 hover:underline">{worker.phone}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(worker.route || (visaDays != null && visaChipTone) || worker.hr_onboarding_stage) && (
                  <div className="mt-5 flex w-full min-w-0 flex-wrap items-center gap-2 sm:mt-6">
                    {worker.route && (
                      <span className="inline-flex items-center gap-1 border border-[#bfdbfe] bg-[#eef4ff] px-2.5 py-1 text-[11px] font-semibold leading-none text-[#1e40af]">
                        {worker.route} Visa
                      </span>
                    )}
                    {visaDays != null && visaChipTone && (
                      <span
                        className="inline-flex items-center gap-1 border px-2.5 py-1 text-[11px] font-semibold leading-none"
                        style={{
                          backgroundColor: visaChipTone.bg,
                          color: visaChipTone.label,
                          borderColor: visaChipTone.border,
                        }}
                      >
                        <Plane className="h-3 w-3 shrink-0" aria-hidden />
                        {visaDays < 0 ? "Visa expired" : `${visaDays} days left`}
                      </span>
                    )}
                    {worker.hr_onboarding_stage && (
                      <span className="inline-flex items-center border border-[rgba(0,0,0,0.1)] bg-[#f5f5f0] px-2.5 py-1 text-[11px] font-semibold leading-none text-[#64748b]">
                        {worker.hr_onboarding_stage}
                      </span>
                    )}
                  </div>
                )}

                {(canEditEmployment || worker.employment_status) && (
                  <div
                    className="mt-4 flex w-full min-w-0 flex-wrap items-center gap-3 border-t border-[rgba(0,0,0,0.06)] pt-3 sm:mt-5"
                    title="Where someone sits in your HR workflow (e.g. Active, On leave). Options are set under Organisation → Employment statuses."
                  >
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b]"
                      style={{ fontFamily: "var(--dash-mono)" }}
                    >
                      Employment status
                    </span>
                    {canEditEmployment ? (
                      <>
                        <select
                          className="min-h-[2.5rem] min-w-[11rem] max-w-full rounded-none border border-[rgba(0,0,0,0.1)] bg-[#f5f5f0] px-4 py-2.5 text-[12px] font-semibold leading-normal text-[#0f2d5e] outline-none transition-colors focus:border-[rgba(26,79,160,0.35)] focus:bg-white"
                          style={{ fontFamily: "var(--dash-mono)" }}
                          disabled={savingEmployment}
                          aria-label="Employment status"
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
                        {savingEmployment ? (
                          <span
                            className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#64748b]"
                            style={{ fontFamily: "var(--dash-mono)" }}
                          >
                            Saving…
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-[12px] font-semibold text-[#0f2d5e]">{worker.employment_status}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Internal notes ── */}
        {showStaffNotes && (
          <div className="flex min-h-[180px] min-w-0 flex-col overflow-hidden bg-[#f0f0eb]">
            <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.07)] bg-white px-3 py-2">
              <div
                className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.13em] text-[#0f2d5e]"
                style={{ fontFamily: "var(--dash-mono)" }}
              >
                <StickyNote className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Internal notes
              </div>
              <span
                className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b]"
                style={{ fontFamily: "var(--dash-mono)" }}
              >
                Staff only
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-2.5">
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                onBlur={() => void saveInternalNotesIfChanged()}
                readOnly={!canEditEmployment}
                disabled={savingInternalNotes && canEditEmployment}
                placeholder={
                  canEditEmployment
                    ? "Visa, RTW, payroll, recruitment, compliance context for this employee…"
                    : "No edit access"
                }
                className="dash-admin-note-textarea min-h-[120px] w-full flex-1 resize-y read-only:cursor-default disabled:opacity-60"
                style={{ minHeight: 120 }}
                aria-label="Internal employee notes"
              />
              {canEditEmployment && savingInternalNotes ? (
                <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#16a34a]" style={{ fontFamily: "var(--dash-mono)" }}>
                  Saving…
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* ── Main tab nav ────────────────────────────────── */}
      <div className="mt-6 wem-surface">
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
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────── */}
      <div className="worker-tab-content">
          {mainTab === "overview" && (
            <EmployeeDashboard
              worker={worker}
              managerPayrollRestricted={managerPayrollRestricted}
              bgRefs={bgRefs}
              verifiedHrCount={verifiedHrCount}
              notApplicableCount={notApplicableCount}
              checklistTotal={checklistItems.length}
              rejectedDocs={rejectedDocs}
              inReviewDocs={inReviewDocs}
              checklistPct={checklistPct}
              visaDays={visaDays}
              riskTone={riskTone}
            />
          )}

          {mainTab === "details" && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 items-start gap-6 lg:gap-8 xl:grid-cols-2">
                <AspectCard compact title="Profile & contact" icon={User} barClass="bg-[#2563EB]">
                  {!canEditEmployment ? (
                    <div className="flex flex-col gap-3">
                      <ProfileFieldGroup title="Identity">
                        <ProfileKVRow label="Full name" value={worker.name} />
                        <ProfileKVRow label="First name" value={worker.first_name || "—"} />
                        <ProfileKVRow label="Second name" value={worker.second_name || "—"} />
                        <ProfileKVRow label="Surname" value={worker.last_name || "—"} />
                        <ProfileKVRow label="Sex" value={worker.sex || "—"} />
                        <ProfileKVRow label="Date of birth" value={formatDetailDate(worker.date_of_birth)} />
                        <ProfileKVRow label="Age" value={worker.age_years != null ? String(worker.age_years) : "—"} />
                        <ProfileKVRow label="Nationality" value={worker.nationality || "—"} />
                      </ProfileFieldGroup>
                      <ProfileFieldGroup title="Correspondence address">
                        <ProfileKVRow label="Address line 1" value={worker.address_line_1 || "—"} />
                        <ProfileKVRow label="Address line 2" value={worker.address_line_2 || "—"} />
                        <ProfileKVRow label="Address line 3" value={worker.address_line_3 || "—"} />
                        <ProfileKVRow label="Postcode" value={worker.postal_code || "—"} />
                        <ProfileKVRow label="Country" value={ukCountryLabel(worker.uk_residence_country)} />
                      </ProfileFieldGroup>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="min-w-0">
                        <ProfileBlockTitle>Identity</ProfileBlockTitle>
                        <div className="rounded-none border border-[rgba(0,0,0,0.1)] bg-[#fafbfc] p-3 sm:p-4">
                          <div
                            key={`nm-${worker.id}-${worker.first_name ?? ""}-${worker.second_name ?? ""}-${worker.last_name ?? ""}`}
                            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                          >
                            <label className="flex min-w-0 flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={{ fontFamily: "var(--dash-mono)" }}>
                                First name
                              </span>
                              <input
                                ref={firstNameRef}
                                defaultValue={worker.first_name ?? ""}
                                onBlur={syncNameBlur}
                                className="w-full rounded-none border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a] outline-none transition-colors focus:border-[rgba(26,79,160,0.45)]"
                              />
                            </label>
                            <label className="flex min-w-0 flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={{ fontFamily: "var(--dash-mono)" }}>
                                Second name
                              </span>
                              <input
                                ref={secondNameRef}
                                defaultValue={worker.second_name ?? ""}
                                onBlur={syncNameBlur}
                                className="w-full rounded-none border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a] outline-none transition-colors focus:border-[rgba(26,79,160,0.45)]"
                              />
                            </label>
                            <label className="flex min-w-0 flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={{ fontFamily: "var(--dash-mono)" }}>
                                Surname
                              </span>
                              <input
                                ref={lastNameRef}
                                defaultValue={worker.last_name ?? ""}
                                onBlur={syncNameBlur}
                                className="w-full rounded-none border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a] outline-none transition-colors focus:border-[rgba(26,79,160,0.45)]"
                              />
                            </label>
                          </div>
                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label className="flex min-w-0 flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={{ fontFamily: "var(--dash-mono)" }}>
                                Sex
                              </span>
                              <select
                                className="w-full rounded-none border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a] outline-none transition-colors focus:border-[rgba(26,79,160,0.45)]"
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
                            <label className="flex min-w-0 flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={{ fontFamily: "var(--dash-mono)" }}>
                                Date of birth
                              </span>
                              <input
                                type="date"
                                className="w-full rounded-none border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a] outline-none transition-colors focus:border-[rgba(26,79,160,0.45)]"
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
                          <div className="mt-3 flex flex-col gap-2 border-t border-[rgba(0,0,0,0.08)] pt-3">
                            <ProfileKVRow
                              dense
                              label="Age (from DOB)"
                              value={worker.age_years != null ? String(worker.age_years) : "—"}
                            />
                            <ProfileKVRow dense label="Nationality" value={worker.nationality || "—"} />
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <ProfileBlockTitle>Correspondence address</ProfileBlockTitle>
                        <div className="space-y-3 rounded-none border border-[rgba(0,0,0,0.1)] bg-[#fafbfc] p-3 sm:p-4">
                          <label className="flex min-w-0 flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={{ fontFamily: "var(--dash-mono)" }}>
                              Address line 1
                            </span>
                            <input
                              defaultValue={worker.address_line_1 ?? ""}
                              key={`a1-${worker.id}-${worker.address_line_1 ?? ""}`}
                              onBlur={async (e) => {
                                const v = e.target.value.trim();
                                if (v === (worker.address_line_1 ?? "")) return;
                                await patchWorker({ address_line_1: v || null });
                              }}
                              className="w-full rounded-none border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a] outline-none transition-colors focus:border-[rgba(26,79,160,0.45)]"
                            />
                          </label>
                          <label className="flex min-w-0 flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={{ fontFamily: "var(--dash-mono)" }}>
                              Address line 2
                            </span>
                            <input
                              defaultValue={worker.address_line_2 ?? ""}
                              key={`a2-${worker.id}-${worker.address_line_2 ?? ""}`}
                              onBlur={async (e) => {
                                const v = e.target.value.trim();
                                if (v === (worker.address_line_2 ?? "")) return;
                                await patchWorker({ address_line_2: v || null });
                              }}
                              className="w-full rounded-none border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a] outline-none transition-colors focus:border-[rgba(26,79,160,0.45)]"
                            />
                          </label>
                          <label className="flex min-w-0 flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={{ fontFamily: "var(--dash-mono)" }}>
                              Address line 3
                            </span>
                            <input
                              defaultValue={worker.address_line_3 ?? ""}
                              key={`a3-${worker.id}-${worker.address_line_3 ?? ""}`}
                              onBlur={async (e) => {
                                const v = e.target.value.trim();
                                if (v === (worker.address_line_3 ?? "")) return;
                                await patchWorker({ address_line_3: v || null });
                              }}
                              className="w-full rounded-none border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a] outline-none transition-colors focus:border-[rgba(26,79,160,0.45)]"
                            />
                          </label>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label className="flex min-w-0 flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={{ fontFamily: "var(--dash-mono)" }}>
                                Postcode
                              </span>
                              <input
                                defaultValue={worker.postal_code ?? ""}
                                key={`pc-${worker.id}-${worker.postal_code ?? ""}`}
                                onBlur={async (e) => {
                                  const v = e.target.value.trim();
                                  if (v === (worker.postal_code ?? "")) return;
                                  await patchWorker({ postal_code: v || null });
                                }}
                                className="w-full rounded-none border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a] outline-none transition-colors focus:border-[rgba(26,79,160,0.45)]"
                              />
                            </label>
                            <label className="flex min-w-0 flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={{ fontFamily: "var(--dash-mono)" }}>
                                Country
                              </span>
                              <select
                                className="w-full rounded-none border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a] outline-none transition-colors focus:border-[rgba(26,79,160,0.45)]"
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
                      <DashRow label="Employment status" value={worker.employment_status || "—"} />
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
                          className="mt-1 w-full rounded-none border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                        />
                      </label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="text-[12px] font-semibold text-[#64748B]">
                          Department
                          <select
                            className="mt-1 w-full rounded-none border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
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
                            className="mt-1 w-full rounded-none border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
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
                          className="mt-1 w-full rounded-none border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
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
                      <div className="grid grid-cols-1 gap-2 rounded-none border border-[#F0F4FF] bg-[#FAFCFF] p-3 sm:grid-cols-2">
                        <DashRow label="Workflow stage" value={worker.stage || "—"} />
                        <DashRow label="Lifecycle status" value={worker.status || "—"} />
                      </div>
                      <DashRow label="Employment status" value={worker.employment_status || "—"} />
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="text-[12px] font-semibold text-[#64748B]">
                          Start date
                          <input
                            type="date"
                            className="mt-1 w-full rounded-none border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
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
                            className="mt-1 w-full rounded-none border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
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
                              className="mt-1 w-full rounded-none border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
                            />
                          </label>
                          <label className="text-[12px] font-semibold text-[#64748B]">
                            Salary basis
                            <select
                              className="mt-1 w-full rounded-none border border-[#E8EEFF] bg-white px-3 py-2 text-[13px] font-medium text-[#0f1f3a]"
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
                      <div className="flex flex-col gap-2 border-b border-[rgba(0,0,0,0.06)] pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <span
                          className="shrink-0 text-[10px] font-bold uppercase tracking-[0.07em] text-[#94a3b8] sm:w-[10.5rem]"
                          style={{ fontFamily: "var(--dash-mono)" }}
                        >
                          Right to work category
                        </span>
                        <div className="min-w-0 flex-1 sm:flex sm:justify-end">
                          <select
                            className="w-full max-w-md rounded-none border border-[rgba(0,0,0,0.1)] bg-white px-3 py-2 text-[13px] font-semibold text-[#0f1f3a] outline-none transition-colors focus:border-[rgba(26,79,160,0.4)] disabled:opacity-60 sm:max-w-[min(100%,22rem)]"
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
                        </div>
                      </div>
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
                      {rtwUi.kind === "british_irish" ? (
                        <BritishIrishRtwPanel
                          worker={worker}
                          canEditEmployment={canEditEmployment}
                          savingEmployment={savingEmployment}
                          patchWorker={patchWorker}
                          loadAll={loadAll}
                          token={token}
                          workerId={params.id ?? ""}
                        />
                      ) : (
                        <>
                          <DashRow label="Last RTW check" value={formatDetailDate(worker.last_rtw_check)} />
                          <DashRow label="Next RTW check" value={formatDetailDate(worker.next_rtw_check)} />
                        </>
                      )}
                    </div>
                    {showStaffNotes ? (
                      <RtwVerificationChecklistSection
                        checklist={worker.rtw_verification_checklist}
                        canEditEmployment={canEditEmployment}
                        savingEmployment={savingEmployment}
                        onSave={async (next) => {
                          await patchWorker({ rtw_verification_checklist: next });
                        }}
                      />
                    ) : null}
                  </div>
                </AspectCard>

                <AspectCard title="Risk & monitoring" subtitle="Compliance posture for this worker" icon={ShieldAlert} barClass="bg-[#DC2626]">
                  <div
                    className="rounded-none border p-4"
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
              items={checklistItems}
              supersededDocuments={supersededDocuments}
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

                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  <div className="min-h-[82px] rounded-none border border-[#E8EEFF] bg-white px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#94A3B8]" style={{ fontFamily: "var(--dash-mono)" }}>Required types</p>
                    <p className="mt-1 text-xl font-extrabold text-[#0F172A]">{checklistItems.length}</p>
                    <p className="mt-0.5 text-[9px] leading-tight text-[#94a3b8]" style={{ fontFamily: "var(--dash-mono)" }}>Template or default 3</p>
                  </div>
                  <div className="min-h-[82px] rounded-none border border-[#E8EEFF] bg-white px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#94A3B8]" style={{ fontFamily: "var(--dash-mono)" }}>HR verified</p>
                    <p className="mt-1 text-xl font-extrabold text-[#0F172A]">
                      {verifiedHrCount}/{checklistItems.length || "—"}
                    </p>
                    <p className="mt-0.5 text-[9px] leading-tight text-[#94a3b8]" style={{ fontFamily: "var(--dash-mono)" }}>Vs Dashboard %</p>
                  </div>
                  <div className="min-h-[82px] rounded-none border border-[#E8EEFF] bg-white px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#94A3B8]" style={{ fontFamily: "var(--dash-mono)" }}>Uploaded files</p>
                    <p className="mt-1 text-xl font-extrabold text-[#0F172A]">{allFiles.length}</p>
                    <p className="mt-0.5 text-[9px] leading-tight text-[#94a3b8]" style={{ fontFamily: "var(--dash-mono)" }}>Total attachments</p>
                  </div>
                  <div className="min-h-[82px] rounded-none border border-[#E8EEFF] bg-white px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#94A3B8]" style={{ fontFamily: "var(--dash-mono)" }}>RTW category</p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-[#0F2D5E]">{worker.right_to_work_category || "—"}</p>
                  </div>
                  <div className="min-h-[82px] rounded-none border border-[#E8EEFF] bg-white px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#94A3B8]" style={{ fontFamily: "var(--dash-mono)" }}>Visa expiry</p>
                    <p className="mt-1 text-sm font-semibold text-[#0F2D5E]">
                      {rtwUi.showVisaImmigration ? formatDetailDate(worker.visa_expiry) : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-none border border-[#E8EEFF] bg-[#f8fafc] p-2">
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
                  {checklistItems.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-[#94a3b8]">No compliance items yet.</p>
                  ) : (
                    checklistItems.map((item, i) => (
                      <DocumentRow
                        key={item.id}
                        item={item}
                        displayOrder={checklistDisplayOrder.get(item.id) ?? i + 1}
                        isLast={i === checklistItems.length - 1}
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
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-[rgba(0,0,0,0.08)] bg-[#f8fafc] text-[#64748b]">
                            <FileText className="h-4 w-4" />
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
                    {rtwUi.kind === "british_irish" ? (
                      <div className="px-5 py-4">
                        <BritishIrishRtwPanel
                          worker={worker}
                          canEditEmployment={canEditEmployment}
                          savingEmployment={savingEmployment}
                          patchWorker={patchWorker}
                          loadAll={loadAll}
                          token={token}
                          workerId={params.id ?? ""}
                        />
                      </div>
                    ) : (
                      <>
                        <DashRow label="Last RTW check" value={formatDetailDate(worker.last_rtw_check)} />
                        <DashRow label="Next RTW check" value={formatDetailDate(worker.next_rtw_check)} />
                      </>
                    )}
                    {showStaffNotes ? (
                      <RtwVerificationChecklistSection
                        checklist={worker.rtw_verification_checklist}
                        canEditEmployment={canEditEmployment}
                        savingEmployment={savingEmployment}
                        padded
                        onSave={async (next) => {
                          await patchWorker({ rtw_verification_checklist: next });
                        }}
                      />
                    ) : null}
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
  bgRefs,
  verifiedHrCount,
  notApplicableCount,
  checklistTotal,
  rejectedDocs,
  inReviewDocs,
  checklistPct,
  visaDays,
  riskTone,
}: {
  worker: WorkerDetail;
  managerPayrollRestricted: boolean;
  bgRefs: Array<{ id: string; referee_name: string; referee_email: string; status: string }>;
  verifiedHrCount: number;
  notApplicableCount: number;
  checklistTotal: number;
  rejectedDocs: number;
  inReviewDocs: number;
  checklistPct: number;
  visaDays: number | null;
  riskTone: RiskTone;
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

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip — multiple lenses */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <DashboardKpi
          label="Compliance"
          value={`${checklistPct}%`}
          sub={
            notApplicableCount > 0
              ? `${verifiedHrCount}/${checklistTotal} HR-verified · ${notApplicableCount} N/A`
              : `${verifiedHrCount}/${checklistTotal} HR-verified`
          }
          tone="blue"
        />
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
        <AspectCard title="Employment" subtitle="Role, location & contract context" icon={Briefcase} barClass="bg-[#7C3AED]">
          <div className="">
            <DashRow label="Job title" value={worker.job_title || "—"} />
            <DashRow label="Department" value={worker.department || "—"} />
            <DashRow label="Work location" value={worker.work_location || "—"} />
            <DashRow label="Employment status" value={worker.employment_status || "—"} />
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
    <div className="rounded-none border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#94a3b8]" style={{ fontFamily: "var(--dash-mono)" }}>{label}</p>
      <p className="mt-1 truncate text-[22px] font-extrabold tracking-tight text-[#0f2d5e]" style={accentColor ? { color: accentColor } : undefined}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-medium leading-tight text-[#94a3b8]">{sub}</p>
    </div>
  );
}

function ProfileBlockTitle({ children }: { children: ReactNode }) {
  return (
    <h3
      className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#0f2d5e]"
      style={{ fontFamily: "var(--dash-mono)" }}
    >
      {children}
    </h3>
  );
}

function ProfileFieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0 w-full">
      <ProfileBlockTitle>{title}</ProfileBlockTitle>
      <div className="w-full min-w-0 divide-y divide-[rgba(0,0,0,0.07)] rounded-none border border-[rgba(0,0,0,0.1)] bg-white">
        {children}
      </div>
    </div>
  );
}

function ProfileKVRow({
  label,
  value,
  dense,
}: {
  label: string;
  value: ReactNode;
  dense?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 w-full flex-col gap-1 sm:flex-row sm:items-start sm:gap-x-4 ${
        dense ? "px-3 py-1.5 sm:px-3" : "px-3 py-2.5 sm:px-3"
      }`}
    >
      <span
        className="shrink-0 text-[10px] font-bold uppercase tracking-[0.07em] text-[#94a3b8] sm:w-[10.5rem] sm:pt-0.5"
        style={{ fontFamily: "var(--dash-mono)" }}
      >
        {label}
      </span>
      <span className="min-w-0 flex-1 break-words text-[13px] font-semibold leading-snug text-[#0f2d5e]">
        {value}
      </span>
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
  compact,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  barClass: string;
  children: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  // barClass kept for API compatibility but not rendered visually
  void barClass;
  return (
    <section className="min-w-0 rounded-none border border-[rgba(0,0,0,0.08)] bg-white">
      <div
        className={`flex flex-wrap items-center justify-between border-b border-[rgba(0,0,0,0.07)] ${
          compact ? "gap-2 px-4 py-2.5" : "gap-3 px-5 py-4"
        }`}
      >
        <div className={`flex min-w-0 items-center ${compact ? "gap-2" : "gap-3"}`}>
          <div
            className={`flex shrink-0 items-center justify-center bg-[rgba(26,79,160,0.08)] text-[#1a4fa0] ${
              compact ? "h-7 w-7" : "h-8 w-8"
            }`}
          >
            <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </div>
          <div className="min-w-0">
            <h2 className={`font-bold text-[#0a0a0a] ${compact ? "text-[12px] leading-tight" : "text-[13px]"}`}>{title}</h2>
            {subtitle ? (
              <p className={`text-[#94a3b8] ${compact ? "mt-0.5 text-[10px] leading-snug" : "text-[11px]"}`}>{subtitle}</p>
            ) : null}
          </div>
        </div>
        {action}
      </div>
      <div className={compact ? "min-w-0 p-3 sm:p-4" : "min-w-0 p-5"}>{children}</div>
    </section>
  );
}

function DashRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[rgba(0,0,0,0.06)] py-3 last:border-b-0">
      <span className="w-[10.5rem] shrink-0 text-[10px] font-bold uppercase tracking-[0.07em] text-[#94a3b8]" style={{ fontFamily: "var(--dash-mono)" }}>{label}</span>
      <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-[#0f2d5e] text-right">{value}</span>
    </div>
  );
}

function DocumentRow({
  item,
  displayOrder,
  isLast,
  hovered,
  onHover,
  onOpen,
}: {
  item: ChecklistItem;
  /** 1…n in template order — not raw API item_number (may be 100+) */
  displayOrder: number;
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

  const verified = item.status === "verified";
  const notApp = item.status === "not_applicable";
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
        {verified ? (
          <span className="flex h-7 w-7 items-center justify-center bg-[#f0fdf4] text-[#16a34a]">
            <CheckCircle2 className="h-4 w-4" />
          </span>
        ) : notApp ? (
          <span className="flex h-7 w-7 items-center justify-center bg-[#f1f5f9] text-[#64748b]" title="Marked not applicable">
            <MinusCircle className="h-4 w-4" />
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
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.07em] text-[#94a3b8]" style={{ fontFamily: "var(--dash-mono)" }}>Item {displayOrder}</p>
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
