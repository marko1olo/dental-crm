import type { Appointment } from "@dental/shared";
import { CalendarCheck, Check, CheckCircle2, Clock, UserCheck, UserX } from "lucide-react";
import React from "react";

export interface AppointmentStatusChipsProps {
  status: Appointment["status"];
  appointmentLabels: Record<Appointment["status"], string>;
  onSelectStatus: (nextStatus: Appointment["status"]) => void;
}

export function AppointmentStatusChips({
  status,
  appointmentLabels,
  onSelectStatus,
}: AppointmentStatusChipsProps) {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 mb-1.5">
        <button
          type="button"
          onClick={() => onSelectStatus("planned")}
          className={`appointment-modal-status-chip appointment-modal-status-chip--planned dente-btn-pill ${status === "planned" ? "active" : ""} min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 shadow-2xs ${
            status === "planned"
              ? "!bg-[var(--teal)] !text-white font-bold !border-[var(--teal)] shadow-sm"
              : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
          }`}
          data-testid="modal-status-btn-planned"
        >
          {status === "planned" ? <Check size={12} className="stroke-[3] shrink-0" /> : <Clock size={12} className="shrink-0 text-[var(--teal)]" />}
          <span className="whitespace-nowrap leading-none">Ожидает</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectStatus("confirmed")}
          className={`appointment-modal-status-chip appointment-modal-status-chip--confirmed dente-btn-pill ${status === "confirmed" ? "active" : ""} min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 shadow-2xs ${
            status === "confirmed"
              ? "!bg-[var(--teal)] !text-white font-bold !border-[var(--teal)] shadow-sm"
              : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
          }`}
          data-testid="modal-status-btn-confirmed"
        >
          {status === "confirmed" ? <Check size={12} className="stroke-[3] shrink-0" /> : <UserCheck size={12} className="shrink-0 text-[var(--teal)]" />}
          <span className="whitespace-nowrap leading-none">Подтвержден</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectStatus("arrived")}
          className={`appointment-modal-status-chip appointment-modal-status-chip--arrived dente-btn-pill ${status === "arrived" ? "active" : ""} min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 shadow-2xs ${
            status === "arrived"
              ? "!bg-[var(--teal)] !text-white font-bold !border-[var(--teal)] shadow-sm"
              : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
          }`}
          data-testid="modal-status-btn-arrived"
        >
          {status === "arrived" ? <Check size={12} className="stroke-[3] shrink-0" /> : <UserCheck size={12} className="shrink-0 text-[var(--teal)]" />}
          <span className="whitespace-nowrap leading-none">В холле</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectStatus("in_treatment")}
          className={`appointment-modal-status-chip appointment-modal-status-chip--in_treatment dente-btn-pill ${status === "in_treatment" ? "active" : ""} min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 shadow-2xs ${
            status === "in_treatment"
              ? "!bg-[var(--teal)] !text-white font-bold !border-[var(--teal)] shadow-sm"
              : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
          }`}
          data-testid="modal-status-btn-in_treatment"
        >
          {status === "in_treatment" ? <Check size={12} className="stroke-[3] shrink-0" /> : <CalendarCheck size={12} className="shrink-0 text-[var(--teal)]" />}
          <span className="whitespace-nowrap leading-none">В кресле</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectStatus("completed")}
          className={`appointment-modal-status-chip appointment-modal-status-chip--completed dente-btn-pill ${status === "completed" ? "active" : ""} min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 shadow-2xs ${
            status === "completed"
              ? "!bg-[var(--paper-strong)] !text-[var(--ink)] font-bold !border-[var(--line)] shadow-sm"
              : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
          }`}
          data-testid="modal-status-btn-completed"
        >
          {status === "completed" ? <Check size={12} className="stroke-[3] shrink-0" /> : <CheckCircle2 size={12} className="shrink-0 text-[var(--ink-muted)]" />}
          <span className="whitespace-nowrap leading-none">Завершен</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectStatus("no_show")}
          className={`appointment-modal-status-chip appointment-modal-status-chip--no_show dente-btn-pill ${status === "no_show" ? "active" : ""} min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 shadow-2xs ${
            status === "no_show"
              ? "!bg-rose-500/15 !text-rose-600 dark:!text-rose-400 font-bold !border-rose-500/40 shadow-sm"
              : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-rose-500/10 hover:text-rose-600"
          }`}
          data-testid="modal-status-btn-no_show"
        >
          {status === "no_show" ? <Check size={12} className="stroke-[3] shrink-0" /> : <UserX size={12} className="shrink-0 text-rose-600 dark:text-rose-400" />}
          <span className="whitespace-nowrap leading-none">Неявка</span>
        </button>
      </div>

      <select
        value={status}
        onChange={(e) => onSelectStatus(e.target.value as Appointment["status"])}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="select-appointment-status"
      >
        {(Object.keys(appointmentLabels) as Appointment["status"][]).map((st) => (
          <option key={st} value={st}>{appointmentLabels[st]}</option>
        ))}
      </select>
    </>
  );
}
