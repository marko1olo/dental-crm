/**
 * Standard Hounsfield Unit (HU) windowing presets for 3D Visiograph, CBCT & DICOM viewers.
 *
 * Presets calibrated for clinical dental radiography:
 * - Bone Preset: Window 2000, Level 500 (Trabecular/Cortical bone contrast)
 * - Enamel/Dentin: Window 4000, Level 1500 (Dense tooth enamel & dentin discrimination)
 * - Soft Tissue / Gingiva: Window 400, Level 40 (Gingival architecture & soft mucosa)
 * - Endodontic Canal / Apex: Window 1500, Level 300 (Root canal morphology & periapical pathosis)
 */

export type VisiographPresetId =
	| "bone"
	| "enamel_dentin"
	| "soft_tissue"
	| "endodontic_canal";

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

export const VISIOGRAPH_WINDOW_PRESETS: Record<
	VisiographPresetId,
	VisiographWindowPreset
> = {
	bone: {
		id: "bone",
		label: "Костная ткань",
		shortLabel: "Кость",
		icon: "bone",
		description: "Плотность альвеолярного гребня и кортикальной пластинки (WW 2000, WL 500)",
		windowWidth: 2000,
		windowCenter: 500,
		voiRange: computeVoiRange(2000, 500), // lower: -500, upper: 1500
	},
	enamel_dentin: {
		id: "enamel_dentin",
		label: "Эмаль / Дентин",
		shortLabel: "Зубы",
		icon: "tooth",
		description: "Высокоплотные структуры эмали, дентина и коронок (WW 4000, WL 1500)",
		windowWidth: 4000,
		windowCenter: 1500,
		voiRange: computeVoiRange(4000, 1500), // lower: -500, upper: 3500
	},
	soft_tissue: {
		id: "soft_tissue",
		label: "Мягкие ткани / Десна",
		shortLabel: "Ткани",
		icon: "tissue",
		description: "Десневой контур, слизистая и мягкотканные образования (WW 400, WL 40)",
		windowWidth: 400,
		windowCenter: 40,
		voiRange: computeVoiRange(400, 40), // lower: -160, upper: 240
	},
	endodontic_canal: {
		id: "endodontic_canal",
		label: "Эндодонтический канал / Апекс",
		shortLabel: "Эндо / Апекс",
		icon: "microscope",
		description: "Корневые каналы, верхушечные периодонтиты и апексы (WW 1500, WL 300)",
		windowWidth: 1500,
		windowCenter: 300,
		voiRange: computeVoiRange(1500, 300), // lower: -450, upper: 1050
	},
};

export const VISIOGRAPH_PRESETS_LIST: VisiographWindowPreset[] = [
	VISIOGRAPH_WINDOW_PRESETS.bone,
	VISIOGRAPH_WINDOW_PRESETS.enamel_dentin,
	VISIOGRAPH_WINDOW_PRESETS.soft_tissue,
	VISIOGRAPH_WINDOW_PRESETS.endodontic_canal,
];

/**
 * Maps a single raw Hounsfield Unit (HU) scalar value to a windowed 8-bit grayscale intensity [0..255].
 */
export function huToGrayscale(
	huValue: number,
	windowWidth: number,
	windowCenter: number,
): number {
	const { lower, upper } = computeVoiRange(windowWidth, windowCenter);
	if (!Number.isFinite(huValue)) return 0;
	if (huValue <= lower) return 0;
	if (huValue >= upper) return 255;
	const range = upper - lower;
	if (range <= 0) return 128;
	return Math.round(((huValue - lower) / range) * 255);
}

export interface ClinicalVisiographFilterPreset {
	readonly id: "bone_periodont" | "endodontics" | "caries_enamel";
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
	};
}

export const CLINICAL_VISIOGRAPH_FILTERS: readonly ClinicalVisiographFilterPreset[] = [
	{
		id: "bone_periodont",
		label: "⚡ Кость / Периодонт",
		shortLabel: "Кость / Периодонт",
		badge: "высокая резкость / фильтр костных балок",
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
		label: "⚡ Эндодонтия",
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
		label: "⚡ Кариес / Эмаль",
		shortLabel: "Кариес / Эмаль",
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
];
