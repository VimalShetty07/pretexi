"use client";

import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  Users, UserCheck, CalendarClock, FileWarning,
  Briefcase, AlertTriangle, ArrowRight, TrendingUp,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";

interface DashboardOverview {
  total_employees: number; active_employees: number;
  sponsored: number; non_sponsored: number; pending_leaves: number;
  cos_allocated: number; cos_used: number; cos_available: number;
  cos_forecasted_required: number; cos_projected_required: number;
  cos_forecasted_demand: number; cos_projected_demand: number;
  visa_breakdown: { expired: number; expiring_30: number; expiring_60: number; expiring_90: number; valid: number; no_visa: number; };
  expiring_workers: Array<{ id: string; name: string; visa_expiry: string; days_left: number; category: string; department?: string | null; job_title?: string | null; }>;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const overview = await api.get<DashboardOverview>("/dashboard/overview", token);
        setData(overview);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally { setLoading(false); }
    };
    load();
  }, [token]);

  const topAlerts = useMemo(() => data?.expiring_workers.slice(0, 6) ?? [], [data]);

  if (loading) return <p className="text-sm text-gray-400">Loading dashboard...</p>;
  if (error || !data) return <p className="text-sm text-red-500">{error || "Dashboard unavailable"}</p>;

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const expired = data.visa_breakdown.expired;
  const expiring90 = expired + data.visa_breakdown.expiring_30 + data.visa_breakdown.expiring_60 + data.visa_breakdown.expiring_90;
  const canViewCos = user?.role !== "hr_officer";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap" style={{ gap: 12 }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#1a5296", marginBottom: 4 }}>
            Sponsor Compliance
          </p>
          <h1 className="font-extrabold tracking-tight text-gray-900" style={{ fontSize: 28, lineHeight: 1.05 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 12, color: "#7f8ca3", marginTop: 6 }}>{today}</p>
        </div>
        {expired > 0 && (
          <div className="flex items-center gap-2 rounded-2xl" style={{ padding: "8px 14px", background: "#fef2f2", border: "1px solid #fecaca" }}>
            <AlertTriangle style={{ width: 14, height: 14, color: "#ef4444" }} />
            <span style={{ color: "#dc2626", fontSize: 12, fontWeight: 600 }}>{expired} visa{expired > 1 ? "s" : ""} expired — action required</span>
          </div>
        )}
      </div>

      {/* ── KPI 3D Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 }}>
        <KpiCard3D icon={Users}         label="Total Employees"   value={data.total_employees} sub={`${data.active_employees} active`}       colors={BLUE}   delay={0}   onClick={() => router.push("/workers")} />
        <KpiCard3D icon={UserCheck}     label="Sponsored Workers" value={data.sponsored}       sub={`${data.non_sponsored} not sponsored`}   colors={PURPLE} delay={70}  />
        <KpiCard3D icon={CalendarClock} label="Pending Leaves"    value={data.pending_leaves}  sub="Awaiting review"                         colors={AMBER}  delay={140} onClick={() => router.push("/leave")} />
        <KpiCard3D icon={FileWarning}   label="Visa Expiring 90d" value={expiring90}           sub={`${expired} already expired`}            colors={PINK}   delay={210} onClick={() => router.push("/workers/visa-expiry")} />
      </div>

      {/* ── CoS Glass Cards ── */}
      {canViewCos && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16 }}>
          <CoSCard icon={Briefcase}    label="CoS Available"      value={data.cos_available}          sub={`Allocated ${data.cos_allocated}  ·  Used ${data.cos_used}`} accent="#4e82ff" />
          <CoSCard icon={CalendarClock} label="Forecasted CoS 90d" value={data.cos_forecasted_required} sub={`Demand: ${data.cos_forecasted_demand}`}                     accent="#f59e0b" />
          <CoSCard icon={TrendingUp}   label="Projected CoS 12m"  value={data.cos_projected_required} sub={`Demand: ${data.cos_projected_demand}`}                       accent="#f43f5e" />
        </div>
      )}

      {/* ── Visa Expiry Table ── */}
      <div style={{ borderRadius: 20, overflow: "hidden", background: "#fff", border: "1px solid #e5eaf4", boxShadow: "0 2px 16px -6px rgba(26,82,150,0.10), 0 1px 4px rgba(0,0,0,0.05)" }}>
        <div className="flex items-center justify-between" style={{ padding: "15px 20px", borderBottom: "1px solid #EEF3FB", background: "#FAFCFF" }}>
          <div className="flex items-center gap-2">
            <AlertTriangle style={{ width: 15, height: 15, color: "#f59e0b" }} />
            <span className="font-bold text-gray-900" style={{ fontSize: 13 }}>Visa Expiry Alerts</span>
            <span className="rounded-full font-bold" style={{ fontSize: 11, padding: "2px 8px", background: "#EEF3FB", color: "#1a5296", border: "1px solid #d0dff5" }}>
              {data.expiring_workers.length}
            </span>
          </div>
          <button
            onClick={() => router.push("/workers/visa-expiry")}
            className="flex items-center gap-1.5 rounded-xl font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ height: 32, padding: "0 14px", fontSize: 12, color: "#fff", background: "linear-gradient(135deg, #1a5296, #2b6cd4)", boxShadow: "0 2px 8px rgba(26,82,150,0.34)" }}
          >
            View all <ArrowRight style={{ width: 11, height: 11 }} />
          </button>
        </div>

        {topAlerts.length === 0 ? (
          <p style={{ textAlign: "center", padding: "32px 20px", color: "#9ca3af", fontSize: 13 }}>No upcoming visa expiry alerts.</p>
        ) : (
          <div>
            {topAlerts.map((w, i) => {
              const urgent = w.days_left <= 0;
              const soon   = w.days_left > 0 && w.days_left <= 30;
              const bar    = urgent ? "#ef4444" : soon ? "#f59e0b" : w.days_left <= 60 ? "#f97316" : "#3b82f6";
              const badge  = urgent
                ? { bg: "#fee2e2", border: "#fecaca", text: "#dc2626" }
                : soon
                ? { bg: "#fef3c7", border: "#fde68a", text: "#b45309" }
                : w.days_left <= 60
                ? { bg: "#fff7ed", border: "#fed7aa", text: "#ea580c" }
                : { bg: "#dbeafe", border: "#bfdbfe", text: "#1d4ed8" };
              return (
                <div
                  key={w.id}
                  className="flex items-center justify-between"
                  style={{ padding: "10px 20px", borderBottom: i < topAlerts.length - 1 ? "1px solid #F0F4FA" : "none", position: "relative", transition: "background 0.15s ease" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: 3, borderRadius: "0 3px 3px 0", background: bar }} />
                  <div className="flex items-center gap-3" style={{ paddingLeft: 8 }}>
                    <div className="flex items-center justify-center rounded-full font-bold text-white shrink-0" style={{ width: 34, height: 34, fontSize: 13, background: `linear-gradient(135deg, ${bar}, ${bar}99)` }}>
                      {w.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900" style={{ fontSize: 14 }}>{w.name}</p>
                      <p style={{ fontSize: 12, color: "#8a97ac", marginTop: 2 }}>
                        {w.department || "—"} · {w.job_title || "—"} · {fmtDate(w.visa_expiry)}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-lg font-semibold shrink-0" style={{ fontSize: 11, padding: "4px 10px", background: badge.bg, border: `1px solid ${badge.border}`, color: badge.text }}>
                    {urgent ? "Expired" : `${w.days_left}d left`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Color palettes ── */
const BLUE   = { from: "#1e5fe0", via: "#2f7cf6", to: "#22b2ff", edge: "#1644a6", glow: "rgba(47,124,246,0.40)",  dot: "rgba(255,255,255,0.12)" };
const PURPLE = { from: "#7a3ff2", via: "#9656ff", to: "#c35cff", edge: "#5629aa", glow: "rgba(150,86,255,0.38)", dot: "rgba(255,255,255,0.12)" };
const AMBER  = { from: "#ea7a1f", via: "#f79a1d", to: "#f7be35", edge: "#a55a19", glow: "rgba(247,154,29,0.38)", dot: "rgba(255,255,255,0.13)" };
const PINK   = { from: "#d83d77", via: "#ee4f8c", to: "#ff6ca6", edge: "#9c2b59", glow: "rgba(238,79,140,0.36)",  dot: "rgba(255,255,255,0.12)" };
type Palette = typeof BLUE;

/* ── 3D KPI Card ── */
function KpiCard3D({ icon: Icon, label, value, sub, colors, delay = 0, onClick }: {
  icon: ComponentType<{ style?: CSSProperties }>;
  label: string; value: number | string; sub: string;
  colors: Palette; delay?: number; onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: 22,
        /* 3-stop richer gradient */
        background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.via} 50%, ${colors.to} 100%)`,
        border: "1px solid rgba(255,255,255,0.24)",
        padding: "20px 20px 18px",
        cursor: onClick ? "pointer" : "default",
        minHeight: 156,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        transform: hovered ? "translateY(-3px) scale(1.008)" : "translateY(0) scale(1)",
        transition: "transform 0.30s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.30s ease",
        /* softer 3-D depth */
        boxShadow: hovered
          ? `inset 0 1px 0 rgba(255,255,255,0.28),
             0 5px 0 ${colors.edge},
             0 14px 28px -14px ${colors.glow},
             0 4px 12px rgba(0,0,0,0.18)`
          : `inset 0 1px 0 rgba(255,255,255,0.22),
             0 3px 0 ${colors.edge},
             0 10px 20px -14px ${colors.glow},
             0 2px 8px rgba(0,0,0,0.14)`,
        animationDelay: `${delay}ms`,
      }}
    >
      {/* ── top-half glass shine ── */}
      <div style={{ position: "absolute", inset: 0, borderRadius: 22, background: "linear-gradient(165deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.03) 48%, rgba(255,255,255,0) 100%)", pointerEvents: "none", zIndex: 1 }} />

      {/* ── dot-grid pattern ── */}
      <div style={{ position: "absolute", inset: 0, borderRadius: 22,
        backgroundImage: `radial-gradient(circle, ${colors.dot} 1px, transparent 1px)`,
        backgroundSize: "20px 20px", pointerEvents: "none", zIndex: 1 }} />

      {/* ── large soft glow orb bottom-right ── */}
      <div style={{ position: "absolute", bottom: "-30%", right: "-10%", width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.10)", filter: "blur(24px)", pointerEvents: "none", zIndex: 1 }} />

      {/* ── Icon row ── */}
      <div className="flex items-start justify-between" style={{ position: "relative", zIndex: 3 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.22)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28), 0 2px 8px rgba(0,0,0,0.14)" }}>
          <Icon style={{ width: 22, height: 22, color: "#fff" }} />
        </div>
        {onClick && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 9, background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.18)" }}>
            <ArrowRight style={{ width: 13, height: 13, color: "rgba(255,255,255,0.8)" }} />
          </div>
        )}
      </div>

      {/* ── Value + labels ── */}
      <div style={{ position: "relative", zIndex: 3 }}>
        <p style={{ fontSize: 44, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: "-1px" }}>{value}</p>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 6 }}>{label}</p>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.62)", marginTop: 3 }}>{sub}</p>
      </div>
    </div>
  );
}

/* ── CoS Card: clean product style ── */
function CoSCard({ icon: Icon, label, value, sub, accent }: {
  icon: ComponentType<{ style?: CSSProperties }>;
  label: string; value: number | string; sub: string; accent: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 18,
        background: `linear-gradient(165deg, ${accent}14 0%, #ffffff 45%, #ffffff 100%)`,
        border: `1px solid ${hovered ? `${accent}66` : "#e3eaf4"}`,
        padding: "18px 18px 16px",
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.22s ease, box-shadow 0.22s ease, border 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 10px 24px -18px rgba(15, 35, 72, 0.28), 0 3px 8px rgba(15, 35, 72, 0.12)`
          : `0 6px 18px -16px rgba(15, 35, 72, 0.24), 0 2px 6px rgba(15, 35, 72, 0.10)`,
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, opacity: 0.95 }} />
      <div style={{ position: "absolute", right: -18, top: -20, width: 92, height: 92, borderRadius: "50%", background: `${accent}22`, filter: "blur(18px)" }} />

      <div style={{ position: "relative", zIndex: 2 }}>
        <div className="flex items-center gap-2.5" style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 12, background: `${accent}18`, border: `1px solid ${accent}30` }}>
            <Icon style={{ width: 17, height: 17, color: accent }} />
          </div>
          <p style={{ fontSize: 12.5, fontWeight: 600, color: "#5b6b84" }}>{label}</p>
        </div>
        <p style={{ fontSize: 42, fontWeight: 900, color: "#10223e", lineHeight: 1, letterSpacing: "-1px" }}>{value}</p>
        <p style={{ fontSize: 11, color: "#7a879c", marginTop: 8 }}>{sub}</p>
      </div>
    </div>
  );
}
