"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  Phone,
  Mail,
  Clock,
  MapPin,
  Shield,
  Briefcase,
  FileText,
  CheckSquare,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit,
  ClipboardList,
  Upload,
  FileCheck,
  UserSearch,
  Send,
  Loader2,
  Trash2,
  Plus,
  ExternalLink,
} from "lucide-react";
import DocumentChecklist from "./checklist";

interface ChecklistSummaryItem {
  id: string;
  item_number: number;
  description: string;
  status: string;
}

interface WorkerDetail {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string;
  email: string | null;
  phone: string | null;
  personal_email: string | null;
  address: string | null;
  postal_code: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  place_of_birth: string | null;
  country_of_birth: string | null;
  gender: string | null;
  ethnicity: string | null;
  religion: string | null;
  ni_number: string | null;
  passport_number: string | null;
  passport_place_of_issue: string | null;
  passport_issue_date: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  employee_id: string | null;
  employee_type: string | null;
  department: string | null;
  soc_code: string | null;
  salary: number;
  route: string;
  work_location: string | null;
  work_address: string | null;
  is_hybrid: boolean;
  is_remote: boolean;
  start_date: string | null;
  termination_date: string | null;
  visa_expiry: string | null;
  visa_grant_date: string | null;
  passport_expiry: string | null;
  brp_reference: string | null;
  brp_issue_date: string | null;
  brp_expiry: string | null;
  entry_clearance_date: string | null;
  last_rtw_check: string | null;
  next_rtw_check: string | null;
  sponsorship_number: string | null;
  job_application_date: string | null;
  offer_letter_date: string | null;
  cos_assigned_date: string | null;
  bank_account_number: string | null;
  sort_code: string | null;
  dbs_check_date: string | null;
  status: string;
  stage: string;
  risk_level: string;
  dbs_required: boolean;
  dbs_completed: boolean;
  atas_required: boolean;
  atas_completed: boolean;
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

const STAGE_LABELS: Record<string, string> = {
  recruitment: "Recruitment",
  cos_assignment: "CoS Assignment",
  pre_start: "Pre-Start",
  active_sponsorship: "Active Sponsorship",
  terminated: "Terminated",
};

type TabKey = "personal" | "passport" | "sponsorship" | "compliance" | "employment" | "documents" | "bgverify";

const TABS: { key: TabKey; label: string; icon: typeof Briefcase }[] = [
  { key: "personal", label: "Personal Information", icon: FileText },
  { key: "passport", label: "Passport & ID", icon: Shield },
  { key: "employment", label: "Employment Details", icon: Briefcase },
  { key: "sponsorship", label: "Sponsorship Details", icon: Shield },
  { key: "compliance", label: "Compliance & Checks", icon: CheckSquare },
  { key: "documents", label: "Document Checklist", icon: ClipboardList },
  { key: "bgverify", label: "BG Verification", icon: UserSearch },
];

interface BgReference {
  id: string;
  referee_name: string;
  referee_email: string;
  referee_phone: string | null;
  referee_company: string;
  referee_job_title: string | null;
  relation_to_employee: string | null;
  employment_start: string | null;
  employment_end: string | null;
  status: string;
  email_sent_at: string | null;
  response_confirm_employment: boolean | null;
  response_confirm_dates: boolean | null;
  response_confirm_title: boolean | null;
  response_recommend: boolean | null;
  response_rating: number | null;
  response_comments: string | null;
  response_reason_for_leaving: string | null;
  response_additional_comments: string | null;
  responded_at: string | null;
  token: string;
}

interface BgVerificationData {
  id: string | null;
  status: string | null;
  references: BgReference[];
}

const BG_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending_references: { label: "Pending References", color: "text-amber-700", bg: "bg-amber-50" },
  emails_sent: { label: "Emails Sent", color: "text-blue-700", bg: "bg-blue-50" },
  in_progress: { label: "In Progress", color: "text-blue-700", bg: "bg-blue-50" },
  completed: { label: "Completed", color: "text-emerald-700", bg: "bg-emerald-50" },
  failed: { label: "Failed", color: "text-red-700", bg: "bg-red-50" },
};

const REF_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-gray-700", bg: "bg-gray-50" },
  email_sent: { label: "Email Sent", color: "text-blue-700", bg: "bg-blue-50" },
  completed: { label: "Completed", color: "text-emerald-700", bg: "bg-emerald-50" },
  declined: { label: "Declined", color: "text-red-700", bg: "bg-red-50" },
};

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-[var(--border)]" style={{ padding: "14px 0" }}>
      <dt className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide" style={{ marginBottom: 4 }}>
        {label}
      </dt>
      <dd className="text-sm text-brand-900 font-medium">{value || "—"}</dd>
    </div>
  );
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ date, label }: { date: string | null; label: string }) {
  const days = daysUntil(date);
  const urgent = days !== null && days <= 90 && days > 0;
  const expired = days !== null && days <= 0;

  return (
    <div
      className="rounded-xl border border-[var(--border)]"
      style={{ padding: "14px 18px", flex: "1 1 0", minWidth: 160 }}
    >
      <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide" style={{ marginBottom: 6 }}>
        {label}
      </p>
      <p className={`text-sm font-semibold ${expired ? "text-red-600" : urgent ? "text-amber-600" : "text-brand-900"}`}>
        {fmt(date)}
      </p>
      {days !== null && days > 0 && days <= 90 && (
        <p className="text-xs text-amber-500" style={{ marginTop: 3 }}>
          {days} days left
        </p>
      )}
      {expired && (
        <p className="text-xs text-red-500" style={{ marginTop: 3 }}>Expired</p>
      )}
    </div>
  );
}

export default function WorkerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("personal");
  const [checklistItems, setChecklistItems] = useState<ChecklistSummaryItem[]>([]);
  const [bgData, setBgData] = useState<BgVerificationData>({ id: null, status: null, references: [] });
  const [bgLoading, setBgLoading] = useState(false);
  const [showAddRef, setShowAddRef] = useState(false);
  const [refForm, setRefForm] = useState({ referee_name: "", referee_email: "", referee_phone: "", referee_company: "", referee_job_title: "", relation_to_employee: "", employment_start: "", employment_end: "" });
  const [bgAction, setBgAction] = useState("");
  const [expandedRef, setExpandedRef] = useState<string | null>(null);

  const fetchBgVerification = useCallback(async (wid: string) => {
    try {
      const data = await api.get<BgVerificationData>(`/bgverify/worker/${wid}`, token ?? undefined);
      setBgData(data);
    } catch { /* ignore */ }
  }, [token]);

  const fetchChecklist = useCallback(async (wid: string) => {
    try {
      const data = await api.get<ChecklistSummaryItem[]>(
        `/workers/${wid}/checklist`,
        token ?? undefined
      );
      setChecklistItems(data);
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await api.get<WorkerDetail>(`/workers/${params.id}`, token ?? undefined);
        setWorker(data);
        fetchChecklist(data.id);
        fetchBgVerification(data.id);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load employee");
      } finally {
        setLoading(false);
      }
    }
    if (params.id) load();
  }, [params.id, token, fetchChecklist, fetchBgVerification]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 80 }}>
        <p className="text-[var(--muted-foreground)]">Loading employee details...</p>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div style={{ padding: 40 }}>
        <button
          type="button"
          onClick={() => router.push("/workers")}
          className="inline-flex items-center text-sm text-brand-600 hover:text-brand-800 transition-colors cursor-pointer"
          style={{ gap: 6, marginBottom: 16 }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Employees
        </button>
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-800" style={{ padding: "12px 16px", fontSize: 13 }}>
          {error || "Employee not found"}
        </div>
      </div>
    );
  }

  const st = STATUS_CONFIG[worker.status] ?? STATUS_CONFIG.active;
  const risk = RISK_CONFIG[worker.risk_level] ?? RISK_CONFIG.low;
  const initials = worker.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div>
      {/* Back */}
      <button
        type="button"
        onClick={() => router.push("/workers")}
        className="inline-flex items-center text-sm text-brand-600 hover:text-brand-800 transition-colors cursor-pointer"
        style={{ gap: 6, marginBottom: 20 }}
      >
        <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Employees
      </button>

      {/* Profile Header Card */}
      <div
        className="bg-white rounded-2xl border border-[var(--border)]"
        style={{ padding: "24px 28px", marginBottom: 24 }}
      >
        <div className="flex items-start justify-between flex-wrap" style={{ gap: 20 }}>
          <div className="flex items-center" style={{ gap: 18 }}>
            <div
              className="flex items-center justify-center rounded-2xl bg-brand-100 text-brand-600 font-bold shrink-0"
              style={{ width: 64, height: 64, fontSize: 20 }}
            >
              {initials}
            </div>
            <div>
              <h1 className="text-xl font-bold text-brand-900 tracking-tight">{worker.name}</h1>
              <p className="text-sm text-[var(--muted-foreground)]" style={{ marginTop: 2 }}>
                {worker.job_title}
              </p>
              <div className="flex items-center flex-wrap" style={{ gap: 8, marginTop: 8 }}>
                <span className={`inline-flex items-center rounded-full font-medium ${st.color} ${st.bg}`} style={{ padding: "3px 10px", gap: 5, fontSize: 12 }}>
                  <st.icon style={{ width: 12, height: 12 }} /> {st.label}
                </span>
                <span className={`inline-flex items-center rounded-full font-medium ${risk.color} ${risk.bg}`} style={{ padding: "3px 10px", fontSize: 12 }}>
                  {risk.label} Risk
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center rounded-xl bg-brand-600 text-sm font-medium text-white hover:bg-brand-700 transition-colors cursor-pointer"
            style={{ height: 38, padding: "0 16px", gap: 7 }}
          >
            <Edit style={{ width: 14, height: 14 }} /> Edit
          </button>
        </div>

        {/* Quick info strip */}
        <div
          className="flex items-center flex-wrap border-t border-[var(--border)]"
          style={{ marginTop: 20, paddingTop: 16, gap: 28 }}
        >
          {worker.phone && (
            <div className="flex items-center text-sm text-brand-800" style={{ gap: 7 }}>
              <Phone className="text-[var(--muted-foreground)]" style={{ width: 14, height: 14 }} />
              {worker.phone}
            </div>
          )}
          {worker.email && (
            <div className="flex items-center text-sm text-brand-800" style={{ gap: 7 }}>
              <Mail className="text-[var(--muted-foreground)]" style={{ width: 14, height: 14 }} />
              {worker.email}
            </div>
          )}
          {worker.visa_expiry && (
            <div className="flex items-center text-sm text-brand-800" style={{ gap: 7 }}>
              <Clock className="text-[var(--muted-foreground)]" style={{ width: 14, height: 14 }} />
              Visa Expiry: {fmt(worker.visa_expiry)}
            </div>
          )}
          {worker.work_location && (
            <div className="flex items-center text-sm text-brand-800" style={{ gap: 7 }}>
              <MapPin className="text-[var(--muted-foreground)]" style={{ width: 14, height: 14 }} />
              {worker.work_location}
            </div>
          )}
        </div>
      </div>

      {/* Key Dates */}
      <div className="flex flex-wrap" style={{ gap: 12, marginBottom: 24 }}>
        <ExpiryBadge date={worker.visa_expiry} label="Visa Expiry" />
        <ExpiryBadge date={worker.passport_expiry} label="Passport Expiry" />
        <ExpiryBadge date={worker.brp_expiry} label="BRP Expiry" />
      </div>

      {/* Document Checklist Summary */}
      {checklistItems.length > 0 && (() => {
        const verified = checklistItems.filter((i) => i.status === "verified" || i.status === "not_applicable").length;
        const uploaded = checklistItems.filter((i) => i.status === "uploaded").length;
        const rejected = checklistItems.filter((i) => i.status === "rejected").length;
        const notStarted = checklistItems.length - verified - uploaded - rejected;
        const pct = Math.round((verified / checklistItems.length) * 100);

        return (
          <div
            className="bg-white rounded-2xl border border-[var(--border)]"
            style={{ padding: "20px 24px", marginBottom: 24 }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
              <div className="flex items-center" style={{ gap: 10 }}>
                <ClipboardList style={{ width: 18, height: 18 }} className="text-brand-600" />
                <h3 className="text-sm font-semibold text-brand-900">Document Compliance Checklist</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("documents")}
                className="text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors cursor-pointer"
              >
                View All →
              </button>
            </div>

            {/* Progress bar */}
            <div className="rounded-full bg-gray-100 overflow-hidden" style={{ height: 8, marginBottom: 14 }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: pct === 100 ? "#10b981" : pct >= 50 ? "#3b82f6" : "#f59e0b",
                }}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5" style={{ gap: 12 }}>
              <div className="text-center">
                <div className="text-lg font-bold text-brand-900">{checklistItems.length}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-600">{verified}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Verified</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{uploaded}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Awaiting Review</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">{rejected}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Rejected</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-500">{notStarted}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Pending Upload</div>
              </div>
            </div>

            {/* Pending items quick list */}
            {notStarted > 0 && (
              <div style={{ marginTop: 16 }}>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide" style={{ marginBottom: 8 }}>
                  <Upload style={{ width: 12, height: 12, display: "inline", marginRight: 4 }} />
                  Documents required ({notStarted})
                </p>
                <div className="flex flex-wrap" style={{ gap: 6 }}>
                  {checklistItems
                    .filter((i) => i.status === "not_started")
                    .slice(0, 8)
                    .map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center rounded-lg bg-amber-50 border border-amber-200 text-amber-800"
                        style={{ padding: "4px 10px", fontSize: 11, gap: 4 }}
                        title={item.description}
                      >
                        <FileCheck style={{ width: 11, height: 11 }} />
                        #{item.item_number}
                      </span>
                    ))}
                  {notStarted > 8 && (
                    <span
                      className="inline-flex items-center rounded-lg bg-gray-100 text-gray-600"
                      style={{ padding: "4px 10px", fontSize: 11 }}
                    >
                      +{notStarted - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {pct === 100 && (
              <div
                className="flex items-center rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700"
                style={{ padding: "10px 14px", marginTop: 16, gap: 8, fontSize: 13 }}
              >
                <CheckCircle2 style={{ width: 16, height: 16 }} />
                <span className="font-medium">All documents verified — compliance complete</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Tabs */}
      <div
        className="flex items-center border-b border-[var(--border)] overflow-x-auto"
        style={{ marginBottom: 0, gap: 0 }}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center shrink-0 text-sm font-medium transition-colors cursor-pointer border-b-2 ${
                active
                  ? "text-brand-700 border-brand-600"
                  : "text-[var(--muted-foreground)] border-transparent hover:text-brand-800 hover:border-brand-200"
              }`}
              style={{ padding: "12px 20px", gap: 7 }}
            >
              <tab.icon style={{ width: 15, height: 15 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div
        className="bg-white rounded-b-2xl rounded-tr-2xl border border-t-0 border-[var(--border)]"
        style={{ padding: "4px 28px 28px" }}
      >
        {activeTab === "personal" && (
          <dl className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "0 40px" }}>
            <InfoRow label="First Name" value={worker.first_name} />
            <InfoRow label="Last Name" value={worker.last_name} />
            <InfoRow label="Email" value={worker.email} />
            <InfoRow label="Phone Number" value={worker.phone} />
            <InfoRow label="Home Address" value={worker.address} />
            <InfoRow label="Postal Code" value={worker.postal_code} />
            <InfoRow label="Date of Birth" value={fmt(worker.date_of_birth)} />
            <InfoRow label="Nationality" value={worker.nationality} />
            <InfoRow label="Place of Birth" value={worker.place_of_birth} />
            <InfoRow label="Country of Birth" value={worker.country_of_birth} />
            <InfoRow label="Gender" value={worker.gender} />
            <InfoRow label="Ethnicity" value={worker.ethnicity} />
            <InfoRow label="Religion" value={worker.religion} />
            <InfoRow label="National Insurance Number" value={worker.ni_number} />
            <InfoRow label="Personal Email" value={worker.personal_email} />
            <InfoRow label="Employee Type" value={worker.employee_type} />
            <InfoRow label="Emergency Contact Name" value={worker.emergency_contact_name} />
            <InfoRow label="Emergency Contact Phone" value={worker.emergency_contact_phone} />
            <InfoRow label="Next of Kin Name" value={worker.next_of_kin_name} />
            <InfoRow label="Next of Kin Phone" value={worker.next_of_kin_phone} />
          </dl>
        )}

        {activeTab === "passport" && (
          <dl className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "0 40px" }}>
            <InfoRow label="Passport Number" value={worker.passport_number} />
            <InfoRow label="Passport Place of Issue" value={worker.passport_place_of_issue} />
            <InfoRow label="Passport Issue Date" value={fmt(worker.passport_issue_date)} />
            <InfoRow label="Passport Expiry Date" value={fmt(worker.passport_expiry)} />
            <InfoRow label="Employee ID" value={worker.employee_id} />
            <InfoRow label="BRP Expiry" value={fmt(worker.brp_expiry)} />
          </dl>
        )}

        {activeTab === "employment" && (
          <dl className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "0 40px" }}>
            <InfoRow label="Job Title" value={worker.job_title} />
            <InfoRow label="Department" value={worker.department} />
            <InfoRow label="SOC Code" value={worker.soc_code} />
            <InfoRow label="Salary" value={`£${worker.salary.toLocaleString("en-GB")}`} />
            <InfoRow label="Work Location" value={worker.work_location} />
            <InfoRow label="Work Arrangement" value={worker.is_remote ? "Remote" : worker.is_hybrid ? "Hybrid" : "On-site"} />
            <InfoRow label="Start Date" value={fmt(worker.start_date)} />
            <InfoRow label="Termination Date" value={fmt(worker.termination_date)} />
            <InfoRow label="Stage" value={STAGE_LABELS[worker.stage] ?? worker.stage} />
          </dl>
        )}

        {activeTab === "sponsorship" && (
          <dl className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "0 40px" }}>
            <InfoRow label="Type of Visa" value={worker.route} />
            <InfoRow label="Sponsorship Number" value={worker.sponsorship_number} />
            <InfoRow label="SOC Code" value={worker.soc_code} />
            <InfoRow label="Job Title" value={worker.job_title} />
            <InfoRow label="BRP Reference" value={worker.brp_reference} />
            <InfoRow label="Visa Grant Date" value={fmt(worker.visa_grant_date)} />
            <InfoRow label="Visa Expiry Date" value={fmt(worker.visa_expiry)} />
            <InfoRow label="DBS Check Date" value={fmt(worker.dbs_check_date)} />
            <InfoRow label="Work Address" value={worker.work_address} />
            <InfoRow label="Work Location" value={worker.work_location} />
            <InfoRow label="Job Application Date" value={fmt(worker.job_application_date)} />
            <InfoRow label="Offer Letter Date" value={fmt(worker.offer_letter_date)} />
            <InfoRow label="Work Start Date" value={fmt(worker.start_date)} />
            <InfoRow label="Work End Date" value={fmt(worker.termination_date)} />
            <InfoRow label="Gross Annual Salary" value={worker.salary ? `£${worker.salary.toLocaleString("en-GB")}` : null} />
            <InfoRow label="Date CoS Assigned" value={fmt(worker.cos_assigned_date)} />
            <InfoRow label="UK Entry Date" value={fmt(worker.entry_clearance_date)} />
            <InfoRow label="RTW Check Date" value={fmt(worker.last_rtw_check)} />
            <InfoRow label="BRP Issue Date" value={fmt(worker.brp_issue_date)} />
            <InfoRow label="BRP Expiry Date" value={fmt(worker.brp_expiry)} />
            <InfoRow label="Bank Account Number" value={worker.bank_account_number} />
            <InfoRow label="Sort Code" value={worker.sort_code} />
          </dl>
        )}

        {activeTab === "compliance" && (
          <dl className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "0 40px" }}>
            <InfoRow
              label="Status"
              value={
                <span className={`inline-flex items-center rounded-full font-medium ${st.color} ${st.bg}`} style={{ padding: "3px 10px", gap: 5, fontSize: 12 }}>
                  <st.icon style={{ width: 12, height: 12 }} /> {st.label}
                </span>
              }
            />
            <InfoRow
              label="Risk Level"
              value={
                <span className={`inline-flex items-center rounded-full font-medium ${risk.color} ${risk.bg}`} style={{ padding: "3px 10px", fontSize: 12 }}>
                  {risk.label}
                </span>
              }
            />
            <InfoRow
              label="DBS Check"
              value={
                worker.dbs_required ? (
                  <span className={`inline-flex items-center text-sm font-medium ${worker.dbs_completed ? "text-emerald-700" : "text-amber-700"}`} style={{ gap: 5 }}>
                    {worker.dbs_completed ? <CheckCircle2 style={{ width: 14, height: 14 }} /> : <CalendarDays style={{ width: 14, height: 14 }} />}
                    {worker.dbs_completed ? "Completed" : "Required — Pending"}
                  </span>
                ) : "Not Required"
              }
            />
            <InfoRow
              label="ATAS Certificate"
              value={
                worker.atas_required ? (
                  <span className={`inline-flex items-center text-sm font-medium ${worker.atas_completed ? "text-emerald-700" : "text-amber-700"}`} style={{ gap: 5 }}>
                    {worker.atas_completed ? <CheckCircle2 style={{ width: 14, height: 14 }} /> : <CalendarDays style={{ width: 14, height: 14 }} />}
                    {worker.atas_completed ? "Completed" : "Required — Pending"}
                  </span>
                ) : "Not Required"
              }
            />
            <InfoRow label="Record Created" value={fmt(worker.created_at)} />
          </dl>
        )}

        {activeTab === "documents" && (
          <DocumentChecklist workerId={worker.id} />
        )}

        {activeTab === "bgverify" && (
          <BgVerifyTab
            worker={worker}
            bgData={bgData}
            bgLoading={bgLoading}
            setBgLoading={setBgLoading}
            setBgData={setBgData}
            bgAction={bgAction}
            setBgAction={setBgAction}
            showAddRef={showAddRef}
            setShowAddRef={setShowAddRef}
            refForm={refForm}
            setRefForm={setRefForm}
            expandedRef={expandedRef}
            setExpandedRef={setExpandedRef}
            token={token}
            fetchBgVerification={fetchBgVerification}
          />
        )}
      </div>
    </div>
  );
}


function BgVerifyTab({
  worker, bgData, bgLoading, setBgLoading, setBgData, bgAction, setBgAction,
  showAddRef, setShowAddRef, refForm, setRefForm, expandedRef, setExpandedRef,
  token, fetchBgVerification,
}: {
  worker: WorkerDetail;
  bgData: BgVerificationData;
  bgLoading: boolean;
  setBgLoading: (v: boolean) => void;
  setBgData: (v: BgVerificationData) => void;
  bgAction: string;
  setBgAction: (v: string) => void;
  showAddRef: boolean;
  setShowAddRef: (v: boolean) => void;
  refForm: Record<string, string>;
  setRefForm: (v: Record<string, string>) => void;
  expandedRef: string | null;
  setExpandedRef: (v: string | null) => void;
  token: string | null;
  fetchBgVerification: (wid: string) => Promise<void>;
}) {
  const initiate = async () => {
    setBgLoading(true);
    try {
      const data = await api.post<BgVerificationData>(`/bgverify/worker/${worker.id}/initiate`, {}, token ?? undefined);
      setBgData(data);
    } catch { /* ignore */ }
    setBgLoading(false);
  };

  const addReference = async (e: React.FormEvent) => {
    e.preventDefault();
    setBgLoading(true);
    try {
      await api.post(`/bgverify/worker/${worker.id}/references`, refForm, token ?? undefined);
      await fetchBgVerification(worker.id);
      setShowAddRef(false);
      setRefForm({ referee_name: "", referee_email: "", referee_phone: "", referee_company: "", referee_job_title: "", relation_to_employee: "", employment_start: "", employment_end: "" });
    } catch { /* ignore */ }
    setBgLoading(false);
  };

  const deleteRef = async (refId: string) => {
    if (!confirm("Delete this reference?")) return;
    setBgAction("deleting");
    try {
      await api.delete(`/bgverify/references/${refId}`, token ?? undefined);
      await fetchBgVerification(worker.id);
    } catch { /* ignore */ }
    setBgAction("");
  };

  const sendEmails = async () => {
    setBgAction("sending");
    try {
      await api.post(`/bgverify/worker/${worker.id}/send-emails`, {}, token ?? undefined);
      await fetchBgVerification(worker.id);
    } catch { /* ignore */ }
    setBgAction("");
  };

  const markComplete = async () => {
    setBgAction("completing");
    try {
      await api.post(`/bgverify/worker/${worker.id}/complete`, {}, token ?? undefined);
      await fetchBgVerification(worker.id);
    } catch { /* ignore */ }
    setBgAction("");
  };

  const markFailed = async () => {
    setBgAction("failing");
    try {
      await api.post(`/bgverify/worker/${worker.id}/fail`, {}, token ?? undefined);
      await fetchBgVerification(worker.id);
    } catch { /* ignore */ }
    setBgAction("");
  };

  if (!bgData.id) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center" }}>
        <UserSearch className="mx-auto text-gray-400" style={{ width: 48, height: 48, marginBottom: 16 }} />
        <h3 className="text-lg font-semibold text-gray-900" style={{ marginBottom: 8 }}>Background Verification</h3>
        <p className="text-sm text-gray-500" style={{ marginBottom: 20, maxWidth: 400, margin: "0 auto 20px" }}>
          No background verification has been initiated for this employee. Click below to start the process.
        </p>
        <button
          type="button" onClick={initiate} disabled={bgLoading}
          className="inline-flex items-center rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
          style={{ height: 40, padding: "0 20px", gap: 8 }}
        >
          {bgLoading ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : <UserSearch style={{ width: 14, height: 14 }} />}
          Initiate Background Verification
        </button>
      </div>
    );
  }

  const bgStatus = BG_STATUS_MAP[bgData.status ?? ""] ?? BG_STATUS_MAP.pending_references;
  const draftRefs = bgData.references.filter(r => r.status === "draft");
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Status header */}
      <div className="flex items-center justify-between flex-wrap" style={{ gap: 12, marginBottom: 20 }}>
        <div className="flex items-center" style={{ gap: 12 }}>
          <h3 className="text-base font-semibold text-gray-900">Background Verification</h3>
          <span className={`inline-flex items-center rounded-full text-xs font-medium ${bgStatus.color} ${bgStatus.bg}`} style={{ padding: "3px 10px" }}>
            {bgStatus.label}
          </span>
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          {draftRefs.length > 0 && (
            <button
              type="button" onClick={sendEmails} disabled={bgAction === "sending"}
              className="inline-flex items-center rounded-xl bg-blue-600 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
              style={{ height: 34, padding: "0 14px", gap: 6 }}
            >
              {bgAction === "sending" ? <Loader2 className="animate-spin" style={{ width: 13, height: 13 }} /> : <Send style={{ width: 13, height: 13 }} />}
              Send Verification Emails ({draftRefs.length})
            </button>
          )}
          {bgData.status !== "completed" && bgData.status !== "failed" && (
            <>
              <button
                type="button" onClick={markComplete} disabled={!!bgAction}
                className="inline-flex items-center rounded-xl bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                style={{ height: 34, padding: "0 14px", gap: 6 }}
              >
                <CheckCircle2 style={{ width: 13, height: 13 }} /> Mark Complete
              </button>
              <button
                type="button" onClick={markFailed} disabled={!!bgAction}
                className="inline-flex items-center rounded-xl bg-red-600 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
                style={{ height: 34, padding: "0 14px", gap: 6 }}
              >
                <XCircle style={{ width: 13, height: 13 }} /> Mark Failed
              </button>
            </>
          )}
        </div>
      </div>

      {/* References list */}
      <div style={{ marginBottom: 16 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <h4 className="text-sm font-semibold text-gray-800">References ({bgData.references.length})</h4>
          {bgData.status !== "completed" && bgData.status !== "failed" && (
            <button
              type="button" onClick={() => setShowAddRef(!showAddRef)}
              className="inline-flex items-center rounded-lg text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
              style={{ gap: 5 }}
            >
              <Plus style={{ width: 14, height: 14 }} /> Add Reference
            </button>
          )}
        </div>

        {/* Add ref form */}
        {showAddRef && (
          <form onSubmit={addReference} className="rounded-xl border border-blue-200 bg-blue-50" style={{ padding: 20, marginBottom: 16 }}>
            <h5 className="text-sm font-semibold text-blue-900" style={{ marginBottom: 14 }}>Add New Referee</h5>
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>
              {[
                { key: "referee_name", label: "Referee Name *", required: true },
                { key: "referee_email", label: "Referee Email *", required: true, type: "email" },
                { key: "referee_phone", label: "Phone" },
                { key: "referee_company", label: "Company *", required: true },
                { key: "referee_job_title", label: "Job Title" },
                { key: "relation_to_employee", label: "Relationship to Employee" },
                { key: "employment_start", label: "Employment Start", type: "date" },
                { key: "employment_end", label: "Employment End", type: "date" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-blue-800" style={{ marginBottom: 4 }}>{f.label}</label>
                  <input
                    type={f.type || "text"}
                    required={f.required}
                    value={refForm[f.key] || ""}
                    onChange={(e) => setRefForm({ ...refForm, [f.key]: e.target.value })}
                    className="w-full rounded-lg border border-blue-300 bg-white text-sm text-gray-900 outline-none focus:border-blue-500"
                    style={{ height: 36, padding: "0 12px" }}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end" style={{ gap: 8, marginTop: 16 }}>
              <button type="button" onClick={() => setShowAddRef(false)} className="rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer" style={{ height: 32, padding: "0 14px" }}>
                Cancel
              </button>
              <button type="submit" disabled={bgLoading} className="inline-flex items-center rounded-lg bg-blue-600 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer" style={{ height: 32, padding: "0 14px", gap: 5 }}>
                {bgLoading && <Loader2 className="animate-spin" style={{ width: 12, height: 12 }} />}
                Add Referee
              </button>
            </div>
          </form>
        )}

        {bgData.references.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50" style={{ padding: "24px 20px", textAlign: "center" }}>
            <p className="text-sm text-gray-500">No references added yet. Add at least one previous employer as a referee.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bgData.references.map((ref) => {
              const refSt = REF_STATUS_MAP[ref.status] ?? REF_STATUS_MAP.draft;
              const isExpanded = expandedRef === ref.id;
              return (
                <div key={ref.id} className="rounded-xl border border-gray-200 bg-white" style={{ overflow: "hidden" }}>
                  <div
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{ padding: "14px 18px" }}
                    onClick={() => setExpandedRef(isExpanded ? null : ref.id)}
                  >
                    <div className="flex items-center" style={{ gap: 12 }}>
                      <div className="flex items-center justify-center rounded-lg bg-gray-100 text-gray-600" style={{ width: 38, height: 38, fontSize: 14, fontWeight: 600 }}>
                        {ref.referee_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{ref.referee_name}</div>
                        <div className="text-xs text-gray-500">{ref.referee_company} · {ref.referee_email}</div>
                      </div>
                    </div>
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <span className={`inline-flex items-center rounded-full text-xs font-medium ${refSt.color} ${refSt.bg}`} style={{ padding: "2px 10px" }}>
                        {refSt.label}
                      </span>
                      {ref.status === "draft" && (
                        <button
                          type="button" onClick={(e) => { e.stopPropagation(); deleteRef(ref.id); }}
                          className="rounded-lg text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                          style={{ padding: 4 }}
                        >
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100" style={{ padding: "16px 18px" }}>
                      <div className="grid grid-cols-2 md:grid-cols-3" style={{ gap: 12, marginBottom: 16 }}>
                        <div><span className="text-xs text-gray-500">Phone</span><br /><span className="text-sm text-gray-900">{ref.referee_phone || "—"}</span></div>
                        <div><span className="text-xs text-gray-500">Job Title</span><br /><span className="text-sm text-gray-900">{ref.referee_job_title || "—"}</span></div>
                        <div><span className="text-xs text-gray-500">Relationship</span><br /><span className="text-sm text-gray-900">{ref.relation_to_employee || "—"}</span></div>
                        <div><span className="text-xs text-gray-500">Employment Start</span><br /><span className="text-sm text-gray-900">{ref.employment_start ? fmt(ref.employment_start) : "—"}</span></div>
                        <div><span className="text-xs text-gray-500">Employment End</span><br /><span className="text-sm text-gray-900">{ref.employment_end ? fmt(ref.employment_end) : "—"}</span></div>
                        {ref.email_sent_at && <div><span className="text-xs text-gray-500">Email Sent</span><br /><span className="text-sm text-gray-900">{fmt(ref.email_sent_at)}</span></div>}
                      </div>

                      {(ref.status === "email_sent" || ref.status === "draft") && (
                        <div className="flex items-center rounded-lg bg-amber-50 border border-amber-200 text-amber-800" style={{ padding: "10px 14px", gap: 8, fontSize: 12 }}>
                          <Clock style={{ width: 14, height: 14 }} />
                          <span>Waiting for referee to respond</span>
                          {ref.token && (
                            <a
                              href={`${appUrl}/verify/${ref.token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto inline-flex items-center text-blue-600 hover:text-blue-800"
                              style={{ gap: 4, fontSize: 11 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink style={{ width: 12, height: 12 }} /> View Link
                            </a>
                          )}
                        </div>
                      )}

                      {ref.status === "completed" && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50" style={{ padding: 16 }}>
                          <h5 className="text-xs font-semibold text-emerald-800 uppercase tracking-wide" style={{ marginBottom: 12 }}>Referee Response</h5>
                          <div className="grid grid-cols-2 md:grid-cols-3" style={{ gap: 10 }}>
                            <div><span className="text-xs text-emerald-600">Confirm Employment</span><br /><span className="text-sm font-medium">{ref.response_confirm_employment ? "✓ Yes" : "✗ No"}</span></div>
                            <div><span className="text-xs text-emerald-600">Confirm Dates</span><br /><span className="text-sm font-medium">{ref.response_confirm_dates ? "✓ Yes" : "✗ No"}</span></div>
                            <div><span className="text-xs text-emerald-600">Confirm Title</span><br /><span className="text-sm font-medium">{ref.response_confirm_title ? "✓ Yes" : "✗ No"}</span></div>
                            <div><span className="text-xs text-emerald-600">Recommend</span><br /><span className="text-sm font-medium">{ref.response_recommend ? "✓ Yes" : "✗ No"}</span></div>
                            <div><span className="text-xs text-emerald-600">Rating</span><br /><span className="text-sm font-medium">{ref.response_rating ?? "—"}/10</span></div>
                            <div><span className="text-xs text-emerald-600">Responded</span><br /><span className="text-sm font-medium">{fmt(ref.responded_at)}</span></div>
                          </div>
                          {ref.response_reason_for_leaving && (
                            <div style={{ marginTop: 10 }}>
                              <span className="text-xs text-emerald-600">Reason for Leaving</span>
                              <p className="text-sm text-gray-800" style={{ marginTop: 2 }}>{ref.response_reason_for_leaving}</p>
                            </div>
                          )}
                          {ref.response_comments && (
                            <div style={{ marginTop: 10 }}>
                              <span className="text-xs text-emerald-600">Comments</span>
                              <p className="text-sm text-gray-800" style={{ marginTop: 2 }}>{ref.response_comments}</p>
                            </div>
                          )}
                          {ref.response_additional_comments && (
                            <div style={{ marginTop: 10 }}>
                              <span className="text-xs text-emerald-600">Additional Comments</span>
                              <p className="text-sm text-gray-800" style={{ marginTop: 2 }}>{ref.response_additional_comments}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {ref.status === "declined" && (
                        <div className="flex items-center rounded-lg bg-red-50 border border-red-200 text-red-700" style={{ padding: "10px 14px", gap: 8, fontSize: 12 }}>
                          <XCircle style={{ width: 14, height: 14 }} />
                          <span>Referee declined to provide a reference</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
