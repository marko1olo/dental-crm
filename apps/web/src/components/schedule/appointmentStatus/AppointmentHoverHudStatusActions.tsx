import React from "react";
import { CreditCard, Stethoscope } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import type { AppointmentStatusPopupProps } from "./types";
import { AppointmentHoverHudStatusButtons } from "./AppointmentHoverHudStatusButtons";

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
      <AppointmentHoverHudStatusButtons
        appointmentId={appointment.id}
        displayStatus={displayStatus}
        handleQuickStatusChange={handleQuickStatusChange}
        onCloseHover={onCloseHover}
      />

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
          className="primary-button min-h-[44px] px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--teal,var(--brand-primary))] text-[var(--on-teal,#ffffff)] hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
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
          className="secondary-button min-h-[44px] px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)]/50 text-[var(--ink)] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
          title="Быстрый расчёт: перейти к оплате"
        >
          <CreditCard size={14} className="text-[var(--teal)] shrink-0" />
          <span className="whitespace-nowrap">Быстрый расчёт</span>
        </button>
      </div>
    </div>
  );
}
