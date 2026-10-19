/**
 * packages/shared/src/types/pricing.ts
 *
 * Канонический клинический классификатор категорий услуг DENTE Dental CRM.
 * 21 каноническая клиническая категория услуг амбулаторной стоматологической практики.
 */

import { z } from "zod";

export const CLINICAL_PRICELIST_CATEGORIES = [
	"Первичный/повторный прием",
	"Гигиена и профилактика",
	"Диагностика",
	"Рентгенология",
	"Анестезия",
	"Терапевтическая стоматология",
	"Пародонтология",
	"Хирургическая стоматология и имплантология",
	"Ортопедическая стоматология",
	"Ортодонтия",
	"Челюстно-лицевая хирургия",
	"Общие виды работ",
	"Виды работ на терапевтическом приеме",
	"Стоимость дополнительных материалов",
	"Ортопедический прием",
	"Профилактический прием",
	"Комплексное лечение заболеваний пародонта",
	"Терапевтический прием",
	"Хирургический прием",
	"Стоматологические услуги с использованием лазера",
	"Изготовление и ремонт зубных протезов",
] as const;

export type ClinicalPricelistCategoryName = (typeof CLINICAL_PRICELIST_CATEGORIES)[number];

export const clinicalPricelistCategoryNameSchema = z.enum(CLINICAL_PRICELIST_CATEGORIES);

export interface ClinicalPricelistCategoryItem {
	readonly id: number;
	readonly nameRu: ClinicalPricelistCategoryName;
	readonly slug: string;
}

export const CLINICAL_PRICELIST_CATEGORY_ITEMS: readonly ClinicalPricelistCategoryItem[] =
	CLINICAL_PRICELIST_CATEGORIES.map((nameRu, index) => ({
		id: index + 1,
		nameRu,
		slug: `category_${index + 1}`,
	}));

export const clinicalPricelistCategoryItemSchema = z.object({
	id: z.number().int().positive(),
	nameRu: clinicalPricelistCategoryNameSchema,
	slug: z.string().min(1),
});

// ============================================================================
// Обратная совместимость для плавного перехода (Backward Compatibility Aliases)
// ============================================================================
export const STOMX_PRICELIST_CATEGORIES = CLINICAL_PRICELIST_CATEGORIES;
export type StomxPricelistCategoryName = ClinicalPricelistCategoryName;
export const stomxPricelistCategoryNameSchema = clinicalPricelistCategoryNameSchema;
export type StomxPricelistCategoryItem = ClinicalPricelistCategoryItem;
export const STOMX_PRICELIST_CATEGORY_ITEMS = CLINICAL_PRICELIST_CATEGORY_ITEMS;
export const stomxPricelistCategoryItemSchema = clinicalPricelistCategoryItemSchema;
