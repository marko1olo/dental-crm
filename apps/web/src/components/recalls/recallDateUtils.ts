import type { RecallUrgencyStatus } from "./recallCycleTypes";

export function addCalendarMonthsSafe(fromDate: Date | string, months: number): Date {
	const parsed = typeof fromDate === "string" ? new Date(fromDate) : new Date(fromDate.getTime());
	if (Number.isNaN(parsed.getTime())) return new Date();
	const originalDay = parsed.getDate();
	parsed.setDate(1);
	parsed.setMonth(parsed.getMonth() + months);
	const daysInTargetMonth = new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0).getDate();
	parsed.setDate(Math.min(originalDay, daysInTargetMonth));
	return parsed;
}

export function addWeeksSafe(fromDate: Date | string, weeks: number): Date {
	const parsed = typeof fromDate === "string" ? new Date(fromDate) : new Date(fromDate.getTime());
	if (Number.isNaN(parsed.getTime())) return new Date();
	parsed.setDate(parsed.getDate() + weeks * 7);
	return parsed;
}

export function addDaysSafe(fromDate: Date | string, days: number): Date {
	const parsed = typeof fromDate === "string" ? new Date(fromDate) : new Date(fromDate.getTime());
	if (Number.isNaN(parsed.getTime())) return new Date();
	parsed.setDate(parsed.getDate() + days);
	return parsed;
}

export function formatIsoDateOnly(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function calculateDaysOverdue(dueDate: Date | string, referenceDate: Date | string = new Date()): number {
	const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
	const ref = typeof referenceDate === "string" ? new Date(referenceDate) : referenceDate;
	const dueUtc = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
	const refUtc = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());
	return Math.floor((refUtc - dueUtc) / (1000 * 60 * 60 * 24));
}

export function resolveUrgencyStatus(dueDate: Date | string, referenceDate: Date | string = new Date(), isCompleted = false): RecallUrgencyStatus {
	if (isCompleted) return "completed";
	const days = calculateDaysOverdue(dueDate, referenceDate);
	if (days < 0) return "upcoming";
	if (days <= 29) return "due_now";
	if (days <= 89) return "overdue_30";
	return "overdue_90";
}

export function postponeDueDateByDays(fromDate: Date | string, days: number): Date {
	return addDaysSafe(fromDate, days);
}

export function postponeDueDateByWeeks(fromDate: Date | string, weeks: number): Date {
	return addWeeksSafe(fromDate, weeks);
}

export function postponeDueDateByMonths(fromDate: Date | string, months: number): Date {
	return addCalendarMonthsSafe(fromDate, months);
}
