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

function formatDateRu(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
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
    <header className="flex-none px-3 sm:px-6 py-2 sm:py-3 border-b border-[var(--line)] bg-[var(--paper-strong)]">
      <div className="flex items-center justify-between gap-2">
        {/* ЛЕВАЯ ЧАСТЬ: ИКОНКА И ЗАГОЛОВОК (НА МОБИЛЬНЫХ ТОЛЬКО ИКОНКА) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
              <span className="text-[var(--teal,#0d9488)] font-medium">Оперативный журнал</span>
            </div>
          </div>
        </div>

        {/* ЦЕНТР: НАВИГАЦИЯ ПО ДАТАМ (РУССКИЙ ФОРМАТ DD.MM.YYYY, СЕНСОРНЫЙ МИНИМУМ >= 44x44px) */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => onDateShift(-1)}
            title="Предыдущий день"
            aria-label="Предыдущий день"
            className="w-11 h-11 min-w-[44px] min-h-[44px] sm:w-9 sm:h-9 sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-xl bg-transparent border-none hover:bg-[var(--line)]/40 text-[var(--muted)] hover:text-[var(--ink)] active:scale-95 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
          <div className="relative inline-flex items-center">
            <input
              type="date"
              value={currentDate}
              onChange={(e) => onDateChange(e.target.value)}
              aria-label="Выбрать дату расписания"
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
            />
            <div className="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] min-h-[44px] sm:min-h-[36px] flex items-center gap-1.5 pointer-events-none shadow-2xs">
              <span>{formatDateRu(currentDate)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDateShift(1)}
            title="Следующий день"
            aria-label="Следующий день"
            className="w-11 h-11 min-w-[44px] min-h-[44px] sm:w-9 sm:h-9 sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-xl bg-transparent border-none hover:bg-[var(--line)]/40 text-[var(--muted)] hover:text-[var(--ink)] active:scale-95 transition-all cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* ПРАВАЯ ЧАСТЬ: ПЕРЕКЛЮЧАТЕЛЬ СЕТКА / ЛЕНТА И ГАРАНТИРОВАННО ВИДИМАЯ КНОПКА ЗАКРЫТИЯ */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="sm:hidden flex items-center p-1 rounded-xl bg-[var(--line)]/30 border border-[var(--line)] text-xs min-h-[44px]">
            <button
              type="button"
              onClick={() => onTabChange("grid")}
              className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium transition-all border-none ${
                activeTab === "grid" ? "bg-[var(--paper)] text-[var(--ink)] font-bold shadow-xs" : "bg-transparent text-[var(--muted)]"
              }`}
            >
              Сетка
            </button>
            <button
              type="button"
              onClick={() => onTabChange("agenda")}
              className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium transition-all border-none ${
                activeTab === "agenda" ? "bg-[var(--paper)] text-[var(--ink)] font-bold shadow-xs" : "bg-transparent text-[var(--muted)]"
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
            className="w-11 h-11 min-w-[44px] min-h-[44px] sm:w-9 sm:h-9 sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-xl bg-transparent border-none hover:bg-[var(--line)]/50 text-[var(--muted)] hover:text-[var(--ink)] active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default ChairScheduleStudioHeader;
