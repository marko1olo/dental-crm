import type { ThemeMode } from "../../../store/themeStore";

export interface ThemeOptionItem {
	readonly mode: ThemeMode;
	readonly title: string;
	readonly desc: string;
	readonly badge: string;
	readonly previewColors: readonly [string, string, string];
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
