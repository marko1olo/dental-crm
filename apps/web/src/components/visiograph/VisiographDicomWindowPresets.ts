/**
 * VisiographDicomWindowPresets.ts — Оптическая плотность и градации серого для 2D-визиографии (RVG).
 * В 2D рентгене нет срезов толщины томографа: оперирует оптической плотностью [0..255 / 0..65535].
 * Единицы Хаунсфилда (HU) физически применимы исключительно к 3D КЛКТ (CBCT). Мандат 8b (<=120 строк).
 */

import { type VisiographPresetId, type VisiographWindowPreset, computeVoiRange } from "./VisiographWindowPresetTypes";

export const VISIOGRAPH_WINDOW_PRESETS: Record<VisiographPresetId, VisiographWindowPreset> = {
	bone: {
		id: "bone", label: "Костная ткань", shortLabel: "Кость", icon: "bone",
		description: "Оптическая плотность альвеолярного гребня и кортикальной пластинки (WW 2000, WL 500)",
		windowWidth: 2000, windowCenter: 500, voiRange: computeVoiRange(2000, 500),
	},
	enamel_dentin: {
		id: "enamel_dentin", label: "Эмаль / Дентин", shortLabel: "Зубы / Металл", icon: "tooth",
		description: "Высококонтрастные структуры эмали, дентина, коронок и металла (WW 4000, WL 1500)",
		windowWidth: 4000, windowCenter: 1500, voiRange: computeVoiRange(4000, 1500),
	},
	soft_tissue: {
		id: "soft_tissue", label: "Мягкие ткани / Десна", shortLabel: "Ткани", icon: "tissue",
		description: "Оптическая плотность мягких тканей, слизистой и десневого края (WW 400, WL 40)",
		windowWidth: 400, windowCenter: 40, voiRange: computeVoiRange(400, 40),
	},
	endodontic_canal: {
		id: "endodontic_canal", label: "Эндодонтический канал / Апекс", shortLabel: "Эндо / Апекс", icon: "microscope",
		description: "Оптическая плотность корневых каналов, периодонтальной щели и апекса (WW 1500, WL 300)",
		windowWidth: 1500, windowCenter: 300, voiRange: computeVoiRange(1500, 300),
	},
	airway: {
		id: "airway", label: "Дыхательные пути", shortLabel: "Airway", icon: "wind",
		description: "Зоны просветления, верхнечелюстные синусы (WW 2000, WL -800)",
		windowWidth: 2000, windowCenter: -800, voiRange: computeVoiRange(2000, -800),
	},
	skull: {
		id: "skull", label: "Кости черепа", shortLabel: "Skull", icon: "skull",
		description: "Костные структуры черепа, скуловые дуги (WW 2500, WL 600)",
		windowWidth: 2500, windowCenter: 600, voiRange: computeVoiRange(2500, 600),
	},
	endoscopy: {
		id: "endoscopy", label: "Эндоскопия / ВНЧС", shortLabel: "Endo / ВНЧС", icon: "scan",
		description: "Полостные структуры, суставная щель ВНЧС (WW 800, WL -200)",
		windowWidth: 800, windowCenter: -200, voiRange: computeVoiRange(800, -200),
	},
	soft_tissue_bone: {
		id: "soft_tissue_bone", label: "Мягкие ткани + Кость", shortLabel: "Ткани+Кость", icon: "layers",
		description: "Комбинированная оптическая плотность мягких тканей и кости (WW 2800, WL 400)",
		windowWidth: 2800, windowCenter: 400, voiRange: computeVoiRange(2800, 400),
	},
};

export const BASE_VISIOGRAPH_PRESETS_LIST: VisiographWindowPreset[] = [
	VISIOGRAPH_WINDOW_PRESETS.bone,
	VISIOGRAPH_WINDOW_PRESETS.enamel_dentin,
	VISIOGRAPH_WINDOW_PRESETS.soft_tissue,
	VISIOGRAPH_WINDOW_PRESETS.endodontic_canal,
];

export const CDVIEWER_CLINICAL_PRESETS: VisiographWindowPreset[] = [
	VISIOGRAPH_WINDOW_PRESETS.airway,
	VISIOGRAPH_WINDOW_PRESETS.skull,
	VISIOGRAPH_WINDOW_PRESETS.endoscopy,
	VISIOGRAPH_WINDOW_PRESETS.soft_tissue_bone,
];

export const VISIOGRAPH_PRESETS_LIST: VisiographWindowPreset[] = [
	...BASE_VISIOGRAPH_PRESETS_LIST,
	...CDVIEWER_CLINICAL_PRESETS,
];

/** Преобразует значение оптической плотности/интенсивности в 8-битный grayscale [0..255] */
export function opticalDensityToGrayscale(intensityValue: number, windowWidth: number, windowCenter: number): number {
	const { lower, upper } = computeVoiRange(windowWidth, windowCenter);
	if (!Number.isFinite(intensityValue)) return 0;
	if (intensityValue <= lower) return 0;
	if (intensityValue >= upper) return 255;
	const range = upper - lower;
	if (range <= 0) return 128;
	return Math.round(((intensityValue - lower) / range) * 255);
}

/** Алиас для обратной совместимости с модулями 3D CBCT */
export const huToGrayscale = opticalDensityToGrayscale;
