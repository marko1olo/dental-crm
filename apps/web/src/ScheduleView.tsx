import type {
  Appointment, AppointmentReadiness, Dashboard, ScheduleSuggestion, StaffRole,
} from "@dental/shared";
import { ShieldCheck } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { appointmentScheduleMissingFields } from "./AppHelpers";
import { motionSafeScrollIntoView } from "./motionPreference";
import { showToast } from "./components/GlobalToast";
import { NewAppointmentForm } from "./components/schedule/NewAppointmentForm";
import type { QuickBookingSlotInfo } from "./components/schedule/QuickBookingDrawer";
import type { QuickAddChairData } from "./components/schedule/QuickAddChairModal";
import {
  type DayGroupingAppointment, formatDayTitle, groupAppointmentsByClinicDay, shiftDayKey,
} from "./components/schedule/scheduleDayGrouping";
import type { TargetSlotInfo } from "./components/schedule/WaitlistDrawer";
import { useScheduleStore } from "./store/scheduleStore";
import { useSettingsStore } from "./store/settingsStore";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { useScheduleRealtime } from "./hooks/useScheduleRealtime";
import {
  buildChairDoctorAssignmentsFromShifts, buildChairDoctorAssignmentsByDate,
} from "./components/schedule/view/scheduleViewShifts";
import {
  type AppointmentScheduleDraft, type AppointmentScheduleSaveState,
  type TextFieldChangeEvent, type SelectChangeEvent, activeVisitLockedAppointmentStatuses,
} from "./components/schedule/view/scheduleViewTypes";
import { useScheduleRosterData } from "./components/schedule/view/useScheduleRosterData";
import { useScheduleChairDoctorOps } from "./components/schedule/view/useScheduleChairDoctorOps";
import { useScheduleShortcuts } from "./components/schedule/view/useScheduleShortcuts";
import { useScheduleDayQueue } from "./components/schedule/view/useScheduleDayQueue";
import { useScheduleFocus } from "./components/schedule/view/useScheduleFocus";
import { ScheduleDisconnectedState } from "./components/schedule/view/ScheduleDisconnectedState";
import { ScheduleViewToolbar } from "./components/schedule/view/ScheduleViewToolbar";
import { ScheduleViewBody } from "./components/schedule/view/ScheduleViewBody";
import { ScheduleViewModals } from "./components/schedule/view/ScheduleViewModals";
import { findPreventiveInspectionCandidates } from "./components/schedule/doctorFreeSlotsEngine";
import {
  isDemoShowcaseMode,
  getDemoShowcaseAppointments,
  getDemoShowcasePatients,
} from "./lib/demoMode";

// Zero-downtime re-exports of shifts, drafts, and lock contracts
export { buildChairDoctorAssignmentsFromShifts, buildChairDoctorAssignmentsByDate } from "./components/schedule/view/scheduleViewShifts";
export type { AppointmentScheduleDraft, AppointmentScheduleSaveState, TextFieldChangeEvent, SelectChangeEvent } from "./components/schedule/view/scheduleViewTypes";
export { activeVisitLockedAppointmentStatuses } from "./components/schedule/view/scheduleViewTypes";

export type ScheduleViewProps = {
  appointmentLabels: Record<Appointment["status"], string>;
  appointmentReadinessById: Map<string, AppointmentReadiness>;
  appointmentReadinessLabels: Record<AppointmentReadiness["state"], string>;
  appointmentScheduleDraftFromAppointment: (
    appointment: Appointment,
  ) => AppointmentScheduleDraft;
  closeAppointmentEditor: (appointmentId: string) => void;
  createAppointmentFromDraft: (options?: {
    allowOverbooking?: boolean;
    allowEmergencyOverride?: boolean;
  }) => Promise<boolean>;
  dashboard: Dashboard;
  editingAppointmentId: string | null;
  formatTime: (value: string) => string;
  fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
  lockScheduleAdminSession: () => void;
  newAppointmentError: string | null;
  normalizedAppointmentStatus: (
    value: unknown,
    fallback?: Appointment["status"],
  ) => Appointment["status"];
  normalizedAppointmentStatusFilter: (
    value: unknown,
  ) => Appointment["status"] | "all";
  openAppointmentEditor: (appointment: Appointment) => void;
  openScheduleWarning: (
    warning: Dashboard["shiftIntelligence"]["scheduleWarnings"][number],
  ) => void;
  patientName: (
    patients: Dashboard["patients"],
    patientId: string | null,
  ) => string;
  recommendedActionPriorityLabels: Record<
    ScheduleSuggestion["priority"],
    string
  >;
  resetNewAppointmentDraft: () => void;
  saveAppointmentSchedule: (
    appointmentId: string,
    options?: {
      closeEditorOnSave?: boolean;
      allowOverbooking?: boolean;
      allowEmergencyOverride?: boolean;
    },
  ) => Promise<boolean>;

  shiftWarnings: Dashboard["shiftIntelligence"]["scheduleWarnings"];
  sortedAppointments: Appointment[];
  staffRoleLabels: Record<StaffRole, string>;
  scheduleAdminSecretDraft: string;
  scheduleAdminSecretSession: string;
  toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
  unlockScheduleAdminSession: () => void;
  updateAppointmentScheduleDraft: <K extends keyof AppointmentScheduleDraft>(
    appointmentId: string,
    key: K,
    value: AppointmentScheduleDraft[K],
  ) => void;
  updateNewAppointmentDraft: <K extends keyof AppointmentScheduleDraft>(
    key: K,
    value: AppointmentScheduleDraft[K],
  ) => void;
  visibleScheduleSuggestions: ScheduleSuggestion[];
  loadDashboard?: (options?: { adminSecret?: string }) => Promise<void>;
  setDashboard?:
    | React.Dispatch<React.SetStateAction<Dashboard>>
    | ((updater: (prev: Dashboard) => Dashboard) => void);
};

export function ScheduleView(rawProps?: Partial<ScheduleViewProps>) {
  const logicContext = useAppLogicContext();
  const props = { ...(logicContext ?? {}), ...(rawProps ?? {}) } as ReturnType<
    typeof useAppLogicContext
  > &
    Partial<ScheduleViewProps>;

  useScheduleRealtime(props.loadDashboard);

  const {
    scheduleDoctorFilterId, scheduleAssistantFilterId, scheduleChairFilterId,
    scheduleStatusFilter, scheduleDateFilter, appointmentScheduleDrafts,
    appointmentScheduleDirtyIds, appointmentScheduleSaveStates, appointmentScheduleErrors,
    newAppointmentDraft, newAppointmentSaveState, setScheduleDoctorFilterId,
    setScheduleAssistantFilterId, setScheduleChairFilterId, setScheduleStatusFilter,
    setScheduleDateFilter,
  } = useScheduleStore();

  const {
    appointmentLabels,
    appointmentReadinessById,
    appointmentScheduleDraftFromAppointment,
    closeAppointmentEditor,
    createAppointmentFromDraft,
    dashboard,
    editingAppointmentId,
    formatTime,
    fromDateTimeLocalValue,
    lockScheduleAdminSession,
    newAppointmentError,
    normalizedAppointmentStatus,
    openAppointmentEditor,
    openScheduleWarning,
    patientName,
    resetNewAppointmentDraft,
    saveAppointmentSchedule,
    shiftWarnings,
    sortedAppointments,
    toDateTimeLocalValue,
    unlockScheduleAdminSession,
    updateAppointmentScheduleDraft,
    updateNewAppointmentDraft,
    visibleScheduleSuggestions,
    auth,
  } = props;

  const {
    setScheduleAdminSecretDraft, scheduleAdminSecretDraft,
    scheduleAdminSecretSession, scheduleAdminSecretDemand,
  } = useSettingsStore();

  const [showShiftAnalytics, setShowShiftAnalytics] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isCalendarSyncModalOpen, setIsCalendarSyncModalOpen] = useState(false);
  const [isTomorrowRemindersOpen, setIsTomorrowRemindersOpen] = useState(false);
  const [isSmartAiOpen, setIsSmartAiOpen] = useState(false);
  const [showConfirmationsPanel, setShowConfirmationsPanel] = useState(false);
  const [showFreedSlotsPanel, setShowFreedSlotsPanel] = useState(false);
  const [showClipboardPanel, setShowClipboardPanel] = useState(false);
  const [clipboardReloadToken, setClipboardReloadToken] = useState(0);

  const [scheduleGridStep, setScheduleGridStep] = useState<15 | 30 | 60>(30);
  const [quickBookingOpen, setQuickBookingOpen] = useState(false);
  const [quickBookingSlot, setQuickBookingSlot] = useState<QuickBookingSlotInfo | null>(null);
  const [modalAppointment, setModalAppointment] = useState<Appointment | null>(null);
  const [doctorFreeSlotsOpen, setDoctorFreeSlotsOpen] = useState(false);
  const [preventiveInspectionOpen, setPreventiveInspectionOpen] = useState(false);
  const [isQuickAddChairOpen, setIsQuickAddChairOpen] = useState(false);
  const [editingChairData, setEditingChairData] = useState<QuickAddChairData | null>(null);
  const [waitlistQuickFillSlot, setWaitlistQuickFillSlot] = useState<TargetSlotInfo | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [useManualSelects, setUseManualSelects] = useState(false);
  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false);
  const [scheduleViewMode, setScheduleViewMode] = useState<"timeline" | "grid" | "chairs">("grid");
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  const preventiveCandidatesCount = useMemo(() => {
    return findPreventiveInspectionCandidates({
      patients: dashboard?.patients ?? [],
      appointments: dashboard?.appointments ?? [],
      minDaysSinceVisit: 150,
      referenceDate: scheduleDateFilter || undefined,
    }).length;
  }, [dashboard?.patients, dashboard?.appointments, scheduleDateFilter]);

  const todayScheduleDate = useCallback(() => {
    const localNow = new Date();
    return `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, "0")}-${String(localNow.getDate()).padStart(2, "0")}`;
  }, []);

  const clinicToday = todayScheduleDate();
  const currentDateKey = scheduleDateFilter || clinicToday || todayScheduleDate();

  const effectiveSortedAppointments = useMemo(() => {
    if (sortedAppointments && sortedAppointments.length > 0) return sortedAppointments;
    if (isDemoShowcaseMode()) {
      return getDemoShowcaseAppointments(currentDateKey);
    }
    return [];
  }, [sortedAppointments, currentDateKey]);

  const effectiveDashboard = useMemo(() => {
    if (!dashboard) return dashboard;
    if (!isDemoShowcaseMode()) return dashboard;
    const hasAppointments = dashboard.appointments && dashboard.appointments.length > 0;
    const hasPatients = dashboard.patients && dashboard.patients.length > 0;
    if (hasAppointments && hasPatients) return dashboard;
    return {
      ...dashboard,
      appointments: hasAppointments ? dashboard.appointments : getDemoShowcaseAppointments(currentDateKey),
      patients: hasPatients ? dashboard.patients : getDemoShowcasePatients(),
    };
  }, [dashboard, currentDateKey]);

  const {
    savedDoctorShifts,
    setSavedDoctorShifts,
    handleSaveDoctorShifts,
    rosterStaffList,
    scheduleDoctors,
    rosterCabinets,
    rosterAppointments,
  } = useScheduleRosterData({
    dashboard: effectiveDashboard,
    sortedAppointments: effectiveSortedAppointments,
    auth,
    currentDateKey,
  });

  const computedChairDoctorAssignments = useMemo(() => {
    return buildChairDoctorAssignmentsFromShifts(
      savedDoctorShifts,
      currentDateKey,
    );
  }, [savedDoctorShifts, currentDateKey]);

  const {
    handleEditChairFromSchedule,
    handleAddChairFromSchedule,
    handleAddDoctorFromSchedule,
    handleAssignChairDoctor,
  } = useScheduleChairDoctorOps({
    loadDashboard: props.loadDashboard,
    setDashboard: props.setDashboard,
    setScheduleChairFilterId,
    setEditingChairData,
    setIsQuickAddChairOpen,
    setSavedDoctorShifts,
    currentDateKey,
    auth,
    showToast,
  });

  const { focusNewAppointmentEditor } = useScheduleFocus({
    showCreateForm,
    setShowCreateForm,
  });

  const {
    handleEmergencyCitoBooking,
    waitlistCount,
    repeatAppointment,
    copyAppointmentToBuffer,
  } = useScheduleShortcuts({
    dashboard,
    scheduleDoctorFilterId,
    scheduleChairFilterId,
    scheduleDateFilter,
    clinicToday,
    todayScheduleDate,
    auth,
    setQuickBookingSlot,
    setQuickBookingOpen,
    showToast,
    isPatientSearchOpen,
    setIsPatientSearchOpen,
    quickBookingOpen,
    modalAppointment,
    setModalAppointment,
    waitlistOpen,
    setWaitlistOpen,
    showCreateForm,
    setShowCreateForm,
    updateNewAppointmentDraft,
    focusNewAppointmentEditor,
    patientName,
    setUseManualSelects,
    setShowClipboardPanel,
    setShowFreedSlotsPanel,
    setShowConfirmationsPanel,
    setClipboardReloadToken,
  });

  const handleOpenWaitlistForSlot = useCallback((slot: TargetSlotInfo) => {
    setWaitlistQuickFillSlot(slot);
    setWaitlistOpen(true);
  }, []);

  const isSoloOrStandardClinic =
    Boolean(auth?.isSoloDoctor) ||
    dashboard?.clinicSettings?.profile?.mode === "solo_practice" ||
    dashboard?.clinicSettings?.profile?.mode === "solo_doctor" ||
    dashboard?.clinicSettings?.profile?.mode === "one_chair" ||
    dashboard?.clinicSettings?.profile?.mode === "small_clinic" ||
    dashboard?.clinicSettings?.profile?.mode === "clinic" ||
    !dashboard?.clinicSettings?.profile?.mode;

  const adminSecretReady = scheduleAdminSecretDraft.trim().length > 0;
  const scheduleAdminSecretNeeded =
    !isSoloOrStandardClinic &&
    (scheduleAdminSecretDemand?.length > 0 ||
      scheduleAdminSecretSession?.length > 0);
  const scheduleAdminSecretReason =
    scheduleAdminSecretDemand === "ScheduleAdminSecretMissing"
      ? "Сервер клиники не настроен на изменение расписания: в его настройках не задан секрет администратора. Секрет задаёт тот, кто устанавливал программу — без него запись не сохранится, сколько бы вы ни вводили здесь."
      : "Сервер клиники не принял изменение расписания без секрета администратора. Введите его, чтобы сохранить запись.";

  const appointmentDraftMissingSteps = (draft: AppointmentScheduleDraft) =>
    appointmentScheduleMissingFields(
      draft,
      dashboard?.clinicSettings?.profile?.mode ?? "clinic",
      dashboard?.clinicSettings?.staff ?? [],
      {
        chairs: dashboard?.clinicSettings?.chairs ?? [],
        patients: dashboard?.patients ?? [],
      },
    );

  const scheduleDayGroups = useMemo(
    () =>
      groupAppointmentsByClinicDay(
        (effectiveSortedAppointments ?? []) as DayGroupingAppointment[],
        {
          toClinicLocal: (iso: string) =>
            toDateTimeLocalValue
              ? toDateTimeLocalValue(
                  iso,
                  dashboard?.clinicSettings?.profile?.timezone ??
                    "Europe/Moscow",
                )
              : iso,
          todayKey: clinicToday,
        },
      ),
    [
      effectiveSortedAppointments,
      dashboard?.clinicSettings?.profile?.timezone,
      clinicToday,
      toDateTimeLocalValue,
    ],
  );

  const {
    visibleDayGroups,
    visibleAppointmentCount,
    scheduleOverlapCount,
    shiftQueueCounts,
  } = useScheduleDayQueue({
    scheduleDayGroups,
    scheduleDateFilter,
    clinicToday,
    scheduleDoctorFilterId,
    scheduleChairFilterId,
    dashboard,
  });

  const stepScheduleDay = (deltaDays: number) => {
    const base = scheduleDateFilter.trim() || clinicToday;
    setScheduleDateFilter(shiftDayKey(base, deltaDays));
  };

  const resetScheduleFilters = () => {
    setScheduleDateFilter("");
    setScheduleDoctorFilterId(null);
    setScheduleAssistantFilterId(null);
    setScheduleChairFilterId(null);
    setScheduleStatusFilter("all");
  };

  const openScheduleSuggestion = (section: string) => {
    window.location.hash = section;
    const sectionId = section.replace(/^#/, "");
    window.requestAnimationFrame(() => {
      motionSafeScrollIntoView(document.getElementById(sectionId), {
        block: "start",
      });
    });
  };

  const isNonTodayDateFilter = Boolean(
    scheduleDateFilter?.trim() && scheduleDateFilter.trim() !== clinicToday,
  );
  const activeScheduleFilterCount = [
    isNonTodayDateFilter ? scheduleDateFilter.trim() : null,
    scheduleStatusFilter !== "all" ? scheduleStatusFilter : null,
    scheduleDoctorFilterId,
    scheduleAssistantFilterId,
    scheduleChairFilterId,
  ].filter((value): value is string => Boolean(value)).length;

  const staffFullNameById = (staffId: string | null) =>
    (dashboard?.clinicSettings?.staff ?? []).find(
      (member: { id: string }) => member?.id === staffId,
    )?.fullName ?? "неизвестный сотрудник";

  const activeScheduleFilterLabels = [
    isNonTodayDateFilter
      ? `день: ${formatDayTitle(scheduleDateFilter.trim())}`
      : null,
    scheduleDoctorFilterId
      ? `врач: ${staffFullNameById(scheduleDoctorFilterId)}`
      : null,
    scheduleAssistantFilterId
      ? `ассистент: ${staffFullNameById(scheduleAssistantFilterId)}`
      : null,
    scheduleChairFilterId
      ? `кресло: ${(dashboard?.clinicSettings?.chairs ?? []).find((chair: { id: string }) => chair?.id === scheduleChairFilterId)?.name ?? "неизвестное"}`
      : null,
    scheduleStatusFilter !== "all"
      ? `только «${appointmentLabels?.[scheduleStatusFilter as Appointment["status"]] ?? scheduleStatusFilter}»`
      : null,
  ].filter((value): value is string => Boolean(value));

  const hasSummaryContent =
    activeScheduleFilterLabels.length > 0 ||
    (activeScheduleFilterLabels.length === 0 &&
      (visibleDayGroups?.length ?? 0) > 1) ||
    scheduleOverlapCount > 0 ||
    (shiftWarnings?.length ?? 0) > 0;

  if (!dashboard) {
    return (
      <ScheduleDisconnectedState
        onRetry={() => {
          if (typeof props.loadDashboard === "function") {
            void props.loadDashboard();
          } else if (typeof logicContext?.loadDashboard === "function") {
            void logicContext.loadDashboard();
          }
        }}
      />
    );
  }

  const scheduleFilterSummaryNode = hasSummaryContent ? (
    <div
      className="schedule-shift-summary-inline inline-flex items-center gap-1.5 flex-nowrap shrink-0"
      data-testid="schedule-shift-summary"
      aria-label="Короткая сводка смены"
      aria-live="polite"
    >
      {visibleAppointmentCount > 0 ? (
        <span className="status-pill status-confirmed shrink-0">
          Записей: {visibleAppointmentCount}
        </span>
      ) : null}
      {activeScheduleFilterLabels.length > 0 ? (
        <>
          <span
            className="status-pill status-arrived max-w-[200px] truncate shrink-0"
            title={`Что сейчас отобрано на экране: ${activeScheduleFilterLabels.join(", ")}`}
          >
            Отбор: {activeScheduleFilterLabels.join(", ")}
          </span>
          <button
            className="text-button shrink-0 h-7 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal,var(--brand-primary))] text-xs font-medium inline-flex items-center cursor-pointer transition-all"
            type="button"
            onClick={resetScheduleFilters}
          >
            Снять отбор
          </button>
        </>
      ) : null}
      {activeScheduleFilterLabels.length === 0 &&
      visibleDayGroups?.length > 1 ? (
        <>
          <span className="status-pill status-planned shrink-0">
            Показаны все дни: {visibleDayGroups?.length}
          </span>
          <button
            className="text-button shrink-0 h-7 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal,var(--brand-primary))] text-xs font-medium inline-flex items-center cursor-pointer transition-all"
            type="button"
            onClick={() => setScheduleDateFilter("")}
          >
            Только сегодня
          </button>
        </>
      ) : null}
      {scheduleOverlapCount > 0 ? (
        <span className="status-pill status-cancelled shrink-0" role="alert">
          Наложений: {scheduleOverlapCount}
        </span>
      ) : null}
      {(shiftWarnings || []).map((warning) => (
        <button
          key={warning.id}
          type="button"
          className={`status-pill schedule-warning-chip max-w-[220px] text-left h-7 px-2 inline-flex items-center cursor-pointer shrink-0 ${warning.severity === "critical" ? "status-cancelled" : "status-overdue"}`}
          onClick={() => openScheduleWarning(warning)}
          title={`${warning.title}: ${warning.detail}`}
        >
          <span className="truncate">
            {warning.title} — {warning.actionLabel.toLowerCase()}
          </span>
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="panel schedule-panel" id="schedule" data-testid="schedule-view">
      <ScheduleViewToolbar
        clinicToday={clinicToday}
        scheduleDateFilter={scheduleDateFilter}
        setScheduleDateFilter={setScheduleDateFilter}
        stepScheduleDay={stepScheduleDay}
        activeScheduleFilterCount={activeScheduleFilterCount}
        resetScheduleFilters={resetScheduleFilters}
        dashboard={dashboard}
        scheduleDoctorFilterId={scheduleDoctorFilterId}
        setScheduleDoctorFilterId={setScheduleDoctorFilterId}
        scheduleChairFilterId={scheduleChairFilterId}
        setScheduleChairFilterId={setScheduleChairFilterId}
        scheduleStatusFilter={scheduleStatusFilter}
        shiftQueueCounts={shiftQueueCounts}
        setScheduleStatusFilter={(status) => {
          if (!setScheduleStatusFilter) return;
          if (!status || status === "all") {
            setScheduleStatusFilter("all");
          } else {
            setScheduleStatusFilter(
              status as
                | "cancelled"
                | "completed"
                | "confirmed"
                | "no_show"
                | "in_treatment"
                | "planned"
                | "arrived"
                | "all",
            );
          }
        }}
        computedChairDoctorAssignments={computedChairDoctorAssignments}
        scheduleViewMode={scheduleViewMode}
        setScheduleViewMode={setScheduleViewMode}
        scheduleGridStep={scheduleGridStep}
        setScheduleGridStep={setScheduleGridStep}
        scheduleFilterSummaryNode={scheduleFilterSummaryNode}
        isSmartAiOpen={isSmartAiOpen}
        setIsSmartAiOpen={setIsSmartAiOpen}
        setDoctorFreeSlotsOpen={setDoctorFreeSlotsOpen}
        onOpenPreventiveInspection={() => setPreventiveInspectionOpen(true)}
        preventiveInspectionCount={preventiveCandidatesCount}
        setIsPatientSearchOpen={setIsPatientSearchOpen}
        handleEmergencyCitoBooking={handleEmergencyCitoBooking}
        showShiftAnalytics={showShiftAnalytics}
        setShowShiftAnalytics={setShowShiftAnalytics}
        setIsRosterModalOpen={setIsRosterModalOpen}
        setWaitlistOpen={setWaitlistOpen}
        waitlistCount={waitlistCount}
        showConfirmationsPanel={showConfirmationsPanel}
        setShowConfirmationsPanel={setShowConfirmationsPanel}
        showFreedSlotsPanel={showFreedSlotsPanel}
        setShowFreedSlotsPanel={setShowFreedSlotsPanel}
        showClipboardPanel={showClipboardPanel}
        setShowClipboardPanel={setShowClipboardPanel}
        setIsCalendarSyncModalOpen={setIsCalendarSyncModalOpen}
        setIsTomorrowRemindersOpen={setIsTomorrowRemindersOpen}
        setIsQuickAddChairOpen={setIsQuickAddChairOpen}
        handleAddChairFromSchedule={handleAddChairFromSchedule}
        setQuickBookingSlot={setQuickBookingSlot}
        setQuickBookingOpen={setQuickBookingOpen}
        todayScheduleDate={todayScheduleDate}
        clipboardReloadToken={clipboardReloadToken}
        loadDashboard={props.loadDashboard}
        shiftWarnings={shiftWarnings}
        openScheduleWarning={openScheduleWarning}
      />

      {scheduleAdminSecretNeeded ? (
        <fieldset
          className="appointment-editor schedule-admin-unlock min-w-0"
          aria-label="Секрет администратора для сохранения расписания"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            padding: "16px",
            borderRadius: "10px",
            background: "var(--paper-soft)",
            marginTop: "8px",
            minWidth: 0,
          }}
        >
          {!scheduleAdminSecretSession ? (
            <>
              <p
                className="admin-unlock-guidance form-span-2 break-words"
                id="schedule-admin-unlock-guidance"
                role="status"
                aria-live="polite"
                style={{ margin: 0, fontWeight: 600 }}
              >
                {scheduleAdminSecretReason}
              </p>
              <label className="form-span-2 min-w-0">
                Секрет администратора клиники
                <input
                  type="password"
                  autoComplete="current-password"
                  value={scheduleAdminSecretDraft}
                  onChange={(event: TextFieldChangeEvent) =>
                    setScheduleAdminSecretDraft(event.target.value)
                  }
                  onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (!adminSecretReady) {
                        showToast(
                          "Введите мастер-пароль администратора",
                          "warning",
                        );
                        return;
                      }
                      unlockScheduleAdminSession();
                    }
                  }}
                  placeholder="введите секрет администратора"
                  aria-describedby="schedule-admin-unlock-guidance"
                />
              </label>
              <div className="appointment-editor-actions flex flex-wrap items-center justify-between gap-3 min-w-0">
                <span className="save-state save-state-idle break-words">
                  Секрет хранится только до перезагрузки страницы и относится
                  только к расписанию.
                </span>
                <button
                  className="secondary-button shrink-0 h-8 px-3.5"
                  type="button"
                  onClick={unlockScheduleAdminSession}
                  aria-describedby={!adminSecretReady ? "schedule-admin-unlock-guidance" : undefined}
                  disabled={!adminSecretReady}
                >
                  <ShieldCheck aria-hidden="true" /> Запомнить и повторить
                  сохранение
                </button>
              </div>
            </>
          ) : (
            <div className="appointment-editor-actions flex flex-wrap items-center justify-between gap-3 min-w-0">
              <span className="save-state save-state-idle break-words">
                Секрет запомнен до перезагрузки страницы. Он подставляется при
                сохранении записи — верен он или нет, покажет само сохранение.
              </span>
              <button
                className="secondary-button shrink-0"
                type="button"
                onClick={lockScheduleAdminSession}
              >
                Забыть секрет
              </button>
            </div>
          )}
        </fieldset>
      ) : null}

      <NewAppointmentForm
        dashboard={dashboard}
        appointmentLabels={appointmentLabels}
        newAppointmentDraft={newAppointmentDraft}
        newAppointmentSaveState={newAppointmentSaveState}
        newAppointmentError={newAppointmentError}
        updateNewAppointmentDraft={updateNewAppointmentDraft as unknown as (k: unknown, v: unknown) => void}
        createAppointmentFromDraft={createAppointmentFromDraft}
        resetNewAppointmentDraft={resetNewAppointmentDraft}
        toDateTimeLocalValue={toDateTimeLocalValue}
        fromDateTimeLocalValue={fromDateTimeLocalValue}
        useManualSelects={useManualSelects}
        setUseManualSelects={setUseManualSelects}
        showCreateForm={showCreateForm}
        setShowCreateForm={setShowCreateForm}
        isSmartAiOpen={isSmartAiOpen}
        setIsSmartAiOpen={setIsSmartAiOpen}
        chairDoctorAssignments={computedChairDoctorAssignments}
      />

      <ScheduleViewBody
        scheduleViewMode={scheduleViewMode}
        dashboard={effectiveDashboard}
        scheduleDateFilter={scheduleDateFilter}
        clinicToday={clinicToday}
        todayScheduleDate={todayScheduleDate}
        scheduleGridStep={scheduleGridStep}
        setScheduleGridStep={setScheduleGridStep}
        computedChairDoctorAssignments={computedChairDoctorAssignments}
        savedDoctorShifts={savedDoctorShifts}
        handleAssignChairDoctor={handleAssignChairDoctor}
        handleAddChairFromSchedule={handleAddChairFromSchedule}
        handleAddDoctorFromSchedule={handleAddDoctorFromSchedule}
        handleEditChairFromSchedule={handleEditChairFromSchedule}
        handleOpenWaitlistForSlot={handleOpenWaitlistForSlot}
        setIsRosterModalOpen={setIsRosterModalOpen}
        setScheduleChairFilterId={setScheduleChairFilterId}
        scheduleChairFilterId={scheduleChairFilterId}
        scheduleDoctorFilterId={scheduleDoctorFilterId}
        setQuickBookingSlot={setQuickBookingSlot}
        setQuickBookingOpen={setQuickBookingOpen}
        setModalAppointment={setModalAppointment}
        updateAppointmentScheduleDraft={updateAppointmentScheduleDraft}
        saveAppointmentSchedule={saveAppointmentSchedule}
        patientName={patientName}
        formatTime={formatTime}
        toDateTimeLocalValue={toDateTimeLocalValue}
        fromDateTimeLocalValue={fromDateTimeLocalValue}
        appointmentLabels={appointmentLabels}
        showToast={showToast}
        setEditingChairData={setEditingChairData}
        setIsQuickAddChairOpen={setIsQuickAddChairOpen}
        visibleDayGroups={visibleDayGroups}
        visibleScheduleSuggestions={visibleScheduleSuggestions}
        appointmentReadinessById={appointmentReadinessById}
        appointmentScheduleDrafts={appointmentScheduleDrafts}
        appointmentScheduleSaveStates={appointmentScheduleSaveStates}
        appointmentScheduleErrors={appointmentScheduleErrors}
        appointmentScheduleDirtyIds={appointmentScheduleDirtyIds}
        editingAppointmentId={editingAppointmentId}
        appointmentScheduleDraftFromAppointment={appointmentScheduleDraftFromAppointment}
        appointmentDraftMissingSteps={appointmentDraftMissingSteps}
        activeVisitLockedAppointmentStatuses={activeVisitLockedAppointmentStatuses}
        openScheduleSuggestion={openScheduleSuggestion}
        openAppointmentEditor={openAppointmentEditor}
        repeatAppointment={repeatAppointment}
        copyAppointmentToBuffer={copyAppointmentToBuffer}
        closeAppointmentEditor={closeAppointmentEditor}
        normalizedAppointmentStatus={normalizedAppointmentStatus}
        useManualSelects={useManualSelects}
        stepScheduleDay={stepScheduleDay}
        activeScheduleFilterCount={activeScheduleFilterCount}
        resetScheduleFilters={resetScheduleFilters}
        setScheduleDateFilter={setScheduleDateFilter}
      />

      <ScheduleViewModals
        quickBookingOpen={quickBookingOpen}
        setQuickBookingOpen={setQuickBookingOpen}
        quickBookingSlot={quickBookingSlot}
        setQuickBookingSlot={setQuickBookingSlot}
        modalAppointment={modalAppointment}
        setModalAppointment={setModalAppointment}
        doctorFreeSlotsOpen={doctorFreeSlotsOpen}
        setDoctorFreeSlotsOpen={setDoctorFreeSlotsOpen}
        preventiveInspectionOpen={preventiveInspectionOpen}
        setPreventiveInspectionOpen={setPreventiveInspectionOpen}
        isRosterModalOpen={isRosterModalOpen}
        setIsRosterModalOpen={setIsRosterModalOpen}
        isQuickAddChairOpen={isQuickAddChairOpen}
        setIsQuickAddChairOpen={setIsQuickAddChairOpen}
        isCalendarSyncModalOpen={isCalendarSyncModalOpen}
        setIsCalendarSyncModalOpen={setIsCalendarSyncModalOpen}
        isPatientSearchOpen={isPatientSearchOpen}
        setIsPatientSearchOpen={setIsPatientSearchOpen}
        isTomorrowRemindersOpen={isTomorrowRemindersOpen}
        setIsTomorrowRemindersOpen={setIsTomorrowRemindersOpen}
        waitlistOpen={waitlistOpen}
        setWaitlistOpen={setWaitlistOpen}
        waitlistQuickFillSlot={waitlistQuickFillSlot}
        setWaitlistQuickFillSlot={setWaitlistQuickFillSlot}
        editingChairData={editingChairData}
        setEditingChairData={setEditingChairData}
        dashboard={dashboard}
        auth={auth}
        loadDashboard={props.loadDashboard}
        logicContext={logicContext}
        scheduleDoctorFilterId={scheduleDoctorFilterId}
        scheduleChairFilterId={scheduleChairFilterId}
        scheduleDateFilter={scheduleDateFilter}
        clinicToday={clinicToday}
        todayScheduleDate={todayScheduleDate}
        computedChairDoctorAssignments={computedChairDoctorAssignments}
        savedDoctorShifts={savedDoctorShifts}
        rosterStaffList={rosterStaffList}
        rosterCabinets={rosterCabinets}
        rosterAppointments={rosterAppointments}
        scheduleDoctors={scheduleDoctors}
        currentDateKey={currentDateKey}
        formatTime={formatTime}
        patientName={patientName}
        toDateTimeLocalValue={toDateTimeLocalValue}
        fromDateTimeLocalValue={fromDateTimeLocalValue}
        appointmentLabels={appointmentLabels}
        activeVisitLockedAppointmentStatuses={activeVisitLockedAppointmentStatuses}
        appointmentReadinessById={appointmentReadinessById}
        updateAppointmentScheduleDraft={updateAppointmentScheduleDraft}
        saveAppointmentSchedule={saveAppointmentSchedule}
        repeatAppointment={repeatAppointment}
        copyAppointmentToBuffer={copyAppointmentToBuffer}
        handleOpenWaitlistForSlot={handleOpenWaitlistForSlot}
        updateNewAppointmentDraft={updateNewAppointmentDraft}
        focusNewAppointmentEditor={focusNewAppointmentEditor}
        createAppointmentFromDraft={createAppointmentFromDraft}
        handleSaveDoctorShifts={handleSaveDoctorShifts}
        handleAddChairFromSchedule={handleAddChairFromSchedule}
        showToast={showToast}
      />
    </div>
  );
}
