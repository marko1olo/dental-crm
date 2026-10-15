import React from "react";
import { AlertTriangle } from "lucide-react";
import { AppointmentModalHeader } from "../AppointmentModalHeader";
import type { AppointmentModalProps } from "./appointmentModalTypes";
import type { useAppointmentModalState } from "../useAppointmentModalState";
import { AppointmentPatientSection } from "./AppointmentPatientSection";
import { AppointmentDetailsSection } from "./AppointmentDetailsSection";
import { AppointmentModalBanners } from "./AppointmentModalBanners";
import { AppointmentModalFooter } from "./AppointmentModalFooter";

export interface AppointmentModalDialogProps {
  props: AppointmentModalProps;
  state: ReturnType<typeof useAppointmentModalState>;
  currentPatientName: string;
  isNewAppointment: boolean;
}

export function AppointmentModalDialog({
  props,
  state,
  currentPatientName,
  isNewAppointment,
}: AppointmentModalDialogProps) {
  const { appointment, dashboard, onClose, repeatAppointment, copyAppointmentToBuffer } = props;
  const { patientId, startsAtLocal, endsAtLocal, isCito, error, handleConvertToCito } = state;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      data-testid="appointment-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Детали приема: ${currentPatientName}`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Закрыть модальное окно"
      />

      <div
        data-testid="appointment-modal-container"
        className="relative w-full max-w-xl sm:max-w-[540px] bg-[var(--paper)] border-t sm:border border-[var(--line-strong)] rounded-t-3xl sm:rounded-2xl shadow-2xl z-10 text-[var(--ink)] flex flex-col max-h-[90dvh] sm:max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom sm:animate-scale-in"
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 shrink-0" />

        {/* Header: Strict 1-row clinical toolbar (32-36px, Mandate 8p, 8c) */}
        {appointment && (
          <AppointmentModalHeader
            appointment={appointment}
            dashboard={dashboard}
            patientId={patientId}
            currentPatientName={currentPatientName}
            startsAtLocal={startsAtLocal}
            endsAtLocal={endsAtLocal}
            isNewAppointment={isNewAppointment}
            isCito={isCito}
            onConvertToCito={handleConvertToCito}
            onClose={onClose}
            repeatAppointment={repeatAppointment}
            copyAppointmentToBuffer={copyAppointmentToBuffer}
          />
        )}

        {/* Body Form */}
        <div className="flex-1 overflow-y-auto min-h-0 p-3.5 sm:p-4 space-y-2.5 pb-4">
          <AppointmentModalBanners
            props={props}
            state={state}
            isNewAppointment={isNewAppointment}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <AppointmentPatientSection
              appointment={appointment}
              dashboard={dashboard}
              state={state}
            />

            <AppointmentDetailsSection
              props={props}
              state={state}
            />
          </div>

          {error && (
            <div
              className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5"
              role="alert"
            >
              <AlertTriangle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <AppointmentModalFooter
          props={props}
          state={state}
          isNewAppointment={isNewAppointment}
        />
      </div>
    </div>
  );
}
