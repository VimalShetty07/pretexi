"use client";

import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { useAuth } from "@/components/auth-provider";
import { useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center admin-bg">
        <div className="glass-card" style={{ padding: "20px 40px" }}>
          <p className="text-white/60 text-sm tracking-wide">Loading&hellip;</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen admin-bg relative overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} userRole={user.role} />
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: collapsed ? 72 : 240 }}
      >
        <Topbar />
        <main
          className="bg-[var(--background)]"
          style={{ padding: "24px 28px", flex: 1, borderTopLeftRadius: 16 }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
