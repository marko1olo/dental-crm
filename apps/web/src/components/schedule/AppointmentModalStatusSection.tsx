import type { Appointment } from "@dental/shared";
import { AlertTriangle, CalendarCheck } from "lucide-react";
import React from "react";
import { showToast } from "../GlobalToast";
import { AppointmentStatusChips } from "./appointmentModalStatus/AppointmentStatusChips";
import { AppointmentCancellationSection } from "./appointmentModalStatus/AppointmentCancellationSection";

export interface AppointmentModalStatusSectionProps {
  status: Appointment["status"];
  setStatus: (status: Appointment["status"]) => void;
  appointmentLabels: Record<Appointment["status"], string>;
  activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
  hasOpenVisit: boolean;
  comment: string;
  handleApplyRefusalReason: (nameRu: string) => void;
  handleOpenWaitlistForThisSlot: () => void;
}

export function AppointmentModalStatusSection({
  status,
  setStatus,
  appointmentLabels,
  activeVisitLockedAppointmentStatuses,
  hasOpenVisit,
  comment,
  handleApplyRefusalReason,
  handleOpenWaitlistForThisSlot,
}: AppointmentModalStatusSectionProps) {
  const handleSelectStatus = (nextStatus: Appointment["status"]) => {
    setStatus(nextStatus);
    if (hasOpenVisit && activeVisitLockedAppointmentStatuses.has(nextStatus)) {
      showToast(
        "Внимание: по этой записи открыт активный визит в кресле. Изменение статуса разрешено лечащему врачу.",
        "warning",
        4000,
      );
    }
  };

  return (
    <div className="sm:col-span-2">
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
          <CalendarCheck size={13} className="text-[var(--teal)]" />
          <span>Статус визита:</span>
        </label>
        {status && (
          <span className="text-[11px] font-semibold text-[var(--muted)]">
            Текущий:{" "}
            <strong className="text-[var(--ink)]">
              {appointmentLabels[status] || status}
            </strong>
          </span>
        )}
      </div>

      <AppointmentStatusChips
        status={status}
        appointmentLabels={appointmentLabels}
        onSelectStatus={handleSelectStatus}
      />

      {hasOpenVisit && (
        <div
          className="mt-1 p-1.5 rounded-xl text-xs bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/20 flex items-center gap-1.5"
          data-testid="status-open-visit-warning"
        >
          <AlertTriangle size={12} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            По этой записи открыт активный визит. Смена статуса разрешена лечащему врачу.
          </span>
        </div>
      )}

      {(status === "cancelled" || status === "no_show") && (
        <AppointmentCancellationSection
          comment={comment}
          onApplyRefusalReason={handleApplyRefusalReason}
          onOpenWaitlistForThisSlot={handleOpenWaitlistForThisSlot}
        />
      )}
    </div>
  );
}
