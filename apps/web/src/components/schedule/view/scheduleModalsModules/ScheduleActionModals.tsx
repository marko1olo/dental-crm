import React from "react";
import { DoctorFreeSlotsModal } from "../../DoctorFreeSlotsModal";
import { PreventiveInspectionModal } from "../../PreventiveInspectionModal";
import { SlotConflictModal } from "../../SlotConflictModal";
import { PatientSearchModal } from "../../PatientSearchModal";
import { TomorrowRemindersModal } from "../../TomorrowRemindersModal";
import { PendingOnlineBookingsModal } from "../../PendingOnlineBookingsModal";
import { usePatientStore } from "../../../../store/patientStore";
import { useAppStore } from "../../../../store/appStore";
import { useUiSurfaceStore } from "../../../../store/uiSurfaceStore";
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
            setQuickBookingSlot({
              dateKey: slot.date,
              startTime: slot.startTime,
              startsAt: `${slot.date}T${slot.startTime}:00.000Z`,
              doctorUserId: slot.doctorId || scheduleDoctorFilterId || null,
              chairId: slot.chairId || null,
              durationMinutes: slot.durationMinutes,
            });
            setQuickBookingOpen(true);
          }}
        />
      )}

      {dashboard && preventiveInspectionOpen !== undefined && setPreventiveInspectionOpen && (
        <PreventiveInspectionModal
          isOpen={preventiveInspectionOpen}
          onClose={() => {
            setPreventiveInspectionOpen(false);
            useUiSurfaceStore
              .getState()
              .closePrimaryModal("preventive_inspection");
          }}
          dashboard={dashboard}
          onBookPatient={(candidate) => {
            setPreventiveInspectionOpen(false);
            useUiSurfaceStore
              .getState()
              .transitionModalToDrawer("preventive_inspection", "quick_booking");
            if (waitlistOpen) setWaitlistOpen(false);
            if (waitlistQuickFillSlot) setWaitlistQuickFillSlot(null);
            setQuickBookingSlot({
              patientId: candidate.patientId,
              patientName: candidate.patientFullName,
              doctorUserId:
                candidate.lastDoctorId || scheduleDoctorFilterId || null,
              doctorName: candidate.lastDoctorName,
              reason:
                candidate.recommendedProcedureName || candidate.categoryTitle,
              dateKey: scheduleDateFilter || clinicToday || todayScheduleDate(),
              durationMinutes: 45,
            });
            setQuickBookingOpen(true);
          }}
        />
      )}

      <SlotConflictModal
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
          dashboard={dashboard}
          isOpen={isTomorrowRemindersOpen}
          onClose={() => setIsTomorrowRemindersOpen(false)}
          targetDateIso={scheduleDateFilter || undefined}
        />
      )}

      {Boolean(isPendingOnlineBookingsOpen && setIsPendingOnlineBookingsOpen) && (
        <PendingOnlineBookingsModal
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
