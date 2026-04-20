"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export type RtwVerificationMethod =
  | "physical"
  | "live_video"
  | "home_office_online"
  | "ecs"
  | "";

export type RtwVerificationChecklist = {
  verification_method: RtwVerificationMethod | null;
  identity_original_docs_seen: boolean;
  identity_in_person_or_live_video: boolean;
  identity_photo_matches_employee: boolean;
  identity_name_matches_documents: boolean;
  authenticity_documents_genuine_unaltered: boolean;
  authenticity_expiry_dates_checked: boolean;
  authenticity_work_restrictions_checked: boolean;
  online_share_code_used: boolean;
  online_share_code: string | null;
  online_profile_matches_employee: boolean;
  online_screenshot_pdf_saved: boolean;
  declaration_confirmed: boolean;
  declaration_checked_by_name: string | null;
  declaration_date: string | null;
  declaration_signature: string | null;
};

const EMPTY: RtwVerificationChecklist = {
  verification_method: null,
  identity_original_docs_seen: false,
  identity_in_person_or_live_video: false,
  identity_photo_matches_employee: false,
  identity_name_matches_documents: false,
  authenticity_documents_genuine_unaltered: false,
  authenticity_expiry_dates_checked: false,
  authenticity_work_restrictions_checked: false,
  online_share_code_used: false,
  online_share_code: null,
  online_profile_matches_employee: false,
  online_screenshot_pdf_saved: false,
  declaration_confirmed: false,
  declaration_checked_by_name: null,
  declaration_date: null,
  declaration_signature: null,
};

function mergeChecklist(raw: Partial<RtwVerificationChecklist> | null | undefined): RtwVerificationChecklist {
  return { ...EMPTY, ...raw };
}

const DECLARATION_TEXT =
  "I confirm that I have carried out a Right to Work check in line with Home Office requirements and the individual is legally permitted to work in the UK.";

const METHOD_OPTIONS: { value: Exclude<RtwVerificationMethod, ""> | ""; label: string; hint?: string }[] = [
  { value: "", label: "Select verification method…" },
  { value: "physical", label: "Physical (in-person)", hint: "Original documents must be seen" },
  { value: "live_video", label: "Live video check" },
  { value: "home_office_online", label: "Home Office online check", hint: "Share code + screenshot required" },
  { value: "ecs", label: "Employer Checking Service" },
];

type Props = {
  checklist: RtwVerificationChecklist | null | undefined;
  canEditEmployment: boolean;
  savingEmployment: boolean;
  onSave: (next: RtwVerificationChecklist) => Promise<void>;
  /** e.g. records tab: extra horizontal padding to align with DashRow */
  padded?: boolean;
};

function CheckRow({
  id,
  label,
  checked,
  disabled,
  required,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  required?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-start gap-2.5 rounded-none border bg-white px-3 py-2.5 text-[13px] leading-snug text-[#0f1f3a] ${
        required && !checked
          ? "border-[rgba(220,38,38,0.35)] bg-[rgba(254,226,226,0.35)]"
          : "border-[rgba(0,0,0,0.06)]"
      } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[rgba(0,0,0,0.2)] accent-[#0f2d5e]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="flex-1">
        {label}
        {required ? (
          <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.07em] text-[#dc2626]">required</span>
        ) : null}
      </span>
    </label>
  );
}

export function RtwVerificationChecklistSection({ checklist, canEditEmployment, savingEmployment, onSave, padded }: Props) {
  const [draft, setDraft] = useState<RtwVerificationChecklist>(() => mergeChecklist(checklist));
  const serialized = useMemo(() => JSON.stringify(mergeChecklist(checklist)), [checklist]);

  useEffect(() => {
    setDraft(mergeChecklist(checklist));
  }, [checklist, serialized]);

  const edit = canEditEmployment;
  const disabled = !edit || savingEmployment;

  const update = <K extends keyof RtwVerificationChecklist>(key: K, value: RtwVerificationChecklist[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const dirty = JSON.stringify(draft) !== JSON.stringify(mergeChecklist(checklist));

  const method = (draft.verification_method ?? "") as RtwVerificationMethod;
  const isPhysical = method === "physical";
  const isOnline = method === "home_office_online";
  const requireOriginalDocs = isPhysical;
  const requireShareCodeUsed = isOnline;
  const requireShareCodeValue = isOnline;
  const requireScreenshot = isOnline;

  const validationErrors: string[] = useMemo(() => {
    const errs: string[] = [];
    if (!draft.declaration_confirmed) return errs;
    if (requireOriginalDocs && !draft.identity_original_docs_seen) {
      errs.push("Confirm original documents have been seen for physical checks.");
    }
    if (requireShareCodeUsed && !draft.online_share_code_used) {
      errs.push("Confirm the share code was used for the online check.");
    }
    if (requireShareCodeValue && !(draft.online_share_code?.trim())) {
      errs.push("Enter the Home Office share code.");
    }
    if (requireScreenshot && !draft.online_screenshot_pdf_saved) {
      errs.push("Confirm the screenshot / PDF evidence has been saved.");
    }
    return errs;
  }, [
    draft.declaration_confirmed,
    draft.identity_original_docs_seen,
    draft.online_share_code,
    draft.online_share_code_used,
    draft.online_screenshot_pdf_saved,
    requireOriginalDocs,
    requireShareCodeUsed,
    requireShareCodeValue,
    requireScreenshot,
  ]);

  const blockSave = validationErrors.length > 0;

  const inner = (
    <div className="space-y-4">
      <div>
        <h4 className="text-[15px] font-extrabold tracking-tight text-[#0a0a0a]">Right to Work Verification Checklist</h4>
        <p className="mt-1 text-xs text-[#94a3b8]">Home Office–style verification record for this worker.</p>
      </div>

      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0D9488]" aria-hidden />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#64748b]" style={{ fontFamily: "var(--dash-mono)" }}>
            Mandatory questions (admin must complete)
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#94a3b8]">
            Step 1 choose a verification method. Step 2 complete the relevant checklist items. Step 3 sign the declaration.
          </p>
        </div>
      </div>

      {/* Step 1 — Verification method */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#0f2d5e]">
          Step 1 — Verification method
        </p>
        <select
          className="w-full max-w-md rounded-none border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-[13px] font-semibold text-[#0f1f3a] outline-none focus:border-[rgba(26,79,160,0.4)] disabled:opacity-60"
          value={method}
          disabled={disabled}
          onChange={(e) => update("verification_method", (e.target.value || null) as RtwVerificationMethod | null)}
        >
          {METHOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {method ? (
          <p className="mt-1 text-[11px] text-[#64748b]">
            {METHOD_OPTIONS.find((o) => o.value === method)?.hint ?? ""}
          </p>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#0f2d5e]">Identity verification</p>
        <div className="grid gap-2 sm:grid-cols-1">
          <CheckRow
            id="rtw-id-docs"
            label="Have original documents been seen?"
            checked={draft.identity_original_docs_seen}
            disabled={disabled}
            required={requireOriginalDocs}
            onChange={(v) => update("identity_original_docs_seen", v)}
          />
          <CheckRow
            id="rtw-id-video"
            label="Was the check done in person or live video?"
            checked={draft.identity_in_person_or_live_video}
            disabled={disabled}
            onChange={(v) => update("identity_in_person_or_live_video", v)}
          />
          <CheckRow
            id="rtw-id-photo"
            label="Does the photo match the employee?"
            checked={draft.identity_photo_matches_employee}
            disabled={disabled}
            onChange={(v) => update("identity_photo_matches_employee", v)}
          />
          <CheckRow
            id="rtw-id-name"
            label="Does the name match all documents?"
            checked={draft.identity_name_matches_documents}
            disabled={disabled}
            onChange={(v) => update("identity_name_matches_documents", v)}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#0f2d5e]">Document authenticity</p>
        <div className="grid gap-2">
          <CheckRow
            id="rtw-auth-genuine"
            label="Documents appear genuine and unaltered"
            checked={draft.authenticity_documents_genuine_unaltered}
            disabled={disabled}
            onChange={(v) => update("authenticity_documents_genuine_unaltered", v)}
          />
          <CheckRow
            id="rtw-auth-expiry"
            label="Expiry dates checked"
            checked={draft.authenticity_expiry_dates_checked}
            disabled={disabled}
            onChange={(v) => update("authenticity_expiry_dates_checked", v)}
          />
          <CheckRow
            id="rtw-auth-restrictions"
            label="Work restrictions checked"
            checked={draft.authenticity_work_restrictions_checked}
            disabled={disabled}
            onChange={(v) => update("authenticity_work_restrictions_checked", v)}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#0f2d5e]">Online check (if applicable)</p>
        <div className="grid gap-2">
          <CheckRow
            id="rtw-on-share"
            label="Share code used"
            checked={draft.online_share_code_used}
            disabled={disabled}
            required={requireShareCodeUsed}
            onChange={(v) => update("online_share_code_used", v)}
          />
          {(isOnline || (draft.online_share_code ?? "").trim()) ? (
            <label className={`block rounded-none border px-3 py-2.5 text-[13px] ${
              requireShareCodeValue && !(draft.online_share_code?.trim())
                ? "border-[rgba(220,38,38,0.35)] bg-[rgba(254,226,226,0.35)]"
                : "border-[rgba(0,0,0,0.06)] bg-white"
            }`}>
              <span className="text-[11px] font-semibold text-[#64748b]">
                Share code{requireShareCodeValue ? <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.07em] text-[#dc2626]">required</span> : null}
              </span>
              <input
                type="text"
                className="mt-1 w-full rounded-none border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-[13px] font-mono uppercase tracking-[0.14em] text-[#0f1f3a] placeholder:text-[#94a3b8]"
                placeholder="e.g. ABC-1234-XYZ"
                maxLength={24}
                value={draft.online_share_code ?? ""}
                disabled={disabled}
                onChange={(e) => update("online_share_code", e.target.value ? e.target.value : null)}
              />
            </label>
          ) : null}
          <CheckRow
            id="rtw-on-profile"
            label="Online profile matches employee"
            checked={draft.online_profile_matches_employee}
            disabled={disabled}
            onChange={(v) => update("online_profile_matches_employee", v)}
          />
          <CheckRow
            id="rtw-on-shot"
            label="Screenshot / PDF saved"
            checked={draft.online_screenshot_pdf_saved}
            disabled={disabled}
            required={requireScreenshot}
            onChange={(v) => update("online_screenshot_pdf_saved", v)}
          />
        </div>
      </div>

      <div className="rounded-none border border-[rgba(13,148,136,0.35)] bg-[rgba(13,148,136,0.06)] p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#0f766e]">Final declaration (very important)</p>
        <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-[#0f1f3a]">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[rgba(0,0,0,0.2)] accent-[#0f2d5e]"
            checked={draft.declaration_confirmed}
            disabled={disabled}
            onChange={(e) => update("declaration_confirmed", e.target.checked)}
          />
          <span>{DECLARATION_TEXT}</span>
        </label>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block text-[11px] font-semibold text-[#64748b]">
            Checked by (name)
            <input
              type="text"
              className="mt-1 w-full rounded-none border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-[13px] text-[#0f1f3a] placeholder:text-[#94a3b8]"
              placeholder="Full name"
              value={draft.declaration_checked_by_name ?? ""}
              disabled={disabled}
              onChange={(e) => update("declaration_checked_by_name", e.target.value ? e.target.value : null)}
            />
          </label>
          <label className="block text-[11px] font-semibold text-[#64748b]">
            Date
            <input
              type="date"
              className="mt-1 w-full rounded-none border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-[13px] text-[#0f1f3a]"
              value={draft.declaration_date ?? ""}
              disabled={disabled}
              onChange={(e) => update("declaration_date", e.target.value || null)}
            />
          </label>
          <label className="block text-[11px] font-semibold text-[#64748b]">
            Signature / e-sign
            <input
              type="text"
              className="mt-1 w-full rounded-none border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-[13px] text-[#0f1f3a] placeholder:text-[#94a3b8]"
              placeholder="Typed name is acceptable"
              value={draft.declaration_signature ?? ""}
              disabled={disabled}
              onChange={(e) => update("declaration_signature", e.target.value ? e.target.value : null)}
            />
          </label>
        </div>
      </div>

      {edit && validationErrors.length > 0 ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-none border border-[rgba(220,38,38,0.35)] bg-[rgba(254,226,226,0.35)] px-3 py-2.5 text-[12px] text-[#991b1b]"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <ul className="list-disc space-y-0.5 pl-4">
            {validationErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {edit ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!dirty || savingEmployment || blockSave}
            onClick={() => onSave(draft)}
            className="inline-flex h-9 items-center border border-[rgba(0,0,0,0.12)] bg-[#0f2d5e] px-4 text-[10px] font-bold uppercase tracking-[0.07em] text-white transition-colors hover:bg-[#1a4fa0] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ fontFamily: "var(--dash-mono)" }}
          >
            {savingEmployment ? "Saving…" : "Save checklist"}
          </button>
          {dirty && !blockSave ? <span className="text-[11px] text-[#94a3b8]">Unsaved changes</span> : null}
        </div>
      ) : null}
    </div>
  );

  if (padded) {
    return <div className="border-t border-[#EEF3FA] px-5 py-4">{inner}</div>;
  }
  return (
    <div className="mt-4 border-t border-[rgba(0,0,0,0.08)] pt-4">
      {inner}
    </div>
  );
}
