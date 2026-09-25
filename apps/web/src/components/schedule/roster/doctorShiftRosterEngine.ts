/**
 * DENTE Dental CRM — Doctor Shift Roster & Labor Compliance Engine
 * Compliance: TK RF Article 350 (33-hour medical workweek), Form T-13, Chair Utilization Math
 */

import {
	type CabinetDefinition,
	CLINIC_CABINETS_CATALOG,
	DEFAULT_CLINIC_STAFF,
	type MedicalStaffRole,
	RUSSIAN_PRODUCTION_CALENDAR_2026,
	type ShiftArchetypeId,
	type StaffMember,
	type T13TimeCode,
} from "./doctorShiftRosterPresets";

export * from "./rosterLaborComplianceT13";
export * from "./rosterDefaultSchedule";

export interface DoctorShift {
	id: string;
	doctorId: string;
	doctorName: string;
	doctorRole: MedicalStaffRole;
	assistantId: string | null;
	assistantName: string | null;
	cabinetId: string;
	chairId: string;
	dateIso: string; // YYYY-MM-DD
	archetypeId: ShiftArchetypeId;
	startTime: string; // HH:MM
	endTime: string; // HH:MM
	durationHours: number;
	breakMinutes: number;
	isNight: boolean;
	nightHours: number;
	customNotes?: string;
	status: "scheduled" | "confirmed" | "completed" | "cancelled" | "absence";
	absenceReason?: "sick_leave" | "vacation" | "unpaid_leave" | "training";
}

export type ConflictType =
	| "doctor_double_booking"
	| "assistant_double_booking"
	| "chair_double_booking"
	| "weekly_overtime_tk_rf"
	| "no_assistant_for_surgery";

export interface RosterConflict {
	id: string;
	type: ConflictType;
	severity: "error" | "warning" | "info";
	message: string;
	dateIso: string;
	shiftIds: string[];
	staffIds: string[];
}

export interface StaffRosterStats {
	staffId: string;
	staffName: string;
	role: MedicalStaffRole;
	isDoctor: boolean;
	totalShifts: number;
	totalScheduledHours: number;
	monthNormHours: number;
	deltaHours: number;
	overtimeHours: number;
	undertimeHours: number;
	nightHoursTotal: number;
	complianceStatus: "normal" | "overtime" | "undertime" | "warning";
}

export type ChairHeatLevel = "empty" | "cold" | "optimal" | "peak" | "overload";

export interface ChairUtilizationMetric {
	cabinetId: string;
	cabinetName: string;
	chairId: string;
	chairName: string;
	dateIso: string;
	totalShiftMinutes: number;
	bookedAppointmentMinutes: number;
	utilizationRatePercent: number;
	heatLevel: ChairHeatLevel;
}

/**
 * Parse HH:MM to minutes from midnight
 */
export function timeStringToMinutes(time: string): number {
	if (!time || !time.includes(":")) return 0;
	const parts = time.split(":");
	const h = Number.parseInt(parts[0] || "0", 10) || 0;
	const m = Number.parseInt(parts[1] || "0", 10) || 0;
	return h * 60 + m;
}

/**
 * Convert minutes from midnight to HH:MM
 */
export function minutesToTimeString(minutes: number): string {
	const normalized = ((minutes % 1440) + 1440) % 1440;
	const h = Math.floor(normalized / 60);
	const m = Math.floor(normalized % 60);
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Check if two time intervals overlap on the same calendar date
 */
export function doIntervalsOverlap(
	start1: string,
	end1: string,
	start2: string,
	end2: string,
): boolean {
	let s1 = timeStringToMinutes(start1);
	let e1 = timeStringToMinutes(end1);
	let s2 = timeStringToMinutes(start2);
	let e2 = timeStringToMinutes(end2);

	// Handle night shift crossing midnight (e.g. 20:00 -> 08:00)
	if (e1 <= s1) e1 += 1440;
	if (e2 <= s2) e2 += 1440;

	return Math.max(s1, s2) < Math.min(e1, e2);
}

/**
 * Calculate shift duration in hours and exact night hours (22:00 to 06:00 per TK RF Article 96)
 */
export function calculateShiftDurationHours(
	startTime: string,
	endTime: string,
	breakMinutes = 0,
): { durationHours: number; nightHours: number } {
	if (!startTime || !endTime) {
		return { durationHours: 0, nightHours: 0 };
	}

	const startMins = timeStringToMinutes(startTime);
	let endMins = timeStringToMinutes(endTime);

	// Handle overnight shifts crossing midnight
	if (endMins <= startMins) {
		endMins += 1440;
	}

	const rawMinutes = Math.max(0, endMins - startMins - breakMinutes);
	const durationHours = Math.round((rawMinutes / 60) * 100) / 100;

	// Calculate night minutes (22:00 to 06:00)
	let nightMinutes = 0;
	for (let m = startMins; m < endMins; m += 1) {
		const modMinute = m % 1440;
		if (modMinute >= 1320 || modMinute < 360) {
			nightMinutes += 1;
		}
	}

	const nightHours = Math.round((nightMinutes / 60) * 100) / 100;

	return { durationHours, nightHours };
}

/**
 * Get ISO week number and year from a date string (YYYY-MM-DD)
 */
export function getIsoWeekKey(dateIso: string): string {
	if (!dateIso || !dateIso.includes("-")) return "2026-W01";
	const parts = dateIso.split("-").map((p) => Number.parseInt(p, 10));
	const y = parts[0] || 2026;
	const m = parts[1] || 1;
	const d = parts[2] || 1;

	const date = new Date(Date.UTC(y, m - 1, d));
	const dayNum = date.getUTCDay() || 7;
	date.setUTCDate(date.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
	const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * Detect all scheduling conflicts and labor compliance violations
 */
export function detectRosterConflicts(
	shifts: DoctorShift[],
	staffList: StaffMember[] = DEFAULT_CLINIC_STAFF,
	options: {
		practiceType?: "private_outpatient" | "hospital_statutory";
		allowWeeklyOvertime?: boolean;
		checkSurgeryAssistant?: boolean;
		checkWeeklyOvertime?: boolean;
		isPrivatePractice?: boolean;
	} = {},
): RosterConflict[] {
	const conflicts: RosterConflict[] = [];
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

	// Filter active shifts (exclude cancelled or pure off days)
	const activeShifts = shifts.filter(
		(s) => s.status !== "cancelled" && s.archetypeId !== "day_off" && s.durationHours > 0,
	);

	// Group shifts by date
	const shiftsByDate = new Map<string, DoctorShift[]>();
	for (const shift of activeShifts) {
		const list = shiftsByDate.get(shift.dateIso) || [];
		list.push(shift);
		shiftsByDate.set(shift.dateIso, list);
	}

	// 1. Same-day overlap conflicts (Doctor, Assistant, Chair)
	for (const [dateIso, dayShifts] of shiftsByDate.entries()) {
		const n = dayShifts.length;
		for (let i = 0; i < n; i++) {
			const s1 = dayShifts[i];
			if (!s1) continue;

			// Check Surgery without Assistant (suppressed by default in private outpatient practice)
			if (shouldCheckSurgeryAssistant && s1.doctorRole === "surgeon" && !s1.assistantId) {
				conflicts.push({
					id: `no-asst-${s1.id}`,
					type: "no_assistant_for_surgery",
					severity: "warning",
					message: `Хирургия без ассистента: ${s1.doctorName} (${s1.startTime}–${s1.endTime})`,
					dateIso,
					shiftIds: [s1.id],
					staffIds: [s1.doctorId],
				});
			}

			for (let j = i + 1; j < n; j++) {
				const s2 = dayShifts[j];
				if (!s2) continue;

				if (!doIntervalsOverlap(s1.startTime, s1.endTime, s2.startTime, s2.endTime)) {
					continue;
				}

				// Doctor double booking
				if (s1.doctorId === s2.doctorId) {
					conflicts.push({
						id: `doc-conflict-${s1.id}-${s2.id}`,
						type: "doctor_double_booking",
						severity: "error",
						message: `Наложение врача ${s1.doctorName}: смены ${s1.startTime}–${s1.endTime} (${s1.chairId} / ${s2.chairId})`,
						dateIso,
						shiftIds: [s1.id, s2.id],
						staffIds: [s1.doctorId],
					});
				}

				// Assistant double booking
				if (s1.assistantId && s2.assistantId && s1.assistantId === s2.assistantId) {
					const asstName = s1.assistantName || s2.assistantName || "Ассистент";
					conflicts.push({
						id: `asst-conflict-${s1.id}-${s2.id}`,
						type: "assistant_double_booking",
						severity: "error",
						message: `Наложение ассистента ${asstName}: ${s1.doctorName} и ${s2.doctorName} (${s1.startTime}–${s1.endTime})`,
						dateIso,
						shiftIds: [s1.id, s2.id],
						staffIds: [s1.assistantId],
					});
				}

				// Chair double booking
				if (s1.chairId === s2.chairId) {
					conflicts.push({
						id: `chair-conflict-${s1.id}-${s2.id}`,
						type: "chair_double_booking",
						severity: "error",
						message: `Наложение в кресле ${s1.chairId}: ${s1.doctorName} / ${s2.doctorName} (${s1.startTime}–${s1.endTime})`,
						dateIso,
						shiftIds: [s1.id, s2.id],
						staffIds: [s1.doctorId, s2.doctorId],
					});
				}
			}
		}
	}

	// 2. Weekly overtime check (ТК РФ ст. 350: 33 ч/неделя для врачей)
	if (shouldCheckWeeklyOvertime) {
		const weeklyHoursByStaff = new Map<string, Map<string, { totalHours: number; shiftIds: string[]; dates: string[] }>>();

		for (const shift of activeShifts) {
			const weekKey = getIsoWeekKey(shift.dateIso);

			// Track doctor hours
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

			// Track assistant hours if present
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
	}

	return conflicts;
}

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

	// Filter shifts in the target month (YYYY-MM)
	const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
	const monthShifts = shifts.filter(
		(s) => s.dateIso.startsWith(monthPrefix) && s.status !== "cancelled",
	);

	return staffList.map((staff) => {
		const targetNorm = staff.weeklyHourLimit <= 33
			? monthNorm.normHours33
			: staff.weeklyHourLimit <= 39
				? monthNorm.normHours39
				: monthNorm.normHours40;

		const userShifts = monthShifts.filter((s) =>
			s.doctorId === staff.id || s.assistantId === staff.id
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

/**
 * Calculate Chair Utilization % based on booked appointments vs scheduled shift duration
 */
export function calculateChairUtilization(
	shifts: DoctorShift[],
	appointments: Array<{
		chairId: string;
		startsAt: string; // ISO string or time string
		endsAt: string; // ISO string or time string
		status?: string;
	}>,
	dateIso: string,
	cabinets: CabinetDefinition[] = CLINIC_CABINETS_CATALOG,
): ChairUtilizationMetric[] {
	const metrics: ChairUtilizationMetric[] = [];

	// Map all chairs across cabinets
	const allChairs: Array<{ chairId: string; chairName: string; cabinetId: string; cabinetName: string }> = [];
	for (const cab of cabinets) {
		for (const chair of cab.chairs) {
			allChairs.push({
				chairId: chair.id,
				chairName: chair.name,
				cabinetId: cab.id,
				cabinetName: cab.name,
			});
		}
	}

	const dateShifts = shifts.filter(
		(s) => s.dateIso === dateIso && s.status !== "cancelled" && s.durationHours > 0,
	);

	for (const chairInfo of allChairs) {
		const chairShifts = dateShifts.filter((s) => s.chairId === chairInfo.chairId);

		// Calculate total shift minutes
		let totalShiftMinutes = 0;
		for (const shift of chairShifts) {
			const startM = timeStringToMinutes(shift.startTime);
			let endM = timeStringToMinutes(shift.endTime);
			if (endM <= startM) endM += 1440;
			totalShiftMinutes += Math.max(0, endM - startM - (shift.breakMinutes || 0));
		}

		// Calculate booked appointment minutes for this chair on this day
		let bookedAppointmentMinutes = 0;
		for (const app of appointments) {
			if (app.chairId !== chairInfo.chairId) continue;
			if (app.status === "cancelled" || app.status === "did_not_come") continue;

			// Handle either full ISO strings or HH:MM strings
			let sTime = app.startsAt;
			let eTime = app.endsAt;

			if (sTime.includes("T")) {
				const appDate = sTime.split("T")[0];
				if (appDate !== dateIso) continue;
				const timePart = sTime.split("T")[1];
				sTime = timePart ? timePart.substring(0, 5) : sTime;
			}
			if (eTime.includes("T")) {
				const timePart = eTime.split("T")[1];
				eTime = timePart ? timePart.substring(0, 5) : eTime;
			}

			const sM = timeStringToMinutes(sTime);
			let eM = timeStringToMinutes(eTime);
			if (eM <= sM) eM += 1440;

			bookedAppointmentMinutes += Math.max(0, eM - sM);
		}

		let utilizationRatePercent = 0;
		if (totalShiftMinutes > 0) {
			utilizationRatePercent = Math.min(100, Math.round((bookedAppointmentMinutes / totalShiftMinutes) * 1000) / 10);
		}

		let heatLevel: ChairHeatLevel = "empty";
		if (totalShiftMinutes === 0) {
			heatLevel = "empty";
		} else if (utilizationRatePercent < 30) {
			heatLevel = "cold";
		} else if (utilizationRatePercent <= 80) {
			heatLevel = "optimal";
		} else if (utilizationRatePercent <= 95) {
			heatLevel = "peak";
		} else {
			heatLevel = "overload";
		}

		metrics.push({
			cabinetId: chairInfo.cabinetId,
			cabinetName: chairInfo.cabinetName,
			chairId: chairInfo.chairId,
			chairName: chairInfo.chairName,
			dateIso,
			totalShiftMinutes,
			bookedAppointmentMinutes,
			utilizationRatePercent,
			heatLevel,
		});
	}

	return metrics;
}
