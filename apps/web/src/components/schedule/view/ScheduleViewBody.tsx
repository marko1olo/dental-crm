import React, { useRef, useCallback } from "react";
import type {
  Appointment,
  AppointmentReadiness,
  Dashboard,
  ScheduleSuggestion,
} from "@dental/shared";
import { ScheduleGrid } from "../ScheduleGrid";
import { ScheduleTimeline } from "../ScheduleTimeline";
import type { QuickAddChairData } from "../QuickAddChairModal";
import type { QuickAddDoctorData } from "../QuickAddDoctorModal";
import type { TargetSlotInfo } from "../waitlist/WaitlistDrawer";
import type { QuickBookingSlotInfo } from "../QuickBookingDrawer";
import type { ChairDoctorShiftAssignment } from "../grid/gridTypes";
import type { DoctorShift } from "../roster/DoctorShiftRosterModal";
import type { ScheduleDayGroup } from "../scheduleDayGrouping";
import type {
  AppointmentScheduleDraft,
  AppointmentScheduleSaveState,
} from "./scheduleViewTypes";
import { useIsMobile } from "../../../hooks/useIsMobile";
import { ScheduleMobileAgendaView } from "../mobile/ScheduleMobileAgendaView";
import { openVisitWithBackendSync } from "../appointmentCardActions/visitSyncHelper";

export interface ScheduleViewBodyProps {
  scheduleViewMode: "timeline" | "grid" | "chairs";
  dashboard: Dashboard | null | undefined;
  scheduleDateFilter: string;
  clinicToday: string;
  todayScheduleDate: () => string;
  scheduleGridStep: 15 | 30 | 60;
  setScheduleGridStep: (step: 15 | 30 | 60) => void;
  computedChairDoctorAssignments: Record<string, ChairDoctorShiftAssignment>;
  savedDoctorShifts: DoctorShift[];
  handleAssignChairDoctor?: ((chairId: string, assignment: ChairDoctorShiftAssignment | null) => void) | undefined;
  handleAddChairFromSchedule: (chairData: QuickAddChairData) => Promise<void>;
  handleAddDoctorFromSchedule: (doctorData: QuickAddDoctorData) => Promise<unknown>;
  handleEditChairFromSchedule: (chairData: QuickAddChairData) => void;
  handleOpenWaitlistForSlot: (slot: TargetSlotInfo) => void;
  setIsRosterModalOpen: (open: boolean) => void;
  setScheduleChairFilterId: (id: string | null) => void;
  scheduleChairFilterId: string | null;
  scheduleDoctorFilterId: string | null;
  setQuickBookingSlot: (slot: QuickBookingSlotInfo | null) => void;
  setQuickBookingOpen: (open: boolean) => void;
  setModalAppointment: (app: Appointment | null) => void;
  updateAppointmentScheduleDraft: <K extends keyof AppointmentScheduleDraft>(
    id: string,
    key: K,
    val: AppointmentScheduleDraft[K],
  ) => void;
  saveAppointmentSchedule: (
    id: string,
    opts?: {
      closeEditorOnSave?: boolean;
      allowOverbooking?: boolean;
      allowEmergencyOverride?: boolean;
    },
  ) => Promise<boolean>;
  patientName: (patients: Dashboard["patients"], id: string | null) => string;
  formatTime: (iso: string) => string;
  toDateTimeLocalValue: (iso: string, timeZone?: string | null) => string;
  fromDateTimeLocalValue: (val: string, timeZone?: string | null) => string;
  appointmentLabels: Record<Appointment["status"], string>;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", duration?: number) => void;
  setEditingChairData: (data: QuickAddChairData | null) => void;
  setIsQuickAddChairOpen: (open: boolean) => void;
  visibleDayGroups: ScheduleDayGroup[];
  visibleScheduleSuggestions: ScheduleSuggestion[];
  appointmentReadinessById: Map<string, AppointmentReadiness>;
  appointmentScheduleDrafts: Record<string, AppointmentScheduleDraft>;
  appointmentScheduleSaveStates: Record<string, AppointmentScheduleSaveState>;
  appointmentScheduleErrors: Record<string, string | null>;
  appointmentScheduleDirtyIds: Set<string>;
  editingAppointmentId: string | null;
  appointmentScheduleDraftFromAppointment: (app: Appointment) => AppointmentScheduleDraft;
  appointmentDraftMissingSteps: (draft: AppointmentScheduleDraft) => string[];
  activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
  openScheduleSuggestion: (section: string) => void;
  openAppointmentEditor: (appointment: Appointment) => void;
  repeatAppointment: (app: Appointment) => void;
  copyAppointmentToBuffer: (app: Appointment) => void | Promise<void>;
  closeAppointmentEditor: (appointmentId: string) => void;
  normalizedAppointmentStatus: (val: unknown, fallback?: Appointment["status"]) => Appointment["status"];
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
  const inFlightStatusChangeRef = useRef<Record<string, boolean>>({});
  const inFlightMoveRef = useRef<Record<string, boolean>>({});

  const handleOpenVisit = (appointment?: Appointment) => {
    if (appointment) {
      void openVisitWithBackendSync(appointment, null);
    } else {
      if (typeof window !== "undefined") {
        window.location.hash = "#visit";
      }
    }
  };

  const handleQuickStatusChangeWithWaitlistAutoFill = async (
    appointmentId: string,
    status: Appointment["status"],
  ) => {
    if (inFlightStatusChangeRef.current[appointmentId]) return;
    inFlightStatusChangeRef.current[appointmentId] = true;
    try {
      updateAppointmentScheduleDraft(appointmentId, "status", status);
      const success = await saveAppointmentSchedule(appointmentId);
      if (success) {
        const p = dashboard?.appointments?.find((a) => a.id === appointmentId);
        if (status === "in_treatment" && p) {
          void openVisitWithBackendSync(p, null);
        }
        const pName =
          p && patientName
            ? patientName(dashboard?.patients ?? [], p.patientId)
            : "Пациент";
        const label = appointmentLabels[status] || status;
        showToast(`«${pName}» — статус «${label}»`, "success", 3000);

        if ((status === "cancelled" || status === "no_show") && p && p.startsAt) {
          const isFutureOrToday =
            new Date(p.startsAt).getTime() >= Date.now() - 3600000;
          if (isFutureOrToday && typeof handleOpenWaitlistForSlot === "function") {
            handleOpenWaitlistForSlot({
              appointmentId: p.id,
              startsAt: p.startsAt,
              endsAt: p.endsAt,
              doctorUserId: p.doctorUserId ?? null,
              chairId: p.chairId ?? null,
              patientId: p.patientId ?? null,
              patientName: pName,
              reason: p.reason ?? null,
              freedBecause:
                status === "cancelled" ? "Отмена визита" : "Неявка пациента",
            });
          }
        }
      }
    } finally {
      inFlightStatusChangeRef.current[appointmentId] = false;
    }
  };

  const handleAppointmentMove = useCallback(
    async (
      appointmentId: string,
      updates: {
        startsAt?: string;
        endsAt?: string;
        chairId?: string;
        doctorUserId?: string;
        allowOverbooking?: boolean;
      },
    ) => {
      if (inFlightMoveRef.current[appointmentId]) return false;
      inFlightMoveRef.current[appointmentId] = true;
      try {
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
      } finally {
        inFlightMoveRef.current[appointmentId] = false;
      }
    },
    [updateAppointmentScheduleDraft, saveAppointmentSchedule],
  );

  const handleOpenAppointmentInQuickBooking = (appointment: Appointment) => {
    setQuickBookingSlot({
      editingAppointment: appointment,
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorUserId: appointment.doctorUserId,
      chairId: appointment.chairId,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      reason: appointment.reason || undefined,
      comment: appointment.comment || undefined,
      status: appointment.status,
    });
    setQuickBookingOpen(true);
  };

  if (!dashboard) {
    return (
      <div
        className="p-8 flex flex-col items-center justify-center gap-3 text-center min-h-[350px]"
        data-testid="schedule-view-loading"
      >
        <div className="w-8 h-8 rounded-full border-2 border-[var(--teal,#0d9488)] border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-[var(--muted)]">
          Подготовка расписания...
        </p>
      </div>
    );
  }

  if (isMobile) {
    return (
      <ScheduleMobileAgendaView
        dashboard={dashboard}
        dateKey={scheduleDateFilter || clinicToday || todayScheduleDate()}
        appointments={dashboard.appointments ?? []}
        onDateChange={setScheduleDateFilter}
        onSlotClick={(slot) => {
          setQuickBookingSlot(slot);
          setQuickBookingOpen(true);
        }}
        onAppointmentClick={handleOpenAppointmentInQuickBooking}
        onQuickStatusChange={handleQuickStatusChangeWithWaitlistAutoFill}
        onOpenVisit={handleOpenVisit}
        onAppointmentMove={handleAppointmentMove}
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
        timezone={dashboard.clinicSettings?.profile?.timezone ?? "Europe/Moscow"}
      />
    );
  }

  if (scheduleViewMode === "grid" || (scheduleViewMode as string) === "chairs") {
    return (
      <ScheduleGrid
        dashboard={dashboard}
        hideInlineAddChair={true}
        hideToolbar={true}
        gridStepMinutes={scheduleGridStep}
        onGridStepChange={setScheduleGridStep}
        dateKey={scheduleDateFilter || clinicToday || todayScheduleDate()}
        appointments={dashboard.appointments ?? []}
        onSlotClick={(slot) => {
          setQuickBookingSlot(slot);
          setQuickBookingOpen(true);
        }}
        onAppointmentClick={handleOpenAppointmentInQuickBooking}
        onAppointmentMove={handleAppointmentMove}
        onQuickStatusChange={handleQuickStatusChangeWithWaitlistAutoFill}
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
        onDateChange={setScheduleDateFilter}
      />
    );
  }

  return (
    <ScheduleTimeline
      visibleDayGroups={visibleDayGroups}
      dashboard={dashboard}
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
      openAppointmentEditor={(app) => {
        handleOpenAppointmentInQuickBooking(app);
        openAppointmentEditor(app);
      }}
      repeatAppointment={repeatAppointment}
      copyAppointmentToBuffer={copyAppointmentToBuffer}
      closeAppointmentEditor={closeAppointmentEditor}
      updateAppointmentScheduleDraft={(id, key, val) =>
        updateAppointmentScheduleDraft(
          id,
          key as keyof AppointmentScheduleDraft,
          val as AppointmentScheduleDraft[keyof AppointmentScheduleDraft],
        )
      }
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
