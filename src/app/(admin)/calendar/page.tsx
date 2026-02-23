"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Trash2,
  Loader2,
  CalendarDays,
  Flag,
  User,
} from "lucide-react";

interface HolidayEvent {
  id: string;
  name: string;
  date: string;
  description: string | null;
  type: "holiday";
}

interface LeaveEvent {
  id: string;
  worker_name: string;
  worker_department: string | null;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  type: "leave";
}

type CalendarEvent = HolidayEvent | LeaveEvent;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const LEAVE_COLORS: Record<string, string> = {
  annual: "bg-blue-100 text-blue-800 border-blue-200",
  sick: "bg-orange-100 text-orange-800 border-orange-200",
  unpaid: "bg-gray-100 text-gray-700 border-gray-200",
  maternity: "bg-pink-100 text-pink-800 border-pink-200",
  paternity: "bg-indigo-100 text-indigo-800 border-indigo-200",
  compassionate: "bg-purple-100 text-purple-800 border-purple-200",
  other: "bg-gray-100 text-gray-700 border-gray-200",
};

const STAFF_ROLES = ["super_admin", "compliance_manager", "hr_officer"];

function isDateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export default function CalendarPage() {
  const { token, user } = useAuth();
  const isStaff = user ? STAFF_ROLES.includes(user.role) : false;

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [holidays, setHolidays] = useState<HolidayEvent[]>([]);
  const [leaves, setLeaves] = useState<LeaveEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDate, setAddDate] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ holidays: HolidayEvent[]; leaves: LeaveEvent[] }>(
        `/calendar/events?year=${year}&month=${month}`,
        token ?? undefined
      );
      setHolidays(data.holidays);
      setLeaves(data.leaves);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [token, year, month]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName || !addDate) return;
    setSubmitting(true);
    try {
      await api.post(
        "/calendar/holidays",
        { name: addName, date: addDate, description: addDesc || null },
        token ?? undefined
      );
      setShowAddHoliday(false);
      setAddName("");
      setAddDate("");
      setAddDesc("");
      await fetchEvents();
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/calendar/holidays/${id}`, token ?? undefined);
      await fetchEvents();
    } catch {
      /* ignore */
    } finally {
      setDeletingId(null);
    }
  };

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  let startDow = firstDay.getDay();
  if (startDow === 0) startDow = 7; // Monday = 1

  const cells: (number | null)[] = [];
  for (let i = 1; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  function getEventsForDate(day: number): CalendarEvent[] {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const result: CalendarEvent[] = [];
    for (const h of holidays) {
      if (h.date === dateStr) result.push(h);
    }
    for (const l of leaves) {
      if (isDateInRange(dateStr, l.start_date, l.end_date)) result.push(l);
    }
    return result;
  }

  const selectedEvents = selectedDate
    ? getEventsForDate(parseInt(selectedDate.split("-")[2]))
    : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap" style={{ gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="text-2xl font-bold text-brand-900 tracking-tight">Calendar</h1>
          <p className="text-sm text-[var(--muted-foreground)]" style={{ marginTop: 4 }}>
            Holidays and approved employee leaves.
          </p>
        </div>
        {isStaff && (
          <button
            type="button"
            onClick={() => { setShowAddHoliday(true); setAddDate(`${year}-${String(month).padStart(2, "0")}-01`); }}
            className="inline-flex items-center rounded-xl bg-brand-600 text-sm font-medium text-white hover:bg-brand-700 transition-colors cursor-pointer"
            style={{ height: 40, padding: "0 18px", gap: 8 }}
          >
            <Plus style={{ width: 15, height: 15 }} />
            Add Holiday
          </button>
        )}
      </div>

      {/* Month navigation */}
      <div
        className="flex items-center justify-between bg-white rounded-xl border border-[var(--border)]"
        style={{ padding: "12px 20px", marginBottom: 16 }}
      >
        <button type="button" onClick={prevMonth} className="rounded-lg hover:bg-brand-50 transition-colors cursor-pointer" style={{ padding: 8 }}>
          <ChevronLeft style={{ width: 20, height: 20 }} className="text-brand-700" />
        </button>
        <h2 className="text-lg font-bold text-brand-900">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <button type="button" onClick={nextMonth} className="rounded-lg hover:bg-brand-50 transition-colors cursor-pointer" style={{ padding: 8 }}>
          <ChevronRight style={{ width: 20, height: 20 }} className="text-brand-700" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center flex-wrap" style={{ gap: 16, marginBottom: 16 }}>
        <div className="flex items-center" style={{ gap: 6 }}>
          <div className="rounded" style={{ width: 12, height: 12, background: "#dc2626" }} />
          <span className="text-xs text-[var(--muted-foreground)]">Holiday</span>
        </div>
        <div className="flex items-center" style={{ gap: 6 }}>
          <div className="rounded" style={{ width: 12, height: 12, background: "#3b82f6" }} />
          <span className="text-xs text-[var(--muted-foreground)]">Annual Leave</span>
        </div>
        <div className="flex items-center" style={{ gap: 6 }}>
          <div className="rounded" style={{ width: 12, height: 12, background: "#f97316" }} />
          <span className="text-xs text-[var(--muted-foreground)]">Sick Leave</span>
        </div>
        <div className="flex items-center" style={{ gap: 6 }}>
          <div className="rounded" style={{ width: 12, height: 12, background: "#8b5cf6" }} />
          <span className="text-xs text-[var(--muted-foreground)]">Other Leave</span>
        </div>
      </div>

      <div className="flex" style={{ gap: 20 }}>
        {/* Calendar grid */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-[var(--border)]">
              {DAY_NAMES.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-semibold text-[var(--muted-foreground)] uppercase"
                  style={{ padding: "10px 0", letterSpacing: "0.05em" }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days */}
            {loading ? (
              <div className="flex items-center justify-center" style={{ padding: 80 }}>
                <Loader2 className="animate-spin text-brand-500" style={{ width: 24, height: 24 }} />
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {cells.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="border-b border-r border-[var(--border)] bg-gray-50/50" style={{ minHeight: 90 }} />;
                  }

                  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const events = getEventsForDate(day);
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  const isWeekend = (idx % 7 === 5) || (idx % 7 === 6);

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      className={`border-b border-r border-[var(--border)] text-left transition-colors cursor-pointer ${
                        isSelected ? "bg-brand-50" : isWeekend ? "bg-gray-50/40" : "bg-white hover:bg-gray-50"
                      }`}
                      style={{ minHeight: 90, padding: "6px 8px" }}
                    >
                      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                        <span
                          className={`inline-flex items-center justify-center rounded-full text-xs font-semibold ${
                            isToday
                              ? "bg-brand-600 text-white"
                              : "text-brand-800"
                          }`}
                          style={{ width: 24, height: 24 }}
                        >
                          {day}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {events.slice(0, 3).map((ev) => {
                          if (ev.type === "holiday") {
                            return (
                              <div
                                key={ev.id}
                                className="rounded text-white truncate"
                                style={{ padding: "1px 6px", fontSize: 10, background: "#dc2626" }}
                                title={ev.name}
                              >
                                {ev.name}
                              </div>
                            );
                          }
                          const colors = LEAVE_COLORS[ev.leave_type] ?? LEAVE_COLORS.other;
                          return (
                            <div
                              key={ev.id}
                              className={`rounded border truncate ${colors}`}
                              style={{ padding: "1px 6px", fontSize: 10 }}
                              title={`${ev.worker_name} - ${ev.leave_type}`}
                            >
                              {ev.worker_name}
                            </div>
                          );
                        })}
                        {events.length > 3 && (
                          <div className="text-xs text-[var(--muted-foreground)]" style={{ paddingLeft: 4 }}>
                            +{events.length - 3} more
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — selected date details */}
        <div style={{ width: 300, flexShrink: 0 }}>
          <div className="bg-white rounded-2xl border border-[var(--border)] sticky" style={{ top: 100, padding: "20px 20px" }}>
            {selectedDate ? (
              <>
                <h3 className="text-sm font-semibold text-brand-900" style={{ marginBottom: 14 }}>
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </h3>
                {selectedEvents.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">No events on this day.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedEvents.map((ev) => {
                      if (ev.type === "holiday") {
                        return (
                          <div key={ev.id} className="rounded-xl bg-red-50 border border-red-200" style={{ padding: "12px 14px" }}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center" style={{ gap: 8 }}>
                                <Flag style={{ width: 14, height: 14 }} className="text-red-600" />
                                <span className="text-sm font-semibold text-red-800">{ev.name}</span>
                              </div>
                              {isStaff && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteHoliday(ev.id)}
                                  disabled={deletingId === ev.id}
                                  className="text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                                  title="Delete holiday"
                                >
                                  {deletingId === ev.id ? (
                                    <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
                                  ) : (
                                    <Trash2 style={{ width: 14, height: 14 }} />
                                  )}
                                </button>
                              )}
                            </div>
                            {ev.description && (
                              <p className="text-xs text-red-700" style={{ marginTop: 4 }}>{ev.description}</p>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div key={ev.id} className="rounded-xl bg-blue-50 border border-blue-200" style={{ padding: "12px 14px" }}>
                          <div className="flex items-center" style={{ gap: 8 }}>
                            <User style={{ width: 14, height: 14 }} className="text-blue-600" />
                            <span className="text-sm font-semibold text-blue-800">{ev.worker_name}</span>
                          </div>
                          <p className="text-xs text-blue-700 capitalize" style={{ marginTop: 4 }}>
                            {ev.leave_type} leave
                            {ev.worker_department && ` · ${ev.worker_department}`}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)]" style={{ marginTop: 2 }}>
                            {new Date(ev.start_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                            {" — "}
                            {new Date(ev.end_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                            {" "}({ev.days} day{ev.days !== 1 ? "s" : ""})
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center" style={{ padding: "20px 0" }}>
                <CalendarDays className="mx-auto text-[var(--muted-foreground)]" style={{ width: 28, height: 28, marginBottom: 8 }} />
                <p className="text-sm text-[var(--muted-foreground)]">
                  Click a date to see details
                </p>
              </div>
            )}

            {/* Upcoming holidays list */}
            {holidays.length > 0 && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide" style={{ marginBottom: 10 }}>
                  Holidays this month
                </h4>
                <div className="space-y-2">
                  {holidays.map((h) => (
                    <div key={h.id} className="flex items-center" style={{ gap: 8 }}>
                      <div className="rounded-full shrink-0" style={{ width: 8, height: 8, background: "#dc2626" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-brand-900 truncate">{h.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {new Date(h.date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Holiday Modal */}
      {showAddHoliday && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddHoliday(false); }}
        >
          <div
            className="bg-white rounded-2xl border border-[var(--border)] shadow-xl w-full"
            style={{ maxWidth: 440, padding: "28px 32px" }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
              <h2 className="text-lg font-bold text-brand-900">Add Holiday</h2>
              <button
                type="button"
                onClick={() => setShowAddHoliday(false)}
                className="flex items-center justify-center rounded-lg hover:bg-brand-50 transition-colors cursor-pointer"
                style={{ width: 32, height: 32 }}
              >
                <X className="text-[var(--muted-foreground)]" style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <form onSubmit={handleAddHoliday} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="block text-sm font-medium text-brand-800" style={{ marginBottom: 6 }}>
                  Holiday Name
                </label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Christmas Day"
                  required
                  className="w-full rounded-xl border border-[var(--border)] bg-white text-sm text-brand-900 outline-none focus:border-brand-400"
                  style={{ height: 40, padding: "0 14px" }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-800" style={{ marginBottom: 6 }}>
                  Date
                </label>
                <input
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[var(--border)] bg-white text-sm text-brand-900 outline-none focus:border-brand-400"
                  style={{ height: 40, padding: "0 14px" }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-800" style={{ marginBottom: 6 }}>
                  Description <span className="text-[var(--muted-foreground)] font-normal">(optional)</span>
                </label>
                <textarea
                  value={addDesc}
                  onChange={(e) => setAddDesc(e.target.value)}
                  placeholder="Additional details..."
                  rows={2}
                  className="w-full rounded-xl border border-[var(--border)] bg-white text-sm text-brand-900 outline-none focus:border-brand-400 resize-none"
                  style={{ padding: "10px 14px" }}
                />
              </div>

              <div className="flex items-center justify-end" style={{ gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowAddHoliday(false)}
                  className="rounded-xl border border-[var(--border)] bg-white text-sm font-medium text-brand-800 hover:bg-brand-50 transition-colors cursor-pointer"
                  style={{ height: 40, padding: "0 18px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center rounded-xl bg-brand-600 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors cursor-pointer"
                  style={{ height: 40, padding: "0 20px", gap: 8 }}
                >
                  {submitting && <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />}
                  {submitting ? "Adding..." : "Add Holiday"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
