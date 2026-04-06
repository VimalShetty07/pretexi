"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

type ApiRow = { id: string; description: string; category: string | null; sort_order: number };

export type ChecklistTemplateDraft = {
  description: string;
  category: string;
  sort_order: number;
};

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token || !organisationId) return;
      try {
        setLoading(true);
        setError("");
        const data = await api.get<ApiRow[]>(`/organisations/${organisationId}/checklist-template`, token);
        if (cancelled) return;
        setRows(
          data.length
            ? data.map((r) => ({
                description: r.description,
                category: r.category ?? "",
                sort_order: r.sort_order,
              }))
            : [{ description: "", category: "", sort_order: 0 }]
        );
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Could not load checklist template (API may not support per-tenant templates yet)."
          );
          setRows([{ description: "", category: "", sort_order: 0 }]);
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
    const items = rows
      .map((r, i) => ({
        description: r.description.trim(),
        category: r.category.trim() || null,
        sort_order: r.sort_order !== 0 ? r.sort_order : i,
      }))
      .filter((r) => r.description.length > 0);
    if (items.length === 0) {
      setError("Add at least one document description.");
      return;
    }
    setSaving(true);
    setError("");
    setSavedMsg("");
    try {
      const out = await api.put<ApiRow[]>(
        `/organisations/${organisationId}/checklist-template`,
        { items },
        token
      );
      setRows(
        out.map((r: ApiRow) => ({
          description: r.description,
          category: r.category ?? "",
          sort_order: r.sort_order,
        }))
      );
      setSavedMsg("Template saved. Existing checklist progress for this organisation was reset.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

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
          <h3 className="text-[11px] font-extrabold text-[#0a0a0a]">Required documents (checklist)</h3>
          <p className="mt-0.5 max-w-3xl text-[10px] leading-relaxed text-[#64748b]" style={MONO}>
            Define which documents each worker must upload. Categories group rows on the employee Checklist tab. Saving
            replaces the whole list and resets progress.
          </p>
        </div>
        <span className="wem-badge-mono" style={MONO}>
          {rows.length} {rows.length === 1 ? "item" : "items"}
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
              key={`${idx}-${row.sort_order}-${(row.description ?? "").slice(0, 8)}`}
              className="grid grid-cols-1 items-end gap-3 border border-[rgba(0,0,0,0.08)] bg-white p-3 md:grid-cols-12"
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
              <label className="md:col-span-3">
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
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center border border-[rgba(220,38,38,0.25)] bg-white text-[#991b1b] hover:bg-[rgba(254,242,242,0.85)]"
                    onClick={() => {
                      const next = rows.filter((_, i) => i !== idx);
                      setRows(next.length ? next : [{ description: "", category: "", sort_order: 0 }]);
                    }}
                    aria-label="Remove row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {canEdit && (
          <div className="mt-3 flex items-center justify-between gap-2 border border-[rgba(0,0,0,0.08)] bg-[#f8fafc] px-3 py-2">
            <p className="text-[10px] text-[#64748b]" style={MONO}>
              Add or remove rows, then save template.
            </p>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-2 border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[9px] font-bold uppercase tracking-[0.07em] text-[var(--dash-blue)] hover:bg-[rgba(26,79,160,0.08)]"
              style={MONO}
              onClick={() => setRows([...rows, { description: "", category: "", sort_order: rows.length }])}
            >
              <Plus className="h-3.5 w-3.5" /> Add document type
            </button>
          </div>
        )}

        {!canEdit && (
          <p className="mt-3 text-[11px] text-[#94a3b8]" style={MONO}>
            You can view this template; only admins can change it.
          </p>
        )}
      </div>
    </div>
  );
}
