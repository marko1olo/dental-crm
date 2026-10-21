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
          className={`appointment-modal-status-chip appointment-modal-status-chip--planned ${status === "planned" ? "active" : ""} min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 shadow-2xs ${
            status === "planned"
              ? "!bg-amber-500 !text-white font-extrabold !border-amber-500 shadow-sm ring-2 ring-amber-500/30"
              : "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 hover:border-amber-500/50"
          }`}
          data-testid="modal-status-btn-planned"
        >
          {status === "planned" ? <Check size={12} className="stroke-[3] shrink-0" /> : <Clock size={12} className="shrink-0 text-amber-600 dark:text-amber-400" />}
          <span className="whitespace-nowrap leading-none">Ожидает</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectStatus("confirmed")}
          className={`appointment-modal-status-chip appointment-modal-status-chip--confirmed ${status === "confirmed" ? "active" : ""} min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 shadow-2xs ${
            status === "confirmed"
              ? "!bg-emerald-600 !text-white font-extrabold !border-emerald-600 shadow-sm ring-2 ring-emerald-600/30"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-500/20 hover:border-emerald-500/50"
          }`}
          data-testid="modal-status-btn-confirmed"
        >
          {status === "confirmed" ? <Check size={12} className="stroke-[3] shrink-0" /> : <UserCheck size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />}
          <span className="whitespace-nowrap leading-none">Подтвержден</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectStatus("arrived")}
          className={`appointment-modal-status-chip appointment-modal-status-chip--arrived ${status === "arrived" ? "active" : ""} min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 shadow-2xs ${
            status === "arrived"
              ? "!bg-amber-600 !text-white font-extrabold !border-amber-600 shadow-sm ring-2 ring-amber-600/30"
              : "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 hover:border-amber-500/50"
          }`}
          data-testid="modal-status-btn-arrived"
        >
          {status === "arrived" ? <Check size={12} className="stroke-[3] shrink-0" /> : <UserCheck size={12} className="shrink-0 text-amber-600 dark:text-amber-400" />}
          <span className="whitespace-nowrap leading-none">В холле</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectStatus("in_treatment")}
          className={`appointment-modal-status-chip appointment-modal-status-chip--in_treatment ${status === "in_treatment" ? "active" : ""} min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 shadow-2xs ${
            status === "in_treatment"
              ? "!bg-[var(--teal)] !text-white font-extrabold !border-[var(--teal)] shadow-sm ring-2 ring-[var(--teal)]/30"
              : "border-teal-500/30 bg-teal-500/10 text-teal-900 dark:text-teal-200 hover:bg-teal-500/20 hover:border-teal-500/50"
          }`}
          data-testid="modal-status-btn-in_treatment"
        >
          {status === "in_treatment" ? <Check size={12} className="stroke-[3] shrink-0" /> : <CalendarCheck size={12} className="shrink-0 text-teal-600 dark:text-teal-400" />}
          <span className="whitespace-nowrap leading-none">В кресле</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectStatus("completed")}
          className={`appointment-modal-status-chip appointment-modal-status-chip--completed ${status === "completed" ? "active" : ""} min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 shadow-2xs ${
            status === "completed"
              ? "!bg-slate-700 !text-white font-extrabold !border-slate-700 shadow-sm ring-2 ring-slate-700/30"
              : "border-slate-500/30 bg-slate-500/10 text-slate-800 dark:text-slate-200 hover:bg-slate-500/20 hover:border-slate-500/50"
          }`}
          data-testid="modal-status-btn-completed"
        >
          {status === "completed" ? <Check size={12} className="stroke-[3] shrink-0" /> : <CheckCircle2 size={12} className="shrink-0 text-slate-600 dark:text-slate-400" />}
          <span className="whitespace-nowrap leading-none">Завершен</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectStatus("no_show")}
          className={`appointment-modal-status-chip appointment-modal-status-chip--no_show ${status === "no_show" ? "active" : ""} min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 shadow-2xs ${
            status === "no_show"
              ? "!bg-rose-600 !text-white font-extrabold !border-rose-600 shadow-sm ring-2 ring-rose-600/30"
              : "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200 hover:bg-rose-500/20 hover:border-rose-500/50"
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
