"use client";

import { useState, useEffect, useMemo } from "react";
import { getRtwUiProfile } from "@/lib/rtw-profile";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import "../../dashboard/dashboard-marketing.css";
import "../workers-page.css";

interface FormData {
  name: string;
  first_name: string;
  second_name: string;
  last_name: string;
  job_title: string;
  email: string;
  phone: string;
  personal_email: string;
  nationality: string;
  department: string;
  soc_code: string;
  salary: string;
  right_to_work_category: string;
  route: string;
  work_location: string;
  start_date: string;
  visa_expiry: string;
  passport_expiry: string;
  brp_expiry: string;
  stage: string;
  is_hybrid: boolean;
  is_remote: boolean;
  dbs_required: boolean;
  atas_required: boolean;
  address: string;
  postal_code: string;
  date_of_birth: string;
  place_of_birth: string;
  country_of_birth: string;
  gender: string;
  ethnicity: string;
  religion: string;
  ni_number: string;
  passport_number: string;
  passport_place_of_issue: string;
  passport_issue_date: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  next_of_kin_name: string;
  next_of_kin_phone: string;
  employee_id: string;
  employee_type: string;
  work_address: string;
  sponsorship_number: string;
  visa_grant_date: string;
  job_application_date: string;
  offer_letter_date: string;
  cos_assigned_date: string;
  bank_account_number: string;
  sort_code: string;
  brp_reference: string;
  brp_issue_date: string;
  dbs_check_date: string;
  employment_status: string;
  salary_pay_type: string;
  hr_onboarding_stage: string;
  termination_date: string;
  sex: string;
}

const INITIAL: FormData = {
  name: "",
  first_name: "",
  second_name: "",
  last_name: "",
  job_title: "",
  email: "",
  phone: "",
  personal_email: "",
  nationality: "",
  department: "",
  soc_code: "",
  salary: "",
  right_to_work_category: "",
  route: "Skilled Worker",
  work_location: "",
  start_date: "",
  visa_expiry: "",
  passport_expiry: "",
  brp_expiry: "",
  stage: "recruitment",
  is_hybrid: false,
  is_remote: false,
  dbs_required: false,
  atas_required: false,
  address: "",
  postal_code: "",
  date_of_birth: "",
  place_of_birth: "",
  country_of_birth: "",
  gender: "",
  ethnicity: "",
  religion: "",
  ni_number: "",
  passport_number: "",
  passport_place_of_issue: "",
  passport_issue_date: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  next_of_kin_name: "",
  next_of_kin_phone: "",
  employee_id: "",
  employee_type: "migrant",
  work_address: "",
  sponsorship_number: "",
  visa_grant_date: "",
  job_application_date: "",
  offer_letter_date: "",
  cos_assigned_date: "",
  bank_account_number: "",
  sort_code: "",
  brp_reference: "",
  brp_issue_date: "",
  dbs_check_date: "",
  employment_status: "Active",
  salary_pay_type: "annual",
  hr_onboarding_stage: "",
  termination_date: "",
  sex: "",
};

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const SEX_OPTIONS = ["", "Female", "Male", "Non-binary", "Prefer not to say"];
const EMPLOYEE_TYPES = ["migrant", "settled", "british", "irish"];

const DEFAULT_DEPARTMENT_OPTIONS = ["Operations", "People", "Finance", "Engineering", "Care"];
const DEFAULT_WORK_LOCATION_OPTIONS = ["London HQ", "Manchester Office", "Remote", "Hybrid — UK"];
const DEFAULT_ONBOARDING_STAGE_OPTIONS = [
  "Recruitment",
  "CoS assignment",
  "Pre-start",
  "Active sponsorship",
];

const SALARY_PAY_OPTIONS: { value: string; label: string }[] = [
  { value: "hourly", label: "Hourly rate" },
  { value: "daily", label: "Daily rate" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];

const ROUTES = ["Skilled Worker", "Global Business Mobility", "Scale-up", "Health and Care", "Other"];
const STAGES = [
  { value: "recruitment", label: "Recruitment" },
  { value: "cos_assignment", label: "CoS Assignment" },
  { value: "pre_start", label: "Pre-Start" },
  { value: "active_sponsorship", label: "Active Sponsorship" },
];

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="wem-new-label block" style={{ marginBottom: 6 }}>
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
    </div>
  );
}

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

export default function NewWorkerPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [employmentOptions, setEmploymentOptions] = useState<string[]>(["Active", "Inactive", "Finished"]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>(DEFAULT_DEPARTMENT_OPTIONS);
  const [workLocationOptions, setWorkLocationOptions] = useState<string[]>(DEFAULT_WORK_LOCATION_OPTIONS);
  const [onboardingStageOptions, setOnboardingStageOptions] = useState<string[]>(DEFAULT_ONBOARDING_STAGE_OPTIONS);
  const RTW_CATEGORY_OPTIONS_FALLBACK = [
    "British Citizen",
    "Irish Citizen",
    "ILR / Settled Status",
    "Pre-settled Status",
    "Visa – Sponsored Worker",
    "Visa – Non-Sponsored Worker",
  ];
  const [rtwCategoryOptions, setRtwCategoryOptions] = useState<string[]>(RTW_CATEGORY_OPTIONS_FALLBACK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const rtwUi = useMemo(() => getRtwUiProfile(form.right_to_work_category || null), [form.right_to_work_category]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    []
  );

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const s = await api.get<{
          employment_status_options: string[];
          rtw_category_options: string[];
          department_options: string[];
          work_location_options: string[];
          onboarding_stage_options: string[];
        }>("/organisation/settings", token);
        if (s.employment_status_options?.length) setEmploymentOptions(s.employment_status_options);
        if (s.rtw_category_options?.length) setRtwCategoryOptions(s.rtw_category_options);
        if (s.department_options?.length) setDepartmentOptions(s.department_options);
        if (s.work_location_options?.length) setWorkLocationOptions(s.work_location_options);
        if (s.onboarding_stage_options?.length) setOnboardingStageOptions(s.onboarding_stage_options);
      } catch {
        /* defaults */
      }
    })();
  }, [token]);

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const toggle = (field: keyof FormData) => () =>
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!form.first_name.trim() || !form.last_name.trim()) && !form.name.trim()) {
      setError("First Name and Last Name are required.");
      return;
    }
    if (!form.job_title.trim()) {
      setError("Job Title is required.");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      const fullName =
        form.name.trim() ||
        [form.first_name.trim(), form.second_name.trim(), form.last_name.trim()].filter(Boolean).join(" ").trim();
      const payload: Record<string, unknown> = {
        name: fullName,
        job_title: form.job_title.trim(),
        route: form.route,
        stage: form.stage,
        salary: form.salary ? parseFloat(form.salary) : 0,
        is_hybrid: form.is_hybrid,
        is_remote: form.is_remote,
        dbs_required: form.dbs_required,
        atas_required: form.atas_required,
        employment_status: form.employment_status || "Active",
        salary_pay_type: form.salary_pay_type || "annual",
      };

      const optStr = (k: string, v: string) => { if (v.trim()) payload[k] = v.trim(); };
      const optDate = (k: string, v: string) => { if (v) payload[k] = new Date(v).toISOString(); };

      optStr("first_name", form.first_name);
      optStr("second_name", form.second_name);
      optStr("last_name", form.last_name);
      optStr("email", form.email);
      optStr("phone", form.phone);
      optStr("personal_email", form.personal_email);
      optStr("nationality", form.nationality);
      optStr("department", form.department);
      optStr("soc_code", form.soc_code);
      optStr("work_location", form.work_location);
      optStr("address", form.address);
      optStr("postal_code", form.postal_code);
      optStr("place_of_birth", form.place_of_birth);
      optStr("country_of_birth", form.country_of_birth);
      optStr("gender", form.gender);
      optStr("ethnicity", form.ethnicity);
      optStr("religion", form.religion);
      optStr("ni_number", form.ni_number);
      optStr("passport_number", form.passport_number);
      optStr("passport_place_of_issue", form.passport_place_of_issue);
      optStr("emergency_contact_name", form.emergency_contact_name);
      optStr("emergency_contact_phone", form.emergency_contact_phone);
      optStr("next_of_kin_name", form.next_of_kin_name);
      optStr("next_of_kin_phone", form.next_of_kin_phone);
      optStr("employee_id", form.employee_id);
      optStr("employee_type", form.employee_type);
      optStr("work_address", form.work_address);
      optStr("sponsorship_number", form.sponsorship_number);
      optStr("right_to_work_category", form.right_to_work_category);
      optStr("hr_onboarding_stage", form.hr_onboarding_stage);
      optStr("sex", form.sex);
      optStr("bank_account_number", form.bank_account_number);
      optStr("sort_code", form.sort_code);
      optStr("brp_reference", form.brp_reference);

      optDate("start_date", form.start_date);
      optDate("visa_expiry", form.visa_expiry);
      optDate("passport_expiry", form.passport_expiry);
      optDate("brp_expiry", form.brp_expiry);
      optDate("date_of_birth", form.date_of_birth);
      optDate("passport_issue_date", form.passport_issue_date);
      optDate("visa_grant_date", form.visa_grant_date);
      optDate("job_application_date", form.job_application_date);
      optDate("offer_letter_date", form.offer_letter_date);
      optDate("cos_assigned_date", form.cos_assigned_date);
      optDate("brp_issue_date", form.brp_issue_date);
      optDate("dbs_check_date", form.dbs_check_date);
      optDate("termination_date", form.termination_date);

      await api.post("/workers", payload, token ?? undefined);
      router.push("/workers");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add employee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="protexi-dash-marketing flex flex-col gap-0">
      <div className="adm-ph">
        <div className="flex min-w-0 gap-3">
          <button type="button" onClick={() => router.push("/workers")} className="wem-new-back" aria-label="Back to workers">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="adm-ph-ey">Workforce</div>
            <h1 className="adm-ph-title">
              Add <em className="dash-title-em">employee</em>
            </h1>
            <div className="adm-ph-date" style={MONO}>
              {todayLabel}
            </div>
            <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#64748b]">Employee and sponsorship details.</p>
          </div>
        </div>
      </div>

      <div className="wem-new-form">
        {error && <div className="wem-new-err">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="wem-new-stack">
            {/* Personal Details */}
            <div className="wem-new-section">
              <div className="wem-new-section-h">Personal Details</div>
              <div className="wem-new-section-body">
                <div className="wem-new-grid">
            <Field label="First Name" required>
              <input type="text" value={form.first_name} onChange={set("first_name")} placeholder="e.g. Sarah" className="wem-new-inp" />
            </Field>
            <Field label="Second / middle name">
              <input type="text" value={form.second_name} onChange={set("second_name")} placeholder="Optional" className="wem-new-inp" />
            </Field>
            <Field label="Last Name" required>
              <input type="text" value={form.last_name} onChange={set("last_name")} placeholder="e.g. Johnson" className="wem-new-inp" />
            </Field>
            <Field label="Email" required>
              <input type="email" required value={form.email} onChange={set("email")} placeholder="e.g. sarah@company.com" className="wem-new-inp" />
            </Field>
            <Field label="Phone Number">
              <input type="tel" value={form.phone} onChange={set("phone")} placeholder="+44 7700 000000" className="wem-new-inp" />
            </Field>
            <Field label="Personal Email">
              <input type="email" value={form.personal_email} onChange={set("personal_email")} placeholder="e.g. sarah.personal@gmail.com" className="wem-new-inp" />
            </Field>
            <Field label="Date of Birth">
              <input type="date" value={form.date_of_birth} onChange={set("date_of_birth")} className="wem-new-inp" />
            </Field>
            <Field label="Gender">
              <select value={form.gender} onChange={set("gender")} className="wem-new-inp cursor-pointer">
                <option value="">Select...</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Sex (HR record)">
              <select value={form.sex} onChange={set("sex")} className="wem-new-inp cursor-pointer">
                {SEX_OPTIONS.map((s) => (
                  <option key={s || "—"} value={s}>
                    {s || "—"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nationality">
              <input type="text" value={form.nationality} onChange={set("nationality")} placeholder="e.g. Portuguese" className="wem-new-inp" />
            </Field>
            <Field label="Ethnicity">
              <input type="text" value={form.ethnicity} onChange={set("ethnicity")} placeholder="e.g. White European" className="wem-new-inp" />
            </Field>
            <Field label="Religion">
              <input type="text" value={form.religion} onChange={set("religion")} placeholder="e.g. Catholic" className="wem-new-inp" />
            </Field>
            <Field label="Place of Birth">
              <input type="text" value={form.place_of_birth} onChange={set("place_of_birth")} placeholder="e.g. Lisboa" className="wem-new-inp" />
            </Field>
            <Field label="Country of Birth">
              <input type="text" value={form.country_of_birth} onChange={set("country_of_birth")} placeholder="e.g. Portugal" className="wem-new-inp" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Home Address">
                <input type="text" value={form.address} onChange={set("address")} placeholder="e.g. Rua dos Eucaliptos 98, Lisboa" className="wem-new-inp" />
              </Field>
            </div>
            <Field label="Postal Code">
              <input type="text" value={form.postal_code} onChange={set("postal_code")} placeholder="e.g. 1800-202" className="wem-new-inp" />
            </Field>
            <Field label="National Insurance Number">
              <input type="text" value={form.ni_number} onChange={set("ni_number")} placeholder="e.g. NJ645681B" className="wem-new-inp" />
            </Field>
                </div>
              </div>
            </div>

            {/* Passport & ID */}
            <div className="wem-new-section">
              <div className="wem-new-section-h">Passport &amp; ID</div>
              <div className="wem-new-section-body">
                <div className="wem-new-grid">
            <Field label="Passport Number">
              <input type="text" value={form.passport_number} onChange={set("passport_number")} placeholder="e.g. CH033822" className="wem-new-inp" />
            </Field>
            <Field label="Passport Place of Issue">
              <input type="text" value={form.passport_place_of_issue} onChange={set("passport_place_of_issue")} placeholder="e.g. Portugal" className="wem-new-inp" />
            </Field>
            <Field label="Passport Issue Date">
              <input type="date" value={form.passport_issue_date} onChange={set("passport_issue_date")} className="wem-new-inp" />
            </Field>
            <Field label="Passport Expiry Date">
              <input type="date" value={form.passport_expiry} onChange={set("passport_expiry")} className="wem-new-inp" />
            </Field>
            <Field label="Employee ID">
              <input type="text" value={form.employee_id} onChange={set("employee_id")} placeholder="e.g. 1" className="wem-new-inp" />
            </Field>
            <Field label="Employee Type">
              <select value={form.employee_type} onChange={set("employee_type")} className="wem-new-inp cursor-pointer">
                {EMPLOYEE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </Field>
                </div>
              </div>
            </div>

            {/* Emergency Contacts & Next of Kin */}
            <div className="wem-new-section">
              <div className="wem-new-section-h">Emergency Contacts &amp; Next of Kin</div>
              <div className="wem-new-section-body">
                <div className="wem-new-grid">
            <Field label="Emergency Contact Name">
              <input type="text" value={form.emergency_contact_name} onChange={set("emergency_contact_name")} placeholder="e.g. Maria Pinhao" className="wem-new-inp" />
            </Field>
            <Field label="Emergency Contact Phone">
              <input type="tel" value={form.emergency_contact_phone} onChange={set("emergency_contact_phone")} placeholder="e.g. +351 936991149" className="wem-new-inp" />
            </Field>
            <Field label="Next of Kin Name">
              <input type="text" value={form.next_of_kin_name} onChange={set("next_of_kin_name")} placeholder="e.g. Maria Pinhao" className="wem-new-inp" />
            </Field>
            <Field label="Next of Kin Phone">
              <input type="tel" value={form.next_of_kin_phone} onChange={set("next_of_kin_phone")} placeholder="e.g. +351 936991149" className="wem-new-inp" />
            </Field>
                </div>
              </div>
            </div>

            {/* Employment Details */}
            <div className="wem-new-section">
              <div className="wem-new-section-h">Employment Details</div>
              <div className="wem-new-section-body">
                <div className="wem-new-grid">
            <Field label="Job Title" required>
              <input type="text" value={form.job_title} onChange={set("job_title")} placeholder="e.g. Live in Carer" className="wem-new-inp" />
            </Field>
            <Field label="Status">
              <select
                value={form.employment_status}
                onChange={set("employment_status")}
                className="wem-new-inp cursor-pointer"
              >
                {employmentOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Department">
              <select value={form.department} onChange={set("department")} className="wem-new-inp cursor-pointer">
                <option value="">—</option>
                {departmentOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="SOC Code">
              <input type="text" value={form.soc_code} onChange={set("soc_code")} placeholder="e.g. 6145" className="wem-new-inp" />
            </Field>
            <Field label="Salary (£)">
              <input type="number" value={form.salary} onChange={set("salary")} placeholder="e.g. 25000" className="wem-new-inp" />
            </Field>
            <Field label="Salary basis">
              <select value={form.salary_pay_type} onChange={set("salary_pay_type")} className="wem-new-inp cursor-pointer">
                {SALARY_PAY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Work location">
              <select value={form.work_location} onChange={set("work_location")} className="wem-new-inp cursor-pointer">
                <option value="">—</option>
                {workLocationOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="HR onboarding stage">
              <select value={form.hr_onboarding_stage} onChange={set("hr_onboarding_stage")} className="wem-new-inp cursor-pointer">
                <option value="">—</option>
                {onboardingStageOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Start Date">
              <input type="date" value={form.start_date} onChange={set("start_date")} className="wem-new-inp" />
            </Field>
            <Field label="End date (if applicable)">
              <input type="date" value={form.termination_date} onChange={set("termination_date")} className="wem-new-inp" />
            </Field>
                </div>
                <div className="mt-4 flex flex-wrap" style={{ gap: 20 }}>
                  <label className="inline-flex cursor-pointer items-center" style={{ gap: 8 }}>
                    <input type="checkbox" checked={form.is_hybrid} onChange={toggle("is_hybrid")} className="rounded border border-[rgba(0,0,0,0.1)] text-[#1a4fa0]" />
                    <span className="text-[13px] text-[#0f2d5e]">Hybrid</span>
                  </label>
                  <label className="inline-flex cursor-pointer items-center" style={{ gap: 8 }}>
                    <input type="checkbox" checked={form.is_remote} onChange={toggle("is_remote")} className="rounded border border-[rgba(0,0,0,0.1)] text-[#1a4fa0]" />
                    <span className="text-[13px] text-[#0f2d5e]">Remote</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Sponsorship & Visa */}
            <div className="wem-new-section">
              <div className="wem-new-section-h">Sponsorship &amp; Visa</div>
              <div className="wem-new-section-body">
                <div className="wem-new-grid">
            <Field label="Right to work category">
              <select
                value={form.right_to_work_category}
                onChange={set("right_to_work_category")}
                className="wem-new-inp cursor-pointer"
              >
                <option value="">Select...</option>
                {rtwCategoryOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Workflow stage">
              <select value={form.stage} onChange={set("stage")} className="wem-new-inp cursor-pointer">
                {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            {(rtwUi.showVisaImmigration || rtwUi.showSponsorshipCos) && (
              <Field label="Immigration route / visa type">
                <select value={form.route} onChange={set("route")} className="wem-new-inp cursor-pointer">
                  {ROUTES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {rtwUi.showSponsorshipCos && (
              <Field label="Sponsorship number">
                <input
                  type="text"
                  value={form.sponsorship_number}
                  onChange={set("sponsorship_number")}
                  placeholder="e.g. C2G4Z37977N"
                  className="wem-new-inp"
                />
              </Field>
            )}
            {rtwUi.showVisaImmigration && (
              <>
                <Field label="Visa grant date">
                  <input type="date" value={form.visa_grant_date} onChange={set("visa_grant_date")} className="wem-new-inp" />
                </Field>
                <Field label="Visa expiry date">
                  <input type="date" value={form.visa_expiry} onChange={set("visa_expiry")} className="wem-new-inp" />
                </Field>
              </>
            )}
            {rtwUi.showSponsorshipCos && (
              <Field label="Date CoS assigned">
                <input type="date" value={form.cos_assigned_date} onChange={set("cos_assigned_date")} className="wem-new-inp" />
              </Field>
            )}
            {rtwUi.showBrpFields && (
              <>
                <Field label="BRP reference">
                  <input type="text" value={form.brp_reference} onChange={set("brp_reference")} placeholder="e.g. ZR1234567" className="wem-new-inp" />
                </Field>
                <Field label="BRP issue date">
                  <input type="date" value={form.brp_issue_date} onChange={set("brp_issue_date")} className="wem-new-inp" />
                </Field>
                <Field label="BRP expiry date">
                  <input type="date" value={form.brp_expiry} onChange={set("brp_expiry")} className="wem-new-inp" />
                </Field>
              </>
            )}
            <Field label="DBS Check Date">
              <input type="date" value={form.dbs_check_date} onChange={set("dbs_check_date")} className="wem-new-inp" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Work Address">
                <input type="text" value={form.work_address} onChange={set("work_address")} placeholder="e.g. Ranger Home Care, The Annex, Ewshot Holt, GU10 5AJ" className="wem-new-inp" />
              </Field>
            </div>
            <Field label="Job Application Date">
              <input type="date" value={form.job_application_date} onChange={set("job_application_date")} className="wem-new-inp" />
            </Field>
            <Field label="Offer Letter Date">
              <input type="date" value={form.offer_letter_date} onChange={set("offer_letter_date")} className="wem-new-inp" />
            </Field>
            <Field label="Bank Account Number">
              <input type="text" value={form.bank_account_number} onChange={set("bank_account_number")} placeholder="e.g. 88736969" className="wem-new-inp" />
            </Field>
            <Field label="Sort Code">
              <input type="text" value={form.sort_code} onChange={set("sort_code")} placeholder="e.g. 04-00-04" className="wem-new-inp" />
            </Field>
                </div>
                <div className="mt-4 flex flex-wrap" style={{ gap: 20 }}>
                  <label className="inline-flex cursor-pointer items-center" style={{ gap: 8 }}>
                    <input type="checkbox" checked={form.dbs_required} onChange={toggle("dbs_required")} className="rounded border border-[rgba(0,0,0,0.1)] text-[#1a4fa0]" />
                    <span className="text-[13px] text-[#0f2d5e]">DBS Required</span>
                  </label>
                  <label className="inline-flex cursor-pointer items-center" style={{ gap: 8 }}>
                    <input type="checkbox" checked={form.atas_required} onChange={toggle("atas_required")} className="rounded border border-[rgba(0,0,0,0.1)] text-[#1a4fa0]" />
                    <span className="text-[13px] text-[#0f2d5e]">ATAS Required</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="wem-new-actions">
            <button type="button" onClick={() => router.push("/workers")} className="wem-new-btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="wem-new-btn-primary">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "Saving…" : "Save employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
