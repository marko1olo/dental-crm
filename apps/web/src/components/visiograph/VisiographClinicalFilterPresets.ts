/**
 * VisiographClinicalFilterPresets.ts
 * 2D RVG Chairside Filter Presets for Instant 1-Click Clinical Contrast.
 */

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
