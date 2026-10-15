import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface ScheduleMobileMonthNavProps {
  monthHeaderTitle: string;
  isDifferentFromToday: boolean;
  onTodayClick: () => void;
  onShiftWeek: (deltaDays: number) => void;
}

export const ScheduleMobileMonthNav: React.FC<ScheduleMobileMonthNavProps> = ({
  monthHeaderTitle,
  isDifferentFromToday,
  onTodayClick,
  onShiftWeek,
}) => {
  return (
    <div className="schedule-mobile-month-nav">
      <div className="schedule-mobile-month-title">{monthHeaderTitle}</div>
      <div className="schedule-mobile-nav-buttons">
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
        <button
          type="button"
          className="schedule-mobile-nav-btn"
          onClick={() => onShiftWeek(-7)}
          aria-label="Предыдущая неделя"
          title="Неделя назад"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          className="schedule-mobile-nav-btn"
          onClick={() => onShiftWeek(7)}
          aria-label="Следующая неделя"
          title="Неделя вперёд"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};
