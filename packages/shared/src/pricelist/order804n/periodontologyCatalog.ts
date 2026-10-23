/**
 * packages/shared/src/pricelist/order804n/periodontologyCatalog.ts
 * Layer 1: Statutory Catalog for Periodontal Treatment Services (A16.07).
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Zero synthetic mocks — 100% statutory Minzdrav Order 804n positions.
 */

import type { StatutoryNomenclatureEntry } from "./types.js";

/**
 * Statutory 804n periodontic therapy and surgical care services.
 */
export const PERIODONTOLOGY_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "A16.07.018",
		title: "Закрытый кюретаж при заболеваниях пародонта",
		category: "periodontology",
		specialty: "periodontist",
		primaryKeywords: [
			/кюретаж/i,
			/пародонтальн.*карман/i,
			/vector[-\s]?терапи/i,
			/вектор[-\s]?терапи/i,
			/пародонтит/i,
			/закрыт.*кюретаж/i,
			/открыт.*кюретаж/i,
		],
		secondaryKeywords: [/кюрета.*грейси/i, /грануляц/i],
		defaultPriceRub: 3500,
		defaultDurationMinutes: 45,
		taxDeductible: true,
	},
	{
		code: "A16.07.019",
		title: "Временное шинирование при заболеваниях пародонта",
		category: "periodontology",
		specialty: "periodontist",
		primaryKeywords: [
			/шинирован/i,
			/гласспан/i,
			/ribbond/i,
			/стекловолоконн.*шин/i,
			/подвижност.*зуб.*шин/i,
		],
		secondaryKeywords: [/подвижн.*зуб/i, /фиксаци.*блоком/i],
		defaultPriceRub: 2200,
		defaultDurationMinutes: 30,
		taxDeductible: true,
	},
	{
		code: "A16.07.026",
		title: "Гингивопластика (пластика десны)",
		category: "surgery",
		specialty: "periodontist",
		primaryKeywords: [
			/гингивопластик/i,
			/пластик.*десн/i,
			/вестибулопластик/i,
			/удлинение.*коронков.*част/i,
		],
		secondaryKeywords: [/соединительнотканн.*трансплантат/i, /сдт/i, /сст/i],
		defaultPriceRub: 4500,
		defaultDurationMinutes: 45,
		taxDeductible: true,
	},
	{
		code: "A16.07.027",
		title: "Медикаментозная обработка пародонтальных карманов",
		category: "periodontology",
		specialty: "periodontist",
		primaryKeywords: [
			/обработка.*пародонтальн.*карман/i,
			/инстилляци.*пародонтальн/i,
			/лечебн.*повязк.*пародонт/i,
			/аппликация.*десн/i,
		],
		secondaryKeywords: [/метрогил/i, /хлоргексидин.*гель/i],
		defaultPriceRub: 1200,
		defaultDurationMinutes: 20,
		taxDeductible: true,
	},
];
