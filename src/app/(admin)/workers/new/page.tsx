"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

interface FormData {
  name: string;
  first_name: string;
  last_name: string;
  job_title: string;
  email: string;
  phone: string;
  personal_email: string;
  nationality: string;
  department: string;
  soc_code: string;
  salary: string;
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
}

const INITIAL: FormData = {
  name: "",
  first_name: "",
  last_name: "",
  job_title: "",
  email: "",
  phone: "",
  personal_email: "",
  nationality: "",
  department: "",
  soc_code: "",
  salary: "",
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
};

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const EMPLOYEE_TYPES = ["migrant", "settled", "british", "irish"];

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
      <label className="block text-sm font-medium text-brand-800" style={{ marginBottom: 6 }}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-white text-sm text-brand-900 placeholder:text-[var(--muted-foreground)] outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all";

export default function NewWorkerPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

    setError("");
    setSaving(true);
    try {
      const fullName = form.name.trim() || `${form.first_name.trim()} ${form.last_name.trim()}`.trim();
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
      };

      const optStr = (k: string, v: string) => { if (v.trim()) payload[k] = v.trim(); };
      const optDate = (k: string, v: string) => { if (v) payload[k] = new Date(v).toISOString(); };

      optStr("first_name", form.first_name);
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

      await api.post("/workers", payload, token ?? undefined);
      router.push("/workers");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add employee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div className="flex items-center" style={{ gap: 14, marginBottom: 28 }}>
        <button
          type="button"
          onClick={() => router.push("/workers")}
          className="flex items-center justify-center rounded-xl border border-[var(--border)] bg-white hover:bg-brand-50 transition-colors cursor-pointer"
          style={{ width: 38, height: 38 }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} className="text-brand-700" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-brand-900 tracking-tight">Add Employee</h1>
          <p className="text-sm text-[var(--muted-foreground)]" style={{ marginTop: 2 }}>
            Enter employee and sponsorship details
          </p>
        </div>
      </div>

      {error && (
        <div
          className="rounded-xl bg-red-50 border border-red-200 text-red-800"
          style={{ padding: "12px 16px", fontSize: 13, marginBottom: 20 }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Personal Details */}
        <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: "24px 28px", marginBottom: 20 }}>
          <h2 className="text-sm font-semibold text-brand-900 uppercase tracking-wide" style={{ marginBottom: 20, letterSpacing: "0.05em" }}>
            Personal Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 18 }}>
            <Field label="First Name" required>
              <input type="text" value={form.first_name} onChange={set("first_name")} placeholder="e.g. Sarah" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Last Name" required>
              <input type="text" value={form.last_name} onChange={set("last_name")} placeholder="e.g. Johnson" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={set("email")} placeholder="e.g. sarah@company.com" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Phone Number">
              <input type="tel" value={form.phone} onChange={set("phone")} placeholder="+44 7700 000000" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Personal Email">
              <input type="email" value={form.personal_email} onChange={set("personal_email")} placeholder="e.g. sarah.personal@gmail.com" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Date of Birth">
              <input type="date" value={form.date_of_birth} onChange={set("date_of_birth")} className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Gender">
              <select value={form.gender} onChange={set("gender")} className={`${inputClass} cursor-pointer`} style={{ height: 40, padding: "0 14px" }}>
                <option value="">Select...</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Nationality">
              <input type="text" value={form.nationality} onChange={set("nationality")} placeholder="e.g. Portuguese" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Ethnicity">
              <input type="text" value={form.ethnicity} onChange={set("ethnicity")} placeholder="e.g. White European" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Religion">
              <input type="text" value={form.religion} onChange={set("religion")} placeholder="e.g. Catholic" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Place of Birth">
              <input type="text" value={form.place_of_birth} onChange={set("place_of_birth")} placeholder="e.g. Lisboa" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Country of Birth">
              <input type="text" value={form.country_of_birth} onChange={set("country_of_birth")} placeholder="e.g. Portugal" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Home Address">
                <input type="text" value={form.address} onChange={set("address")} placeholder="e.g. Rua dos Eucaliptos 98, Lisboa" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
              </Field>
            </div>
            <Field label="Postal Code">
              <input type="text" value={form.postal_code} onChange={set("postal_code")} placeholder="e.g. 1800-202" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="National Insurance Number">
              <input type="text" value={form.ni_number} onChange={set("ni_number")} placeholder="e.g. NJ645681B" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
          </div>
        </div>

        {/* Passport & ID */}
        <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: "24px 28px", marginBottom: 20 }}>
          <h2 className="text-sm font-semibold text-brand-900 uppercase tracking-wide" style={{ marginBottom: 20, letterSpacing: "0.05em" }}>
            Passport &amp; ID
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 18 }}>
            <Field label="Passport Number">
              <input type="text" value={form.passport_number} onChange={set("passport_number")} placeholder="e.g. CH033822" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Passport Place of Issue">
              <input type="text" value={form.passport_place_of_issue} onChange={set("passport_place_of_issue")} placeholder="e.g. Portugal" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Passport Issue Date">
              <input type="date" value={form.passport_issue_date} onChange={set("passport_issue_date")} className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Passport Expiry Date">
              <input type="date" value={form.passport_expiry} onChange={set("passport_expiry")} className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Employee ID">
              <input type="text" value={form.employee_id} onChange={set("employee_id")} placeholder="e.g. 1" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Employee Type">
              <select value={form.employee_type} onChange={set("employee_type")} className={`${inputClass} cursor-pointer`} style={{ height: 40, padding: "0 14px" }}>
                {EMPLOYEE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* Emergency Contacts & Next of Kin */}
        <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: "24px 28px", marginBottom: 20 }}>
          <h2 className="text-sm font-semibold text-brand-900 uppercase tracking-wide" style={{ marginBottom: 20, letterSpacing: "0.05em" }}>
            Emergency Contacts &amp; Next of Kin
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 18 }}>
            <Field label="Emergency Contact Name">
              <input type="text" value={form.emergency_contact_name} onChange={set("emergency_contact_name")} placeholder="e.g. Maria Pinhao" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Emergency Contact Phone">
              <input type="tel" value={form.emergency_contact_phone} onChange={set("emergency_contact_phone")} placeholder="e.g. +351 936991149" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Next of Kin Name">
              <input type="text" value={form.next_of_kin_name} onChange={set("next_of_kin_name")} placeholder="e.g. Maria Pinhao" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Next of Kin Phone">
              <input type="tel" value={form.next_of_kin_phone} onChange={set("next_of_kin_phone")} placeholder="e.g. +351 936991149" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
          </div>
        </div>

        {/* Employment Details */}
        <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: "24px 28px", marginBottom: 20 }}>
          <h2 className="text-sm font-semibold text-brand-900 uppercase tracking-wide" style={{ marginBottom: 20, letterSpacing: "0.05em" }}>
            Employment Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 18 }}>
            <Field label="Job Title" required>
              <input type="text" value={form.job_title} onChange={set("job_title")} placeholder="e.g. Live in Carer" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Department">
              <input type="text" value={form.department} onChange={set("department")} placeholder="e.g. Care" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="SOC Code">
              <input type="text" value={form.soc_code} onChange={set("soc_code")} placeholder="e.g. 6145" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Salary (£)">
              <input type="number" value={form.salary} onChange={set("salary")} placeholder="e.g. 25000" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Work Location">
              <input type="text" value={form.work_location} onChange={set("work_location")} placeholder="e.g. London" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Start Date">
              <input type="date" value={form.start_date} onChange={set("start_date")} className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
          </div>
          <div className="flex flex-wrap" style={{ gap: 20, marginTop: 18 }}>
            <label className="inline-flex items-center cursor-pointer" style={{ gap: 8 }}>
              <input type="checkbox" checked={form.is_hybrid} onChange={toggle("is_hybrid")} className="rounded border-[var(--border)] text-brand-600 focus:ring-brand-300" />
              <span className="text-sm text-brand-800">Hybrid</span>
            </label>
            <label className="inline-flex items-center cursor-pointer" style={{ gap: 8 }}>
              <input type="checkbox" checked={form.is_remote} onChange={toggle("is_remote")} className="rounded border-[var(--border)] text-brand-600 focus:ring-brand-300" />
              <span className="text-sm text-brand-800">Remote</span>
            </label>
          </div>
        </div>

        {/* Immigration / Sponsorship */}
        {/* Sponsorship & Visa */}
        <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: "24px 28px", marginBottom: 20 }}>
          <h2 className="text-sm font-semibold text-brand-900 uppercase tracking-wide" style={{ marginBottom: 20, letterSpacing: "0.05em" }}>
            Sponsorship &amp; Visa
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 18 }}>
            <Field label="Type of Visa">
              <select value={form.route} onChange={set("route")} className={`${inputClass} cursor-pointer`} style={{ height: 40, padding: "0 14px" }}>
                {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Sponsorship Number">
              <input type="text" value={form.sponsorship_number} onChange={set("sponsorship_number")} placeholder="e.g. C2G4Z37977N" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Stage">
              <select value={form.stage} onChange={set("stage")} className={`${inputClass} cursor-pointer`} style={{ height: 40, padding: "0 14px" }}>
                {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Visa Grant Date">
              <input type="date" value={form.visa_grant_date} onChange={set("visa_grant_date")} className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Visa Expiry Date">
              <input type="date" value={form.visa_expiry} onChange={set("visa_expiry")} className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Date CoS Assigned">
              <input type="date" value={form.cos_assigned_date} onChange={set("cos_assigned_date")} className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="BRP Reference">
              <input type="text" value={form.brp_reference} onChange={set("brp_reference")} placeholder="e.g. ZR1234567" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="BRP Issue Date">
              <input type="date" value={form.brp_issue_date} onChange={set("brp_issue_date")} className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="BRP Expiry Date">
              <input type="date" value={form.brp_expiry} onChange={set("brp_expiry")} className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="DBS Check Date">
              <input type="date" value={form.dbs_check_date} onChange={set("dbs_check_date")} className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Work Address">
                <input type="text" value={form.work_address} onChange={set("work_address")} placeholder="e.g. Ranger Home Care, The Annex, Ewshot Holt, GU10 5AJ" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
              </Field>
            </div>
            <Field label="Job Application Date">
              <input type="date" value={form.job_application_date} onChange={set("job_application_date")} className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Offer Letter Date">
              <input type="date" value={form.offer_letter_date} onChange={set("offer_letter_date")} className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Bank Account Number">
              <input type="text" value={form.bank_account_number} onChange={set("bank_account_number")} placeholder="e.g. 88736969" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
            <Field label="Sort Code">
              <input type="text" value={form.sort_code} onChange={set("sort_code")} placeholder="e.g. 04-00-04" className={inputClass} style={{ height: 40, padding: "0 14px" }} />
            </Field>
          </div>
          <div className="flex flex-wrap" style={{ gap: 20, marginTop: 18 }}>
            <label className="inline-flex items-center cursor-pointer" style={{ gap: 8 }}>
              <input type="checkbox" checked={form.dbs_required} onChange={toggle("dbs_required")} className="rounded border-[var(--border)] text-brand-600 focus:ring-brand-300" />
              <span className="text-sm text-brand-800">DBS Required</span>
            </label>
            <label className="inline-flex items-center cursor-pointer" style={{ gap: 8 }}>
              <input type="checkbox" checked={form.atas_required} onChange={toggle("atas_required")} className="rounded border-[var(--border)] text-brand-600 focus:ring-brand-300" />
              <span className="text-sm text-brand-800">ATAS Required</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end" style={{ gap: 12, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => router.push("/workers")}
            className="rounded-xl border border-[var(--border)] bg-white text-sm font-medium text-brand-800 hover:bg-brand-50 transition-colors cursor-pointer"
            style={{ height: 42, padding: "0 20px" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-xl bg-brand-600 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors cursor-pointer"
            style={{ height: 42, padding: "0 22px", gap: 8 }}
          >
            {saving ? <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> : <Save style={{ width: 15, height: 15 }} />}
            {saving ? "Saving..." : "Save Employee"}
          </button>
        </div>
      </form>
    </div>
  );
}
