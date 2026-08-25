/**
 * DENTE Dental CRM — Doctor Shift Roster & Labor Compliance Engine
 * Compliance: TK RF Article 350 (33-hour medical workweek), Form T-13, Chair Utilization Math
 */

import {
	type CabinetDefinition,
	CLINIC_CABINETS_CATALOG,
	DEFAULT_CLINIC_STAFF,
	MEDICAL_STAFF_ROLES,
	type MedicalStaffRole,
	type MonthProductionCalendarNorm2026,
	RUSSIAN_PRODUCTION_CALENDAR_2026,
	SHIFT_ARCHETYPES,
	type ShiftArchetypeId,
	type StaffMember,
	type T13TimeCode,
} from "./doctorShiftRosterPresets";

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

export interface T13DayRecord {
	dayOfMonth: number;
	dateIso: string;
	code: T13TimeCode;
	hours: number;
	nightHours: number;
}

export interface T13RowData {
	tabNumber: string;
	staffName: string;
	position: string;
	role: MedicalStaffRole;
	days: T13DayRecord[];
	firstHalfDays: number;
	firstHalfHours: number;
	secondHalfDays: number;
	secondHalfHours: number;
	totalMonthDays: number;
	totalMonthHours: number;
	totalNightHours: number;
	overtimeHours: number;
	weekendHours: number;
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
	// Night intervals: [22*60, 24*60] = [1320, 1440] and [0, 6*60] = [0, 360] (or [1440, 1800])
	let nightMinutes = 0;
	for (let m = startMins; m < endMins; m += 1) {
		const modMinute = m % 1440;
		// 22:00 is 1320, 06:00 is 360
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
	options: { allowWeeklyOvertime?: boolean } = {},
): RosterConflict[] {
	const conflicts: RosterConflict[] = [];
	const staffMap = new Map<string, StaffMember>(staffList.map((s) => [s.id, s]));

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

			// Check Surgery without Assistant
			if (s1.doctorRole === "surgeon" && !s1.assistantId) {
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
	if (!options.allowWeeklyOvertime) {
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

/**
 * Generate Form T-13 (Табель учета рабочего времени) matrix
 */
export function generateFormT13Matrix(
	staffList: StaffMember[],
	shifts: DoctorShift[],
	year = 2026,
	month = 8,
): T13RowData[] {
	const daysInMonth = new Date(year, month, 0).getDate();
	const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;

	const monthShifts = shifts.filter(
		(s) => s.dateIso.startsWith(monthPrefix) && s.status !== "cancelled",
	);

	return staffList.map((staff) => {
		const roleDef = MEDICAL_STAFF_ROLES[staff.role];
		const position = roleDef?.nameRu || "Сотрудник";

		const days: T13DayRecord[] = [];
		let firstHalfDays = 0;
		let firstHalfHours = 0;
		let secondHalfDays = 0;
		let secondHalfHours = 0;
		let totalMonthDays = 0;
		let totalMonthHours = 0;
		let totalNightHours = 0;
		let weekendHours = 0;

		for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
			const dateIso = `${monthPrefix}-${String(dayNum).padStart(2, "0")}`;
			const dayDate = new Date(year, month - 1, dayNum);
			const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

			// Find shift for this user on this day
			const userShift = monthShifts.find(
				(s) => s.dateIso === dateIso && (s.doctorId === staff.id || s.assistantId === staff.id),
			);

			let code: T13TimeCode = isWeekend ? "В" : "В";
			let hours = 0;
			let nightHours = 0;

			if (userShift) {
				if (userShift.archetypeId === "sick_leave" || userShift.absenceReason === "sick_leave") {
					code = "Б";
				} else if (userShift.archetypeId === "vacation" || userShift.absenceReason === "vacation") {
					code = "ОТ";
				} else if (userShift.archetypeId === "day_off") {
					code = "В";
				} else if (userShift.isNight) {
					code = "Н";
					hours = userShift.durationHours;
					nightHours = userShift.nightHours || 0;
				} else {
					code = "Я";
					hours = userShift.durationHours;
				}
			}

			if (hours > 0) {
				totalMonthDays += 1;
				totalMonthHours += hours;
				totalNightHours += nightHours;

				if (isWeekend) {
					weekendHours += hours;
				}

				if (dayNum <= 15) {
					firstHalfDays += 1;
					firstHalfHours += hours;
				} else {
					secondHalfDays += 1;
					secondHalfHours += hours;
				}
			}

			days.push({
				dayOfMonth: dayNum,
				dateIso,
				code,
				hours,
				nightHours,
			});
		}

		// Calculate statutory month norm
		const monthNorm = RUSSIAN_PRODUCTION_CALENDAR_2026[month]?.normHours33 || 138.6;
		const overtimeHours = totalMonthHours > monthNorm ? Math.round((totalMonthHours - monthNorm) * 10) / 10 : 0;

		return {
			tabNumber: staff.tabNumber,
			staffName: staff.fullName,
			position,
			role: staff.role,
			days,
			firstHalfDays,
			firstHalfHours: Math.round(firstHalfHours * 10) / 10,
			secondHalfDays,
			secondHalfHours: Math.round(secondHalfHours * 10) / 10,
			totalMonthDays,
			totalMonthHours: Math.round(totalMonthHours * 10) / 10,
			totalNightHours: Math.round(totalNightHours * 10) / 10,
			overtimeHours,
			weekendHours: Math.round(weekendHours * 10) / 10,
		};
	});
}

/**
 * Export Form T-13 to Excel / 1C compatible CSV with UTF-8 BOM (\uFEFF)
 */
export function exportFormT13ToCsv(
	t13Data: T13RowData[],
	year = 2026,
	month = 8,
	clinicName = 'ООО "Денте Клиник"',
): string {
	const monthNormObj = RUSSIAN_PRODUCTION_CALENDAR_2026[month];
	const monthName = monthNormObj?.nameRu || `${month}`;
	const daysInMonth = t13Data[0]?.days.length || 31;

	// Build CSV header
	const lines: string[] = [];
	lines.push(`\uFEFF"ТАБЕЛЬ УЧЕТА РАБОЧЕГО ВРЕМЕНИ (Унифицированная форма № Т-13)"`);
	lines.push(`"Организация: ${clinicName}";"Период: ${monthName} ${year} г.";"Норма 33ч: ${monthNormObj?.normHours33 || 138.6} ч"`);
	lines.push("");

	// Table Header Row 1
	const headers = [
		"№ п/п",
		"Таб. №",
		"ФИО сотрудника",
		"Должность",
	];

	for (let d = 1; d <= daysInMonth; d++) {
		headers.push(`${d}`);
	}

	headers.push("1-15 дн.", "1-15 час.", "16-31 дн.", "16-31 час.", "Итого дней", "Итого часов", "В т.ч. ночных", "Сверхурочные");
	lines.push(headers.map((h) => `"${h}"`).join(";"));

	// Data rows
	t13Data.forEach((row, idx) => {
		// Row with Codes (Я, Н, В, Б, etc.)
		const codeCols = [
			`"${idx + 1}"`,
			`"${row.tabNumber}"`,
			`"${row.staffName}"`,
			`"${row.position}"`,
		];

		row.days.forEach((day) => {
			codeCols.push(`"${day.code}"`);
		});

		codeCols.push(
			`"${row.firstHalfDays}"`,
			`"${row.firstHalfHours.toFixed(1)}"`,
			`"${row.secondHalfDays}"`,
			`"${row.secondHalfHours.toFixed(1)}"`,
			`"${row.totalMonthDays}"`,
			`"${row.totalMonthHours.toFixed(1)}"`,
			`"${row.totalNightHours.toFixed(1)}"`,
			`"${row.overtimeHours.toFixed(1)}"`,
		);
		lines.push(codeCols.join(";"));

		// Row with Hours (6.0, 7.0, etc.)
		const hoursCols = [
			`""`,
			`""`,
			`"Часы"`,
			`""`,
		];

		row.days.forEach((day) => {
			hoursCols.push(day.hours > 0 ? `"${day.hours.toFixed(1)}"` : `""`);
		});

		hoursCols.push(`""`, `""`, `""`, `""`, `""`, `""`, `""`, `""`);
		lines.push(hoursCols.join(";"));
	});

	return lines.join("\r\n");
}

/**
 * Generate official printable HTML schedule (A4 Landscape)
 */
export function generatePrintableRosterHtml(
	shifts: DoctorShift[],
	weekStartIso: string,
	weekEndIso: string,
	clinicName = 'ООО "Денте Клиник"',
	cabinets: CabinetDefinition[] = CLINIC_CABINETS_CATALOG,
): string {
	const activeShifts = shifts.filter(
		(s) => s.dateIso >= weekStartIso && s.dateIso <= weekEndIso && s.status !== "cancelled",
	);

	// Generate list of days in week
	const days: string[] = [];
	const cur = new Date(weekStartIso);
	const end = new Date(weekEndIso);
	while (cur <= end) {
		const dayStr = cur.toISOString().split("T")[0];
		if (dayStr) days.push(dayStr);
		cur.setDate(cur.getDate() + 1);
	}

	const dayNamesRu = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

	let cabinetRowsHtml = "";
	for (const cab of cabinets) {
		for (const chair of cab.chairs) {
			let cellsHtml = "";
			for (const dayIso of days) {
				const dayShifts = activeShifts.filter(
					(s) => s.chairId === chair.id && s.dateIso === dayIso,
				);

				let shiftContent = '<div style="color: #94a3b8; font-size: 11px;">—</div>';
				if (dayShifts.length > 0) {
					shiftContent = dayShifts
						.map((s) => {
							const asst = s.assistantName ? `<br/><span style="color:#0f766e; font-size:10px;">Асст: ${s.assistantName}</span>` : "";
							return `<div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:4px; padding:3px 4px; margin-bottom:2px; font-size:11px; text-align:left;">
								<strong>${s.startTime}–${s.endTime}</strong><br/>
								<span>${s.doctorName}</span>
								${asst}
							</div>`;
						})
						.join("");
				}

				cellsHtml += `<td style="border: 1px solid #cbd5e1; padding: 4px; vertical-align: top; width: 13%;">${shiftContent}</td>`;
			}

			cabinetRowsHtml += `<tr>
				<td style="border: 1px solid #cbd5e1; padding: 6px; font-size: 12px; font-weight: 600; background: #f8fafc;">
					${cab.name}<br/>
					<span style="font-size: 10px; font-weight: normal; color: #64748b;">${chair.name}</span>
				</td>
				${cellsHtml}
			</tr>`;
		}
	}

	const headerDaysHtml = days
		.map((d) => {
			const dateObj = new Date(d);
			const dayOfWeek = dayNamesRu[dateObj.getDay()];
			const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
			const bg = isWeekend ? "#fef2f2" : "#f1f5f9";
			const color = isWeekend ? "#dc2626" : "#0f172a";
			return `<th style="border: 1px solid #cbd5e1; padding: 6px; background: ${bg}; color: ${color}; font-size: 12px; text-align: center;">
				${dayOfWeek}, ${d.substring(8, 10)}.${d.substring(5, 7)}
			</th>`;
		})
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>График сменности врачей — ${clinicName}</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; color: #0f172a; }
		table { width: 100%; border-collapse: collapse; margin-top: 10px; }
		.header-block { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 8px; }
		.title { font-size: 16px; font-weight: bold; }
		.subtitle { font-size: 12px; color: #475569; margin-top: 3px; }
		.footer-block { display: flex; justify-content: space-between; margin-top: 25px; font-size: 12px; }
	</style>
</head>
<body>
	<div class="header-block">
		<div>
			<div class="title">УТВЕРЖДАЮ: ГРАФИК СМЕННОСТИ И РАСПИСАНИЯ ВРАЧЕЙ</div>
			<div class="subtitle">${clinicName} | Период: с ${weekStartIso} по ${weekEndIso} (33-часовая рабочая неделя)</div>
		</div>
		<div style="text-align: right; font-size: 11px;">
			Главный врач: _________________ (подпись / печать)<br/>
			Дата утверждения: "${new Date().toLocaleDateString("ru-RU")}"
		</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="border: 1px solid #cbd5e1; padding: 6px; background: #e2e8f0; font-size: 12px; width: 15%;">Кабинет / Кресло</th>
				${headerDaysHtml}
			</tr>
		</thead>
		<tbody>
			${cabinetRowsHtml}
		</tbody>
	</table>

	<div class="footer-block">
		<div>Ответственный за составление графика: Старшая медсестра / Зав. отделением _________________</div>
		<div>Страница 1 из 1</div>
	</div>
</body>
</html>`;
}

/**
 * Generate a realistic initial weekly schedule
 */
export function createDefaultWeeklySchedule(
	startDateIso: string,
	staffList: StaffMember[] = DEFAULT_CLINIC_STAFF,
	cabinets: CabinetDefinition[] = CLINIC_CABINETS_CATALOG,
): DoctorShift[] {
	const shifts: DoctorShift[] = [];
	const startDate = new Date(startDateIso);
	const fallbackDoc = staffList[0] || DEFAULT_CLINIC_STAFF[0]!;

	// Create 7 days of shifts
	for (let d = 0; d < 7; d++) {
		const curDate = new Date(startDate);
		curDate.setDate(startDate.getDate() + d);
		const dateIso = curDate.toISOString().substring(0, 10);
		const dayOfWeek = curDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

		if (dayOfWeek === 0) {
			// Sunday Duty (10:00 - 16:00)
			const doc = staffList.find((s) => s.id === "doc-volkov") || fallbackDoc;
			const asst = staffList.find((s) => s.id === "asst-kovaleva") || null;
			shifts.push({
				id: `shift-${dateIso}-sun-1`,
				doctorId: doc.id,
				doctorName: doc.shortName,
				doctorRole: doc.role,
				assistantId: asst ? asst.id : null,
				assistantName: asst ? asst.shortName : null,
				cabinetId: "cab-2",
				chairId: "chair-2",
				dateIso,
				archetypeId: "sunday_duty",
				startTime: "10:00",
				endTime: "16:00",
				durationHours: 6.0,
				breakMinutes: 0,
				isNight: false,
				nightHours: 0,
				status: "scheduled",
				customNotes: "Дежурный прием по неотложным показаниям",
			});
			continue;
		}

		if (dayOfWeek === 6) {
			// Saturday Shift (09:00 - 17:00, 7.0 hours)
			const docTherapy = staffList.find((s) => s.id === "doc-smirnov") || fallbackDoc;
			const asst1 = staffList.find((s) => s.id === "asst-ivanova") || null;
			shifts.push({
				id: `shift-${dateIso}-sat-1`,
				doctorId: docTherapy.id,
				doctorName: docTherapy.shortName,
				doctorRole: docTherapy.role,
				assistantId: asst1 ? asst1.id : null,
				assistantName: asst1 ? asst1.shortName : null,
				cabinetId: "cab-1",
				chairId: "chair-1a",
				dateIso,
				archetypeId: "saturday_shift",
				startTime: "09:00",
				endTime: "17:00",
				durationHours: 7.0,
				breakMinutes: 60,
				isNight: false,
				nightHours: 0,
				status: "scheduled",
			});

			const docPediatric = staffList.find((s) => s.id === "doc-mikhailova");
			if (docPediatric) {
				const asst2 = staffList.find((s) => s.id === "asst-sokolova") || null;
				shifts.push({
					id: `shift-${dateIso}-sat-2`,
					doctorId: docPediatric.id,
					doctorName: docPediatric.shortName,
					doctorRole: docPediatric.role,
					assistantId: asst2 ? asst2.id : null,
					assistantName: asst2 ? asst2.shortName : null,
					cabinetId: "cab-4",
					chairId: "chair-4",
					dateIso,
					archetypeId: "saturday_shift",
					startTime: "09:00",
					endTime: "17:00",
					durationHours: 7.0,
					breakMinutes: 60,
					isNight: false,
					nightHours: 0,
					status: "scheduled",
				});
			}
			continue;
		}

		// Weekdays (Mon-Fri)
		// Cab 1 Morning: Smirnov (Therapist) + Ivanova
		const doc1 = staffList.find((s) => s.id === "doc-smirnov");
		if (doc1) {
			const asst = staffList.find((s) => s.id === "asst-ivanova") || null;
			shifts.push({
				id: `shift-${dateIso}-cab1-morn`,
				doctorId: doc1.id,
				doctorName: doc1.shortName,
				doctorRole: doc1.role,
				assistantId: asst ? asst.id : null,
				assistantName: asst ? asst.shortName : null,
				cabinetId: "cab-1",
				chairId: "chair-1a",
				dateIso,
				archetypeId: "morning_shift",
				startTime: "08:30",
				endTime: "14:30",
				durationHours: 6.0,
				breakMinutes: 0,
				isNight: false,
				nightHours: 0,
				status: "scheduled",
			});
		}

		// Cab 2 Morning: Volkov (Surgeon) + Kovaleva
		const doc2 = staffList.find((s) => s.id === "doc-volkov");
		if (doc2) {
			const asst = staffList.find((s) => s.id === "asst-kovaleva") || null;
			shifts.push({
				id: `shift-${dateIso}-cab2-morn`,
				doctorId: doc2.id,
				doctorName: doc2.shortName,
				doctorRole: doc2.role,
				assistantId: asst ? asst.id : null,
				assistantName: asst ? asst.shortName : null,
				cabinetId: "cab-2",
				chairId: "chair-2",
				dateIso,
				archetypeId: "morning_shift",
				startTime: "08:30",
				endTime: "14:30",
				durationHours: 6.0,
				breakMinutes: 0,
				isNight: false,
				nightHours: 0,
				status: "scheduled",
			});
		}

		// Cab 3 Evening: Kuznetsova (Orthopedist) + Sokolova
		const doc3 = staffList.find((s) => s.id === "doc-kuznetsova");
		if (doc3) {
			const asst = staffList.find((s) => s.id === "asst-sokolova") || null;
			shifts.push({
				id: `shift-${dateIso}-cab3-eve`,
				doctorId: doc3.id,
				doctorName: doc3.shortName,
				doctorRole: doc3.role,
				assistantId: asst ? asst.id : null,
				assistantName: asst ? asst.shortName : null,
				cabinetId: "cab-3",
				chairId: "chair-3",
				dateIso,
				archetypeId: "evening_shift",
				startTime: "14:30",
				endTime: "20:30",
				durationHours: 6.0,
				breakMinutes: 0,
				isNight: false,
				nightHours: 0,
				status: "scheduled",
			});
		}

		// Cab 4 Evening: Lebedeva (Orthodontist) / Mikhailova (Pediatric)
		const doc4 = dayOfWeek % 2 === 1 ? staffList.find((s) => s.id === "doc-lebedeva") : staffList.find((s) => s.id === "doc-mikhailova");
		if (doc4) {
			const asst = staffList.find((s) => s.id === "asst-ivanova") || null;
			shifts.push({
				id: `shift-${dateIso}-cab4-eve`,
				doctorId: doc4.id,
				doctorName: doc4.shortName,
				doctorRole: doc4.role,
				assistantId: asst ? asst.id : null,
				assistantName: asst ? asst.shortName : null,
				cabinetId: "cab-4",
				chairId: "chair-4",
				dateIso,
				archetypeId: "evening_shift",
				startTime: "14:30",
				endTime: "20:30",
				durationHours: 6.0,
				breakMinutes: 0,
				isNight: false,
				nightHours: 0,
				status: "scheduled",
			});
		}
	}

	return shifts;
}
