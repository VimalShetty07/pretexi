"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { Camera, Pencil, Trash2 } from "lucide-react";
import "../../dashboard/dashboard-marketing.css";

interface WorkerDetail {
  id: string;
  name: string;
  has_profile_photo?: boolean;
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

type ProfileDraft = {
  first_name: string;
  last_name: string;
  phone: string;
  personal_email: string;
  address: string;
  postal_code: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  next_of_kin_name: string;
  next_of_kin_phone: string;
};

function draftFromProfile(p: WorkerDetail): ProfileDraft {
  return {
    first_name: p.first_name ?? "",
    last_name: p.last_name ?? "",
    phone: p.phone ?? "",
    personal_email: p.personal_email ?? "",
    address: p.address ?? "",
    postal_code: p.postal_code ?? "",
    emergency_contact_name: p.emergency_contact_name ?? "",
    emergency_contact_phone: p.emergency_contact_phone ?? "",
    next_of_kin_name: p.next_of_kin_name ?? "",
    next_of_kin_phone: p.next_of_kin_phone ?? "",
  };
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="portal-dl-row">
      <div className="portal-dl-label">{label}</div>
      <div className="portal-dl-value">{value || "—"}</div>
    </div>
  );
}

function PortalField({
  label,
  value,
  editing,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange?: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="portal-dl-row">
      <div className="portal-dl-label">{label}</div>
      {editing && onChange ? (
        multiline ? (
          <textarea
            className="portal-details-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            autoComplete="street-address"
          />
        ) : (
          <input
            type="text"
            className="portal-details-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="off"
          />
        )
      ) : (
        <div className="portal-dl-value">{value || "—"}</div>
      )}
    </div>
  );
}

export default function PortalDetailsPage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<WorkerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [profilePhotoCacheKey, setProfilePhotoCacheKey] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);

  const initials = useMemo(() => {
    if (!profile?.name) return "?";
    const parts = profile.name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  }, [profile?.name]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    []
  );

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

  const handleProfilePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file || !token) return;
    setPhotoUploading(true);
    setPhotoError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.postForm("/portal/me/profile-photo", fd, token);
      await fetchProfile();
      setProfilePhotoCacheKey((k) => k + 1);
    } catch (err: unknown) {
      setPhotoError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setPhotoUploading(false);
      input.value = "";
    }
  };

  const handleRemoveProfilePhoto = async () => {
    if (!token) return;
    setPhotoUploading(true);
    setPhotoError("");
    try {
      await api.delete("/portal/me/profile-photo", token);
      await fetchProfile();
    } catch (err: unknown) {
      setPhotoError(err instanceof Error ? err.message : "Could not remove photo");
    } finally {
      setPhotoUploading(false);
    }
  };

  const startEdit = () => {
    if (!profile) return;
    setDraft(draftFromProfile(profile));
    setEditMode(true);
    setSaveError("");
    setSaveOk(false);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setDraft(null);
    setSaveError("");
  };

  const saveProfile = async () => {
    if (!token || !draft) return;
    setSaving(true);
    setSaveError("");
    try {
      const body = {
        first_name: draft.first_name.trim() || null,
        last_name: draft.last_name.trim() || null,
        phone: draft.phone.trim() || null,
        personal_email: draft.personal_email.trim() || null,
        address: draft.address.trim() || null,
        postal_code: draft.postal_code.trim() || null,
        emergency_contact_name: draft.emergency_contact_name.trim() || null,
        emergency_contact_phone: draft.emergency_contact_phone.trim() || null,
        next_of_kin_name: draft.next_of_kin_name.trim() || null,
        next_of_kin_phone: draft.next_of_kin_phone.trim() || null,
      };
      const updated = await api.patch<WorkerDetail>("/portal/me", body, token);
      setProfile(updated);
      setEditMode(false);
      setDraft(null);
      setSaveOk(true);
      window.setTimeout(() => setSaveOk(false), 5000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!token || !profile?.id || !profile.has_profile_photo) {
      setProfilePhotoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/workers/${profile.id}/profile-photo?cb=${profilePhotoCacheKey}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }
        );
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
  }, [token, profile?.id, profile?.has_profile_photo, profilePhotoCacheKey]);

  if (loading) {
    return (
      <div className="protexi-dash-marketing-loading" role="status" aria-live="polite">
        Loading your details&hellip;
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="protexi-dash-marketing flex flex-col gap-0">
        <div className="portal-details-stack p-0">
          <div className="adm-card">
            <div className="adm-card-body">
              <div className="portal-details-alert portal-details-alert-error" role="alert">
                No employee profile linked to your account.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const d = draft ?? draftFromProfile(profile);
  const emailLink = (email: string | null) =>
    email ? (
      <a href={`mailto:${email}`} className="text-[#1a4fa0] underline decoration-black/15 underline-offset-2 hover:decoration-[#1a4fa0]">
        {email}
      </a>
    ) : (
      "—"
    );

  const setField = (key: keyof ProfileDraft, value: string) => {
    setDraft((prev) => ({ ...(prev ?? draftFromProfile(profile)), [key]: value }));
  };

  return (
    <div className="protexi-dash-marketing flex flex-col gap-0">
      <div className="adm-ph-portal">
        <div className="min-w-0 flex-1">
          <div className="adm-ph-ey">Employee portal</div>
          <h1 className="adm-ph-title">
            My <em className="dash-title-em">details</em>
          </h1>
          <div className="adm-ph-date">{today}</div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {editMode ? (
            <>
              <button type="button" className="portal-photo-btn" onClick={cancelEdit} disabled={saving}>
                Cancel
              </button>
              <button
                type="button"
                className="portal-photo-btn portal-photo-btn-primary"
                onClick={saveProfile}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <button type="button" className="portal-photo-btn inline-flex items-center gap-2" onClick={startEdit}>
              <Pencil className="h-3.5 w-3.5 shrink-0" />
              Edit details
            </button>
          )}
        </div>
      </div>

      {saveOk ? (
        <div className="portal-details-save-ok" role="status">
          Your changes have been saved.
        </div>
      ) : null}
      {saveError ? (
        <div className="portal-details-alert portal-details-alert-error mb-2" role="alert">
          {saveError}
        </div>
      ) : null}

      <div className="portal-details-stack">
        <div className="adm-card">
          <div className="adm-card-h border-b pb-3">
            <div>
              <div className="adm-card-title">Profile photo</div>
            </div>
          </div>
          <div className="adm-card-body">
            {photoError ? (
              <div className="portal-details-alert portal-details-alert-error" role="alert">
                {photoError}
              </div>
            ) : null}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="portal-photo-avatar">
                {profilePhotoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={profilePhotoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <p className="portal-photo-lead">JPEG, PNG, WebP or GIF · max 5 MB.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    className={`portal-photo-btn relative inline-flex min-h-[40px] cursor-pointer items-center ${
                      photoUploading || editMode ? "pointer-events-none opacity-60" : ""
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={photoUploading || editMode}
                      className="absolute inset-0 z-[1] h-full w-full cursor-pointer opacity-0"
                      onChange={handleProfilePhotoSelect}
                      aria-label={profile.has_profile_photo ? "Replace profile photo" : "Upload profile photo"}
                    />
                    <span className="pointer-events-none relative z-0 flex items-center gap-2">
                      <Camera className="h-3.5 w-3.5 shrink-0" />
                      {photoUploading ? "Working…" : profile.has_profile_photo ? "Replace photo" : "Upload photo"}
                    </span>
                  </label>
                  {profile.has_profile_photo ? (
                    <button
                      type="button"
                      disabled={photoUploading || editMode}
                      onClick={handleRemoveProfilePhoto}
                      className="portal-photo-btn portal-photo-btn-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-h border-b pb-3">
            <div>
              <div className="adm-card-title">Personal information</div>
              <div className="adm-card-sub">
                {editMode
                  ? "Work email, date of birth, nationality, and ID fields are read-only. Contact HR to change those."
                  : "Identity and contact details on file"}
              </div>
            </div>
          </div>
          <div className="adm-card-body">
            <div className="portal-dl">
              <PortalField
                label="First name"
                value={d.first_name}
                editing={editMode}
                onChange={(v) => setField("first_name", v)}
              />
              <PortalField
                label="Last name"
                value={d.last_name}
                editing={editMode}
                onChange={(v) => setField("last_name", v)}
              />
              <InfoRow label="Email (work)" value={emailLink(profile.email)} />
              <PortalField
                label="Personal email"
                value={d.personal_email}
                editing={editMode}
                onChange={(v) => setField("personal_email", v)}
              />
              <PortalField
                label="Phone"
                value={d.phone}
                editing={editMode}
                onChange={(v) => setField("phone", v)}
              />
              <PortalField
                label="Address"
                value={d.address}
                editing={editMode}
                onChange={(v) => setField("address", v)}
                multiline
              />
              <PortalField
                label="Postal code"
                value={d.postal_code}
                editing={editMode}
                onChange={(v) => setField("postal_code", v)}
              />
              <InfoRow label="Date of birth" value={fmt(profile.date_of_birth)} />
              <InfoRow label="Nationality" value={profile.nationality} />
              <InfoRow label="Gender" value={profile.gender} />
              <InfoRow label="Place of birth" value={profile.place_of_birth} />
              <InfoRow label="Country of birth" value={profile.country_of_birth} />
              <InfoRow label="NI number" value={profile.ni_number} />
            </div>
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-h border-b pb-3">
            <div>
              <div className="adm-card-title">Emergency contact and next of kin</div>
            </div>
          </div>
          <div className="adm-card-body">
            <div className="portal-dl">
              <PortalField
                label="Emergency contact name"
                value={d.emergency_contact_name}
                editing={editMode}
                onChange={(v) => setField("emergency_contact_name", v)}
              />
              <PortalField
                label="Emergency contact phone"
                value={d.emergency_contact_phone}
                editing={editMode}
                onChange={(v) => setField("emergency_contact_phone", v)}
              />
              <PortalField
                label="Next of kin name"
                value={d.next_of_kin_name}
                editing={editMode}
                onChange={(v) => setField("next_of_kin_name", v)}
              />
              <PortalField
                label="Next of kin phone"
                value={d.next_of_kin_phone}
                editing={editMode}
                onChange={(v) => setField("next_of_kin_phone", v)}
              />
            </div>
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-h border-b pb-3">
            <div>
              <div className="adm-card-title">Passport and ID</div>
            </div>
          </div>
          <div className="adm-card-body">
            <div className="portal-dl">
              <InfoRow label="Passport number" value={profile.passport_number} />
              <InfoRow label="Place of issue" value={profile.passport_place_of_issue} />
              <InfoRow label="Issue date" value={fmt(profile.passport_issue_date)} />
              <InfoRow label="Expiry date" value={fmt(profile.passport_expiry)} />
              <InfoRow label="Employee ID" value={profile.employee_id} />
              <InfoRow label="Employee type" value={profile.employee_type} />
            </div>
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-h border-b pb-3">
            <div>
              <div className="adm-card-title">Employment</div>
              <div className="adm-card-sub">Role and sponsorship snapshot</div>
            </div>
          </div>
          <div className="adm-card-body">
            <div className="portal-dl">
              <InfoRow label="Job title" value={profile.job_title} />
              <InfoRow label="Department" value={profile.department} />
              <InfoRow label="Work location" value={profile.work_location} />
              <InfoRow label="Visa route" value={profile.route} />
              <InfoRow label="Start date" value={fmt(profile.start_date)} />
              <InfoRow label="Visa expiry" value={fmt(profile.visa_expiry)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
