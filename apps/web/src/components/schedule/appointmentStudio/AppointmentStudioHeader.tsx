import React from "react";
import { Flame, Sparkles, X } from "lucide-react";
import { formatSlotTimeRange } from "../appointmentCatalogData";

export interface AppointmentStudioHeaderProps {
  isMobile?: boolean;
  isEmergency: boolean;
  startTime: string;
  durationMinutes: number;
  chairName?: string;
  onClose: () => void;
}

export const AppointmentStudioHeader: React.FC<AppointmentStudioHeaderProps> = ({
  isEmergency,
  startTime,
  durationMinutes,
  chairName,
  onClose,
}) => {
  return (
    <>
      <div className="studio-drag-handle-bar" aria-hidden="true">
        <div className="studio-drag-handle-pill" />
      </div>

      <div className="appointment-studio-header">
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl border flex items-center justify-center shrink-0"
            style={{
              backgroundColor: isEmergency ? "rgba(225, 29, 72, 0.15)" : "rgba(13, 148, 136, 0.12)",
              color: isEmergency ? "#e11d48" : "#0d9488",
              borderColor: isEmergency ? "rgba(225, 29, 72, 0.3)" : "rgba(13, 148, 136, 0.25)",
            }}
          >
            {isEmergency ? <Flame size={20} className="animate-pulse" /> : <Sparkles size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--ink,#0f172a)] m-0 leading-tight">
                {isEmergency ? "Срочная запись: острая боль" : "Карточка записи на приём"}
              </h2>
              {isEmergency && (
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase text-white bg-rose-600"
                  data-testid="emergency-badge"
                >
                  CITO
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
              {formatSlotTimeRange(startTime, durationMinutes)} · {chairName}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer border-none bg-transparent"
          aria-label="Закрыть студию записи"
          data-testid="studio-close-btn"
        >
          <X size={20} />
        </button>
      </div>
    </>
  );
};
