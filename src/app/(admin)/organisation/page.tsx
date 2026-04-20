"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ComponentType,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  Mail,
  ShieldCheck,
  Users,
  UserCheck,
  ListChecks,
  Plus,
  Trash2,
  Loader2,
  MapPin,
  ClipboardList,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { ChecklistTemplateEditor } from "@/components/checklist-template-editor";
import "../dashboard/dashboard-marketing.css";
import "../workers/workers-page.css";

interface Me {
  email: string;
  full_name: string;
  organisation_id: string;
  organisation_name?: string | null;
  organisation_slug?: string | null;
  organisation_licence_number?: string | null;
}

interface Overview {
  total_employees: number;
  active_employees: number;
  sponsored?: number;
  non_sponsored?: number;
  cos_allocated: number;
  cos_used: number;
  cos_available: number;
  visa_breakdown?: {
    expired: number;
    expiring_30: number;
    expiring_60: number;
    expiring_90: number;
    valid: number;
    no_visa: number;
  };
}

const DEFAULT_EMPLOYMENT_STATUSES = ["Active", "Inactive", "Finished"];
const DEFAULT_DEPARTMENTS = ["Operations", "People", "Finance", "Engineering", "Care"];
const DEFAULT_WORK_LOCATIONS = ["London HQ", "Manchester Office", "Remote", "Hybrid — UK"];
const DEFAULT_ONBOARDING_STAGES = ["Recruitment", "CoS assignment", "Pre-start", "Active sponsorship"];
const DEFAULT_RTW_CATEGORIES = [
  "British Citizen",
  "Irish Citizen",
  "ILR / Settled Status",
  "Pre-settled Status",
  "Visa – Sponsored Worker",
  "Visa – Non-Sponsored Worker",
];

interface OrgSettingsResponse {
  employment_status_options: string[];
  department_options: string[];
  work_location_options: string[];
  onboarding_stage_options: string[];
  rtw_category_options: string[];
}

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

/* ─── Collapsible settings section ───────────────────────── */
function SettingsSection({
  id,
  title,
  description,
  icon: Icon,
  count,
  options,
  setOptions,
  canEdit,
  saving,
  setSaving,
  msg,
  setMsg,
  onReload,
  resetDefaults,
  patchKey,
  token,
  saveLabel,
  addLabel,
}: {
  id?: string;
  title: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  count?: number;
  options: string[];
  setOptions: Dispatch<SetStateAction<string[]>>;
  canEdit: boolean;
  saving: boolean;
  setSaving: Dispatch<SetStateAction<boolean>>;
  msg: string;
  setMsg: Dispatch<SetStateAction<string>>;
  onReload: () => Promise<void>;
  resetDefaults: string[];
  patchKey:
    | "employment_status_options"
    | "department_options"
    | "work_location_options"
    | "onboarding_stage_options"
    | "rtw_category_options";
  token: string | null;
  saveLabel?: string;
  addLabel?: string;
}) {
  const [open, setOpen] = useState(true);
  const saved = msg === "Saved.";

  const handleSave = async () => {
    if (!token) return;
    const cleaned = options.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length === 0) { setMsg("Add at least one entry."); return; }
    setMsg("");
    setSaving(true);
    try {
      await api.patch("/organisation/settings", { [patchKey]: cleaned }, token);
      setMsg("Saved.");
      await onReload();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id={id} className="min-w-0 scroll-mt-24 border border-[rgba(0,0,0,0.08)] bg-white">
      {/* header row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between border-b border-[rgba(0,0,0,0.07)] bg-white px-4 py-3 text-left transition-colors hover:bg-[#f8fafc]"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-[rgba(26,79,160,0.07)] text-[#1a4fa0]">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="truncate text-[12px] font-bold text-[#0f2d5e]">{title}</span>
          {count !== undefined && (
            <span
              className="inline-flex items-center border border-[rgba(0,0,0,0.1)] bg-[#f0f0eb] px-1.5 py-0.5 text-[9px] font-bold text-[#64748b]"
              style={MONO}
            >
              {count}
            </span>
          )}
          {saved && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-[#16a34a]" style={MONO}>
              <CheckCircle2 className="h-3 w-3" /> Saved
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-[#94a3b8]" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#94a3b8]" />
        )}
      </button>

      {open && (
        <div className="p-4">
          {description?.trim() ? (
            <p className="mb-3 text-[11px] leading-relaxed text-[#64748b]" style={MONO}>
              {description}
            </p>
          ) : null}

          <div className="flex flex-col gap-1.5">
            {options.map((label, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span
                  className="w-5 shrink-0 text-right text-[9px] font-bold text-[#94a3b8]"
                  style={MONO}
                >
                  {idx + 1}
                </span>
                <input
                  className="h-8 flex-1 border border-[rgba(0,0,0,0.1)] bg-[#f8fafc] px-3 text-[12px] font-medium text-[#0a0a0a] outline-none transition-colors focus:border-[rgba(26,79,160,0.4)] focus:bg-white disabled:opacity-50"
                  value={label}
                  disabled={!canEdit}
                  onChange={(e) => {
                    const v = e.target.value;
                    setOptions((prev) => prev.map((x, i) => (i === idx ? v : x)));
                    if (msg) setMsg("");
                  }}
                  placeholder="Label"
                  maxLength={100}
                />
                {canEdit && (
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center border border-[rgba(220,38,38,0.2)] text-[#dc2626] transition-colors hover:bg-[#fef2f2]"
                    title="Remove"
                    onClick={() => setOptions((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {canEdit && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 border border-dashed border-[rgba(0,0,0,0.15)] bg-transparent px-3 text-[9px] font-bold uppercase tracking-[0.07em] text-[#1a4fa0] transition-colors hover:bg-[rgba(26,79,160,0.05)]"
                style={MONO}
                onClick={() => setOptions((prev) => [...prev, ""])}
              >
                <Plus className="h-3 w-3" />
                {addLabel ?? "Add entry"}
              </button>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  className="h-8 border border-[rgba(0,0,0,0.1)] bg-white px-3 text-[9px] font-bold uppercase tracking-[0.07em] text-[#64748b] transition-colors hover:bg-[#f5f5f0]"
                  style={MONO}
                  onClick={() => { setOptions([...resetDefaults]); setMsg(""); }}
                >
                  Reset
                </button>
                <button
                  type="button"
                  disabled={saving}
                  className="inline-flex h-8 items-center gap-1.5 border border-[rgba(26,79,160,0.3)] bg-[#0f2d5e] px-4 text-[9px] font-bold uppercase tracking-[0.07em] text-white transition-colors hover:bg-[#1a4fa0] disabled:opacity-50"
                  style={MONO}
                  onClick={handleSave}
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {saveLabel ?? "Save"}
                </button>
                {msg && !saved && (
                  <span className="text-[10px] text-[#dc2626]" style={MONO}>
                    {msg}
                  </span>
                )}
              </div>
            </div>
          )}

          {!canEdit && (
            <p className="mt-3 text-[10px] text-[#94a3b8]" style={MONO}>
              HR or admin role required to edit.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────── */
export default function OrganisationPage() {
  const { token, user } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [ov, setOv] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [employmentStatusOptions, setEmploymentStatusOptions] = useState<string[]>(DEFAULT_EMPLOYMENT_STATUSES);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>(DEFAULT_DEPARTMENTS);
  const [workLocationOptions, setWorkLocationOptions] = useState<string[]>(DEFAULT_WORK_LOCATIONS);
  const [onboardingStageOptions, setOnboardingStageOptions] = useState<string[]>(DEFAULT_ONBOARDING_STAGES);
  const [rtwCategoryOptions, setRtwCategoryOptions] = useState<string[]>(DEFAULT_RTW_CATEGORIES);

  const [statusSaving, setStatusSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptMsg, setDeptMsg] = useState("");
  const [locSaving, setLocSaving] = useState(false);
  const [locMsg, setLocMsg] = useState("");
  const [stageSaving, setStageSaving] = useState(false);
  const [stageMsg, setStageMsg] = useState("");
  const [rtwSaving, setRtwSaving] = useState(false);
  const [rtwMsg, setRtwMsg] = useState("");

  const loadOrgSettings = useCallback(async () => {
    if (!token) return;
    try {
      const s = await api.get<OrgSettingsResponse>("/organisation/settings", token);
      if (s.employment_status_options?.length) setEmploymentStatusOptions(s.employment_status_options);
      if (s.department_options?.length) setDepartmentOptions(s.department_options);
      if (s.work_location_options?.length) setWorkLocationOptions(s.work_location_options);
      if (s.onboarding_stage_options?.length) setOnboardingStageOptions(s.onboarding_stage_options);
      if (s.rtw_category_options?.length) setRtwCategoryOptions(s.rtw_category_options);
    } catch { /* keep defaults */ }
  }, [token]);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const [m, o] = await Promise.all([
          api.get<Me>("/auth/me", token),
          api.get<Overview>("/dashboard/overview", token),
        ]);
        setMe(m);
        setOv(o);
        await loadOrgSettings();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load organisation");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, loadOrgSettings]);

  const todayStr = useMemo(
    () => new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    []
  );

  if (loading) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>Loading organisation…</p>
      </div>
    );
  }

  if (error || !me || !ov) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#dc2626]" style={MONO}>{error || "Organisation unavailable"}</p>
      </div>
    );
  }

  const activeRate = ov.total_employees > 0 ? Math.round((ov.active_employees / ov.total_employees) * 100) : 0;
  const cosUtilisation = ov.cos_allocated > 0 ? Math.round((ov.cos_used / ov.cos_allocated) * 100) : 0;
  const sponsored = ov.sponsored ?? 0;
  const nonSponsored = ov.non_sponsored ?? Math.max(ov.total_employees - sponsored, 0);
  const expiring90 = ov.visa_breakdown
    ? ov.visa_breakdown.expired + ov.visa_breakdown.expiring_30 + ov.visa_breakdown.expiring_60 + ov.visa_breakdown.expiring_90
    : 0;
  const orgCode = (me.organisation_slug || me.organisation_id.slice(0, 8)).toUpperCase();
  const orgDisplay = me.organisation_name || `Protexi Tenant ${orgCode}`;
  const orgRef = me.organisation_slug || me.organisation_licence_number || orgCode;

  const canViewCos = user?.role !== "hr_officer";
  const canViewAdminOnlyOrgConfig = user?.role !== "hr_officer";
  /** Tenant admin and compliance / platform roles can edit the checklist template. */
  const canEditChecklistTemplate =
    user?.role === "tenant_admin" ||
    user?.role === "compliance_manager" ||
    user?.role === "super_admin" ||
    user?.role === "platform_owner";
  const canEdit =
    user?.role === "tenant_admin" || user?.role === "compliance_manager" ||
    user?.role === "super_admin" || user?.role === "hr_officer";

  return (
    <div className="protexi-dash-marketing flex flex-col gap-4">

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#1a4fa0]" style={MONO}>
            Tenant
          </p>
          <h1 className="mt-0.5 text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-[#0a0a0a]">
            Organisation
          </h1>
          <p className="mt-0.5 text-[11px] text-[#94a3b8]" style={MONO}>{todayStr}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 border border-[rgba(22,163,74,0.3)] bg-[#f0fdf4] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#166534]"
            style={MONO}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            Active tenant
          </span>
          <span className="border border-[rgba(0,0,0,0.1)] bg-[#f0f0eb] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#0f2d5e]" style={MONO}>
            {orgRef}
          </span>
        </div>
      </div>

      {/* ── Organisation profile (previous wem-surface layout) ─ */}
      <div className="wem-surface">
        <div className="wem-toolbar">
          <span className="flex min-w-0 items-center gap-2 text-[11px] font-extrabold tracking-tight text-[#0a0a0a]">
            <Building2 className="h-4 w-4 shrink-0 text-[var(--dash-blue)]" />
            <span className="truncate">Organisation profile</span>
          </span>
          <span className="wem-badge-mono truncate" style={MONO}>
            {orgRef}
          </span>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            <Info icon={Building2} label="Name" value={orgDisplay} />
            <Info icon={Building2} label="Organisation ref" value={orgRef} />
            <Info icon={Mail} label="Admin email" value={me.email} />
          </div>
        </div>
      </div>

      {/* ── KPI strip (adm-stat-row, same as before) ───────────── */}
      <div
        className="adm-stat-row grid grid-cols-2 md:grid-cols-4"
        style={{ gap: 2, background: "rgba(0,0,0,0.07)", marginBottom: 16 }}
      >
        <div className="adm-sc adm-sc-b bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b">
              <Users className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Headcount</span>
          </div>
          <div className="adm-sc-num">{ov.total_employees}</div>
          <div className="adm-sc-lbl">Total employees</div>
          <div className="adm-sc-sub">On record</div>
        </div>
        <div className="adm-sc adm-sc-p bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-p">
              <UserCheck className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">{activeRate}%</span>
          </div>
          <div className="adm-sc-num">{ov.active_employees}</div>
          <div className="adm-sc-lbl">Active employees</div>
          <div className="adm-sc-sub">{activeRate}% active rate</div>
        </div>
        <div className="adm-sc adm-sc-a bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-a">
              <BriefcaseBusiness className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">CoS</span>
          </div>
          <div className="adm-sc-num">{sponsored}</div>
          <div className="adm-sc-lbl">Sponsored</div>
          <div className="adm-sc-sub">{nonSponsored} non-sponsored</div>
        </div>
        <div className="adm-sc adm-sc-r bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-r">
              {canViewCos ? <BriefcaseBusiness className="h-[17px] w-[17px]" /> : <AlertTriangle className="h-[17px] w-[17px]" />}
            </div>
            <span className="adm-sc-pill adm-pill-n">{canViewCos ? "Pool" : "Risk"}</span>
          </div>
          <div className="adm-sc-num">{canViewCos ? ov.cos_available : expiring90}</div>
          <div className="adm-sc-lbl">{canViewCos ? "CoS available" : "Visa · 90 days"}</div>
          <div className="adm-sc-sub">
            {canViewCos ? `${ov.cos_used}/${ov.cos_allocated} used` : "Attention window"}
          </div>
        </div>
      </div>

      {/* ── Workforce + CoS panels ────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Workforce" badge={`${ov.total_employees} people`} icon={Users}>
          <FlatRow label="Total employees" value={String(ov.total_employees)} />
          <FlatRow label="Active employees" value={String(ov.active_employees)} />
          <FlatRow label="Sponsored workers" value={String(sponsored)} />
          <FlatRow label="Non-sponsored workers" value={String(nonSponsored)} />
          <FlatBarRow label="Active rate" value={activeRate} color="#1a4fa0" />
        </Panel>

        {canViewCos ? (
          <Panel title="CoS capacity" badge={`${cosUtilisation}% used`} icon={BriefcaseBusiness}>
            <FlatRow label="CoS allocated" value={String(ov.cos_allocated)} />
            <FlatRow label="CoS used" value={String(ov.cos_used)} />
            <FlatRow label="CoS available" value={String(ov.cos_available)} />
            <FlatBarRow label="CoS utilisation" value={cosUtilisation} color={cosUtilisation > 80 ? "#dc2626" : "#1a4fa0"} />
            <FlatRow label="Visa risk · next 90 days" value={String(expiring90)} accent={expiring90 > 0 ? "#dc2626" : undefined} />
          </Panel>
        ) : (
          <Panel title="Compliance" badge="HR view" icon={AlertTriangle}>
            <FlatRow label="Visa risk · next 90 days" value={String(expiring90)} accent={expiring90 > 0 ? "#dc2626" : undefined} />
            <p className="mt-3 px-4 pb-3 text-[10px] leading-relaxed text-[#94a3b8]" style={MONO}>
              CoS capacity is hidden for HR officers.
            </p>
          </Panel>
        )}
      </div>

      {canViewAdminOnlyOrgConfig && (
        <>
      {/* ── Checklist template ────────────────────────────────── */}
      {token && me.organisation_id && (
        <div className="border border-[rgba(0,0,0,0.08)]">
          <ChecklistTemplateEditor token={token} organisationId={me.organisation_id} canEdit={!!canEditChecklistTemplate} />
        </div>
      )}

      {/* ── Dropdown settings ─────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#0f2d5e]" style={MONO}>
          Company dropdown lists
        </p>
        <span className="flex-1 border-t border-[rgba(0,0,0,0.08)]" />
        <span className="text-[10px] text-[#94a3b8]" style={MONO}>
          Apply to all employees
        </span>
      </div>

      <SettingsSection
        id="employment-statuses"
        title="Employment statuses"
        description={`Powers the employment status field on every employee and in the directory. Add custom values like "On leave" or "Probation".`}
        icon={ListChecks}
        count={employmentStatusOptions.length}
        options={employmentStatusOptions}
        setOptions={setEmploymentStatusOptions}
        canEdit={canEdit}
        saving={statusSaving}
        setSaving={setStatusSaving}
        msg={statusMsg}
        setMsg={setStatusMsg}
        onReload={loadOrgSettings}
        resetDefaults={DEFAULT_EMPLOYMENT_STATUSES}
        patchKey="employment_status_options"
        token={token}
        saveLabel="Save statuses"
        addLabel="Add status"
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <SettingsSection
          title="Departments"
          icon={Building2}
          count={departmentOptions.length}
          options={departmentOptions}
          setOptions={setDepartmentOptions}
          canEdit={canEdit}
          saving={deptSaving}
          setSaving={setDeptSaving}
          msg={deptMsg}
          setMsg={setDeptMsg}
          onReload={loadOrgSettings}
          resetDefaults={DEFAULT_DEPARTMENTS}
          patchKey="department_options"
          token={token}
        />
        <SettingsSection
          title="Work locations"
          icon={MapPin}
          count={workLocationOptions.length}
          options={workLocationOptions}
          setOptions={setWorkLocationOptions}
          canEdit={canEdit}
          saving={locSaving}
          setSaving={setLocSaving}
          msg={locMsg}
          setMsg={setLocMsg}
          onReload={loadOrgSettings}
          resetDefaults={DEFAULT_WORK_LOCATIONS}
          patchKey="work_location_options"
          token={token}
        />
        <SettingsSection
          title="Onboarding stages"
          icon={ClipboardList}
          count={onboardingStageOptions.length}
          options={onboardingStageOptions}
          setOptions={setOnboardingStageOptions}
          canEdit={canEdit}
          saving={stageSaving}
          setSaving={setStageSaving}
          msg={stageMsg}
          setMsg={setStageMsg}
          onReload={loadOrgSettings}
          resetDefaults={DEFAULT_ONBOARDING_STAGES}
          patchKey="onboarding_stage_options"
          token={token}
        />
      </div>

      <SettingsSection
        title="Right to work categories"
        description="Canonical list for the Right to work category field on every employee — align with your HR / compliance policy."
        icon={ShieldCheck}
        count={rtwCategoryOptions.length}
        options={rtwCategoryOptions}
        setOptions={setRtwCategoryOptions}
        canEdit={canEdit}
        saving={rtwSaving}
        setSaving={setRtwSaving}
        msg={rtwMsg}
        setMsg={setRtwMsg}
        onReload={loadOrgSettings}
        resetDefaults={DEFAULT_RTW_CATEGORIES}
        patchKey="rtw_category_options"
        token={token}
      />

      {/* ── Admin context bar ─────────────────────────────────── */}
      <div className="border border-[rgba(0,0,0,0.08)] bg-white">
        <div className="border-b border-[rgba(0,0,0,0.07)] bg-[#f8fafc] px-4 py-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]" style={MONO}>
            Admin account
          </p>
        </div>
        <div className="flex flex-wrap gap-0 divide-x divide-[rgba(0,0,0,0.07)]">
          <CtxCell label="Admin name" value={me.full_name} />
          <CtxCell label="Email" value={me.email} />
          <CtxCell label="Organisation ref" value={orgRef} />
          {canViewCos ? (
            <CtxCell label="Current CoS used" value={String(ov.cos_used)} />
          ) : (
            <CtxCell label="Visa risk · 90 days" value={String(expiring90)} />
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────── */

function Info({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="border border-[rgba(0,0,0,0.08)] bg-[#f8fafc] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-[#94a3b8]" />
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#64748b]" style={MONO}>
          {label}
        </p>
      </div>
      <p className="mt-1 break-words text-[13px] font-semibold text-[#0a0a0a]">{value}</p>
    </div>
  );
}

function Panel({
  title, badge, icon: Icon, children,
}: {
  title: string; badge?: string;
  icon: ComponentType<{ className?: string }>; children: ReactNode;
}) {
  return (
    <div className="border border-[rgba(0,0,0,0.08)] bg-white">
      <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.07)] bg-[#f8fafc] px-4 py-2.5">
        <span className="flex items-center gap-2 text-[11px] font-bold text-[#0f2d5e]">
          <Icon className="h-3.5 w-3.5 text-[#1a4fa0]" />
          {title}
        </span>
        {badge && (
          <span className="border border-[rgba(0,0,0,0.1)] bg-[#f0f0eb] px-2 py-0.5 text-[9px] font-bold text-[#64748b]" style={MONO}>
            {badge}
          </span>
        )}
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

function FlatRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.05)] py-2.5 last:border-b-0">
      <p className="text-[11px] text-[#64748b]" style={MONO}>{label}</p>
      <p className="text-[13px] font-bold tabular-nums text-[#0a0a0a]" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
    </div>
  );
}

function FlatBarRow({ label, value, color }: { label: string; value: number; color: string }) {
  const w = Math.max(0, Math.min(100, value));
  return (
    <div className="border-b border-[rgba(0,0,0,0.05)] py-2.5 last:border-b-0">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[11px] text-[#64748b]" style={MONO}>{label}</p>
        <p className="text-[13px] font-bold tabular-nums" style={{ color }}>{value}%</p>
      </div>
      <div className="h-1 bg-[rgba(0,0,0,0.06)]">
        <div className="h-full transition-[width] duration-500" style={{ width: `${w}%`, background: color }} />
      </div>
    </div>
  );
}

function CtxCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[8rem] flex-1 px-4 py-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#94a3b8]" style={MONO}>{label}</p>
      <p className="mt-0.5 truncate text-[12px] font-semibold text-[#0a0a0a]">{value}</p>
    </div>
  );
}
