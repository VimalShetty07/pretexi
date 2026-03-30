"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Download, Plus, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { DASHBOARD_FEATURE_PREF_ROLES } from "@/lib/dashboard-features";

const DASH_TABS: { label: string; href: string; match?: (p: string) => boolean }[] = [
  { label: "Overview", href: "/dashboard", match: (p) => p === "/dashboard" },
  { label: "Analytics", href: "/reports", match: (p) => p === "/reports" || p.startsWith("/reports/") },
  { label: "Compliance", href: "/risk", match: (p) => p === "/risk" || p.startsWith("/risk/") },
  { label: "Activity", href: "/calendar", match: (p) => p === "/calendar" || p.startsWith("/calendar/") },
];

const DASH_LAYOUT_TAB: { label: string; href: string; match: (p: string) => boolean } = {
  label: "Layout",
  href: "/dashboard/customize",
  match: (p) => p === "/dashboard/customize",
};

function dashboardHubTabs(includeLayout: boolean) {
  const tabs = [...DASH_TABS];
  if (includeLayout) {
    tabs.splice(1, 0, DASH_LAYOUT_TAB);
  }
  return tabs;
}

const WORKER_TABS = [
  { id: "all", label: "All Employees" },
  { id: "active", label: "Active" },
  { id: "sponsored", label: "Sponsored" },
  { id: "on_leave", label: "On Leave" },
] as const;

const STAFF_ROLES = ["super_admin", "tenant_admin", "compliance_manager", "hr_officer"];

function workersHref(tab: string, bulk?: boolean) {
  const p = new URLSearchParams();
  p.set("tab", tab);
  if (bulk) p.set("bulk", "1");
  return `/workers?${p.toString()}`;
}

function WorkersSubnavInner() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "all";
  const { user } = useAuth();
  const canManage = user ? STAFF_ROLES.includes(user.role) : false;

  return (
    <div className="adm-subnav">
      {WORKER_TABS.map((t) => (
        <Link
          key={t.id}
          href={workersHref(t.id)}
          className={cn("adm-sn-tab no-underline", tab === t.id && "act")}
        >
          {t.label}
        </Link>
      ))}
      {canManage && (
        <div className="adm-sn-right">
          <Link href={workersHref(tab, true)} className="adm-sn-btn adm-sn-ghost inline-flex items-center gap-1.5 no-underline">
            <Upload className="h-3 w-3" />
            Add in Bulk
          </Link>
          <Link href="/workers/new" className="adm-sn-btn adm-sn-primary inline-flex items-center gap-1.5 no-underline">
            <Plus className="h-3 w-3" />
            Add Employee
          </Link>
        </div>
      )}
    </div>
  );
}

/** Secondary strip: dashboard tabs + actions, or minimal title for other routes */
export function AdminSubnav() {
  const pathname = usePathname() ?? "";
  const { user } = useAuth();
  const canCustomizeDash = user
    ? (DASHBOARD_FEATURE_PREF_ROLES as readonly string[]).includes(user.role)
    : false;

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/reports") || pathname.startsWith("/risk") || pathname.startsWith("/calendar")) {
    const hubTabs = dashboardHubTabs(canCustomizeDash);
    return (
      <div className="adm-subnav">
        {hubTabs.map((tab) => {
          const active = tab.match?.(pathname) ?? pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn("adm-sn-tab no-underline", active && "act")}
            >
              {tab.label}
            </Link>
          );
        })}
        <div className="adm-sn-right">
          <Link href="/reports" className="adm-sn-btn adm-sn-ghost inline-flex items-center gap-1.5 no-underline">
            <Download className="h-3 w-3" />
            Export
          </Link>
          <Link href="/workers/new" className="adm-sn-btn adm-sn-primary inline-flex items-center gap-1.5 no-underline">
            <Plus className="h-3 w-3" />
            Add Employee
          </Link>
        </div>
      </div>
    );
  }

  if (pathname === "/workers") {
    return (
      <Suspense fallback={<div className="adm-subnav min-h-[36px]" />}>
        <WorkersSubnavInner />
      </Suspense>
    );
  }

  /* Light context strip for other admin pages */
  const title =
    pathname?.startsWith("/workers/visa-expiry") ? "Visa expiry" :
    pathname?.startsWith("/workers") ? "Employees" :
    pathname?.startsWith("/leave") ? "Leave" :
    pathname?.startsWith("/calendar") ? "Calendar" :
    pathname?.startsWith("/organisation") ? "Organisation" :
    pathname?.startsWith("/documents") ? "Documents" :
    pathname?.startsWith("/reports") ? "Reports" :
    pathname?.startsWith("/risk") ? "Risk" :
    pathname?.startsWith("/settings") ? "Settings" :
    pathname?.startsWith("/super-admin") ? "Platform" :
    pathname?.startsWith("/portal") ? "Portal" : "Protexi";

  return (
    <div className="adm-subnav">
      <span className="px-3 py-1 text-[13px] font-bold tracking-tight text-[#0f2d5e]">{title}</span>
    </div>
  );
}
