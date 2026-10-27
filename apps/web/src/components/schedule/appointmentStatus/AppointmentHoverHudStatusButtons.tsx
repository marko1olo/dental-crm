import React from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  PhoneCall,
  UserCheck,
} from "lucide-react";
import type { Appointment } from "@dental/shared";

export interface AppointmentHoverHudStatusButtonsProps {
  appointmentId: string;
  displayStatus: Appointment["status"];
  handleQuickStatusChange: (status: Appointment["status"]) => void;
  onCloseHover: () => void;
}

export function AppointmentHoverHudStatusButtons({
  appointmentId,
  displayStatus,
  handleQuickStatusChange,
  onCloseHover,
}: AppointmentHoverHudStatusButtonsProps) {
  const getBtnClass = (isActive: boolean) =>
    `min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
      isActive
        ? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs font-bold"
        : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong)]"
    }`;

  return (
    <div className="grid grid-cols-2 gap-1.5">
      <button
        type="button"
        data-testid={`timeline-hover-status-planned-${appointmentId}`}
        onClick={(e) => {
          e.stopPropagation();
          void handleQuickStatusChange("planned");
          onCloseHover();
        }}
        className={getBtnClass(displayStatus === "planned")}
        title="Перевести в статус «Запланирован»"
      >
        <Clock size={14} className="shrink-0 text-[var(--teal)]" />
        <span className="truncate">Запланирован</span>
      </button>
      <button
        type="button"
        data-testid={`timeline-hover-status-confirmed-${appointmentId}`}
        onClick={(e) => {
          e.stopPropagation();
          void handleQuickStatusChange("confirmed");
          onCloseHover();
        }}
        className={getBtnClass(displayStatus === "confirmed")}
        title="Перевести в статус «Подтвержден пациентом»"
      >
        <PhoneCall size={14} className="shrink-0 text-[var(--teal)]" />
        <span className="truncate">Подтвержден</span>
      </button>
      <button
        type="button"
        data-testid={`timeline-hover-status-arrived-${appointmentId}`}
        onClick={(e) => {
          e.stopPropagation();
          void handleQuickStatusChange("arrived");
          onCloseHover();
        }}
        className={getBtnClass(displayStatus === "arrived")}
        title="Перевести в статус «Пациент в клинике / Ожидает»"
      >
        <UserCheck size={14} className="shrink-0 text-[var(--teal)]" />
        <span className="truncate">В клинике</span>
      </button>
      <button
        type="button"
        data-testid={`timeline-hover-status-in-treatment-${appointmentId}`}
        onClick={(e) => {
          e.stopPropagation();
          void handleQuickStatusChange("in_treatment");
          onCloseHover();
        }}
        className={getBtnClass(displayStatus === "in_treatment")}
        title="Перевести в статус «В кресле / На приёме»"
      >
        <CalendarCheck size={14} className="shrink-0 text-[var(--teal)]" />
        <span className="truncate">В кресле</span>
      </button>
      <button
        type="button"
        data-testid={`timeline-hover-status-completed-${appointmentId}`}
        onClick={(e) => {
          e.stopPropagation();
          void handleQuickStatusChange("completed");
          onCloseHover();
        }}
        className={`col-span-2 ${getBtnClass(displayStatus === "completed")}`}
        title="Перевести в статус «Завершен / На оплату»"
      >
        <CheckCircle2 size={14} className="shrink-0 text-[var(--teal)]" />
        <span className="truncate">Завершен</span>
      </button>
    </div>
  );
}
