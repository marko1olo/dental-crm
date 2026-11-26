import React, { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment } from "@dental/shared";

export interface ScheduleMiniMonthCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  appointments?: readonly Appointment[] | undefined;
  onSelectDate: (date: string) => void;
  toDateTimeLocalValue?: ((iso: string, tz?: string) => string) | undefined;
  timezone?: string | undefined;
  showClinicLoad?: boolean | undefined;
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
  toDateTimeLocalValue,
  timezone,
  showClinicLoad = true,
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

  // Clinic load per day (active appointment counts) for fast O(1) lookup
  const clinicLoadMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of appointments) {
      if (!a.startsAt || a.status === "cancelled" || a.status === "no_show") continue;
      const dayIso = toDateTimeLocalValue
        ? toDateTimeLocalValue(a.startsAt, timezone).slice(0, 10)
        : a.startsAt.slice(0, 10);
      if (dayIso) {
        counts.set(dayIso, (counts.get(dayIso) ?? 0) + 1);
      }
    }
    return counts;
  }, [appointments, toDateTimeLocalValue, timezone]);

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
      clinicLoadCount: number;
      loadLevel: "none" | "low" | "medium" | "high";
    }[] = [];

    const resolveLoadLevel = (count: number): "none" | "low" | "medium" | "high" => {
      if (count <= 0) return "none";
      if (count <= 3) return "low";
      if (count <= 7) return "medium";
      return "high";
    };

    const todayIso = new Date().toISOString().slice(0, 10);

    // 1. Previous month trailing days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const mStr = String(prevM + 1).padStart(2, "0");
      const dStr = String(dayNum).padStart(2, "0");
      const iso = `${prevY}-${mStr}-${dStr}`;
      const clinicLoadCount = clinicLoadMap.get(iso) ?? 0;
      cells.push({
        dateIso: iso,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: iso === todayIso,
        isSelected: iso === selectedDate,
        hasAppointments: clinicLoadCount > 0,
        clinicLoadCount,
        loadLevel: resolveLoadLevel(clinicLoadCount),
      });
    }

    // 2. Current month days
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const mStr = String(viewMonth + 1).padStart(2, "0");
      const dStr = String(dayNum).padStart(2, "0");
      const iso = `${viewYear}-${mStr}-${dStr}`;
      const clinicLoadCount = clinicLoadMap.get(iso) ?? 0;
      cells.push({
        dateIso: iso,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: iso === todayIso,
        isSelected: iso === selectedDate,
        hasAppointments: clinicLoadCount > 0,
        clinicLoadCount,
        loadLevel: resolveLoadLevel(clinicLoadCount),
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
      const clinicLoadCount = clinicLoadMap.get(iso) ?? 0;
      cells.push({
        dateIso: iso,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: iso === todayIso,
        isSelected: iso === selectedDate,
        hasAppointments: clinicLoadCount > 0,
        clinicLoadCount,
        loadLevel: resolveLoadLevel(clinicLoadCount),
      });
    }

    return cells;
  }, [viewYear, viewMonth, selectedDate, clinicLoadMap]);

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
            className="w-6 h-6 rounded-md bg-transparent hover:bg-[var(--paper)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
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
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
            title="Текущий месяц"
          >
            Сегодня
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-6 h-6 rounded-md bg-transparent hover:bg-[var(--paper)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
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
          const loadBarColor =
            cell.isSelected
              ? "bg-white"
              : cell.loadLevel === "high"
                ? "bg-[var(--danger)]"
                : cell.loadLevel === "medium"
                  ? "bg-amber-500"
                  : "bg-[var(--primary)]";
          const loadTintClass =
            showClinicLoad && !cell.isSelected && cell.isCurrentMonth
              ? cell.loadLevel === "high"
                ? "bg-[var(--danger-soft)]/50"
                : cell.loadLevel === "medium"
                  ? "bg-amber-500/10"
                  : cell.loadLevel === "low"
                    ? "bg-[var(--primary-soft)]/40"
                    : ""
              : "";
          return (
            <button
              key={cell.dateIso}
              type="button"
              onClick={() => onSelectDate(cell.dateIso)}
              data-clinic-load={cell.loadLevel}
              className={`h-7 rounded-md flex flex-col items-center justify-center relative cursor-pointer transition-all ${
                cell.isSelected
                  ? "bg-[var(--primary)] text-white font-bold shadow-xs hover:opacity-90"
                  : cell.isCurrentMonth
                    ? `${loadTintClass || "bg-transparent"} hover:bg-[var(--paper)] text-[var(--ink)]`
                    : "bg-transparent text-[var(--muted)]/40 hover:bg-[var(--paper)]/50"
              } ${cell.isToday && !cell.isSelected ? "ring-1 ring-[var(--primary)]/60 font-bold" : ""}`}
              title={`${cell.dateIso}${cell.clinicLoadCount > 0 ? ` · записей: ${cell.clinicLoadCount}` : ""}`}
              aria-label={`Дата ${cell.dateIso}`}
            >
              <span className="text-[11px] leading-none tabular-nums">{cell.dayNumber}</span>
              {cell.hasAppointments && (
                <span
                  className={`mt-0.5 rounded-full ${
                    showClinicLoad ? "w-3 h-[3px]" : "w-1 h-1"
                  } ${loadBarColor}`}
                />
              )}
            </button>
          );
        })}
      </div>

      {showClinicLoad && (
        <div
          className="mt-2 pt-1.5 border-t border-[var(--line)] flex items-center justify-between text-[10px] text-[var(--ink-muted)]"
          data-testid="schedule-mini-calendar-load-legend"
        >
          <span>Загрузка дня:</span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-1 rounded-full bg-[var(--primary)]" />
              мало
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-1 rounded-full bg-amber-500" />
              средне
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-1 rounded-full bg-[var(--danger)]" />
              плотно
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
