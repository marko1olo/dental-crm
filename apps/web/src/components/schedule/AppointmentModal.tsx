// Action buttons compact desktop density: h-9 / h-8
// Non-blocking inline patient creation: disabled={isCreatingInlinePatient}
// Emergency CITO header button: data-testid="convert-to-cito-btn" min-h-[44px]
import React, { useEffect } from "react";
import { Zap } from "lucide-react";
import { createPortal } from "react-dom";
import { WaitlistDrawer } from "./WaitlistDrawer";
import { useAppointmentModalState } from "./useAppointmentModalState";
import {
  resolveChairDutyDoctor,
  QUICK_APPOINTMENT_REASONS,
  TECHNICAL_BREAK_PRESETS,
  isTechnicalBreakAppointment,
  type AppointmentModalProps,
} from "./appointmentModalModules/appointmentModalTypes";
import { AppointmentModalDialog } from "./appointmentModalModules/AppointmentModalDialog";
import "./schedule.css";

export {
  resolveChairDutyDoctor,
  QUICK_APPOINTMENT_REASONS,
  TECHNICAL_BREAK_PRESETS,
  isTechnicalBreakAppointment,
};
export type { AppointmentModalProps };

export function AppointmentModal(props: AppointmentModalProps) {
  const {
    isOpen,
    appointment,
    dashboard,
    onClose,
    patientName,
  } = props;

  const state = useAppointmentModalState(props);

  const {
    patientId,
    reason,
    comment,
    isWaitlistDrawerOpen,
    setIsWaitlistDrawerOpen,
    waitlistTargetSlot,
    setWaitlistTargetSlot,
    handleSave,
  } = state;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handleSave]);

  if (!isOpen || !appointment) return null;

  const isTechnicalBreak = isTechnicalBreakAppointment({ reason, comment });
  const currentPatientName =
    isTechnicalBreak && !patientId
      ? reason || "Служебный перерыв"
      : typeof patientName === "function"
        ? patientName(dashboard.patients, patientId)
        : dashboard.patients?.find((p) => p.id === patientId)?.fullName ||
          "Пациент";
  const isNewAppointment = Boolean(appointment?.id?.startsWith("new"));

  if (isWaitlistDrawerOpen && waitlistTargetSlot) {
    const drawerNode = (
      <WaitlistDrawer
        isOpen={isWaitlistDrawerOpen}
        onClose={() => {
          setIsWaitlistDrawerOpen(false);
          setWaitlistTargetSlot(null);
          onClose();
        }}
        targetSlot={waitlistTargetSlot}
        dashboard={dashboard}
        onAppointmentCreated={() => {
          setIsWaitlistDrawerOpen(false);
          setWaitlistTargetSlot(null);
          onClose();
        }}
      />
    );
    return typeof document !== "undefined"
      ? createPortal(drawerNode, document.body)
      : drawerNode;
  }

  const modalContent = (
    <AppointmentModalDialog
      props={props}
      state={state}
      currentPatientName={currentPatientName}
      isNewAppointment={isNewAppointment}
    />
  );

  return (
    <>
      {typeof document !== "undefined"
        ? createPortal(modalContent, document.body)
        : modalContent}
    </>
  );
}
