import {
	RUSSIAN_PRODUCTION_CALENDAR_2026,
	type StaffMember,
} from "../doctorShiftRosterPresets";
import type { DoctorShift, StaffRosterStats } from "./rosterEngineTypes";

/**
 * Calculate staff roster statistics vs statutory monthly norm
 */
export function calculateStaffRosterStats(
	staffList: StaffMember[],
	shifts: DoctorShift[],
	year = 2026,
	month = 8,
): StaffRosterStats[] {
	const monthNorm = RUSSIAN_PRODUCTION_CALENDAR_2026[month] || {
		month,
		nameRu: "Месяц",
		workingDays: 21,
		preHolidayDays: 0,
		holidaysAndWeekends: 10,
		normHours33: 138.6,
		normHours39: 163.8,
		normHours40: 168.0,
	};

	const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
	const monthShifts = shifts.filter(
		(s) => s.dateIso.startsWith(monthPrefix) && s.status !== "cancelled",
	);

	return staffList.map((staff) => {
		const targetNorm =
			staff.weeklyHourLimit <= 33
				? monthNorm.normHours33
				: staff.weeklyHourLimit <= 39
					? monthNorm.normHours39
					: monthNorm.normHours40;

		const userShifts = monthShifts.filter(
			(s) => s.doctorId === staff.id || s.assistantId === staff.id,
		);

		let totalScheduledHours = 0;
		let nightHoursTotal = 0;

		for (const shift of userShifts) {
			if (shift.archetypeId !== "day_off" && shift.status !== "absence") {
				totalScheduledHours += shift.durationHours;
				nightHoursTotal += shift.nightHours || 0;
			}
		}

		totalScheduledHours = Math.round(totalScheduledHours * 10) / 10;
		nightHoursTotal = Math.round(nightHoursTotal * 10) / 10;

		const deltaHours = Math.round((totalScheduledHours - targetNorm) * 10) / 10;
		const overtimeHours = deltaHours > 0 ? deltaHours : 0;
		const undertimeHours = deltaHours < 0 ? Math.abs(deltaHours) : 0;

		let complianceStatus: StaffRosterStats["complianceStatus"] = "normal";
		if (overtimeHours > 10) {
			complianceStatus = "warning";
		} else if (overtimeHours > 0) {
			complianceStatus = "overtime";
		} else if (undertimeHours > 15) {
			complianceStatus = "undertime";
		}

		return {
			staffId: staff.id,
			staffName: staff.shortName,
			role: staff.role,
			isDoctor: staff.isDoctor,
			totalShifts: userShifts.filter((s) => s.durationHours > 0).length,
			totalScheduledHours,
			monthNormHours: targetNorm,
			deltaHours,
			overtimeHours,
			undertimeHours,
			nightHoursTotal,
			complianceStatus,
		};
	});
}
