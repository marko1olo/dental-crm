import type React from "react";
import type { Dashboard } from "@dental/shared";
import type { DateRangeShiftPreset } from "../roster/DoctorShiftRosterModal";
import type { ChairDoctorShiftAssignment } from "./ScheduleGrid";
import type { ScheduleChair } from "../ScheduleFilterStrip";
import type { QuickAddChairData } from "../QuickAddChairModal";

export interface UseChairShiftOperationsOptions {
  chairs: ScheduleChair[];
  doctors: Array<{ id: string; fullName: string; specialty?: any }>;
  dateKey: string;
  chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment>;
  onAssignChairDoctor?: (chairId: string, assignment: ChairDoctorShiftAssignment | null) => void;
  dashboard?: Dashboard | null;
  popoverSelectedDocId: Record<string, string>;
  rangeDoctorId: string;
  rangeChairId: string;
  rangeStartDate: string;
  rangeEndDate: string;
  rangePreset: DateRangeShiftPreset;
  setActiveShiftChairId: (id: string | null) => void;
  setIsSubstituteOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setIsDateRangeModalOpen: (open: boolean) => void;
  setEditingChair: (chair: QuickAddChairData | null) => void;
  setIsAddChairOpen: (open: boolean) => void;
}
