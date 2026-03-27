"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
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
  Wallet,
  Search,
  Bell,
  LogOut,
  LayoutDashboard,
  UserCircle,
  Settings,
  ChevronDown,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { ROUTE_PERMISSIONS, type UserRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard };
type WorkerSearchResult = {
  id: string;
  name: string;
  email?: string | null;
  job_title?: string | null;
};

const adminNavFlat: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Employees", href: "/workers", icon: Users },
  { label: "Visa Expiry", href: "/workers/visa-expiry", icon: FileWarning },
  { label: "Leave", href: "/leave", icon: CalendarDays },
  { label: "Calendar", href: "/calendar", icon: CalendarRange },
  { label: "Organisation", href: "/organisation", icon: Building2 },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Reports", href: "/reports", icon: ClipboardList },
  { label: "Payroll", href: "/payroll", icon: Wallet },
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

const ADMIN_PRIMARY_NAV_COUNT = 6;

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
  const { user, token, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [employeeResults, setEmployeeResults] = useState<WorkerSearchResult[]>([]);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const isEmployee = userRole === "employee";
  const isPlatform = userRole === "platform_owner";

  const navItems = useMemo(() => {
    if (isEmployee) return employeeNav;
    if (isPlatform) return platformNav;
    return filterByRole(adminNavFlat, userRole);
  }, [isEmployee, isPlatform, userRole]);

  const { visible, overflow } = useMemo(() => {
    if (!isEmployee && !isPlatform) {
      return {
        visible: navItems.slice(0, ADMIN_PRIMARY_NAV_COUNT),
        overflow: navItems.slice(ADMIN_PRIMARY_NAV_COUNT),
      };
    }
    return { visible: navItems, overflow: [] as NavItem[] };
  }, [isEmployee, isPlatform, navItems]);

  const overflowActive = overflow.some((item) => isActive(pathname, item.href));

  const initials =
    user?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";
  const roleLabel = user?.role?.replace(/_/g, " ") || "User";
  // Wire this to real notifications API when available.
  const unreadNotifications = 0;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isCmdK) return;
      event.preventDefault();
      setSearchOpen(true);
      searchInputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!searchOpen || q.length < 2 || !token || isEmployee || isPlatform) {
      setEmployeeResults([]);
      setEmployeeSearchLoading(false);
      return;
    }

    let active = true;
    setEmployeeSearchLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const data = await api.get<WorkerSearchResult[]>(`/workers?search=${encodeURIComponent(q)}`, token);
        if (!active) return;
        setEmployeeResults(data.slice(0, 8));
      } catch {
        if (!active) return;
        setEmployeeResults([]);
      } finally {
        if (active) setEmployeeSearchLoading(false);
      }
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery, searchOpen, token, isEmployee, isPlatform]);

  const handleEmployeeSelect = (workerId: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    setEmployeeResults([]);
    router.push(`/workers/${workerId}`);
  };

  const homeHref = isEmployee ? "/portal" : isPlatform ? "/super-admin/dashboard" : "/dashboard";

  return (
    <header className="adm-topnav">
      <div className="adm-tn-inner">

        {/* Logo */}
        <Link href={homeHref} className="adm-tn-logo">
          Prote<em>xi</em>
        </Link>

        {/* Logo / nav divider */}
        <div className="adm-tn-vdiv" aria-hidden />

        {/* Primary navigation */}
        <nav className="adm-tn-links" aria-label="Main">
          <div className="adm-tn-nav-row">
            {visible.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn("adm-tn-btn", isActive(pathname, item.href) && "act")}
              >
                <item.icon className="adm-tn-ic" aria-hidden />
                {item.label}
              </Link>
            ))}

            {overflow.length > 0 && (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    className={cn("adm-tn-btn adm-tn-more-btn", overflowActive && "act")}
                    aria-label="More navigation"
                  >
                    More
                    <ChevronDown className="adm-tn-ic adm-tn-chev" strokeWidth={2} aria-hidden />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="adm-tn-more-content"
                    side="bottom"
                    sideOffset={6}
                    align="end"
                    sticky="always"
                    avoidCollisions
                    collisionPadding={12}
                  >
                    {overflow.map((item) => (
                      <DropdownMenu.Item key={item.href} asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "adm-tn-more-item",
                            isActive(pathname, item.href) && "adm-tn-more-item--current",
                          )}
                        >
                          <item.icon className="adm-tn-ic" aria-hidden />
                          {item.label}
                        </Link>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            )}
          </div>
        </nav>

        {/* Right tools */}
        <div className="adm-tn-right">
          {/* Search */}
          <div className="adm-search">
            <Search className="adm-tn-ic" aria-hidden />
            <input
              ref={searchInputRef}
              className="adm-search-input"
              placeholder="Search employee"
              value={searchQuery}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setSearchOpen(false), 120);
              }}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && employeeResults.length > 0) {
                  event.preventDefault();
                  handleEmployeeSelect(employeeResults[0].id);
                }
                if (event.key === "Escape") {
                  setSearchOpen(false);
                  setSearchQuery("");
                  setEmployeeResults([]);
                  searchInputRef.current?.blur();
                }
              }}
              aria-label="Search employee"
            />
            <kbd>⌘K</kbd>
            {searchOpen && searchQuery.trim().length > 0 && (
              <div className="adm-search-results" role="listbox" aria-label="Search results">
                {employeeSearchLoading ? (
                  <div className="adm-search-empty">Searching employees...</div>
                ) : employeeResults.length > 0 ? (
                  employeeResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="adm-search-result-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleEmployeeSelect(item.id)}
                    >
                      <Users className="adm-tn-ic" aria-hidden />
                      <span className="adm-search-result-text">
                        <span className="adm-search-result-name">{item.name}</span>
                        <span className="adm-search-result-meta">{item.email || item.job_title || "Employee"}</span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="adm-search-empty">No employees found</div>
                )}
              </div>
            )}
          </div>

          {/* Notifications */}
          <button type="button" className="adm-icon-btn relative" aria-label="Notifications">
            <Bell className="adm-tn-ic" />
            {unreadNotifications > 0 && (
              <span
                className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500"
                aria-hidden
              />
            )}
          </button>

          {/* Vertical divider */}
          <div className="adm-tn-rdiv" aria-hidden />

          {/* User chip */}
          <div className="adm-user-chip">
            <div className="adm-avatar" aria-hidden>{initials}</div>
            <div className="adm-user-info hidden sm:block">
              <div className="adm-uname">{user?.full_name || "User"}</div>
              <div className="adm-urole capitalize">{roleLabel}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="adm-signout-btn"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="adm-tn-ic" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
