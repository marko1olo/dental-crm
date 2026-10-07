import React from "react";
import type { Appointment, Dashboard } from "@dental/shared";
import { QuickBookingDrawer, type QuickBookingSlotInfo } from "../QuickBookingDrawer";
import { AppointmentModal } from "../AppointmentModal";
import { DoctorFreeSlotsModal } from "../DoctorFreeSlotsModal";
import { PreventiveInspectionModal } from "../PreventiveInspectionModal";
import { SlotConflictModal } from "../SlotConflictModal";
import { UrgentScheduleRequestsWidget } from "../UrgentScheduleRequestsWidget";
import { WaitlistDrawer, type TargetSlotInfo } from "../WaitlistDrawer";
import {
  DoctorShiftRosterModal,
  type DoctorShift,
  type StaffMember as RosterStaffMember,
  type CabinetDefinition as RosterCabinetDefinition,
} from "../roster/DoctorShiftRosterModal";
import { QuickAddChairModal, type QuickAddChairData } from "../QuickAddChairModal";
import { DoctorCalendarSyncModal } from "../DoctorCalendarSyncModal";
import { PatientSearchModal } from "../PatientSearchModal";
import { TomorrowRemindersModal } from "../TomorrowRemindersModal";
import { usePatientStore } from "../../../store/patientStore";
import { useAppStore } from "../../../store/appStore";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";

export interface ScheduleViewModalsProps {
  quickBookingOpen: boolean;
  setQuickBookingOpen: (open: boolean) => void;
  quickBookingSlot: QuickBookingSlotInfo | null;
  setQuickBookingSlot: (slot: QuickBookingSlotInfo | null) => void;
  modalAppointment: Appointment | null;
  setModalAppointment: (app: Appointment | null) => void;
  doctorFreeSlotsOpen: boolean;
  setDoctorFreeSlotsOpen: (open: boolean) => void;
  preventiveInspectionOpen?: boolean | undefined;
  setPreventiveInspectionOpen?: ((open: boolean) => void) | undefined;
  isRosterModalOpen: boolean;
  setIsRosterModalOpen: (open: boolean) => void;
  isQuickAddChairOpen: boolean;
  setIsQuickAddChairOpen: (open: boolean) => void;
  isCalendarSyncModalOpen: boolean;
  setIsCalendarSyncModalOpen: (open: boolean) => void;
  isPatientSearchOpen: boolean;
  setIsPatientSearchOpen: (open: boolean) => void;
  isTomorrowRemindersOpen: boolean;
  setIsTomorrowRemindersOpen: (open: boolean) => void;
  waitlistOpen: boolean;
  setWaitlistOpen: (open: boolean) => void;
  waitlistQuickFillSlot: TargetSlotInfo | null;
  setWaitlistQuickFillSlot: (slot: TargetSlotInfo | null) => void;
  editingChairData: QuickAddChairData | null;
  setEditingChairData: (data: QuickAddChairData | null) => void;
  dashboard: Dashboard | null | undefined;
  auth: any;
  loadDashboard?: () => void | Promise<void>;
  logicContext: any;
  scheduleDoctorFilterId: string | null;
  scheduleChairFilterId: string | null;
  scheduleDateFilter: string;
  clinicToday: string;
  todayScheduleDate: () => string;
  computedChairDoctorAssignments: any;
  savedDoctorShifts: DoctorShift[];
  rosterStaffList: RosterStaffMember[];
  rosterCabinets: RosterCabinetDefinition[];
  rosterAppointments: any[];
  scheduleDoctors: any[];
  currentDateKey: string;
  formatTime: (iso: string) => string;
  patientName: (patients: any[], id: string | null) => string;
  toDateTimeLocalValue: (iso: string) => string;
  fromDateTimeLocalValue: (val: string) => string;
  appointmentLabels: Record<string, string>;
  activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
  appointmentReadinessById: Map<string, any>;
  updateAppointmentScheduleDraft: (id: string, key: any, val: any) => void;
  saveAppointmentSchedule: (id: string, opts?: any) => Promise<boolean>;
  repeatAppointment: (app: Appointment) => void;
  copyAppointmentToBuffer: (app: Appointment) => Promise<void>;
  handleOpenWaitlistForSlot: (slot: TargetSlotInfo) => void;
  updateNewAppointmentDraft: (key: string, val: any) => void;
  focusNewAppointmentEditor: () => void;
  createAppointmentFromDraft: (opts?: any) => Promise<any>;
  handleSaveDoctorShifts: (shifts: DoctorShift[]) => Promise<void>;
  handleAddChairFromSchedule: (chairData: QuickAddChairData) => Promise<void>;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", duration?: number) => void;
}

export function ScheduleViewModals(props: ScheduleViewModalsProps) {
  const {
    quickBookingOpen,
    setQuickBookingOpen,
    quickBookingSlot,
    setQuickBookingSlot,
    modalAppointment,
    setModalAppointment,
    doctorFreeSlotsOpen,
    setDoctorFreeSlotsOpen,
    preventiveInspectionOpen,
    setPreventiveInspectionOpen,
    isRosterModalOpen,
    setIsRosterModalOpen,
    isQuickAddChairOpen,
    setIsQuickAddChairOpen,
    isCalendarSyncModalOpen,
    setIsCalendarSyncModalOpen,
    isPatientSearchOpen,
    setIsPatientSearchOpen,
    isTomorrowRemindersOpen,
    setIsTomorrowRemindersOpen,
    waitlistOpen,
    setWaitlistOpen,
    waitlistQuickFillSlot,
    setWaitlistQuickFillSlot,
    editingChairData,
    setEditingChairData,
    dashboard,
    auth,
    loadDashboard,
    logicContext,
    scheduleDoctorFilterId,
    scheduleChairFilterId,
    scheduleDateFilter,
    clinicToday,
    todayScheduleDate,
    computedChairDoctorAssignments,
    savedDoctorShifts,
    rosterStaffList,
    rosterCabinets,
    rosterAppointments,
    scheduleDoctors,
    currentDateKey,
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
    handleSaveDoctorShifts,
    handleAddChairFromSchedule,
    showToast,
  } = props;

  // Координация поверхностей: взаимное исключение между шторками и модалками (Мандаты 8b, 8e)
  // 1. AppointmentModal (Primary Modal)
  React.useEffect(() => {
    if (modalAppointment !== null) {
      useUiSurfaceStore.getState().openPrimaryModal("appointment_modal", { appointmentId: modalAppointment.id });
      if (quickBookingOpen) setQuickBookingOpen(false);
      if (waitlistOpen) setWaitlistOpen(false);
      if (waitlistQuickFillSlot !== null) setWaitlistQuickFillSlot(null);
    } else if (useUiSurfaceStore.getState().primaryModal?.id === "appointment_modal") {
      useUiSurfaceStore.getState().closePrimaryModal("appointment_modal");
    }
  }, [modalAppointment, quickBookingOpen, setQuickBookingOpen, waitlistOpen, setWaitlistOpen, waitlistQuickFillSlot, setWaitlistQuickFillSlot]);

  // 2. DoctorFreeSlotsModal
  React.useEffect(() => {
    if (doctorFreeSlotsOpen) {
      useUiSurfaceStore.getState().openPrimaryModal("doctor_free_slots");
      if (quickBookingOpen) setQuickBookingOpen(false);
      if (waitlistOpen) setWaitlistOpen(false);
      if (waitlistQuickFillSlot !== null) setWaitlistQuickFillSlot(null);
    } else if (useUiSurfaceStore.getState().primaryModal?.id === "doctor_free_slots") {
      useUiSurfaceStore.getState().closePrimaryModal("doctor_free_slots");
    }
  }, [doctorFreeSlotsOpen, quickBookingOpen, setQuickBookingOpen, waitlistOpen, setWaitlistOpen, waitlistQuickFillSlot, setWaitlistQuickFillSlot]);

  // 3. PatientSearchModal
  React.useEffect(() => {
    if (isPatientSearchOpen) {
      useUiSurfaceStore.getState().openPrimaryModal("patient_search");
      if (quickBookingOpen) setQuickBookingOpen(false);
      if (waitlistOpen) setWaitlistOpen(false);
      if (waitlistQuickFillSlot !== null) setWaitlistQuickFillSlot(null);
    } else if (useUiSurfaceStore.getState().primaryModal?.id === "patient_search") {
      useUiSurfaceStore.getState().closePrimaryModal("patient_search");
    }
  }, [isPatientSearchOpen, quickBookingOpen, setQuickBookingOpen, waitlistOpen, setWaitlistOpen, waitlistQuickFillSlot, setWaitlistQuickFillSlot]);

  // 4. PreventiveInspectionModal
  React.useEffect(() => {
    if (preventiveInspectionOpen) {
      useUiSurfaceStore.getState().openPrimaryModal("preventive_inspection");
      if (quickBookingOpen) setQuickBookingOpen(false);
      if (waitlistOpen) setWaitlistOpen(false);
      if (waitlistQuickFillSlot !== null) setWaitlistQuickFillSlot(null);
    } else if (useUiSurfaceStore.getState().primaryModal?.id === "preventive_inspection") {
      useUiSurfaceStore.getState().closePrimaryModal("preventive_inspection");
    }
  }, [preventiveInspectionOpen, quickBookingOpen, setQuickBookingOpen, waitlistOpen, setWaitlistOpen, waitlistQuickFillSlot, setWaitlistQuickFillSlot]);

  // 5. Other dialogs
  React.useEffect(() => {
    if (isRosterModalOpen) {
      useUiSurfaceStore.getState().openPrimaryModal("roster_modal");
      if (quickBookingOpen) setQuickBookingOpen(false);
      if (waitlistOpen) setWaitlistOpen(false);
    } else if (useUiSurfaceStore.getState().primaryModal?.id === "roster_modal") {
      useUiSurfaceStore.getState().closePrimaryModal("roster_modal");
    }
  }, [isRosterModalOpen, quickBookingOpen, setQuickBookingOpen, waitlistOpen, setWaitlistOpen]);

  React.useEffect(() => {
    if (isQuickAddChairOpen) {
      useUiSurfaceStore.getState().openPrimaryModal("quick_add_chair");
      if (quickBookingOpen) setQuickBookingOpen(false);
      if (waitlistOpen) setWaitlistOpen(false);
    } else if (useUiSurfaceStore.getState().primaryModal?.id === "quick_add_chair") {
      useUiSurfaceStore.getState().closePrimaryModal("quick_add_chair");
    }
  }, [isQuickAddChairOpen, quickBookingOpen, setQuickBookingOpen, waitlistOpen, setWaitlistOpen]);

  React.useEffect(() => {
    if (isCalendarSyncModalOpen) {
      useUiSurfaceStore.getState().openPrimaryModal("calendar_sync");
      if (quickBookingOpen) setQuickBookingOpen(false);
      if (waitlistOpen) setWaitlistOpen(false);
    } else if (useUiSurfaceStore.getState().primaryModal?.id === "calendar_sync") {
      useUiSurfaceStore.getState().closePrimaryModal("calendar_sync");
    }
  }, [isCalendarSyncModalOpen, quickBookingOpen, setQuickBookingOpen, waitlistOpen, setWaitlistOpen]);

  React.useEffect(() => {
    if (isTomorrowRemindersOpen) {
      useUiSurfaceStore.getState().openPrimaryModal("tomorrow_reminders");
      if (quickBookingOpen) setQuickBookingOpen(false);
      if (waitlistOpen) setWaitlistOpen(false);
    } else if (useUiSurfaceStore.getState().primaryModal?.id === "tomorrow_reminders") {
      useUiSurfaceStore.getState().closePrimaryModal("tomorrow_reminders");
    }
  }, [isTomorrowRemindersOpen, quickBookingOpen, setQuickBookingOpen, waitlistOpen, setWaitlistOpen]);

  // 6. Drawers coordination: QuickBookingDrawer vs WaitlistDrawer
  React.useEffect(() => {
    if (quickBookingOpen) {
      useUiSurfaceStore.getState().openDrawer("quick_booking");
      if (waitlistOpen) setWaitlistOpen(false);
      if (waitlistQuickFillSlot !== null) setWaitlistQuickFillSlot(null);
    } else if (useUiSurfaceStore.getState().activeDrawer === "quick_booking") {
      useUiSurfaceStore.getState().closeDrawer("quick_booking");
    }
  }, [quickBookingOpen, waitlistOpen, setWaitlistOpen, waitlistQuickFillSlot, setWaitlistQuickFillSlot]);

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
        if (state.activeDrawer !== "waitlist" && (waitlistOpen || waitlistQuickFillSlot !== null)) {
          setWaitlistOpen(false);
          setWaitlistQuickFillSlot(null);
        }
      }
    });
    return unsub;
  }, [quickBookingOpen, setQuickBookingOpen, waitlistOpen, setWaitlistOpen, waitlistQuickFillSlot, setWaitlistQuickFillSlot]);

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
        dashboard={dashboard as any}
        auth={auth}
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
          for (const [key, value] of Object.entries(draft)) {
            updateAppointmentScheduleDraft(appointmentId, key, value);
          }
          return await saveAppointmentSchedule(appointmentId);
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
          useUiSurfaceStore.getState().transitionModalToDrawer("doctor_free_slots", "quick_booking");
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
            useUiSurfaceStore.getState().closePrimaryModal("preventive_inspection");
          }}
          dashboard={dashboard as any}
          onBookPatient={(candidate) => {
            setPreventiveInspectionOpen(false);
            useUiSurfaceStore.getState().transitionModalToDrawer("preventive_inspection", "quick_booking");
            if (waitlistOpen) setWaitlistOpen(false);
            if (waitlistQuickFillSlot) setWaitlistQuickFillSlot(null);
            setQuickBookingSlot({
              patientId: candidate.patientId,
              patientName: candidate.patientFullName,
              doctorUserId: candidate.lastDoctorId || scheduleDoctorFilterId || null,
              doctorName: candidate.lastDoctorName,
              reason: candidate.recommendedProcedureName || candidate.categoryTitle,
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
      <DoctorShiftRosterModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        staffList={rosterStaffList}
        cabinets={rosterCabinets}
        initialShifts={
          savedDoctorShifts.length > 0 ? savedDoctorShifts : undefined
        }
        appointments={rosterAppointments}
        clinicName={
          dashboard?.clinicSettings?.profile?.clinicName ||
          dashboard?.clinicName
        }
        onSave={handleSaveDoctorShifts}
        currentDate={currentDateKey}
      />
      <QuickAddChairModal
        isOpen={isQuickAddChairOpen}
        onClose={() => {
          setIsQuickAddChairOpen(false);
          setEditingChairData(null);
        }}
        onAddChair={handleAddChairFromSchedule}
        initialData={editingChairData}
        onUpdateChair={handleAddChairFromSchedule}
        existingChairsCount={dashboard?.clinicSettings?.chairs?.length || 0}
        branches={(dashboard?.clinicSettings as any)?.branches}
        doctors={scheduleDoctors}
      />
      <DoctorCalendarSyncModal
        isOpen={isCalendarSyncModalOpen}
        onClose={() => setIsCalendarSyncModalOpen(false)}
        dashboard={dashboard as any}
        initialDoctorId={scheduleDoctorFilterId}
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
          useUiSurfaceStore.getState().transitionModalToDrawer("patient_search", "quick_booking");
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
          useUiSurfaceStore.getState().transitionModalToDrawer("patient_search", "quick_booking");
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
    </>
  );
}
