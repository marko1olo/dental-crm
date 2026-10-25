import type { Dashboard } from "@dental/shared";
import type { QuickAddChairData } from "./QuickAddChairModal";
import {
	type ChairDoctorShiftAssignment,
	type ChairDoctorSubShift,
} from "./ScheduleGrid";
import { type ScheduleChair } from "./ScheduleFilterStrip";
import { resolveChairDutyDoctor } from "./QuickBookingDrawer";
import { syncShiftsWithServer, type SyncShiftPayload } from "./chairRosterMath";
import { computeShiftAssignment, type ShiftPresetType } from "./scheduleShiftHelpers";
import {
	matchWaitlistCandidatesForSlot,
	type MatchWaitlistSlotParams,
	type SmartSlotCandidateMatch,
	type SmartSlotRecoveryResult,
} from "./smartSlotRecoveryEngine";
import { useChairSlotsLoader } from "./scheduleHooks/useChairSlotsLoader";
import { useChairAssignmentsState } from "./scheduleHooks/useChairAssignmentsState";
import { useSingleShiftAssigner } from "./scheduleHooks/useSingleShiftAssigner";
import { useDateRangeShiftAssigner } from "./scheduleHooks/useDateRangeShiftAssigner";
import { useShiftCopyActions } from "./scheduleHooks/useShiftCopyActions";
import { useChairEntityOperations } from "./scheduleHooks/useChairEntityOperations";
import { useAppointmentSlotMovement } from "./scheduleHooks/useAppointmentSlotMovement";

export {
	resolveChairDutyDoctor, syncShiftsWithServer, computeShiftAssignment, matchWaitlistCandidatesForSlot,
	type MatchWaitlistSlotParams, type SmartSlotCandidateMatch, type SmartSlotRecoveryResult,
	type ChairDoctorShiftAssignment, type ChairDoctorSubShift, type ScheduleChair,
	type QuickAddChairData, type SyncShiftPayload, type ShiftPresetType,
};

export interface UseScheduleOptions {
	dashboard?: Dashboard | undefined;
	dateKey?: string | undefined;
	selectedChairId?: string | null | undefined;
	selectedDoctorId?: string | null | undefined;
	chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
	onAssignChairDoctor?: ((chairId: string, assignment: ChairDoctorShiftAssignment | null) => void) | undefined;
	onAddChair?: ((chairData: QuickAddChairData) => Promise<void> | void) | undefined;
	onSelectChair?: ((chairId: string | null) => void) | undefined;
	onAppointmentMove?: ((appointmentId: string, updates: any) => Promise<any> | void) | undefined;
}

export function useSchedule(options: UseScheduleOptions = {}) {
	const {
		dashboard, dateKey = new Date().toISOString().slice(0, 10),
		selectedChairId, chairDoctorAssignments: externalChairAssignments,
		onAssignChairDoctor, onAddChair, onSelectChair, onAppointmentMove,
	} = options;

	const {
		chairs, isSoloDoctor, doctors, effectiveSelectedChairId, setInternalSelectedChairId, toggleChairFilter,
	} = useChairSlotsLoader({ dashboard, selectedChairId, onSelectChair });

	const { setLocalAssignments, effectiveChairDoctorAssignments } = useChairAssignmentsState({
		dateKey, externalChairAssignments,
	});

	const { assignShift, quickSubstituteDoctor } = useSingleShiftAssigner({
		dateKey, doctors, chairs, dashboard, effectiveChairDoctorAssignments, setLocalAssignments, onAssignChairDoctor,
	});

	const { assignDateRange } = useDateRangeShiftAssigner({
		dateKey, doctors, chairs, dashboard, setLocalAssignments, onAssignChairDoctor,
	});

	const { copyWeekShiftsToNextWeek, copyTodayShiftsToCurrentWeek, copyTodayShiftsToMonth } = useShiftCopyActions({
		dateKey, chairs, effectiveChairDoctorAssignments,
	});

	const { saveChair, duplicateChair } = useChairEntityOperations({
		chairs, dashboard, onAddChair, assignShift, onAssignChairDoctor,
	});

	const { resolveDutyDoctorForSlot, moveAppointment, findSmartSlotRecoveryCandidates } = useAppointmentSlotMovement({
		chairs, doctors, dashboard, dateKey, effectiveChairDoctorAssignments, onAppointmentMove,
	});

	return {
		chairs, isSoloDoctor, doctors, selectedChairId: effectiveSelectedChairId,
		setSelectedChairId: setInternalSelectedChairId, toggleChairFilter,
		chairDoctorAssignments: effectiveChairDoctorAssignments,
		assignShift, assignDateRange, quickSubstituteDoctor, copyWeekShiftsToNextWeek,
		copyTodayShiftsToCurrentWeek, copyTodayShiftsToMonth, saveChair, duplicateChair,
		resolveDutyDoctorForSlot, moveAppointment, findSmartSlotRecoveryCandidates,
	};
}

export default useSchedule;
