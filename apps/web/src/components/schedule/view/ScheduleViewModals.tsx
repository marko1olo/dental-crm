import React from "react";
import { QuickBookingDrawer } from "../QuickBookingDrawer";
import { WaitlistDrawer } from "../WaitlistDrawer";
import type { WaitlistCandidateItem } from "../waitlist/waitlistTypes";
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
import { handleBookWaitlistSlot } from "./scheduleModalsModules/waitlistSlotBookingHandler";
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
    showToast,
  } = props;

  // [SCH-02]: Боевое бронирование слота из листа ожидания с реальным запросом в Fastify API
  const onBookWaitlistSlot = async (
    candidate: WaitlistCandidateItem,
    slot: TargetSlotInfo,
  ) => {
    await handleBookWaitlistSlot({
      candidate,
      slot,
      dashboard,
      auth,
      loadDashboard: typeof loadDashboard === "function" ? loadDashboard : undefined,
      showToast,
      onSuccess: () => {
        setWaitlistOpen(false);
        setWaitlistQuickFillSlot(null);
        useUiSurfaceStore.getState().closeDrawer("waitlist");
      },
    });
  };

  // Surface coordination: mutual exclusion between drawers and modals
  useScheduleSurfaceCoordination(props);
  const isWaitlistDrawerActive = useUiSurfaceStore((s) => s.activeDrawer === "waitlist");

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

      <WaitlistDrawer
        isOpen={waitlistOpen || waitlistQuickFillSlot !== null || isWaitlistDrawerActive}
        onClose={() => {
          setWaitlistOpen(false);
          setWaitlistQuickFillSlot(null);
          useUiSurfaceStore.getState().closeDrawer("waitlist");
        }}
        targetSlot={waitlistQuickFillSlot}
        onBookSlot={onBookWaitlistSlot}
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
