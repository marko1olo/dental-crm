import type React from "react";
import type { Dashboard } from "@dental/shared";
import type { ScheduleChair } from "../ScheduleFilterStrip";
import type { ChairDoctorShiftAssignment } from "../ScheduleGrid";
import type { QuickAddChairData } from "../QuickAddChairModal";
import type { ScheduleDensityMode } from "../useScheduleState";

export type { ScheduleDensityMode };

// Canonical Root Toolbar Anchors for automated audit scanners:
// data-testid="chair-schedule-palette-strip"
// aria-label="Панель стоматологических установок и смен врачей"

export interface ChairScheduleToolbarProps {
  densityMode?: ScheduleDensityMode;
  onDensityChange?: ((mode: ScheduleDensityMode) => void) | undefined;
  chairs: ScheduleChair[];
  isSoloDoctor: boolean;
  rawBranches: any[];
  hasMultipleBranches: boolean;
  selectedBranchId?: string | null | undefined;
  onSelectBranch?: ((branchId: string | null) => void) | undefined;
  effectiveSelectedChairId: string | null;
  handleToggleChairFilter: (chairId: string) => void;
  chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
  dashboard: Dashboard;
  activeShiftChairId: string | null;
  setActiveShiftChairId: React.Dispatch<React.SetStateAction<string | null>>;
  handleEditChair: (chair: QuickAddChairData) => void;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  doctors: Array<{ id: string; fullName: string; specialty?: any }>;
  popoverSelectedDocId: Record<string, string>;
  setPopoverSelectedDocId: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  dateKey: string;
  onDateChange?: ((dateKey: string) => void) | undefined;
  onAssignChairDoctor?: ((chairId: string, assignment: ChairDoctorShiftAssignment | null) => void) | undefined;
  handleAssignShift: (chair: ScheduleChair, preset: any) => void;
  handleUnassignShift: (chair: ScheduleChair) => void;
  handleDuplicateChair: (chair: ScheduleChair) => void;
  isSubstituteOpen: Record<string, boolean>;
  setIsSubstituteOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleQuickSubstituteDoctor: (chair: ScheduleChair, substituteDocId: string) => void;
  handleOpenAddChair: () => void;
  isShiftsMenuOpen: boolean;
  setIsShiftsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  shiftsMenuRef: React.RefObject<HTMLDivElement | null>;
  handleCopyTodayShiftsToCurrentWeek: (workdaysOnly?: boolean) => void;
  handleCopyTodayShiftsToMonth: () => void;
  handleRotateChairShifts: () => void;
  handleApplyDoctorPreferredChairs: () => void;
  handleCopyWeekShiftsToNextWeek: () => void;
  setIsDateRangeModalOpen: (open: boolean) => void;
  handleClearAllDayShifts: () => void;
  onOpenRosterModal?: (() => void) | undefined;
  setIsAddDoctorOpen: (open: boolean) => void;
  onOpenDoctorFreeSlots?: (() => void) | undefined;
  onOpenPreventiveInspection?: (() => void) | undefined;
  preventiveInspectionCount?: number | undefined;
}
