import React from "react";
import type { WeekDayItem } from "./scheduleMobileAgendaTypes";
import { useScheduleStore } from "../../../store/scheduleStore";

export interface ScheduleMobileWeekStripProps {
  weekDays: WeekDayItem[];
  onDateChange: (iso: string) => void;
}

export const ScheduleMobileWeekStrip: React.FC<ScheduleMobileWeekStripProps> = ({
  weekDays,
  onDateChange,
}) => {
  return (
    <div
      className="schedule-mobile-day-strip"
      role="tablist"
      aria-label="Выбор дня недели"
    >
      {weekDays.map((day) => (
        <button
          key={day.dateIso}
          type="button"
          role="tab"
          aria-selected={day.isSelected}
          className={`schedule-mobile-day-cell ${day.isSelected ? "is-selected" : ""} ${day.isToday ? "is-today" : ""}`}
          onClick={() => {
            useScheduleStore.getState().setScheduleDateFilter(day.dateIso);
            onDateChange(day.dateIso);
          }}
        >
          <span className="schedule-mobile-day-label">
            {day.isToday ? `★ ${day.dayLabel}` : day.dayLabel}
          </span>
          <span className="schedule-mobile-day-num">{day.dayNumber}</span>
          {day.hasAppointments ? (
            <span
              className="schedule-mobile-day-dot"
              title={`Записей: ${day.appointmentCount}`}
            />
          ) : (
            <span className="schedule-mobile-day-dot-empty" />
          )}
        </button>
      ))}
    </div>
  );
};
