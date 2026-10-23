/**
 * packages/shared/src/pricelist/order804n/consultations804nCatalog.ts
 * Layer 1: Statutory Catalog for Clinical Dental Consultations & Examinations (B01.065).
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Zero synthetic mocks — 100% statutory Minzdrav Order 804n positions.
 */

import type { StatutoryNomenclatureEntry } from "./types.js";

/**
 * Statutory 804n clinical consultation & examination services.
 */
export const CONSULTATIONS_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "B01.065.001",
		title: "Прием (осмотр, консультация) врача-стоматолога первичный",
		category: "consultation",
		specialty: "therapist",
		primaryKeywords: [
			/первичн.*(?:консультац|осмотр|прием|приём)/i,
			/консультаци.*врач/i,
			/осмотр.*стоматолог/i,
			/осмотр.*врач.*консультац/i,
			/консультация.*пародонтолог/i,
			/составление.*план.*лечен/i,
			/консилиум/i,
		],
		secondaryKeywords: [/анкета/i, /опрос/i, /онкоскрининг/i, /статус/i],
		defaultPriceRub: 1000,
		defaultDurationMinutes: 30,
		taxDeductible: true,
	},
	{
		code: "B01.065.002",
		title: "Прием (осмотр, консультация) врача-стоматолога повторный",
		category: "consultation",
		specialty: "therapist",
		primaryKeywords: [
			/повторн.*(?:консультац|осмотр|прием|приём)/i,
			/контрольн.*осмотр/i,
			/диспансерн.*наблюден/i,
		],
		secondaryKeywords: [/динамик/i, /коррекц.*лечен/i],
		defaultPriceRub: 500,
		defaultDurationMinutes: 20,
		taxDeductible: true,
	},
	{
		code: "B01.065.009",
		title: "Прием (осмотр, консультация) врача-стоматолога детского первичный",
		category: "consultation",
		specialty: "pediatric",
		primaryKeywords: [
			/консультаци.*детск.*стоматолог/i,
			/осмотр.*детск.*стоматолог/i,
			/прием.*детск.*стоматолог/i,
			/адаптационн.*прием/i,
		],
		secondaryKeywords: [/ребенок/i, /детск.*прием/i],
		defaultPriceRub: 1200,
		defaultDurationMinutes: 30,
		taxDeductible: true,
	},
	{
		code: "B01.065.005",
		title: "Прием (осмотр, консультация) врача-стоматолога-ортопеда первичный",
		category: "consultation",
		specialty: "orthopedist",
		primaryKeywords: [
			/консультаци.*ортопед/i,
			/осмотр.*ортопед/i,
			/прием.*ортопед/i,
			/план.*протезирован/i,
		],
		secondaryKeywords: [/диагностическ.*моделирован/i, /восковое/i],
		defaultPriceRub: 1200,
		defaultDurationMinutes: 30,
		taxDeductible: true,
	},
	{
		code: "B01.065.003",
		title: "Прием (осмотр, консультация) врача-стоматолога-хирурга первичный",
		category: "consultation",
		specialty: "surgeon",
		primaryKeywords: [
			/консультаци.*хирург/i,
			/консультаци.*имплантолог/i,
			/осмотр.*хирург/i,
			/прием.*хирург/i,
		],
		secondaryKeywords: [/кт.*планирован/i, /шаблон/i],
		defaultPriceRub: 1200,
		defaultDurationMinutes: 30,
		taxDeductible: true,
	},
	{
		code: "B01.065.007",
		title: "Прием (осмотр, консультация) врача-ортодонта первичный",
		category: "consultation",
		specialty: "orthodontist",
		primaryKeywords: [
			/консультаци.*ортодонт/i,
			/осмотр.*ортодонт/i,
			/диагностик.*прикус/i,
			/расчет.*трг/i,
		],
		secondaryKeywords: [/фотометри/i, /слепки.*диагност/i],
		defaultPriceRub: 1500,
		defaultDurationMinutes: 40,
		taxDeductible: true,
	},
];
