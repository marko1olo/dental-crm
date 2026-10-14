import React from "react";
import { QuickBookingDrawer } from "../QuickBookingDrawer";
import { AppointmentModal } from "../AppointmentModal";
import { WaitlistDrawer } from "../WaitlistDrawer";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import {
  type ScheduleViewModalsProps,
  type QuickBookingSlotInfo,
  type TargetSlotInfo,
  type DoctorShift,
  type RosterStaffMember,
  type RosterCabinetDefinition,
  type DateRangeShiftPreset,
  type QuickAddChairData,
} from "./scheduleModalsModules/scheduleModalsTypes";
import { useScheduleSurfaceCoordination } from "./scheduleModalsModules/useScheduleSurfaceCoordination";
import { ScheduleActionModals } from "./scheduleModalsModules/ScheduleActionModals";
import { ScheduleRosterAndSyncModals } from "./scheduleModalsModules/ScheduleRosterAndSyncModals";

export type {
  ScheduleViewModalsProps,
  QuickBookingSlotInfo,
  TargetSlotInfo,
  DoctorShift,
  RosterStaffMember,
  RosterCabinetDefinition,
  DateRangeShiftPreset,
  QuickAddChairData,
};

export function ScheduleViewModals(props: ScheduleViewModalsProps) {
  const {
    quickBookingOpen,
    setQuickBookingOpen,
    quickBookingSlot,
    setQuickBookingSlot,
    modalAppointment,
    setModalAppointment,
    waitlistOpen,
    setWaitlistOpen,
    waitlistQuickFillSlot,
    setWaitlistQuickFillSlot,
    dashboard,
    auth,
    loadDashboard,
    computedChairDoctorAssignments,
    formatTime,
    patientName,
    toDateTimeLocalValue,
    fromDateTimeLocalValue,
    appointmentLabels,
    activeVisitLockedAppointmentStatuses,
    appointmentReadinessById,
    updateAppointmentScheduleDraft,
    saveAppointmentSchedule,
    repeatAppointment,
    copyAppointmentToBuffer,
    handleOpenWaitlistForSlot,
    updateNewAppointmentDraft,
    focusNewAppointmentEditor,
    createAppointmentFromDraft,
    logicContext,
  } = props;

  // Surface coordination: mutual exclusion between drawers and modals
  useScheduleSurfaceCoordination(props);

  return (
    <>
      <QuickBookingDrawer
        isOpen={quickBookingOpen}
        onClose={() => {
          setQuickBookingOpen(false);
          setQuickBookingSlot(null);
          useUiSurfaceStore.getState().closeDrawer("quick_booking");
        }}
        initialSlot={quickBookingSlot}
        editingAppointment={quickBookingSlot?.editingAppointment || null}
        dashboard={dashboard as any}
        auth={auth}
        loadDashboard={
          typeof loadDashboard === "function"
            ? async () => {
                await loadDashboard();
              }
            : undefined
        }
        setDashboard={logicContext?.setDashboard}
        toDateTimeLocalValue={toDateTimeLocalValue}
        fromDateTimeLocalValue={fromDateTimeLocalValue}
        chairDoctorAssignments={computedChairDoctorAssignments}
      />

      <AppointmentModal
        isOpen={modalAppointment !== null}
        appointment={modalAppointment}
        dashboard={dashboard as any}
        onClose={() => {
          setModalAppointment(null);
          useUiSurfaceStore.getState().closePrimaryModal("appointment_modal");
        }}
        onSave={async (appointmentId, draft) => {
          const allowOverbooking = Boolean((draft as any).allowOverbooking);
          const allowEmergencyOverride = Boolean(
            (draft as any).allowEmergencyOverride,
          );
          if (
            appointmentId.startsWith("new") &&
            typeof createAppointmentFromDraft === "function"
          ) {
            for (const [key, value] of Object.entries(draft)) {
              updateNewAppointmentDraft(key, value);
            }
            return Boolean(
              await createAppointmentFromDraft({
                allowOverbooking,
                allowEmergencyOverride,
              }),
            );
          }
          for (const [key, value] of Object.entries(draft)) {
            updateAppointmentScheduleDraft(appointmentId, key, value);
          }
          return await saveAppointmentSchedule(appointmentId, {
            allowOverbooking,
            allowEmergencyOverride,
          });
        }}
        repeatAppointment={repeatAppointment}
        copyAppointmentToBuffer={copyAppointmentToBuffer}
        patientName={patientName}
        formatTime={formatTime}
        toDateTimeLocalValue={toDateTimeLocalValue}
        fromDateTimeLocalValue={fromDateTimeLocalValue}
        appointmentLabels={appointmentLabels}
        activeVisitLockedAppointmentStatuses={activeVisitLockedAppointmentStatuses}
        appointmentReadinessById={appointmentReadinessById}
        chairDoctorAssignments={computedChairDoctorAssignments}
        onOpenWaitlistForSlot={handleOpenWaitlistForSlot}
      />

      <WaitlistDrawer
        isOpen={waitlistOpen || waitlistQuickFillSlot !== null}
        onClose={() => {
          setWaitlistOpen(false);
          setWaitlistQuickFillSlot(null);
          useUiSurfaceStore.getState().closeDrawer("waitlist");
        }}
        targetSlot={waitlistQuickFillSlot}
        updateNewAppointmentDraft={updateNewAppointmentDraft}
        focusNewAppointmentEditor={focusNewAppointmentEditor}
        dashboard={dashboard}
        auth={auth}
        onAppointmentCreated={() => {
          if (typeof loadDashboard === "function") {
            void loadDashboard();
          }
        }}
      />

      <ScheduleActionModals {...props} />
      <ScheduleRosterAndSyncModals {...props} />
    </>
  );
}
