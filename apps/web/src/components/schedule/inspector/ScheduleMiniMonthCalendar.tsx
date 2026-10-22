import React, { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment } from "@dental/shared";

export interface ScheduleMiniMonthCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  appointments?: Appointment[];
  onSelectDate: (date: string) => void;
}

const MONTH_NAMES_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const WEEKDAYS_SHORT_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const ScheduleMiniMonthCalendar: React.FC<ScheduleMiniMonthCalendarProps> = ({
  selectedDate,
  appointments = [],
  onSelectDate,
}) => {
  const [initialYear, initialMonth] = useMemo(() => {
    if (selectedDate && selectedDate.includes("-")) {
      const parts = selectedDate.split("-").map(Number);
      if (parts[0] && parts[1]) {
        return [parts[0], parts[1] - 1];
      }
    }
    const d = new Date();
    return [d.getFullYear(), d.getMonth()];
  }, [selectedDate]);

  const [viewYear, setViewYear] = useState(() => initialYear);
  const [viewMonth, setViewMonth] = useState(() => initialMonth);

  useEffect(() => {
    setViewYear(initialYear);
    setViewMonth(initialMonth);
  }, [initialYear, initialMonth]);

  // Days with appointments map for fast O(1) lookup
  const apptDatesMap = useMemo(() => {
    const set = new Set<string>();
    for (const a of appointments) {
      if (a.startsAt) {
        set.add(a.startsAt.slice(0, 10));
      }
    }
    return set;
  }, [appointments]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Build calendar matrix (42 cells: 6 rows of 7 days)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    // Russian week: Monday=0, Sunday=6
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: {
      dateIso: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      hasAppointments: boolean;
    }[] = [];

    const todayIso = new Date().toISOString().slice(0, 10);

    // 1. Previous month trailing days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const mStr = String(prevM + 1).padStart(2, "0");
      const dStr = String(dayNum).padStart(2, "0");
      const iso = `${prevY}-${mStr}-${dStr}`;
      cells.push({
        dateIso: iso,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: iso === todayIso,
        isSelected: iso === selectedDate,
        hasAppointments: apptDatesMap.has(iso),
      });
    }

    // 2. Current month days
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const mStr = String(viewMonth + 1).padStart(2, "0");
      const dStr = String(dayNum).padStart(2, "0");
      const iso = `${viewYear}-${mStr}-${dStr}`;
      cells.push({
        dateIso: iso,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: iso === todayIso,
        isSelected: iso === selectedDate,
        hasAppointments: apptDatesMap.has(iso),
      });
    }

    // 3. Next month leading days (fill up to 35 or 42 cells)
    const remaining = 35 - cells.length > 0 ? 35 - cells.length : (42 - cells.length > 0 ? 42 - cells.length : 0);
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const mStr = String(nextM + 1).padStart(2, "0");
      const dStr = String(dayNum).padStart(2, "0");
      const iso = `${nextY}-${mStr}-${dStr}`;
      cells.push({
        dateIso: iso,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: iso === todayIso,
        isSelected: iso === selectedDate,
        hasAppointments: apptDatesMap.has(iso),
      });
    }

    return cells;
  }, [viewYear, viewMonth, selectedDate, apptDatesMap]);

  return (
    <div
      className="schedule-mini-calendar p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/50 select-none text-xs"
      data-testid="schedule-mini-month-calendar"
    >
      {/* Month Header with Navigation */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <span className="font-bold text-[13px] text-[var(--ink)] tracking-tight">
          {`${MONTH_NAMES_RU[viewMonth]} ${viewYear}`}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-6 h-6 rounded-md hover:bg-[var(--paper)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
            title="Предыдущий месяц"
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setViewYear(now.getFullYear());
              setViewMonth(now.getMonth());
              onSelectDate(now.toISOString().slice(0, 10));
            }}
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
            title="Текущий месяц"
          >
            Сегодня
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-6 h-6 rounded-md hover:bg-[var(--paper)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
            title="Следующий месяц"
            aria-label="Следующий месяц"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Weekday Labels (Пн..Вс) */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAYS_SHORT_RU.map((wd, i) => (
          <span
            key={wd}
            className={`text-[10px] font-bold ${
              i >= 5 ? "text-rose-500/80 dark:text-rose-400/80" : "text-[var(--muted)]"
            }`}
          >
            {wd}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {calendarCells.map((cell) => {
          return (
            <button
              key={cell.dateIso}
              type="button"
              onClick={() => onSelectDate(cell.dateIso)}
              className={`h-7 rounded-md flex flex-col items-center justify-center relative cursor-pointer transition-all ${
                cell.isSelected
                  ? "bg-sky-600 text-white font-bold shadow-xs hover:bg-sky-500"
                  : cell.isCurrentMonth
                    ? "hover:bg-[var(--paper)] text-[var(--ink)]"
                    : "text-[var(--muted)]/40 hover:bg-[var(--paper)]/50"
              } ${cell.isToday && !cell.isSelected ? "ring-1 ring-sky-500/60 font-bold" : ""}`}
              title={`${cell.dateIso}${cell.hasAppointments ? " (есть приёмы)" : ""}`}
              aria-label={`Дата ${cell.dateIso}`}
            >
              <span className="text-[11px] leading-none">{cell.dayNumber}</span>
              {cell.hasAppointments && (
                <span
                  className={`w-1 h-1 rounded-full mt-0.5 ${
                    cell.isSelected ? "bg-white" : "bg-sky-500"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
