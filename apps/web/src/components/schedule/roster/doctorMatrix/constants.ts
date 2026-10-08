/**
 * DENTE Dental CRM — Doctor Shift Roster Matrix Constants (Layer 0)
 * Compliance: TK RF Article 350 (33-hour medical workweek), Form T-13
 */

export const MEDICAL_WORKWEEK_NORM_HOURS = 33;
export const ASSISTANT_WORKWEEK_NORM_HOURS = 39;
export const STANDARD_WORKWEEK_NORM_HOURS = 40;

export const SHIFT_PRESET_TIMES = {
	morning: {
		label: "Утро",
		timeRange: "08:00–14:00",
		durationHours: 6,
		color: "#f59e0b",
	},
	evening: {
		label: "Вечер",
		timeRange: "14:00–20:00",
		durationHours: 6,
		color: "#6366f1",
	},
	full_day: {
		label: "Весь день",
		timeRange: "08:00–20:00",
		durationHours: 11,
		color: "#0d9488",
	},
	clear: {
		label: "Выходной",
		timeRange: "Очистить смену",
		durationHours: 0,
		color: "#ef4444",
	},
} as const;

export const WEEKLY_CHAIR_TEMPLATES = [
	{
		id: "mon_wed_fri_morning",
		testId: "cell-template-mon-wed-fri",
		title: "Пн/Ср/Пт",
		subtitle: "Утро 08:00–14:00",
		iconColor: "#f59e0b",
	},
	{
		id: "tue_thu_sat_evening",
		testId: "cell-template-tue-thu-sat",
		title: "Вт/Чт/Сб",
		subtitle: "Вечер 14:00–20:00",
		iconColor: "#6366f1",
	},
	{
		id: "two_two_full",
		testId: "cell-template-two-two",
		title: "2 через 2",
		subtitle: "Весь день 08:00–20:00",
		iconColor: "#0d9488",
	},
	{
		id: "daily_morning",
		testId: "cell-template-daily-morning",
		title: "Каждый день",
		subtitle: "Утро 08:00–14:00",
		iconColor: "#0284c7",
	},
	{
		id: "five_day_standard",
		testId: "cell-template-five-day",
		title: "Пятидневка",
		subtitle: "Пн-Пт 09:00–18:00",
		iconColor: "#2563eb",
	},
	{
		id: "even_odd_month",
		testId: "cell-template-even-odd",
		title: "Чётные / Нечётные дни месяца",
		subtitle: "Врач А — чётные (08–14) / Врач Б — нечётные (14–20)",
		iconColor: "#0d9488",
		spanTwoCols: true,
	},
] as const;
