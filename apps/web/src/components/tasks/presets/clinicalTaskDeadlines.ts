import type {
	ClinicalTask,
	TaskDeadlineCategory,
	TaskDeadlineFilter,
} from "../clinicalTasksTypes";

export function formatMoment(iso: string): string {
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) return iso;
	return parsed.toLocaleString("ru-RU", {
		day: "numeric",
		month: "long",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function getTaskDeadlineCategory(dueAt: string | null | undefined): TaskDeadlineCategory {
	if (!dueAt) return "no_due";
	const due = new Date(dueAt);
	if (Number.isNaN(due.getTime())) return "no_due";

	const now = new Date();
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
	const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
	const tomorrowEnd = new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000);

	if (due.getTime() < todayStart.getTime()) return "overdue";
	if (due.getTime() <= todayEnd.getTime()) return "today";
	if (due.getTime() <= tomorrowEnd.getTime()) return "tomorrow";
	return "upcoming";
}

export function getDeadlineBadge(dueAt: string | null | undefined): {
	label: string;
	tone: "danger" | "warning" | "info" | "neutral";
	isOverdue: boolean;
} {
	if (!dueAt) return { label: "Без срока", tone: "neutral", isOverdue: false };
	const category = getTaskDeadlineCategory(dueAt);
	const formatted = formatMoment(dueAt);

	if (category === "overdue") {
		return { label: `Просрочено (${formatted})`, tone: "danger", isOverdue: true };
	}
	if (category === "today") {
		return { label: `Сегодня (${formatted})`, tone: "warning", isOverdue: false };
	}
	if (category === "tomorrow") {
		return { label: `Завтра (${formatted})`, tone: "info", isOverdue: false };
	}
	return { label: `Срок: ${formatted}`, tone: "neutral", isOverdue: false };
}

export function filterTasksByDeadline(
	tasks: readonly ClinicalTask[],
	filter: TaskDeadlineFilter,
): ClinicalTask[] {
	if (filter === "all") return [...tasks];
	return tasks.filter((t) => {
		const cat = getTaskDeadlineCategory(t.dueAt);
		if (filter === "today") return cat === "today";
		if (filter === "tomorrow") return cat === "tomorrow";
		if (filter === "overdue") return cat === "overdue";
		return true;
	});
}

export function countTasksByDeadline(
	tasks: readonly ClinicalTask[],
): Record<TaskDeadlineFilter, number> {
	let today = 0;
	let tomorrow = 0;
	let overdue = 0;
	for (const t of tasks) {
		if (t.status === "completed" || t.status === "cancelled") continue;
		const cat = getTaskDeadlineCategory(t.dueAt);
		if (cat === "today") today++;
		else if (cat === "tomorrow") tomorrow++;
		else if (cat === "overdue") overdue++;
	}
	return {
		all: tasks.length,
		today,
		tomorrow,
		overdue,
	};
}
