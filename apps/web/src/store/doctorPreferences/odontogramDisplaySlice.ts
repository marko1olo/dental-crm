/**
 * doctorPreferences/odontogramDisplaySlice.ts — Пресеты отображения одонтограммы и длительности визита.
 * Мандаты 8b, 8e (Автономия врача: удобный выбор FDI / Universal / Palmer).
 */

import type { OdontogramNotation } from "./types.js";

export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120] as const;

export interface OdontogramNotationConfig {
	readonly key: OdontogramNotation;
	readonly title: string;
	readonly description: string;
	readonly sample: string;
}

export const ODONTOGRAM_NOTATIONS: readonly OdontogramNotationConfig[] = [
	{
		key: "fdi",
		title: "FDI (Двухцифровая международная)",
		description: "Стандарт Минздрава РФ и ВОЗ (квадрант + номер зуба)",
		sample: "11, 26, 36, 48",
	},
	{
		key: "universal",
		title: "Универсальная (США)",
		description: "Сквозная нумерация зубов от 1 до 32",
		sample: "1..32",
	},
	{
		key: "palmer",
		title: "Система Палмера",
		description: "Квадрантная сеточная запись (1–8 от центра)",
		sample: "┘8, └6, ┐1",
	},
];
