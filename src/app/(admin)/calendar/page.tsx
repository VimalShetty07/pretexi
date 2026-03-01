"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
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
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
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
  const monthIndex = monthDate.getMonth();

  const dayStats = useMemo(() => {
    const map = new Map<string, { holidays: number; leaves: number; visa: number; bg: number }>();
    const ensure = (key: string) => {
      if (!map.has(key)) map.set(key, { holidays: 0, leaves: 0, visa: 0, bg: 0 });
      return map.get(key)!;
    };

    const inCurrentMonth = (d: Date) => d.getFullYear() === year && d.getMonth() === monthIndex;
    const keyOf = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const parseDate = (v: string) => new Date(v.length > 10 ? v : `${v}T00:00:00`);

    events.holidays.forEach((h) => {
      const d = parseDate(h.date);
      if (!Number.isNaN(d.getTime()) && inCurrentMonth(d)) ensure(keyOf(d)).holidays += 1;
    });

    events.visa_expiries.forEach((v) => {
      const d = parseDate(v.date);
      if (!Number.isNaN(d.getTime()) && inCurrentMonth(d)) ensure(keyOf(d)).visa += 1;
    });

    events.bg_verifications.forEach((b) => {
      const d = parseDate(b.date);
      if (!Number.isNaN(d.getTime()) && inCurrentMonth(d)) ensure(keyOf(d)).bg += 1;
    });

    events.leaves.forEach((l) => {
      const start = parseDate(l.start_date);
      const end = parseDate(l.end_date);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (cur <= last) {
        if (inCurrentMonth(cur)) ensure(keyOf(cur)).leaves += 1;
        cur.setDate(cur.getDate() + 1);
      }
    });

    return map;
  }, [events, year, monthIndex]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, monthIndex, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();
    const totalCells = 42;

    const cells: Array<{ date: Date; inCurrentMonth: boolean }> = [];

    for (let i = 0; i < startWeekday; i += 1) {
      const day = daysInPrevMonth - startWeekday + i + 1;
      cells.push({ date: new Date(year, monthIndex - 1, day), inCurrentMonth: false });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ date: new Date(year, monthIndex, day), inCurrentMonth: true });
    }

    let nextDay = 1;
    while (cells.length < totalCells) {
      cells.push({ date: new Date(year, monthIndex + 1, nextDay), inCurrentMonth: false });
      nextDay += 1;
    }

    return cells;
  }, [year, monthIndex]);

  const selectedDateKey = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  const selectedDateLabel = useMemo(
    () => selectedDate.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }),
    [selectedDate]
  );

  const detailsForSelectedDate = useMemo(() => {
    const parseDate = (v: string) => new Date(v.length > 10 ? v : `${v}T00:00:00`);
    const keyOf = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const holidays = events.holidays.filter((h) => {
      const d = parseDate(h.date);
      return !Number.isNaN(d.getTime()) && keyOf(d) === selectedDateKey;
    });

    const visa = events.visa_expiries.filter((v) => {
      const d = parseDate(v.date);
      return !Number.isNaN(d.getTime()) && keyOf(d) === selectedDateKey;
    });

    const bg = events.bg_verifications.filter((b) => {
      const d = parseDate(b.date);
      return !Number.isNaN(d.getTime()) && keyOf(d) === selectedDateKey;
    });

    const leaves = events.leaves.filter((l) => {
      const start = parseDate(l.start_date);
      const end = parseDate(l.end_date);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (cur <= last) {
        if (keyOf(cur) === selectedDateKey) return true;
        cur.setDate(cur.getDate() + 1);
      }
      return false;
    });

    return { holidays, leaves, visa, bg };
  }, [events, selectedDateKey]);

  if (loading) return <p className="text-sm text-gray-500">Loading calendar...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="flex items-center justify-between flex-wrap" style={{ gap: 12 }}>
        <div>
          <h1 className="admin-page-title">Calendar</h1>
          <p className="admin-page-subtitle" style={{ marginTop: 6 }}>
            Holidays, approved leave, visa expiry and BG verification milestones
          </p>
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          <button
            className="rounded-xl border border-[var(--border)] bg-white text-brand-800 hover:bg-brand-50 transition-colors"
            style={{ width: 36, height: 36 }}
            onClick={() => {
              const next = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
              setMonthDate(next);
              setSelectedDate(next);
            }}
          >
            <ChevronLeft style={{ width: 16, height: 16, margin: "0 auto" }} />
          </button>
          <div className="rounded-xl bg-white border border-[var(--border)] text-brand-900 font-semibold" style={{ padding: "7px 14px", minWidth: 180, textAlign: "center" }}>
            {monthLabel}
          </div>
          <button
            className="rounded-xl border border-[var(--border)] bg-white text-brand-800 hover:bg-brand-50 transition-colors"
            style={{ width: 36, height: 36 }}
            onClick={() => {
              const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
              setMonthDate(next);
              setSelectedDate(next);
            }}
          >
            <ChevronRight style={{ width: 16, height: 16, margin: "0 auto" }} />
          </button>
          {canManageHolidays && (
            <button
              className="inline-flex items-center rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors"
              style={{ height: 36, padding: "0 14px", gap: 6, fontSize: 12, fontWeight: 600 }}
              onClick={() => setShowAddHoliday(true)}
            >
              <Plus style={{ width: 14, height: 14 }} /> Add Holiday
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="data-card" style={{ padding: 16 }}>
        <div className="grid grid-cols-7 border border-[var(--border)] rounded-xl overflow-hidden">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="bg-[var(--muted)] text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]"
              style={{ padding: "10px 8px", borderRight: "1px solid var(--border)" }}
            >
              {d}
            </div>
          ))}

          {calendarCells.map(({ date, inCurrentMonth }, idx) => {
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            const stat = dayStats.get(key) || { holidays: 0, leaves: 0, visa: 0, bg: 0 };
            const total = stat.holidays + stat.leaves + stat.visa + stat.bg;
            const isToday =
              date.getFullYear() === new Date().getFullYear() &&
              date.getMonth() === new Date().getMonth() &&
              date.getDate() === new Date().getDate();

            return (
              <div
                key={`${key}-${idx}`}
                className={inCurrentMonth ? "bg-white" : "bg-gray-50"}
                style={{
                  minHeight: 112,
                  padding: 8,
                  borderTop: "1px solid var(--border)",
                  borderRight: (idx + 1) % 7 === 0 ? "none" : "1px solid var(--border)",
                  boxShadow:
                    selectedDateKey === key
                      ? "inset 0 0 0 2px rgba(37,99,235,0.6)"
                      : undefined,
                  cursor: inCurrentMonth ? "pointer" : "default",
                }}
                onClick={() => {
                  if (inCurrentMonth) setSelectedDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
                }}
              >
                <div className="flex items-center justify-between">
                  <p
                    className={inCurrentMonth ? "text-sm font-semibold text-brand-900" : "text-sm text-gray-400"}
                    style={
                      isToday
                        ? {
                            background: "var(--color-brand-600)",
                            color: "#fff",
                            width: 22,
                            height: 22,
                            borderRadius: 999,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                          }
                        : undefined
                    }
                  >
                    {date.getDate()}
                  </p>
                  {inCurrentMonth && total > 0 && (
                    <span className="text-[11px] font-medium text-brand-700 bg-brand-50 rounded-full" style={{ padding: "2px 8px" }}>
                      {total}
                    </span>
                  )}
                </div>

                {inCurrentMonth && (
                  <div style={{ marginTop: 8, display: "grid", gap: 5 }}>
                    {stat.holidays > 0 && (
                      <div className="rounded-md bg-blue-50 text-blue-700" style={{ fontSize: 11, padding: "3px 6px" }}>
                        Holiday: {stat.holidays}
                      </div>
                    )}
                    {stat.leaves > 0 && (
                      <div className="rounded-md bg-purple-50 text-purple-700" style={{ fontSize: 11, padding: "3px 6px" }}>
                        Leave: {stat.leaves}
                      </div>
                    )}
                    {stat.visa > 0 && (
                      <div className="rounded-md bg-amber-50 text-amber-700" style={{ fontSize: 11, padding: "3px 6px" }}>
                        Visa: {stat.visa}
                      </div>
                    )}
                    {stat.bg > 0 && (
                      <div className="rounded-md bg-pink-50 text-pink-700" style={{ fontSize: 11, padding: "3px 6px" }}>
                        BG Verify: {stat.bg}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="data-card" style={{ padding: 16 }}>
        <div className="flex items-center justify-between flex-wrap" style={{ gap: 8 }}>
          <h3 className="text-sm font-semibold text-gray-900">Details for {selectedDateLabel}</h3>
          <span className="text-xs text-[var(--muted-foreground)]">Click any date in calendar</span>
        </div>

        {detailsForSelectedDate.holidays.length === 0 &&
        detailsForSelectedDate.leaves.length === 0 &&
        detailsForSelectedDate.visa.length === 0 &&
        detailsForSelectedDate.bg.length === 0 ? (
          <p className="text-sm text-gray-500" style={{ marginTop: 8 }}>
            No calendar records on this date.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 10, marginTop: 10 }}>
            <div className="rounded-xl border border-blue-100 bg-blue-50" style={{ padding: "10px 12px" }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Holidays</p>
              {detailsForSelectedDate.holidays.length === 0 ? (
                <p className="text-xs text-blue-700" style={{ marginTop: 6 }}>None</p>
              ) : (
                <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
                  {detailsForSelectedDate.holidays.map((h) => (
                    <p key={h.id} className="text-sm text-blue-900">{h.name}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-purple-100 bg-purple-50" style={{ padding: "10px 12px" }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-800">Approved Leave</p>
              {detailsForSelectedDate.leaves.length === 0 ? (
                <p className="text-xs text-purple-700" style={{ marginTop: 6 }}>None</p>
              ) : (
                <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
                  {detailsForSelectedDate.leaves.map((l) => (
                    <p key={l.id} className="text-sm text-purple-900">
                      {l.worker_name} · {l.leave_type} ({l.days} day{l.days > 1 ? "s" : ""})
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50" style={{ padding: "10px 12px" }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Visa Expiry</p>
              {detailsForSelectedDate.visa.length === 0 ? (
                <p className="text-xs text-amber-700" style={{ marginTop: 6 }}>None</p>
              ) : (
                <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
                  {detailsForSelectedDate.visa.map((v) => (
                    <p key={v.id} className="text-sm text-amber-900">
                      {v.worker_name} · {v.days_left <= 0 ? "Expired" : `${v.days_left} days left`}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-pink-100 bg-pink-50" style={{ padding: "10px 12px" }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-pink-800">BG Verification</p>
              {detailsForSelectedDate.bg.length === 0 ? (
                <p className="text-xs text-pink-700" style={{ marginTop: 6 }}>None</p>
              ) : (
                <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
                  {detailsForSelectedDate.bg.map((b) => (
                    <p key={b.id} className="text-sm text-pink-900">
                      {b.worker_name} · Referee: {b.referee_name}
                    </p>
                  ))}
                </div>
              )}
            </div>
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
