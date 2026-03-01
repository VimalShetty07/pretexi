"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut, ChevronRight } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { ROUTE_PERMISSIONS, type UserRole } from "@/lib/auth";

interface NavItem { label: string; href: string; }

const adminNav: NavItem[] = [
  { label: "Dashboard",    href: "/dashboard" },
  { label: "Employees",    href: "/workers" },
  { label: "Visa Expiry",  href: "/workers/visa-expiry" },
  { label: "Leave",        href: "/leave" },
  { label: "Calendar",     href: "/calendar" },
  { label: "Organisation", href: "/organisation" },
  { label: "Documents",    href: "/documents" },
  { label: "Reports",      href: "/reports" },
  { label: "Risk",         href: "/risk" },
];

const employeeNav: NavItem[] = [
  { label: "Dashboard",  href: "/portal" },
  { label: "BG Verify",  href: "/portal/bgverify" },
  { label: "Documents",  href: "/portal/documents" },
  { label: "Leave",      href: "/portal/leave" },
  { label: "Calendar",   href: "/portal/calendar" },
  { label: "My Details", href: "/portal/details" },
];

export function Topbar({ userRole }: { userRole: UserRole }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const navItems = (userRole === "employee" ? employeeNav : adminNav).filter((item) => {
    const allowed = ROUTE_PERMISSIONS[item.href];
    return !allowed || allowed.includes(userRole);
  });

  const isTabActive = (href: string) => {
    if (href === "/dashboard" || href === "/portal") return pathname === href;
    if (href === "/workers") return (pathname === "/workers" || pathname?.startsWith("/workers/")) && pathname !== "/workers/visa-expiry";
    if (href === "/workers/visa-expiry") return pathname === "/workers/visa-expiry";
    return pathname === href || pathname?.startsWith(href + "/");
  };

  const activeTab = navItems.find((item) => isTabActive(item.href));

  const initials = user?.full_name
    ?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "U";

  const roleLabel = user?.role?.replace(/_/g, " ") || "User";

  return (
    <header className="topbar-glass sticky top-0 z-30 shrink-0">
      {/* Main row */}
      <div className="flex items-center justify-between" style={{ height: 64, paddingLeft: 24, paddingRight: 20 }}>

        {/* Left — breadcrumb/page context */}
        <div className="flex items-center gap-2.5">
          <span className="text-white/55 text-xs font-semibold tracking-wide">Protexi</span>
          <ChevronRight style={{ width: 12, height: 12 }} className="text-white/25" />
          <span className="text-white text-[13px] font-semibold">
            {activeTab?.label ?? "Dashboard"}
          </span>
        </div>

        {/* Right — actions + user */}
        <div className="flex items-center" style={{ gap: 8 }}>
          {/* Bell */}
          <button
            className="topbar-icon-btn"
            aria-label="Notifications"
          >
            <Bell style={{ width: 17, height: 17 }} />
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.16)", margin: "0 4px" }} />

          {/* User chip */}
          <div className="flex items-center gap-2 rounded-2xl" style={{ padding: "4px 10px 4px 5px", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)" }}>
            <div
              className="flex items-center justify-center rounded-full text-white font-bold shrink-0"
              style={{ width: 30, height: 30, fontSize: 11, background: "linear-gradient(135deg, rgba(255,255,255,0.30), rgba(255,255,255,0.14))", border: "1px solid rgba(255,255,255,0.26)" }}
            >
              {initials}
            </div>
            <div className="text-left hidden md:block">
              <p className="font-semibold text-white leading-tight" style={{ fontSize: 12, letterSpacing: "0.01em" }}>
                {user?.full_name || "User"}
              </p>
              <p className="text-white/65 leading-tight capitalize" style={{ fontSize: 10, marginTop: 1 }}>
                {roleLabel}
              </p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="topbar-icon-btn"
              style={{ width: 28, height: 28, marginLeft: 2 }}
            >
              <LogOut style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>
      </div>

      {/* Tab nav row */}
      <div className="topbar-tabs-row" style={{ paddingLeft: 24, paddingRight: 24 }}>
        <div className="topbar-tabs-wrap">
          {navItems.map((item) => {
            const active = isTabActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`topbar-tab${active ? " topbar-tab-active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
