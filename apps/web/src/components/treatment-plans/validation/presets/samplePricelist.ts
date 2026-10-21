/**
 * apps/web/src/components/treatment-plans/validation/presets/samplePricelist.ts
 *
 * Образец актуального прайс-листа клиники для валидации цен.
 */

import type { CatalogServiceItem } from "./validationTypes";

export const SAMPLE_CURRENT_PRICELIST: readonly CatalogServiceItem[] = [
	{
		id: "srv_karies_photopolymer",
		code804n: "A16.07.002",
		title: "Восстановление зуба пломбой (Estelite Asteria, 1-2 поверхности)",
		category: "Терапия",
		basePriceRub: 5200,
		active: true,
	},
	{
		id: "srv_endo_pulpitis_2canals",
		code804n: "A16.07.030.002",
		title: "Эндодонтическое лечение 2-канального зуба (механическая и медикаментозная обработка)",
		category: "Эндодонтия",
		basePriceRub: 11500,
		active: true,
	},
	{
		id: "srv_implant_straumann",
		code804n: "A16.07.054.001",
		title: "Внутрикостная дентальная имплантация системы Straumann BLX (Швейцария)",
		category: "Хирургия",
		basePriceRub: 65000,
		active: true,
	},
	{
		id: "srv_crown_zirconia",
		code804n: "A16.07.004.001",
		title: "Восстановление зуба коронкой из диоксида циркония (Prettau Multi-layer CAD/CAM)",
		category: "Ортопедия",
		basePriceRub: 28000,
		active: true,
	},
	{
		id: "srv_hygiene_complex",
		code804n: "A16.07.050",
		title: "Профессиональная гигиена полости рта комплексная (УЗ + Air-Flow + полировка)",
		category: "Гигиена",
		basePriceRub: 4500,
		active: true,
	},
	{
		id: "srv_cbct_3d",
		code804n: "A06.07.007",
		title: "Конусно-лучевая компьютерная томография (КЛКТ) двух челюстей 8x15 см",
		category: "Диагностика",
		basePriceRub: 3500,
		active: true,
	},
	{
		id: "srv_old_cermet_crown",
		code804n: "A16.07.004.002",
		title: "Коронка металлокерамическая на сплаве CoCr (Устаревшая позиция)",
		category: "Ортопедия",
		basePriceRub: 14000,
		active: false,
		isArchived: true,
	},
	{
		id: "srv_anesthesia_infiltr",
		code804n: "B01.003.004.004",
		title: "Анестезия инфильтрационная / проводниковая (Ubistesin forte)",
		category: "Анестезия",
		basePriceRub: 900,
		active: true,
	},
];
