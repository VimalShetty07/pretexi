export type DashboardFeatureKey =
  | "admin_chat"
  | "admin_notes"
  | "stats"
  | "cos"
  | "charts"
  | "visa_alerts"
  | "quick_actions"
  | "activity";

export const DASHBOARD_FEATURE_PREF_ROLES = [
  "super_admin",
  "tenant_admin",
  "compliance_manager",
  "hr_officer",
] as const;

/** Default view is minimal: just stat cards + HR manager notes textbox. */
export const DEFAULT_DASHBOARD_FEATURES: DashboardFeatureKey[] = [
  "stats",
  "admin_notes",
];

/** Canonical display order for whichever sections are enabled. */
const FEATURE_DISPLAY_ORDER: DashboardFeatureKey[] = [
  "stats",
  "admin_notes",
  "admin_chat",
  "cos",
  "charts",
  "visa_alerts",
  "quick_actions",
  "activity",
];

export const DASHBOARD_FEATURE_OPTIONS: { key: DashboardFeatureKey; label: string }[] = [
  { key: "stats", label: "Stat cards" },
  { key: "admin_notes", label: "HR / Manager notes" },
  { key: "admin_chat", label: "Admin chat" },
  { key: "cos", label: "CoS overview" },
  { key: "charts", label: "Compliance charts" },
  { key: "visa_alerts", label: "Visa expiry alerts" },
  { key: "quick_actions", label: "Quick actions" },
  { key: "activity", label: "Attention & activity" },
];

export function orderDashboardFeatures(raw: string[] | undefined | null): DashboardFeatureKey[] {
  const filtered = raw?.filter((k): k is DashboardFeatureKey =>
    FEATURE_DISPLAY_ORDER.includes(k as DashboardFeatureKey)
  );
  const ordered = FEATURE_DISPLAY_ORDER.filter((k) => filtered?.includes(k));
  return ordered.length ? ordered : [...DEFAULT_DASHBOARD_FEATURES];
}
