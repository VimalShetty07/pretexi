"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Loader2, Info } from "lucide-react";
import { api } from "@/lib/api";

type ApiRow = {
  id: string;
  description: string;
  category: string | null;
  sort_order: number;
  is_active?: boolean;
};

export type ChecklistTemplateDraft = {
  id?: string;
  description: string;
  category: string;
  sort_order: number;
  /** Template lines are never deleted — only deactivated (hidden from employees). */
  is_active: boolean;
};

/** Server default when no custom template is saved — three active rows (same as API fallback). */
const DEFAULT_CHECKLIST_ROWS: ChecklistTemplateDraft[] = [
  {
    description: "Right to work evidence (share code, acceptable online check, or eligible visa)",
    category: "Right to work",
    sort_order: 0,
    is_active: true,
  },
  {
    description: "Passport or national ID — photo page",
    category: "Identity",
    sort_order: 1,
    is_active: true,
  },
  {
    description: "Current visa or BRP (if applicable)",
    category: "Immigration",
    sort_order: 2,
    is_active: true,
  },
];

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

const CHECKLIST_TEMPLATE_BEHAVIOUR_NOTE =
  "Until you save a template, employees see three default required documents (all active). Each line can be active or inactive — you cannot delete saved lines; deactivate them instead. New lines are appended for every employee as empty checklist items without changing existing uploads or verification.";

function emptyRow(sortIndex: number): ChecklistTemplateDraft {
  return { description: "", category: "", sort_order: sortIndex, is_active: true };
}

function mapApiToDraft(data: ApiRow[]): ChecklistTemplateDraft[] {
  return data.map((r) => ({
    id: r.id,
    description: r.description,
    category: r.category ?? "",
    sort_order: r.sort_order,
    is_active: r.is_active !== false,
  }));
}

export function ChecklistTemplateEditor({
  token,
  organisationId,
  canEdit,
}: {
  token: string;
  organisationId: string;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<ChecklistTemplateDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  /** When GET returns 404 — we show defaults but server had no template; Save creates it */
  const [infoMsg, setInfoMsg] = useState("");
  const [behaviourNoteOpen, setBehaviourNoteOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token || !organisationId) return;
      try {
        setLoading(true);
        setError("");
        setInfoMsg("");
        const data = await api.get<ApiRow[]>(`/organisations/${organisationId}/checklist-template`, token);
        if (cancelled) return;
        setRows(data.length ? mapApiToDraft(data) : DEFAULT_CHECKLIST_ROWS.map((r) => ({ ...r })));
        if (!data.length) {
          setInfoMsg(
            "No rows saved on the server yet — these are suggested defaults. Click Save template to store your list."
          );
        }
      } catch (e) {
        if (!cancelled) {
          const raw = e instanceof Error ? e.message : "";
          const looks404 =
            /404|not\s*found/i.test(raw) || raw.trim().toLowerCase() === "not found";
          if (looks404) {
            setError("");
            setInfoMsg(
              "No checklist template on the server yet (first-time setup). The rows below are suggestions — click Save template to create it. Until then, employee checklists may not match this preview."
            );
          } else {
            setError(raw || "Could not load checklist template.");
          }
          setRows(DEFAULT_CHECKLIST_ROWS.map((r) => ({ ...r })));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, organisationId]);

  const save = async () => {
    if (!canEdit) return;
    const hasActive = rows.some((r) => r.is_active && r.description.trim().length > 0);
    if (!hasActive) {
      setError("Keep at least one active row with a document description.");
      return;
    }
    const items = rows
      .filter((r) => r.description.trim().length > 0)
      .map((r, i) => ({
        id: r.id ?? null,
        description: r.description.trim(),
        category: r.category.trim() || null,
        sort_order: r.sort_order !== 0 ? r.sort_order : i,
        is_active: r.is_active,
      }));
    if (items.length === 0) {
      setError("Add at least one document description.");
      return;
    }
    setSaving(true);
    setError("");
    setSavedMsg("");
    setInfoMsg("");
    try {
      const out = await api.put<ApiRow[]>(
        `/organisations/${organisationId}/checklist-template`,
        { items },
        token
      );
      setRows(mapApiToDraft(out));
      setSavedMsg(
        "Template saved. Existing employee checklist progress is kept. New lines are added for everyone as empty items. Deactivated lines stay on file but are hidden from employees."
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("protexi-checklist-template-saved"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const activeCount = rows.filter((r) => r.is_active).length;

  if (loading) {
    return (
      <div className="mb-4 wem-surface">
        <div className="wem-toolbar">
          <span className="text-[11px] font-extrabold text-[#0a0a0a]">Required documents (checklist)</span>
          <span className="wem-badge-mono" style={MONO}>Template</span>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
          <p className="text-[12px] text-[#94a3b8]" style={MONO}>
            Loading checklist template…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 wem-surface">
      <div className="wem-toolbar">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[11px] font-extrabold text-[#0a0a0a]">Required documents (checklist)</h3>
            <button
              type="button"
              onClick={() => setBehaviourNoteOpen((v) => !v)}
              aria-expanded={behaviourNoteOpen}
              aria-controls="checklist-template-behaviour-note"
              className="inline-flex h-7 shrink-0 items-center gap-1.5 border border-[rgba(0,0,0,0.1)] bg-[#f8fafc] px-2 text-[9px] font-bold uppercase tracking-[0.07em] text-[#475569] transition-colors hover:border-[rgba(26,79,160,0.25)] hover:bg-[rgba(26,79,160,0.06)] hover:text-[#1a4fa0]"
              style={MONO}
            >
              <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {behaviourNoteOpen ? "Hide note" : "Note"}
            </button>
          </div>
        </div>
        <span className="wem-badge-mono" style={MONO}>
          {activeCount} active · {rows.length} total
        </span>
        {canEdit && (
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex h-8 shrink-0 items-center gap-2 border border-[rgba(0,0,0,0.12)] bg-[#0f2d5e] px-3 text-[9px] font-bold uppercase tracking-[0.07em] text-white hover:bg-[#1a4fa0] disabled:opacity-50"
            style={MONO}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save template
          </button>
        )}
      </div>
      <div className="border-t border-[rgba(0,0,0,0.07)] bg-white p-4">
        {behaviourNoteOpen ? (
          <div
            id="checklist-template-behaviour-note"
            className="mb-3 border border-[rgba(0,0,0,0.08)] bg-[#fafbfc] px-3 py-2.5"
          >
            <p className="text-[10px] leading-relaxed text-[#64748b]" style={MONO}>
              {CHECKLIST_TEMPLATE_BEHAVIOUR_NOTE}
            </p>
          </div>
        ) : null}
        {infoMsg && (
          <p className="mb-2 border border-[rgba(26,79,160,0.2)] bg-[rgba(26,79,160,0.06)] px-3 py-2 text-[11px] leading-relaxed text-[#0f2d5e]" style={MONO}>
            {infoMsg}
          </p>
        )}
        {error && (
          <p className="mb-2 text-[11px] text-[#dc2626]" style={MONO}>
            {error}
          </p>
        )}
        {savedMsg && (
          <p className="mb-2 text-[11px] text-[#166534]" style={MONO}>
            {savedMsg}
          </p>
        )}

        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div
              key={row.id || `draft-${idx}-${row.sort_order}`}
              className={`grid grid-cols-1 items-end gap-3 border border-[rgba(0,0,0,0.08)] bg-white p-3 md:grid-cols-12 ${row.is_active ? "" : "opacity-55"}`}
            >
              <label className="md:col-span-1">
                <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={MONO}>
                  Order
                </span>
                <input
                  type="number"
                  className="mt-1 h-9 w-full border border-[rgba(0,0,0,0.12)] bg-white px-2 text-[13px] outline-none focus:border-[var(--dash-blue)]"
                  value={row.sort_order}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, sort_order: Number(e.target.value) || 0 };
                    setRows(next);
                  }}
                  disabled={!canEdit}
                />
              </label>
              <label className="flex flex-col gap-1 md:col-span-1">
                <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={MONO}>
                  Active
                </span>
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 border border-[rgba(0,0,0,0.2)]"
                  checked={row.is_active}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, is_active: e.target.checked };
                    setRows(next);
                  }}
                  disabled={!canEdit}
                />
              </label>
              <label className="md:col-span-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={MONO}>
                  Category (optional)
                </span>
                <input
                  className="mt-1 h-9 w-full border border-[rgba(0,0,0,0.12)] bg-white px-2 text-[13px] outline-none focus:border-[var(--dash-blue)]"
                  value={row.category}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, category: e.target.value };
                    setRows(next);
                  }}
                  disabled={!canEdit}
                  placeholder="e.g. Identity"
                />
              </label>
              <label className={canEdit ? "md:col-span-7" : "md:col-span-8"}>
                <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={MONO}>
                  Document description
                </span>
                <input
                  className="mt-1 h-9 w-full border border-[rgba(0,0,0,0.12)] bg-white px-2 text-[13px] outline-none focus:border-[var(--dash-blue)]"
                  value={row.description}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, description: e.target.value };
                    setRows(next);
                  }}
                  disabled={!canEdit}
                  placeholder="e.g. Copy of passport"
                />
              </label>
              {canEdit && (
                <div className="flex justify-end pb-0.5 md:col-span-1">
                  {!row.id ? (
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center border border-[rgba(220,38,38,0.25)] bg-white text-[#991b1b] hover:bg-[rgba(254,242,242,0.85)]"
                      onClick={() => {
                        const next = rows.filter((_, i) => i !== idx);
                        setRows(
                          next.length
                            ? next.map((r, i) => ({ ...r, sort_order: i }))
                            : [emptyRow(0)]
                        );
                      }}
                      aria-label="Remove unsaved row"
                      title="Remove draft row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="text-[9px] text-[#94a3b8]" style={MONO} title="Saved lines cannot be deleted">
                      —
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {canEdit && (
          <div className="mt-3 flex items-center justify-between gap-2 border border-[rgba(0,0,0,0.08)] bg-[#f8fafc] px-3 py-2">
            <p className="text-[10px] text-[#64748b]" style={MONO}>
              Add new document types, then save. Use Active to retire a saved line (it cannot be deleted).
            </p>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-2 border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[9px] font-bold uppercase tracking-[0.07em] text-[var(--dash-blue)] hover:bg-[rgba(26,79,160,0.08)]"
              style={MONO}
              onClick={() =>
                setRows([...rows, { description: "", category: "", sort_order: rows.length, is_active: true }])
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add document type
            </button>
          </div>
        )}

        {!canEdit && (
          <p className="mt-3 text-[11px] text-[#94a3b8]" style={MONO}>
            View only. Tenant admins, compliance managers, and super admins can edit this template.
          </p>
        )}
      </div>
    </div>
  );
}
