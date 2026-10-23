/**
 * perioMathTypes.ts — Типы и константы экспресс-скрининга пародонта PSR / CPITN (ВОЗ / СтАР)
 * Архитектурный слой Layer 0: Types & Constants (Мандат 8b, <= 120 строк).
 */

import type {
	PerioChartSummary,
	PerioToothRecord,
	PsrSextantResult,
} from "@dental/shared";

export type PsrCode = 0 | 1 | 2 | 3 | 4;

export interface PsrCodeDefinition {
	readonly code: PsrCode;
	readonly labelRu: string;
	readonly shortTitleRu: string;
	readonly descriptionRu: string;
	readonly defaultDepthMm: number;
	readonly hasCalculus: boolean;
	readonly hasBop: boolean;
	readonly colorClass: string;
	readonly badgeClass: string;
}

export const PSR_CODE_DEFINITIONS: Record<PsrCode, PsrCodeDefinition> = {
	0: {
		code: 0,
		labelRu: "Код 0",
		shortTitleRu: "Здоров",
		descriptionRu:
			"Глубина карманов < 3.5 мм, зубного камня нет, кровоточивости нет (Здоров)",
		defaultDepthMm: 2,
		hasCalculus: false,
		hasBop: false,
		colorClass: "text-emerald-800 dark:text-emerald-300 border-emerald-500/40 bg-emerald-500/15",
		badgeClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
	},
	1: {
		code: 1,
		labelRu: "Код 1",
		shortTitleRu: "Гингивит (BOP)",
		descriptionRu:
			"Глубина < 3.5 мм, кровоточивость при зондировании (Гингивит)",
		defaultDepthMm: 3,
		hasCalculus: false,
		hasBop: true,
		colorClass: "text-amber-800 dark:text-amber-300 border-amber-500/40 bg-amber-500/15",
		badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
	},
	2: {
		code: 2,
		labelRu: "Код 2",
		shortTitleRu: "Зубной камень",
		descriptionRu: "Глубина < 3.5 мм, над- или поддесневой зубной камень",
		defaultDepthMm: 3,
		hasCalculus: true,
		hasBop: true,
		colorClass: "text-sky-800 dark:text-sky-300 border-sky-500/40 bg-sky-500/15",
		badgeClass: "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30",
	},
	3: {
		code: 3,
		labelRu: "Код 3",
		shortTitleRu: "Пародонтит ср. ст. (3.5-5.5 мм)",
		descriptionRu: "Карманы 3.5 – 5.5 мм (Пародонтит средней степени)",
		defaultDepthMm: 5,
		hasCalculus: true,
		hasBop: true,
		colorClass: "text-orange-800 dark:text-orange-300 border-orange-500/40 bg-orange-500/15",
		badgeClass: "bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30",
	},
	4: {
		code: 4,
		labelRu: "Код 4",
		shortTitleRu: "Пародонтит тяж. ст. (> 5.5 мм)",
		descriptionRu: "Карманы > 5.5 мм (Пародонтит тяжелой степени)",
		defaultDepthMm: 7,
		hasCalculus: true,
		hasBop: true,
		colorClass: "text-rose-800 dark:text-rose-300 border-rose-500/40 bg-rose-500/15",
		badgeClass: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30",
	},
};

export type PerioExpressPresetId =
	| "perio_norm_express"
	| "gingivitis_express"
	| "periodontitis_mild_express"
	| "periodontitis_moderate_express"
	| "periodontitis_severe_express"
	| "recession_express"
	| "pro_hygiene_express";

export interface PerioExpressPreset {
	readonly id: PerioExpressPresetId;
	readonly titleRu: string;
	readonly subtitleRu: string;
	readonly icd10: string;
	readonly defaultProtocolRu: string;
	readonly code804n?: string;
}
