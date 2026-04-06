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

function OrganisationOptionListSection({
  title,
  description,
  icon: Icon,
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
}: {
  title: string;
  description: ReactNode;
  icon: ComponentType<{ className?: string }>;
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
    | "department_options"
    | "work_location_options"
    | "onboarding_stage_options"
    | "rtw_category_options";
  token: string | null;
}) {
  return (
    <div className="wem-surface h-full">
      <div className="wem-toolbar">
        <span className="flex min-w-0 items-center gap-2 text-[11px] font-extrabold tracking-tight text-[#0a0a0a]">
          <Icon className="h-4 w-4 shrink-0 text-[var(--dash-blue)]" />
          <span className="truncate">{title}</span>
        </span>
      </div>
      <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
        <p className="text-[12px] leading-relaxed text-[#64748b]" style={{ marginBottom: 12 }}>
          {description}
        </p>
        <div className="grid gap-2">
          {options.map((label, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                className="h-9 flex-1 border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[13px] text-[#0a0a0a] outline-none focus:border-[var(--dash-blue)] disabled:opacity-60"
                value={label}
                disabled={!canEdit}
                onChange={(e) => {
                  const v = e.target.value;
                  setOptions((prev) => prev.map((x, i) => (i === idx ? v : x)));
                }}
                placeholder="Label"
                maxLength={100}
              />
              {canEdit && (
                <button
                  type="button"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-[rgba(220,38,38,0.25)] text-[#991b1b] hover:bg-[rgba(254,242,242,0.85)]"
                  title="Remove"
                  onClick={() => setOptions((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {canEdit && (
            <button
              type="button"
              className="inline-flex items-center gap-2 border border-dashed border-[rgba(0,0,0,0.15)] bg-[var(--dash-card)] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[rgba(26,79,160,0.08)]"
              style={MONO}
              onClick={() => setOptions((prev) => [...prev, ""])}
            >
              <Plus className="h-3.5 w-3.5" />
              Add entry
            </button>
          )}
        </div>
        {canEdit && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="h-8 border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[9px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[#f8fafc]"
              style={MONO}
              onClick={() => setOptions([...resetDefaults])}
            >
              Reset defaults
            </button>
            <button
              type="button"
              disabled={saving}
              className="inline-flex h-8 items-center gap-2 border border-[rgba(0,0,0,0.12)] bg-[#0f2d5e] px-4 text-[9px] font-bold uppercase tracking-[0.07em] text-white hover:bg-[#1a4fa0] disabled:opacity-50"
              style={MONO}
              onClick={async () => {
                if (!token) return;
                const cleaned = options.map((s) => s.trim()).filter(Boolean);
                if (cleaned.length === 0) {
                  setMsg("Add at least one label.");
                  return;
                }
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
              }}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save
            </button>
            {msg ? (
              <span className="text-[11px] text-[#64748b]" style={MONO}>
                {msg}
              </span>
            ) : null}
          </div>
        )}
        {!canEdit && (
          <p className="mt-3 text-[11px] text-[#94a3b8]" style={MONO}>
            Only organisation admins can edit this list.
          </p>
        )}
      </div>
    </div>
  );
}

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
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptMsg, setDeptMsg] = useState("");
  const [locSaving, setLocSaving] = useState(false);
  const [locMsg, setLocMsg] = useState("");
  const [stageSaving, setStageSaving] = useState(false);
  const [stageMsg, setStageMsg] = useState("");
  const [rtwCategoryOptions, setRtwCategoryOptions] = useState<string[]>(DEFAULT_RTW_CATEGORIES);
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
    } catch {
      /* keep defaults */
    }
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
    () =>
      new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    []
  );

  if (loading) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Loading organisation…
        </p>
      </div>
    );
  }

  if (error || !me || !ov) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#dc2626]" style={MONO}>
          {error || "Organisation unavailable"}
        </p>
      </div>
    );
  }

  const activeRate = ov.total_employees > 0 ? Math.round((ov.active_employees / ov.total_employees) * 100) : 0;
  const cosUtilisation = ov.cos_allocated > 0 ? Math.round((ov.cos_used / ov.cos_allocated) * 100) : 0;
  const sponsored = ov.sponsored ?? 0;
  const nonSponsored = ov.non_sponsored ?? Math.max(ov.total_employees - sponsored, 0);
  const expiring90 = ov.visa_breakdown
    ? ov.visa_breakdown.expired +
      ov.visa_breakdown.expiring_30 +
      ov.visa_breakdown.expiring_60 +
      ov.visa_breakdown.expiring_90
    : 0;
  const orgCode = (me.organisation_slug || me.organisation_id.slice(0, 8)).toUpperCase();
  const orgDisplay = me.organisation_name || `Protexi Tenant ${orgCode}`;
  const orgRef = me.organisation_slug || me.organisation_licence_number || orgCode;
  const canViewCos = user?.role !== "hr_officer";
  const canEditChecklistTemplate =
    user?.role === "tenant_admin" ||
    user?.role === "compliance_manager" ||
    user?.role === "super_admin" ||
    user?.role === "platform_owner";

  const canEditEmploymentStatuses =
    user?.role === "tenant_admin" ||
    user?.role === "compliance_manager" ||
    user?.role === "super_admin";

  return (
    <div className="protexi-dash-marketing flex flex-col gap-0">
      <div className="adm-ph">
        <div className="min-w-0">
          <div className="adm-ph-ey">Tenant</div>
          <h1 className="adm-ph-title">
            Organisation <em className="dash-title-em">profile</em>
          </h1>
          <div className="adm-ph-date">{todayStr}</div>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#64748b]">
            Health, sponsorship capacity, and the dropdown lists your HR team uses across employee records.
          </p>
        </div>
        <div className="adm-ph-badge inline-flex items-center gap-2 border border-[rgba(22,163,74,0.3)] bg-[#f0fdf4] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#166534]" style={MONO}>
          <ShieldCheck className="h-3.5 w-3.5" />
          Active tenant
        </div>
      </div>

      <div className="adm-stat-row grid grid-cols-2 md:grid-cols-4" style={{ gap: 2, background: "rgba(0,0,0,0.07)", marginBottom: 16 }}>
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
          <div className="adm-sc-lbl">Active</div>
          <div className="adm-sc-sub">Currently active status</div>
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
          <div className="adm-sc-sub">{canViewCos ? `${ov.cos_used} / ${ov.cos_allocated} used` : "Attention window"}</div>
        </div>
      </div>

      <div className="wem-surface">
        <div className="wem-toolbar">
          <span className="flex items-center gap-2 text-[11px] font-extrabold text-[#0a0a0a]">
            <Building2 className="h-4 w-4 text-[var(--dash-blue)]" />
            Organisation profile
          </span>
          <span className="wem-badge-mono truncate" style={MONO}>
            {orgRef}
          </span>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
          <h2 className="text-lg font-extrabold tracking-tight text-[#0a0a0a]">{orgDisplay}</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <Info icon={Building2} label="Organisation ref" value={orgRef} />
            <Info icon={Mail} label="Admin email" value={me.email} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="wem-surface">
          <div className="wem-toolbar">
            <span className="text-[11px] font-extrabold text-[#0a0a0a]">Workforce & sponsorship</span>
            <span className="wem-badge-mono" style={MONO}>
              {ov.total_employees} people
            </span>
          </div>
          <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
            <div className="grid gap-0">
              <StatRow icon={Users} label="Total employees" value={String(ov.total_employees)} />
              <StatRow icon={Users} label="Active employees" value={String(ov.active_employees)} />
              <StatRow icon={Users} label="Sponsored workers" value={String(sponsored)} />
              <StatRow icon={Users} label="Non-sponsored workers" value={String(nonSponsored)} />
              <ProgressRow label="Active rate" value={activeRate} />
            </div>
          </div>
        </div>

        {canViewCos ? (
          <div className="wem-surface">
            <div className="wem-toolbar">
              <span className="text-[11px] font-extrabold text-[#0a0a0a]">CoS capacity & compliance</span>
              <span className="wem-badge-mono" style={MONO}>
                {cosUtilisation}% used
              </span>
            </div>
            <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
              <div className="grid gap-0">
                <StatRow icon={BriefcaseBusiness} label="CoS allocated" value={String(ov.cos_allocated)} />
                <StatRow icon={BriefcaseBusiness} label="CoS used" value={String(ov.cos_used)} />
                <StatRow icon={BriefcaseBusiness} label="CoS available" value={String(ov.cos_available)} />
                <ProgressRow label="CoS utilisation" value={cosUtilisation} />
                <StatRow icon={AlertTriangle} label="Visa risk (next 90 days)" value={String(expiring90)} />
              </div>
            </div>
          </div>
        ) : (
          <div className="wem-surface">
            <div className="wem-toolbar">
              <span className="text-[11px] font-extrabold text-[#0a0a0a]">Compliance overview</span>
            </div>
            <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
              <StatRow icon={AlertTriangle} label="Visa risk (next 90 days)" value={String(expiring90)} />
              <p className="mt-3 text-[11px] leading-relaxed text-[#64748b]" style={MONO}>
                CoS capacity details are hidden for the HR officer role.
              </p>
            </div>
          </div>
        )}
      </div>

      {token && me.organisation_id && (
        <div className="mt-4">
          <ChecklistTemplateEditor token={token} organisationId={me.organisation_id} canEdit={!!canEditChecklistTemplate} />
        </div>
      )}

      <div className="mt-4 wem-surface">
        <div className="wem-toolbar">
          <span className="flex items-center gap-2 text-[11px] font-extrabold text-[#0a0a0a]">
            <ListChecks className="h-4 w-4 text-[var(--dash-blue)]" />
            Employment statuses
          </span>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
          <p className="text-[12px] leading-relaxed text-[#64748b]" style={{ marginBottom: 12 }}>
            These labels appear in the <strong className="text-[#475569]">Employment status</strong> dropdown for every
            employee. Defaults are Active, Inactive, and Finished — add your own (e.g. &quot;On leave&quot;,
            &quot;Probation&quot;) so HR uses the same set across the organisation.
          </p>
          <div className="grid gap-2">
            {employmentStatusOptions.map((label, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  className="h-9 flex-1 border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[13px] text-[#0a0a0a] outline-none focus:border-[var(--dash-blue)] disabled:opacity-60"
                  value={label}
                  disabled={!canEditEmploymentStatuses}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEmploymentStatusOptions((prev) => prev.map((x, i) => (i === idx ? v : x)));
                  }}
                  placeholder="Status label"
                  maxLength={100}
                />
                {canEditEmploymentStatuses && (
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-[rgba(220,38,38,0.25)] text-[#991b1b] hover:bg-[rgba(254,242,242,0.85)]"
                    title="Remove"
                    onClick={() => setEmploymentStatusOptions((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {canEditEmploymentStatuses && (
              <button
                type="button"
                className="inline-flex items-center gap-2 border border-dashed border-[rgba(0,0,0,0.15)] bg-[var(--dash-card)] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[rgba(26,79,160,0.08)]"
                style={MONO}
                onClick={() => setEmploymentStatusOptions((prev) => [...prev, ""])}
              >
                <Plus className="h-3.5 w-3.5" />
                Add status
              </button>
            )}
          </div>
          {canEditEmploymentStatuses && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="h-8 border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[9px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[#f8fafc]"
                style={MONO}
                onClick={() => setEmploymentStatusOptions([...DEFAULT_EMPLOYMENT_STATUSES])}
              >
                Reset defaults
              </button>
              <button
                type="button"
                disabled={statusSaving}
                className="inline-flex h-8 items-center gap-2 border border-[rgba(0,0,0,0.12)] bg-[#0f2d5e] px-4 text-[9px] font-bold uppercase tracking-[0.07em] text-white hover:bg-[#1a4fa0] disabled:opacity-50"
                style={MONO}
                onClick={async () => {
                  if (!token) return;
                  const cleaned = employmentStatusOptions.map((s) => s.trim()).filter(Boolean);
                  if (cleaned.length === 0) {
                    setStatusMsg("Add at least one status label.");
                    return;
                  }
                  setStatusMsg("");
                  setStatusSaving(true);
                  try {
                    await api.patch("/organisation/settings", { employment_status_options: cleaned }, token);
                    setStatusMsg("Saved.");
                    await loadOrgSettings();
                  } catch (e: unknown) {
                    setStatusMsg(e instanceof Error ? e.message : "Save failed");
                  } finally {
                    setStatusSaving(false);
                  }
                }}
              >
                {statusSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Save statuses
              </button>
              {statusMsg ? (
                <span className="text-[11px] text-[#64748b]" style={MONO}>
                  {statusMsg}
                </span>
              ) : null}
            </div>
          )}
          {!canEditEmploymentStatuses && (
            <p className="mt-3 text-[11px] text-[#94a3b8]" style={MONO}>
              Only organisation admins can edit this list.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <OrganisationOptionListSection
          title="Departments"
          description={
            <>
              Labels for the <strong className="text-[#475569]">Department</strong> dropdown on each employee. Adjust them
              here so HR picks from a consistent list.
            </>
          }
          icon={Building2}
          options={departmentOptions}
          setOptions={setDepartmentOptions}
          canEdit={canEditEmploymentStatuses}
          saving={deptSaving}
          setSaving={setDeptSaving}
          msg={deptMsg}
          setMsg={setDeptMsg}
          onReload={loadOrgSettings}
          resetDefaults={DEFAULT_DEPARTMENTS}
          patchKey="department_options"
          token={token}
        />
        <OrganisationOptionListSection
          title="Work locations"
          description={
            <>
              Options for <strong className="text-[#475569]">Work location</strong> on employee records (sites, hubs, or
              &quot;Remote&quot;).
            </>
          }
          icon={MapPin}
          options={workLocationOptions}
          setOptions={setWorkLocationOptions}
          canEdit={canEditEmploymentStatuses}
          saving={locSaving}
          setSaving={setLocSaving}
          msg={locMsg}
          setMsg={setLocMsg}
          onReload={loadOrgSettings}
          resetDefaults={DEFAULT_WORK_LOCATIONS}
          patchKey="work_location_options"
          token={token}
        />
        <OrganisationOptionListSection
          title="Onboarding stages"
          description={
            <>
              HR-facing <strong className="text-[#475569]">Onboarding stage</strong> labels (separate from the internal
              workflow stage). Align these with your recruitment process.
            </>
          }
          icon={ClipboardList}
          options={onboardingStageOptions}
          setOptions={setOnboardingStageOptions}
          canEdit={canEditEmploymentStatuses}
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

      <div className="mt-4">
        <OrganisationOptionListSection
          title="Right to work categories (master field)"
          description={
            <>
              Defines the <strong className="text-[#475569]">Right to work category</strong> dropdown on every employee
              record. Align labels with your HR / compliance policy; this is the canonical list workers must select from.
            </>
          }
          icon={ShieldCheck}
          options={rtwCategoryOptions}
          setOptions={setRtwCategoryOptions}
          canEdit={canEditEmploymentStatuses}
          saving={rtwSaving}
          setSaving={setRtwSaving}
          msg={rtwMsg}
          setMsg={setRtwMsg}
          onReload={loadOrgSettings}
          resetDefaults={DEFAULT_RTW_CATEGORIES}
          patchKey="rtw_category_options"
          token={token}
        />
      </div>

      <div className="mt-4 wem-surface">
        <div className="wem-toolbar">
          <span className="text-[11px] font-extrabold text-[#0a0a0a]">Admin account context</span>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Info icon={Building2} label="Admin name" value={me.full_name} />
            <Info icon={Mail} label="Email" value={me.email} />
            <Info icon={Building2} label="Organisation ref" value={orgRef} />
            {canViewCos ? (
              <Info icon={BriefcaseBusiness} label="Current CoS used" value={String(ov.cos_used)} />
            ) : (
              <Info icon={AlertTriangle} label="Visa risk (next 90 days)" value={String(expiring90)} />
            )}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-[#64748b]" style={MONO}>
            Company name and licence details are managed via your sponsor workflow; employment status labels and dropdown
            lists (departments, locations, onboarding stages, right to work categories) are editable above.
          </p>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="border border-[rgba(0,0,0,0.08)] bg-[#f8fafc] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-[#94a3b8]" />
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#64748b]" style={MONO}>
          {label}
        </p>
      </div>
      <p className="mt-1 text-[13px] font-semibold text-[#0a0a0a]">{value}</p>
    </div>
  );
}

function StatRow({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.06)] py-2.5 last:border-b-0">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-[#94a3b8]" />
        <p className="text-[13px] text-[#475569]">{label}</p>
      </div>
      <p className="text-[13px] font-bold tabular-nums text-[#0a0a0a]">{value}</p>
    </div>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  const w = Math.max(0, Math.min(100, value));
  return (
    <div className="border-b border-[rgba(0,0,0,0.06)] py-2.5 last:border-b-0">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[13px] text-[#475569]">{label}</p>
        <p className="text-[13px] font-bold tabular-nums text-[var(--dash-blue)]">{value}%</p>
      </div>
      <div className="h-1.5 overflow-hidden bg-[rgba(0,0,0,0.06)]">
        <div className="h-full bg-[var(--dash-blue)] transition-[width] duration-300" style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}
