/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Statutory Form T-13 Timesheet Engine (Госкомстат РФ № 1)
 * Layer 2: Shift Hours, Overtime, Night Hours & Period Aggregator (t13ShiftHoursCalculator.ts)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	TIMESHEET_STATUTORY_CODES,
	type EmployeeTimesheetInput,
	type EmployeeTimesheetResult,
	type TimesheetDayRecord,
	type TimesheetPeriodSummary,
} from "./types.js";

/**
 * Calculates number of days in a given year and month (1-indexed).
 */
export function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month, 0).getDate();
}

/**
 * Calculates statutory night hours worked within a shift (22:00–06:00 per Art. 96 Labor Code RF).
 * Accepts startHour (0..24) and endHour (0..24, if endHour <= startHour it wraps across midnight).
 */
export function calculateNightHours(startHour: number, endHour: number): number {
	const normalizedStart = Math.max(0, Math.min(24, startHour));
	const normalizedEnd = endHour <= normalizedStart ? endHour + 24 : endHour;
	let nightHours = 0;

	// Check overlap with [0, 6], [22, 30], [46, 48] in 48-hour window
	const windows: readonly [number, number][] = [
		[0, 6],
		[22, 30],
		[46, 48],
	];

	for (const [wStart, wEnd] of windows) {
		const overlapStart = Math.max(normalizedStart, wStart);
		const overlapEnd = Math.min(normalizedEnd, wEnd);
		if (overlapEnd > overlapStart) {
			nightHours += overlapEnd - overlapStart;
		}
	}

	return Number(nightHours.toFixed(1));
}

/**
 * Splits actual shift duration into regular hours and overtime hours (Art. 99, 152 Labor Code RF).
 */
export function calculateShiftOvertime(
	actualHours: number,
	normHours: number = 6.6,
): { readonly regularHours: number; readonly overtimeHours: number } {
	const safeActual = Math.max(0, actualHours);
	const safeNorm = Math.max(0, normHours);
	const regularHours = Number(Math.min(safeActual, safeNorm).toFixed(1));
	const overtimeHours = Number(Math.max(0, safeActual - safeNorm).toFixed(1));
	return { regularHours, overtimeHours };
}

/**
 * Aggregates a range of days into period summary totals (I half 1..15, II half 16..31, full month).
 */
export function aggregateTimesheetDays(
	days: readonly TimesheetDayRecord[],
	startDay: number,
	endDay: number,
): TimesheetPeriodSummary {
	let daysWorked = 0;
	let regularHoursWorked = 0;
	let nightHoursWorked = 0;
	let overtimeHoursWorked = 0;
	let weekendHoursWorked = 0;
	let vacationDays = 0;
	let sickLeaveDays = 0;
	let unpaidLeaveDays = 0;
	let weekendDays = 0;
	let absenceDaysTotal = 0;

	for (let d = startDay; d <= endDay; d++) {
		const rec = days.find((item) => item.dayNumber === d);
		if (!rec) continue;

		const codeMeta = TIMESHEET_STATUTORY_CODES[rec.primaryCode] ?? TIMESHEET_STATUTORY_CODES.В;

		if (codeMeta.isWorkTime) {
			daysWorked += 1;
			if (rec.primaryCode === "Я") {
				regularHoursWorked += rec.primaryHours;
			} else if (rec.primaryCode === "Н") {
				nightHoursWorked += rec.primaryHours;
			} else if (rec.primaryCode === "РВ") {
				weekendHoursWorked += rec.primaryHours;
			} else if (rec.primaryCode === "С") {
				overtimeHoursWorked += rec.primaryHours;
			} else {
				regularHoursWorked += rec.primaryHours;
			}
		} else {
			absenceDaysTotal += 1;
			if (rec.primaryCode === "В") {
				weekendDays += 1;
			} else if (rec.primaryCode === "ОТ" || rec.primaryCode === "ОД") {
				vacationDays += 1;
			} else if (rec.primaryCode === "Б" || rec.primaryCode === "Т") {
				sickLeaveDays += 1;
			} else if (rec.primaryCode === "ДО") {
				unpaidLeaveDays += 1;
			}
		}

		// Process secondary hours if present (e.g. Overtime "С" or Night shift "Н" on top of daytime work)
		if (rec.secondaryCode && rec.secondaryHours && rec.secondaryHours > 0) {
			if (rec.secondaryCode === "С") {
				overtimeHoursWorked += rec.secondaryHours;
			} else if (rec.secondaryCode === "Н") {
				nightHoursWorked += rec.secondaryHours;
			} else if (rec.secondaryCode === "РВ") {
				weekendHoursWorked += rec.secondaryHours;
			} else {
				regularHoursWorked += rec.secondaryHours;
			}
		}
	}

	const totalHoursWorked =
		regularHoursWorked + nightHoursWorked + overtimeHoursWorked + weekendHoursWorked;

	return {
		daysWorked,
		regularHoursWorked: Number(regularHoursWorked.toFixed(1)),
		nightHoursWorked: Number(nightHoursWorked.toFixed(1)),
		overtimeHoursWorked: Number(overtimeHoursWorked.toFixed(1)),
		weekendHoursWorked: Number(weekendHoursWorked.toFixed(1)),
		totalHoursWorked: Number(totalHoursWorked.toFixed(1)),
		vacationDays,
		sickLeaveDays,
		unpaidLeaveDays,
		weekendDays,
		absenceDaysTotal,
	};
}

/**
 * Computes full Form T-13 timesheet for an employee.
 */
export function calculateEmployeeTimesheetT13(
	input: EmployeeTimesheetInput,
): EmployeeTimesheetResult {
	const totalDays = getDaysInMonth(input.year, input.month);

	// Ensure all days 1..totalDays exist in array
	const fullDays: TimesheetDayRecord[] = [];
	for (let d = 1; d <= totalDays; d++) {
		const existing = input.days.find((item) => item.dayNumber === d);
		if (existing) {
			fullDays.push(existing);
		} else {
			// Default to Weekend (В) if not specified
			fullDays.push({
				dayNumber: d,
				primaryCode: "В",
				primaryHours: 0,
			});
		}
	}

	const firstHalfSummary = aggregateTimesheetDays(fullDays, 1, Math.min(15, totalDays));
	const secondHalfSummary = aggregateTimesheetDays(fullDays, 16, totalDays);
	const monthTotalSummary = aggregateTimesheetDays(fullDays, 1, totalDays);

	return {
		employeeId: input.employeeId,
		employeeTabNumber: input.employeeTabNumber,
		employeeFullName: input.employeeFullName,
		positionRu: input.positionRu,
		departmentRu: input.departmentRu,
		year: input.year,
		month: input.month,
		daysInMonth: totalDays,
		payTypeCode: input.payTypeCode ?? "2000",
		correspAccount: input.correspAccount ?? "20",
		dailyRecords: fullDays,
		firstHalfSummary,
		secondHalfSummary,
		monthTotalSummary,
	};
}

/**
 * Generates calculated Form T-13 timesheet records for a batch of clinic employees.
 */
export function generateFormT13Timesheet(
	employees: readonly EmployeeTimesheetInput[],
): readonly EmployeeTimesheetResult[] {
	return employees.map((emp) => calculateEmployeeTimesheetT13(emp));
}
