import React from "react";
import type { Appointment, Dashboard } from "@dental/shared";
import { QuickBookingDrawer, type QuickBookingSlotInfo } from "../QuickBookingDrawer";
import { AppointmentModal } from "../AppointmentModal";
import { DoctorFreeSlotsModal } from "../DoctorFreeSlotsModal";
import { SlotConflictModal } from "../SlotConflictModal";
import { UrgentScheduleRequestsWidget } from "../UrgentScheduleRequestsWidget";
import { WaitlistDrawer } from "../WaitlistDrawer";
import { WaitlistQuickFillModal, type TargetSlotInfo } from "../WaitlistQuickFillModal";
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

export interface ScheduleViewModalsProps {
  quickBookingOpen: boolean;
  setQuickBookingOpen: (open: boolean) => void;
  quickBookingSlot: QuickBookingSlotInfo | null;
  setQuickBookingSlot: (slot: QuickBookingSlotInfo | null) => void;
  modalAppointment: Appointment | null;
  setModalAppointment: (app: Appointment | null) => void;
  doctorFreeSlotsOpen: boolean;
  setDoctorFreeSlotsOpen: (open: boolean) => void;
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

  return (
    <>
      <QuickBookingDrawer
        isOpen={quickBookingOpen}
        onClose={() => setQuickBookingOpen(false)}
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
        onClose={() => setModalAppointment(null)}
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
        onClose={() => setDoctorFreeSlotsOpen(false)}
        dashboard={dashboard as any}
        initialDoctorId={scheduleDoctorFilterId}
        onSelectSlot={(slot) => {
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
              reason: `CITO! ${request.requestType || "Острая боль"}`,
              isCitoEmergency: true,
            });
            setQuickBookingOpen(true);
            showToast(
              `Экстренная запись CITO для «${request.patientName}»: проверьте время и подтвердите запись в 1 клик`,
              "info",
              4000,
            );
          }}
        />
      </div>

      <WaitlistDrawer
        isOpen={waitlistOpen}
        onClose={() => {
          setWaitlistOpen(false);
          setWaitlistQuickFillSlot(null);
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
      {/* Canonical Waitlist Drawer (SSOT) handles targetSlot automatically; WaitlistQuickFillModal is reserved for standalone fallback */}
      <WaitlistQuickFillModal
        isOpen={waitlistQuickFillSlot !== null && !waitlistOpen}
        onClose={() => setWaitlistQuickFillSlot(null)}
        targetSlot={waitlistQuickFillSlot}
        updateNewAppointmentDraft={updateNewAppointmentDraft}
        focusNewAppointmentEditor={focusNewAppointmentEditor}
        dashboard={dashboard}
        auth={auth}
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
        onClose={() => setIsPatientSearchOpen(false)}
        onSelectPatientForBooking={(patient) => {
          setIsPatientSearchOpen(false);
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
          usePatientStore.getState().setSelectedPatientId(patientId);
          useAppStore.getState().setCurrentView("patients");
        }}
        onQuickBookNewPatient={(patient) => {
          setIsPatientSearchOpen(false);
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
