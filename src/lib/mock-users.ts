/**
 * Mock user definitions for development (when NEXT_PUBLIC_MOCK_AUTH=true).
 * Single source of truth for the 3 login options: Admin, HR, Employee.
 * Backend seed_mock_users.py creates matching users (same emails) for API calls.
 */

import type { AuthUser, UserRole } from "./auth";

const MOCK_ORG_ID = "00000000-0000-4000-a000-000000000001";

export const MOCK_USERS: ReadonlyArray<{
  email: string;
  role: UserRole;
  label: string;
  description: string;
}> = [
  {
    email: "admin@protexi.local",
    role: "super_admin",
    label: "Admin",
    description: "Full access",
  },
  {
    email: "hr@protexi.local",
    role: "hr_officer",
    label: "HR",
    description: "HR Officer",
  },
  {
    email: "employee@protexi.local",
    role: "employee",
    label: "Employee",
    description: "Worker portal",
  },
];

/** Full AuthUser objects for frontend-only mock login (no /auth/me call). */
export const MOCK_AUTH_USERS: Record<string, AuthUser> = {
  "admin@protexi.local": {
    id: "mock-admin-id",
    email: "admin@protexi.local",
    full_name: "Mock Admin",
    role: "super_admin",
    is_active: true,
    organisation_id: MOCK_ORG_ID,
    worker_id: null,
    last_login: null,
  },
  "hr@protexi.local": {
    id: "mock-hr-id",
    email: "hr@protexi.local",
    full_name: "Mock HR Officer",
    role: "hr_officer",
    is_active: true,
    organisation_id: MOCK_ORG_ID,
    worker_id: null,
    last_login: null,
  },
  "employee@protexi.local": {
    id: "mock-employee-id",
    email: "employee@protexi.local",
    full_name: "Mock Employee",
    role: "employee",
    is_active: true,
    organisation_id: MOCK_ORG_ID,
    worker_id: null,
    last_login: null,
  },
};

export function getMockAuthUserByEmail(email: string): AuthUser | null {
  return MOCK_AUTH_USERS[email] ?? null;
}
