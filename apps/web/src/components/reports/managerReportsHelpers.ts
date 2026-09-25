/**
 * Вспомогательные функции форматирования и константы отчётов управляющего.
 */

export const bucketLabels: Record<string, string> = {
	current: "до недели",
	up_to_30: "до 30 дней",
	up_to_90: "до 90 дней",
	over_90: "больше 90 дней",
	undated: "дата не определена",
};

export const appointmentStatusLabels: Record<string, string> = {
	scheduled: "Назначен",
	confirmed: "Подтверждён",
	arrived: "Пришёл",
	in_treatment: "На приёме",
	completed: "Завершён",
	cancelled: "Отменён",
	no_show: "Неявка",
	rescheduled: "Перенесён",
	waiting: "Ожидает",
};

export const weekdayNames = ["", "пн", "вт", "ср", "чт", "пт", "сб", "вс"];

export function formatPercent(value: number | null | undefined): string {
	return value === null || value === undefined || !Number.isFinite(value)
		? "—"
		: `${Math.round(value * 100)} %`;
}

export function formatHours(minutes: number): string {
	if (!Number.isFinite(minutes) || minutes < 0) return "0 ч";
	const hours = Math.floor(minutes / 60);
	const rest = Math.round(minutes % 60);
	return rest > 0 ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

/** Начало и конец месяца в виде YYYY-MM-DD для полей ввода. */
export function monthBounds(now = new Date()): { from: string; to: string } {
	const first = new Date(now.getFullYear(), now.getMonth(), 1);
	const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	const iso = (date: Date) =>
		`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
	return { from: iso(first), to: iso(last) };
}
