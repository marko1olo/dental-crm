/**
 * Standard Hounsfield Unit (HU) windowing presets for 3D Visiograph, CBCT & DICOM viewers.
 *
 * Presets calibrated for clinical dental radiography:
 * - Bone Preset: Window 2000, Level 500 (Trabecular/Cortical bone contrast)
 * - Enamel/Dentin: Window 4000, Level 1500 (Dense tooth enamel & dentin discrimination)
 * - Soft Tissue / Gingiva: Window 400, Level 40 (Gingival architecture & soft mucosa)
 * - Endodontic Canal / Apex: Window 1500, Level 300 (Root canal morphology & periapical pathosis)
 */

export type {
	VisiographPresetId,
	VisiographWindowPreset,
} from "../dicom/VisiographWindowPresets";

export {
	computeVoiRange,
	huToGrayscale,
	VISIOGRAPH_WINDOW_PRESETS,
	BASE_VISIOGRAPH_PRESETS_LIST,
	VISIOGRAPH_PRESETS_LIST,
	CDVIEWER_CLINICAL_PRESETS,
} from "../dicom/VisiographWindowPresets";

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
		label: "Кость / Периодонт",
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
		label: "Эндодонтия",
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
