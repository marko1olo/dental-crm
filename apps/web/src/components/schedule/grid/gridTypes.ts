import type { Dashboard, Appointment } from "@dental/shared";
import type { QuickBookingSlotInfo } from "../QuickBookingDrawer";
import type { ChairMaintenanceBlock } from "../../../utils/scheduleCollisionUtils";
import type { QuickAddChairData } from "../QuickAddChairModal";
import type { QuickAddDoctorData } from "../QuickAddDoctorModal";
import type { TargetSlotInfo } from "../WaitlistDrawer";

export interface ChairDoctorSubShift {
  doctorId: string;
  doctorName: string;
  doctorSpecialty?: string | undefined;
  startHour: number;
  endHour: number;
  shiftHours: string;
}

export interface ChairDoctorShiftAssignment {
  chairId: string;
  chairName?: string | undefined;
  doctorId: string;
  doctorName: string;
  doctorSpecialty?: string | undefined;
  shiftPreset?:
    | "morning"
    | "morning_9"
    | "evening"
    | "evening_15"
    | "full"
    | "full_9_21"
    | "two_shifts"
    | "custom"
    | undefined;
  shiftLabel?: string | undefined;
  shiftHours: string;
  startHour?: number | undefined;
  endHour?: number | undefined;
  subShifts?: ChairDoctorSubShift[] | undefined;
}

export interface ScheduleGridProps {
  dashboard: Dashboard;
  dateKey: string;
  appointments: Appointment[];
  onSlotClick: (slot: QuickBookingSlotInfo) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onQuickStatusChange?:
    | ((appointmentId: string, status: Appointment["status"]) => void)
    | undefined;
  patientName?: (
    patients: Dashboard["patients"],
    patientId: string | null,
  ) => string;
  getPatientName?: (
    patients: Dashboard["patients"],
    patientId: string | null,
  ) => string;
  formatTime: (iso: string) => string;
  toDateTimeLocalValue: (iso: string, timezone?: string | null) => string;
  appointmentLabels: Record<Appointment["status"], string>;
  selectedChairId?: string | null | undefined;
  selectedDoctorId?: string | null | undefined;
  onAppointmentMove?:
    ((appointmentId: string, updates: any) => Promise<any> | void) | undefined;
  chairDoctorAssignments?:
    Record<string, ChairDoctorShiftAssignment> | undefined;
  onAssignChairDoctor?:
    | ((chairId: string, assignment: ChairDoctorShiftAssignment | null) => void)
    | undefined;
  onOpenAddChair?: (() => void) | undefined;
  onAddChair?:
    ((chairData: QuickAddChairData) => Promise<any> | any) | undefined;
  onEditChair?: ((chairData: QuickAddChairData) => void) | undefined;
  onAddDoctor?:
    ((doctorData: QuickAddDoctorData) => Promise<any> | any) | undefined;
  gridStepMinutes?: 15 | 30 | 60 | undefined;
  onGridStepChange?: ((step: 15 | 30 | 60) => void) | undefined;
  chairMaintenanceBlocks?: ChairMaintenanceBlock[] | undefined;
  onAddChairMaintenance?: ((block: ChairMaintenanceBlock) => void) | undefined;
  onRemoveChairMaintenance?: ((blockId: string) => void) | undefined;
  hideToolbar?: boolean | undefined;
  hideInlineAddChair?: boolean | undefined;
  onOpenWaitlistForSlot?: ((slot: TargetSlotInfo) => void) | undefined;
}
