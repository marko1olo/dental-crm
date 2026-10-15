import { useCallback, useMemo } from "react";
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
import { findPreventiveInspectionCandidates } from "../doctorFreeSlotsEngine";
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
  const props = { ...(logicContext ?? {}), ...(rawProps ?? {}) } as ReturnType<
    typeof useAppLogicContext
  > &
    Partial<ScheduleViewProps>;

  useScheduleRealtime(props.loadDashboard);
  const isMobile = useIsMobile(768);

  const scheduleStore = useScheduleStore();
  const settingsStore = useSettingsStore();
  const modalStates = useScheduleModalStates();

  const todayScheduleDate = useCallback(() => {
    const localNow = new Date();
    return `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, "0")}-${String(localNow.getDate()).padStart(2, "0")}`;
  }, []);

  const clinicToday = todayScheduleDate();
  const effectiveSortedAppointments = props.sortedAppointments ?? [];
  const effectiveDashboard = props.dashboard;

  const gridNav = useScheduleGridNavigation({
    scheduleDateFilter: scheduleStore.scheduleDateFilter,
    setScheduleDateFilter: scheduleStore.setScheduleDateFilter,
    clinicToday,
    todayScheduleDate,
    effectiveSortedAppointments,
    dashboard: effectiveDashboard,
    toDateTimeLocalValue: props.toDateTimeLocalValue,
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
    return findPreventiveInspectionCandidates({
      patients: effectiveDashboard?.patients ?? [],
      appointments: effectiveDashboard?.appointments ?? [],
      minDaysSinceVisit: 150,
      referenceDate: scheduleStore.scheduleDateFilter || undefined,
    }).length;
  }, [
    effectiveDashboard?.patients,
    effectiveDashboard?.appointments,
    scheduleStore.scheduleDateFilter,
  ]);

  const rosterData = useScheduleRosterData({
    dashboard: effectiveDashboard,
    sortedAppointments: effectiveSortedAppointments,
    auth: props.auth,
    currentDateKey: gridNav.currentDateKey,
  });

  const computedChairDoctorAssignments = useMemo(() => {
    return buildChairDoctorAssignmentsFromShifts(
      rosterData.savedDoctorShifts,
      gridNav.currentDateKey,
    );
  }, [rosterData.savedDoctorShifts, gridNav.currentDateKey]);

  const chairOps = useScheduleChairDoctorOps({
    loadDashboard: props.loadDashboard,
    setDashboard: props.setDashboard,
    setScheduleChairFilterId: scheduleStore.setScheduleChairFilterId,
    setEditingChairData: modalStates.setEditingChairData,
    setIsQuickAddChairOpen: modalStates.setIsQuickAddChairOpen,
    setSavedDoctorShifts: rosterData.setSavedDoctorShifts,
    currentDateKey: gridNav.currentDateKey,
    auth: props.auth,
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
    scheduleDateFilter: scheduleStore.scheduleDateFilter,
    clinicToday,
    todayScheduleDate,
    auth: props.auth,
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
    updateNewAppointmentDraft: props.updateNewAppointmentDraft,
    focusNewAppointmentEditor,
    patientName: props.patientName,
    setUseManualSelects: modalStates.setUseManualSelects,
    setShowClipboardPanel: modalStates.setShowClipboardPanel,
    setShowFreedSlotsPanel: modalStates.setShowFreedSlotsPanel,
    setShowConfirmationsPanel: modalStates.setShowConfirmationsPanel,
    setClipboardReloadToken: modalStates.setClipboardReloadToken,
  });

  const pendingOnlineBookings = useMemo(() => {
    if (!effectiveDashboard?.appointments) return [];
    return effectiveDashboard.appointments.filter((a) => {
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
      effectiveDashboard?.clinicSettings?.profile?.mode ?? "clinic",
      effectiveDashboard?.clinicSettings?.staff ?? [],
      {
        chairs: effectiveDashboard?.clinicSettings?.chairs ?? [],
        patients: effectiveDashboard?.patients ?? [],
      },
    );

  const filterSummary = useScheduleFilterSummary({
    scheduleDateFilter: scheduleStore.scheduleDateFilter,
    clinicToday,
    scheduleStatusFilter: scheduleStore.scheduleStatusFilter,
    scheduleDoctorFilterId: scheduleStore.scheduleDoctorFilterId,
    scheduleAssistantFilterId: scheduleStore.scheduleAssistantFilterId,
    scheduleChairFilterId: scheduleStore.scheduleChairFilterId,
    appointmentLabels: props.appointmentLabels,
    dashboard: effectiveDashboard,
    visibleDayGroups: gridNav.visibleDayGroups,
    scheduleOverlapCount: gridNav.scheduleOverlapCount,
    shiftWarnings: props.shiftWarnings,
    resetScheduleFilters: gridNav.resetScheduleFilters,
    setScheduleDateFilter: scheduleStore.setScheduleDateFilter,
    openScheduleWarning: props.openScheduleWarning,
  });

  const handleRetryDashboard = useCallback(() => {
    if (typeof props.loadDashboard === "function") {
      void props.loadDashboard();
    } else if (typeof logicContext?.loadDashboard === "function") {
      void logicContext.loadDashboard();
    }
  }, [props.loadDashboard, logicContext?.loadDashboard]);

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
      props: props as Record<string, unknown>,
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
