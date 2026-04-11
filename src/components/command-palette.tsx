"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { type UserRole, ROUTE_PERMISSIONS } from "@/lib/auth";

type QuickLink = { label: string; href: string; keywords: string[] };

const ALL_LINKS: QuickLink[] = [
  { label: "Dashboard", href: "/dashboard", keywords: ["overview", "home"] },
  { label: "Workers", href: "/workers", keywords: ["employees", "staff"] },
  { label: "CoS & RTW", href: "/hr/cos-rtw", keywords: ["visa", "cos", "right to work"] },
  { label: "Leave", href: "/leave", keywords: ["holiday", "time off"] },
  { label: "Payroll", href: "/payroll", keywords: ["salary", "pay"] },
  { label: "Documents", href: "/documents", keywords: ["files", "checklist"] },
  { label: "Reports", href: "/reports", keywords: ["reporting"] },
  { label: "Risk", href: "/risk", keywords: ["alerts", "compliance"] },
  { label: "Settings", href: "/settings", keywords: ["preferences", "configuration"] },
  { label: "Portal", href: "/portal", keywords: ["employee portal"] },
];

function allowedForRole(role: UserRole, href: string): boolean {
  const root = "/" + href.split("/").filter(Boolean)[0];
  const allowed = ROUTE_PERMISSIONS[root];
  if (!allowed) return true;
  return allowed.includes(role);
}

export function CommandPalette({ role }: { role: UserRole }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isCmdK) return;
      event.preventDefault();
      setOpen((prev) => !prev);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_LINKS.filter((item) => allowedForRole(role, item.href)).filter((item) => {
      if (!q) return true;
      return item.label.toLowerCase().includes(q) || item.keywords.some((k) => k.includes(q));
    }).slice(0, 8);
  }, [query, role]);

  const onPick = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/40 p-4 pt-[12vh]" onClick={() => setOpen(false)}>
      <div className="w-[min(92vw,640px)] rounded-xl border border-slate-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to page…"
            className="h-9 w-full bg-transparent text-sm outline-none"
          />
          <kbd className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500">ESC</kbd>
        </div>
        <div className="max-h-[52vh] overflow-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-slate-500">No matching pages.</div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => onPick(item.href)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100"
              >
                <span>{item.label}</span>
                <span className="text-xs text-slate-500">{item.href}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
