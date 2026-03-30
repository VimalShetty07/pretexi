export type DashboardFeatureKey =
  | "admin_chat"
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

export const DEFAULT_DASHBOARD_FEATURES: DashboardFeatureKey[] = [
  "admin_chat",
  "stats",
  "cos",
  "charts",
  "visa_alerts",
  "quick_actions",
  "activity",
];

export const DASHBOARD_FEATURE_OPTIONS: { key: DashboardFeatureKey; label: string }[] = [
  { key: "admin_chat", label: "Admin chat" },
  { key: "stats", label: "Stat cards" },
  { key: "cos", label: "CoS overview" },
  { key: "charts", label: "Compliance charts" },
  { key: "visa_alerts", label: "Visa expiry alerts" },
  { key: "quick_actions", label: "Quick actions" },
  { key: "activity", label: "Attention & activity" },
];

export function orderDashboardFeatures(raw: string[] | undefined | null): DashboardFeatureKey[] {
  const filtered = raw?.filter((k): k is DashboardFeatureKey =>
    DEFAULT_DASHBOARD_FEATURES.includes(k as DashboardFeatureKey)
  );
  const ordered = DEFAULT_DASHBOARD_FEATURES.filter((k) => filtered?.includes(k));
  return ordered.length ? ordered : [...DEFAULT_DASHBOARD_FEATURES];
}
