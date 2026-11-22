/**
 * packages/shared/src/clinical/clinicalPricelistCategories.ts
 *
 * 10 Canonical Dental Specialties & Nomenclature Categories for Clinical Harmonization.
 * Parity with Russian Clinical Standards (Star, 804n).
 */

import type {
	ClinicalCategoryDefinition,
	ClinicalPricelistCategory,
	StomxCategoryDefinition,
	StomxPricelistCategory,
} from "./clinicalPricelistTypes.js";

export const CLINICAL_SPECIALTY_CATEGORIES: readonly ClinicalCategoryDefinition[] = [
	{
		id: "therapy",
		code: "THERAPY",
		titleRu: "Терапия",
		descriptionRu: "Терапевтическая стоматология, лечение кариеса, пульпита, периодонтита и эстетические реставрации",
		defaultDurationMinutes: 45,
	},
	{
		id: "orthopedics",
		code: "ORTHOPEDICS",
		titleRu: "Ортопедия",
		descriptionRu: "Ортопедическая стоматология, коронки, мостовидные протезы, виниры, съемное протезирование",
		defaultDurationMinutes: 60,
	},
	{
		id: "surgery",
		code: "SURGERY",
		titleRu: "Хирургия",
		descriptionRu: "Хирургическая стоматология, удаление зубов любой сложности, резекции верхушек, пластика уздечек",
		defaultDurationMinutes: 30,
	},
	{
		id: "implantology",
		code: "IMPLANTOLOGY",
		titleRu: "Имплантация",
		descriptionRu: "Дентальная имплантация, костная пластика (остеопластика), синус-лифтинг, плазмолифтинг",
		defaultDurationMinutes: 60,
	},
	{
		id: "orthodontics",
		code: "ORTHODONTICS",
		titleRu: "Ортодонтия",
		descriptionRu: "Исправление прикуса, брекет-системы, ортодонтические дуги, элайнеры, ретенционные аппараты",
		defaultDurationMinutes: 30,
	},
	{
		id: "periodontics",
		code: "PERIODONTICS",
		titleRu: "Пародонтология",
		descriptionRu: "Лечение заболеваний пародонта, кюретаж карманов, шинирование, медикаментозная обработка",
		defaultDurationMinutes: 45,
	},
	{
		id: "hygiene",
		code: "HYGIENE",
		titleRu: "Профгигиена",
		descriptionRu: "Профессиональная гигиена полости рта, ультразвуковой скейлинг, Air-Flow, фторирование, отбеливание",
		defaultDurationMinutes: 60,
	},
	{
		id: "radiology",
		code: "RADIOLOGY",
		titleRu: "Рентгенология",
		descriptionRu: "Рентгенодиагностика, прицельная радиовизиография, ОПТГ, 3D компьютерная томография (КЛКТ)",
		defaultDurationMinutes: 15,
	},
	{
		id: "anesthesiology",
		code: "ANESTHESIOLOGY",
		titleRu: "Анестезиология",
		descriptionRu: "Обезболивание, местная аппликационная, инфильтрационная и проводниковая анестезия",
		defaultDurationMinutes: 10,
	},
	{
		id: "ztl",
		code: "ZTL",
		titleRu: "ЗТЛ",
		descriptionRu: "Зуботехническая лаборатория, изготовление коронок, культевых вкладок, каркасов, съемных протезов",
		defaultDurationMinutes: 0,
	},
] as const;

export const CLINICAL_PRICELIST_SPECIALTIES = CLINICAL_SPECIALTY_CATEGORIES;

export const CLINICAL_CATEGORY_MAP: Readonly<Record<ClinicalPricelistCategory, ClinicalCategoryDefinition>> = {
	therapy: CLINICAL_SPECIALTY_CATEGORIES[0]!,
	orthopedics: CLINICAL_SPECIALTY_CATEGORIES[1]!,
	surgery: CLINICAL_SPECIALTY_CATEGORIES[2]!,
	implantology: CLINICAL_SPECIALTY_CATEGORIES[3]!,
	orthodontics: CLINICAL_SPECIALTY_CATEGORIES[4]!,
	periodontics: CLINICAL_SPECIALTY_CATEGORIES[5]!,
	hygiene: CLINICAL_SPECIALTY_CATEGORIES[6]!,
	radiology: CLINICAL_SPECIALTY_CATEGORIES[7]!,
	anesthesiology: CLINICAL_SPECIALTY_CATEGORIES[8]!,
	ztl: CLINICAL_SPECIALTY_CATEGORIES[9]!,
};

export function getClinicalCategoryTitle(category: ClinicalPricelistCategory): string {
	return CLINICAL_CATEGORY_MAP[category]?.titleRu ?? category;
}

export function isClinicalPricelistCategory(value: unknown): value is ClinicalPricelistCategory {
	return typeof value === "string" && value in CLINICAL_CATEGORY_MAP;
}

// Deprecated aliases for backward compatibility (Mandate 8ap)
/** @deprecated Use CLINICAL_SPECIALTY_CATEGORIES */
export const STOMX_SPECIALTY_CATEGORIES = CLINICAL_SPECIALTY_CATEGORIES;
/** @deprecated Use CLINICAL_PRICELIST_SPECIALTIES */
export const STOMX_PRICELIST_SPECIALTIES = CLINICAL_PRICELIST_SPECIALTIES;
/** @deprecated Use CLINICAL_CATEGORY_MAP */
export const STOMX_CATEGORY_MAP = CLINICAL_CATEGORY_MAP;
/** @deprecated Use getClinicalCategoryTitle */
export const getStomxCategoryTitle = getClinicalCategoryTitle;
/** @deprecated Use isClinicalPricelistCategory */
export const isStomxPricelistCategory = isClinicalPricelistCategory;
