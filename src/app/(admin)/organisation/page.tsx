"use client";

import {
  useEffect,
  useState,
  useCallback,
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
  "British or Irish citizen",
  "Indefinite leave to remain or settled status",
  "Limited leave to remain (time-limited permission)",
  "EU Settlement Scheme (settled or pre-settled)",
  "Skilled Worker / other points-based route",
  "Student — with permitted work",
  "Other / pending verification",
];

interface OrgSettingsResponse {
  employment_status_options: string[];
  department_options: string[];
  work_location_options: string[];
  onboarding_stage_options: string[];
  rtw_category_options: string[];
}

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
    <div className="data-card" style={{ padding: 16 }}>
      <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
        <Icon className="h-4 w-4 text-[#1a5296]" />
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-xs text-gray-500" style={{ marginBottom: 12 }}>
        {description}
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        {options.map((label, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              className="flex-1 rounded-xl border border-gray-300 bg-white text-sm text-gray-900"
              style={{ height: 38, padding: "0 12px" }}
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
                className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
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
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
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
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => setOptions([...resetDefaults])}
          >
            Reset to defaults
          </button>
          <button
            type="button"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
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
          {msg ? <span className="text-xs text-gray-600">{msg}</span> : null}
        </div>
      )}
      {!canEdit && <p className="mt-2 text-xs text-gray-500">Only organisation admins can edit this list.</p>}
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

  if (loading) return <p className="text-sm text-gray-500">Loading organisation...</p>;
  if (error || !me || !ov) return <p className="text-sm text-red-600">{error || "Organisation unavailable"}</p>;

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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 className="admin-page-title">Organisation</h1>
        <p className="admin-page-subtitle" style={{ marginTop: 6 }}>
          Organisation health, sponsorship capacity, and admin context.
        </p>
      </div>

      <div className="data-card" style={{ padding: 16 }}>
        <div className="flex items-center justify-between flex-wrap" style={{ gap: 10 }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Organisation Profile</p>
            <h2 className="text-lg font-semibold text-gray-900" style={{ marginTop: 2 }}>{orgDisplay}</h2>
          </div>
          <span
            className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
            style={{ padding: "5px 10px", fontSize: 12, gap: 6 }}
          >
            <ShieldCheck style={{ width: 13, height: 13 }} />
            Active
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 10, marginTop: 12 }}>
          <Info icon={Building2} label="Organisation Ref" value={orgRef} />
          <Info icon={Mail} label="Admin Email" value={me.email} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 12 }}>
        <div className="data-card" style={{ padding: 16 }}>
          <h3 className="text-sm font-semibold text-gray-900">Workforce & Sponsorship</h3>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <StatRow icon={Users} label="Total Employees" value={String(ov.total_employees)} />
            <StatRow icon={Users} label="Active Employees" value={String(ov.active_employees)} />
            <StatRow icon={Users} label="Sponsored Workers" value={String(sponsored)} />
            <StatRow icon={Users} label="Non-Sponsored Workers" value={String(nonSponsored)} />
            <ProgressRow label="Active Rate" value={activeRate} color="emerald" />
          </div>
        </div>

        {canViewCos ? (
          <div className="data-card" style={{ padding: 16 }}>
            <h3 className="text-sm font-semibold text-gray-900">CoS Capacity & Compliance</h3>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <StatRow icon={BriefcaseBusiness} label="CoS Allocated" value={String(ov.cos_allocated)} />
              <StatRow icon={BriefcaseBusiness} label="CoS Used" value={String(ov.cos_used)} />
              <StatRow icon={BriefcaseBusiness} label="CoS Available" value={String(ov.cos_available)} />
              <ProgressRow label="CoS Utilisation" value={cosUtilisation} color="blue" />
              <StatRow icon={AlertTriangle} label="Visa Risk (next 90 days)" value={String(expiring90)} />
            </div>
          </div>
        ) : (
          <div className="data-card" style={{ padding: 16 }}>
            <h3 className="text-sm font-semibold text-gray-900">Compliance Overview</h3>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <StatRow icon={AlertTriangle} label="Visa Risk (next 90 days)" value={String(expiring90)} />
              <p className="text-xs text-gray-500" style={{ marginTop: 6 }}>
                CoS capacity details are hidden for HR role.
              </p>
            </div>
          </div>
        )}
      </div>

      {token && me.organisation_id && (
        <ChecklistTemplateEditor
          token={token}
          organisationId={me.organisation_id}
          canEdit={!!canEditChecklistTemplate}
        />
      )}

      <div className="data-card" style={{ padding: 16 }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
          <ListChecks className="h-4 w-4 text-[#1a5296]" />
          <h3 className="text-sm font-semibold text-gray-900">Employee employment statuses</h3>
        </div>
        <p className="text-xs text-gray-500" style={{ marginBottom: 12 }}>
          These labels appear in the <strong>Employment status</strong> dropdown for every employee. Defaults are Active,
          Inactive, and Finished — add your own (e.g. &quot;On leave&quot;, &quot;Probation&quot;) so HR uses the same set
          across the organisation.
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {employmentStatusOptions.map((label, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                className="flex-1 rounded-xl border border-gray-300 bg-white text-sm text-gray-900"
                style={{ height: 38, padding: "0 12px" }}
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
                  className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
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
              className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => setEmploymentStatusOptions([...DEFAULT_EMPLOYMENT_STATUSES])}
            >
              Reset to defaults
            </button>
            <button
              type="button"
              disabled={statusSaving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
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
            {statusMsg ? <span className="text-xs text-gray-600">{statusMsg}</span> : null}
          </div>
        )}
        {!canEditEmploymentStatuses && (
          <p className="mt-2 text-xs text-gray-500">Only organisation admins can edit this list.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <OrganisationOptionListSection
          title="Departments"
          description={
            <>
              Labels for the <strong>Department</strong> dropdown on each employee. Adjust them here so HR picks from a
              consistent list.
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
              Options for <strong>Work location</strong> on employee records (sites, hubs, or &quot;Remote&quot;).
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
              HR-facing <strong>Onboarding stage</strong> labels (separate from the internal workflow stage). Align these
              with your recruitment process.
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

      <OrganisationOptionListSection
        title="Right to work categories (master field)"
        description={
          <>
            Defines the <strong>Right to work category</strong> dropdown on every employee record. Align labels with your
            HR / compliance policy; this is the canonical list workers must select from.
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

      <div className="data-card" style={{ padding: 16 }}>
        <h3 className="text-sm font-semibold text-gray-900">Admin Account Context</h3>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 10, marginTop: 10 }}>
          <Info icon={Building2} label="Admin Name" value={me.full_name} />
          <Info icon={Mail} label="Email" value={me.email} />
          <Info icon={Building2} label="Organisation Ref" value={orgRef} />
          {canViewCos ? (
            <Info icon={BriefcaseBusiness} label="Current CoS Used" value={String(ov.cos_used)} />
          ) : (
            <Info icon={AlertTriangle} label="Visa Risk (next 90 days)" value={String(expiring90)} />
          )}
        </div>
        <p className="text-xs text-gray-500" style={{ marginTop: 10 }}>
          Company name and licence details are managed via your sponsor workflow; employment status labels and dropdown
          lists (departments, locations, onboarding stages, right to work categories) are editable above.
        </p>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50" style={{ padding: "10px 12px" }}>
      <div className="flex items-center" style={{ gap: 6 }}>
        <Icon style={{ width: 12, height: 12, color: "#64748b" }} />
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className="text-sm font-semibold text-gray-900" style={{ marginTop: 2 }}>{value}</p>
    </div>
  );
}

function StatRow({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: "4px 0", borderBottom: "1px solid #e6edf6" }}>
      <div className="flex items-center" style={{ gap: 8 }}>
        <Icon style={{ width: 14, height: 14, color: "#64748b" }} />
        <p className="text-sm text-gray-600">{label}</p>
      </div>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function ProgressRow({ label, value, color }: { label: string; value: number; color: "emerald" | "blue" }) {
  const barClass = color === "emerald" ? "bg-emerald-500" : "bg-blue-500";
  const textClass = color === "emerald" ? "text-emerald-700" : "text-blue-700";
  return (
    <div style={{ paddingTop: 4 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
        <p className="text-sm text-gray-600">{label}</p>
        <p className={`text-sm font-semibold ${textClass}`}>{value}%</p>
      </div>
      <div className="rounded-full bg-gray-100 overflow-hidden" style={{ height: 6 }}>
        <div className={`${barClass}`} style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: "100%" }} />
      </div>
    </div>
  );
}

