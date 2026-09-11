/**
 * packages/shared/src/types/pricing.ts
 *
 * StomX 21 Canonical Dental Clinical Pricelist Categories.
 * Derived from StomX Reverse Engineering Depot:
 *   РЕВЕРС ИНЖИНИРИНГ СТОМ-ИКС НОВЫЙ ЗАВОЗ/data/pricelist/categories.json
 */

import { z } from "zod";

export const STOMX_PRICELIST_CATEGORIES = [
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

export type StomxPricelistCategoryName = (typeof STOMX_PRICELIST_CATEGORIES)[number];

export const stomxPricelistCategoryNameSchema = z.enum(STOMX_PRICELIST_CATEGORIES);

export interface StomxPricelistCategoryItem {
	readonly id: number;
	readonly nameRu: StomxPricelistCategoryName;
	readonly slug: string;
}

export const STOMX_PRICELIST_CATEGORY_ITEMS: readonly StomxPricelistCategoryItem[] =
	STOMX_PRICELIST_CATEGORIES.map((nameRu, index) => ({
		id: index + 1,
		nameRu,
		slug: `category_${index + 1}`,
	}));

export const stomxPricelistCategoryItemSchema = z.object({
	id: z.number().int().positive(),
	nameRu: stomxPricelistCategoryNameSchema,
	slug: z.string().min(1),
});
