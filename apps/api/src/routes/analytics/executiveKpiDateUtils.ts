import { type ExecutivePeriod, rublesToKopecks } from "@dental/shared";
import { instantOfLocalTime } from "../../services/reports/managerReports/periodBounds.js";
import { DEFAULT_CLINIC_TIME_ZONE } from "../../services/reports/managerReports/timezone.js";

function extractLocalCalendarParts(
	date: Date,
	timeZone: string,
): { year: number; month: number; day: number; dayOfWeekMon0: number } {
	try {
		const parts = new Map(
			new Intl.DateTimeFormat("en-CA", {
				timeZone,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				weekday: "short",
			})
				.formatToParts(date)
				.map((p) => [p.type, p.value] as const),
		);
		const year = Number(parts.get("year"));
		const month = Number(parts.get("month"));
		const day = Number(parts.get("day"));
		const wd = parts.get("weekday") ?? "";
		const wdMap: Record<string, number> = {
			Mon: 0,
			Tue: 1,
			Wed: 2,
			Thu: 3,
			Fri: 4,
			Sat: 5,
			Sun: 6,
		};
		const dayOfWeekMon0 = wdMap[wd] ?? (date.getUTCDay() === 0 ? 6 : date.getUTCDay() - 1);
		if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
			return { year, month, day, dayOfWeekMon0 };
		}
	} catch {
		// Fallback to UTC below
	}
	const utcDow = date.getUTCDay() === 0 ? 6 : date.getUTCDay() - 1;
	return {
		year: date.getUTCFullYear(),
		month: date.getUTCMonth() + 1,
		day: date.getUTCDate(),
		dayOfWeekMon0: utcDow,
	};
}

function zonedDayStart(timeZone: string, year: number, month: number, day: number): Date {
	const ms = instantOfLocalTime(timeZone, year, month, day);
	return ms !== null ? new Date(ms) : new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function zonedDayEnd(timeZone: string, year: number, month: number, day: number): Date {
	const nextDayStart = instantOfLocalTime(timeZone, year, month, day + 1);
	return nextDayStart !== null
		? new Date(nextDayStart - 1)
		: new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}

/**
 * Канонические типизированные коды регламентированных статей расходов РКО (Мандат 8ap & 8bm).
 */
export const CASH_EXPENSE_REASON_CODES = {
	SALARIES_PAYROLL: 1,
	TAXES_AND_FEES: 2,
	SUPPLIES_MATERIALS: 4,
	EQUIPMENT_LEASE: 5,
	MARKETING_ADVERTISING: 6,
	COMMUNICATIONS: 7,
	PETTY_CASH_OTHER: 8,
	UTILITIES: 10,
	DENTAL_LAB_COSTS: 11,
	CLINIC_RENT: 100,
} as const;

export type CashExpenseReasonCode =
	(typeof CASH_EXPENSE_REASON_CODES)[keyof typeof CASH_EXPENSE_REASON_CODES];

export interface ExecutivePeriodRange {
	readonly execPeriod: ExecutivePeriod;
	readonly startDate: Date;
	readonly endDate: Date;
	readonly daysCount: number;
}

export function isExecutivePeriod(val: unknown): val is ExecutivePeriod {
	return (
		typeof val === "string" &&
		["day", "yesterday", "week", "month", "quarter", "year", "custom"].includes(val)
	);
}

export function resolveExecutiveDateRange(
	period?: string,
	fromDateIso?: string,
	toDateIso?: string,
	timeZone?: string | null,
): ExecutivePeriodRange {
	const execPeriod: ExecutivePeriod = isExecutivePeriod(period) ? period : "month";
	const resolvedTz = timeZone?.trim() || DEFAULT_CLINIC_TIME_ZONE;

	const now = new Date();
	const localNow = extractLocalCalendarParts(now, resolvedTz);
	const endOfToday = zonedDayEnd(resolvedTz, localNow.year, localNow.month, localNow.day);
	let startDate: Date;
	let endDate: Date = endOfToday;

	if (execPeriod === "yesterday") {
		startDate = zonedDayStart(resolvedTz, localNow.year, localNow.month, localNow.day - 1);
		endDate = zonedDayEnd(resolvedTz, localNow.year, localNow.month, localNow.day - 1);
	} else if (execPeriod === "day") {
		startDate = zonedDayStart(resolvedTz, localNow.year, localNow.month, localNow.day);
		endDate = endOfToday;
	} else if (execPeriod === "week") {
		startDate = zonedDayStart(resolvedTz, localNow.year, localNow.month, localNow.day - localNow.dayOfWeekMon0);
		endDate = endOfToday;
	} else if (execPeriod === "quarter") {
		const currentQuarterMonth = Math.floor((localNow.month - 1) / 3) * 3 + 1;
		startDate = zonedDayStart(resolvedTz, localNow.year, currentQuarterMonth, 1);
		endDate = endOfToday;
	} else if (execPeriod === "year") {
		startDate = zonedDayStart(resolvedTz, localNow.year, 1, 1);
		endDate = endOfToday;
	} else if (execPeriod === "custom" && fromDateIso) {
		const parsedFrom = new Date(fromDateIso);
		startDate = Number.isNaN(parsedFrom.getTime())
			? zonedDayStart(resolvedTz, localNow.year, localNow.month, 1)
			: parsedFrom;
		if (toDateIso) {
			const parsedTo = new Date(toDateIso);
			if (Number.isNaN(parsedTo.getTime())) {
				endDate = endOfToday;
			} else {
				const toParts = extractLocalCalendarParts(parsedTo, resolvedTz);
				endDate = zonedDayEnd(resolvedTz, toParts.year, toParts.month, toParts.day);
			}
		} else {
			endDate = endOfToday;
		}
	} else {
		startDate = zonedDayStart(resolvedTz, localNow.year, localNow.month, 1);
		endDate = endOfToday;
	}

	const daysCount = Math.max(
		1,
		Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
	);

	return { execPeriod, startDate, endDate, daysCount };
}

export interface ClinicWorkingHoursSpec {
	workdayStartMinutes: number; // e.g. 9 * 60 = 540
	workdayEndMinutes: number; // e.g. 17 * 60 = 1020 (8h)
	workingDays: Set<number>; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}

/**
 * [ANL-04] Разбор реального расписания клиники из organizations.clinicSchedule.
 * По умолчанию: 40 часов в неделю (5 рабочих дней Mon-Fri по 8 часов), а не фиктивные 84 ч/нед.
 */
export function resolveClinicScheduleWorkHours(scheduleRaw: unknown): ClinicWorkingHoursSpec {
	const defaultSpec: ClinicWorkingHoursSpec = {
		workdayStartMinutes: 9 * 60,
		workdayEndMinutes: 17 * 60,
		workingDays: new Set([1, 2, 3, 4, 5]),
	};

	if (!scheduleRaw || typeof scheduleRaw !== "object") {
		return defaultSpec;
	}

	const raw = scheduleRaw as Record<string, unknown>;
	let startMins = defaultSpec.workdayStartMinutes;
	let endMins = defaultSpec.workdayEndMinutes;
	let days = defaultSpec.workingDays;

	if (typeof raw.workdayStart === "string") {
		const parts = raw.workdayStart.split(":");
		const hStr = parts[0];
		const mStr = parts[1];
		if (hStr !== undefined && mStr !== undefined) {
			const h = Number(hStr);
			const m = Number(mStr);
			if (Number.isFinite(h) && Number.isFinite(m)) {
				startMins = h * 60 + m;
			}
		}
	}
	if (typeof raw.workdayEnd === "string") {
		const parts = raw.workdayEnd.split(":");
		const hStr = parts[0];
		const mStr = parts[1];
		if (hStr !== undefined && mStr !== undefined) {
			const h = Number(hStr);
			const m = Number(mStr);
			if (Number.isFinite(h) && Number.isFinite(m)) {
				endMins = h * 60 + m;
			}
		}
	}
	if (endMins <= startMins) {
		endMins = startMins + 8 * 60;
	}

	if (Array.isArray(raw.workingDays) && raw.workingDays.length > 0) {
		const validDays = raw.workingDays
			.map(Number)
			.filter((d) => !isNaN(d) && d >= 0 && d <= 6);
		if (validDays.length > 0) {
			days = new Set(validDays);
		}
	}

	return {
		workdayStartMinutes: startMins,
		workdayEndMinutes: endMins,
		workingDays: days,
	};
}

/**
 * [ANL-04] Честный расчет доступных рабочих минут клиники в периоде
 * на основе реального графика (organizations.clinicSchedule) или 40 часов/нед по умолчанию.
 */
export function calculateWorkingMinutesInPeriod(
	startDate: Date,
	endDate: Date = new Date(),
	scheduleSpec?: ClinicWorkingHoursSpec | number,
): { workingDays: number; availableMinutesPerChair: number } {
	const cur = new Date(startDate);
	cur.setHours(0, 0, 0, 0);
	const end = new Date(endDate);
	end.setHours(23, 59, 59, 999);

	let spec: ClinicWorkingHoursSpec;
	if (typeof scheduleSpec === "object" && scheduleSpec !== null) {
		spec = scheduleSpec;
	} else if (typeof scheduleSpec === "number") {
		spec = {
			workdayStartMinutes: 9 * 60,
			workdayEndMinutes: 9 * 60 + scheduleSpec * 60,
			workingDays: new Set([1, 2, 3, 4, 5, 6]),
		};
	} else {
		// Стандартные 40 часов в неделю: 5 дней по 8 часов (480 минут в день)
		spec = {
			workdayStartMinutes: 9 * 60,
			workdayEndMinutes: 17 * 60,
			workingDays: new Set([1, 2, 3, 4, 5]),
		};
	}

	const dailyMinutes = Math.max(60, spec.workdayEndMinutes - spec.workdayStartMinutes);
	let workingDays = 0;
	const temp = new Date(cur);
	while (temp <= end) {
		const dayOfWeek = temp.getDay(); // 0 = Sunday
		if (spec.workingDays.has(dayOfWeek)) {
			workingDays++;
		}
		temp.setDate(temp.getDate() + 1);
	}
	if (workingDays === 0) {
		workingDays = 1;
	}
	const availableMinutesPerChair = workingDays * dailyMinutes;
	return { workingDays, availableMinutesPerChair };
}

/**
 * [ANL-01 / Мандат 8bm] Честный расчет плановой выручки клиники за период.
 */
export function resolveExecutiveRevenuePlanKopecks(params: {
	readonly clinicScheduleRaw: unknown;
	readonly totalAvailableMinutes: number;
	readonly daysCount: number;
	readonly execPeriod: ExecutivePeriod;
}): number {
	const raw =
		params.clinicScheduleRaw && typeof params.clinicScheduleRaw === "object"
			? (params.clinicScheduleRaw as Record<string, unknown>)
			: null;

	const explicitPlanKopecks =
		typeof raw?.revenuePlanKopecks === "number" && raw.revenuePlanKopecks > 0
			? raw.revenuePlanKopecks
			: typeof raw?.revenuePlanRub === "number" && raw.revenuePlanRub > 0
				? rublesToKopecks(raw.revenuePlanRub)
				: null;

	if (explicitPlanKopecks !== null) {
		switch (params.execPeriod) {
			case "month":
				return Math.round(explicitPlanKopecks);
			case "quarter":
				return Math.round(explicitPlanKopecks * 3);
			case "year":
				return Math.round(explicitPlanKopecks * 12);
			case "week":
				return Math.round((explicitPlanKopecks * 7) / 30);
			case "day":
			case "yesterday":
				return Math.round(explicitPlanKopecks / 30);
			case "custom":
			default:
				return Math.round((explicitPlanKopecks * Math.max(1, params.daysCount)) / 30);
		}
	}

	const hourlyTargetKopecks =
		typeof raw?.targetHourlyRevenueKopecks === "number" && raw.targetHourlyRevenueKopecks > 0
			? raw.targetHourlyRevenueKopecks
			: typeof raw?.targetHourlyRevenueRub === "number" && raw.targetHourlyRevenueRub > 0
				? rublesToKopecks(raw.targetHourlyRevenueRub)
				: 350_000; // 3 500 ₽/час доступного фонда кресла

	const availableHours = Math.max(1, params.totalAvailableMinutes / 60);
	return Math.round(availableHours * hourlyTargetKopecks);
}
