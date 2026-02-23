"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface WorkerDetail {
  name: string;
  first_name: string | null;
  last_name: string | null;
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
  passport_expiry: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  employee_id: string | null;
  employee_type: string | null;
  job_title: string;
  department: string | null;
  work_location: string | null;
  start_date: string | null;
  visa_expiry: string | null;
  route: string;
  status: string;
}

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

export default function PortalDetailsPage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<WorkerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await api.get<WorkerDetail>("/portal/me", token ?? undefined);
      setProfile(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 80 }}>
        <Loader2 className="animate-spin text-brand-500" style={{ width: 24, height: 24 }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: 40 }}>
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-800" style={{ padding: "12px 16px", fontSize: 13 }}>
          No employee profile linked to your account.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900 tracking-tight">My Details</h1>
      <p className="text-sm text-[var(--muted-foreground)]" style={{ marginTop: 4, marginBottom: 24 }}>
        Your personal and employment information. Contact HR to update.
      </p>

      {/* Personal Information */}
      <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: "20px 28px", marginBottom: 20 }}>
        <h2 className="text-sm font-semibold text-brand-900 uppercase tracking-wide" style={{ marginBottom: 4 }}>
          Personal Information
        </h2>
        <dl className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "0 40px" }}>
          <InfoRow label="First Name" value={profile.first_name} />
          <InfoRow label="Last Name" value={profile.last_name} />
          <InfoRow label="Email" value={profile.email} />
          <InfoRow label="Phone" value={profile.phone} />
          <InfoRow label="Address" value={profile.address} />
          <InfoRow label="Postal Code" value={profile.postal_code} />
          <InfoRow label="Date of Birth" value={fmt(profile.date_of_birth)} />
          <InfoRow label="Nationality" value={profile.nationality} />
          <InfoRow label="Gender" value={profile.gender} />
          <InfoRow label="Place of Birth" value={profile.place_of_birth} />
          <InfoRow label="Country of Birth" value={profile.country_of_birth} />
          <InfoRow label="NI Number" value={profile.ni_number} />
        </dl>
      </div>

      {/* Emergency Contact */}
      <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: "20px 28px", marginBottom: 20 }}>
        <h2 className="text-sm font-semibold text-brand-900 uppercase tracking-wide" style={{ marginBottom: 4 }}>
          Emergency Contact & Next of Kin
        </h2>
        <dl className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "0 40px" }}>
          <InfoRow label="Emergency Contact Name" value={profile.emergency_contact_name} />
          <InfoRow label="Emergency Contact Phone" value={profile.emergency_contact_phone} />
          <InfoRow label="Next of Kin Name" value={profile.next_of_kin_name} />
          <InfoRow label="Next of Kin Phone" value={profile.next_of_kin_phone} />
        </dl>
      </div>

      {/* Passport */}
      <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: "20px 28px", marginBottom: 20 }}>
        <h2 className="text-sm font-semibold text-brand-900 uppercase tracking-wide" style={{ marginBottom: 4 }}>
          Passport & ID
        </h2>
        <dl className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "0 40px" }}>
          <InfoRow label="Passport Number" value={profile.passport_number} />
          <InfoRow label="Place of Issue" value={profile.passport_place_of_issue} />
          <InfoRow label="Issue Date" value={fmt(profile.passport_issue_date)} />
          <InfoRow label="Expiry Date" value={fmt(profile.passport_expiry)} />
          <InfoRow label="Employee ID" value={profile.employee_id} />
          <InfoRow label="Employee Type" value={profile.employee_type} />
        </dl>
      </div>

      {/* Employment */}
      <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ padding: "20px 28px" }}>
        <h2 className="text-sm font-semibold text-brand-900 uppercase tracking-wide" style={{ marginBottom: 4 }}>
          Employment
        </h2>
        <dl className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "0 40px" }}>
          <InfoRow label="Job Title" value={profile.job_title} />
          <InfoRow label="Department" value={profile.department} />
          <InfoRow label="Work Location" value={profile.work_location} />
          <InfoRow label="Visa Route" value={profile.route} />
          <InfoRow label="Start Date" value={fmt(profile.start_date)} />
          <InfoRow label="Visa Expiry" value={fmt(profile.visa_expiry)} />
        </dl>
      </div>
    </div>
  );
}
