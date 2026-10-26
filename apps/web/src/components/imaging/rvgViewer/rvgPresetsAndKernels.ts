/**
 * rvgPresetsAndKernels.ts — Пресеты контрастности и ядра свертки для RVG (Мандат 8b <= 120 строк).
 */

export function clampZoom(zoom: number, min = 0.2, max = 16.0): number {
	return Number(Math.max(min, Math.min(max, zoom)).toFixed(3));
}

export const DENTAL_RADIOGRAPHY_PRESETS = [
	{
		id: "bone_structure",
		labelRu: "Кость / Периодонт",
		shortLabelRu: "Кость",
		windowWidth: 2000,
		windowCenter: 500,
		gamma: 1.0,
		sharpen: 35,
		emboss: false,
		invert: false,
	},
	{
		id: "caries_enamel",
		labelRu: "Эмаль / Кариес",
		shortLabelRu: "Эмаль",
		windowWidth: 4000,
		windowCenter: 1500,
		gamma: 1.2,
		sharpen: 40,
		emboss: false,
		invert: false,
	},
	{
		id: "endo_apex",
		labelRu: "Дентин / Эндодонтия",
		shortLabelRu: "Дентин",
		windowWidth: 1500,
		windowCenter: 300,
		gamma: 0.9,
		sharpen: 30,
		emboss: false,
		invert: false,
	},
	{
		id: "negative_cracks",
		labelRu: "Негатив / Трещины",
		shortLabelRu: "Негатив",
		windowWidth: 2000,
		windowCenter: 500,
		gamma: 1.0,
		sharpen: 30,
		emboss: false,
		invert: true,
	},
	{
		id: "soft_tissue",
		labelRu: "Мягкие ткани / Десна",
		shortLabelRu: "Десна",
		windowWidth: 400,
		windowCenter: 40,
		gamma: 1.0,
		sharpen: 0,
		emboss: false,
		invert: false,
	},
] as const;

export const SMOOTH_KERNEL_3X3: readonly (readonly number[])[] = [
	[1, 2, 1],
	[2, 4, 2],
	[1, 2, 1],
];

export const MAX_RES_KERNEL_3X3: readonly (readonly number[])[] = [
	[-1, -1, -1],
	[-1, 9, -1],
	[-1, -1, -1],
];
