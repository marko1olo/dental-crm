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
import type { TargetSlotInfo } from "../waitlist/WaitlistDrawer";
import type {
  DateRangeShiftPreset,
  DoctorShift,
  StaffMember as RosterStaffMember,
  CabinetDefinition as RosterCabinetDefinition,
} from "../roster/DoctorShiftRosterModal";
import type { DayGroupingAppointment } from "../scheduleDayGrouping";
import type { ChairDoctorShiftAssignment } from "../grid/gridTypes";
import type { ScheduleViewBodyProps } from "../view/ScheduleViewBody";
import type { ScheduleViewToolbarProps } from "../view/scheduleViewToolbarTypes";

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

export type ScheduleHeaderToolbarProps = ScheduleViewToolbarProps & {
  dashboard: Dashboard;
  scheduleStatusFilter: Appointment["status"] | "all";
  setScheduleStatusFilter: (status: string) => void;
  onOpenPreventiveInspection: () => void;
  preventiveInspectionCount: number;

  // Admin secret props
  scheduleAdminSecretNeeded: boolean;
  scheduleAdminSecretSession: string;
  scheduleAdminSecretDraft: string;
  setScheduleAdminSecretDraft: (draft: string) => void;
  scheduleAdminSecretReason: string;
  adminSecretReady: boolean;
  unlockScheduleAdminSession: () => void;
  lockScheduleAdminSession: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", duration?: number) => void;

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

export type ScheduleActiveViewPortProps = ScheduleViewBodyProps;

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
  auth?: { user?: { id?: string; name?: string; role?: string } | null } | null | undefined;
  loadDashboard?: ((options?: { adminSecret?: string }) => Promise<void>) | undefined;
  logicContext?: {
    setDashboard?: React.Dispatch<React.SetStateAction<Dashboard>> | ((updater: (prev: Dashboard) => Dashboard) => void);
  } | null | undefined;
  scheduleDoctorFilterId: string | null;
  scheduleChairFilterId: string | null;
  scheduleDateFilter: string;
  clinicToday: string;
  todayScheduleDate: () => string;
  computedChairDoctorAssignments: Record<string, ChairDoctorShiftAssignment>;
  savedDoctorShifts: DoctorShift[];
  rosterStaffList: RosterStaffMember[];
  rosterCabinets: RosterCabinetDefinition[];
  rosterAppointments: Appointment[];
  scheduleDoctors: Array<{ id: string; name?: string; fullName?: string; role?: string }>;
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
  handleAddChairFromSchedule: (chairData: QuickAddChairData) => Promise<void>;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", duration?: number) => void;
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
