import type { RecallCycleType } from "./recallCycleTypes";
import { addCalendarMonthsSafe, addWeeksSafe, formatIsoDateOnly } from "./recallDateUtils";

export function calculateHygieneRecallDate(
	lastVisitDate: Date | string,
	isPeriodontalRisk = false,
	customMonths?: number | undefined,
): { nextDueDate: Date; formattedDueDate: string; intervalMonths: number; cycleType: RecallCycleType } {
	const cycleType: RecallCycleType = isPeriodontalRisk ? "periodontal_maintenance" : "standard_prophylaxis";
	const defaultInterval = isPeriodontalRisk ? 3 : 6;
	const intervalMonths = customMonths && customMonths > 0 ? customMonths : defaultInterval;
	const nextDueDate = addCalendarMonthsSafe(lastVisitDate, intervalMonths);
	return { nextDueDate, formattedDueDate: formatIsoDateOnly(nextDueDate), intervalMonths, cycleType };
}

export function calculateImplantRecallMilestones(
	surgeryDate: Date | string,
	referenceDate: Date | string = new Date(),
): {
	milestones: readonly { month: number; dueDate: Date; formattedDueDate: string; isPassed: boolean; isCurrent: boolean }[];
	nextMilestoneMonth: number;
	nextDueDate: Date;
	formattedNextDueDate: string;
} {
	const milestoneMonths = [1, 3, 6, 12] as const;
	const ref = typeof referenceDate === "string" ? new Date(referenceDate) : referenceDate;
	const refIso = formatIsoDateOnly(ref);

	let foundNext = false;
	let nextMilestoneMonth = 12;
	let nextDueDate = addCalendarMonthsSafe(surgeryDate, 12);

	const milestones = milestoneMonths.map((m) => {
		const dueDate = addCalendarMonthsSafe(surgeryDate, m);
		const formatted = formatIsoDateOnly(dueDate);
		const isPassed = formatted < refIso;
		let isCurrent = false;

		if (!isPassed && !foundNext) {
			foundNext = true;
			nextMilestoneMonth = m;
			nextDueDate = dueDate;
			isCurrent = true;
		}

		return { month: m, dueDate, formattedDueDate: formatted, isPassed, isCurrent };
	});

	if (!foundNext) {
		nextMilestoneMonth = 24;
		nextDueDate = addCalendarMonthsSafe(surgeryDate, 24);
	}

	return { milestones, nextMilestoneMonth, nextDueDate, formattedNextDueDate: formatIsoDateOnly(nextDueDate) };
}

export function calculateOrthoRecallDate(
	lastAdjustmentDate: Date | string,
	deviceType: "braces" | "aligners" | "retainer",
	customWeeksOrMonths?: number | undefined,
): { nextDueDate: Date; formattedDueDate: string; intervalDescription: string; cycleType: RecallCycleType } {
	if (deviceType === "braces") {
		const weeks = customWeeksOrMonths && customWeeksOrMonths > 0 ? customWeeksOrMonths : 4;
		const nextDueDate = addWeeksSafe(lastAdjustmentDate, weeks);
		return { nextDueDate, formattedDueDate: formatIsoDateOnly(nextDueDate), intervalDescription: `${weeks} нед. (${weeks * 7} дн.)`, cycleType: "orthodontic_braces" };
	}
	if (deviceType === "aligners") {
		const weeks = customWeeksOrMonths && customWeeksOrMonths > 0 ? customWeeksOrMonths : 6;
		const nextDueDate = addWeeksSafe(lastAdjustmentDate, weeks);
		return { nextDueDate, formattedDueDate: formatIsoDateOnly(nextDueDate), intervalDescription: `${weeks} нед. (${weeks * 7} дн.)`, cycleType: "orthodontic_aligners" };
	}
	const months = customWeeksOrMonths && customWeeksOrMonths > 0 ? customWeeksOrMonths : 3;
	const nextDueDate = addCalendarMonthsSafe(lastAdjustmentDate, months);
	return { nextDueDate, formattedDueDate: formatIsoDateOnly(nextDueDate), intervalDescription: `${months} мес.`, cycleType: "orthodontic_retention" };
}

export function calculatePediatricRecallDate(
	lastVisitDate: Date | string,
	isHighRisk = true,
	customMonths?: number | undefined,
): { nextDueDate: Date; formattedDueDate: string; intervalMonths: number; cycleType: RecallCycleType } {
	const defaultInterval = isHighRisk ? 3 : 6;
	const intervalMonths = customMonths && customMonths > 0 ? customMonths : defaultInterval;
	const nextDueDate = addCalendarMonthsSafe(lastVisitDate, intervalMonths);
	return { nextDueDate, formattedDueDate: formatIsoDateOnly(nextDueDate), intervalMonths, cycleType: "pediatric_fluoridation" };
}
