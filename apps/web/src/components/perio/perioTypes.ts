/**
 * perioTypes.ts — Единые типы пародонтологического скрининга ВОЗ (PSR)
 * и пародонтограммы DENTE CRM (Мандат 8b: 100–160 строк).
 */

export type PsrCode = 0 | 1 | 2 | 3 | 4;

export type PsrSextantId = "S1" | "S2" | "S3" | "S4" | "S5" | "S6";

export interface PsrSextantInfo {
	readonly id: PsrSextantId;
	readonly name: string;
	readonly labelRu: string;
	readonly teethRange: string;
	readonly teeth: readonly number[];
}

export const PSR_SEXTANTS_CONFIG: readonly PsrSextantInfo[] = [
	{ id: "S1", name: "S1", labelRu: "Верхний правый дистальный", teethRange: "17–14", teeth: [17, 16, 15, 14] },
	{ id: "S2", name: "S2", labelRu: "Верхний фронтальный", teethRange: "13–23", teeth: [13, 12, 11, 21, 22, 23] },
	{ id: "S3", name: "S3", labelRu: "Верхний левый дистальный", teethRange: "24–27", teeth: [24, 25, 26, 27] },
	{ id: "S4", name: "S4", labelRu: "Нижний правый дистальный", teethRange: "47–44", teeth: [47, 46, 45, 44] },
	{ id: "S5", name: "S5", labelRu: "Нижний фронтальный", teethRange: "43–33", teeth: [43, 42, 41, 31, 32, 33] },
	{ id: "S6", name: "S6", labelRu: "Нижний левый дистальный", teethRange: "34–37", teeth: [34, 35, 36, 37] },
] as const;

export interface PsrCodeDefinition {
	readonly code: PsrCode;
	readonly labelRu: string;
	readonly shortTitleRu: string;
	readonly descriptionRu: string;
	readonly hygieneRecommendationRu: string;
	readonly badgeClass: string;
	readonly colorHex: string;
}

export const PSR_CODE_DEFINITIONS: Record<PsrCode, PsrCodeDefinition> = {
	0: {
		code: 0,
		labelRu: "Код 0: Здоров",
		shortTitleRu: "Интактный пародонт",
		descriptionRu: "Глубина карманов <3.5 мм, кровоточивости нет, зубного камня нет",
		hygieneRecommendationRu: "Профилактический осмотр через 6 месяцев. Профгигиена по желанию.",
		badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
		colorHex: "#10b981",
	},
	1: {
		code: 1,
		labelRu: "Код 1: Кровоточивость",
		shortTitleRu: "Кровоточивость (BOP+)",
		descriptionRu: "Кровоточивость при зондировании, карманы <3.5 мм, камня нет",
		hygieneRecommendationRu: "Обучение индивидуальной гигиене, удаление мягкого налёта, полировка эмали пастой / Air-Flow.",
		badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
		colorHex: "#f59e0b",
	},
	2: {
		code: 2,
		labelRu: "Код 2: Зубной камень",
		shortTitleRu: "Зубной камень (над- и поддесневой)",
		descriptionRu: "Над- или поддесневые зубные отложения, глубина карманов <3.5 мм",
		hygieneRecommendationRu: "Комплексная профессиональная гигиена: ультразвуковой скейлинг + Air-Flow + реминерализующая терапия.",
		badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
		colorHex: "#0ea5e9",
	},
	3: {
		code: 3,
		labelRu: "Код 3: Карман 4–5 мм",
		shortTitleRu: "Патологический карман 4–5 мм",
		descriptionRu: "Умеренный карман 4–5 мм (черная полоса зонда частично скрыта), локальный пародонтит",
		hygieneRecommendationRu: "Профгигиена + закрытый кюретаж пародонтальных карманов секстанта, противовоспалительные аппликации.",
		badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
		colorHex: "#f97316",
	},
	4: {
		code: 4,
		labelRu: "Код 4: Карман >= 6 мм",
		shortTitleRu: "Глубокий карман >= 6 мм",
		descriptionRu: "Глубокий карман >=6 мм (черная метка зонда полностью скрыта), тяжелый пародонтит",
		hygieneRecommendationRu: "Комплексное лечение: скейлинг, кюретаж/лоскутная операция, антибиотикотерапия, консультация пародонтолога-хирурга.",
		badgeClass: "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40",
		colorHex: "#f43f5e",
	},
};

export interface PsrSextantState {
	code: PsrCode;
	asterisk?: boolean;
}

export type PsrScreeningMap = Record<PsrSextantId, PsrSextantState>;

export interface PerioSiteDetail {
	probingDepthMm: number;
	gingivalMarginMm: number;
	bleedingOnProbing: boolean;
	plaque: boolean;
	calculus: boolean;
	suppuration: boolean;
	calMm: number;
}

export interface DetailedPerioTooth {
	toothNumber: number;
	isMissing: boolean;
	isImplant: boolean;
	mobility: 0 | 1 | 2 | 3;
	furcation: 0 | 1 | 2 | 3;
	distoBuccal: PerioSiteDetail;
	midBuccal: PerioSiteDetail;
	mesioBuccal: PerioSiteDetail;
	distoLingual: PerioSiteDetail;
	midLingual: PerioSiteDetail;
	mesioLingual: PerioSiteDetail;
}

export interface PerioScreeningSummary {
	maxPsrCode: PsrCode;
	hasAsterisk: boolean;
	psrFormula: string;
	suggestedDiagnosisRu: string;
	icd10Code: string;
	hygienePlanRu: string;
	requiresDetailedCharting: boolean;
}
