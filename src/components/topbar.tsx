"use client";

import { Bell, Search, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export function Topbar() {
  const { user, logout } = useAuth();

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  const roleLabel = user?.role?.replace(/_/g, " ") || "User";

  return (
    <header
      className="topbar-glass sticky top-0 z-30 flex items-center justify-between shrink-0"
      style={{ height: 64, paddingLeft: 24, paddingRight: 24 }}
    >
      {/* Search */}
      <div className="flex-1" style={{ maxWidth: 420 }}>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
            style={{ width: 16, height: 16 }}
          />
          <input
            type="text"
            placeholder="Search workers, documents..."
            className="topbar-search w-full"
            style={{ height: 38, paddingLeft: 38, paddingRight: 16, fontSize: 13 }}
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center" style={{ gap: 8, marginLeft: 24 }}>
        <button
          className="flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
          style={{ width: 38, height: 38 }}
        >
          <Bell style={{ width: 18, height: 18 }} />
        </button>

        <div className="bg-white/[0.08]" style={{ width: 1, height: 24, marginLeft: 8, marginRight: 8 }} />

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
          <div className="text-left hidden md:block">
            <p className="font-semibold text-white leading-tight" style={{ fontSize: 13 }}>
              {user?.full_name || "User"}
            </p>
            <p className="text-white/40 leading-tight capitalize" style={{ fontSize: 11, marginTop: 1 }}>
              {roleLabel}
            </p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="hidden md:flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            style={{ width: 30, height: 30, marginLeft: 4 }}
          >
            <LogOut style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>
    </header>
  );
}
