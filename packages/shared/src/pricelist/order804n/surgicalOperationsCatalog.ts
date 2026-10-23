/**
 * packages/shared/src/pricelist/order804n/surgicalOperationsCatalog.ts
 * Layer 1: Statutory Catalog for Specialized Oral Surgical Operations (A16.07).
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Zero synthetic mocks — 100% statutory Minzdrav Order 804n positions.
 */

import type { StatutoryNomenclatureEntry } from "./types.js";

/**
 * Statutory 804n cystectomy, apicoectomy, suturing and frenuloplasty.
 */
export const SURGICAL_OPERATIONS_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "A16.07.016",
		title: "Цистотомия или цистэктомия в области челюсти",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/цистэктоми/i,
			/цистотоми/i,
			/кист.*челюст/i,
			/удаление.*кист/i,
			/радукулярн.*кист/i,
		],
		secondaryKeywords: [/оболочк.*кист/i, /костный.*дефект/i],
		defaultPriceRub: 7500,
		defaultDurationMinutes: 45,
		taxDeductible: true,
	},
	{
		code: "A16.07.007",
		title: "Резекция верхушки корня",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/резекци.*верхушк/i,
			/апикоэктоми/i,
			/ретроградн.*пломбирован/i,
		],
		secondaryKeywords: [/апикальн/i, /мта/i, /mta/i],
		defaultPriceRub: 8000,
		defaultDurationMinutes: 60,
		taxDeductible: true,
	},
	{
		code: "A16.07.097",
		title: "Наложение шва на слизистую оболочку рта",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/наложение.*шв/i,
			/ушивание.*лунк/i,
			/шов.*викрил/i,
			/шов.*пролен/i,
			/снятие.*шв/i,
		],
		secondaryKeywords: [/шовный.*материал/i, /атравматическ.*игла/i],
		defaultPriceRub: 1500,
		defaultDurationMinutes: 15,
		taxDeductible: true,
	},
	{
		code: "A16.07.058",
		title: "Пластика уздечки языка или губы (френулопластика)",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/пластик.*уздечк/i,
			/френулопластик/i,
			/френулотоми/i,
			/подрезание.*уздечк/i,
		],
		secondaryKeywords: [/лазер.*уздечк/i, /диастема/i],
		defaultPriceRub: 4500,
		defaultDurationMinutes: 30,
		taxDeductible: true,
	},
];
