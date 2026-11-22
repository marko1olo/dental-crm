import { useCallback, useMemo } from "react";
import type { Appointment, Dashboard } from "@dental/shared";
import { appointmentScheduleMissingFields } from "../../../AppHelpers";
import { showToast } from "../../GlobalToast";
import { useScheduleStore } from "../../../store/scheduleStore";
import { useSettingsStore } from "../../../store/settingsStore";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { useScheduleRealtime } from "../../../hooks/useScheduleRealtime";
import { buildChairDoctorAssignmentsFromShifts } from "../view/scheduleViewShifts";
import type { AppointmentScheduleDraft } from "../view/scheduleViewTypes";
import { useScheduleRosterData } from "../view/useScheduleRosterData";
import { useScheduleChairDoctorOps } from "../view/useScheduleChairDoctorOps";
import { useScheduleShortcuts } from "../view/useScheduleShortcuts";
import { useScheduleFocus } from "../view/useScheduleFocus";
import { useIsMobile } from "../../../hooks/useIsMobile";
import { useScheduleShiftDrawerController } from "./useScheduleShiftDrawerController";
import { useScheduleFilterSummary } from "./useScheduleFilterSummary";
import { useScheduleGridNavigation } from "./controller/useScheduleGridNavigation";
import { useScheduleAppointmentDragDrop } from "./controller/useScheduleAppointmentDragDrop";
import { useScheduleModalStates } from "./controller/useScheduleModalStates";
import { buildScheduleComponentProps } from "./controller/useSchedulePropsAssembler";
import type { ScheduleViewProps } from "./types";

export function useScheduleViewController(rawProps?: Partial<ScheduleViewProps>) {
  const logicContext = useAppLogicContext();
  const raw = rawProps ?? {};
  const loadDashboard = raw.loadDashboard ?? logicContext?.loadDashboard;
  const setDashboard = raw.setDashboard ?? logicContext?.setDashboard;
  const auth = (raw as { auth?: typeof logicContext.auth }).auth ?? logicContext?.auth;
  const toDateTimeLocalValue = raw.toDateTimeLocalValue ?? logicContext?.toDateTimeLocalValue;
  const updateNewAppointmentDraft = raw.updateNewAppointmentDraft ?? logicContext?.updateNewAppointmentDraft;
  const patientName = raw.patientName ?? logicContext?.patientName;
  const appointmentLabels = raw.appointmentLabels ?? logicContext?.appointmentLabels;
  const shiftWarnings = raw.shiftWarnings ?? logicContext?.shiftWarnings;
  const openScheduleWarning = raw.openScheduleWarning ?? logicContext?.openScheduleWarning;

  useScheduleRealtime(loadDashboard);
  const isMobile = useIsMobile(768);

  const scheduleStore = useScheduleStore();
  const settingsStore = useSettingsStore();
  const modalStates = useScheduleModalStates();

  const todayScheduleDate = useCallback(() => {
    const localNow = new Date();
    return `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, "0")}-${String(localNow.getDate()).padStart(2, "0")}`;
  }, []);

  const clinicToday = todayScheduleDate();
  const effectiveSortedAppointments = raw.sortedAppointments ?? logicContext?.sortedAppointments ?? [];
  const effectiveDashboard = raw.dashboard ?? logicContext?.dashboard;

  const gridNav = useScheduleGridNavigation({
    scheduleDateFilter: scheduleStore.scheduleDateFilter || clinicToday,
    setScheduleDateFilter: scheduleStore.setScheduleDateFilter,
    clinicToday,
    todayScheduleDate,
    effectiveSortedAppointments,
    dashboard: effectiveDashboard,
    toDateTimeLocalValue,
    scheduleDoctorFilterId: scheduleStore.scheduleDoctorFilterId,
    scheduleAssistantFilterId: scheduleStore.scheduleAssistantFilterId,
    scheduleChairFilterId: scheduleStore.scheduleChairFilterId,
    setScheduleDoctorFilterId: scheduleStore.setScheduleDoctorFilterId,
    setScheduleAssistantFilterId: scheduleStore.setScheduleAssistantFilterId,
    setScheduleChairFilterId: scheduleStore.setScheduleChairFilterId,
    setScheduleStatusFilter: scheduleStore.setScheduleStatusFilter,
  });

  const dragDrop = useScheduleAppointmentDragDrop({
    dashboard: effectiveDashboard,
    pendingStageBooking: scheduleStore.pendingStageBooking,
    setPendingStageBooking: scheduleStore.setPendingStageBooking,
  });

  const preventiveCandidatesCount = useMemo(() => {
    if (!effectiveDashboard?.appointments || !effectiveDashboard?.patients) return 0;
    const now = Date.now();
    const thresholdMs = 150 * 24 * 3600 * 1000;
    const recentPatientIds = new Set(
      effectiveDashboard.appointments
        .filter((a: Appointment) => a.startsAt && now - new Date(a.startsAt).getTime() < thresholdMs)
        .map((a: Appointment) => a.patientId)
        .filter(Boolean),
    );
    return effectiveDashboard.patients.filter((p) => p.id && !recentPatientIds.has(p.id)).length;
  }, [
    effectiveDashboard?.patients,
    effectiveDashboard?.appointments,
  ]);

  const rosterData = useScheduleRosterData({
    dashboard: effectiveDashboard,
    sortedAppointments: effectiveSortedAppointments,
    auth,
    currentDateKey: gridNav.currentDateKey,
  });

  const computedChairDoctorAssignments = useMemo(() => {
    return buildChairDoctorAssignmentsFromShifts(
      rosterData.savedDoctorShifts,
      gridNav.currentDateKey,
    );
  }, [rosterData.savedDoctorShifts, gridNav.currentDateKey]);

  const chairOpsSetDashboard = useMemo(() => {
    if (!setDashboard) return undefined;
    return (updater: (prev: Dashboard) => Dashboard) => {
      const dispatch = setDashboard as (action: (current: Dashboard | null) => Dashboard | null) => void;
      dispatch((current) => {
        if (!current) return current;
        return updater(current);
      });
    };
  }, [setDashboard]);

  const chairOps = useScheduleChairDoctorOps({
    loadDashboard,
    setDashboard: chairOpsSetDashboard,
    setScheduleChairFilterId: scheduleStore.setScheduleChairFilterId,
    setEditingChairData: modalStates.setEditingChairData,
    setIsQuickAddChairOpen: modalStates.setIsQuickAddChairOpen,
    setSavedDoctorShifts: rosterData.setSavedDoctorShifts,
    currentDateKey: gridNav.currentDateKey,
    auth,
    showToast,
  });

  const shiftDrawerCtrl = useScheduleShiftDrawerController({
    currentDateKey: gridNav.currentDateKey,
    scheduleDoctorFilterId: scheduleStore.scheduleDoctorFilterId,
    scheduleChairFilterId: scheduleStore.scheduleChairFilterId,
    rosterStaffList: rosterData.rosterStaffList,
    rosterCabinets: rosterData.rosterCabinets,
    scheduleDoctors: rosterData.scheduleDoctors,
    dashboard: effectiveDashboard,
    savedDoctorShifts: rosterData.savedDoctorShifts,
    handleSaveDoctorShifts: rosterData.handleSaveDoctorShifts,
  });

  const { focusNewAppointmentEditor } = useScheduleFocus({
    showCreateForm: modalStates.showCreateForm,
    setShowCreateForm: modalStates.setShowCreateForm,
  });

  const shortcuts = useScheduleShortcuts({
    dashboard: effectiveDashboard,
    scheduleDoctorFilterId: scheduleStore.scheduleDoctorFilterId,
    scheduleChairFilterId: scheduleStore.scheduleChairFilterId,
    scheduleDateFilter: scheduleStore.scheduleDateFilter || clinicToday,
    clinicToday,
    todayScheduleDate,
    auth,
    setQuickBookingSlot: dragDrop.setQuickBookingSlot,
    setQuickBookingOpen: dragDrop.setQuickBookingOpen,
    showToast,
    isPatientSearchOpen: modalStates.isPatientSearchOpen,
    setIsPatientSearchOpen: modalStates.setIsPatientSearchOpen,
    quickBookingOpen: dragDrop.quickBookingOpen,
    modalAppointment: modalStates.modalAppointment,
    setModalAppointment: modalStates.setModalAppointment,
    waitlistOpen: dragDrop.waitlistOpen,
    setWaitlistOpen: dragDrop.setWaitlistOpen,
    showCreateForm: modalStates.showCreateForm,
    setShowCreateForm: modalStates.setShowCreateForm,
    updateNewAppointmentDraft,
    focusNewAppointmentEditor,
    patientName: patientName as ((patients: Dashboard["patients"], id: string | null) => string) | undefined,
    setUseManualSelects: modalStates.setUseManualSelects,
    setShowClipboardPanel: modalStates.setShowClipboardPanel,
    setShowFreedSlotsPanel: modalStates.setShowFreedSlotsPanel,
    setShowConfirmationsPanel: modalStates.setShowConfirmationsPanel,
    setClipboardReloadToken: modalStates.setClipboardReloadToken,
  });

  const pendingOnlineBookings = useMemo(() => {
    if (!effectiveDashboard?.appointments) return [];
    return effectiveDashboard.appointments.filter((a: Appointment) => {
      if (a.status !== "planned") return false;
      return Boolean(
        (a.comment && /онлайн|виджет|online|сайт/i.test(a.comment)) ||
          (a.reason && /онлайн|виджет|online|сайт/i.test(a.reason)),
      );
    });
  }, [effectiveDashboard?.appointments]);

  const appointmentDraftMissingSteps = (draft: AppointmentScheduleDraft) =>
    appointmentScheduleMissingFields(
      draft,
      effectiveDashboard?.clinicSettings?.profile?.mode ?? "small_clinic",
      effectiveDashboard?.clinicSettings?.staff ?? [],
      {
        chairs: effectiveDashboard?.clinicSettings?.chairs ?? [],
        patients: effectiveDashboard?.patients ?? [],
      },
    );

  const filterSummary = useScheduleFilterSummary({
    scheduleDateFilter: scheduleStore.scheduleDateFilter || clinicToday,
    clinicToday,
    scheduleStatusFilter: scheduleStore.scheduleStatusFilter,
    scheduleDoctorFilterId: scheduleStore.scheduleDoctorFilterId,
    scheduleAssistantFilterId: scheduleStore.scheduleAssistantFilterId,
    scheduleChairFilterId: scheduleStore.scheduleChairFilterId,
    appointmentLabels,
    dashboard: effectiveDashboard,
    visibleDayGroups: gridNav.visibleDayGroups,
    scheduleOverlapCount: gridNav.scheduleOverlapCount,
    shiftWarnings,
    resetScheduleFilters: gridNav.resetScheduleFilters,
    setScheduleDateFilter: scheduleStore.setScheduleDateFilter,
    openScheduleWarning: typeof openScheduleWarning === "function" ? (openScheduleWarning as (warning: Dashboard["shiftIntelligence"]["scheduleWarnings"][number]) => void) : undefined,
  });

  const handleRetryDashboard = useCallback(() => {
    if (typeof loadDashboard === "function") {
      void loadDashboard();
    } else if (typeof logicContext?.loadDashboard === "function") {
      void logicContext.loadDashboard();
    }
  }, [loadDashboard, logicContext?.loadDashboard]);

  const { headerToolbarProps, activeViewPortProps, modalsLayerProps } =
    buildScheduleComponentProps({
      modalStates,
      gridNav,
      dragDrop,
      filterSummary,
      shiftDrawerCtrl,
      rosterData,
      chairOps,
      shortcuts,
      scheduleStore,
      settingsStore,
      props: { ...(logicContext ?? {}), ...(rawProps ?? {}) } as Record<string, unknown>,
      logicContext,
      effectiveDashboard,
      clinicToday,
      todayScheduleDate,
      computedChairDoctorAssignments,
      preventiveCandidatesCount,
      pendingOnlineBookings,
      appointmentDraftMissingSteps,
      focusNewAppointmentEditor,
    });

  return {
    dashboard: effectiveDashboard,
    isMobile,
    handleRetryDashboard,
    headerToolbarProps,
    activeViewPortProps,
    modalsLayerProps,
  };
}
