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

  if (loading) return <p className="text-sm text-gray-500">Loading checklist template…</p>;

  return (
    <div className="data-card" style={{ padding: 16 }}>
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Required documents (checklist)</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-3xl">
            Define which documents each worker must upload for this client. Optional categories group rows on the employee
            Checklist tab. Saving replaces the whole list and removes existing checklist progress for this organisation.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save template
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      {savedMsg && <p className="text-xs text-emerald-600 mt-2">{savedMsg}</p>}

      <div className="mt-4 space-y-2">
        {rows.map((row, idx) => (
          <div
            key={`${idx}-${row.sort_order}-${row.description.slice(0, 8)}`}
            className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end border border-gray-100 rounded-lg p-2 bg-gray-50/80"
          >
            <label className="md:col-span-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
              Order
              <input
                type="number"
                className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-sm bg-white"
                value={row.sort_order}
                onChange={(e) => {
                  const next = [...rows];
                  next[idx] = { ...row, sort_order: Number(e.target.value) || 0 };
                  setRows(next);
                }}
                disabled={!canEdit}
              />
            </label>
            <label className="md:col-span-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
              Category (optional)
              <input
                className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-sm bg-white"
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
            <label
              className={
                canEdit
                  ? "md:col-span-7 text-[10px] font-semibold text-gray-500 uppercase tracking-wide"
                  : "md:col-span-8 text-[10px] font-semibold text-gray-500 uppercase tracking-wide"
              }
            >
              Document description
              <input
                className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-sm bg-white"
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
              <div className="md:col-span-1 flex justify-end pb-0.5">
                <button
                  type="button"
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
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
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB]"
          onClick={() => setRows([...rows, { description: "", category: "", sort_order: rows.length }])}
        >
          <Plus className="h-3.5 w-3.5" /> Add document type
        </button>
      )}

      {!canEdit && (
        <p className="text-xs text-gray-500 mt-3">You can view this template; only admins can change it.</p>
      )}
    </div>
  );
}
