import React from "react";
import { DoctorFreeSlotsModal } from "../../DoctorFreeSlotsModal";
import { PatientRecallsHubModal } from "../../../recalls/PatientRecallsHubModal";
import { SlotConflictModal } from "../../SlotConflictModal";
import { PatientSearchModal } from "../../PatientSearchModal";
import { TomorrowRemindersModal } from "../../TomorrowRemindersModal";
import { PendingOnlineBookingsModal } from "../../PendingOnlineBookingsModal";
import { usePatientStore } from "../../../../store/patientStore";
import { useAppStore } from "../../../../store/appStore";
import { useUiSurfaceStore } from "../../../../store/uiSurfaceStore";
import { fromDateTimeLocalValue as canonicalFromDateTimeLocalValue } from "../../../../utils/dateTimeUtils";
import type { ScheduleViewModalsProps } from "./scheduleModalsTypes";

export function ScheduleActionModals(props: ScheduleViewModalsProps) {
  const {
    doctorFreeSlotsOpen,
    setDoctorFreeSlotsOpen,
    preventiveInspectionOpen,
    setPreventiveInspectionOpen,
    isPatientSearchOpen,
    setIsPatientSearchOpen,
    isTomorrowRemindersOpen,
    setIsTomorrowRemindersOpen,
    isPendingOnlineBookingsOpen,
    setIsPendingOnlineBookingsOpen,
    pendingOnlineBookings,
    dashboard,
    logicContext,
    scheduleDoctorFilterId,
    scheduleChairFilterId,
    scheduleDateFilter,
    clinicToday,
    todayScheduleDate,
    setQuickBookingSlot,
    quickBookingOpen,
    setQuickBookingOpen,
    waitlistOpen,
    setWaitlistOpen,
    waitlistQuickFillSlot,
    setWaitlistQuickFillSlot,
    saveAppointmentSchedule,
    createAppointmentFromDraft,
    updateNewAppointmentDraft,
    showToast,
    loadDashboard,
  } = props;

  return (
    <>
      {dashboard && (
        <DoctorFreeSlotsModal
          key={scheduleDoctorFilterId || "doctor_free_slots"}
          isOpen={doctorFreeSlotsOpen}
          onClose={() => {
            setDoctorFreeSlotsOpen(false);
            useUiSurfaceStore.getState().closePrimaryModal("doctor_free_slots");
          }}
          dashboard={dashboard}
          initialDoctorId={scheduleDoctorFilterId}
          onSelectSlot={(slot) => {
            setDoctorFreeSlotsOpen(false);
            useUiSurfaceStore
              .getState()
              .transitionModalToDrawer("doctor_free_slots", "quick_booking");
            if (waitlistOpen) setWaitlistOpen(false);
            if (waitlistQuickFillSlot) setWaitlistQuickFillSlot(null);
            const clinicTz = (dashboard as { clinicSettings?: { profile?: { timezone?: string } } } | null | undefined)?.clinicSettings?.profile?.timezone;
            const parseDateTime: (val: string, timeZone?: string | null) => string =
              props.fromDateTimeLocalValue ?? canonicalFromDateTimeLocalValue;
            setQuickBookingSlot({
              dateKey: slot.date,
              startTime: slot.startTime,
              startsAt: parseDateTime(`${slot.date}T${slot.startTime}`, clinicTz),
              doctorUserId: slot.doctorId || scheduleDoctorFilterId || null,
              chairId: slot.chairId || null,
              durationMinutes: slot.durationMinutes,
            });
            setQuickBookingOpen(true);
          }}
        />
      )}

      {preventiveInspectionOpen !== undefined && setPreventiveInspectionOpen && (
        <PatientRecallsHubModal
          key="patient_recalls_hub"
          isOpen={preventiveInspectionOpen}
          onClose={() => {
            setPreventiveInspectionOpen(false);
            useUiSurfaceStore
              .getState()
              .closePrimaryModal("patient_recalls_hub");
          }}
          clinicName={dashboard?.clinicName || "Стоматология ДЕНТЕ"}
          onBookAppointment={(candidate) => {
            setPreventiveInspectionOpen(false);
            useUiSurfaceStore
              .getState()
              .transitionModalToDrawer("patient_recalls_hub", "quick_booking");
            if (waitlistOpen) setWaitlistOpen(false);
            if (waitlistQuickFillSlot) setWaitlistQuickFillSlot(null);
            setQuickBookingSlot({
              patientId: candidate.patientId,
              patientName: candidate.fullName,
              doctorUserId:
                candidate.attendingDoctorId || scheduleDoctorFilterId || null,
              doctorName: candidate.attendingDoctorName,
              reason:
                candidate.cycleLabel || "Плановый профосмотр",
              dateKey: scheduleDateFilter || clinicToday || todayScheduleDate(),
              durationMinutes: 45,
            });
            setQuickBookingOpen(true);
          }}
        />
      )}

      <SlotConflictModal
        key={logicContext?.slotConflict?.appointmentId || "slot_conflict"}
        isOpen={Boolean(logicContext?.slotConflict)}
        onClose={() => logicContext?.setSlotConflict?.(null)}
        conflictMessage={logicContext?.slotConflict?.message}
        suggestedSlots={logicContext?.slotConflict?.suggestedSlots ?? []}
        onSelectSlot={(slotTime) => {
          logicContext?.applySuggestedSlot?.(
            slotTime,
            logicContext?.slotConflict?.appointmentId,
          );
        }}
        onOverbook={() => {
          const apptId = logicContext?.slotConflict?.appointmentId;
          if (apptId) {
            void saveAppointmentSchedule(apptId, {
              allowOverbooking: true,
              allowEmergencyOverride: true,
            });
          } else if (quickBookingOpen) {
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("dente-quick-booking-overbook", {
                  detail: { overbookOverride: true },
                }),
              );
            }
          } else {
            void createAppointmentFromDraft({
              allowOverbooking: true,
              allowEmergencyOverride: true,
            });
          }
          logicContext?.setSlotConflict?.(null);
        }}
      />

      <PatientSearchModal
        key="patient_search"
        isOpen={isPatientSearchOpen}
        patients={dashboard?.patients ?? []}
        onClose={() => {
          setIsPatientSearchOpen(false);
          useUiSurfaceStore.getState().closePrimaryModal("patient_search");
        }}
        onSelectPatientForBooking={(patient) => {
          setIsPatientSearchOpen(false);
          useUiSurfaceStore
            .getState()
            .transitionModalToDrawer("patient_search", "quick_booking");
          if (waitlistOpen) setWaitlistOpen(false);
          if (waitlistQuickFillSlot) setWaitlistQuickFillSlot(null);
          setQuickBookingSlot({
            dateKey: scheduleDateFilter || clinicToday || todayScheduleDate(),
            doctorUserId: scheduleDoctorFilterId || null,
            chairId: scheduleChairFilterId || null,
            durationMinutes: 30,
          });
          updateNewAppointmentDraft("patientId", patient.id);
          setQuickBookingOpen(true);
          showToast(`Выбран пациент: ${patient.fullName}`, "info");
        }}
        onOpenPatientCard={(patientId) => {
          setIsPatientSearchOpen(false);
          useUiSurfaceStore.getState().closePrimaryModal("patient_search");
          usePatientStore.getState().setSelectedPatientId(patientId);
          useAppStore.getState().setCurrentView("patients");
        }}
        onQuickBookNewPatient={(patient) => {
          setIsPatientSearchOpen(false);
          useUiSurfaceStore
            .getState()
            .transitionModalToDrawer("patient_search", "quick_booking");
          if (waitlistOpen) setWaitlistOpen(false);
          if (waitlistQuickFillSlot) setWaitlistQuickFillSlot(null);
          setQuickBookingSlot({
            dateKey: scheduleDateFilter || clinicToday || todayScheduleDate(),
            doctorUserId: scheduleDoctorFilterId || null,
            chairId: scheduleChairFilterId || null,
            durationMinutes: 30,
          });
          updateNewAppointmentDraft("patientId", patient.id);
          setQuickBookingOpen(true);
          showToast(
            `Быстрая запись нового пациента: ${patient.fullName}`,
            "success",
          );
        }}
        showToastFn={showToast}
      />

      {dashboard && (
        <TomorrowRemindersModal
          key={scheduleDateFilter || "tomorrow_reminders"}
          dashboard={dashboard}
          isOpen={isTomorrowRemindersOpen}
          onClose={() => setIsTomorrowRemindersOpen(false)}
          targetDateIso={scheduleDateFilter || undefined}
        />
      )}

      {Boolean(isPendingOnlineBookingsOpen && setIsPendingOnlineBookingsOpen) && (
        <PendingOnlineBookingsModal
          key="pending_online_bookings"
          isOpen={Boolean(isPendingOnlineBookingsOpen)}
          onClose={() => {
            if (setIsPendingOnlineBookingsOpen) {
              setIsPendingOnlineBookingsOpen(false);
            }
          }}
          pendingBookings={pendingOnlineBookings ?? []}
          dashboard={dashboard}
          {...(loadDashboard ? { loadDashboard } : {})}
          onSelectAppointment={(app) => {
            if (setIsPendingOnlineBookingsOpen) {
              setIsPendingOnlineBookingsOpen(false);
            }
            const dateKey = app.startsAt ? app.startsAt.slice(0, 10) : undefined;
            const startTime = app.startsAt ? app.startsAt.slice(11, 16) : undefined;
            const durationMinutes =
              app.startsAt && app.endsAt
                ? Math.max(
                    15,
                    Math.round(
                      (new Date(app.endsAt).getTime() - new Date(app.startsAt).getTime()) /
                        60000,
                    ),
                  )
                : 30;
            const patientName =
              dashboard?.patients?.find((p) => p.id === app.patientId)?.fullName ??
              undefined;

            setQuickBookingSlot({
              dateKey,
              startTime,
              startsAt: app.startsAt,
              doctorUserId: app.doctorUserId || null,
              chairId: app.chairId || null,
              patientId: app.patientId || null,
              patientName,
              durationMinutes,
              reason: app.reason,
              editingAppointment: app,
            });
            setQuickBookingOpen(true);
          }}
        />
      )}
    </>
  );
}
