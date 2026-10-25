/**
 * packages/shared/src/perio/hygieneConfig.ts
 *
 * Canonical Ramfjord index teeth and WHO 6-sextant hygiene definitions.
 * Mandate 8b: File <= 120 lines.
 */

export const HYGIENE_INDEX_TEETH_NUMBERS = [16, 11, 26, 36, 31, 46] as const;
export type HygieneIndexToothNumber = (typeof HYGIENE_INDEX_TEETH_NUMBERS)[number];

export interface HygieneIndexToothDefinition {
	readonly toothNumber: HygieneIndexToothNumber;
	readonly surfaceAspect: "vestibular" | "oral";
	readonly surfaceLabelRu: string;
	readonly anatomicalNameRu: string;
}

export const HYGIENE_INDEX_TEETH_CONFIG: readonly HygieneIndexToothDefinition[] = [
	{ toothNumber: 16, surfaceAspect: "vestibular", surfaceLabelRu: "Вестибулярная (щечная)", anatomicalNameRu: "Правый верхний первый моляр" },
	{ toothNumber: 11, surfaceAspect: "vestibular", surfaceLabelRu: "Вестибулярная (губная)", anatomicalNameRu: "Правый верхний центральный резец" },
	{ toothNumber: 26, surfaceAspect: "vestibular", surfaceLabelRu: "Вестибулярная (щечная)", anatomicalNameRu: "Левый верхний первый моляр" },
	{ toothNumber: 36, surfaceAspect: "oral", surfaceLabelRu: "Оральная (язычная)", anatomicalNameRu: "Левый нижний первый моляр" },
	{ toothNumber: 31, surfaceAspect: "vestibular", surfaceLabelRu: "Вестибулярная (губная)", anatomicalNameRu: "Левый нижний центральный резец" },
	{ toothNumber: 46, surfaceAspect: "oral", surfaceLabelRu: "Оральная (язычная)", anatomicalNameRu: "Правый нижний первый моляр" },
] as const;

export type HygieneSextantKey = "S1" | "S2" | "S3" | "S4" | "S5" | "S6";

export interface HygieneSextantDefinition {
	readonly sextant: HygieneSextantKey;
	readonly labelRu: string;
	readonly anatomicalRegionRu: string;
	readonly indexToothNumber: HygieneIndexToothNumber;
	readonly teethRangeRu: string;
	readonly surfaceAspect: "vestibular" | "oral";
	readonly surfaceLabelRu: string;
}

export const WHO_HYGIENE_SEXTANTS: readonly HygieneSextantDefinition[] = [
	{ sextant: "S1", labelRu: "Секстант 1 (17-14)", anatomicalRegionRu: "Верхний правый дистальный", indexToothNumber: 16, teethRangeRu: "17-14", surfaceAspect: "vestibular", surfaceLabelRu: "Вестибулярная (щечная)" },
	{ sextant: "S2", labelRu: "Секстант 2 (13-23)", anatomicalRegionRu: "Верхний фронтальный", indexToothNumber: 11, teethRangeRu: "13-23", surfaceAspect: "vestibular", surfaceLabelRu: "Вестибулярная (губная)" },
	{ sextant: "S3", labelRu: "Секстант 3 (24-27)", anatomicalRegionRu: "Верхний левый дистальный", indexToothNumber: 26, teethRangeRu: "24-27", surfaceAspect: "vestibular", surfaceLabelRu: "Вестибулярная (щечная)" },
	{ sextant: "S4", labelRu: "Секстант 4 (37-34)", anatomicalRegionRu: "Нижний левый дистальный", indexToothNumber: 36, teethRangeRu: "37-34", surfaceAspect: "oral", surfaceLabelRu: "Оральная (язычная)" },
	{ sextant: "S5", labelRu: "Секстант 5 (33-43)", anatomicalRegionRu: "Нижний фронтальный", indexToothNumber: 31, teethRangeRu: "33-43", surfaceAspect: "vestibular", surfaceLabelRu: "Вестибулярная (губная)" },
	{ sextant: "S6", labelRu: "Секстант 6 (44-47)", anatomicalRegionRu: "Нижний правый дистальный", indexToothNumber: 46, teethRangeRu: "44-47", surfaceAspect: "oral", surfaceLabelRu: "Оральная (язычная)" },
] as const;

export interface HygieneToothAssessment {
	readonly toothNumber: number;
	readonly isMissing?: boolean | undefined;
	readonly debrisScore?: number | undefined;
	readonly calculusScore?: number | undefined;
	readonly pmaScore?: number | undefined;
	readonly kpiScore?: number | undefined;
}

export interface HygieneSextantAssessment {
	readonly sextant: HygieneSextantKey;
	readonly indexToothNumber: HygieneIndexToothNumber;
	readonly debrisScore: number;
	readonly calculusScore: number;
	readonly totalOhiScore: number;
	readonly pmaScore: number;
	readonly pmaPercent: number;
	readonly kpiScore: number;
	readonly isHealthy: boolean;
	readonly summaryText: string;
}
