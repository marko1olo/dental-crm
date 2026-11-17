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
  effectiveChairs: Array<{ id: string; name: string; color?: string; [key: string]: unknown }>;
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
  doctors: Array<{ id: string; fullName: string; [key: string]: unknown }>;
  patientLookupMap: Map<string, unknown>;
  staffLookupMap: Map<string, unknown>;
  collisionMap: Map<string, unknown>;
  timezone: string;
  toDateTimeLocalValue: (iso: string, timezone?: string | null) => string;
  appointmentLabels: Record<Appointment["status"], string>;
  hoveredApptId: string | null;
  activeStatusPickerApptId: string | null;
  activeMenuApptId: string | null;
  onAppointmentClick: (appointment: Appointment) => void;
  onAppointmentDoubleClick?: ((appointment: Appointment) => void) | undefined;
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
    | ((
        appointmentId: string,
        updates: Partial<Appointment> & Record<string, unknown>,
      ) => Promise<unknown> | void)
    | undefined;
  onSlotClick: (slot: QuickBookingSlotInfo) => void;
  emergencyReserveSlots: Array<Record<string, unknown>>;
}

export interface SlotCellData {
  cellAppointments: Appointment[];
  continuingAppointments: Appointment[];
  cellMaintenance: ChairMaintenanceBlock[];
}

export interface AppointmentTrackController {
  effectiveDensityMode: ScheduleDensityMode;
  baseSlotHeightPx: number;
  handleSlotDrop: (e: React.DragEvent, chair: { id: string; [key: string]: unknown }, hour: string) => void;
  canSplitShift: boolean;
  morningSlots: string[];
  eveningSlots: string[];
  isSingleChair: boolean;
}
