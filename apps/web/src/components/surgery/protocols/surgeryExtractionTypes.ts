/**
 * surgeryExtractionTypes.ts — Константы, коды и опции сложности экстракции зубов (Мандаты 8e, 8x).
 */

export const COMMON_SURGERY_TEETH = [46, 36, 16, 26, 48, 38, 18, 28, 11, 21, 14, 24, 34, 44] as const;

export const EXTRACTION_SURGICAL_CODES = {
	SIMPLE: "A16.07.001",
	COMPLEX_SEPARATION: "A16.07.001.001",
	IMPACTED_DYSTOPIC: "A16.07.001.002",
	SINUS_LIFT: "A16.07.041.001",
	BONE_GRAFT: "A16.07.041",
	CURETTAGE: "A16.07.026",
	SUTURE_VICRYL: "A16.07.097",
	ANESTHESIA_INFILTRATION: "A11.07.015",
	ANESTHESIA_CONDUCTION: "A11.07.016",
} as const;

export const EXTRACTION_804N_CODES = EXTRACTION_SURGICAL_CODES;

export type ExtractionComplexity = "simple" | "complex" | "impacted_dystopic";
export type SurgicalHemostasisMethod = "alvogyl" | "hemostatic_sponge" | "vicryl_suture" | "tampon";

export interface SurgicalHemostasisOption {
	readonly id: SurgicalHemostasisMethod;
	readonly nameRu: string;
	readonly shortBadge: string;
	readonly descriptionRu: string;
}

export const SURGICAL_HEMOSTASIS_OPTIONS: readonly SurgicalHemostasisOption[] = [
	{
		id: "alvogyl",
		nameRu: "Альвожил (паста/губка)",
		shortBadge: "Альвожил",
		descriptionRu: "Антисептический обезболивающий компресс с йодоформом в лунку",
	},
	{
		id: "hemostatic_sponge",
		nameRu: "Гемостатическая коллагеновая губка",
		shortBadge: "Губка",
		descriptionRu: "Рассасывающаяся коллагеновая губка для надежного тромбообразования",
	},
	{
		id: "vicryl_suture",
		nameRu: "Шов Викрил 4-0 (ушивание)",
		shortBadge: "Викрил 4-0",
		descriptionRu: "Сближение краев лунки узловыми рассасывающимися швами",
	},
	{
		id: "tampon",
		nameRu: "Давящий марлевый тампон 20 мин",
		shortBadge: "Тампон 20 мин",
		descriptionRu: "Марлевый гемостатический тампон для компрессии лунки",
	},
];

export interface ExtractionComplexityOption {
	readonly id: ExtractionComplexity;
	readonly serviceCode: string;
	readonly code804n: string;
	readonly labelRu: string;
	readonly badge: string;
	readonly normId: string;
	readonly defaultPriceRub: number;
}

export const EXTRACTION_COMPLEXITY_OPTIONS: readonly ExtractionComplexityOption[] = [
	{
		id: "simple",
		serviceCode: EXTRACTION_SURGICAL_CODES.SIMPLE,
		code804n: EXTRACTION_SURGICAL_CODES.SIMPLE,
		labelRu: "Простое удаление постоянного зуба (щипцы / элеватор)",
		badge: "Простое (A16.07.001)",
		normId: "surgery_extraction_simple",
		defaultPriceRub: 3500,
	},
	{
		id: "complex",
		serviceCode: EXTRACTION_SURGICAL_CODES.COMPLEX_SEPARATION,
		code804n: EXTRACTION_SURGICAL_CODES.COMPLEX_SEPARATION,
		labelRu: "Сложное удаление с разъединением корней бором Lindemann",
		badge: "Сложное (A16.07.001.001)",
		normId: "surgery_extraction_complex",
		defaultPriceRub: 6000,
	},
	{
		id: "impacted_dystopic",
		serviceCode: EXTRACTION_SURGICAL_CODES.IMPACTED_DYSTOPIC,
		code804n: EXTRACTION_SURGICAL_CODES.IMPACTED_DYSTOPIC,
		labelRu: "Удаление ретинированного / дистопированного зуба с лоскутом",
		badge: "Ретинированный (A16.07.001.002)",
		normId: "surgery_extraction_atypical",
		defaultPriceRub: 9500,
	},
];
