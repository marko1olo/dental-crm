/**
 * packages/shared/src/pricelist/order804n/orthodonticsCatalog.ts
 * Layer 1: Statutory Catalog for Orthodontic Treatment Services (A16.07).
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Zero synthetic mocks — 100% statutory Minzdrav Order 804n positions.
 */

import type { StatutoryNomenclatureEntry } from "./types.js";

/**
 * Orthodontics statutory 804n services (brackets, aligners, plates, retainers).
 */
export const ORTHODONTICS_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "A16.07.048",
		title: "Ортодонтическая коррекция с применением брекет-систем",
		category: "orthodontics",
		specialty: "orthodontist",
		primaryKeywords: [
			/брекет/i,
			/элайнер/i,
			/damon/i,
			/активаци.*дуг/i,
			/фиксаци.*брекет/i,
			/снятие.*брекет/i,
			/ортодонтическ.*коррекц/i,
			/flexiligner/i,
			/invisalign/i,
			/(?:^|[\s(])spark(?:[\s)]|$)/i,
			/евро капп/i,
		],
		secondaryKeywords: [/лигатур/i, /замок.*брекет/i, /эластик/i, /сепарац/i],
		defaultPriceRub: 35000,
		defaultDurationMinutes: 45,
		taxDeductible: true,
	},
	{
		code: "A16.07.047",
		title: "Ортодонтическая коррекция съемным аппаратом (пластинка / трейнер)",
		category: "orthodontics",
		specialty: "orthodontist",
		primaryKeywords: [
			/ортодонтическ.*пластинк/i,
			/съемн.*ортодонтическ/i,
			/трейнер/i,
			/пластинка.*расширяющ/i,
			/аппарат.*хааса/i,
			/аппарат.*марко.*роса/i,
		],
		secondaryKeywords: [/винт.*бертони/i, /кламмер.*адамс/i],
		defaultPriceRub: 18000,
		defaultDurationMinutes: 30,
		taxDeductible: true,
	},
	{
		code: "A16.07.046",
		title: "Ортодонтическая коррекция с применением ретенционного аппарата (ретейнер)",
		category: "orthodontics",
		specialty: "orthodontist",
		primaryKeywords: [
			/ретейнер/i,
			/фиксаци.*ретейнер/i,
			/ретенционн.*капп/i,
			/проволочн.*ретейнер/i,
			/починка.*ретейнер/i,
		],
		secondaryKeywords: [/ретенция/i, /стабилизац.*прикус/i],
		defaultPriceRub: 6500,
		defaultDurationMinutes: 30,
		taxDeductible: true,
	},
];
