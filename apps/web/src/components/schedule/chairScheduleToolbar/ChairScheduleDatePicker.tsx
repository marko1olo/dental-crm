import React from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

export interface ChairScheduleDatePickerProps {
  dateKey?: string;
  onDateChange?: (dateKey: string) => void;
}

function formatDateDisplay(isoDateStr: string): string {
  try {
    const [year, month, day] = isoDateStr.split("-").map(Number);
    if (!year || !month || !day) return isoDateStr;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("ru-RU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return isoDateStr;
  }
}

function addDays(isoDateStr: string, days: number): string {
  try {
    const [year, month, day] = isoDateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  } catch {
    return isoDateStr;
  }
}

export function ChairScheduleDatePicker({
  dateKey,
  onDateChange,
}: ChairScheduleDatePickerProps) {
  if (!dateKey || !onDateChange) return null;

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const isToday = dateKey === todayIso;

  const handlePrevDay = () => onDateChange(addDays(dateKey, -1));
  const handleNextDay = () => onDateChange(addDays(dateKey, 1));
  const handleToday = () => onDateChange(todayIso);

  return (
    <div
      className="inline-flex items-center gap-1 shrink-0 select-none"
      data-testid="chair-schedule-date-stepper"
      role="group"
      aria-label="Навигация по датам расписания"
    >
      <button
        type="button"
        onClick={handlePrevDay}
        className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-colors cursor-pointer"
        title="Предыдущий день"
        data-testid="btn-chair-date-prev"
        aria-label="Предыдущий день"
      >
        <ChevronLeft size={14} />
      </button>

      <button
        type="button"
        onClick={handleToday}
        className={`h-7 px-2 inline-flex items-center gap-1.5 rounded-md border text-xs font-semibold transition-colors cursor-pointer ${
          isToday
            ? "border-[var(--teal)] bg-[var(--teal-soft)] text-[var(--teal-dark)]"
            : "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)]"
        }`}
        title="Перейти к сегодняшней дате"
        data-testid="btn-chair-date-today"
      >
        <Calendar size={13} className={isToday ? "text-[var(--teal)]" : "text-[var(--muted)]"} />
        <span className="capitalize">{formatDateDisplay(dateKey)}</span>
      </button>

      <button
        type="button"
        onClick={handleNextDay}
        className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-colors cursor-pointer"
        title="Следующий день"
        data-testid="btn-chair-date-next"
        aria-label="Следующий день"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
