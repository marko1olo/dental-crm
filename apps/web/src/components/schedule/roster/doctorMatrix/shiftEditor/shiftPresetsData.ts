/**
 * DENTE Dental CRM — Shift Presets & Weekly Templates Data
 * 1-Click Fast Shift Templates (Mandates 8k, 8n)
 */

import type { ShiftPresetDefinition, WeeklyTemplateDefinition } from "./shiftEditorTypes";

export const SHIFT_PRESETS: readonly ShiftPresetDefinition[] = [
	{
		id: "morning",
		title: "Утро",
		subtitle: "08:00–14:00 (6ч)",
		icon: "sun",
		color: "#f59e0b",
		testId: "cell-preset-morning",
	},
	{
		id: "evening",
		title: "Вечер",
		subtitle: "14:00–20:00 (6ч)",
		icon: "moon",
		color: "#6366f1",
		testId: "cell-preset-evening",
	},
	{
		id: "full_day",
		title: "Весь день",
		subtitle: "08:00–20:00 (11ч)",
		icon: "building",
		color: "#0d9488",
		testId: "cell-preset-full-day",
	},
	{
		id: "clear",
		title: "Выходной",
		subtitle: "Очистить смену",
		icon: "trash",
		color: "#ef4444",
		testId: "cell-preset-clear",
	},
];

export const WEEKLY_TEMPLATES: readonly WeeklyTemplateDefinition[] = [
	{
		id: "mon_wed_fri_morning",
		title: "Пн/Ср/Пт",
		subtitle: "Утро 08:00–14:00",
		icon: "sun",
		color: "#f59e0b",
		testId: "cell-template-mon-wed-fri",
	},
	{
		id: "tue_thu_sat_evening",
		title: "Вт/Чт/Сб",
		subtitle: "Вечер 14:00–20:00",
		icon: "moon",
		color: "#6366f1",
		testId: "cell-template-tue-thu-sat",
	},
	{
		id: "two_two_full",
		title: "2 через 2",
		subtitle: "Весь день 08:00–20:00",
		icon: "calendar",
		color: "#0d9488",
		testId: "cell-template-two-two",
	},
	{
		id: "daily_morning",
		title: "Каждый день",
		subtitle: "Утро 08:00–14:00",
		icon: "sun",
		color: "#0284c7",
		testId: "cell-template-daily-morning",
	},
	{
		id: "five_day_standard",
		title: "Пятидневка",
		subtitle: "Пн-Пт 09:00–18:00",
		icon: "building",
		color: "#2563eb",
		testId: "cell-template-five-day",
	},
	{
		id: "even_odd_month",
		title: "Чётные / Нечётные дни месяца",
		subtitle: "Врач А — чётные (08–14) / Врач Б — нечётные (14–20)",
		icon: "calendar",
		color: "#0d9488",
		testId: "cell-template-even-odd",
		fullWidth: true,
	},
];
