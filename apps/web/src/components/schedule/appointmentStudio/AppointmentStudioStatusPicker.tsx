import React from "react";
import {
  CANONICAL_APPOINTMENT_STATUSES,
  type CanonicalAppointmentStatusCode,
} from "../appointmentCatalogData";

export interface AppointmentStudioStatusPickerProps {
  status: CanonicalAppointmentStatusCode;
  onStatusChange: (status: CanonicalAppointmentStatusCode) => void;
}

export const AppointmentStudioStatusPicker: React.FC<AppointmentStudioStatusPickerProps> = ({
  status,
  onStatusChange,
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-[var(--muted,#64748b)]">Статус записи</span>
      <div className="status-pills-row" role="radiogroup" aria-label="Статус визита">
        {CANONICAL_APPOINTMENT_STATUSES.map((st) => {
          const active = status === st.code;
          return (
            <button
              key={st.code}
              type="button"
              onClick={() => onStatusChange(st.code)}
              className={`status-pill-btn ${active ? "is-active" : ""}`}
              style={{
                backgroundColor: active ? st.badgeBg : undefined,
                borderColor: active ? st.borderTone : undefined,
                color: active ? st.badgeText : undefined,
              }}
              data-testid={`status-pill-${st.code}`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: st.dotColor }}
              />
              <span>{st.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
