"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { type UserRole, ROUTE_PERMISSIONS } from "@/lib/auth";
import { useAuth } from "@/components/auth-provider";
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  ClipboardList,
  ShieldAlert,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  UserCircle,
  CalendarDays,
  CalendarRange,
  UserSearch,
  type LucideIcon,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  userRole: UserRole;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Employees", href: "/workers", icon: Users },
  { label: "Leave", href: "/leave", icon: CalendarDays },
  { label: "Calendar", href: "/calendar", icon: CalendarRange },
  { label: "Organisation", href: "/organisation", icon: Building2 },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Reports", href: "/reports", icon: ClipboardList },
  { label: "Risk Monitor", href: "/risk", icon: ShieldAlert },
];

const employeeNav: NavItem[] = [
  { label: "My Dashboard", href: "/portal", icon: LayoutDashboard },
  { label: "My Documents", href: "/portal/documents", icon: FileText },
  { label: "My Leave", href: "/portal/leave", icon: CalendarDays },
  { label: "Calendar", href: "/portal/calendar", icon: CalendarRange },
  { label: "My Details", href: "/portal/details", icon: UserCircle },
  { label: "BG Verification", href: "/portal/bgverify", icon: UserSearch },
];

function getVisibleNav(role: UserRole): NavItem[] {
  if (role === "employee") return employeeNav;
  return adminNav.filter((item) => {
    const allowed = ROUTE_PERMISSIONS[item.href];
    if (!allowed) return true;
    return allowed.includes(role);
  });
}

export function Sidebar({ collapsed, onToggle, userRole }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const navItems = getVisibleNav(userRole);
  const showSettings = userRole === "super_admin";

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  return (
    <aside
      className={cn(
        "sidebar-glass fixed left-0 top-0 z-40 flex h-dvh flex-col transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center shrink-0 border-b border-white/[0.06]",
          collapsed ? "justify-center px-2" : "px-5"
        )}
        style={{ height: collapsed ? 64 : 72 }}
      >
        {collapsed ? (
          <div
            className="flex items-center justify-center rounded-xl shrink-0"
            style={{
              width: 38, height: 38,
              background: "linear-gradient(135deg, #2B5DA8, #4E82CC)",
              boxShadow: "0 2px 8px rgba(43,93,168,0.4)",
            }}
          >
            <span className="text-white font-bold text-sm">P</span>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/logo.svg"
            alt="Protexi"
            style={{ width: 160, height: 50 }}
          />
        )}
      </div>

      {/* User badge */}
      {!collapsed && user && (
        <div className="border-b border-white/[0.06]" style={{ padding: "14px 16px" }}>
          <div className="flex items-center" style={{ gap: 10 }}>
            <div
              className="flex items-center justify-center rounded-full text-white font-bold shrink-0"
              style={{
                width: 34, height: 34, fontSize: 11,
                background: "linear-gradient(135deg, #2B5DA8, #4E82CC)",
              }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white truncate" style={{ fontSize: 13 }}>{user.full_name}</p>
              <p className="text-white/40 capitalize truncate" style={{ fontSize: 11, marginTop: 1 }}>
                {userRole.replace(/_/g, " ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav
        className={cn("flex-1 overflow-y-auto", collapsed ? "px-2" : "px-3")}
        style={{ paddingTop: 16, paddingBottom: 16 }}
      >
        {!collapsed && (
          <p
            className="text-white/25 uppercase font-semibold"
            style={{ fontSize: 10, letterSpacing: "0.12em", marginBottom: 10, paddingLeft: 12 }}
          >
            {userRole === "employee" ? "Portal" : "Navigation"}
          </p>
        )}
        <div className="flex flex-col" style={{ gap: 2 }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "sidebar-nav-item flex items-center font-medium text-white/60 hover:text-white",
                  collapsed ? "justify-center" : "",
                  isActive && "sidebar-nav-active text-white"
                )}
                style={{
                  gap: 12,
                  padding: collapsed ? 10 : "10px 12px",
                  fontSize: 13,
                }}
              >
                <item.icon
                  className="shrink-0"
                  style={{
                    width: collapsed ? 20 : 18,
                    height: collapsed ? 20 : 18,
                    color: isActive ? "#7AA1DA" : undefined,
                  }}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom actions */}
      <div
        className={cn("border-t border-white/[0.06] flex flex-col", collapsed ? "px-2" : "px-3")}
        style={{ paddingTop: 12, paddingBottom: 12, gap: 2 }}
      >
        {showSettings && (
          <Link
            href="/settings"
            className={cn(
              "sidebar-nav-item flex items-center font-medium text-white/40 hover:text-white",
              collapsed ? "justify-center" : ""
            )}
            style={{ gap: 12, padding: collapsed ? 10 : "10px 12px", fontSize: 13 }}
          >
            <Settings style={{ width: collapsed ? 20 : 18, height: collapsed ? 20 : 18 }} className="shrink-0" />
            {!collapsed && <span>Settings</span>}
          </Link>
        )}
        <button
          onClick={onToggle}
          className={cn(
            "sidebar-nav-item flex items-center font-medium text-white/35 hover:text-white/70 w-full",
            collapsed ? "justify-center" : ""
          )}
          style={{ gap: 12, padding: collapsed ? 10 : "10px 12px", fontSize: 13 }}
        >
          {collapsed
            ? <PanelLeft style={{ width: 20, height: 20 }} />
            : <PanelLeftClose style={{ width: 18, height: 18 }} />
          }
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={logout}
          className={cn(
            "sidebar-nav-item flex items-center font-medium text-white/35 hover:text-red-400 w-full",
            collapsed ? "justify-center" : ""
          )}
          style={{ gap: 12, padding: collapsed ? 10 : "10px 12px", fontSize: 13 }}
        >
          <LogOut style={{ width: collapsed ? 20 : 18, height: collapsed ? 20 : 18 }} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
