import type { ThemeMode } from "../../store/themeStore";
import type { DoctorSpecialtyKey } from "../../store/doctorPreferencesStore";

export interface ThemeOptionItem {
	readonly mode: ThemeMode;
	readonly title: string;
	readonly desc: string;
	readonly badge: string;
	readonly previewColors: readonly [string, string, string];
}

export interface QuickProtocolItem {
	readonly id: string;
	readonly title: string;
	readonly icd: string;
}

export interface SpecialtyPresetItem {
	readonly key: DoctorSpecialtyKey;
	readonly label: string;
}

export const THEME_OPTIONS: readonly ThemeOptionItem[] = [
	{
		mode: "light",
		title: "Клиническая светлая",
		desc: "Высокая четкость при дневном свете кабинета",
		badge: "Стандарт",
		previewColors: ["#f8fafc", "#ffffff", "#0d9488"],
	},
	{
		mode: "dark",
		title: "Графит (Dark Slate)",
		desc: "Мягкая тёмная палитра для вечерних смен",
		badge: "Популярная",
		previewColors: ["#0f172a", "#1e293b", "#14b8a6"],
	},
	{
		mode: "night",
		title: "Ночь (OLED Warm Dark)",
		desc: "Ультра-тёмный теплый фон, минимум синего света",
		badge: "Щадящий свет",
		previewColors: ["#090d16", "#111827", "#10b981"],
	},
	{
		mode: "calm_teal",
		title: "Спокойная бирюза",
		desc: "Морской освежающий оттенок морской волны",
		badge: "Релакс",
		previewColors: ["#f0fdfa", "#ffffff", "#0f766e"],
	},
	{
		mode: "ocean",
		title: "Глубокий океан",
		desc: "Насыщенный сапфировый ультрамарин",
		badge: "Контраст",
		previewColors: ["#0b132b", "#1c2541", "#38bdf8"],
	},
	{
		mode: "emerald",
		title: "Изумрудный бор",
		desc: "Хвойный зеленый, успокаивающий зрение",
		badge: "Эко",
		previewColors: ["#061a14", "#0a2e23", "#10b981"],
	},
	{
		mode: "contrast",
		title: "Высокий контраст (WCAG AAA)",
		desc: "Максимальная видимость для слабовидящих",
		badge: "a11y",
		previewColors: ["#000000", "#18181b", "#fbbf24"],
	},
];

export const AVAILABLE_QUICK_PROTOCOLS: readonly QuickProtocolItem[] = [
	{ id: "caries_medium_k02_1", title: "Лечение среднего кариеса", icd: "К02.1" },
	{ id: "caries_deep_k02_1", title: "Лечение глубокого кариеса", icd: "К02.1" },
	{ id: "pulpitis_acute_k04_0", title: "Острый пульпит", icd: "К04.0" },
	{ id: "periodontitis_chronic_k04_5", title: "Хронический периодонтит", icd: "К04.5" },
	{ id: "extraction_simple_k08_1", title: "Удаление зуба простое", icd: "К08.1" },
	{ id: "extraction_complex_k01_1", title: "Сложное атипичное удаление", icd: "К01.1" },
	{ id: "implant_installation_k08_1", title: "Дентальная имплантация", icd: "К08.1" },
	{ id: "bone_graft_sinus_k08_2", title: "Костная пластика: Синус-лифтинг", icd: "К08.2" },
	{ id: "bone_graft_gbr_k08_2", title: "НКР альвеолярного гребня", icd: "К08.2" },
	{ id: "prophy_hygiene_k05_0", title: "Комплексная гигиена", icd: "К05.0" },
];

export const SPECIALTY_PRESET_ITEMS: readonly SpecialtyPresetItem[] = [
	{ key: "therapist", label: "Терапевт" },
	{ key: "surgeon", label: "Хирург-имплантолог" },
	{ key: "orthopedist", label: "Ортопед" },
	{ key: "orthodontist", label: "Ортодонт" },
	{ key: "pediatric", label: "Детский врач" },
	{ key: "universal", label: "Универсальный" },
];
