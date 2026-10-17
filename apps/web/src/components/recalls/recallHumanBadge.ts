import type { RecallUrgencyStatus } from "./recallCycleTypes";

export const RUSSIAN_MONTH_NAMES_ACCUSATIVE: readonly string[] = [
	"январь", "февраль", "март", "апрель", "май", "июнь",
	"июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
] as const;

export function formatRussianDaysPlural(days: number): string {
	const abs = Math.abs(Math.round(days));
	const mod10 = abs % 10;
	const mod100 = abs % 100;
	if (mod100 >= 11 && mod100 <= 14) return `${abs} дней`;
	if (mod10 === 1) return `${abs} день`;
	if (mod10 >= 2 && mod10 <= 4) return `${abs} дня`;
	return `${abs} дней`;
}

export function formatRussianMonthAccusative(date: Date | string): string {
	const parsed = typeof date === "string" ? new Date(date) : date;
	if (Number.isNaN(parsed.getTime())) return "срок";
	return RUSSIAN_MONTH_NAMES_ACCUSATIVE[parsed.getMonth()] ?? "срок";
}

export interface HumanRecallBadgeInfo {
	readonly badgeText: string;
	readonly badgeClass: string;
	readonly badgeTitle: string;
}

export function formatHumanRecallBadge(params: {
	readonly urgencyStatus: RecallUrgencyStatus;
	readonly daysOverdue: number;
	readonly dueDate: string; // YYYY-MM-DD
	readonly status?: string | undefined;
	readonly referenceDate?: (Date | string) | undefined;
}): HumanRecallBadgeInfo {
	if (params.status === "completed" || params.urgencyStatus === "completed") {
		return { badgeText: "Визит завершен", badgeClass: "completed", badgeTitle: "Контрольный осмотр успешно проведен" };
	}
	if (params.status === "scheduled") {
		return { badgeText: "Записан на прием", badgeClass: "scheduled", badgeTitle: "Пациент записан в расписание клиники" };
	}
	if (params.urgencyStatus === "due_now") {
		return { badgeText: "Срок подошел", badgeClass: "due_now", badgeTitle: `Плановый срок осмотра наступил (${params.dueDate})` };
	}
	if (params.urgencyStatus === "overdue_30" || params.urgencyStatus === "overdue_90") {
		const overdueDays = Math.max(1, params.daysOverdue);
		const daysStr = formatRussianDaysPlural(overdueDays);
		const badgeClass = params.urgencyStatus === "overdue_90" ? "overdue_90" : "overdue_30";
		return { badgeText: `Просрочен на ${daysStr}`, badgeClass, badgeTitle: `Просрочен на ${daysStr} с плановой даты ${params.dueDate}` };
	}

	const due = new Date(params.dueDate);
	const ref = params.referenceDate
		? (typeof params.referenceDate === "string" ? new Date(params.referenceDate) : params.referenceDate)
		: new Date();
	const monthName = !Number.isNaN(due.getTime())
		? (due.getFullYear() !== ref.getFullYear()
			? `${RUSSIAN_MONTH_NAMES_ACCUSATIVE[due.getMonth()]} ${due.getFullYear()}`
			: RUSSIAN_MONTH_NAMES_ACCUSATIVE[due.getMonth()])
		: "срок";

	return { badgeText: `Запланирован на ${monthName}`, badgeClass: "upcoming", badgeTitle: `Плановая дата визита: ${params.dueDate}` };
}
