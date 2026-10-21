import React from "react";
import { Check } from "lucide-react";
import {
  isTechnicalBreakAppointment,
  type AppointmentModalFooterProps,
} from "./appointmentModalTypes";
import { AppointmentModalFooterHelper } from "./AppointmentModalFooterHelper";

export type { AppointmentModalFooterProps };

export function AppointmentModalFooter({
  props,
  state,
  isNewAppointment,
}: AppointmentModalFooterProps) {
  const { onClose } = props;
  const {
    error,
    patientId,
    isInlineNewPatient,
    patientSearchQuery,
    newPatientFullName,
    newPatientPhone,
    isSoloDoctor,
    isSaving,
    collision,
    isCito,
    reason,
    comment,
    handleSave,
  } = state;
  const isTechnicalBreak = isTechnicalBreakAppointment({ reason, comment });

  return (
    <div className="px-4 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-2.5">
      <AppointmentModalFooterHelper
        error={error}
        patientId={patientId}
        isTechnicalBreak={isTechnicalBreak}
        isInlineNewPatient={isInlineNewPatient}
        patientSearchQuery={patientSearchQuery}
        newPatientFullName={newPatientFullName}
        newPatientPhone={newPatientPhone}
        isSoloDoctor={isSoloDoctor}
      />

      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={false}
          className="appointment-modal-cta-cancel h-11 px-5 rounded-[14px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-sm font-medium transition-all cursor-pointer active:scale-95 shadow-2xs flex items-center justify-center text-center select-none"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={(e) => handleSave(e)}
          disabled={false}
          aria-busy={isSaving}
          className={`appointment-modal-cta-save h-11 px-6 font-medium rounded-[14px] text-sm transition-all shadow-md hover:brightness-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer select-none ${
            collision.isCitoOverbooking || isCito
              ? "!bg-rose-600 hover:!bg-rose-700 !text-white shadow-rose-500/25"
              : collision.hasCollision
                ? "!bg-amber-600 hover:!bg-amber-700 !text-white shadow-amber-500/25"
                : "!bg-[var(--teal,#0d9488)] hover:brightness-105 active:brightness-95 !text-white shadow-teal-500/20"
          }`}
          data-testid="appointment-modal-save-btn"
        >
          <Check size={18} className="stroke-[2.5]" />
          <span>
            {isSaving
              ? "Сохраняю…"
              : collision.isCitoOverbooking || isCito
                ? "Сохранить срочно (Острая боль)"
                : collision.hasCollision
                  ? "Записать на это время (острая боль)"
                  : isNewAppointment
                    ? "Записать на приём"
                    : "Сохранить запись"}
          </span>
        </button>
      </div>
    </div>
  );
}
