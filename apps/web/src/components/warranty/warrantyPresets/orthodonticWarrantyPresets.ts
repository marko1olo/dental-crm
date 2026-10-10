/**
 * ============================================================================
 * ORTHODONTIC WARRANTY PRESETS & CLINICAL DEFECTS
 * Ортодонтия: элайнеры, брекет-системы, ретенционные аппараты и ретейнеры.
 * Нормативы: Клинические рекомендации Минздрава РФ по ортодонтии, ст. 29 ЗоЗПП.
 * ============================================================================
 */

import type {
	DentalMaterialMeta,
	WarrantyDefectTemplate,
	WarrantyPreset,
} from "./types.js";

export const ORTHODONTIC_ALIGNERS_PRESET: WarrantyPreset = {
	category: "orthodontic_aligners",
	code: "WAR-ORTHO-04",
	serviceCode804n: "A16.07.048.001",
	title: "Элайнеры и брекет-системы (ортодонтическая коррекция прикуса)",
	shortTitle: "Элайнеры & Брекеты",
	description:
		"Аппаратное исправление зубочелюстных аномалий с гарантией стабильности окклюзионного результата при соблюдении ретенционного протокола.",
	statutoryBasis: "Закон РФ № 2300-1, Клинические рекомендации Минздрава РФ по ортодонтии",
	baseWarrantyMonths: 12,
	minWarrantyMonths: 6,
	maxWarrantyMonths: 24,
	baseServiceLifeMonths: 120,
	minServiceLifeMonths: 60,
	maxServiceLifeMonths: 240,
	clinicalConditions: [
		"Непрерывное ношение несъемных проволочных ретейнеров на фронтальных зубах",
		"Ношение индивидуальных ночных ретенционных капп не менее удвоенного срока активного лечения (2x)",
		"Контрольный осмотр ортодонта каждые 4–6 месяцев на протяжении ретенционного периода",
		"Своевременная замена элайнеров строго по индивидуальному клиническому сетапу",
	],
	recommendedMaterials: [
		"Многослойный биополимер SmartTrack / Zendura FLX",
		"Брекеты Damon Q2 / Damon Clear (Ormco, США)",
		"Брекеты 3M Clarity Advanced / Ultra (3M Unitek, США)",
		"Ретенционная проволока Respond / Dentaurum Rematitan",
	],
	popularManufacturers: ["Spark / Ormco", "Invisalign / Align Tech", "Eurokappa", "Star Smile", "3M Unitek", "Dentaurum"],
	standardCheckupIntervalMonths: 4,
};

export const ORTHODONTIC_WARRANTY_PRESETS = {
	orthodontic_aligners: ORTHODONTIC_ALIGNERS_PRESET,
} as const;

export const RETAINER_DEBONDING_DEFECT_TEMPLATE: WarrantyDefectTemplate = {
	defectType: "retainer_debonding",
	code: "DEF-ORTHO-06",
	title: "Отклейка несъемного проволочного ретейнера (0 ₽)",
	shortTitle: "Отклейка ретейнера (0 ₽)",
	category: "orthodontic_aligners",
	recommendedAction: "Пескоструйная очистка эмали, нанесение праймера и повторная фиксация звена ретейнера текучим композитом",
	clinicalDescription: "Отрыв фиксирующего композитного замка несъемного ретейнера от поверхности одного или нескольких зубов.",
	defaultMaterials: [
		{ name: "Ортодонтический текучий светоотверждаемый композит Transbond LR", quantity: 1, unit: "доз." },
		{ name: "Травильный гель 37%", quantity: 1, unit: "доз." },
	],
	statutoryBasis: "Клинические рекомендации Минздрава РФ по ортодонтии, ст. 29 Закона РФ № 2300-1",
};

export const ORTHODONTIC_DEFECT_TEMPLATES = {
	retainer_debonding: RETAINER_DEBONDING_DEFECT_TEMPLATE,
} as const;

export const ORTHODONTIC_MATERIALS: DentalMaterialMeta[] = [
	{
		id: "mat_spark_aligners",
		category: "orthodontic_aligners",
		name: "Spark Aligners TruGEN Material",
		manufacturer: "Ormco",
		country: "США",
		type: "Прозрачные ортодонтические элайнеры из биополимера",
		warrantyMonthsDefault: 12,
		serviceLifeMonthsDefault: 120,
		requiresLotNumber: true,
	},
];
