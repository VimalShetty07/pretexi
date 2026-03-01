"use client";

import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Flag, Plus, User, AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";

type Holiday = {
  id: string;
  name: string;
  date: string;
  description?: string | null;
  type: "holiday";
};

type LeaveEvent = {
  id: string;
  worker_name: string;
  worker_department?: string | null;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  type: "leave";
};

type VisaEvent = {
  id: string;
  worker_name: string;
  worker_department?: string | null;
  date: string;
  days_left: number;
  type: "visa_expiry";
};

type BgVerificationEvent = {
  id: string;
  worker_id: string;
  worker_name: string;
  worker_department?: string | null;
  referee_name: string;
  date: string;
  reference_status?: string | null;
  verification_status?: string | null;
  type: "bg_verification";
};

type EventsResponse = {
  holidays: Holiday[];
  leaves: LeaveEvent[];
  visa_expiries: VisaEvent[];
  bg_verifications: BgVerificationEvent[];
};

const STAFF_ROLES = ["super_admin", "compliance_manager", "hr_officer", "payroll_officer"];

export default function CalendarPage() {
  const { token, user } = useAuth();
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [events, setEvents] = useState<EventsResponse>({
    holidays: [],
    leaves: [],
    visa_expiries: [],
    bg_verifications: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayDescription, setHolidayDescription] = useState("");
  const [savingHoliday, setSavingHoliday] = useState(false);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth() + 1;
  const canManageHolidays = Boolean(user && STAFF_ROLES.includes(user.role));

  const loadEvents = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await api.get<EventsResponse>(`/calendar/events?year=${year}&month=${month}`, token);
      setEvents(data);
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load calendar events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, year, month]);

  const submitHoliday = async () => {
    if (!token || !holidayName || !holidayDate) return;
    try {
      setSavingHoliday(true);
      await api.post("/calendar/holidays", {
        name: holidayName,
        date: holidayDate,
        description: holidayDescription || null,
      }, token);
      setHolidayName("");
      setHolidayDate("");
      setHolidayDescription("");
      setShowAddHoliday(false);
      await loadEvents();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add holiday");
    } finally {
      setSavingHoliday(false);
    }
  };

  const monthLabel = useMemo(
    () => monthDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    [monthDate]
  );

  if (loading) return <p className="text-sm text-white/80">Loading calendar...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="flex items-center justify-between flex-wrap" style={{ gap: 12 }}>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Calendar</h1>
          <p className="text-sm text-white/70" style={{ marginTop: 4 }}>
            Holidays, approved leave, visa expiry and BG verification milestones
          </p>
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          <button
            className="rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/15"
            style={{ width: 36, height: 36 }}
            onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          >
            <ChevronLeft style={{ width: 16, height: 16, margin: "0 auto" }} />
          </button>
          <div className="rounded-xl bg-white/10 border border-white/15 text-white font-semibold" style={{ padding: "7px 14px", minWidth: 180, textAlign: "center" }}>
            {monthLabel}
          </div>
          <button
            className="rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/15"
            style={{ width: 36, height: 36 }}
            onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          >
            <ChevronRight style={{ width: 16, height: 16, margin: "0 auto" }} />
          </button>
          {canManageHolidays && (
            <button
              className="inline-flex items-center rounded-xl bg-brand-600 text-white hover:bg-brand-700"
              style={{ height: 36, padding: "0 12px", gap: 6 }}
              onClick={() => setShowAddHoliday(true)}
            >
              <Plus style={{ width: 14, height: 14 }} /> Add Holiday
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 10 }}>
        <CalendarKpiCard icon={Flag} value={events.holidays.length} label="Holidays" variant="kpi-blue" />
        <CalendarKpiCard icon={CalendarDays} value={events.leaves.length} label="Leave Events" variant="kpi-purple" />
        <CalendarKpiCard icon={AlertTriangle} value={events.visa_expiries.length} label="Visa Expiries" variant="kpi-amber" />
        <CalendarKpiCard icon={User} value={events.bg_verifications.length} label="BG Verifications" variant="kpi-pink" />
      </div>

      {error && <p className="text-sm text-red-200">{error}</p>}

      <div className="data-card" style={{ padding: 16 }}>
        <h3 className="text-sm font-semibold text-gray-900">Holidays</h3>
        {events.holidays.length === 0 ? (
          <p className="text-sm text-gray-500" style={{ marginTop: 8 }}>No holidays this month.</p>
        ) : (
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            {events.holidays.map((h) => (
              <div key={h.id} className="rounded-xl border border-blue-100 bg-blue-50" style={{ padding: "10px 12px" }}>
                <p className="text-sm font-semibold text-blue-900">{h.name}</p>
                <p className="text-xs text-blue-700" style={{ marginTop: 2 }}>
                  {new Date(h.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 12 }}>
        <div className="data-card" style={{ padding: 16 }}>
          <h3 className="text-sm font-semibold text-gray-900">Approved Leave</h3>
          {events.leaves.length === 0 ? (
            <p className="text-sm text-gray-500" style={{ marginTop: 8 }}>No approved leave this month.</p>
          ) : (
            <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
              {events.leaves.map((e) => (
                <div key={e.id} className="rounded-xl border border-purple-100 bg-purple-50" style={{ padding: "10px 12px" }}>
                  <p className="text-sm font-semibold text-purple-900">{e.worker_name}</p>
                  <p className="text-xs text-purple-700">{e.leave_type} · {e.days} day(s)</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="data-card" style={{ padding: 16 }}>
          <h3 className="text-sm font-semibold text-gray-900">Visa Expiries</h3>
          {events.visa_expiries.length === 0 ? (
            <p className="text-sm text-gray-500" style={{ marginTop: 8 }}>No visa expiry this month.</p>
          ) : (
            <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
              {events.visa_expiries.map((e) => (
                <div key={`visa-${e.id}`} className="rounded-xl bg-red-50 border border-red-200" style={{ padding: "10px 12px" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-red-800">{e.worker_name}</span>
                    <span className="text-xs text-red-700">{e.days_left <= 0 ? "Expired" : `${e.days_left} days`}</span>
                  </div>
                  <p className="text-xs text-red-700" style={{ marginTop: 2 }}>
                    {new Date(e.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="data-card" style={{ padding: 16 }}>
        <h3 className="text-sm font-semibold text-gray-900">Background Verification</h3>
        {events.bg_verifications.length === 0 ? (
          <p className="text-sm text-gray-500" style={{ marginTop: 8 }}>No BG verification milestones this month.</p>
        ) : (
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            {events.bg_verifications.map((e) => (
              <div key={`bg-${e.id}`} className="rounded-xl border border-pink-100 bg-pink-50" style={{ padding: "10px 12px" }}>
                <p className="text-sm font-semibold text-pink-900">{e.worker_name}</p>
                <p className="text-xs text-pink-700">Referee: {e.referee_name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddHoliday && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4">
          <div className="data-card w-full max-w-md" style={{ padding: 18 }}>
            <h3 className="text-lg font-semibold text-gray-900">Add Holiday</h3>
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <input
                className="w-full rounded-xl border border-gray-300 bg-white text-sm text-gray-900 outline-none focus:border-blue-400"
                style={{ height: 38, padding: "0 12px" }}
                placeholder="Holiday name"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
              />
              <input
                type="date"
                className="w-full rounded-xl border border-gray-300 bg-white text-sm text-gray-900 outline-none focus:border-blue-400"
                style={{ height: 38, padding: "0 12px" }}
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
              />
              <textarea
                className="w-full rounded-xl border border-gray-300 bg-white text-sm text-gray-900 outline-none focus:border-blue-400"
                style={{ minHeight: 72, padding: "8px 12px" }}
                placeholder="Description (optional)"
                value={holidayDescription}
                onChange={(e) => setHolidayDescription(e.target.value)}
              />
            </div>
            <div className="flex justify-end" style={{ gap: 8, marginTop: 12 }}>
              <button
                className="rounded-xl border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
                style={{ height: 36, padding: "0 12px" }}
                onClick={() => setShowAddHoliday(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-brand-600 text-sm text-white hover:bg-brand-700"
                style={{ height: 36, padding: "0 14px" }}
                onClick={submitHoliday}
                disabled={savingHoliday}
              >
                {savingHoliday ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarKpiCard({
  icon: Icon,
  value,
  label,
  variant,
}: {
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  value: number;
  label: string;
  variant: "kpi-blue" | "kpi-purple" | "kpi-amber" | "kpi-pink";
}) {
  return (
    <div className={`kpi-card ${variant} calendar-kpi-no-glow`} style={{ minHeight: 98, padding: "12px 12px" }}>
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-white/15" style={{ padding: 7 }}>
          <Icon style={{ width: 15, height: 15 }} className="text-white" />
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
      <p className="text-xs text-white/85" style={{ marginTop: 8 }}>{label}</p>
    </div>
  );
}
