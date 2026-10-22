import type { PeriodPreset } from "./types.js";

export const RUSSIAN_DAYS_OF_WEEK = [
	"Воскресенье",
	"Понедельник",
	"Вторник",
	"Среда",
	"Четверг",
	"Пятница",
	"Суббота",
] as const;

export function calculatePeriodDateRange(
	preset: PeriodPreset,
	customStart?: string,
	customEnd?: string,
	referenceDateStr?: string,
): { startDate: string; endDate: string; labelRu: string } {
	const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
	const y = refDate.getFullYear();
	const m = refDate.getMonth();

	const formatIso = (date: Date): string => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	if (preset === "last_week") {
		const end = new Date(refDate);
		const start = new Date(refDate);
		start.setDate(start.getDate() - 6);
		return {
			startDate: formatIso(start),
			endDate: formatIso(end),
			labelRu: `Последняя неделя (${formatIso(start)} — ${formatIso(end)})`,
		};
	}

	if (preset === "current_month") {
		const start = new Date(y, m, 1);
		const end = new Date(refDate);
		return {
			startDate: formatIso(start),
			endDate: formatIso(end),
			labelRu: `Текущий месяц (${formatIso(start)} — ${formatIso(end)})`,
		};
	}

	if (preset === "previous_month") {
		const start = new Date(y, m - 1, 1);
		const end = new Date(y, m, 0);
		return {
			startDate: formatIso(start),
			endDate: formatIso(end),
			labelRu: `Прошлый месяц (${formatIso(start)} — ${formatIso(end)})`,
		};
	}

	if (preset === "current_quarter") {
		const quarterIndex = Math.floor(m / 3);
		const startMonth = quarterIndex * 3;
		const start = new Date(y, startMonth, 1);
		const end = new Date(refDate);
		return {
			startDate: formatIso(start),
			endDate: formatIso(end),
			labelRu: `Текущий ${quarterIndex + 1}-й квартал (${formatIso(start)} — ${formatIso(end)})`,
		};
	}

	const s = customStart || formatIso(new Date(y, m, 1));
	const e = customEnd || formatIso(refDate);
	return {
		startDate: s,
		endDate: e,
		labelRu: `Выбранный период (${s} — ${e})`,
	};
}
