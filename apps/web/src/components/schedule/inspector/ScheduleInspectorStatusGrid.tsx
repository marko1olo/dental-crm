import React from "react";
import { Check, Clock, Armchair } from "lucide-react";
import type { Appointment } from "@dental/shared";
import { isAppointmentInChair } from "../appointmentCardHelpers";

export interface ScheduleInspectorStatusGridProps {
  appointmentId: string;
  status: Appointment["status"];
  onQuickStatusChange: (id: string, status: Appointment["status"]) => Promise<void> | void;
}

export const ScheduleInspectorStatusGrid: React.FC<ScheduleInspectorStatusGridProps> = ({
  appointmentId,
  status,
  onQuickStatusChange,
}) => (
  <div className="grid grid-cols-2 gap-1.5 pt-1">
    <button
      type="button"
      onClick={() => onQuickStatusChange(appointmentId, "confirmed")}
      className={`h-7 px-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
        status === "confirmed"
          ? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-2xs"
          : "bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
      }`}
      title="Отметить как подтверждённый"
      data-testid="schedule-inspector-status-confirmed"
    >
      <Check size={12} className="text-[var(--teal)] shrink-0" />
      <span>Подтверждён</span>
    </button>

    <button
      type="button"
      onClick={() => onQuickStatusChange(appointmentId, "arrived")}
      className={`h-7 px-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
        status === "arrived"
          ? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-2xs"
          : "bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
      }`}
      title="Пациент пришёл в клинику и ожидает в холле"
      data-testid="schedule-inspector-status-arrived"
    >
      <Clock size={12} className="text-[var(--teal)] shrink-0" />
      <span>В холле</span>
    </button>

    <button
      type="button"
      onClick={() => onQuickStatusChange(appointmentId, "in_treatment")}
      className={`h-7 px-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
        isAppointmentInChair(status)
          ? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-2xs"
          : "bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
      }`}
      title="Пациент сидит в кресле врача"
      data-testid="schedule-inspector-status-in-chair"
    >
      <Armchair size={12} className="text-[var(--teal)] shrink-0" />
      <span>В кресле</span>
    </button>

    <button
      type="button"
      onClick={() => onQuickStatusChange(appointmentId, "completed")}
      className={`h-7 px-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
        status === "completed"
          ? "bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--line)] font-bold shadow-2xs"
          : "bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
      }`}
      title="Приём завершён"
      data-testid="schedule-inspector-status-completed"
    >
      <Check size={12} className="text-[var(--ink-muted)] shrink-0" />
      <span>Завершён</span>
    </button>
  </div>
);
