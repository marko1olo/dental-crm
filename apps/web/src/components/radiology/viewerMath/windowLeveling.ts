/**
 * DENTE DENTAL CRM — 2D Radiology Window Leveling & Contrast Math
 * Clinical W/L presets (standard, endo, perio, caries, implant, negative, soft_tissue)
 * and non-linear tangent contrast factor calculations.
 */

import type { ClinicalWlPreset } from "./types.js";

/** High-utility dental radiography presets */
export const CLINICAL_2D_WL_PRESETS: readonly ClinicalWlPreset[] = [
	{
		id: "standard",
		label: "Стандарт",
		shortLabel: "Стандарт",
		description: "Естественная гамма и сбалансированная плотность снимка",
		brightness: 100,
		contrast: 100,
		invert: false,
		gamma: 1.0,
	},
	{
		id: "endo",
		label: "Эндодонтия",
		shortLabel: "Эндо",
		description: "Повышенный контраст для визуализации апекса, устьев и качества обтурации каналов",
		brightness: 105,
		contrast: 175,
		invert: false,
		gamma: 0.9,
	},
	{
		id: "perio",
		label: "Пародонт / Кость",
		shortLabel: "Перио",
		description: "Оптимизация кортикальной пластинки, периодонтальной щели и трабекул",
		brightness: 110,
		contrast: 160,
		invert: false,
		gamma: 1.1,
	},
	{
		id: "caries",
		label: "Кариес / Эмаль",
		shortLabel: "Кариес",
		description: "Контрастирование эмалево-дентинной границы для скрытого кариеса",
		brightness: 95,
		contrast: 190,
		invert: false,
		gamma: 0.85,
	},
	{
		id: "implant_bone",
		label: "Кость / Импланты",
		shortLabel: "Импланты",
		description: "Подавление засветов металла и визуализация кортикальной пластинки альвеолы",
		brightness: 85,
		contrast: 220,
		invert: false,
		gamma: 1.2,
	},
	{
		id: "negative_invert",
		label: "Негатив (Инверсия)",
		shortLabel: "Негатив",
		description: "Инвертированное рентгеновское отображение для выявления микротрещин и очагов деструкции",
		brightness: 100,
		contrast: 125,
		invert: true,
		gamma: 1.0,
	},
	{
		id: "soft_tissue",
		label: "Мягкие ткани / Пазухи",
		shortLabel: "Ткани",
		description: "Контрастирование слизистой гайморовых пазух и десневого края",
		brightness: 125,
		contrast: 135,
		invert: false,
		gamma: 1.1,
	},
];

/**
 * Computes exact non-linear tangent contrast factor and brightness offset matching EzDent-i.
 * Contrast range -100..+100 -> factor tan((contrast + 100) * pi / 400).
 * At 0% contrast: factor = tan(pi/4) = 1.0.
 */
export function calculateWindowLevelContrast(
	brightnessPct: number,
	contrastPct: number,
): { contrastFactor: number; brightnessOffset: number } {
	const clampedContrast = Math.max(-95, Math.min(200, contrastPct));
	const rad = ((clampedContrast + 100.0) * Math.PI) / 400.0;
	const contrastFactor = Number(Math.tan(rad).toFixed(4));
	const brightnessOffset = Number((brightnessPct / 100.0).toFixed(4));
	return { contrastFactor, brightnessOffset };
}
