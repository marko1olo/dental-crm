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
    const parts = isoDateStr.split("-").map(Number);
    const year = parts[0] ?? 2026;
    const month = parts[1] ?? 1;
    const day = parts[2] ?? 1;
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
      className="inline-flex items-center gap-1.5 shrink-0 select-none"
      data-testid="chair-schedule-date-stepper"
      role="group"
      aria-label="Навигация по датам расписания"
    >
      <button
        type="button"
        onClick={handlePrevDay}
        className="h-9 w-9 min-h-[36px] max-h-[36px] inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--primary)] text-[var(--ink)] transition-all cursor-pointer shadow-2xs shrink-0 touch-manipulation"
        title="Предыдущий день"
        data-testid="btn-chair-date-prev"
        aria-label="Предыдущий день"
      >
        <ChevronLeft size={16} />
      </button>

      <button
        type="button"
        onClick={handleToday}
        className={`h-9 min-h-[36px] max-h-[36px] px-3 inline-flex items-center gap-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs shrink-0 touch-manipulation ${
          isToday
            ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-dark)]"
            : "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong)] text-[var(--ink)]"
        }`}
        title="Перейти к сегодняшней дате"
        data-testid="btn-chair-date-today"
      >
        <Calendar size={14} className={isToday ? "text-[var(--primary)]" : "text-[var(--muted)]"} />
        <span className="capitalize">{formatDateDisplay(dateKey)}</span>
      </button>

      <button
        type="button"
        onClick={handleNextDay}
        className="h-9 w-9 min-h-[36px] max-h-[36px] inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--primary)] text-[var(--ink)] transition-all cursor-pointer shadow-2xs shrink-0 touch-manipulation"
        title="Следующий день"
        data-testid="btn-chair-date-next"
        aria-label="Следующий день"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
