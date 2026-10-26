/**
 * CLINICAL DIARY TYPES — DOMAIN DATA CONTRACTS
 * Pure clinical types for visit diary templates and protocol synthesis.
 * Compliant with Mandates 8b, 8e, 8x, 8ap.
 */

/** Категории стоматологических протоколов приёма */
export type ClinicalProtocolCategory =
	| "therapy"
	| "endodontics"
	| "surgery"
	| "orthopedics"
	| "periodontics"
	| "pediatric"
	| "orthodontics"
	| "preventive";

export const CLINICAL_CATEGORY_LABELS: Record<ClinicalProtocolCategory, string> = {
	therapy: "Терапия и кариесология",
	endodontics: "Эндодонтия",
	surgery: "Хирургия и имплантация",
	orthopedics: "Ортопедия и протезирование",
	periodontics: "Пародонтология",
	pediatric: "Детская стоматология",
	orthodontics: "Ортодонтия",
	preventive: "Профилактика и гигиена",
};

/** Услуга прейскуранта с точной стоимостью в копейках */
export interface ClinicalServiceItem {
	readonly code: string;
	readonly nameRu: string;
	readonly isMandatory: boolean;
	readonly defaultQuantity?: number | undefined;
	readonly priceKopecks?: number | undefined;
}

/** Алиас для обратной совместимости вызовов */
export type Order804nServiceItem = ClinicalServiceItem;

/** Структурированный протокол приёма быстрого доступа */
export interface Clinical1ClickTemplate {
	readonly id: string;
	readonly title: string;
	readonly shortTitle: string;
	readonly category: ClinicalProtocolCategory;
	readonly icd10Code: string;
	readonly icd10Title: string;
	readonly badge: string;
	readonly icon: string;
	readonly isCore1Click: boolean;
	readonly toothTargetRequired: boolean;
	readonly defaultSubjectiveComplaints: string;
	readonly defaultAnamnesisMorbi: string;
	readonly defaultObjectiveStatus: string;
	readonly defaultPercussion: "negative" | "positive_mild" | "positive_sharp";
	readonly defaultThermalTest: "indifferent" | "transient_pain" | "lingering_sharp_pain" | "pain_relieved_by_cold";
	readonly defaultProbing: "none" | "along_enamel_dentin_border" | "at_cavity_bottom" | "bleeding_orifice";
	readonly defaultEodMicroamperes?: number | null | undefined;
	readonly defaultProcedureProtocol: string;
	readonly defaultAnesthesia: string;
	readonly defaultMaterials: readonly string[];
	readonly defaultRecommendations: string;
	readonly order804nServices: readonly ClinicalServiceItem[];
}
