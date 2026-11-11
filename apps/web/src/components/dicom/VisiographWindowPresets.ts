/**
 * VisiographWindowPresets.ts
 *
 * Canonical Single Source of Truth (SSOT) for 2D Visiograph & 3D CBCT / DICOM Window Presets.
 * Preserves full backwards compatibility and modular decomposition <= 250 lines (Mandate 8b).
 */

export type VisiographPresetId =
	| "bone"
	| "enamel_dentin"
	| "soft_tissue"
	| "endodontic_canal"
	| "airway"
	| "skull"
	| "endoscopy"
	| "soft_tissue_bone";

export interface VisiographWindowPreset {
	id: VisiographPresetId;
	label: string;
	shortLabel: string;
	icon: string;
	description: string;
	windowWidth: number;
	windowCenter: number;
	voiRange: {
		lower: number;
		upper: number;
	};
}

/**
 * Computes VOI (Value of Interest) window range from window width (WW) and window level (WL).
 */
export function computeVoiRange(
	windowWidth: number,
	windowCenter: number,
): { lower: number; upper: number } {
	const halfWidth = windowWidth / 2;
	return {
		lower: windowCenter - halfWidth,
		upper: windowCenter + halfWidth,
	};
}

export const VISIOGRAPH_WINDOW_PRESETS: Record<VisiographPresetId, VisiographWindowPreset> = {
	bone: {
		id: "bone",
		label: "Костная ткань",
		shortLabel: "Кость",
		icon: "bone",
		description: "Оптическая плотность альвеолярного гребня и кортикальной пластинки (WW 2000, WL 500)",
		windowWidth: 2000,
		windowCenter: 500,
		voiRange: computeVoiRange(2000, 500),
	},
	enamel_dentin: {
		id: "enamel_dentin",
		label: "Эмаль / Дентин",
		shortLabel: "Зубы / Металл",
		icon: "tooth",
		description: "Высококонтрастные структуры эмали, дентина, коронок и металла (WW 4000, WL 1500)",
		windowWidth: 4000,
		windowCenter: 1500,
		voiRange: computeVoiRange(4000, 1500),
	},
	soft_tissue: {
		id: "soft_tissue",
		label: "Мягкие ткани / Десна",
		shortLabel: "Ткани",
		icon: "tissue",
		description: "Оптическая плотность мягких тканей, слизистой и десневого края (WW 400, WL 40)",
		windowWidth: 400,
		windowCenter: 40,
		voiRange: computeVoiRange(400, 40),
	},
	endodontic_canal: {
		id: "endodontic_canal",
		label: "Эндодонтический канал / Апекс",
		shortLabel: "Эндо / Апекс",
		icon: "microscope",
		description: "Оптическая плотность корневых каналов, периодонтальной щели и апекса (WW 1500, WL 300)",
		windowWidth: 1500,
		windowCenter: 300,
		voiRange: computeVoiRange(1500, 300),
	},
	airway: {
		id: "airway",
		label: "Дыхательные пути",
		shortLabel: "Airway",
		icon: "wind",
		description: "Зоны просветления, верхнечелюстные синусы (WW 2000, WL -800)",
		windowWidth: 2000,
		windowCenter: -800,
		voiRange: computeVoiRange(2000, -800),
	},
	skull: {
		id: "skull",
		label: "Кости черепа",
		shortLabel: "Skull",
		icon: "skull",
		description: "Костные структуры черепа, скуловые дуги (WW 2500, WL 600)",
		windowWidth: 2500,
		windowCenter: 600,
		voiRange: computeVoiRange(2500, 600),
	},
	endoscopy: {
		id: "endoscopy",
		label: "Эндоскопия / ВНЧС",
		shortLabel: "Endo / ВНЧС",
		icon: "scan",
		description: "Полостные структуры, суставная щель ВНЧС (WW 800, WL -200)",
		windowWidth: 800,
		windowCenter: -200,
		voiRange: computeVoiRange(800, -200),
	},
	soft_tissue_bone: {
		id: "soft_tissue_bone",
		label: "Мягкие ткани + Кость",
		shortLabel: "Ткани+Кость",
		icon: "layers",
		description: "Комбинированная оптическая плотность мягких тканей и кости (WW 2800, WL 400)",
		windowWidth: 2800,
		windowCenter: 400,
		voiRange: computeVoiRange(2800, 400),
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
export function opticalDensityToGrayscale(
	intensityValue: number,
	windowWidth: number,
	windowCenter: number,
): number {
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

export interface ClinicalVisiographFilterPreset {
	readonly id:
		| "bone_periodont"
		| "endodontics"
		| "caries_enamel"
		| "negative_cracks"
		| "pseudo_relief";
	readonly label: string;
	readonly shortLabel: string;
	readonly badge: string;
	readonly description: string;
	readonly params: {
		readonly brightness: number;
		readonly contrast: number;
		readonly gamma: number;
		readonly sharpness: number;
		readonly invert: boolean;
		readonly maxSharpness?: boolean;
		readonly pseudoRelief?: boolean;
	};
}

export const CLINICAL_VISIOGRAPH_FILTERS: readonly ClinicalVisiographFilterPreset[] = [
	{
		id: "bone_periodont",
		label: "Кость / Периодонт",
		shortLabel: "Кость",
		badge: "костные балки и периодонт",
		description: "Фильтр костных балок, периодонтальной щели и кортикальной пластинки (высокая резкость)",
		params: {
			brightness: 5,
			contrast: 32,
			gamma: 0.9,
			sharpness: 80,
			invert: false,
		},
	},
	{
		id: "endodontics",
		label: "Эндодонтия (Канал / Апекс)",
		shortLabel: "Эндодонтия",
		badge: "контраст апекса и каналов",
		description: "Контраст верхушки корня (апекса), кривизны и устьев корневых каналов",
		params: {
			brightness: -5,
			contrast: 48,
			gamma: 0.85,
			sharpness: 60,
			invert: false,
		},
	},
	{
		id: "caries_enamel",
		label: "Кариес / Эмаль",
		shortLabel: "Эмаль",
		badge: "мягкие ткани и пришеечная зона",
		description: "Диагностика пришеечного кариеса, мягких тканей десны и деминерализации эмали",
		params: {
			brightness: 12,
			contrast: 42,
			gamma: 1.18,
			sharpness: 50,
			invert: false,
		},
	},
	{
		id: "negative_cracks",
		label: "Негатив / Трещины",
		shortLabel: "Инверсия",
		badge: "инверсия / микротрещины корня",
		description: "Инвертированное отображение для выявления микротрещин корня и переломов",
		params: {
			brightness: 0,
			contrast: 35,
			gamma: 1.0,
			sharpness: 65,
			invert: true,
			maxSharpness: false,
			pseudoRelief: false,
		},
	},
	{
		id: "pseudo_relief",
		label: "Псевдо-3D / Рельеф",
		shortLabel: "Рельеф",
		badge: "эмбоссирование 45° / микрорельеф",
		description: "Псевдотрехмерный рельефный фильтр (Emboss 45°) для визуализации кортикальной границы",
		params: {
			brightness: 0,
			contrast: 25,
			gamma: 1.0,
			sharpness: 40,
			invert: false,
			maxSharpness: false,
			pseudoRelief: true,
		},
	},
];
