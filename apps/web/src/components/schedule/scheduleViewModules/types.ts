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
import type { ScheduleViewModalsProps } from "../view/scheduleModalsModules/scheduleModalsTypes";

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

export type ScheduleModalsLayerProps = ScheduleViewModalsProps;
