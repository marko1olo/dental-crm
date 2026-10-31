/**
 * ChairScheduleStudioHeader.tsx — Шапка студии расписания и навигации по датам
 * Мандат 8b / 8zi: эталонный Sweet Spot (80–120 строк).
 * Мандат 8am: чистая лаконичная шапка без визуального шума.
 * Apple HIG: сенсорный минимум >= 44x44px.
 */

import React from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

export interface ChairScheduleStudioHeaderProps {
  readonly currentDate: string;
  readonly onDateChange: (newDate: string) => void;
  readonly onDateShift: (deltaDays: number) => void;
  readonly activeTab: "grid" | "agenda";
  readonly onTabChange: (tab: "grid" | "agenda") => void;
  readonly onClose: () => void;
}

export const ChairScheduleStudioHeader: React.FC<ChairScheduleStudioHeaderProps> = ({
  currentDate,
  onDateChange,
  onDateShift,
  activeTab,
  onTabChange,
  onClose,
}) => {
  return (
    <header className="flex-none flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b border-[var(--line)] bg-[var(--paper-strong)]">
      {/* ЛЕВАЯ ЧАСТЬ: ИКОНКА И ЗАГОЛОВОК */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] shrink-0">
          <CalendarIcon className="w-4 h-4" />
        </div>
        <div className="hidden sm:block min-w-0">
          <h1 className="text-sm sm:text-base font-semibold leading-tight tracking-tight truncate">
            Расписание приёмов
          </h1>
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <span>Стоматологические кресла и приём</span>
            <span>•</span>
            <span className="text-[var(--teal,#0d9488)] font-medium">Режим без блокировок</span>
          </div>
        </div>
      </div>

      {/* ЦЕНТР: НАВИГАЦИЯ ПО ДАТАМ (СЕНСОРНЫЙ МИНИМУМ >= 44x44px НА МОБИЛЬНЫХ) */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => onDateShift(-1)}
          title="Предыдущий день"
          aria-label="Предыдущий день"
          className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 flex items-center justify-center rounded-lg hover:bg-[var(--line)]/40 text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <input
          type="date"
          value={currentDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="px-2.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--teal,#0d9488)] min-h-[36px]"
        />
        <button
          type="button"
          onClick={() => onDateShift(1)}
          title="Следующий день"
          aria-label="Следующий день"
          className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 flex items-center justify-center rounded-lg hover:bg-[var(--line)]/40 text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ПРАВАЯ ЧАСТЬ: ПЕРЕКЛЮЧАТЕЛЬ СЕТКА / ЛЕНТА И ЗАКРЫТИЕ */}
      <div className="flex items-center gap-2">
        <div className="sm:hidden flex items-center p-0.5 rounded-lg bg-[var(--line)]/30 border border-[var(--line)] text-xs">
          <button
            type="button"
            onClick={() => onTabChange("grid")}
            className={`min-h-[36px] px-2.5 py-1 rounded-md transition-colors ${
              activeTab === "grid" ? "bg-[var(--paper)] font-semibold shadow-xs" : "text-[var(--muted)]"
            }`}
          >
            Сетка
          </button>
          <button
            type="button"
            onClick={() => onTabChange("agenda")}
            className={`min-h-[36px] px-2.5 py-1 rounded-md transition-colors ${
              activeTab === "agenda" ? "bg-[var(--paper)] font-semibold shadow-xs" : "text-[var(--muted)]"
            }`}
          >
            Лента
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          data-testid="schedule-studio-close-btn"
          title="Закрыть расписание"
          aria-label="Закрыть расписание"
          className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 flex items-center justify-center rounded-lg hover:bg-[var(--line)]/50 text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default ChairScheduleStudioHeader;
