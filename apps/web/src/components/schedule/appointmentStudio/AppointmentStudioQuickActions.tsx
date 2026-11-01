import React from "react";
import { Play, Copy, CalendarClock } from "lucide-react";

export interface AppointmentStudioQuickActionsProps {
  copyFeedback: string | null;
  onStartVisitImmediately: () => void;
  onCopySmsConfirmation: () => void;
  onShiftDate: (days: number) => void;
}

export const AppointmentStudioQuickActions: React.FC<AppointmentStudioQuickActionsProps> = ({
  copyFeedback,
  onStartVisitImmediately,
  onCopySmsConfirmation,
  onShiftDate,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--line,#e2e8f0)]">
      <button
        type="button"
        onClick={onStartVisitImmediately}
        className="studio-secondary-btn"
        data-testid="start-visit-quick-btn"
        title="Перевести статус в «Приём идет» и сразу открыть прием"
      >
        <Play size={14} className="text-emerald-600" />
        <span>Начать приём</span>
      </button>

      <button
        type="button"
        onClick={onCopySmsConfirmation}
        className="studio-secondary-btn"
        data-testid="sms-confirm-quick-btn"
        title="Скопировать готовое SMS / WhatsApp сообщение для пациента"
      >
        <Copy size={14} className="text-teal-600" />
        <span>{copyFeedback || "Подтвердить визит по SMS"}</span>
      </button>

      <button
        type="button"
        onClick={() => onShiftDate(1)}
        className="studio-secondary-btn"
        data-testid="reschedule-quick-btn"
        title="Перенести запись на следующий рабочий день (+1 день)"
      >
        <CalendarClock size={14} className="text-blue-600" />
        <span>Перенести (+1 день)</span>
      </button>
    </div>
  );
};
