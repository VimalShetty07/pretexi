"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Flag,
  User,
  CalendarRange,
} from "lucide-react";
import "../../dashboard/dashboard-marketing.css";
import "../../workers/workers-page.css";
import "../../calendar/calendar-page.css";

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

function isDateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

const MONO: React.CSSProperties = { fontFamily: "var(--dash-mono)" };

export default function PortalCalendarPage() {
  const { token } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [holidays, setHolidays] = useState<HolidayEvent[]>([]);
  const [leaves, setLeaves] = useState<LeaveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();

  const fetchEvents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError("");
    try {
      const data = await api.get<{ holidays: HolidayEvent[]; leaves: LeaveEvent[] }>(
        `/calendar/events?year=${year}&month=${month}`,
        token
      );
      setHolidays(data.holidays);
      setLeaves(data.leaves);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, [token, year, month]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetchEvents();
  }, [token, fetchEvents]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  let startDow = firstDay.getDay();
  if (startDow === 0) startDow = 7;

  const cells: (number | null)[] = [];
  for (let i = 1; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const todayDisplay = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    []
  );

  const getEventsForDate = useCallback((day: number): CalendarEvent[] => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const result: CalendarEvent[] = [];
    for (const h of holidays) { if (h.date === dateStr) result.push(h); }
    for (const l of leaves) { if (isDateInRange(dateStr, l.start_date, l.end_date)) result.push(l); }
    return result;
  }, [year, month, holidays, leaves]);

  const stats = useMemo(() => {
    let busyDays = 0;
    let workingDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month - 1, d);
      const dow = dt.getDay();
      if (dow !== 0 && dow !== 6) workingDays++;
      if (getEventsForDate(d).length > 0) busyDays++;
    }
    return {
      holidays: holidays.length,
      leaves: leaves.length,
      busyDays,
      workingDays,
    };
  }, [holidays, leaves, year, month, daysInMonth, getEventsForDate]);

  const selectedEvents = selectedDate
    ? getEventsForDate(parseInt(selectedDate.split("-")[2] ?? "0", 10))
    : [];

  const goToday = () => {
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    setYear(y);
    setMonth(m);
    setSelectedDate(todayStr);
  };

  if (!token) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Sign in to view your calendar.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="protexi-dash-marketing">
        <p className="text-[12px] text-[#94a3b8]" style={MONO}>
          Loading calendar…
        </p>
      </div>
    );
  }

  return (
    <div className="protexi-dash-marketing flex flex-col gap-0">
      {loadError && (
        <div className="mb-3 border border-red-200 bg-red-50 text-red-700" style={{ padding: "10px 12px", fontSize: 12, ...MONO }}>
          {loadError}
        </div>
      )}

      <div className="adm-ph adm-ph-portal">
        <div className="min-w-0">
          <div className="adm-ph-ey">Employee portal</div>
          <h1 className="adm-ph-title">
            My <em className="dash-title-em">calendar</em>
          </h1>
          <div className="adm-ph-date">{todayDisplay}</div>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#64748b]">
            Company holidays and your approved leave in one view.
          </p>
        </div>
        <button
          type="button"
          onClick={goToday}
          className="inline-flex h-9 shrink-0 items-center gap-2 border border-[rgba(0,0,0,0.12)] bg-[#0f2d5e] px-4 text-[9px] font-bold uppercase tracking-[0.07em] text-white hover:bg-[#1a4fa0]"
          style={MONO}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Go to today
        </button>
      </div>

      <div className="cal-portal-stat adm-stat-row grid grid-cols-2 md:grid-cols-4">
        <div className="adm-sc adm-sc-r text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-r">
              <Flag className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">UK</span>
          </div>
          <div className="adm-sc-num">{stats.holidays}</div>
          <div className="adm-sc-lbl">Holidays</div>
          <div className="adm-sc-sub">This month</div>
        </div>
        <div className="adm-sc adm-sc-a bg-white px-4 py-4 text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-a">
              <User className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">You</span>
          </div>
          <div className="adm-sc-num">{stats.leaves}</div>
          <div className="adm-sc-lbl">My leave</div>
          <div className="adm-sc-sub">Approved blocks</div>
        </div>
        <div className="adm-sc adm-sc-p text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-p">
              <CalendarDays className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Busy</span>
          </div>
          <div className="adm-sc-num">{stats.busyDays}</div>
          <div className="adm-sc-lbl">Days with events</div>
          <div className="adm-sc-sub">In view</div>
        </div>
        <div className="adm-sc adm-sc-b text-left">
          <div className="adm-sc-top">
            <div className="adm-sc-icon adm-si-b">
              <CalendarRange className="h-[17px] w-[17px]" />
            </div>
            <span className="adm-sc-pill adm-pill-n">Mon–Fri</span>
          </div>
          <div className="adm-sc-num">{stats.workingDays}</div>
          <div className="adm-sc-lbl">Working days</div>
          <div className="adm-sc-sub">This month</div>
        </div>
      </div>

      <div className="cal-panel wem-surface">
        <div className="cal-panel-hd">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDays className="h-5 w-5 shrink-0 text-[var(--dash-blue)]" aria-hidden />
            <div>
              <p className="cal-panel-hd-title">My calendar</p>
              <p className="cal-panel-hd-sub">
                {MONTH_NAMES[month - 1]} {year} · Mon–Sun
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevMonth}
              className="inline-flex h-8 w-8 items-center justify-center border border-[rgba(0,0,0,0.1)] bg-white text-[#0f2d5e] transition-colors hover:bg-[#f8fafc]"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="inline-flex h-8 w-8 items-center justify-center border border-[rgba(0,0,0,0.1)] bg-white text-[#0f2d5e] transition-colors hover:bg-[#f8fafc]"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="cal-grid-body">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start" style={{ gap: 20 }}>
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center" style={{ gap: 16 }}>
                <div className="flex items-center" style={{ gap: 6 }}>
                  <div className="rounded" style={{ width: 12, height: 12, background: "#dc2626" }} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]" style={MONO}>
                    Holiday
                  </span>
                </div>
                <div className="flex items-center" style={{ gap: 6 }}>
                  <div className="rounded" style={{ width: 12, height: 12, background: "var(--dash-blue)" }} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]" style={MONO}>
                    My leave
                  </span>
                </div>
              </div>

              <div className="overflow-hidden border border-[rgba(0,0,0,0.08)] bg-[#f8fafc]">
                <div className="grid grid-cols-7 border-b border-[rgba(0,0,0,0.08)] bg-white">
                  {DAY_NAMES.map((d) => (
                    <div
                      key={d}
                      className="text-center text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]"
                      style={{ padding: "10px 0", ...MONO }}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {cells.map((day, idx) => {
                    if (day === null) {
                      return (
                        <div
                          key={`e-${idx}`}
                          className="border-b border-r border-[rgba(0,0,0,0.06)] bg-[#f1f5f9]/60"
                          style={{ minHeight: 80 }}
                        />
                      );
                    }
                    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const events = getEventsForDate(day);
                    const isTodayCell = dateStr === todayStr;
                    const isSelected = dateStr === selectedDate;
                    const isWeekend = (idx % 7 === 5) || (idx % 7 === 6);

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                        className={`border-b border-r border-[rgba(0,0,0,0.06)] text-left transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[rgba(26,79,160,0.08)]"
                            : isWeekend
                              ? "bg-[#f8fafc]/90 hover:bg-[#f1f5f9]"
                              : "bg-white hover:bg-[#f8fafc]"
                        }`}
                        style={{ minHeight: 80, padding: "6px 8px" }}
                      >
                        <span
                          className={`inline-flex items-center justify-center rounded-full text-xs font-semibold ${
                            isTodayCell ? "bg-[#0f2d5e] text-white" : "text-[#0a0a0a]"
                          }`}
                          style={{ width: 24, height: 24, marginBottom: 4 }}
                        >
                          {day}
                        </span>
                        <div className="space-y-1">
                          {events.slice(0, 2).map((ev) => {
                            if (ev.type === "holiday") {
                              return (
                                <div
                                  key={ev.id}
                                  className="truncate rounded text-white"
                                  style={{ padding: "1px 6px", fontSize: 10, background: "#dc2626" }}
                                  title={ev.name}
                                >
                                  {ev.name}
                                </div>
                              );
                            }
                            return (
                              <div
                                key={ev.id}
                                className="truncate border border-[rgba(26,79,160,0.25)] bg-[rgba(26,79,160,0.08)] text-[#0f2d5e]"
                                style={{ padding: "1px 6px", fontSize: 10 }}
                                title={`${ev.leave_type} leave`}
                              >
                                {ev.leave_type} leave
                              </div>
                            );
                          })}
                          {events.length > 2 && (
                            <div className="text-[10px] text-[#64748b]" style={{ paddingLeft: 4, ...MONO }}>
                              +{events.length - 2}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="w-full shrink-0 lg:w-[280px]">
              <div
                className="border border-[rgba(0,0,0,0.08)] bg-[#f8fafc] lg:sticky"
                style={{ top: 100, padding: "20px" }}
              >
                {selectedDate ? (
                  <>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#64748b]" style={{ marginBottom: 12, ...MONO }}>
                      {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </h3>
                    {selectedEvents.length === 0 ? (
                      <p className="text-sm text-[#64748b]">No events on this day.</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedEvents.map((ev) => {
                          if (ev.type === "holiday") {
                            return (
                              <div
                                key={ev.id}
                                className="rounded-xl border border-[rgba(220,38,38,0.25)] bg-[rgba(254,242,242,0.85)]"
                                style={{ padding: "12px 14px" }}
                              >
                                <div className="flex items-center" style={{ gap: 8 }}>
                                  <Flag style={{ width: 14, height: 14 }} className="text-red-600" />
                                  <span className="text-sm font-semibold text-[#991b1b]">{ev.name}</span>
                                </div>
                                {ev.description && (
                                  <p className="text-xs text-red-800" style={{ marginTop: 4 }}>
                                    {ev.description}
                                  </p>
                                )}
                              </div>
                            );
                          }
                          return (
                            <div
                              key={ev.id}
                              className="rounded-xl border border-[rgba(26,79,160,0.25)] bg-[rgba(235,242,252,0.9)]"
                              style={{ padding: "12px 14px" }}
                            >
                              <div className="flex items-center" style={{ gap: 8 }}>
                                <User style={{ width: 14, height: 14 }} className="text-[var(--dash-blue)]" />
                                <span className="text-sm font-semibold capitalize text-[#0f2d5e]">
                                  {ev.leave_type} leave
                                </span>
                              </div>
                              <p className="text-xs text-[#64748b]" style={{ marginTop: 4 }}>
                                {new Date(ev.start_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                                {" — "}
                                {new Date(ev.end_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                                {" "}
                                ({ev.days} day{ev.days !== 1 ? "s" : ""})
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center" style={{ padding: "20px 0" }}>
                    <div className="adm-ae-icon mx-auto">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div className="adm-ae-t mt-3">Pick a date</div>
                    <div className="adm-ae-s">Click a day in the grid to see holiday and leave details.</div>
                  </div>
                )}

                {holidays.length > 0 && (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748b]" style={{ marginBottom: 10, ...MONO }}>
                      Holidays this month
                    </h4>
                    <div className="space-y-2">
                      {holidays.map((h) => (
                        <div key={h.id} className="flex items-center" style={{ gap: 8 }}>
                          <div className="shrink-0 rounded-full" style={{ width: 8, height: 8, background: "#dc2626" }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-[#0a0a0a]">{h.name}</p>
                            <p className="text-[11px] text-[#64748b]">
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
        </div>
      </div>
    </div>
  );
}
