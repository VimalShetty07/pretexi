export type UserRole =
  | "platform_owner"
  | "tenant_admin"
  | "tenant_staff"
  | "tenant_employee"
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
  phone?: string | null;
  worker_id?: string | null;
  last_login?: string | null;
}

/**
 * Which roles can access which routes.
 * If a route is not listed here, it's accessible to all authenticated users.
 */
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/super-admin":   ["platform_owner"],
  "/dashboard":     ["super_admin", "tenant_admin", "compliance_manager", "hr_officer", "payroll_officer", "inspector"],
  "/workers":       ["super_admin", "tenant_admin", "tenant_staff", "compliance_manager", "hr_officer", "payroll_officer", "inspector"],
  /** HR/compliance — CoS & RTW queue (not payroll-only or inspector). */
  "/hr":            ["super_admin", "tenant_admin", "tenant_staff", "compliance_manager", "hr_officer"],
  "/leave":         ["super_admin", "tenant_admin", "tenant_staff", "compliance_manager", "hr_officer"],
  "/calendar":      ["super_admin", "tenant_admin", "tenant_staff", "compliance_manager", "hr_officer", "payroll_officer"],
  "/organisation":  ["super_admin", "tenant_admin", "compliance_manager", "hr_officer"],
  "/documents":     ["super_admin", "tenant_admin", "tenant_staff", "compliance_manager", "hr_officer"],
  "/reports":       ["super_admin", "tenant_admin", "compliance_manager", "hr_officer", "payroll_officer", "inspector"],
  "/risk":          ["super_admin", "tenant_admin", "compliance_manager", "hr_officer", "inspector"],
  "/settings":      ["super_admin", "tenant_admin"],
  /** HR team + super admin + payroll officer — not tenant_admin / compliance_manager (managers). */
  "/payroll":       ["super_admin", "hr_officer", "payroll_officer"],
  "/portal":        ["employee"],
};

/**
 * Where to redirect each role after login.
 */
export const ROLE_HOME: Record<UserRole, string> = {
  platform_owner: "/super-admin/dashboard",
  tenant_admin: "/dashboard",
  tenant_staff: "/workers",
  tenant_employee: "/portal",
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
