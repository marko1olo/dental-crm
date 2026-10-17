import type { RecallCycleType, RecallPeriodFilter, RecallUrgencyStatus } from "./recallCycleTypes";
import { RECALL_CYCLE_CATALOG } from "./recallCycleCatalogData";
import {
	addCalendarMonthsSafe,
	addWeeksSafe,
	calculateDaysOverdue,
	calculateImplantRecallMilestones,
	formatIsoDateOnly,
	resolveUrgencyStatus,
} from "./recallDateMath";

export * from "./recallCycleSuggestion";

export function isPatientEligibleForRecall(candidate: {
	readonly isArchived?: boolean | undefined;
	readonly isDeceased?: boolean | undefined;
	readonly patientStatus?: string | undefined;
}): boolean {
	if (candidate.isArchived === true || candidate.isDeceased === true) return false;
	if (candidate.patientStatus === "archived" || candidate.patientStatus === "deceased" || candidate.patientStatus === "inactive") {
		return false;
	}
	return true;
}

export function isDateInPeriod(dueDateStr: string, period: RecallPeriodFilter, referenceDate: Date | string = new Date()): boolean {
	if (period === "all") return true;
	const ref = typeof referenceDate === "string" ? new Date(referenceDate) : new Date(referenceDate.getTime());
	const due = new Date(dueDateStr);
	if (Number.isNaN(due.getTime()) || Number.isNaN(ref.getTime())) return true;
	const dueUtc = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
	const refUtc = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());
	const diffDays = Math.floor((refUtc - dueUtc) / (1000 * 60 * 60 * 24));

	if (period === "overdue") return diffDays > 0;
	if (period === "this_month") return due.getFullYear() === ref.getFullYear() && due.getMonth() === ref.getMonth();
	if (period === "next_month") {
		const nextMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
		return due.getFullYear() === nextMonth.getFullYear() && due.getMonth() === nextMonth.getMonth();
	}
	if (period === "next_30_days") return diffDays <= 0 && diffDays >= -30;
	return true;
}

export function calculateRecallProfile(params: {
	readonly lastVisitDate: Date | string;
	readonly cycleType: RecallCycleType;
	readonly customIntervalValue?: number | undefined;
	readonly customIntervalMonths?: number | undefined;
	readonly referenceDate?: (Date | string) | undefined;
	readonly isCompleted?: boolean | undefined;
	readonly implantSurgeryDate?: (Date | string) | undefined;
}): {
	readonly dueDate: Date;
	readonly formattedDueDate: string;
	readonly daysOverdue: number;
	readonly urgencyStatus: RecallUrgencyStatus;
	readonly intervalDescription: string;
	readonly intervalMonths: number;
} {
	const refDate = params.referenceDate ?? new Date();
	const cycleDef = RECALL_CYCLE_CATALOG[params.cycleType];
	const rawCustom = params.customIntervalValue ?? params.customIntervalMonths;
	let dueDate: Date;
	let intervalDescription: string;
	let intervalMonths: number;

	if (params.cycleType === "orthodontic_braces") {
		const weeks = rawCustom && rawCustom > 0 ? rawCustom : 4;
		dueDate = addWeeksSafe(params.lastVisitDate, weeks);
		intervalDescription = `${weeks} нед.`;
		intervalMonths = Math.max(1, Math.round((weeks * 7) / 30));
	} else if (params.cycleType === "orthodontic_aligners") {
		const weeks = rawCustom && rawCustom > 0 ? rawCustom : 6;
		dueDate = addWeeksSafe(params.lastVisitDate, weeks);
		intervalDescription = `${weeks} нед.`;
		intervalMonths = Math.max(1, Math.round((weeks * 7) / 30));
	} else if (params.cycleType === "implant_monitoring" && params.implantSurgeryDate) {
		const implantCalc = calculateImplantRecallMilestones(params.implantSurgeryDate, refDate);
		dueDate = implantCalc.nextDueDate;
		intervalDescription = `${implantCalc.nextMilestoneMonth} мес. с операции`;
		intervalMonths = implantCalc.nextMilestoneMonth;
	} else {
		const months = rawCustom && rawCustom > 0 ? rawCustom : (cycleDef?.defaultIntervalMonths ?? cycleDef?.defaultIntervalValue ?? 6);
		dueDate = addCalendarMonthsSafe(params.lastVisitDate, months);
		intervalDescription = `${months} мес.`;
		intervalMonths = months;
	}

	return {
		dueDate,
		formattedDueDate: formatIsoDateOnly(dueDate),
		daysOverdue: calculateDaysOverdue(dueDate, refDate),
		urgencyStatus: resolveUrgencyStatus(dueDate, refDate, params.isCompleted),
		intervalDescription,
		intervalMonths,
	};
}
