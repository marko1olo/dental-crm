import type React from "react";
import type { Appointment, AppointmentReadiness, Dashboard } from "@dental/shared";
import type { QuickBookingSlotInfo } from "../../QuickBookingDrawer";
import type { TargetSlotInfo } from "../../waitlist/waitlistTypes";
import type {
  DoctorShift,
  StaffMember as RosterStaffMember,
  CabinetDefinition as RosterCabinetDefinition,
  DateRangeShiftPreset,
} from "../../roster/DoctorShiftRosterModal";
import type { QuickAddChairData } from "../../QuickAddChairModal";
import type { ChairDoctorShiftAssignment } from "../../grid/gridTypes";
import type { AppointmentScheduleDraft } from "../scheduleViewTypes";

export type {
  QuickBookingSlotInfo,
  TargetSlotInfo,
  DoctorShift,
  RosterStaffMember,
  RosterCabinetDefinition,
  DateRangeShiftPreset,
  QuickAddChairData,
};

export interface ScheduleLogicSlotConflict {
  message?: string | null | undefined;
  suggestedSlots?: readonly (string | { timeDisplay?: string; label?: string; startsAt?: string; endsAt?: string })[] | undefined;
  appointmentId?: string | undefined;
}

export interface ScheduleLogicContext {
  setDashboard?: React.Dispatch<React.SetStateAction<Dashboard>> | ((updater: (prev: Dashboard) => Dashboard) => void) | undefined;
  slotConflict?: ScheduleLogicSlotConflict | null | undefined;
  setSlotConflict?: ((conflict: ScheduleLogicSlotConflict | null) => void) | undefined;
  applySuggestedSlot?: ((slotTime: string, appointmentId?: string) => void) | undefined;
  loadDashboard?: (() => void | Promise<void>) | undefined;
}

export interface ScheduleViewModalsProps {
  isPendingOnlineBookingsOpen?: boolean;
  setIsPendingOnlineBookingsOpen?: (open: boolean) => void;
  pendingOnlineBookings?: Appointment[];
  quickBookingOpen: boolean;
  setQuickBookingOpen: (open: boolean) => void;
  quickBookingSlot: QuickBookingSlotInfo | null;
  setQuickBookingSlot: (slot: QuickBookingSlotInfo | null) => void;
  modalAppointment: Appointment | null;
  setModalAppointment: (app: Appointment | null) => void;
  doctorFreeSlotsOpen: boolean;
  setDoctorFreeSlotsOpen: (open: boolean) => void;
  preventiveInspectionOpen?: boolean | undefined;
  setPreventiveInspectionOpen?: ((open: boolean) => void) | undefined;
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
  auth?: { user?: { id?: string; name?: string; role?: string } | null } | null | undefined;
  loadDashboard?: () => void | Promise<void>;
  logicContext?: ScheduleLogicContext | null | undefined;
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
  formatTime: (iso: string) => string;
  patientName: (patients: Dashboard["patients"], id: string | null) => string;
  toDateTimeLocalValue: (iso: string) => string;
  fromDateTimeLocalValue: (val: string) => string;
  appointmentLabels: Record<string, string>;
  activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
  appointmentReadinessById: Map<string, AppointmentReadiness>;
  updateAppointmentScheduleDraft: <K extends keyof AppointmentScheduleDraft>(id: string, key: K, val: AppointmentScheduleDraft[K]) => void;
  saveAppointmentSchedule: (id: string, opts?: { closeEditorOnSave?: boolean; allowOverbooking?: boolean; allowEmergencyOverride?: boolean }) => Promise<boolean>;
  repeatAppointment: (app: Appointment) => void;
  copyAppointmentToBuffer: (app: Appointment) => Promise<void>;
  handleOpenWaitlistForSlot: (slot: TargetSlotInfo) => void;
  updateNewAppointmentDraft: <K extends keyof AppointmentScheduleDraft>(key: K, val: AppointmentScheduleDraft[K]) => void;
  focusNewAppointmentEditor: () => void;
  createAppointmentFromDraft: (opts?: { allowOverbooking?: boolean; allowEmergencyOverride?: boolean }) => Promise<boolean>;
  handleSaveDoctorShifts: (shifts: DoctorShift[]) => Promise<void>;
  handleAddChairFromSchedule: (chairData: QuickAddChairData) => Promise<void>;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", duration?: number) => void;
  editingDrawerShift?: Partial<DoctorShift> | null;
  setEditingDrawerShift?: React.Dispatch<React.SetStateAction<Partial<DoctorShift> | null>>;
  isNewDrawerShift?: boolean;
  onSaveDrawerShift?: (shift: DoctorShift, isNew: boolean) => void;
  onDeleteDrawerShift?: (shiftId: string) => void;
  onCloseDoctorShiftDrawer?: () => void;
  isChairDateRangeModalOpen?: boolean;
  setIsChairDateRangeModalOpen?: (open: boolean) => void;
  chairRangeDoctorId?: string;
  setChairRangeDoctorId?: (id: string) => void;
  chairRangeChairId?: string;
  setChairRangeChairId?: (id: string) => void;
  chairRangeStartDate?: string;
  setChairRangeStartDate?: (date: string) => void;
  chairRangeEndDate?: string;
  setChairRangeEndDate?: (date: string) => void;
  chairRangePreset?: DateRangeShiftPreset;
  setChairRangePreset?: (preset: DateRangeShiftPreset) => void;
  onApplyChairDateRange?: () => void;
}
