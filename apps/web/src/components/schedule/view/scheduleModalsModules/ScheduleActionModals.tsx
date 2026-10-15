import React from "react";
import { DoctorFreeSlotsModal } from "../../DoctorFreeSlotsModal";
import { PreventiveInspectionModal } from "../../PreventiveInspectionModal";
import { SlotConflictModal } from "../../SlotConflictModal";
import { UrgentScheduleRequestsWidget } from "../../UrgentScheduleRequestsWidget";
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
    setModalAppointment,
  } = props;

  return (
    <>
      <DoctorFreeSlotsModal
        isOpen={doctorFreeSlotsOpen}
        onClose={() => {
          setDoctorFreeSlotsOpen(false);
          useUiSurfaceStore.getState().closePrimaryModal("doctor_free_slots");
        }}
        dashboard={dashboard as any}
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

      {preventiveInspectionOpen !== undefined && setPreventiveInspectionOpen && (
        <PreventiveInspectionModal
          isOpen={preventiveInspectionOpen}
          onClose={() => {
            setPreventiveInspectionOpen(false);
            useUiSurfaceStore
              .getState()
              .closePrimaryModal("preventive_inspection");
          }}
          dashboard={dashboard as any}
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
        isOpen={Boolean((logicContext as any)?.slotConflict)}
        onClose={() => (logicContext as any)?.setSlotConflict?.(null)}
        conflictMessage={(logicContext as any)?.slotConflict?.message}
        suggestedSlots={(logicContext as any)?.slotConflict?.suggestedSlots ?? []}
        onSelectSlot={(slotTime) => {
          (logicContext as any)?.applySuggestedSlot?.(
            slotTime,
            (logicContext as any)?.slotConflict?.appointmentId,
          );
        }}
        onOverbook={() => {
          const apptId = (logicContext as any)?.slotConflict?.appointmentId;
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
          (logicContext as any)?.setSlotConflict?.(null);
        }}
      />

      {/* Schedule Utilities & Widgets Panel */}
      <div
        className="schedule-widgets-container mt-6"
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        <UrgentScheduleRequestsWidget
          onBookUrgentRequest={(request) => {
            const targetDate =
              scheduleDateFilter || clinicToday || todayScheduleDate();
            const matchingDoc = (dashboard?.clinicSettings?.staff ?? []).find(
              (s) =>
                s.active &&
                (s.role === "doctor" || s.role === "owner") &&
                (s.fullName
                  .toLowerCase()
                  .includes(request.doctorName.toLowerCase()) ||
                  request.doctorName
                    .toLowerCase()
                    .includes(s.fullName.toLowerCase())),
            );
            const dutyDoctor =
              matchingDoc ||
              (dashboard?.clinicSettings?.staff ?? []).find(
                (s) =>
                  s.active &&
                  (s.role === "doctor" || s.role === "owner") &&
                  (s.specialties?.includes("therapist") ||
                    s.specialties?.includes("surgeon") ||
                    s.specialties?.includes("universal")),
              ) ||
              (dashboard?.clinicSettings?.staff ?? []).find(
                (s) => s.active && (s.role === "doctor" || s.role === "owner"),
              );
            const chairs = (dashboard?.clinicSettings?.chairs ?? []).filter(
              (c) => c.active,
            );
            const chair = chairs[0] || null;

            const existingPatient = (dashboard?.patients ?? []).find(
              (p) =>
                p.status === "active" &&
                p.fullName.toLowerCase() === request.patientName.toLowerCase(),
            );

            let startTime = request.preferredSlotTime || "";
            if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) {
              const now = new Date();
              const roundedMins = Math.ceil(now.getMinutes() / 5) * 5;
              now.setMinutes(roundedMins, 0, 0);
              startTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
            }

            setQuickBookingSlot({
              dateKey: targetDate,
              startTime,
              startsAt: `${targetDate}T${startTime}:00.000Z`,
              doctorUserId: dutyDoctor?.id || null,
              chairId: chair?.id || null,
              patientId: existingPatient?.id || null,
              patientName: request.patientName,
              durationMinutes: 20,
              reason: `Срочно! ${request.requestType || "Острая боль"}`,
              isCitoEmergency: true,
            });
            setQuickBookingOpen(true);
            showToast(
              `Срочная запись для «${request.patientName}»: проверьте время и подтвердите запись`,
              "info",
              4000,
            );
          }}
        />
      </div>

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
            setModalAppointment(app);
          }}
        />
      )}
    </>
  );
}
