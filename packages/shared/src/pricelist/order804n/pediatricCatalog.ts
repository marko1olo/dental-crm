/**
 * packages/shared/src/pricelist/order804n/pediatricCatalog.ts
 * Layer 1: Statutory Catalog for Pediatric Dental Care Services (A16.07, A11.07).
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Zero synthetic mocks — 100% statutory Minzdrav Order 804n positions.
 */

import type { StatutoryNomenclatureEntry } from "./types.js";

/**
 * Statutory 804n pediatric dentistry services.
 */
export const PEDIATRIC_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "A16.07.002.009",
		title: "Лечение кариеса временного (молочного) зуба",
		category: "therapy",
		specialty: "pediatric",
		primaryKeywords: [
			/молочн.*зуб.*пломб/i,
			/кариес.*молочн/i,
			/лечение.*кариес.*дет/i,
			/лечение.*кариес.*молочн/i,
			/цветн.*пломб/i,
			/twinky.*star/i,
			/витремер.*дет/i,
		],
		secondaryKeywords: [/серебрение/i],
		defaultPriceRub: 3000,
		defaultDurationMinutes: 30,
		taxDeductible: true,
	},
	{
		code: "A16.07.009",
		title: "Пульпотомия (ампутация пульпы молочного зуба)",
		category: "therapy",
		specialty: "pediatric",
		primaryKeywords: [
			/пульпотоми/i,
			/ампутаци.*пульп.*молочн/i,
			/пульпит.*молочн.*зуб/i,
			/пульпит.*детск/i,
		],
		secondaryKeywords: [/пульпотек/i, /формокрезол/i],
		defaultPriceRub: 3500,
		defaultDurationMinutes: 30,
		taxDeductible: true,
	},
	{
		code: "A11.07.010",
		title: "Серебрение твердых тканей зуба",
		category: "therapy",
		specialty: "pediatric",
		primaryKeywords: [
			/серебрени/i,
			/сафорайд/i,
			/аргенат/i,
			/нитрат.*серебр/i,
		],
		secondaryKeywords: [/детск.*зуб/i],
		defaultPriceRub: 800,
		defaultDurationMinutes: 15,
		taxDeductible: true,
	},
	{
		code: "A16.07.057",
		title: "Герметизация фиссур зуба",
		category: "hygiene",
		specialty: "pediatric",
		primaryKeywords: [
			/герметизаци.*фиссур/i,
			/неинвазивн.*герметизац/i,
			/инвазивн.*герметизац/i,
			/силант/i,
			/запечатывание.*фиссур/i,
		],
		secondaryKeywords: [/фиссур/i, /профилактик.*кариес/i],
		defaultPriceRub: 1800,
		defaultDurationMinutes: 20,
		taxDeductible: true,
	},
	{
		code: "A16.07.001.001",
		title: "Удаление временного (молочного) зуба",
		category: "surgery",
		specialty: "pediatric",
		primaryKeywords: [
			/удаление.*молочн.*зуб/i,
			/удаление.*временн.*зуб/i,
			/удаление.*подвижн.*молочн/i,
			/экстракция.*молочн/i,
		],
		secondaryKeywords: [/смена.*прикус/i, /физиологическ.*рассасыван/i],
		defaultPriceRub: 1800,
		defaultDurationMinutes: 20,
		taxDeductible: true,
	},
];
