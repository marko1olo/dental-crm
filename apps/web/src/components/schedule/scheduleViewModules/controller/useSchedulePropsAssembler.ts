/**
 * useSchedulePropsAssembler.ts
 *
 * Layer 4: Сборка пропсов верхнего уровня для тулбара, вьюпорта и слоя модалок расписания.
 */

import { showToast } from "../../../GlobalToast";
import type {
  ScheduleHeaderToolbarProps,
  ScheduleActiveViewPortProps,
  ScheduleModalsLayerProps,
} from "../types";
import { activeVisitLockedAppointmentStatuses } from "../../view/scheduleViewTypes";
import type { AppointmentScheduleDraft } from "../../view/scheduleViewTypes";
import type { ScheduleModalStates } from "./useScheduleModalStates";
import type { useScheduleGridNavigation } from "./useScheduleGridNavigation";
import type { useScheduleAppointmentDragDrop } from "./useScheduleAppointmentDragDrop";
import type { useScheduleFilterSummary } from "../useScheduleFilterSummary";
import type { useScheduleShiftDrawerController } from "../useScheduleShiftDrawerController";
import type { useScheduleRosterData } from "../../view/useScheduleRosterData";
import type { useScheduleChairDoctorOps } from "../../view/useScheduleChairDoctorOps";
import type { useScheduleShortcuts } from "../../view/useScheduleShortcuts";
import type { useScheduleStore } from "../../../../store/scheduleStore";
import type { useSettingsStore } from "../../../../store/settingsStore";
import type { AppLogicContextType } from "../../../../contexts/AppLogicContext";

export interface SchedulePropsAssemblerInput {
  modalStates: ScheduleModalStates;
  gridNav: ReturnType<typeof useScheduleGridNavigation>;
  dragDrop: ReturnType<typeof useScheduleAppointmentDragDrop>;
  filterSummary: ReturnType<typeof useScheduleFilterSummary>;
  shiftDrawerCtrl: ReturnType<typeof useScheduleShiftDrawerController>;
  rosterData: ReturnType<typeof useScheduleRosterData>;
  chairOps: ReturnType<typeof useScheduleChairDoctorOps>;
  shortcuts: ReturnType<typeof useScheduleShortcuts>;
  scheduleStore: any;
  settingsStore: any;
  props: Record<string, unknown>;
  logicContext?: AppLogicContextType | null;
  effectiveDashboard: unknown;
  clinicToday: string;
  todayScheduleDate: () => string;
  computedChairDoctorAssignments: unknown;
  preventiveCandidatesCount: number;
  pendingOnlineBookings: unknown[];
  appointmentDraftMissingSteps: (draft: AppointmentScheduleDraft) => unknown;
  focusNewAppointmentEditor: () => void;
}

export function buildScheduleComponentProps(input: SchedulePropsAssemblerInput): {
  headerToolbarProps: ScheduleHeaderToolbarProps;
  activeViewPortProps: ScheduleActiveViewPortProps;
  modalsLayerProps: ScheduleModalsLayerProps;
} {
  const {
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
    props,
    logicContext,
    effectiveDashboard,
    clinicToday,
    todayScheduleDate,
    computedChairDoctorAssignments,
    preventiveCandidatesCount,
    pendingOnlineBookings,
    appointmentDraftMissingSteps,
    focusNewAppointmentEditor,
  } = input;

  const auth = props.auth as { isSoloDoctor?: boolean } | undefined;
  const dashboard = effectiveDashboard as {
    clinicSettings?: { profile?: { mode?: string } };
  } | undefined;

  const isSoloOrStandardClinic =
    Boolean(auth?.isSoloDoctor) ||
    dashboard?.clinicSettings?.profile?.mode === "solo_practice" ||
    dashboard?.clinicSettings?.profile?.mode === "solo_doctor" ||
    dashboard?.clinicSettings?.profile?.mode === "one_chair" ||
    dashboard?.clinicSettings?.profile?.mode === "small_clinic" ||
    dashboard?.clinicSettings?.profile?.mode === "clinic" ||
    !dashboard?.clinicSettings?.profile?.mode;

  const adminSecretDraft = settingsStore.scheduleAdminSecretDraft ?? "";
  const adminSecretReady = adminSecretDraft.trim().length > 0;
  const adminSecretDemand = settingsStore.scheduleAdminSecretDemand;
  const adminSecretSession = settingsStore.scheduleAdminSecretSession;
  const scheduleAdminSecretNeeded =
    !isSoloOrStandardClinic &&
    Boolean(
      (adminSecretDemand && adminSecretDemand.length > 0) ||
        (adminSecretSession && adminSecretSession.length > 0),
    );
  const scheduleAdminSecretReason =
    adminSecretDemand === "ScheduleAdminSecretMissing"
      ? "Сервер клиники не настроен на изменение расписания: в его настройках не задан секрет администратора. Секрет задаёт тот, кто устанавливал программу — без него запись не сохранится, сколько бы вы ни вводили здесь."
      : "Сервер клиники не принял изменение расписания без секрета администратора. Введите его, чтобы сохранить запись.";

  const headerToolbarProps: any = {
    clinicToday,
    scheduleDateFilter: scheduleStore.scheduleDateFilter,
    setScheduleDateFilter: scheduleStore.setScheduleDateFilter,
    stepScheduleDay: gridNav.stepScheduleDay,
    activeScheduleFilterCount: filterSummary.activeScheduleFilterCount,
    resetScheduleFilters: gridNav.resetScheduleFilters,
    dashboard: effectiveDashboard as ScheduleHeaderToolbarProps["dashboard"],
    scheduleDoctorFilterId: scheduleStore.scheduleDoctorFilterId,
    setScheduleDoctorFilterId: scheduleStore.setScheduleDoctorFilterId,
    scheduleChairFilterId: scheduleStore.scheduleChairFilterId,
    setScheduleChairFilterId: scheduleStore.setScheduleChairFilterId,
    scheduleStatusFilter: scheduleStore.scheduleStatusFilter,
    shiftQueueCounts: gridNav.shiftQueueCounts,
    setScheduleStatusFilter: (status: string) => {
      if (typeof scheduleStore.setScheduleStatusFilter !== "function") return;
      scheduleStore.setScheduleStatusFilter(
        !status || status === "all"
          ? "all"
          : (status as
              | "cancelled"
              | "completed"
              | "confirmed"
              | "no_show"
              | "in_treatment"
              | "planned"
              | "arrived"
              | "all"),
      );
    },
    computedChairDoctorAssignments:
      computedChairDoctorAssignments as ScheduleHeaderToolbarProps["computedChairDoctorAssignments"],
    scheduleViewMode: gridNav.scheduleViewMode,
    setScheduleViewMode: gridNav.setScheduleViewMode,
    scheduleGridStep: gridNav.scheduleGridStep,
    setScheduleGridStep: gridNav.setScheduleGridStep,
    scheduleFilterSummaryNode: filterSummary.scheduleFilterSummaryNode,
    isSmartAiOpen: modalStates.isSmartAiOpen,
    setIsSmartAiOpen: modalStates.setIsSmartAiOpen,
    setDoctorFreeSlotsOpen: modalStates.setDoctorFreeSlotsOpen,
    onOpenPreventiveInspection: () => modalStates.setPreventiveInspectionOpen(true),
    preventiveInspectionCount: preventiveCandidatesCount,
    setIsPatientSearchOpen: modalStates.setIsPatientSearchOpen,
    handleEmergencyCitoBooking:
      shortcuts.handleEmergencyCitoBooking as ScheduleHeaderToolbarProps["handleEmergencyCitoBooking"],
    showShiftAnalytics: modalStates.showShiftAnalytics,
    setShowShiftAnalytics: modalStates.setShowShiftAnalytics,
    setIsRosterModalOpen: modalStates.setIsRosterModalOpen,
    setWaitlistOpen: dragDrop.setWaitlistOpen,
    waitlistCount: shortcuts.waitlistCount,
    showConfirmationsPanel: modalStates.showConfirmationsPanel,
    setShowConfirmationsPanel: modalStates.setShowConfirmationsPanel,
    showFreedSlotsPanel: modalStates.showFreedSlotsPanel,
    setShowFreedSlotsPanel: modalStates.setShowFreedSlotsPanel,
    showClipboardPanel: modalStates.showClipboardPanel,
    setShowClipboardPanel: modalStates.setShowClipboardPanel,
    setIsCalendarSyncModalOpen: modalStates.setIsCalendarSyncModalOpen,
    setIsTomorrowRemindersOpen: modalStates.setIsTomorrowRemindersOpen,
    setIsQuickAddChairOpen: modalStates.setIsQuickAddChairOpen,
    handleAddChairFromSchedule:
      chairOps.handleAddChairFromSchedule as ScheduleHeaderToolbarProps["handleAddChairFromSchedule"],
    setQuickBookingSlot:
      dragDrop.setQuickBookingSlot as ScheduleHeaderToolbarProps["setQuickBookingSlot"],
    setQuickBookingOpen: dragDrop.setQuickBookingOpen,
    todayScheduleDate,
    clipboardReloadToken: modalStates.clipboardReloadToken,
    loadDashboard:
      (props.loadDashboard as ScheduleHeaderToolbarProps["loadDashboard"]) ??
      (() => Promise.resolve()),
    shiftWarnings: props.shiftWarnings as ScheduleHeaderToolbarProps["shiftWarnings"],
    openScheduleWarning:
      props.openScheduleWarning as ScheduleHeaderToolbarProps["openScheduleWarning"],
    onOpenDoctorShiftDrawer: shiftDrawerCtrl.handleOpenDoctorShiftDrawer,
    onOpenChairDateRangeModal: shiftDrawerCtrl.handleOpenChairDateRangeModal,
    pendingOnlineBookingsCount: pendingOnlineBookings.length,
    onOpenPendingOnlineBookings: () => modalStates.setIsPendingOnlineBookingsOpen(true),
    scheduleAdminSecretNeeded,
    scheduleAdminSecretSession:
      settingsStore.scheduleAdminSecretSession as ScheduleHeaderToolbarProps["scheduleAdminSecretSession"],
    scheduleAdminSecretDraft:
      settingsStore.scheduleAdminSecretDraft as ScheduleHeaderToolbarProps["scheduleAdminSecretDraft"],
    setScheduleAdminSecretDraft:
      settingsStore.setScheduleAdminSecretDraft as ScheduleHeaderToolbarProps["setScheduleAdminSecretDraft"],
    scheduleAdminSecretReason:
      scheduleAdminSecretReason as ScheduleHeaderToolbarProps["scheduleAdminSecretReason"],
    adminSecretReady,
    unlockScheduleAdminSession:
      props.unlockScheduleAdminSession as ScheduleHeaderToolbarProps["unlockScheduleAdminSession"],
    lockScheduleAdminSession:
      props.lockScheduleAdminSession as ScheduleHeaderToolbarProps["lockScheduleAdminSession"],
    showToast: showToast as ScheduleHeaderToolbarProps["showToast"],
    appointmentLabels:
      props.appointmentLabels as ScheduleHeaderToolbarProps["appointmentLabels"],
    newAppointmentDraft:
      scheduleStore.newAppointmentDraft as ScheduleHeaderToolbarProps["newAppointmentDraft"],
    newAppointmentSaveState:
      scheduleStore.newAppointmentSaveState as ScheduleHeaderToolbarProps["newAppointmentSaveState"],
    newAppointmentError:
      props.newAppointmentError as ScheduleHeaderToolbarProps["newAppointmentError"],
    updateNewAppointmentDraft: props.updateNewAppointmentDraft as (
      k: unknown,
      v: unknown,
    ) => void,
    createAppointmentFromDraft:
      props.createAppointmentFromDraft as ScheduleHeaderToolbarProps["createAppointmentFromDraft"],
    resetNewAppointmentDraft:
      props.resetNewAppointmentDraft as ScheduleHeaderToolbarProps["resetNewAppointmentDraft"],
    toDateTimeLocalValue:
      props.toDateTimeLocalValue as ScheduleHeaderToolbarProps["toDateTimeLocalValue"],
    fromDateTimeLocalValue:
      props.fromDateTimeLocalValue as ScheduleHeaderToolbarProps["fromDateTimeLocalValue"],
    useManualSelects: modalStates.useManualSelects,
    setUseManualSelects: modalStates.setUseManualSelects,
    showCreateForm: modalStates.showCreateForm,
    setShowCreateForm: modalStates.setShowCreateForm,
  };

  const activeViewPortProps: ScheduleActiveViewPortProps = {
    scheduleViewMode: gridNav.scheduleViewMode,
    dashboard: effectiveDashboard as ScheduleActiveViewPortProps["dashboard"],
    scheduleDateFilter: scheduleStore.scheduleDateFilter,
    clinicToday,
    todayScheduleDate,
    scheduleGridStep: gridNav.scheduleGridStep,
    setScheduleGridStep: gridNav.setScheduleGridStep,
    computedChairDoctorAssignments:
      computedChairDoctorAssignments as ScheduleActiveViewPortProps["computedChairDoctorAssignments"],
    savedDoctorShifts:
      rosterData.savedDoctorShifts as ScheduleActiveViewPortProps["savedDoctorShifts"],
    handleAssignChairDoctor:
      chairOps.handleAssignChairDoctor as ScheduleActiveViewPortProps["handleAssignChairDoctor"],
    handleAddChairFromSchedule:
      chairOps.handleAddChairFromSchedule as ScheduleActiveViewPortProps["handleAddChairFromSchedule"],
    handleAddDoctorFromSchedule:
      chairOps.handleAddDoctorFromSchedule as ScheduleActiveViewPortProps["handleAddDoctorFromSchedule"],
    handleEditChairFromSchedule:
      chairOps.handleEditChairFromSchedule as ScheduleActiveViewPortProps["handleEditChairFromSchedule"],
    handleOpenWaitlistForSlot:
      dragDrop.handleOpenWaitlistForSlot as ScheduleActiveViewPortProps["handleOpenWaitlistForSlot"],
    setIsRosterModalOpen: modalStates.setIsRosterModalOpen,
    setScheduleChairFilterId: scheduleStore.setScheduleChairFilterId,
    scheduleChairFilterId: scheduleStore.scheduleChairFilterId,
    scheduleDoctorFilterId: scheduleStore.scheduleDoctorFilterId,
    setQuickBookingSlot:
      dragDrop.setQuickBookingSlot as ScheduleActiveViewPortProps["setQuickBookingSlot"],
    setQuickBookingOpen: dragDrop.setQuickBookingOpen,
    setModalAppointment: modalStates.setModalAppointment,
    updateAppointmentScheduleDraft:
      props.updateAppointmentScheduleDraft as ScheduleActiveViewPortProps["updateAppointmentScheduleDraft"],
    saveAppointmentSchedule:
      props.saveAppointmentSchedule as ScheduleActiveViewPortProps["saveAppointmentSchedule"],
    patientName: props.patientName as ScheduleActiveViewPortProps["patientName"],
    formatTime: props.formatTime as ScheduleActiveViewPortProps["formatTime"],
    toDateTimeLocalValue:
      props.toDateTimeLocalValue as ScheduleActiveViewPortProps["toDateTimeLocalValue"],
    fromDateTimeLocalValue:
      props.fromDateTimeLocalValue as ScheduleActiveViewPortProps["fromDateTimeLocalValue"],
    appointmentLabels:
      props.appointmentLabels as ScheduleActiveViewPortProps["appointmentLabels"],
    showToast: showToast as ScheduleActiveViewPortProps["showToast"],
    setEditingChairData: modalStates.setEditingChairData,
    setIsQuickAddChairOpen: modalStates.setIsQuickAddChairOpen,
    visibleDayGroups: gridNav.visibleDayGroups,
    visibleScheduleSuggestions:
      props.visibleScheduleSuggestions as ScheduleActiveViewPortProps["visibleScheduleSuggestions"],
    appointmentReadinessById:
      props.appointmentReadinessById as ScheduleActiveViewPortProps["appointmentReadinessById"],
    appointmentScheduleDrafts:
      scheduleStore.appointmentScheduleDrafts as ScheduleActiveViewPortProps["appointmentScheduleDrafts"],
    appointmentScheduleSaveStates:
      scheduleStore.appointmentScheduleSaveStates as ScheduleActiveViewPortProps["appointmentScheduleSaveStates"],
    appointmentScheduleErrors:
      scheduleStore.appointmentScheduleErrors as ScheduleActiveViewPortProps["appointmentScheduleErrors"],
    appointmentScheduleDirtyIds:
      scheduleStore.appointmentScheduleDirtyIds as ScheduleActiveViewPortProps["appointmentScheduleDirtyIds"],
    editingAppointmentId:
      props.editingAppointmentId as ScheduleActiveViewPortProps["editingAppointmentId"],
    appointmentScheduleDraftFromAppointment:
      props.appointmentScheduleDraftFromAppointment as ScheduleActiveViewPortProps["appointmentScheduleDraftFromAppointment"],
    appointmentDraftMissingSteps:
      appointmentDraftMissingSteps as ScheduleActiveViewPortProps["appointmentDraftMissingSteps"],
    activeVisitLockedAppointmentStatuses:
      activeVisitLockedAppointmentStatuses as ScheduleActiveViewPortProps["activeVisitLockedAppointmentStatuses"],
    openScheduleSuggestion: gridNav.openScheduleSuggestion,
    openAppointmentEditor:
      props.openAppointmentEditor as ScheduleActiveViewPortProps["openAppointmentEditor"],
    repeatAppointment:
      shortcuts.repeatAppointment as ScheduleActiveViewPortProps["repeatAppointment"],
    copyAppointmentToBuffer:
      shortcuts.copyAppointmentToBuffer as ScheduleActiveViewPortProps["copyAppointmentToBuffer"],
    closeAppointmentEditor:
      props.closeAppointmentEditor as ScheduleActiveViewPortProps["closeAppointmentEditor"],
    normalizedAppointmentStatus:
      props.normalizedAppointmentStatus as ScheduleActiveViewPortProps["normalizedAppointmentStatus"],
    useManualSelects: modalStates.useManualSelects,
    stepScheduleDay: gridNav.stepScheduleDay,
    activeScheduleFilterCount: filterSummary.activeScheduleFilterCount,
    resetScheduleFilters: gridNav.resetScheduleFilters,
    setScheduleDateFilter: scheduleStore.setScheduleDateFilter,
  };

  const modalsLayerProps: any = {
    quickBookingOpen: dragDrop.quickBookingOpen,
    setQuickBookingOpen: dragDrop.setQuickBookingOpen,
    quickBookingSlot:
      dragDrop.quickBookingSlot as ScheduleModalsLayerProps["quickBookingSlot"],
    setQuickBookingSlot:
      dragDrop.setQuickBookingSlot as ScheduleModalsLayerProps["setQuickBookingSlot"],
    modalAppointment: modalStates.modalAppointment,
    setModalAppointment: modalStates.setModalAppointment,
    doctorFreeSlotsOpen: modalStates.doctorFreeSlotsOpen,
    setDoctorFreeSlotsOpen: modalStates.setDoctorFreeSlotsOpen,
    preventiveInspectionOpen: modalStates.preventiveInspectionOpen,
    setPreventiveInspectionOpen: modalStates.setPreventiveInspectionOpen,
    isRosterModalOpen: modalStates.isRosterModalOpen,
    setIsRosterModalOpen: modalStates.setIsRosterModalOpen,
    isQuickAddChairOpen: modalStates.isQuickAddChairOpen,
    setIsQuickAddChairOpen: modalStates.setIsQuickAddChairOpen,
    isCalendarSyncModalOpen: modalStates.isCalendarSyncModalOpen,
    setIsCalendarSyncModalOpen: modalStates.setIsCalendarSyncModalOpen,
    isPatientSearchOpen: modalStates.isPatientSearchOpen,
    setIsPatientSearchOpen: modalStates.setIsPatientSearchOpen,
    isTomorrowRemindersOpen: modalStates.isTomorrowRemindersOpen,
    setIsTomorrowRemindersOpen: modalStates.setIsTomorrowRemindersOpen,
    waitlistOpen: dragDrop.waitlistOpen,
    setWaitlistOpen: dragDrop.setWaitlistOpen,
    waitlistQuickFillSlot:
      dragDrop.waitlistQuickFillSlot as ScheduleModalsLayerProps["waitlistQuickFillSlot"],
    setWaitlistQuickFillSlot:
      dragDrop.setWaitlistQuickFillSlot as ScheduleModalsLayerProps["setWaitlistQuickFillSlot"],
    editingChairData: modalStates.editingChairData,
    setEditingChairData: modalStates.setEditingChairData,
    isPendingOnlineBookingsOpen: modalStates.isPendingOnlineBookingsOpen,
    setIsPendingOnlineBookingsOpen: modalStates.setIsPendingOnlineBookingsOpen,
    pendingOnlineBookings:
      (pendingOnlineBookings ?? []) as ScheduleModalsLayerProps["pendingOnlineBookings"],
    dashboard: effectiveDashboard as ScheduleModalsLayerProps["dashboard"],
    auth: auth as ScheduleModalsLayerProps["auth"],
    loadDashboard: props.loadDashboard as ScheduleModalsLayerProps["loadDashboard"],
    logicContext: logicContext as ScheduleModalsLayerProps["logicContext"],
    scheduleDoctorFilterId: scheduleStore.scheduleDoctorFilterId,
    scheduleChairFilterId: scheduleStore.scheduleChairFilterId,
    scheduleDateFilter: scheduleStore.scheduleDateFilter,
    clinicToday,
    todayScheduleDate,
    computedChairDoctorAssignments:
      computedChairDoctorAssignments as ScheduleModalsLayerProps["computedChairDoctorAssignments"],
    savedDoctorShifts:
      rosterData.savedDoctorShifts as ScheduleModalsLayerProps["savedDoctorShifts"],
    rosterStaffList:
      rosterData.rosterStaffList as ScheduleModalsLayerProps["rosterStaffList"],
    rosterCabinets:
      rosterData.rosterCabinets as ScheduleModalsLayerProps["rosterCabinets"],
    rosterAppointments:
      rosterData.rosterAppointments as ScheduleModalsLayerProps["rosterAppointments"],
    scheduleDoctors:
      rosterData.scheduleDoctors as ScheduleModalsLayerProps["scheduleDoctors"],
    currentDateKey: gridNav.currentDateKey,
    formatTime: props.formatTime as ScheduleModalsLayerProps["formatTime"],
    patientName: props.patientName as ScheduleModalsLayerProps["patientName"],
    toDateTimeLocalValue:
      props.toDateTimeLocalValue as ScheduleModalsLayerProps["toDateTimeLocalValue"],
    fromDateTimeLocalValue:
      props.fromDateTimeLocalValue as ScheduleModalsLayerProps["fromDateTimeLocalValue"],
    appointmentLabels:
      props.appointmentLabels as ScheduleModalsLayerProps["appointmentLabels"],
    activeVisitLockedAppointmentStatuses:
      activeVisitLockedAppointmentStatuses as ScheduleModalsLayerProps["activeVisitLockedAppointmentStatuses"],
    appointmentReadinessById:
      props.appointmentReadinessById as ScheduleModalsLayerProps["appointmentReadinessById"],
    updateAppointmentScheduleDraft:
      props.updateAppointmentScheduleDraft as ScheduleModalsLayerProps["updateAppointmentScheduleDraft"],
    saveAppointmentSchedule:
      props.saveAppointmentSchedule as ScheduleModalsLayerProps["saveAppointmentSchedule"],
    repeatAppointment:
      shortcuts.repeatAppointment as ScheduleModalsLayerProps["repeatAppointment"],
    copyAppointmentToBuffer:
      shortcuts.copyAppointmentToBuffer as ScheduleModalsLayerProps["copyAppointmentToBuffer"],
    handleOpenWaitlistForSlot:
      dragDrop.handleOpenWaitlistForSlot as ScheduleModalsLayerProps["handleOpenWaitlistForSlot"],
    updateNewAppointmentDraft:
      props.updateNewAppointmentDraft as ScheduleModalsLayerProps["updateNewAppointmentDraft"],
    focusNewAppointmentEditor:
      focusNewAppointmentEditor as ScheduleModalsLayerProps["focusNewAppointmentEditor"],
    createAppointmentFromDraft:
      props.createAppointmentFromDraft as ScheduleModalsLayerProps["createAppointmentFromDraft"],
    handleSaveDoctorShifts:
      rosterData.handleSaveDoctorShifts as ScheduleModalsLayerProps["handleSaveDoctorShifts"],
    handleAddChairFromSchedule:
      chairOps.handleAddChairFromSchedule as ScheduleModalsLayerProps["handleAddChairFromSchedule"],
    showToast: showToast as ScheduleModalsLayerProps["showToast"],
    editingDrawerShift:
      shiftDrawerCtrl.editingDrawerShift as ScheduleModalsLayerProps["editingDrawerShift"],
    setEditingDrawerShift:
      shiftDrawerCtrl.setEditingDrawerShift as ScheduleModalsLayerProps["setEditingDrawerShift"],
    isNewDrawerShift: shiftDrawerCtrl.isNewDrawerShift,
    onSaveDrawerShift:
      shiftDrawerCtrl.handleSaveDrawerShift as ScheduleModalsLayerProps["onSaveDrawerShift"],
    onDeleteDrawerShift:
      shiftDrawerCtrl.handleDeleteDrawerShift as ScheduleModalsLayerProps["onDeleteDrawerShift"],
    onCloseDoctorShiftDrawer: shiftDrawerCtrl.handleCloseDoctorShiftDrawer,
    isChairDateRangeModalOpen: shiftDrawerCtrl.isChairDateRangeModalOpen,
    setIsChairDateRangeModalOpen:
      shiftDrawerCtrl.setIsChairDateRangeModalOpen as ScheduleModalsLayerProps["setIsChairDateRangeModalOpen"],
    chairRangeDoctorId:
      shiftDrawerCtrl.chairRangeDoctorId as ScheduleModalsLayerProps["chairRangeDoctorId"],
    setChairRangeDoctorId:
      shiftDrawerCtrl.setChairRangeDoctorId as ScheduleModalsLayerProps["setChairRangeDoctorId"],
    chairRangeChairId:
      shiftDrawerCtrl.chairRangeChairId as ScheduleModalsLayerProps["chairRangeChairId"],
    setChairRangeChairId:
      shiftDrawerCtrl.setChairRangeChairId as ScheduleModalsLayerProps["setChairRangeChairId"],
    chairRangeStartDate:
      shiftDrawerCtrl.chairRangeStartDate as ScheduleModalsLayerProps["chairRangeStartDate"],
    setChairRangeStartDate:
      shiftDrawerCtrl.setChairRangeStartDate as ScheduleModalsLayerProps["setChairRangeStartDate"],
    chairRangeEndDate:
      shiftDrawerCtrl.chairRangeEndDate as ScheduleModalsLayerProps["chairRangeEndDate"],
    setChairRangeEndDate:
      shiftDrawerCtrl.setChairRangeEndDate as ScheduleModalsLayerProps["setChairRangeEndDate"],
    chairRangePreset:
      shiftDrawerCtrl.chairRangePreset as ScheduleModalsLayerProps["chairRangePreset"],
    setChairRangePreset:
      shiftDrawerCtrl.setChairRangePreset as ScheduleModalsLayerProps["setChairRangePreset"],
    onApplyChairDateRange:
      shiftDrawerCtrl.handleApplyChairDateRange as ScheduleModalsLayerProps["onApplyChairDateRange"],
  };

  return {
    headerToolbarProps,
    activeViewPortProps,
    modalsLayerProps,
  };
}
