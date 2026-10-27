import type { StaffMember } from "../doctorShiftRosterPresets";
import type { DoctorShift, RosterConflict } from "./rosterEngineTypes";
import { getIsoWeekKey } from "./rosterTimeMath";

interface WeeklyStaffHours {
	totalHours: number;
	shiftIds: string[];
	dates: string[];
}

export function detectWeeklyOvertimeConflicts(
	activeShifts: DoctorShift[],
	staffMap: Map<string, StaffMember>,
): RosterConflict[] {
	const conflicts: RosterConflict[] = [];
	const weeklyHoursByStaff = new Map<string, Map<string, WeeklyStaffHours>>();

	for (const shift of activeShifts) {
		const weekKey = getIsoWeekKey(shift.dateIso);

		let docStaffMap = weeklyHoursByStaff.get(shift.doctorId);
		if (!docStaffMap) {
			docStaffMap = new Map();
			weeklyHoursByStaff.set(shift.doctorId, docStaffMap);
		}
		const docWeek = docStaffMap.get(weekKey) || { totalHours: 0, shiftIds: [], dates: [] };
		docWeek.totalHours += shift.durationHours;
		docWeek.shiftIds.push(shift.id);
		if (!docWeek.dates.includes(shift.dateIso)) docWeek.dates.push(shift.dateIso);
		docStaffMap.set(weekKey, docWeek);

		if (shift.assistantId) {
			let asstStaffMap = weeklyHoursByStaff.get(shift.assistantId);
			if (!asstStaffMap) {
				asstStaffMap = new Map();
				weeklyHoursByStaff.set(shift.assistantId, asstStaffMap);
			}
			const asstWeek = asstStaffMap.get(weekKey) || { totalHours: 0, shiftIds: [], dates: [] };
			asstWeek.totalHours += shift.durationHours;
			asstWeek.shiftIds.push(shift.id);
			if (!asstWeek.dates.includes(shift.dateIso)) asstWeek.dates.push(shift.dateIso);
			asstStaffMap.set(weekKey, asstWeek);
		}
	}

	for (const [staffId, weeksMap] of weeklyHoursByStaff.entries()) {
		const staff = staffMap.get(staffId);
		const weeklyLimit = staff ? staff.weeklyHourLimit : 33;

		for (const [weekKey, record] of weeksMap.entries()) {
			if (record.totalHours > weeklyLimit) {
				const excess = Math.round((record.totalHours - weeklyLimit) * 10) / 10;
				const staffName = staff?.shortName || staffId;
				conflicts.push({
					id: `overtime-${staffId}-${weekKey}`,
					type: "weekly_overtime_tk_rf",
					severity: "warning",
					message: `Сверх нормы: ${staffName} ${record.totalHours.toFixed(1)} ч (норма: ${weeklyLimit} ч, +${excess.toFixed(1)} ч)`,
					dateIso: record.dates[0] || "",
					shiftIds: record.shiftIds,
					staffIds: [staffId],
				});
			}
		}
	}

	return conflicts;
}
