"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  FileWarning,
  CalendarDays,
  CalendarRange,
  Building2,
  FileText,
  ClipboardList,
  ShieldAlert,
  Search,
  Bell,
  LogOut,
  LayoutDashboard,
  UserCircle,
  Settings,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { ROUTE_PERMISSIONS, type UserRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard };

/** Same order as legacy sidebar: every section is a direct route in the top bar */
const adminNavFlat: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Employees", href: "/workers", icon: Users },
  { label: "Visa Expiry", href: "/workers/visa-expiry", icon: FileWarning },
  { label: "Leave", href: "/leave", icon: CalendarDays },
  { label: "Calendar", href: "/calendar", icon: CalendarRange },
  { label: "Organisation", href: "/organisation", icon: Building2 },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Reports", href: "/reports", icon: ClipboardList },
  { label: "Risk", href: "/risk", icon: ShieldAlert },
  { label: "Settings", href: "/settings", icon: Settings },
];

const employeeNav: NavItem[] = [
  { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { label: "BG Verify", href: "/portal/bgverify", icon: ShieldAlert },
  { label: "Documents", href: "/portal/documents", icon: FileText },
  { label: "Leave", href: "/portal/leave", icon: CalendarDays },
  { label: "Calendar", href: "/portal/calendar", icon: CalendarRange },
  { label: "My Details", href: "/portal/details", icon: UserCircle },
];

const platformNav: NavItem[] = [
  { label: "Overview", href: "/super-admin/dashboard", icon: LayoutGrid },
  { label: "Clients", href: "/super-admin/clients", icon: Building2 },
  { label: "Subscriptions", href: "/super-admin/subscriptions", icon: ClipboardList },
];

function filterByRole(items: NavItem[], role: UserRole): NavItem[] {
  return items.filter((item) => {
    const allowed = ROUTE_PERMISSIONS[item.href];
    return !allowed || allowed.includes(role);
  });
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/dashboard" || href === "/portal") return pathname === href;
  if (href === "/workers") return pathname === "/workers" || (pathname.startsWith("/workers/") && pathname !== "/workers/visa-expiry");
  if (href === "/workers/visa-expiry") return pathname === "/workers/visa-expiry";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminTopbar({ userRole }: { userRole: UserRole }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const isEmployee = userRole === "employee";
  const isPlatform = userRole === "platform_owner";

  const mainItems = isEmployee ? employeeNav : isPlatform ? platformNav : filterByRole(adminNavFlat, userRole);

  const initials =
    user?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";
  const roleLabel = user?.role?.replace(/_/g, " ") || "User";

  return (
    <header className="adm-topnav">
      <Link href={isEmployee ? "/portal" : isPlatform ? "/super-admin/dashboard" : "/dashboard"} className="adm-logo">
        Prote<span>xi</span>
      </Link>

      <div className="adm-tn-links min-w-0 overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {!isEmployee && !isPlatform && (
          <>
            {mainItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn("adm-tn-btn shrink-0", isActive(pathname, item.href) && "act")}
              >
                <item.icon className="h-[13px] w-[13px]" />
                {item.label}
              </Link>
            ))}
          </>
        )}

        {!isEmployee && isPlatform && (
          <div className="flex flex-wrap gap-0.5">
            {mainItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn("adm-tn-btn", isActive(pathname, item.href) && "act")}
              >
                <item.icon className="h-[13px] w-[13px]" />
                {item.label}
              </Link>
            ))}
          </div>
        )}

        {isEmployee && (
          <div className="flex flex-wrap gap-0.5">
            {mainItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn("adm-tn-btn", isActive(pathname, item.href) && "act")}
              >
                <item.icon className="h-[13px] w-[13px]" />
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="adm-tn-right">
        <div className="adm-search" role="search">
          <Search className="h-3 w-3 text-white/35" />
          <span>Search</span>
          <kbd>⌘K</kbd>
        </div>
        <button type="button" className="adm-icon-btn relative" aria-label="Notifications">
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full border border-[#0f2050] bg-red-500" />
        </button>
        <div className="adm-user">
          <div className="adm-avatar">{initials}</div>
          <div className="hidden text-left sm:block">
            <div className="adm-uname max-w-[120px] truncate">{user?.full_name || "User"}</div>
            <div className="adm-urole capitalize">{roleLabel}</div>
          </div>
          <button type="button" onClick={logout} className="adm-icon-btn !border-0 !bg-transparent" title="Sign out">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
