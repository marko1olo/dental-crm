import type {
  Appointment,
  AppointmentReadiness,
  Dashboard,
  ScheduleSuggestion,
  StaffRole,
} from "@dental/shared";
import type { ReactNode } from "react";
import type {
  AppointmentScheduleDraft,
  AppointmentScheduleSaveState,
  TextFieldChangeEvent,
  SelectChangeEvent,
} from "../view/scheduleViewTypes";
import type { QuickBookingSlotInfo } from "../QuickBookingDrawer";
import type { QuickAddChairData } from "../QuickAddChairModal";
import type { TargetSlotInfo } from "../WaitlistDrawer";
import type {
  DateRangeShiftPreset,
  DoctorShift,
} from "../roster/DoctorShiftRosterModal";
import type { DayGroupingAppointment } from "../scheduleDayGrouping";

// Re-export core types for consumers
export type {
  AppointmentScheduleDraft,
  AppointmentScheduleSaveState,
  TextFieldChangeEvent,
  SelectChangeEvent,
  QuickBookingSlotInfo,
  QuickAddChairData,
  TargetSlotInfo,
  DateRangeShiftPreset,
  DoctorShift,
  DayGroupingAppointment,
};

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

export type ScheduleHeaderToolbarProps = {
  clinicToday: string;
  scheduleDateFilter: string;
  setScheduleDateFilter: (date: string) => void;
  stepScheduleDay: (delta: number) => void;
  activeScheduleFilterCount: number;
  resetScheduleFilters: () => void;
  dashboard: Dashboard;
  scheduleDoctorFilterId: string | null;
  setScheduleDoctorFilterId: (id: string | null) => void;
  scheduleChairFilterId: string | null;
  setScheduleChairFilterId: (id: string | null) => void;
  scheduleStatusFilter: Appointment["status"] | "all";
  shiftQueueCounts: Record<string, number>;
  setScheduleStatusFilter: (status: string) => void;
  computedChairDoctorAssignments: any;
  scheduleViewMode: "timeline" | "grid" | "chairs";
  setScheduleViewMode: (mode: "timeline" | "grid" | "chairs") => void;
  scheduleGridStep: 15 | 30 | 60;
  setScheduleGridStep: (step: 15 | 30 | 60) => void;
  scheduleFilterSummaryNode: ReactNode;
  isSmartAiOpen: boolean;
  setIsSmartAiOpen: (open: boolean) => void;
  setDoctorFreeSlotsOpen: (open: boolean) => void;
  onOpenPreventiveInspection: () => void;
  preventiveInspectionCount: number;
  setIsPatientSearchOpen: (open: boolean) => void;
  handleEmergencyCitoBooking: () => void;
  showShiftAnalytics: boolean;
  setShowShiftAnalytics: (show: boolean) => void;
  setIsRosterModalOpen: (open: boolean) => void;
  setWaitlistOpen: (open: boolean) => void;
  waitlistCount: number;
  showConfirmationsPanel: boolean;
  setShowConfirmationsPanel: (show: boolean) => void;
  showFreedSlotsPanel: boolean;
  setShowFreedSlotsPanel: (show: boolean) => void;
  showClipboardPanel: boolean;
  setShowClipboardPanel: (show: boolean) => void;
  setIsCalendarSyncModalOpen: (open: boolean) => void;
  setIsTomorrowRemindersOpen: (open: boolean) => void;
  setIsQuickAddChairOpen: (open: boolean) => void;
  handleAddChairFromSchedule: any;
  setQuickBookingSlot: (slot: QuickBookingSlotInfo | null) => void;
  setQuickBookingOpen: (open: boolean) => void;
  todayScheduleDate: () => string;
  clipboardReloadToken: number;
  loadDashboard?: ((options?: { adminSecret?: string }) => Promise<void>) | undefined;
  shiftWarnings?: Dashboard["shiftIntelligence"]["scheduleWarnings"] | undefined;
  openScheduleWarning?: ((
    warning: Dashboard["shiftIntelligence"]["scheduleWarnings"][number],
  ) => void) | undefined;
  onOpenDoctorShiftDrawer?: ((shiftToEdit?: Partial<DoctorShift> | null) => void) | undefined;
  onOpenChairDateRangeModal?: (() => void) | undefined;
  pendingOnlineBookingsCount?: number | undefined;
  onOpenPendingOnlineBookings?: (() => void) | undefined;

  // Admin secret props
  scheduleAdminSecretNeeded: boolean;
  scheduleAdminSecretSession: string;
  scheduleAdminSecretDraft: string;
  setScheduleAdminSecretDraft: (draft: string) => void;
  scheduleAdminSecretReason: string;
  adminSecretReady: boolean;
  unlockScheduleAdminSession: () => void;
  lockScheduleAdminSession: () => void;
  showToast: any;

  // NewAppointmentForm props
  appointmentLabels: Record<Appointment["status"], string>;
  newAppointmentDraft: AppointmentScheduleDraft;
  newAppointmentSaveState: AppointmentScheduleSaveState;
  newAppointmentError: string | null;
  updateNewAppointmentDraft: (k: unknown, v: unknown) => void;
  createAppointmentFromDraft: (options?: {
    allowOverbooking?: boolean;
    allowEmergencyOverride?: boolean;
  }) => Promise<boolean>;
  resetNewAppointmentDraft: () => void;
  toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
  fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
  useManualSelects: boolean;
  setUseManualSelects: (use: boolean) => void;
  showCreateForm: boolean;
  setShowCreateForm: (show: boolean) => void;
};

export type ScheduleActiveViewPortProps = {
  scheduleViewMode: "timeline" | "grid" | "chairs";
  dashboard: Dashboard;
  scheduleDateFilter: string;
  clinicToday: string;
  todayScheduleDate: () => string;
  scheduleGridStep: 15 | 30 | 60;
  setScheduleGridStep: (step: 15 | 30 | 60) => void;
  computedChairDoctorAssignments: any;
  savedDoctorShifts: DoctorShift[];
  handleAssignChairDoctor: any;
  handleAddChairFromSchedule: any;
  handleAddDoctorFromSchedule: any;
  handleEditChairFromSchedule: (chair: QuickAddChairData) => void;
  handleOpenWaitlistForSlot: (slot: TargetSlotInfo) => void;
  setIsRosterModalOpen: (open: boolean) => void;
  setScheduleChairFilterId: (id: string | null) => void;
  scheduleChairFilterId: string | null;
  scheduleDoctorFilterId: string | null;
  setQuickBookingSlot: (slot: QuickBookingSlotInfo | null) => void;
  setQuickBookingOpen: (open: boolean) => void;
  setModalAppointment: (appointment: Appointment | null) => void;
  updateAppointmentScheduleDraft: <K extends keyof AppointmentScheduleDraft>(
    appointmentId: string,
    key: K,
    value: AppointmentScheduleDraft[K],
  ) => void;
  saveAppointmentSchedule: (
    appointmentId: string,
    options?: {
      closeEditorOnSave?: boolean;
      allowOverbooking?: boolean;
      allowEmergencyOverride?: boolean;
    },
  ) => Promise<boolean>;
  patientName: (patients: Dashboard["patients"], patientId: string | null) => string;
  formatTime: (value: string) => string;
  toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
  fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
  appointmentLabels: Record<Appointment["status"], string>;
  showToast: any;
  setEditingChairData: (data: QuickAddChairData | null) => void;
  setIsQuickAddChairOpen: (open: boolean) => void;
  visibleDayGroups: any;
  visibleScheduleSuggestions: ScheduleSuggestion[];
  appointmentReadinessById: Map<string, AppointmentReadiness>;
  appointmentScheduleDrafts: Record<string, AppointmentScheduleDraft>;
  appointmentScheduleSaveStates: Record<string, AppointmentScheduleSaveState>;
  appointmentScheduleErrors: Record<string, string | null>;
  appointmentScheduleDirtyIds: Set<string>;
  editingAppointmentId: string | null;
  appointmentScheduleDraftFromAppointment: (appointment: Appointment) => AppointmentScheduleDraft;
  appointmentDraftMissingSteps: (draft: AppointmentScheduleDraft) => string[];
  activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
  openScheduleSuggestion: (section: string) => void;
  openAppointmentEditor: (appointment: Appointment) => void;
  repeatAppointment: (appointment: Appointment) => void;
  copyAppointmentToBuffer: (appointment: Appointment) => void;
  closeAppointmentEditor: (appointmentId: string) => void;
  normalizedAppointmentStatus: (
    value: unknown,
    fallback?: Appointment["status"],
  ) => Appointment["status"];
  useManualSelects: boolean;
  stepScheduleDay: (delta: number) => void;
  activeScheduleFilterCount: number;
  resetScheduleFilters: () => void;
  setScheduleDateFilter: (date: string) => void;
};

export type ScheduleModalsLayerProps = {
  quickBookingOpen: boolean;
  setQuickBookingOpen: (open: boolean) => void;
  quickBookingSlot: QuickBookingSlotInfo | null;
  setQuickBookingSlot: (slot: QuickBookingSlotInfo | null) => void;
  modalAppointment: Appointment | null;
  setModalAppointment: (appointment: Appointment | null) => void;
  doctorFreeSlotsOpen: boolean;
  setDoctorFreeSlotsOpen: (open: boolean) => void;
  preventiveInspectionOpen: boolean;
  setPreventiveInspectionOpen: (open: boolean) => void;
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
  isPendingOnlineBookingsOpen?: boolean | undefined;
  setIsPendingOnlineBookingsOpen?: ((open: boolean) => void) | undefined;
  pendingOnlineBookings?: Appointment[] | undefined;
  dashboard: Dashboard;
  auth: any;
  loadDashboard?: ((options?: { adminSecret?: string }) => Promise<void>) | undefined;
  logicContext: any;
  scheduleDoctorFilterId: string | null;
  scheduleChairFilterId: string | null;
  scheduleDateFilter: string;
  clinicToday: string;
  todayScheduleDate: () => string;
  computedChairDoctorAssignments: any;
  savedDoctorShifts: DoctorShift[];
  rosterStaffList: any[];
  rosterCabinets: any[];
  rosterAppointments: any[];
  scheduleDoctors: any[];
  currentDateKey: string;
  formatTime: (value: string) => string;
  patientName: (patients: Dashboard["patients"], patientId: string | null) => string;
  toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
  fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
  appointmentLabels: Record<Appointment["status"], string>;
  activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
  appointmentReadinessById: Map<string, AppointmentReadiness>;
  updateAppointmentScheduleDraft: <K extends keyof AppointmentScheduleDraft>(
    appointmentId: string,
    key: K,
    value: AppointmentScheduleDraft[K],
  ) => void;
  saveAppointmentSchedule: (
    appointmentId: string,
    options?: {
      closeEditorOnSave?: boolean;
      allowOverbooking?: boolean;
      allowEmergencyOverride?: boolean;
    },
  ) => Promise<boolean>;
  repeatAppointment: (appointment: Appointment) => void;
  copyAppointmentToBuffer: (appointment: Appointment) => void;
  handleOpenWaitlistForSlot: (slot: TargetSlotInfo) => void;
  updateNewAppointmentDraft: <K extends keyof AppointmentScheduleDraft>(
    key: K,
    value: AppointmentScheduleDraft[K],
  ) => void;
  focusNewAppointmentEditor: () => void;
  createAppointmentFromDraft: (options?: {
    allowOverbooking?: boolean;
    allowEmergencyOverride?: boolean;
  }) => Promise<boolean>;
  handleSaveDoctorShifts: (shifts: DoctorShift[]) => Promise<void>;
  handleAddChairFromSchedule: any;
  showToast: any;
  editingDrawerShift: Partial<DoctorShift> | null;
  setEditingDrawerShift: (shift: Partial<DoctorShift> | null) => void;
  isNewDrawerShift: boolean;
  onSaveDrawerShift: (shift: DoctorShift, isNew: boolean) => void;
  onDeleteDrawerShift: (shiftId: string) => void;
  onCloseDoctorShiftDrawer: () => void;
  isChairDateRangeModalOpen: boolean;
  setIsChairDateRangeModalOpen: (open: boolean) => void;
  chairRangeDoctorId: string;
  setChairRangeDoctorId: (id: string) => void;
  chairRangeChairId: string;
  setChairRangeChairId: (id: string) => void;
  chairRangeStartDate: string;
  setChairRangeStartDate: (date: string) => void;
  chairRangeEndDate: string;
  setChairRangeEndDate: (date: string) => void;
  chairRangePreset: DateRangeShiftPreset;
  setChairRangePreset: (preset: DateRangeShiftPreset) => void;
  onApplyChairDateRange: () => void;
};
