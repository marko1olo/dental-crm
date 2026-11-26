import React from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, ListFilter } from "lucide-react";

const COMPACT_MONTH_NAMES: Record<string, string> = {
  Январь: "Янв",
  Февраль: "Фев",
  Март: "Мар",
  Апрель: "Апр",
  Май: "Май",
  Июнь: "Июн",
  Июль: "Июл",
  Август: "Авг",
  Сентябрь: "Сен",
  Октябрь: "Окт",
  Ноябрь: "Ноя",
  Декабрь: "Дек",
};

function formatCompactMonthTitle(title: string): string {
  const parts = title.trim().split(/\s+/);
  const monthWord = parts[0] ?? "";
  const compactMonth = COMPACT_MONTH_NAMES[monthWord] ?? monthWord;
  return parts.length > 1 ? `${compactMonth} ${parts.slice(1).join(" ")}` : compactMonth;
}

export interface ScheduleMobileMonthNavProps {
  monthHeaderTitle: string;
  isDifferentFromToday: boolean;
  viewMode?: "agenda" | "grid" | undefined;
  onViewModeChange?: ((mode: "agenda" | "grid") => void) | undefined;
  onTodayClick: () => void;
  onShiftWeek: (deltaDays: number) => void;
}

export const ScheduleMobileMonthNav: React.FC<ScheduleMobileMonthNavProps> = ({
  monthHeaderTitle,
  isDifferentFromToday,
  viewMode = "agenda",
  onViewModeChange,
  onTodayClick,
  onShiftWeek,
}) => {
  const compactTitle = formatCompactMonthTitle(monthHeaderTitle);

  return (
    <div className="schedule-mobile-month-nav">
      <div className="schedule-mobile-month-cluster">
        <button
          type="button"
          className="schedule-mobile-nav-btn"
          onClick={() => onShiftWeek(-7)}
          aria-label="Предыдущая неделя"
          title="Неделя назад"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" />
        </button>
        <div className="schedule-mobile-month-title" title={monthHeaderTitle}>
          {compactTitle}
        </div>
        <button
          type="button"
          className="schedule-mobile-nav-btn"
          onClick={() => onShiftWeek(7)}
          aria-label="Следующая неделя"
          title="Неделя вперёд"
        >
          <ChevronRight className="w-4 h-4 shrink-0" />
        </button>
        {isDifferentFromToday && (
          <button
            type="button"
            className="schedule-mobile-today-chip"
            onClick={onTodayClick}
            aria-label="Перейти на сегодня"
          >
            Сегодня
          </button>
        )}
      </div>

      {onViewModeChange && (
        <div
          className="schedule-mobile-view-segmented p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] inline-flex items-center gap-0.5 shrink-0"
          role="tablist"
          aria-label="Режим отображения расписания"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "agenda"}
            onClick={() => onViewModeChange("agenda")}
            className={`min-h-[38px] px-2 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-all ${
              viewMode === "agenda"
                ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            <ListFilter className="w-3.5 h-3.5 shrink-0" />
            <span>Лента</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "grid"}
            onClick={() => onViewModeChange("grid")}
            className={`min-h-[38px] px-2 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-all ${
              viewMode === "grid"
                ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            <span>Сетка</span>
          </button>
        </div>
      )}
    </div>
  );
};
