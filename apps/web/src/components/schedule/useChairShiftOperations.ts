import { useCallback } from "react";
import type { ScheduleChair } from "./ScheduleFilterStrip";
import type { UseChairShiftOperationsOptions } from "./chairShiftOperations/chairShiftTypes";
import { performAssignShift, performUnassignShift } from "./chairShiftOperations/chairShiftAssigner";
import { performApplyDateRange } from "./chairShiftOperations/chairShiftRangeApplicator";
import {
  performCopyWeekShiftsToNextWeek,
  performCopyTodayShiftsToCurrentWeek,
  performCopyTodayShiftsToMonth,
} from "./chairShiftOperations/chairShiftCopyOperations";
import {
  performQuickSubstituteDoctor,
  performRotateChairShifts,
  performClearAllDayShifts,
  performDuplicateChair,
} from "./chairShiftOperations/chairShiftUtilityOperations";
import { performApplyDoctorPreferredChairs } from "./chairShiftOperations/chairShiftPreferredBinder";

export { type UseChairShiftOperationsOptions };

export function useChairShiftOperations(options: UseChairShiftOperationsOptions) {
  const {
    chairs, doctors, dateKey, chairDoctorAssignments, onAssignChairDoctor,
    dashboard, popoverSelectedDocId, rangeDoctorId, rangeChairId, rangeStartDate,
    rangeEndDate, rangePreset, setActiveShiftChairId, setIsSubstituteOpen,
    setIsDateRangeModalOpen, setEditingChair, setIsAddChairOpen,
  } = options;

  const handleAssignShift = useCallback(
    (chair: ScheduleChair, preset: any) => {
      performAssignShift(
        chair, preset, popoverSelectedDocId, chairDoctorAssignments, doctors,
        dateKey, dashboard, chairs, onAssignChairDoctor, setActiveShiftChairId,
      );
    },
    [chairs, chairDoctorAssignments, dashboard, dateKey, doctors, onAssignChairDoctor, popoverSelectedDocId, setActiveShiftChairId],
  );

  const handleApplyDateRange = useCallback(() => {
    performApplyDateRange({
      rangeDoctorId, rangeChairId, rangeStartDate, rangeEndDate, rangePreset,
      doctors, chairs, dashboard, dateKey, onAssignChairDoctor, setIsDateRangeModalOpen,
    });
  }, [chairs, dashboard, dateKey, doctors, onAssignChairDoctor, rangeChairId, rangeDoctorId, rangeEndDate, rangePreset, rangeStartDate, setIsDateRangeModalOpen]);

  const handleCopyWeekShiftsToNextWeek = useCallback(() => {
    performCopyWeekShiftsToNextWeek(dateKey, chairs, chairDoctorAssignments);
  }, [chairDoctorAssignments, chairs, dateKey]);

  const handleCopyTodayShiftsToCurrentWeek = useCallback(
    (workdaysOnly = false) => {
      performCopyTodayShiftsToCurrentWeek(dateKey, chairs, chairDoctorAssignments, workdaysOnly);
    },
    [chairDoctorAssignments, chairs, dateKey],
  );

  const handleCopyTodayShiftsToMonth = useCallback(() => {
    performCopyTodayShiftsToMonth(dateKey, chairs, chairDoctorAssignments);
  }, [chairDoctorAssignments, chairs, dateKey]);

  const handleQuickSubstituteDoctor = useCallback(
    (chair: ScheduleChair, newDoctorId: string) => {
      performQuickSubstituteDoctor(
        chair, newDoctorId, doctors, dashboard, chairDoctorAssignments,
        chairs, dateKey, onAssignChairDoctor, setIsSubstituteOpen, setActiveShiftChairId,
      );
    },
    [chairDoctorAssignments, chairs, dashboard, dateKey, doctors, onAssignChairDoctor, setActiveShiftChairId, setIsSubstituteOpen],
  );

  const handleRotateChairShifts = useCallback(() => {
    performRotateChairShifts(chairs, chairDoctorAssignments, dateKey, onAssignChairDoctor);
  }, [chairDoctorAssignments, chairs, dateKey, onAssignChairDoctor]);

  const handleClearAllDayShifts = useCallback(() => {
    performClearAllDayShifts(dateKey, chairs, onAssignChairDoctor);
  }, [chairs, dateKey, onAssignChairDoctor]);

  const handleApplyDoctorPreferredChairs = useCallback(() => {
    performApplyDoctorPreferredChairs(chairs, doctors, dashboard, dateKey, onAssignChairDoctor);
  }, [chairs, dashboard, dateKey, doctors, onAssignChairDoctor]);

  const handleDuplicateChair = useCallback(
    (chair: ScheduleChair) => {
      performDuplicateChair(chair, setEditingChair, setIsAddChairOpen, setActiveShiftChairId);
    },
    [setActiveShiftChairId, setEditingChair, setIsAddChairOpen],
  );

  const handleUnassignShift = useCallback(
    (chair: ScheduleChair) => {
      performUnassignShift(chair, dateKey, chairs, onAssignChairDoctor, setActiveShiftChairId);
    },
    [chairs, dateKey, onAssignChairDoctor, setActiveShiftChairId],
  );

  return {
    handleAssignShift,
    handleApplyDateRange,
    handleCopyWeekShiftsToNextWeek,
    handleCopyTodayShiftsToCurrentWeek,
    handleCopyTodayShiftsToMonth,
    handleQuickSubstituteDoctor,
    handleRotateChairShifts,
    handleClearAllDayShifts,
    handleApplyDoctorPreferredChairs,
    handleDuplicateChair,
    handleUnassignShift,
  };
}
