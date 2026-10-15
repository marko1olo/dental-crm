import type React from "react";
import type {
  Appointment,
  Dashboard,
} from "@dental/shared";
import type { ChairMaintenanceBlock } from "../../../../utils/scheduleCollisionUtils";
import type { ChairDoctorShiftAssignment } from "../gridTypes";
import type { QuickBookingSlotInfo } from "../../QuickBookingDrawer";
import type { ScheduleDensityMode } from "../../useScheduleState";

export interface ScheduleAppointmentTrackProps {
  densityMode?: ScheduleDensityMode;
  timeSlots: string[];
  gridStep: 15 | 30 | 60;
  effectiveChairs: Array<any>;
  dateKey: string;
  chairSlotCellMap: Map<
    string,
    {
      cellAppointments: Appointment[];
      continuingAppointments: Appointment[];
      cellMaintenance: ChairMaintenanceBlock[];
    }
  >;
  EMPTY_SLOT_CELL_DATA?: {
    cellAppointments: Appointment[];
    continuingAppointments: Appointment[];
    cellMaintenance: ChairMaintenanceBlock[];
  } | undefined;
  patientName: (
    patients: Dashboard["patients"],
    patientId: string | null,
  ) => string;
  dashboard: Dashboard;
  handleRemoveMaintenance: (blockId: string) => void;
  doctors: Array<any>;
  patientLookupMap: Map<string, any>;
  staffLookupMap: Map<string, any>;
  collisionMap: Map<string, any>;
  timezone: string;
  toDateTimeLocalValue: (iso: string, timezone?: string | null) => string;
  appointmentLabels: Record<Appointment["status"], string>;
  hoveredApptId: string | null;
  activeStatusPickerApptId: string | null;
  activeMenuApptId: string | null;
  onAppointmentClick: (appointment: Appointment) => void;
  handleSelectMobileAppt: (appt: Appointment) => void;
  onQuickStatusChange?:
    | ((appointmentId: string, status: Appointment["status"]) => void)
    | undefined;
  handleAdjustAppointmentDuration: (appt: Appointment, delta: number) => void;
  handleShiftAppointmentLateness: (appt: Appointment, shift: number) => void;
  handleReassignAppointmentChair: (appt: Appointment, chairId: string | null) => void;
  handleReassignAppointmentDoctor: (appt: Appointment, docId: string) => void;
  handleFreeSlotToWaitlist: (appt: Appointment) => void;
  handleAppointmentMouseEnter: (id: string) => void;
  handleAppointmentMouseLeave: () => void;
  handleKeepHovered: (id: string) => void;
  handleToggleStatusPicker: (id: string) => void;
  handleToggleMenu: (id: string) => void;
  handleCloseStatusPicker: () => void;
  handleCloseMenu: () => void;
  appointments: Appointment[];
  getDoctorForChairAndHour: (chairId: string, hourStr: string) => string | null;
  selectedDoctorId?: string | null | undefined;
  effectiveChairAssignments: Record<string, ChairDoctorShiftAssignment>;
  effectiveMaintenanceBlocks: ChairMaintenanceBlock[];
  onAppointmentMove?:
    | ((appointmentId: string, updates: any) => Promise<any> | void)
    | undefined;
  onSlotClick: (slot: QuickBookingSlotInfo) => void;
  emergencyReserveSlots: Array<any>;
}

export interface SlotCellData {
  cellAppointments: Appointment[];
  continuingAppointments: Appointment[];
  cellMaintenance: ChairMaintenanceBlock[];
}

export interface AppointmentTrackController {
  effectiveDensityMode: ScheduleDensityMode;
  baseSlotHeightPx: number;
  handleSlotDrop: (e: React.DragEvent, chair: any, hour: string) => void;
  canSplitShift: boolean;
  morningSlots: string[];
  eveningSlots: string[];
  isSingleChair: boolean;
}
