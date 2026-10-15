import type React from "react";
import type { Appointment, Dashboard } from "@dental/shared";
import type { QuickBookingSlotInfo } from "../../QuickBookingDrawer";
import type { TargetSlotInfo } from "../../WaitlistDrawer";
import type {
  DoctorShift,
  StaffMember as RosterStaffMember,
  CabinetDefinition as RosterCabinetDefinition,
  DateRangeShiftPreset,
} from "../../roster/DoctorShiftRosterModal";
import type { QuickAddChairData } from "../../QuickAddChairModal";

export type {
  QuickBookingSlotInfo,
  TargetSlotInfo,
  DoctorShift,
  RosterStaffMember,
  RosterCabinetDefinition,
  DateRangeShiftPreset,
  QuickAddChairData,
};

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
  auth: any;
  loadDashboard?: () => void | Promise<void>;
  logicContext: any;
  scheduleDoctorFilterId: string | null;
  scheduleChairFilterId: string | null;
  scheduleDateFilter: string;
  clinicToday: string;
  todayScheduleDate: () => string;
  computedChairDoctorAssignments: any;
  savedDoctorShifts: DoctorShift[];
  rosterStaffList: RosterStaffMember[];
  rosterCabinets: RosterCabinetDefinition[];
  rosterAppointments: any[];
  scheduleDoctors: any[];
  currentDateKey: string;
  formatTime: (iso: string) => string;
  patientName: (patients: any[], id: string | null) => string;
  toDateTimeLocalValue: (iso: string) => string;
  fromDateTimeLocalValue: (val: string) => string;
  appointmentLabels: Record<string, string>;
  activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
  appointmentReadinessById: Map<string, any>;
  updateAppointmentScheduleDraft: (id: string, key: any, val: any) => void;
  saveAppointmentSchedule: (id: string, opts?: any) => Promise<boolean>;
  repeatAppointment: (app: Appointment) => void;
  copyAppointmentToBuffer: (app: Appointment) => Promise<void>;
  handleOpenWaitlistForSlot: (slot: TargetSlotInfo) => void;
  updateNewAppointmentDraft: (key: string, val: any) => void;
  focusNewAppointmentEditor: () => void;
  createAppointmentFromDraft: (opts?: any) => Promise<any>;
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
