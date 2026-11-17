import type { Dashboard } from "@dental/shared";
import type { ChairDoctorShiftAssignment } from "./gridTypes";
import type { QuickAddChairData } from "../QuickAddChairModal";

export interface ScheduleChairItem {
  id: string;
  name: string;
  color?: string | null;
  colorId?: string | number;
  room?: string | null;
  roomNumber?: string | null;
  branchId?: string | null;
  specialization?: string | null;
  active?: boolean;
  isActive?: boolean;
  hasXraySensor?: boolean;
  hasMicroscope?: boolean;
  hasSurgeryKit?: boolean;
  [key: string]: unknown;
}

export interface ScheduleChairHeaderProps {
  chair: ScheduleChairItem;
  chairIndex: number;
  dailyTally?: { totalMinutes?: number; revenueKopecks?: bigint | number; count?: number } | unknown;
  effectiveChairAssignments: Record<string, ChairDoctorShiftAssignment>;
  doctors: Array<{ id: string; fullName: string; role?: string; specialties?: string[] }>;
  suggestedDoctor: { id: string; fullName: string; role?: string } | null;
  isSoloDoctor: boolean;
  dateKey: string;
  dashboard: Dashboard;
  isToday: boolean;
  currentHour: number;
  activeHeaderDoctorPopoverChairId: string | null;
  setActiveHeaderDoctorPopoverChairId: (id: string | null) => void;
  activeHeaderMaintenanceChairId?: string | null | undefined;
  setActiveHeaderMaintenanceChairId?: ((id: string | null | ((prev: string | null) => string | null)) => void) | undefined;
  onEditChair?: ((chairData: QuickAddChairData) => void) | undefined;
  openAssignModal: (chairId: string) => void;
  handleConfirmAssignDoctor: (chairId: string, docId: string, shiftPreset: string | unknown, eveningDocId?: string) => void;
  handleUnassignDoctor: (chairId: string) => void;
  handleAssignDoctorWeek: (chairId: string, docId: string, fullWeek?: boolean) => void;
  handleAssignDoctorMonth: (chairId: string, docId: string) => void;
  handleQuickSubstituteDoctor: (chairId: string, newDoctorId?: string) => void;
  handleBindDoctorToChair: (chairId: string, doctorId: string) => void;
  handleAddMaintenance?: ((chairId: string, reason: string, durationMinutes: number, startTimeStr?: string) => void) | undefined;
}
