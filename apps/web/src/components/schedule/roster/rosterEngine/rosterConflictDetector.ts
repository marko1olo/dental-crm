import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import { DEFAULT_CLINIC_STAFF, type StaffMember } from "../doctorShiftRosterPresets";
import type { DetectRosterConflictOptions, DoctorShift, RosterConflict } from "./rosterEngineTypes";
import { detectOverlapConflicts } from "./rosterOverlapConflicts";
import { detectWeeklyOvertimeConflicts } from "./rosterOvertimeConflicts";

export function detectRosterConflicts(
	shifts: DoctorShift[],
	staffList: StaffMember[] = isDemoShowcaseMode() ? DEFAULT_CLINIC_STAFF : [],
	options: DetectRosterConflictOptions = {},
): RosterConflict[] {
	const staffMap = new Map<string, StaffMember>(staffList.map((s) => [s.id, s]));

	const isPrivateOutpatient =
		options.practiceType === "private_outpatient" ||
		options.isPrivatePractice === true;

	const shouldCheckSurgeryAssistant =
		options.checkSurgeryAssistant !== undefined
			? options.checkSurgeryAssistant
			: !isPrivateOutpatient;

	const shouldCheckWeeklyOvertime =
		options.checkWeeklyOvertime !== undefined
			? options.checkWeeklyOvertime
			: !options.allowWeeklyOvertime && !isPrivateOutpatient;

	const activeShifts = shifts.filter(
		(s) => s.status !== "cancelled" && s.archetypeId !== "day_off" && s.durationHours > 0,
	);

	const shiftsByDate = new Map<string, DoctorShift[]>();
	for (const shift of activeShifts) {
		const list = shiftsByDate.get(shift.dateIso) || [];
		list.push(shift);
		shiftsByDate.set(shift.dateIso, list);
	}

	const overlapConflicts = detectOverlapConflicts(shiftsByDate, shouldCheckSurgeryAssistant);
	const overtimeConflicts = shouldCheckWeeklyOvertime
		? detectWeeklyOvertimeConflicts(activeShifts, staffMap)
		: [];

	return [...overlapConflicts, ...overtimeConflicts];
}
