import React from "react";
import { Check, Edit3 } from "lucide-react";
import type { Appointment } from "@dental/shared";
import { getAppointmentStatusBadgeClasses } from "../appointmentCardHelpers";
import { ScheduleInspectorStatusGrid } from "./ScheduleInspectorStatusGrid";

export interface ScheduleInspectorActionsAndFooterProps {
  appointmentId: string;
  status: Appointment["status"];
  createdAt?: string;
  normalizedStatus: string;
  onQuickStatusChange?: (id: string, status: Appointment["status"]) => Promise<void> | void;
  onOpenVisitClick: () => void;
  onEditAppointment?: () => void;
}

export const ScheduleInspectorActionsAndFooter: React.FC<ScheduleInspectorActionsAndFooterProps> = ({
  appointmentId,
  status,
  createdAt,
  normalizedStatus,
  onQuickStatusChange,
  onOpenVisitClick,
  onEditAppointment,
}) => (
  <>
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[var(--muted)] font-medium">Статус приёма:</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getAppointmentStatusBadgeClasses(status)}`}>
          {normalizedStatus}
        </span>
      </div>

      {onQuickStatusChange && (
        <ScheduleInspectorStatusGrid
          appointmentId={appointmentId}
          status={status}
          onQuickStatusChange={onQuickStatusChange}
        />
      )}
    </div>

    <div className="flex flex-col gap-1.5 pt-1">
      <button
        type="button"
        onClick={onOpenVisitClick}
        className="schedule-inspector-start-visit-btn primary-button dente-btn dente-btn-primary h-9 min-h-[36px] pointer-coarse:min-h-[44px] w-full rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white"
        data-testid="schedule-inspector-open-visit-btn"
        data-action-testid="schedule-inspector-start-visit-btn"
        title="Открыть карту приёма и начать приём"
        aria-label="Начать приём"
      >
        <Check size={14} className="shrink-0 stroke-[2.5]" />
        <span>✓ Начать приём</span>
      </button>

      {onEditAppointment && (
        <button
          type="button"
          onClick={onEditAppointment}
          className="secondary-button h-8 min-h-[32px] w-full rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)]"
          data-testid="schedule-inspector-edit-btn"
        >
          <Edit3 size={13} className="shrink-0 text-[var(--muted)]" />
          <span>Редактировать запись</span>
        </button>
      )}
    </div>

    <div className="text-[10px] text-[var(--muted)] text-center pt-2 border-t border-[var(--line)]">
      Запись #{appointmentId.slice(0, 8)}
      {createdAt && <span> · Создана {new Date(createdAt).toLocaleDateString("ru-RU")}</span>}
    </div>
  </>
);
