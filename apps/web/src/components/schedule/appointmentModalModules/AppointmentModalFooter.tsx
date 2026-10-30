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
          className="appointment-modal-cta-cancel secondary-button dente-btn dente-btn-secondary h-11 min-h-[44px] px-5 rounded-[14px] border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-medium transition-all cursor-pointer active:scale-95 shadow-2xs flex items-center justify-center text-center select-none"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={(e) => handleSave(e)}
          disabled={false}
          aria-busy={isSaving}
          className="appointment-modal-cta-save primary-button dente-btn dente-btn-primary h-11 min-h-[44px] px-6 font-semibold rounded-[14px] text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer select-none bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white"
          data-testid="appointment-modal-save-btn"
        >
          <Check size={18} className="stroke-[2.5]" />
          <span>
            {isSaving
              ? "Сохраняю…"
              : collision.isCitoOverbooking || isCito
                ? "✓ Сохранить срочно (Острая боль)"
                : collision.hasCollision
                  ? "✓ Записать на это время"
                  : isNewAppointment
                    ? "✓ Записать пациента"
                    : "✓ Сохранить изменения"}
          </span>
        </button>
      </div>
    </div>
  );
}
