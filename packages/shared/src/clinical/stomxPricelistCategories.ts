/**
 * packages/shared/src/clinical/stomxPricelistCategories.ts
 *
 * 10 Canonical Dental Specialties & Nomenclature Categories for StomX Harmonization.
 * Parity with StomX categories.json and Russian Clinical Standards (Star, 804n).
 */

import type { StomxCategoryDefinition, StomxPricelistCategory } from "./stomxPricelistTypes.js";

export const STOMX_SPECIALTY_CATEGORIES: readonly StomxCategoryDefinition[] = [
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

export const STOMX_PRICELIST_SPECIALTIES = STOMX_SPECIALTY_CATEGORIES;

export const STOMX_CATEGORY_MAP: Readonly<Record<StomxPricelistCategory, StomxCategoryDefinition>> = {
	therapy: STOMX_SPECIALTY_CATEGORIES[0]!,
	orthopedics: STOMX_SPECIALTY_CATEGORIES[1]!,
	surgery: STOMX_SPECIALTY_CATEGORIES[2]!,
	implantology: STOMX_SPECIALTY_CATEGORIES[3]!,
	orthodontics: STOMX_SPECIALTY_CATEGORIES[4]!,
	periodontics: STOMX_SPECIALTY_CATEGORIES[5]!,
	hygiene: STOMX_SPECIALTY_CATEGORIES[6]!,
	radiology: STOMX_SPECIALTY_CATEGORIES[7]!,
	anesthesiology: STOMX_SPECIALTY_CATEGORIES[8]!,
	ztl: STOMX_SPECIALTY_CATEGORIES[9]!,
};

export function getStomxCategoryTitle(category: StomxPricelistCategory): string {
	return STOMX_CATEGORY_MAP[category]?.titleRu ?? category;
}

export function isStomxPricelistCategory(value: unknown): value is StomxPricelistCategory {
	return typeof value === "string" && value in STOMX_CATEGORY_MAP;
}
