import React from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  PhoneCall,
  Stethoscope,
  UserCheck,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import type { AppointmentStatusPopupProps } from "./types";

export function AppointmentHoverHudStatusActions({
  appointment,
  displayStatus,
  appointmentPatient,
  appointmentPatientName,
  handleQuickStatusChange,
  onCloseHover,
  onOpenVisit,
}: AppointmentStatusPopupProps) {
  return (
    <div className="space-y-2 pt-2 border-t border-[var(--line)]">
      <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
        Быстрая смена статуса:
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          data-testid={`timeline-hover-status-planned-${appointment.id}`}
          onClick={(e) => {
            e.stopPropagation();
            void handleQuickStatusChange("planned");
            onCloseHover();
          }}
          className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
            displayStatus === "planned"
              ? "bg-sky-500 text-white border-sky-500 shadow-2xs"
              : "bg-sky-500/10 text-sky-800 dark:text-sky-200 border-sky-500/30 hover:bg-sky-500/20"
          }`}
          title="Перевести в статус «Запланирован»"
        >
          <Clock size={14} className="shrink-0" />
          <span className="truncate">Запланирован</span>
        </button>
        <button
          type="button"
          data-testid={`timeline-hover-status-confirmed-${appointment.id}`}
          onClick={(e) => {
            e.stopPropagation();
            void handleQuickStatusChange("confirmed");
            onCloseHover();
          }}
          className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
            displayStatus === "confirmed"
              ? "bg-violet-600 text-white border-violet-600 shadow-2xs"
              : "bg-violet-500/10 text-violet-800 dark:text-violet-200 border-violet-500/30 hover:bg-violet-500/20"
          }`}
          title="Перевести в статус «Подтвержден пациентом»"
        >
          <PhoneCall size={14} className="shrink-0" />
          <span className="truncate">Подтвержден</span>
        </button>
        <button
          type="button"
          data-testid={`timeline-hover-status-arrived-${appointment.id}`}
          onClick={(e) => {
            e.stopPropagation();
            void handleQuickStatusChange("arrived");
            onCloseHover();
          }}
          className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
            displayStatus === "arrived"
              ? "bg-amber-500 text-white border-amber-500 shadow-2xs"
              : "bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30 hover:bg-amber-500/20"
          }`}
          title="Перевести в статус «Пациент в клинике / Ожидает»"
        >
          <UserCheck size={14} className="shrink-0" />
          <span className="truncate">В клинике</span>
        </button>
        <button
          type="button"
          data-testid={`timeline-hover-status-in-treatment-${appointment.id}`}
          onClick={(e) => {
            e.stopPropagation();
            void handleQuickStatusChange("in_treatment");
            onCloseHover();
          }}
          className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
            displayStatus === "in_treatment"
              ? "bg-[var(--teal,var(--brand-primary))] text-white border-[var(--teal)] shadow-2xs"
              : "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border-[var(--teal)]/30 hover:bg-[var(--teal-surface)]"
          }`}
          title="Перевести в статус «В кресле / На приёме»"
        >
          <CalendarCheck size={14} className="shrink-0" />
          <span className="truncate">В кресле</span>
        </button>
        <button
          type="button"
          data-testid={`timeline-hover-status-completed-${appointment.id}`}
          onClick={(e) => {
            e.stopPropagation();
            void handleQuickStatusChange("completed");
            onCloseHover();
          }}
          className={`col-span-2 min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
            displayStatus === "completed"
              ? "bg-slate-700 dark:bg-slate-600 text-white border-slate-700 shadow-2xs"
              : "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30 hover:bg-slate-500/20"
          }`}
          title="Перевести в статус «Завершен / На оплату»"
        >
          <CheckCircle2 size={14} className="shrink-0" />
          <span className="truncate">Завершен</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[var(--line)]">
        <button
          type="button"
          data-testid="hover-start-visit-btn"
          id={`timeline-hover-start-visit-${appointment.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onCloseHover();
            void handleQuickStatusChange("in_treatment");
            if (appointmentPatient?.id) {
              usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
            }
            if (onOpenVisit) {
              onOpenVisit();
            } else {
              useAppStore.getState().setCurrentView("visit");
            }
            showToast(`Приём начат: ${appointmentPatientName} в кресле`, "success");
          }}
          className="min-h-[44px] px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--teal,var(--brand-primary))] text-[var(--on-teal,#ffffff)] hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
          title="Начать приём: перевести в статус «В кресле» и открыть медицинскую карту"
        >
          <Stethoscope size={14} className="shrink-0" />
          <span className="whitespace-nowrap">Начать приём</span>
        </button>

        <button
          type="button"
          data-testid="hover-pay-54fz-btn"
          id={`timeline-hover-pay-54fz-${appointment.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onCloseHover();
            if (displayStatus === "in_treatment") {
              void handleQuickStatusChange("completed");
            }
            if (appointmentPatient?.id) {
              usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
            }
            useAppStore.getState().setCurrentView("finance");
            showToast(`Быстрый расчёт: ${appointmentPatientName}`, "info");
          }}
          className="min-h-[44px] px-2.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
          title="Быстрый расчёт: перейти к оплате"
        >
          <CreditCard size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="whitespace-nowrap">Быстрый расчёт</span>
        </button>
      </div>
    </div>
  );
}
