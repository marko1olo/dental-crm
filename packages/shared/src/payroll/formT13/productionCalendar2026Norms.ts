/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Statutory Form T-13 Timesheet Engine (Госкомстат РФ № 1)
 * Layer 1: Russian Production Calendar 2026 Norms (productionCalendar2026Norms.ts)
 *
 * Implements statutory working time norms per:
 * - Art. 91, 92, 95, 112, 350 of the Labor Code of the Russian Federation (ТК РФ)
 * - Decree of the Government of the Russian Federation No. 101 from 14.02.2003
 *   (33-hour work week = 6.6h/day for dentists of all specialties)
 * - Order of the Ministry of Health and Social Development No. 588n from 13.08.2009
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	AnnualCalendarSummary2026,
	MonthlyCalendarNorm,
	WorkWeekHoursNorm,
} from "./types.js";

/**
 * Statutory Russian public holidays & transferred weekends in 2026 (month 1..12 -> days)
 * Art. 112 Labor Code RF
 */
export const RUSSIAN_PUBLIC_HOLIDAYS_2026: Readonly<Record<number, readonly number[]>> = {
	1: [1, 2, 3, 4, 5, 6, 7, 8], // Новогодние каникулы и Рождество Христово
	2: [23], // День защитника Отечества
	3: [8, 9], // Международный женский день (перенос с вс 8 марта на пн 9 марта)
	4: [],
	5: [1, 9, 11], // Праздник Весны и Труда, День Победы (перенос с сб 9 мая на пн 11 мая)
	6: [12], // День России
	7: [],
	8: [],
	9: [],
	10: [],
	11: [4], // День народного единства
	12: [],
};

/**
 * Pre-holiday shortened workdays in 2026 (-1.0 hour per Art. 95 Labor Code RF)
 */
export const PRE_HOLIDAY_SHORTENED_DAYS_2026: Readonly<Record<number, readonly number[]>> = {
	1: [],
	2: [],
	3: [],
	4: [30], // Четверг 30 апреля (перед 1 мая)
	5: [8], // Пятница 8 мая (перед 9 мая)
	6: [11], // Четверг 11 июня (перед 12 июня)
	7: [],
	8: [],
	9: [],
	10: [],
	11: [3], // Вторник 3 ноября (перед 4 ноября)
	12: [31], // Четверг 31 декабря (перед 1 января)
};

/**
 * Statutory monthly working time norms for 2026 (5-day work week)
 * Formula (Order 588n): (weekHours / 5) * workingDays - preHolidayDays
 * - 40h week: 8.0h/day (administrators, cashiers, general staff)
 * - 39h week: 7.8h/day (dental assistants, paramedical nurses — Art. 350 TK RF)
 * - 36h week: 7.2h/day (hazardous conditions class 3.3/3.4 — Art. 92 TK RF)
 * - 33h week: 6.6h/day (dentists of all specialties — Decree No. 101, Section II)
 */
export const PRODUCTION_CALENDAR_2026: readonly MonthlyCalendarNorm[] = [
	{
		month: 1,
		monthNameRu: "Январь",
		calendarDays: 31,
		workingDays: 17,
		weekendAndHolidayDays: 14,
		preHolidayDays: 0,
		hours40: 136.0,
		hours39: 132.6,
		hours36: 122.4,
		hours33: 112.2,
	},
	{
		month: 2,
		monthNameRu: "Февраль",
		calendarDays: 28,
		workingDays: 19,
		weekendAndHolidayDays: 9,
		preHolidayDays: 0,
		hours40: 152.0,
		hours39: 148.2,
		hours36: 136.8,
		hours33: 125.4,
	},
	{
		month: 3,
		monthNameRu: "Март",
		calendarDays: 31,
		workingDays: 21,
		weekendAndHolidayDays: 10,
		preHolidayDays: 0,
		hours40: 168.0,
		hours39: 163.8,
		hours36: 151.2,
		hours33: 138.6,
	},
	{
		month: 4,
		monthNameRu: "Апрель",
		calendarDays: 30,
		workingDays: 22,
		weekendAndHolidayDays: 8,
		preHolidayDays: 1,
		hours40: 175.0,
		hours39: 170.6,
		hours36: 157.4,
		hours33: 144.2,
	},
	{
		month: 5,
		monthNameRu: "Май",
		calendarDays: 31,
		workingDays: 19,
		weekendAndHolidayDays: 12,
		preHolidayDays: 1,
		hours40: 151.0,
		hours39: 147.2,
		hours36: 135.8,
		hours33: 124.4,
	},
	{
		month: 6,
		monthNameRu: "Июнь",
		calendarDays: 30,
		workingDays: 21,
		weekendAndHolidayDays: 9,
		preHolidayDays: 1,
		hours40: 167.0,
		hours39: 162.8,
		hours36: 150.2,
		hours33: 137.6,
	},
	{
		month: 7,
		monthNameRu: "Июль",
		calendarDays: 31,
		workingDays: 23,
		weekendAndHolidayDays: 8,
		preHolidayDays: 0,
		hours40: 184.0,
		hours39: 179.4,
		hours36: 165.6,
		hours33: 151.8,
	},
	{
		month: 8,
		monthNameRu: "Август",
		calendarDays: 31,
		workingDays: 21,
		weekendAndHolidayDays: 10,
		preHolidayDays: 0,
		hours40: 168.0,
		hours39: 163.8,
		hours36: 151.2,
		hours33: 138.6,
	},
	{
		month: 9,
		monthNameRu: "Сентябрь",
		calendarDays: 30,
		workingDays: 22,
		weekendAndHolidayDays: 8,
		preHolidayDays: 0,
		hours40: 176.0,
		hours39: 171.6,
		hours36: 158.4,
		hours33: 145.2,
	},
	{
		month: 10,
		monthNameRu: "Октябрь",
		calendarDays: 31,
		workingDays: 22,
		weekendAndHolidayDays: 9,
		preHolidayDays: 0,
		hours40: 176.0,
		hours39: 171.6,
		hours36: 158.4,
		hours33: 145.2,
	},
	{
		month: 11,
		monthNameRu: "Ноябрь",
		calendarDays: 30,
		workingDays: 20,
		weekendAndHolidayDays: 10,
		preHolidayDays: 1,
		hours40: 159.0,
		hours39: 155.0,
		hours36: 143.0,
		hours33: 131.0,
	},
	{
		month: 12,
		monthNameRu: "Декабрь",
		calendarDays: 31,
		workingDays: 22,
		weekendAndHolidayDays: 9,
		preHolidayDays: 1,
		hours40: 175.0,
		hours39: 170.6,
		hours36: 157.4,
		hours33: 144.2,
	},
];

/**
 * Annual production calendar summary for 2026
 */
export const ANNUAL_CALENDAR_SUMMARY_2026: AnnualCalendarSummary2026 = {
	year: 2026,
	totalCalendarDays: 365,
	totalWorkingDays: 247,
	totalWeekendAndHolidayDays: 118,
	totalPreHolidayDays: 5,
	annualHours40: 1971.0,
	annualHours39: 1921.6,
	annualHours36: 1773.4,
	annualHours33: 1625.2,
};

/**
 * Returns monthly production calendar norm for 2026 (month 1..12).
 */
export function getMonthlyProductionCalendar2026(month: number): MonthlyCalendarNorm {
	const clampedMonth = Math.max(1, Math.min(12, Math.trunc(month)));
	const entry = PRODUCTION_CALENDAR_2026[clampedMonth - 1];
	if (!entry) {
		throw new Error(`Invalid month index: ${month}`);
	}
	return entry;
}

/**
 * Computes statutory work hours norm per Order 588n formula:
 * (weekHoursNorm / 5) * workingDays - preHolidayDays
 */
export function calculateWorkHoursNorm(
	workingDays: number,
	preHolidayDays: number,
	weekHoursNorm: WorkWeekHoursNorm = 33,
): number {
	const dailyNorm = weekHoursNorm / 5;
	const rawHours = dailyNorm * Math.max(0, workingDays) - Math.max(0, preHolidayDays);
	return Number(Math.max(0, rawHours).toFixed(1));
}

/**
 * Calculates monthly working hours norm for a doctor or clinic employee.
 * Defaults to 33-hour week for dentists (ст. 350 ТК РФ, Постановление № 101).
 */
export function calculateDoctorHoursNorm(
	year: number,
	month: number,
	weekHoursNorm: WorkWeekHoursNorm = 33,
): number {
	const clampedMonth = Math.max(1, Math.min(12, Math.trunc(month)));

	if (year === 2026) {
		const normEntry = getMonthlyProductionCalendar2026(clampedMonth);
		if (weekHoursNorm === 33) return normEntry.hours33;
		if (weekHoursNorm === 36) return normEntry.hours36;
		if (weekHoursNorm === 39) return normEntry.hours39;
		return normEntry.hours40;
	}

	// Fallback calculation for arbitrary years using weekday counting
	const daysInMonth = new Date(year, clampedMonth, 0).getDate();
	let workingDays = 0;
	for (let d = 1; d <= daysInMonth; d++) {
		const dow = new Date(year, clampedMonth - 1, d).getDay();
		const isWeekend = dow === 0 || dow === 6;
		const isHoliday = (RUSSIAN_PUBLIC_HOLIDAYS_2026[clampedMonth] ?? []).includes(d);
		if (!isWeekend && !isHoliday) {
			workingDays += 1;
		}
	}
	const preHolidayDays = (PRE_HOLIDAY_SHORTENED_DAYS_2026[clampedMonth] ?? []).length;
	return calculateWorkHoursNorm(workingDays, preHolidayDays, weekHoursNorm);
}

/**
 * Checks if a given month/day is a statutory Russian holiday in 2026.
 */
export function isRussianHoliday2026(month: number, day: number): boolean {
	const list = RUSSIAN_PUBLIC_HOLIDAYS_2026[month];
	return list ? list.includes(day) : false;
}

/**
 * Checks if a given month/day is a shortened pre-holiday workday in 2026 (-1 hour).
 */
export function isPreHolidayDay2026(month: number, day: number): boolean {
	const list = PRE_HOLIDAY_SHORTENED_DAYS_2026[month];
	return list ? list.includes(day) : false;
}

/**
 * Returns daily shift duration norm in hours (e.g. 6.6h for 33h week, 5.6h on pre-holiday).
 */
export function getDailyShiftNormHours(
	weekHoursNorm: WorkWeekHoursNorm = 33,
	isPreHoliday: boolean = false,
): number {
	const base = weekHoursNorm / 5;
	const adjusted = isPreHoliday ? Math.max(0, base - 1) : base;
	return Number(adjusted.toFixed(1));
}
