"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { type UserRole, ROUTE_PERMISSIONS } from "@/lib/auth";
import { useAuth } from "@/components/auth-provider";
import {
  LayoutDashboard, Users, Building2, FileText, ClipboardList,
  ShieldAlert, Settings, LogOut, PanelLeftClose, PanelLeft,
  UserCircle, CalendarDays, CalendarRange, type LucideIcon,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  userRole: UserRole;
  hideMainNav?: boolean;
}

interface NavItem { label: string; href: string; icon: LucideIcon; }

const adminNav: NavItem[] = [
  { label: "Dashboard",   href: "/dashboard",    icon: LayoutDashboard },
  { label: "Employees",   href: "/workers",       icon: Users },
  { label: "Leave",       href: "/leave",         icon: CalendarDays },
  { label: "Calendar",    href: "/calendar",      icon: CalendarRange },
  { label: "Organisation",href: "/organisation",  icon: Building2 },
  { label: "Documents",   href: "/documents",     icon: FileText },
  { label: "Reports",     href: "/reports",       icon: ClipboardList },
  { label: "Risk Monitor",href: "/risk",          icon: ShieldAlert },
];

const employeeNav: NavItem[] = [
  { label: "My Dashboard",href: "/portal",           icon: LayoutDashboard },
  { label: "BG Verify",   href: "/portal/bgverify",  icon: ShieldAlert },
  { label: "My Documents",href: "/portal/documents", icon: FileText },
  { label: "My Leave",    href: "/portal/leave",     icon: CalendarDays },
  { label: "Calendar",    href: "/portal/calendar",  icon: CalendarRange },
  { label: "My Details",  href: "/portal/details",   icon: UserCircle },
];

function getVisibleNav(role: UserRole): NavItem[] {
  if (role === "employee") return employeeNav;
  return adminNav.filter((item) => {
    const allowed = ROUTE_PERMISSIONS[item.href];
    return !allowed || allowed.includes(role);
  });
}

export function Sidebar({ collapsed, onToggle, userRole, hideMainNav = false }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const navItems = getVisibleNav(userRole);
  const showSettings = userRole === "super_admin";
  const isNavActive = (href: string) => {
    // Root dashboard tabs should only be active on exact match.
    if (href === "/dashboard" || href === "/portal") {
      return pathname === href;
    }
    return pathname === href || pathname?.startsWith(href + "/");
  };

  const initials = user?.full_name
    ?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "U";

  return (
    <aside
      className={cn(
        "sidebar-shell fixed left-0 top-0 z-40 flex h-dvh flex-col transition-all duration-300",
        collapsed ? "w-[78px]" : "w-[252px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn("flex items-center shrink-0", collapsed ? "justify-center px-2" : "px-4")}
        style={{ height: 68, borderBottom: "1px solid rgba(255,255,255,0.12)" }}
      >
        {collapsed ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src="/logo.jpeg" alt="Protexi" className="rounded-xl shadow-lg"
            style={{ width: 44, height: 44, objectFit: "cover" }} />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src="/logo.jpeg" alt="Protexi" className="rounded-xl shadow-lg"
            style={{ width: 152, height: 44, objectFit: "cover" }} />
        )}
      </div>

      {/* Nav */}
      <nav
        className={cn("flex-1 overflow-y-auto", collapsed ? "px-2" : "px-3")}
        style={{ paddingTop: 14, paddingBottom: 14 }}
      >
        {!collapsed && (
          <div className="rounded-xl border border-white/10 bg-white/[0.07]" style={{ padding: "9px 11px", marginBottom: 10 }}>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center rounded-full text-white font-bold shrink-0" style={{ width: 28, height: 28, fontSize: 10, background: "linear-gradient(135deg, rgba(78,130,204,0.6), rgba(43,93,168,0.8))", border: "1px solid rgba(78,130,204,0.4)" }}>
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-white/90 truncate">{user?.full_name || "User"}</p>
                <p className="text-[10px] text-white/45 capitalize truncate">{userRole.replace(/_/g, " ")}</p>
              </div>
            </div>
          </div>
        )}
        {!hideMainNav ? (
          <>
            {!collapsed && (
              <p className="text-white/30 uppercase font-semibold"
                style={{ fontSize: 10, letterSpacing: "0.12em", marginBottom: 10, paddingLeft: 12 }}>
                {userRole === "employee" ? "Portal" : "Navigation"}
              </p>
            )}
            <div className="flex flex-col" style={{ gap: 2 }}>
              {navItems.map((item) => {
                const isActive = isNavActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "relative flex items-center font-medium rounded-xl transition-all sidebar-nav-link",
                      collapsed ? "justify-center" : "",
                      isActive
                        ? "bg-white/22 text-white"
                        : "text-white/72 hover:bg-white/10 hover:text-white"
                    )}
                    style={{ gap: 11, padding: collapsed ? 10 : "9px 12px", fontSize: 13 }}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r-full bg-white" />
                    )}
                    <item.icon className="shrink-0" style={{ width: collapsed ? 20 : 17, height: collapsed ? 20 : 17 }} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          !collapsed && (
            <p className="text-white/35" style={{ fontSize: 12, padding: "4px 12px", lineHeight: 1.6 }}>
              Use the top tabs to navigate sections.
            </p>
          )
        )}
      </nav>

      {/* Bottom */}
      <div
        className={cn("flex flex-col", collapsed ? "px-2" : "px-3")}
        style={{ paddingTop: 10, paddingBottom: 10, gap: 2, borderTop: "1px solid rgba(255,255,255,0.10)" }}
      >
        {showSettings && (
          <Link href="/settings"
            className={cn("relative flex items-center font-medium rounded-xl text-white/50 hover:bg-white/10 hover:text-white transition-all", collapsed ? "justify-center" : "")}
            style={{ gap: 11, padding: collapsed ? 10 : "9px 12px", fontSize: 13 }}>
            <Settings style={{ width: collapsed ? 20 : 17, height: collapsed ? 20 : 17 }} className="shrink-0" />
            {!collapsed && <span>Settings</span>}
          </Link>
        )}
        <button onClick={onToggle}
          className={cn("relative flex items-center w-full font-medium rounded-xl text-white/50 hover:bg-white/12 hover:text-white transition-all cursor-pointer", collapsed ? "justify-center" : "")}
          style={{ gap: 11, padding: collapsed ? 10 : "9px 12px", fontSize: 13 }}>
          {collapsed ? <PanelLeft style={{ width: 20, height: 20 }} /> : <PanelLeftClose style={{ width: 17, height: 17 }} />}
          {!collapsed && <span>Collapse</span>}
        </button>
        <button onClick={logout}
          className={cn("relative flex items-center w-full font-medium rounded-xl text-white/40 hover:bg-red-500/20 hover:text-red-200 transition-all cursor-pointer", collapsed ? "justify-center" : "")}
          style={{ gap: 11, padding: collapsed ? 10 : "9px 12px", fontSize: 13 }}>
          <LogOut style={{ width: collapsed ? 20 : 17, height: collapsed ? 20 : 17 }} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
