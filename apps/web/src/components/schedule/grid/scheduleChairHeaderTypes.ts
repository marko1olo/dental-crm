import type { Dashboard } from "@dental/shared";
import type { ChairDoctorShiftAssignment } from "./gridTypes";
import type { QuickAddChairData } from "../QuickAddChairModal";

export interface ScheduleChairHeaderProps {
  chair: any;
  chairIndex: number;
  dailyTally: any;
  effectiveChairAssignments: Record<string, ChairDoctorShiftAssignment>;
  doctors: Array<any>;
  suggestedDoctor: any | null;
  isSoloDoctor: boolean;
  dateKey: string;
  dashboard: Dashboard;
  isToday: boolean;
  currentHour: number;
  activeHeaderDoctorPopoverChairId: string | null;
  setActiveHeaderDoctorPopoverChairId: (id: string | null) => void;
  activeHeaderMaintenanceChairId: string | null;
  setActiveHeaderMaintenanceChairId: (id: string | null | ((prev: string | null) => string | null)) => void;
  onEditChair?: ((chairData: QuickAddChairData) => void) | undefined;
  openAssignModal: (chairId: string) => void;
  handleConfirmAssignDoctor: (chairId: string, docId: string, shiftPreset: any, eveningDocId?: string) => void;
  handleUnassignDoctor: (chairId: string) => void;
  handleAssignDoctorWeek: (chairId: string, docId: string, fullWeek?: boolean) => void;
  handleAssignDoctorMonth: (chairId: string, docId: string) => void;
  handleQuickSubstituteDoctor: (chairId: string, newDoctorId?: string) => void;
  handleBindDoctorToChair: (chairId: string, doctorId: string) => void;
  handleAddMaintenance: (chairId: string, reason: string, durationMinutes: number, startTimeStr?: string) => void;
}
