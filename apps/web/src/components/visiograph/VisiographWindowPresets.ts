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
	{
		id: "negative_cracks",
		label: "Негатив / Трещины",
		shortLabel: "Негатив",
		badge: "инверсия / микротрещины корня",
		description: "Инвертированное высококонтрастное отображение для выявления микротрещин корня, скрытых переломов и перфораций",
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
		shortLabel: "Псевдо-3D",
		badge: "эмбоссирование 45° / микрорельеф",
		description: "Псевдотрехмерный рельефный фильтр (Emboss 45°) для визуализации кортикальной границы и дефектов пломб",
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
