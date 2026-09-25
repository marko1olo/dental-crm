import type {
	RecallCycleType,
	RecallUrgencyStatus,
} from "./recallCycleCatalog";

export function addCalendarMonthsSafe(fromDate: Date | string, months: number): Date {
	const parsed = typeof fromDate === "string" ? new Date(fromDate) : new Date(fromDate.getTime());
	if (Number.isNaN(parsed.getTime())) {
		return new Date();
	}

	const originalDay = parsed.getDate();
	parsed.setDate(1);
	parsed.setMonth(parsed.getMonth() + months);

	const daysInTargetMonth = new Date(
		parsed.getFullYear(),
		parsed.getMonth() + 1,
		0,
	).getDate();

	parsed.setDate(Math.min(originalDay, daysInTargetMonth));
	return parsed;
}

export function addWeeksSafe(fromDate: Date | string, weeks: number): Date {
	const parsed = typeof fromDate === "string" ? new Date(fromDate) : new Date(fromDate.getTime());
	if (Number.isNaN(parsed.getTime())) {
		return new Date();
	}
	parsed.setDate(parsed.getDate() + weeks * 7);
	return parsed;
}

export function addDaysSafe(fromDate: Date | string, days: number): Date {
	const parsed = typeof fromDate === "string" ? new Date(fromDate) : new Date(fromDate.getTime());
	if (Number.isNaN(parsed.getTime())) {
		return new Date();
	}
	parsed.setDate(parsed.getDate() + days);
	return parsed;
}

export function formatIsoDateOnly(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function calculateDaysOverdue(
	dueDate: Date | string,
	referenceDate: Date | string = new Date(),
): number {
	const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
	const ref = typeof referenceDate === "string" ? new Date(referenceDate) : referenceDate;

	const dueUtc = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
	const refUtc = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());

	const diffMs = refUtc - dueUtc;
	return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function resolveUrgencyStatus(
	dueDate: Date | string,
	referenceDate: Date | string = new Date(),
	isCompleted = false,
): RecallUrgencyStatus {
	if (isCompleted) {
		return "completed";
	}

	const days = calculateDaysOverdue(dueDate, referenceDate);

	if (days < 0) {
		return "upcoming";
	}
	if (days <= 29) {
		return "due_now";
	}
	if (days <= 89) {
		return "overdue_30";
	}
	return "overdue_90";
}

export function calculateHygieneRecallDate(
	lastVisitDate: Date | string,
	isPeriodontalRisk = false,
	customMonths?: number | undefined,
): { nextDueDate: Date; formattedDueDate: string; intervalMonths: number; cycleType: RecallCycleType } {
	const cycleType: RecallCycleType = isPeriodontalRisk ? "periodontal_maintenance" : "standard_prophylaxis";
	const defaultInterval = isPeriodontalRisk ? 3 : 6;
	const intervalMonths = customMonths && customMonths > 0 ? customMonths : defaultInterval;
	const nextDueDate = addCalendarMonthsSafe(lastVisitDate, intervalMonths);
	return {
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		intervalMonths,
		cycleType,
	};
}

export function calculateImplantRecallMilestones(
	surgeryDate: Date | string,
	referenceDate: Date | string = new Date(),
): {
	milestones: readonly {
		month: number;
		dueDate: Date;
		formattedDueDate: string;
		isPassed: boolean;
		isCurrent: boolean;
	}[];
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

		return {
			month: m,
			dueDate,
			formattedDueDate: formatted,
			isPassed,
			isCurrent,
		};
	});

	if (!foundNext) {
		const annualDue = addCalendarMonthsSafe(surgeryDate, 24);
		nextMilestoneMonth = 24;
		nextDueDate = annualDue;
	}

	return {
		milestones,
		nextMilestoneMonth,
		nextDueDate,
		formattedNextDueDate: formatIsoDateOnly(nextDueDate),
	};
}

export function calculateOrthoRecallDate(
	lastAdjustmentDate: Date | string,
	deviceType: "braces" | "aligners" | "retainer",
	customWeeksOrMonths?: number | undefined,
): {
	nextDueDate: Date;
	formattedDueDate: string;
	intervalDescription: string;
	cycleType: RecallCycleType;
} {
	if (deviceType === "braces") {
		const weeks = customWeeksOrMonths && customWeeksOrMonths > 0 ? customWeeksOrMonths : 4;
		const nextDueDate = addWeeksSafe(lastAdjustmentDate, weeks);
		return {
			nextDueDate,
			formattedDueDate: formatIsoDateOnly(nextDueDate),
			intervalDescription: `${weeks} нед. (${weeks * 7} дн.)`,
			cycleType: "orthodontic_braces",
		};
	}

	if (deviceType === "aligners") {
		const weeks = customWeeksOrMonths && customWeeksOrMonths > 0 ? customWeeksOrMonths : 6;
		const nextDueDate = addWeeksSafe(lastAdjustmentDate, weeks);
		return {
			nextDueDate,
			formattedDueDate: formatIsoDateOnly(nextDueDate),
			intervalDescription: `${weeks} нед. (${weeks * 7} дн.)`,
			cycleType: "orthodontic_aligners",
		};
	}

	const months = customWeeksOrMonths && customWeeksOrMonths > 0 ? customWeeksOrMonths : 3;
	const nextDueDate = addCalendarMonthsSafe(lastAdjustmentDate, months);
	return {
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		intervalDescription: `${months} мес.`,
		cycleType: "orthodontic_retention",
	};
}

export function calculatePediatricRecallDate(
	lastVisitDate: Date | string,
	isHighRisk = true,
	customMonths?: number | undefined,
): { nextDueDate: Date; formattedDueDate: string; intervalMonths: number; cycleType: RecallCycleType } {
	const defaultInterval = isHighRisk ? 3 : 6;
	const intervalMonths = customMonths && customMonths > 0 ? customMonths : defaultInterval;
	const nextDueDate = addCalendarMonthsSafe(lastVisitDate, intervalMonths);
	return {
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		intervalMonths,
		cycleType: "pediatric_fluoridation",
	};
}
