export const DATE_RANGES = [
	{ value: "today", label: "Сегодня" },
	{ value: "week", label: "Неделя" },
	{ value: "month", label: "Месяц" },
	{ value: "quarter", label: "Квартал" },
	{ value: "year", label: "Год" },
	{ value: "all", label: "Всё время" },
] as const;

export const BRANCH_OPTIONS = [
	{ value: "all", label: "Все филиалы" },
	{ value: "main", label: "Основной" },
] as const;

/** Период фонового обновления. Оно НЕ должно гасить уже показанный дашборд. */
export const REFRESH_INTERVAL_MS = 60_000;
