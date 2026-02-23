export type UserRole =
  | "super_admin"
  | "compliance_manager"
  | "hr_officer"
  | "payroll_officer"
  | "inspector"
  | "employee";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  organisation_id: string;
  worker_id?: string | null;
  last_login?: string | null;
}

/**
 * Which roles can access which routes.
 * If a route is not listed here, it's accessible to all authenticated users.
 */
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/dashboard":     ["super_admin", "compliance_manager", "hr_officer", "payroll_officer", "inspector"],
  "/workers":       ["super_admin", "compliance_manager", "hr_officer", "payroll_officer", "inspector"],
  "/leave":         ["super_admin", "compliance_manager", "hr_officer"],
  "/calendar":      ["super_admin", "compliance_manager", "hr_officer", "payroll_officer"],
  "/organisation":  ["super_admin", "compliance_manager"],
  "/documents":     ["super_admin", "compliance_manager", "hr_officer"],
  "/reports":       ["super_admin", "compliance_manager"],
  "/risk":          ["super_admin", "compliance_manager"],
  "/settings":      ["super_admin"],
  "/portal":        ["employee"],
};

/**
 * Where to redirect each role after login.
 */
export const ROLE_HOME: Record<UserRole, string> = {
  super_admin: "/dashboard",
  compliance_manager: "/dashboard",
  hr_officer: "/workers",
  payroll_officer: "/workers",
  inspector: "/dashboard",
  employee: "/portal",
};

export function canAccess(role: UserRole, path: string): boolean {
  const normalised = "/" + path.split("/").filter(Boolean)[0];

  const allowed = ROUTE_PERMISSIONS[normalised];
  if (!allowed) return true; // route not restricted

  return allowed.includes(role);
}

export function getHomeForRole(role: UserRole): string {
  return ROLE_HOME[role] || "/dashboard";
}
