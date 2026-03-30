"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import {
  DASHBOARD_FEATURE_OPTIONS,
  DASHBOARD_FEATURE_PREF_ROLES,
  DEFAULT_DASHBOARD_FEATURES,
  orderDashboardFeatures,
  type DashboardFeatureKey,
} from "@/lib/dashboard-features";
import "../dashboard-marketing.css";

export default function DashboardCustomizePage() {
  const { token, user } = useAuth();
  const canManage = user ? (DASHBOARD_FEATURE_PREF_ROLES as readonly string[]).includes(user.role) : false;

  const [selected, setSelected] = useState<DashboardFeatureKey[]>(DEFAULT_DASHBOARD_FEATURES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedOk, setSavedOk] = useState(false);

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

  useEffect(() => {
    if (!token || !canManage) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const r = await api.get<{ features: string[] }>("/organisation/dashboard-features", token);
        if (!cancelled) setSelected(orderDashboardFeatures(r.features));
      } catch {
        if (!cancelled) setSelected([...DEFAULT_DASHBOARD_FEATURES]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, canManage]);

  const toggle = (key: DashboardFeatureKey) => {
    const has = selected.includes(key);
    if (has && selected.length === 1) return;
    const nextRaw = has ? selected.filter((k) => k !== key) : [...selected, key];
    setSelected(DEFAULT_DASHBOARD_FEATURES.filter((k) => nextRaw.includes(k)));
    setSavedOk(false);
  };

  const save = async () => {
    if (!token || !canManage) return;
    if (selected.length === 0) {
      setError("Keep at least one section visible.");
      return;
    }
    setError("");
    setSaving(true);
    setSavedOk(false);
    try {
      const resp = await api.patch<{ features: string[] }>(
        "/organisation/dashboard-features",
        { features: selected },
        token
      );
      setSelected(orderDashboardFeatures(resp.features));
      setSavedOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return (
      <div className="protexi-dash-marketing flex flex-col gap-0">
        <div className="adm-ph">
          <div>
            <div className="adm-ph-ey">Sponsor Compliance</div>
            <h1 className="adm-ph-title">
              Dashboard <em className="dash-title-em">layout</em>
            </h1>
            <div className="adm-ph-date">{today}</div>
          </div>
        </div>
        <div className="dash-customize-panel">
          <p className="text-sm text-[#64748b]">
            Only organisation managers and HR can change which dashboard sections are shown.
          </p>
          <Link href="/dashboard" className="adm-view-all mt-4 inline-flex w-fit items-center gap-1 no-underline">
            Back to overview
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="protexi-dash-marketing flex flex-col gap-0">
      <div className="adm-ph">
        <div>
          <div className="adm-ph-ey">Sponsor Compliance</div>
          <h1 className="adm-ph-title">
            Dashboard <em className="dash-title-em">layout</em>
          </h1>
          <div className="adm-ph-date">{today}</div>
        </div>
      </div>

      <div className="dash-customize-panel">
        <p className="dash-customize-lead">
          Choose which sections appear on the compliance overview for everyone in your organisation.
        </p>

        {loading ? (
          <div className="mt-8 flex justify-center py-12">
            <Loader2 className="h-9 w-9 animate-spin text-[#1a4fa0]" />
          </div>
        ) : (
          <>
            <ul className="mt-6 space-y-2">
              {DASHBOARD_FEATURE_OPTIONS.map((opt) => (
                <li key={opt.key}>
                  <label className="flex cursor-pointer items-start gap-3 border border-[#E8EEFF] bg-white px-3 py-2.5 transition hover:bg-[#F8FAFF]">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#1a4fa0] focus:ring-[#1a4fa0]"
                      checked={selected.includes(opt.key)}
                      disabled={saving || (selected.length === 1 && selected.includes(opt.key))}
                      onChange={() => toggle(opt.key)}
                    />
                    <span className="text-sm font-semibold text-[#0a0f1e]">{opt.label}</span>
                  </label>
                </li>
              ))}
            </ul>

            {error ? (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            {savedOk ? (
              <p className="mt-4 text-sm font-semibold text-[#0f2d5e]">
                Saved. Open Overview to see your dashboard.
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || loading}
                className="dash-admin-note-save min-h-10 px-6 py-2.5 text-[12px] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save layout"}
              </button>
              <Link href="/dashboard" className="adm-view-all inline-flex min-h-10 items-center no-underline">
                Cancel
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
