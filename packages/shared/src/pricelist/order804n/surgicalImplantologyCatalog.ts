/**
 * packages/shared/src/pricelist/order804n/surgicalImplantologyCatalog.ts
 * Layer 1: Statutory Catalog for Dental Implantology & Bone Grafting Services (A16.07).
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Zero synthetic mocks — 100% statutory Minzdrav Order 804n positions.
 */

import type { StatutoryNomenclatureEntry } from "./types.js";

/**
 * Dental implantology and bone augmentation statutory 804n services.
 */
export const SURGICAL_IMPLANTOLOGY_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "A16.07.054",
		title: "Внутрикостная дентальная имплантация",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/имплант/i,
			/имплантат/i,
			/установк.*имплант/i,
			/дентальн.*имплантац/i,
			/straumann/i,
			/nobel/i,
			/osstem/i,
			/dentium/i,
			/astra.*tech/i,
			/anyridge/i,
			/neodent/i,
			/(?:^|[\s(])mis(?:[\s)]|$)/i,
			/ankylos/i,
			/hi-tec/i,
			/dentis/i,
			/megagen/i,
		],
		secondaryKeywords: [/хирургическ.*этап/i, /навигационн.*шаблон/i, /титан.*винт/i],
		defaultPriceRub: 35000,
		defaultDurationMinutes: 60,
		taxDeductible: true,
	},
	{
		code: "A16.07.054.005",
		title: "Установка формирователя десны (ФДМ)",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/формировател.*десн/i,
			/установк.*фдм/i,
			/(?:^|[\s(])фдм(?:[\s)]|$)/i,
			/десневой.*формировател/i,
			/раскрытие.*имплант/i,
		],
		secondaryKeywords: [/второй.*этап.*имплант/i, /гингивальный/i],
		defaultPriceRub: 4500,
		defaultDurationMinutes: 30,
		taxDeductible: true,
	},
	{
		code: "A16.07.055",
		title: "Синус-лифтинг (открытый / закрытый)",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/синус[-\s]?лифтинг/i,
			/субантральн.*аугментац/i,
			/поднятие.*дна.*гайморов/i,
			/открыт.*синус/i,
			/закрыт.*синус/i,
		],
		secondaryKeywords: [/гайморов.*пазух/i, /мембран.*шнайдер/i],
		defaultPriceRub: 30000,
		defaultDurationMinutes: 60,
		taxDeductible: true,
	},
	{
		code: "A16.07.041",
		title: "Костная пластика челюстно-лицевой области (НКР)",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/костн.*пластик/i,
			/аугментац.*кост/i,
			/остеопластик/i,
			/направленн.*костн.*регенерирац/i,
			/(?:^|[\s(])нкр(?:[\s)]|$)/i,
			/bio[-\s]?oss/i,
			/костн.*материал/i,
			/коллагенов.*мембран/i,
			/титанов.*сетк/i,
		],
		secondaryKeywords: [/костн.*стружк/i, /расщепление.*гребн/i, /забор.*блока/i],
		defaultPriceRub: 25000,
		defaultDurationMinutes: 60,
		taxDeductible: true,
	},
];
