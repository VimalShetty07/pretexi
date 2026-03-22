"use client";

import { AdminTopbar } from "@/components/admin-topbar";
import { AdminSubnav } from "@/components/admin-subnav";
import { useAuth } from "@/components/auth-provider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f2050]">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-10 py-6 backdrop-blur-md">
          <p className="text-sm tracking-wide text-white/70">Loading&hellip;</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="protexi-adm-shell flex min-h-dvh flex-col bg-[#F0F4FF]">
      <AdminTopbar userRole={user.role} />
      <AdminSubnav />
      <main className="adm-page flex-1">{children}</main>
    </div>
  );
}
