import React from "react";
import type { Appointment, Dashboard } from "@dental/shared";
import { ChairScheduleView } from "../ChairScheduleView";
import { ScheduleGrid } from "../ScheduleGrid";
import { ScheduleTimeline } from "../ScheduleTimeline";
import type { QuickAddChairData } from "../QuickAddChairModal";
import type { QuickAddDoctorData } from "../QuickAddDoctorModal";
import type { TargetSlotInfo } from "../WaitlistDrawer";
import type { QuickBookingSlotInfo } from "../QuickBookingDrawer";
import type { AppointmentScheduleDraft } from "./scheduleViewTypes";
import { useIsMobile } from "../../../hooks/useIsMobile";
import { ScheduleMobileAgendaView } from "../ScheduleMobileAgendaView";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";

export interface ScheduleViewBodyProps {
  scheduleViewMode: "timeline" | "grid" | "chairs";
  dashboard: Dashboard | null | undefined;
  scheduleDateFilter: string;
  clinicToday: string;
  todayScheduleDate: () => string;
  scheduleGridStep: 15 | 30 | 60;
  setScheduleGridStep: (step: 15 | 30 | 60) => void;
  computedChairDoctorAssignments: any;
  savedDoctorShifts: any[];
  handleAssignChairDoctor: any;
  handleAddChairFromSchedule: (chairData: QuickAddChairData) => Promise<void>;
  handleAddDoctorFromSchedule: (doctorData: QuickAddDoctorData) => Promise<any>;
  handleEditChairFromSchedule: (chairData: QuickAddChairData) => void;
  handleOpenWaitlistForSlot: (slot: TargetSlotInfo) => void;
  setIsRosterModalOpen: (open: boolean) => void;
  setScheduleChairFilterId: (id: string | null) => void;
  scheduleChairFilterId: string | null;
  scheduleDoctorFilterId: string | null;
  setQuickBookingSlot: (slot: QuickBookingSlotInfo | null) => void;
  setQuickBookingOpen: (open: boolean) => void;
  setModalAppointment: (app: Appointment | null) => void;
  updateAppointmentScheduleDraft: (id: string, key: any, val: any) => void;
  saveAppointmentSchedule: (id: string, opts?: any) => Promise<boolean>;
  patientName: (patients: any[], id: string | null) => string;
  formatTime: (iso: string) => string;
  toDateTimeLocalValue: (iso: string) => string;
  fromDateTimeLocalValue: (val: string) => string;
  appointmentLabels: Record<string, string>;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", duration?: number) => void;
  setEditingChairData: (data: QuickAddChairData | null) => void;
  setIsQuickAddChairOpen: (open: boolean) => void;
  visibleDayGroups: any[];
  visibleScheduleSuggestions: any[];
  appointmentReadinessById: Map<string, any>;
  appointmentScheduleDrafts: Record<string, any>;
  appointmentScheduleSaveStates: Record<string, any>;
  appointmentScheduleErrors: Record<string, any>;
  appointmentScheduleDirtyIds: Set<string>;
  editingAppointmentId: string | null;
  appointmentScheduleDraftFromAppointment: (app: Appointment) => AppointmentScheduleDraft;
  appointmentDraftMissingSteps: (draft: AppointmentScheduleDraft) => any[];
  activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
  openScheduleSuggestion: (section: string) => void;
  openAppointmentEditor: (appointment: Appointment) => void;
  repeatAppointment: (app: Appointment) => void;
  copyAppointmentToBuffer: (app: Appointment) => Promise<void>;
  closeAppointmentEditor: () => void;
  normalizedAppointmentStatus: (val: any) => any;
  useManualSelects: boolean;
  stepScheduleDay: (delta: number) => void;
  activeScheduleFilterCount: number;
  resetScheduleFilters: () => void;
  setScheduleDateFilter: (val: string) => void;
}

export function ScheduleViewBody(props: ScheduleViewBodyProps) {
  const {
    scheduleViewMode,
    dashboard,
    scheduleDateFilter,
    clinicToday,
    todayScheduleDate,
    scheduleGridStep,
    setScheduleGridStep,
    computedChairDoctorAssignments,
    savedDoctorShifts,
    handleAssignChairDoctor,
    handleAddChairFromSchedule,
    handleAddDoctorFromSchedule,
    handleEditChairFromSchedule,
    handleOpenWaitlistForSlot,
    setIsRosterModalOpen,
    setScheduleChairFilterId,
    scheduleChairFilterId,
    scheduleDoctorFilterId,
    setQuickBookingSlot,
    setQuickBookingOpen,
    setModalAppointment,
    updateAppointmentScheduleDraft,
    saveAppointmentSchedule,
    patientName,
    formatTime,
    toDateTimeLocalValue,
    fromDateTimeLocalValue,
    appointmentLabels,
    showToast,
    setEditingChairData,
    setIsQuickAddChairOpen,
    visibleDayGroups,
    visibleScheduleSuggestions,
    appointmentReadinessById,
    appointmentScheduleDrafts,
    appointmentScheduleSaveStates,
    appointmentScheduleErrors,
    appointmentScheduleDirtyIds,
    editingAppointmentId,
    appointmentScheduleDraftFromAppointment,
    appointmentDraftMissingSteps,
    activeVisitLockedAppointmentStatuses,
    openScheduleSuggestion,
    openAppointmentEditor,
    repeatAppointment,
    copyAppointmentToBuffer,
    closeAppointmentEditor,
    normalizedAppointmentStatus,
    useManualSelects,
    stepScheduleDay,
    activeScheduleFilterCount,
    resetScheduleFilters,
    setScheduleDateFilter,
  } = props;

  const isMobile = useIsMobile(768);

  const handleOpenVisit = (appointment?: Appointment) => {
    if (appointment?.patientId) {
      usePatientStore.getState().setSelectedPatientId(appointment.patientId);
    }
    if (typeof window !== "undefined") {
      window.location.hash = "#visit";
    }
    useAppStore.getState().setCurrentView("visit");
  };

  if (isMobile && dashboard) {
    return (
      <ScheduleMobileAgendaView
        dashboard={dashboard}
        dateKey={scheduleDateFilter || clinicToday || todayScheduleDate()}
        appointments={dashboard?.appointments ?? []}
        onDateChange={setScheduleDateFilter}
        onSlotClick={(slot) => {
          setQuickBookingSlot(slot);
          setQuickBookingOpen(true);
        }}
        onAppointmentClick={(appointment) => {
          setModalAppointment(appointment);
        }}
        onQuickStatusChange={async (appointmentId, status) => {
          updateAppointmentScheduleDraft(appointmentId, "status", status);
          const success = await saveAppointmentSchedule(appointmentId);
          if (success) {
            const p = dashboard?.appointments?.find(
              (a) => a.id === appointmentId,
            );
            const pName =
              p && patientName
                ? patientName(dashboard?.patients ?? [], p.patientId)
                : "Пациент";
            const label = appointmentLabels[status] || status;
            showToast(`«${pName}» — статус «${label}»`, "success", 3000);
          }
        }}
        onAppointmentMove={async (appointmentId, updates) => {
          if (updates.startsAt)
            updateAppointmentScheduleDraft(
              appointmentId,
              "startsAt",
              updates.startsAt,
            );
          if (updates.endsAt)
            updateAppointmentScheduleDraft(
              appointmentId,
              "endsAt",
              updates.endsAt,
            );
          if (updates.chairId !== undefined)
            updateAppointmentScheduleDraft(
              appointmentId,
              "chairId",
              updates.chairId,
            );
          if (updates.doctorUserId !== undefined)
            updateAppointmentScheduleDraft(
              appointmentId,
              "doctorUserId",
              updates.doctorUserId,
            );
          return await saveAppointmentSchedule(appointmentId, {
            allowOverbooking: updates.allowOverbooking ?? true,
            allowEmergencyOverride: true,
          });
        }}
        patientName={patientName}
        formatTime={formatTime}
        toDateTimeLocalValue={toDateTimeLocalValue}
        appointmentLabels={appointmentLabels}
        selectedChairId={scheduleChairFilterId}
        onSelectChair={setScheduleChairFilterId}
        selectedDoctorId={scheduleDoctorFilterId}
        chairDoctorAssignments={
          savedDoctorShifts.length > 0 ||
          Object.keys(computedChairDoctorAssignments).length > 0
            ? computedChairDoctorAssignments
            : undefined
        }
        onQuickBooking={() => {
          setQuickBookingSlot({
            dateKey: scheduleDateFilter || clinicToday || todayScheduleDate(),
            doctorUserId: scheduleDoctorFilterId || null,
            chairId: scheduleChairFilterId || null,
            durationMinutes: 30,
          });
          setQuickBookingOpen(true);
        }}
        timezone={dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow"}
      />
    );
  }

  if (scheduleViewMode === "chairs") {
    if (!dashboard) return null;
    return (
      <ChairScheduleView
        hideToolbar={true}
        gridStepMinutes={scheduleGridStep}
        onGridStepChange={setScheduleGridStep}
        dashboard={dashboard}
        dateKey={scheduleDateFilter || clinicToday || todayScheduleDate()}
        appointments={dashboard?.appointments ?? []}
        chairDoctorAssignments={
          savedDoctorShifts.length > 0 ||
          Object.keys(computedChairDoctorAssignments).length > 0
            ? computedChairDoctorAssignments
            : undefined
        }
        onAssignChairDoctor={handleAssignChairDoctor}
        onAddChair={handleAddChairFromSchedule}
        onAddDoctor={handleAddDoctorFromSchedule}
        onOpenRosterModal={() => setIsRosterModalOpen(true)}
        onSelectChair={(chairId) => setScheduleChairFilterId(chairId)}
        onSlotClick={(slot) => {
          setQuickBookingSlot(slot);
          setQuickBookingOpen(true);
        }}
        onAppointmentClick={(appointment) => {
          setModalAppointment(appointment);
        }}
        onAppointmentMove={async (appointmentId, updates) => {
          if (updates.startsAt)
            updateAppointmentScheduleDraft(
              appointmentId,
              "startsAt",
              updates.startsAt,
            );
          if (updates.endsAt)
            updateAppointmentScheduleDraft(
              appointmentId,
              "endsAt",
              updates.endsAt,
            );
          if (updates.chairId !== undefined)
            updateAppointmentScheduleDraft(
              appointmentId,
              "chairId",
              updates.chairId,
            );
          if (updates.doctorUserId !== undefined)
            updateAppointmentScheduleDraft(
              appointmentId,
              "doctorUserId",
              updates.doctorUserId,
            );
          return await saveAppointmentSchedule(appointmentId, {
            allowOverbooking: updates.allowOverbooking ?? true,
            allowEmergencyOverride: true,
          });
        }}
        onQuickStatusChange={async (appointmentId, status) => {
          updateAppointmentScheduleDraft(appointmentId, "status", status);
          const success = await saveAppointmentSchedule(appointmentId);
          if (success) {
            const p = dashboard?.appointments?.find(
              (a) => a.id === appointmentId,
            );
            const pName =
              p && patientName
                ? patientName(dashboard?.patients ?? [], p.patientId)
                : "Пациент";
            const label = appointmentLabels[status] || status;
            showToast(`«${pName}» — статус «${label}»`, "success", 3000);
          }
        }}
        patientName={patientName}
        formatTime={formatTime}
        toDateTimeLocalValue={toDateTimeLocalValue}
        appointmentLabels={appointmentLabels}
        selectedChairId={scheduleChairFilterId}
        selectedDoctorId={scheduleDoctorFilterId}
      />
    );
  }

  if (scheduleViewMode === "grid") {
    return (
      <ScheduleGrid
        dashboard={dashboard as any}
        hideInlineAddChair={true}
        hideToolbar={true}
        gridStepMinutes={scheduleGridStep}
        onGridStepChange={setScheduleGridStep}
        dateKey={scheduleDateFilter || clinicToday || todayScheduleDate()}
        appointments={dashboard?.appointments ?? []}
        onSlotClick={(slot) => {
          setQuickBookingSlot(slot);
          setQuickBookingOpen(true);
        }}
        onAppointmentClick={(appointment) => {
          setModalAppointment(appointment);
        }}
        onAppointmentMove={async (appointmentId, updates) => {
          if (updates.startsAt)
            updateAppointmentScheduleDraft(
              appointmentId,
              "startsAt",
              updates.startsAt,
            );
          if (updates.endsAt)
            updateAppointmentScheduleDraft(
              appointmentId,
              "endsAt",
              updates.endsAt,
            );
          if (updates.chairId !== undefined)
            updateAppointmentScheduleDraft(
              appointmentId,
              "chairId",
              updates.chairId,
            );
          if (updates.doctorUserId !== undefined)
            updateAppointmentScheduleDraft(
              appointmentId,
              "doctorUserId",
              updates.doctorUserId,
            );
          return await saveAppointmentSchedule(appointmentId, {
            allowOverbooking: updates.allowOverbooking ?? true,
            allowEmergencyOverride: true,
          });
        }}
        onQuickStatusChange={async (appointmentId, status) => {
          updateAppointmentScheduleDraft(appointmentId, "status", status);
          const success = await saveAppointmentSchedule(appointmentId);
          if (success) {
            const p = dashboard?.appointments?.find(
              (a) => a.id === appointmentId,
            );
            const pName =
              p && patientName
                ? patientName(dashboard?.patients ?? [], p.patientId)
                : "Пациент";
            const label = appointmentLabels[status] || status;
            showToast(`«${pName}» — статус «${label}»`, "success", 3000);
          }
        }}
        patientName={patientName}
        formatTime={formatTime}
        toDateTimeLocalValue={toDateTimeLocalValue}
        appointmentLabels={appointmentLabels}
        selectedChairId={scheduleChairFilterId}
        selectedDoctorId={scheduleDoctorFilterId}
        chairDoctorAssignments={
          savedDoctorShifts.length > 0 ||
          Object.keys(computedChairDoctorAssignments).length > 0
            ? computedChairDoctorAssignments
            : undefined
        }
        onAssignChairDoctor={handleAssignChairDoctor}
        onOpenAddChair={() => {
          setEditingChairData(null);
          setIsQuickAddChairOpen(true);
        }}
        onAddChair={handleAddChairFromSchedule}
        onEditChair={handleEditChairFromSchedule}
        onAddDoctor={handleAddDoctorFromSchedule}
        onOpenWaitlistForSlot={handleOpenWaitlistForSlot}
      />
    );
  }

  return (
    <ScheduleTimeline
      visibleDayGroups={visibleDayGroups}
      dashboard={dashboard as any}
      visibleScheduleSuggestions={visibleScheduleSuggestions}
      appointmentReadinessById={appointmentReadinessById}
      appointmentLabels={appointmentLabels}
      appointmentScheduleDrafts={appointmentScheduleDrafts}
      appointmentScheduleSaveStates={appointmentScheduleSaveStates}
      appointmentScheduleErrors={appointmentScheduleErrors}
      appointmentScheduleDirtyIds={appointmentScheduleDirtyIds}
      editingAppointmentId={editingAppointmentId}
      appointmentDraftFromAppointment={appointmentScheduleDraftFromAppointment}
      appointmentDraftMissingSteps={appointmentDraftMissingSteps}
      activeVisitLockedAppointmentStatuses={activeVisitLockedAppointmentStatuses}
      openScheduleSuggestion={openScheduleSuggestion}
      formatTime={formatTime}
      patientName={patientName}
      openAppointmentEditor={openAppointmentEditor}
      repeatAppointment={repeatAppointment}
      copyAppointmentToBuffer={copyAppointmentToBuffer}
      closeAppointmentEditor={closeAppointmentEditor}
      updateAppointmentScheduleDraft={updateAppointmentScheduleDraft as any}
      saveAppointmentSchedule={saveAppointmentSchedule}
      normalizedAppointmentStatus={normalizedAppointmentStatus}
      toDateTimeLocalValue={toDateTimeLocalValue}
      fromDateTimeLocalValue={fromDateTimeLocalValue}
      useManualSelects={useManualSelects}
      onEmptySlotClick={(slot) => {
        setQuickBookingSlot(slot);
        setQuickBookingOpen(true);
      }}
      onNewAppointmentClick={() => {
        setQuickBookingSlot({
          dateKey: scheduleDateFilter || clinicToday || todayScheduleDate(),
          doctorUserId: scheduleDoctorFilterId || null,
          chairId: scheduleChairFilterId || null,
          durationMinutes: 30,
        });
        setQuickBookingOpen(true);
      }}
      stepScheduleDay={stepScheduleDay}
      scheduleDateFilter={scheduleDateFilter}
      clinicToday={clinicToday}
      activeScheduleFilterCount={activeScheduleFilterCount}
      resetScheduleFilters={resetScheduleFilters}
      setScheduleDateFilter={setScheduleDateFilter}
      todayScheduleDate={todayScheduleDate}
      onOpenVisit={handleOpenVisit}
    />
  );
}
