/**
 * hygieneRegistry.ts — Statutory Nomenclature for Hygiene & Periodontics.
 * Strictly <= 120 lines.
 */

import type { StatutoryNomenclatureEntry } from "../../types.js";

export const HYGIENE_STATUTORY_REGISTRY: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "A16.07.051", title: "Профессиональная гигиена полости рта и зубов", category: "hygiene", specialty: "hygienist",
		primaryKeywords: [
			/профессиональн.*гигиен/i, /профгигиен/i, /комплексн.*чистк/i,
			/чистк.*зуб/i, /снятие.*налет/i, /гигиеническ.*чистк/i,
		],
		secondaryKeywords: [/пациент.*гигиен/i, /мотивация/i],
		defaultPriceRub: 4500,
	},
	{
		code: "A16.07.020", title: "Удаление наддесневых и поддесневых зубных отложений ультразвуком",
		category: "hygiene", specialty: "hygienist",
		primaryKeywords: [
			/ультразвук/i, /скейлинг/i, /удаление.*камн/i,
			/зубн.*камен/i, /наддеснев.*отложен/i, /поддеснев.*отложен/i,
		],
		secondaryKeywords: [/пьезо/i, /кюрет/i],
		defaultPriceRub: 2500,
	},
	{
		code: "A16.07.051.001", title: "Воздушно-абразивная обработка зубов (AirFlow)",
		category: "hygiene", specialty: "hygienist",
		primaryKeywords: [/air[-\s]?flow/i, /аир[-\s]?флоу/i, /воздушно[-\s]?абразивн/i, /порошк.*чистк/i],
		secondaryKeywords: [/глицин/i, /сода/i],
		defaultPriceRub: 2500,
	},
	{
		code: "A11.07.012", title: "Глубокое фторирование эмали зуба", category: "hygiene", specialty: "hygienist",
		primaryKeywords: [/фторирован/i, /фторлак/i, /реминерализац/i, /эмаль[-\s]?герметизирующ/i, /глубок.*фторир/i],
		secondaryKeywords: [/бифлюорид/i, /аппликация.*фтор/i],
		defaultPriceRub: 1200,
	},
	{
		code: "A16.07.050", title: "Профессиональное отбеливание зубов", category: "hygiene", specialty: "hygienist",
		primaryKeywords: [/отбеливан/i, /zoom/i, /amazing.*white/i, /flash\b/i, /клиническ.*отбеливан/i, /капп.*для.*отбеливан/i],
		secondaryKeywords: [/пероксид/i, /коффердам/i],
		defaultPriceRub: 25000,
	},
	{
		code: "A16.07.019", title: "Временное шинирование при заболеваниях пародонта", category: "hygiene", specialty: "hygienist",
		primaryKeywords: [/шинирован/i, /гласспан/i, /ribbond/i, /стекловолоконн.*шин/i, /подвижност.*зуб/i],
		secondaryKeywords: [/пародонтит/i],
		defaultPriceRub: 2200,
	},
];
