"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  CalendarDays,
  CircleDot,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import "../dashboard/dashboard-marketing.css";
import "../workers/workers-page.css";
import "./calendar-page.css";

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

type EventsResponse = {
  holidays: Holiday[];
  leaves: LeaveEvent[];
  visa_expiries: VisaEvent[];
};

const STAFF_ROLES = ["super_admin", "compliance_manager", "hr_officer", "payroll_officer"];

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

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
  });
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");

  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayDescription, setHolidayDescription] = useState("");
  const [savingHoliday, setSavingHoliday] = useState(false);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth() + 1;
  const canManageHolidays = Boolean(user && STAFF_ROLES.includes(user.role));

  const loadEvents = useCallback(async () => {
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
      setInitializing(false);
    }
  }, [token, year, month]);

  useEffect(() => {
    if (!token) {
      setInitializing(false);
      setLoading(false);
      return;
    }
    loadEvents();
  }, [token, loadEvents]);

  const submitHoliday = async () => {
    if (!token || !holidayName || !holidayDate) return;
    try {
      setSavingHoliday(true);
      await api.post(
        "/calendar/holidays",
        {
          name: holidayName,
          date: holidayDate,
          description: holidayDescription || null,
        },
        token
      );
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
    const map = new Map<string, { holidays: number; leaves: number; visa: number }>();
    const ensure = (key: string) => {
      if (!map.has(key)) map.set(key, { holidays: 0, leaves: 0, visa: 0 });
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
    () =>
      selectedDate.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
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

    return { holidays, leaves, visa };
  }, [events, selectedDateKey]);

  const goToToday = () => {
    const d = new Date();
    setMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelectedDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
  };

  if (initializing && loading && token) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Loading calendar…
        </p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Sign in to view the calendar.
        </p>
      </div>
    );
  }

  if (error && initializing === false && events.holidays.length === 0 && events.leaves.length === 0 && events.visa_expiries.length === 0) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#dc2626]" style={MONO}>
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="protexi-dash-marketing flex flex-col gap-0">
      {error && (
        <div className="mb-3 border border-red-200 bg-red-50 text-red-700" style={{ padding: "10px 12px", fontSize: 12, ...MONO }}>
          {error}
        </div>
      )}

      <div className="cal-main-grid">
        <div className="cal-panel wem-surface min-w-0">
          <div className="cal-panel-hd">
            <div className="min-w-0">
              <p className="cal-panel-hd-title">Month grid</p>
              <p className="cal-panel-hd-sub">{monthLabel} · Sun–Sat</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center border border-[rgba(0,0,0,0.1)] bg-white text-[#0f2d5e] transition-colors hover:bg-[rgba(26,79,160,0.08)]"
                  style={MONO}
                  aria-label="Previous month"
                  onClick={() => {
                    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
                    setMonthDate(next);
                    setSelectedDate(next);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div
                  className="min-w-[140px] border border-[rgba(0,0,0,0.1)] bg-white px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em] text-[#0a0a0a] sm:min-w-[160px] sm:px-3 sm:text-[11px]"
                  style={MONO}
                >
                  {monthLabel}
                </div>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center border border-[rgba(0,0,0,0.1)] bg-white text-[#0f2d5e] transition-colors hover:bg-[rgba(26,79,160,0.08)]"
                  style={MONO}
                  aria-label="Next month"
                  onClick={() => {
                    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
                    setMonthDate(next);
                    setSelectedDate(next);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              {canManageHolidays && (
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 border border-[rgba(0,0,0,0.12)] bg-[#0f2d5e] px-3 text-[9px] font-bold uppercase tracking-[0.07em] text-white hover:bg-[#1a4fa0]"
                  style={MONO}
                  onClick={() => setShowAddHoliday(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add holiday
                </button>
              )}
            </div>
          </div>
          <div className="wem-toolbar cal-panel-hd--toolbar border-t-0">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <span className="wem-badge-mono shrink-0" style={MONO}>
                {loading ? "Updating…" : "Month view"}
              </span>
              <div className="hidden items-center gap-3 sm:flex" aria-hidden>
                <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={MONO}>
                  <span className="cal-dot cal-dot--holiday" />
                  Holiday
                </span>
                <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={MONO}>
                  <span className="cal-dot cal-dot--leave" />
                  Leave
                </span>
                <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748b]" style={MONO}>
                  <span className="cal-dot cal-dot--visa" />
                  Visa
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin text-[#94a3b8]" aria-hidden />}
              <button
                type="button"
                onClick={goToToday}
                className="h-8 border border-[rgba(0,0,0,0.1)] bg-white px-3 text-[9px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[rgba(26,79,160,0.08)]"
                style={MONO}
              >
                Today
              </button>
            </div>
          </div>

          <div className="cal-grid-body">
            <div className="cal-grid-frame">
              <div className="cal-grid-inner">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="cal-weekday">
                    {d}
                  </div>
                ))}

                {calendarCells.map(({ date, inCurrentMonth }, idx) => {
                  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                  const stat = dayStats.get(key) || { holidays: 0, leaves: 0, visa: 0 };
                  const total = stat.holidays + stat.leaves + stat.visa;
                  const isToday =
                    date.getFullYear() === new Date().getFullYear() &&
                    date.getMonth() === new Date().getMonth() &&
                    date.getDate() === new Date().getDate();
                  const isSelected = selectedDateKey === key;

                  const dotTitle = [
                    stat.holidays ? `${stat.holidays} holiday${stat.holidays !== 1 ? "s" : ""}` : null,
                    stat.leaves ? `${stat.leaves} leave` : null,
                    stat.visa ? `${stat.visa} visa` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <div
                      key={`${key}-${idx}`}
                      className={[
                        "cal-cell",
                        !inCurrentMonth ? "cal-cell--muted" : "",
                        inCurrentMonth ? "cal-cell--interactive cursor-pointer" : "cursor-default",
                        isSelected && inCurrentMonth ? "cal-cell--selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      title={inCurrentMonth && total > 0 ? dotTitle : undefined}
                      onClick={() => {
                        if (inCurrentMonth) setSelectedDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
                      }}
                      role={inCurrentMonth ? "button" : undefined}
                      tabIndex={inCurrentMonth ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (!inCurrentMonth) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span
                          className={[
                            "cal-day-num",
                            isToday ? "cal-day-num--today" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {date.getDate()}
                        </span>
                        {inCurrentMonth && total > 0 && (
                          <span className="cal-more tabular-nums opacity-80" title={dotTitle}>
                            {total}
                          </span>
                        )}
                      </div>

                      {inCurrentMonth && total > 0 && (
                        <div className="cal-dots">
                          {stat.holidays > 0 && (
                            <span
                              className="cal-dot cal-dot--holiday"
                              title={stat.holidays > 1 ? `${stat.holidays} holidays` : "Holiday"}
                            />
                          )}
                          {stat.leaves > 0 && (
                            <span
                              className="cal-dot cal-dot--leave"
                              title={stat.leaves > 1 ? `${stat.leaves} leave records` : "Leave"}
                            />
                          )}
                          {stat.visa > 0 && (
                            <span
                              className="cal-dot cal-dot--visa"
                              title={stat.visa > 1 ? `${stat.visa} visa dates` : "Visa"}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="cal-panel cal-day-panel wem-surface">
          <div className="cal-panel-hd">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]" style={MONO}>
                Selected day
              </p>
              <p className="mt-1 truncate text-[15px] font-extrabold leading-tight tracking-tight text-[#0a0a0a]">{selectedDateLabel}</p>
              <p className="cal-panel-hd-sub mt-0.5">Events for this date</p>
            </div>
            <span className="wem-badge-mono mt-1 shrink-0 self-start sm:mt-0 sm:self-center" style={MONO}>
              <CircleDot className="mr-1 inline h-3 w-3 opacity-70" />
              Agenda
            </span>
          </div>

          <div className="cal-agenda-body">
            {detailsForSelectedDate.holidays.length === 0 &&
            detailsForSelectedDate.leaves.length === 0 &&
            detailsForSelectedDate.visa.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12">
                <div className="adm-ae-icon">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div className="adm-ae-t mt-3 text-center">Quiet day</div>
                <div className="adm-ae-s text-center">No holidays, leave, or visa milestones. Pick another date on the grid.</div>
              </div>
            ) : (
              <div className="flex flex-col">
                {detailsForSelectedDate.holidays.map((h) => (
                  <div key={h.id} className="cal-detail-row cal-detail-row--holiday">
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--dash-blue)]" style={MONO}>
                      Holiday
                    </p>
                    <p className="mt-1 text-[14px] font-bold text-[#0a0a0a]">{h.name}</p>
                    {h.description && <p className="mt-1 text-[12px] leading-snug text-[#64748b]">{h.description}</p>}
                  </div>
                ))}
                {detailsForSelectedDate.leaves.map((l) => (
                  <div key={l.id} className="cal-detail-row cal-detail-row--leave">
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#64748b]" style={MONO}>
                      Approved leave
                    </p>
                    <p className="mt-1 text-[14px] font-bold text-[#0a0a0a]">{l.worker_name}</p>
                    <p className="mt-1 text-[12px] text-[#475569]">
                      {l.leave_type}
                      <span className="text-[11px] text-[#94a3b8]" style={MONO}>
                        {" "}
                        · {l.days} day{l.days > 1 ? "s" : ""}
                      </span>
                    </p>
                  </div>
                ))}
                {detailsForSelectedDate.visa.map((v) => (
                  <div key={v.id} className="cal-detail-row cal-detail-row--visa">
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#b45309]" style={MONO}>
                      Visa expiry
                    </p>
                    <p className="mt-1 text-[14px] font-bold text-[#0a0a0a]">{v.worker_name}</p>
                    <p className="mt-1 text-[12px] text-[#92400e]">
                      {v.days_left <= 0 ? "Expired — action required" : `${v.days_left} days remaining`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddHoliday && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md border border-[rgba(0,0,0,0.1)] bg-white p-5 shadow-lg"
            role="dialog"
            aria-labelledby="cal-add-holiday-title"
          >
            <h3 id="cal-add-holiday-title" className="text-base font-extrabold tracking-tight text-[#0a0a0a]">
              Add holiday
            </h3>
            <p className="mt-1 text-[11px] text-[#64748b]" style={MONO}>
              Visible to everyone on the calendar.
            </p>
            <div className="mt-4 grid gap-3">
              <input
                className="h-9 w-full border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[13px] text-[#0a0a0a] outline-none focus:border-[var(--dash-blue)]"
                placeholder="Holiday name"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
              />
              <input
                type="date"
                className="h-9 w-full border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[13px] text-[#0a0a0a] outline-none focus:border-[var(--dash-blue)]"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
              />
              <textarea
                className="min-h-[72px] w-full resize-y border border-[rgba(0,0,0,0.12)] bg-white p-3 text-[13px] text-[#0a0a0a] outline-none focus:border-[var(--dash-blue)]"
                placeholder="Description (optional)"
                value={holidayDescription}
                onChange={(e) => setHolidayDescription(e.target.value)}
              />
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="h-9 border border-[rgba(0,0,0,0.12)] bg-white px-3 text-[9px] font-bold uppercase tracking-[0.07em] text-[#0f2d5e] hover:bg-[#f8fafc]"
                style={MONO}
                onClick={() => setShowAddHoliday(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="h-9 border border-[rgba(0,0,0,0.12)] bg-[#0f2d5e] px-4 text-[9px] font-bold uppercase tracking-[0.07em] text-white hover:bg-[#1a4fa0] disabled:opacity-50"
                style={MONO}
                onClick={submitHoliday}
                disabled={savingHoliday}
              >
                {savingHoliday ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
