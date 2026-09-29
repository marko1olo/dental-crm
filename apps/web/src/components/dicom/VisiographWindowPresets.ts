/**
 * Hounsfield Unit (HU) Windowing Presets for 3D CBCT, Multi-Planar Reconstruction (MPR)
 * and Dental Tomography DICOM Viewers.
 *
 * Includes standard dental presets and clinical volume rendering transfer window presets
 * reverse-engineered from OnDemand3D (CDViewer Lucion LPF volume presets):
 * - Bone Preset: Window 2000, Level 500 (Alveolar bone & cortical contrast)
 * - Enamel/Dentin: Window 4000, Level 1500 (Tooth enamel & dentin discrimination)
 * - Soft Tissue / Gingiva: Window 400, Level 40 (Gingival architecture & mucosa)
 * - Endodontic Canal / Apex: Window 1500, Level 300 (Root canal morphology & periapical pathosis)
 * - Airway (LPF): Window 2000, Level -800 (Airway, sinuses, pharyngeal lumen)
 * - Skull (LPF): Window 2500, Level 600 (Calvarium, skull base, zygomatic bones)
 * - Endoscopy / TMJ (LPF): Window 800, Level -200 (Virtual endoscopy, TMJ articular cavities)
 * - Soft Tissue + Bone (LPF): Window 2800, Level 400 (Combined muscular and bony landmarks)
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
	airway: {
		id: "airway",
		label: "Дыхательные пути",
		shortLabel: "Airway",
		icon: "wind",
		description: "Дыхательные пути, верхнечелюстные синусы и фарингеальное пространство (WW 2000, WL -800)",
		windowWidth: 2000,
		windowCenter: -800,
		voiRange: computeVoiRange(2000, -800), // lower: -1800, upper: 200
	},
	skull: {
		id: "skull",
		label: "Кости черепа",
		shortLabel: "Skull",
		icon: "skull",
		description: "Свод и основание черепа, скуловые дуги и костные ориентиры (WW 2500, WL 600)",
		windowWidth: 2500,
		windowCenter: 600,
		voiRange: computeVoiRange(2500, 600), // lower: -650, upper: 1850
	},
	endoscopy: {
		id: "endoscopy",
		label: "Эндоскопия / ВНЧС",
		shortLabel: "Endo / ВНЧС",
		icon: "scan",
		description: "Полостные структуры, суставная щель ВНЧС и внутренние контуры (WW 800, WL -200)",
		windowWidth: 800,
		windowCenter: -200,
		voiRange: computeVoiRange(800, -200), // lower: -600, upper: 200
	},
	soft_tissue_bone: {
		id: "soft_tissue_bone",
		label: "Мягкие ткани + Кость",
		shortLabel: "Ткани+Кость",
		icon: "layers",
		description: "Комбинированная визуализация мышечного каркаса и костных стенок (WW 2800, WL 400)",
		windowWidth: 2800,
		windowCenter: 400,
		voiRange: computeVoiRange(2800, 400), // lower: -1000, upper: 1800
	},
};

export const VISIOGRAPH_PRESETS_LIST: VisiographWindowPreset[] = [
	VISIOGRAPH_WINDOW_PRESETS.bone,
	VISIOGRAPH_WINDOW_PRESETS.enamel_dentin,
	VISIOGRAPH_WINDOW_PRESETS.soft_tissue,
	VISIOGRAPH_WINDOW_PRESETS.endodontic_canal,
	VISIOGRAPH_WINDOW_PRESETS.airway,
	VISIOGRAPH_WINDOW_PRESETS.skull,
	VISIOGRAPH_WINDOW_PRESETS.endoscopy,
	VISIOGRAPH_WINDOW_PRESETS.soft_tissue_bone,
];

export const CDVIEWER_CLINICAL_PRESETS: VisiographWindowPreset[] = [
	VISIOGRAPH_WINDOW_PRESETS.airway,
	VISIOGRAPH_WINDOW_PRESETS.skull,
	VISIOGRAPH_WINDOW_PRESETS.endoscopy,
	VISIOGRAPH_WINDOW_PRESETS.soft_tissue_bone,
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

export {
	type ClinicalVisiographFilterPreset,
	CLINICAL_VISIOGRAPH_FILTERS,
} from "../visiograph/VisiographWindowPresets";
