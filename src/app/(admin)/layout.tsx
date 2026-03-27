"use client";

import "../protexi-admin-shell.css";
import { AdminTopbar } from "@/components/admin-topbar";
import { AdminSubnav } from "@/components/admin-subnav";
import { useAuth } from "@/components/auth-provider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f0]">
        <div className="border border-black/10 bg-[#f0f0eb] px-10 py-6 shadow-sm">
          <p className="text-sm font-medium tracking-wide text-[#0f2d5e]">Loading&hellip;</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="protexi-adm-shell flex min-h-dvh flex-col bg-[#f5f5f0]">
      <AdminTopbar userRole={user.role} />
      <AdminSubnav />
      <main className="adm-page flex-1">{children}</main>
    </div>
  );
}
