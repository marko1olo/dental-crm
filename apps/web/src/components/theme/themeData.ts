import type { ThemeMode } from "../../store/themeStore";

export interface ThemeMetadata {
	readonly id: ThemeMode;
	readonly name: string;
	readonly shortLabel: string;
	readonly category: "light" | "dark" | "a11y";
	readonly badge: string;
	readonly wcagRatio: string;
	readonly primaryDot: string;
	readonly secondaryDot: string;
	readonly description: string;
	readonly atmosphericGlow: string;
}

export const DENTE_THEMES: readonly ThemeMetadata[] = [
	{
		id: "light",
		name: "Светлая классика",
		shortLabel: "Свет",
		category: "light",
		badge: "Дневной приём",
		wcagRatio: "7.8:1",
		primaryDot: "#0d9488",
		secondaryDot: "#f0f5f3",
		description: "Базовая чистая клиническая тема с мягкими мятно-бирюзовыми акцентами для освещённых кабинетов.",
		atmosphericGlow: "rgba(13, 148, 136, 0.15)",
	},
	{
		id: "dark",
		name: "Графитовая тьма",
		shortLabel: "Тьма",
		category: "dark",
		badge: "Снижение утомления",
		wcagRatio: "12.4:1",
		primaryDot: "#2dd4bf",
		secondaryDot: "#0f172a",
		description: "Глубокий графитовый тон для снижения нагрузки на зрение врача при длительных 12-часовых сменах.",
		atmosphericGlow: "rgba(45, 212, 191, 0.25)",
	},
	{
		id: "ocean",
		name: "Глубокий океан",
		shortLabel: "Океан",
		category: "dark",
		badge: "Премиум сапфир",
		wcagRatio: "11.8:1",
		primaryDot: "#38bdf8",
		secondaryDot: "#0c1e3d",
		description: "Глубоководный сине-стальной ультрамарин с мягкой неоновой подсветкой контуров и стеклянным лоском.",
		atmosphericGlow: "rgba(56, 189, 248, 0.3)",
	},
	{
		id: "sakura",
		name: "Цветущая сакура",
		shortLabel: "Сакура",
		category: "light",
		badge: "Эстетика и дети",
		wcagRatio: "8.2:1",
		primaryDot: "#db2777",
		secondaryDot: "#fff1f2",
		description: "Пудрово-розовый премиальный интерьер для эстетической, детской стоматологии и ортодонтии.",
		atmosphericGlow: "rgba(219, 39, 119, 0.22)",
	},
	{
		id: "emerald",
		name: "Хвойный изумруд",
		shortLabel: "Изумруд",
		category: "dark",
		badge: "Релаксация глаз",
		wcagRatio: "13.1:1",
		primaryDot: "#34d399",
		secondaryDot: "#022c22",
		description: "Хвойно-изумрудная палитра альпийского леса для максимального расслабления зрительного нерва хирурга.",
		atmosphericGlow: "rgba(52, 211, 153, 0.28)",
	},
	{
		id: "cyber_xray",
		name: "Кибер-рентген КТ",
		shortLabel: "Рентген",
		category: "dark",
		badge: "Визиография / 3D",
		wcagRatio: "14.5:1",
		primaryDot: "#00f0ff",
		secondaryDot: "#081026",
		description: "Высококонтрастный кибернетический визиограф для детального изучения срезов КЛКТ, ОПТГ и прицельных снимков.",
		atmosphericGlow: "rgba(0, 240, 255, 0.35)",
	},
	{
		id: "night",
		name: "Истинный OLED",
		shortLabel: "OLED",
		category: "dark",
		badge: "100% чёрный",
		wcagRatio: "21.0:1",
		primaryDot: "#ffffff",
		secondaryDot: "#000000",
		description: "Абсолютный глубокий чёрный пиксель для OLED-экранов планшетов и моноблоков. Нулевой паразитный свет.",
		atmosphericGlow: "rgba(255, 255, 255, 0.15)",
	},
	{
		id: "warm_sand",
		name: "Тёплый песок",
		shortLabel: "Песок",
		category: "light",
		badge: "Керамический уют",
		wcagRatio: "9.5:1",
		primaryDot: "#d97706",
		secondaryDot: "#fefce8",
		description: "Уютный шамотно-керамический оттенок натурального льна и тёплого песка для спокойного приёма.",
		atmosphericGlow: "rgba(217, 119, 6, 0.2)",
	},
	{
		id: "calm_teal",
		name: "Спокойный бриз",
		shortLabel: "Морская",
		category: "light",
		badge: "Анти-тревога",
		wcagRatio: "8.9:1",
		primaryDot: "#0f766e",
		secondaryDot: "#f0fdfa",
		description: "Скандинавская успокаивающая бирюза для снижения дентофобии и стресса у чувствительных пациентов.",
		atmosphericGlow: "rgba(15, 118, 110, 0.2)",
	},
	{
		id: "contrast",
		name: "Медицинский контраст",
		shortLabel: "Контраст",
		category: "a11y",
		badge: "WCAG AAA (ГОСТ)",
		wcagRatio: "21.0:1",
		primaryDot: "#000000",
		secondaryDot: "#ffffff",
		description: "Максимальный оптический контраст для слабовидящих врачей и пациентов по ГОСТ Р 52872-2019.",
		atmosphericGlow: "none",
	},
];
