import { type ExecutivePeriod, rublesToKopecks } from "@dental/shared";

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
): ExecutivePeriodRange {
	const execPeriod: ExecutivePeriod = isExecutivePeriod(period) ? period : "month";

	const now = new Date();
	const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
	let startDate: Date;
	let endDate: Date = endOfToday;

	if (execPeriod === "yesterday") {
		startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
		endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
	} else if (execPeriod === "day") {
		startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
		endDate = endOfToday;
	} else if (execPeriod === "week") {
		const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 = Monday
		startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
		endDate = endOfToday;
	} else if (execPeriod === "quarter") {
		const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
		startDate = new Date(now.getFullYear(), currentQuarterMonth, 1, 0, 0, 0, 0);
		endDate = endOfToday;
	} else if (execPeriod === "year") {
		startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
		endDate = endOfToday;
	} else if (execPeriod === "custom" && fromDateIso) {
		const parsedFrom = new Date(fromDateIso);
		startDate = Number.isNaN(parsedFrom.getTime())
			? new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
			: parsedFrom;
		if (toDateIso) {
			const parsedTo = new Date(toDateIso);
			endDate = Number.isNaN(parsedTo.getTime())
				? endOfToday
				: new Date(parsedTo.getFullYear(), parsedTo.getMonth(), parsedTo.getDate(), 23, 59, 59, 999);
		} else {
			endDate = endOfToday;
		}
	} else {
		startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
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
