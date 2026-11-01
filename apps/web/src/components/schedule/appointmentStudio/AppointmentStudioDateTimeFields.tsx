import React from "react";
import { Calendar, Clock } from "lucide-react";
import { PRIMARY_DURATION_MINUTES } from "../appointmentCatalogData";

export interface AppointmentStudioDateTimeFieldsProps {
  dateKey: string;
  startTime: string;
  durationMinutes: number;
  onDateChange: (val: string) => void;
  onStartTimeChange: (val: string) => void;
  onDurationChange: (val: number) => void;
}

export const AppointmentStudioDateTimeFields: React.FC<AppointmentStudioDateTimeFieldsProps> = ({
  dateKey,
  startTime,
  durationMinutes,
  onDateChange,
  onStartTimeChange,
  onDurationChange,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="slot-date-input"
          className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1"
        >
          <Calendar size={13} />
          <span>Дата</span>
        </label>
        <input
          id="slot-date-input"
          type="date"
          value={dateKey}
          onChange={(e) => onDateChange(e.target.value)}
          className="studio-input-field"
          data-testid="slot-date-input"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="slot-time-input"
          className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1"
        >
          <Clock size={13} />
          <span>Время начала</span>
        </label>
        <input
          id="slot-time-input"
          type="time"
          value={startTime}
          onChange={(e) => onStartTimeChange(e.target.value)}
          className="studio-input-field"
          data-testid="slot-time-input"
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-[var(--muted,#64748b)]">Длительность</span>
        <div className="duration-segment-control" role="radiogroup" aria-label="Длительность слота">
          {PRIMARY_DURATION_MINUTES.map((min) => {
            const active = durationMinutes === min;
            return (
              <button
                key={min}
                type="button"
                onClick={() => onDurationChange(min)}
                className={`duration-segment-btn ${active ? "is-active" : ""}`}
                data-testid={`duration-btn-${min}`}
              >
                {min}м
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
