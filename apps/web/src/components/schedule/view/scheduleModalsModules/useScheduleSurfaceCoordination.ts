import React from "react";
import { useUiSurfaceStore } from "../../../../store/uiSurfaceStore";
import type { ScheduleViewModalsProps } from "./scheduleModalsTypes";

export function useScheduleSurfaceCoordination({
  modalAppointment,
  quickBookingOpen,
  setQuickBookingOpen,
  waitlistOpen,
  setWaitlistOpen,
  waitlistQuickFillSlot,
  setWaitlistQuickFillSlot,
  doctorFreeSlotsOpen,
  isPatientSearchOpen,
  preventiveInspectionOpen,
  isRosterModalOpen,
  isQuickAddChairOpen,
  isCalendarSyncModalOpen,
  isTomorrowRemindersOpen,
}: Pick<
  ScheduleViewModalsProps,
  | "modalAppointment"
  | "quickBookingOpen"
  | "setQuickBookingOpen"
  | "waitlistOpen"
  | "setWaitlistOpen"
  | "waitlistQuickFillSlot"
  | "setWaitlistQuickFillSlot"
  | "doctorFreeSlotsOpen"
  | "isPatientSearchOpen"
  | "preventiveInspectionOpen"
  | "isRosterModalOpen"
  | "isQuickAddChairOpen"
  | "isCalendarSyncModalOpen"
  | "isTomorrowRemindersOpen"
>) {
  // 1. AppointmentModal (Primary Modal)
  React.useEffect(() => {
    if (modalAppointment !== null) {
      useUiSurfaceStore
        .getState()
        .openPrimaryModal("appointment_modal", { appointmentId: modalAppointment.id });
      if (quickBookingOpen) setQuickBookingOpen(false);
      if (waitlistOpen) setWaitlistOpen(false);
      if (waitlistQuickFillSlot !== null) setWaitlistQuickFillSlot(null);
    } else if (
      useUiSurfaceStore.getState().primaryModal?.id === "appointment_modal"
    ) {
      useUiSurfaceStore.getState().closePrimaryModal("appointment_modal");
    }
  }, [
    modalAppointment,
    quickBookingOpen,
    setQuickBookingOpen,
    waitlistOpen,
    setWaitlistOpen,
    waitlistQuickFillSlot,
    setWaitlistQuickFillSlot,
  ]);

  // 2. DoctorFreeSlotsModal
  React.useEffect(() => {
    if (doctorFreeSlotsOpen) {
      useUiSurfaceStore.getState().openPrimaryModal("doctor_free_slots");
      if (quickBookingOpen) setQuickBookingOpen(false);
      if (waitlistOpen) setWaitlistOpen(false);
      if (waitlistQuickFillSlot !== null) setWaitlistQuickFillSlot(null);
    } else if (
      useUiSurfaceStore.getState().primaryModal?.id === "doctor_free_slots"
    ) {
      useUiSurfaceStore.getState().closePrimaryModal("doctor_free_slots");
    }
  }, [
    doctorFreeSlotsOpen,
    quickBookingOpen,
    setQuickBookingOpen,
    waitlistOpen,
    setWaitlistOpen,
    waitlistQuickFillSlot,
    setWaitlistQuickFillSlot,
  ]);

  // 3. PatientSearchModal
  React.useEffect(() => {
    if (isPatientSearchOpen) {
      useUiSurfaceStore.getState().openPrimaryModal("patient_search");
      if (quickBookingOpen) setQuickBookingOpen(false);
      if (waitlistOpen) setWaitlistOpen(false);
      if (waitlistQuickFillSlot !== null) setWaitlistQuickFillSlot(null);
    } else if (
      useUiSurfaceStore.getState().primaryModal?.id === "patient_search"
    ) {
      useUiSurfaceStore.getState().closePrimaryModal("patient_search");
    }
  }, [
    isPatientSearchOpen,
    quickBookingOpen,
    setQuickBookingOpen,
    waitlistOpen,
    setWaitlistOpen,
    waitlistQuickFillSlot,
    setWaitlistQuickFillSlot,
  ]);

  // 4. PreventiveInspectionModal
  React.useEffect(() => {
    if (preventiveInspectionOpen) {
      useUiSurfaceStore.getState().openPrimaryModal("preventive_inspection");
      if (quickBookingOpen) setQuickBookingOpen(false);
      if (waitlistOpen) setWaitlistOpen(false);
      if (waitlistQuickFillSlot !== null) setWaitlistQuickFillSlot(null);
    } else if (
      useUiSurfaceStore.getState().primaryModal?.id === "preventive_inspection"
    ) {
      useUiSurfaceStore.getState().closePrimaryModal("preventive_inspection");
    }
  }, [
    preventiveInspectionOpen,
    quickBookingOpen,
    setQuickBookingOpen,
    waitlistOpen,
    setWaitlistOpen,
    waitlistQuickFillSlot,
    setWaitlistQuickFillSlot,
  ]);

  // 5. Other dialogs
  React.useEffect(() => {
    if (isRosterModalOpen) {
      useUiSurfaceStore.getState().openPrimaryModal("roster_modal");
      if (quickBookingOpen) setQuickBookingOpen(false);
      if (waitlistOpen) setWaitlistOpen(false);
    } else if (
      useUiSurfaceStore.getState().primaryModal?.id === "roster_modal"
    ) {
      useUiSurfaceStore.getState().closePrimaryModal("roster_modal");
    }
  }, [
    isRosterModalOpen,
    quickBookingOpen,
    setQuickBookingOpen,
    waitlistOpen,
    setWaitlistOpen,
  ]);

  React.useEffect(() => {
    if (isQuickAddChairOpen) {
      useUiSurfaceStore.getState().openPrimaryModal("quick_add_chair");
      if (quickBookingOpen) setQuickBookingOpen(false);
      if (waitlistOpen) setWaitlistOpen(false);
    } else if (
      useUiSurfaceStore.getState().primaryModal?.id === "quick_add_chair"
    ) {
      useUiSurfaceStore.getState().closePrimaryModal("quick_add_chair");
    }
  }, [
    isQuickAddChairOpen,
    quickBookingOpen,
    setQuickBookingOpen,
    waitlistOpen,
    setWaitlistOpen,
  ]);

  React.useEffect(() => {
    if (isCalendarSyncModalOpen) {
      useUiSurfaceStore.getState().openPrimaryModal("calendar_sync");
      if (quickBookingOpen) setQuickBookingOpen(false);
      if (waitlistOpen) setWaitlistOpen(false);
    } else if (
      useUiSurfaceStore.getState().primaryModal?.id === "calendar_sync"
    ) {
      useUiSurfaceStore.getState().closePrimaryModal("calendar_sync");
    }
  }, [
    isCalendarSyncModalOpen,
    quickBookingOpen,
    setQuickBookingOpen,
    waitlistOpen,
    setWaitlistOpen,
  ]);

  React.useEffect(() => {
    if (isTomorrowRemindersOpen) {
      useUiSurfaceStore.getState().openPrimaryModal("tomorrow_reminders");
      if (quickBookingOpen) setQuickBookingOpen(false);
      if (waitlistOpen) setWaitlistOpen(false);
    } else if (
      useUiSurfaceStore.getState().primaryModal?.id === "tomorrow_reminders"
    ) {
      useUiSurfaceStore.getState().closePrimaryModal("tomorrow_reminders");
    }
  }, [
    isTomorrowRemindersOpen,
    quickBookingOpen,
    setQuickBookingOpen,
    waitlistOpen,
    setWaitlistOpen,
  ]);

  // 6. Drawers coordination: QuickBookingDrawer vs WaitlistDrawer
  React.useEffect(() => {
    if (quickBookingOpen) {
      useUiSurfaceStore.getState().openDrawer("quick_booking");
      if (waitlistOpen) setWaitlistOpen(false);
      if (waitlistQuickFillSlot !== null) setWaitlistQuickFillSlot(null);
    } else if (useUiSurfaceStore.getState().activeDrawer === "quick_booking") {
      useUiSurfaceStore.getState().closeDrawer("quick_booking");
    }
  }, [
    quickBookingOpen,
    waitlistOpen,
    setWaitlistOpen,
    waitlistQuickFillSlot,
    setWaitlistQuickFillSlot,
  ]);

  React.useEffect(() => {
    const isWaitlistActive = waitlistOpen || waitlistQuickFillSlot !== null;
    if (isWaitlistActive) {
      useUiSurfaceStore.getState().openDrawer("waitlist");
      if (quickBookingOpen) setQuickBookingOpen(false);
    } else if (useUiSurfaceStore.getState().activeDrawer === "waitlist") {
      useUiSurfaceStore.getState().closeDrawer("waitlist");
    }
  }, [waitlistOpen, waitlistQuickFillSlot, quickBookingOpen, setQuickBookingOpen]);

  // 7. Подписка на внешние изменения uiSurfaceStore (синхронизация с глобальной шиной и телефонией)
  React.useEffect(() => {
    const unsub = useUiSurfaceStore.subscribe((state) => {
      if (state.hasPrimaryModal) {
        if (quickBookingOpen) setQuickBookingOpen(false);
        if (waitlistOpen) setWaitlistOpen(false);
        if (waitlistQuickFillSlot !== null) setWaitlistQuickFillSlot(null);
      } else if (state.activeDrawer) {
        if (state.activeDrawer !== "quick_booking" && quickBookingOpen) {
          setQuickBookingOpen(false);
        }
        if (
          state.activeDrawer !== "waitlist" &&
          (waitlistOpen || waitlistQuickFillSlot !== null)
        ) {
          setWaitlistOpen(false);
          setWaitlistQuickFillSlot(null);
        }
      }
    });
    return unsub;
  }, [
    quickBookingOpen,
    setQuickBookingOpen,
    waitlistOpen,
    setWaitlistOpen,
    waitlistQuickFillSlot,
    setWaitlistQuickFillSlot,
  ]);
}
