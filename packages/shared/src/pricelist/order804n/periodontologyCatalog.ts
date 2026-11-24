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
		title: "Медикаментозная обработка патологических зубодесневых карманов",
		category: "periodontology",
		specialty: "periodontist",
		primaryKeywords: [
			/обработка.*пародонтальн.*карман/i,
			/обработка.*зубодеснев.*карман/i,
			/инстилляци.*пародонтальн/i,
			/лечебн.*повязк.*пародонт/i,
			/аппликация.*десн/i,
		],
		secondaryKeywords: [/метрогил/i, /хлоргексидин.*гель/i],
		defaultPriceRub: 1200,
		defaultPriceKopecks: 120000n,
		defaultDurationMinutes: 20,
		taxDeductible: true,
	},
	{
		code: "A16.07.039",
		title: "Закрытый кюретаж при заболеваниях пародонта в области зуба",
		category: "periodontology",
		specialty: "periodontist",
		primaryKeywords: [
			/закрыт.*кюретаж/i,
			/кюретаж.*пародонтальн.*карман/i,
			/кюретаж.*зубодеснев.*карман/i,
			/кюретаж.*в.*области.*зуб/i,
		],
		secondaryKeywords: [/кюрета.*грейси/i, /поддеснев.*кюретаж/i],
		defaultPriceRub: 1800,
		defaultPriceKopecks: 180000n,
		defaultDurationMinutes: 30,
		taxDeductible: true,
	},
	{
		code: "A16.07.040",
		title: "Открытый кюретаж при заболеваниях пародонта в области зуба",
		category: "surgery",
		specialty: "periodontist",
		primaryKeywords: [
			/открыт.*кюретаж/i,
			/лоскутн.*операци.*пародонт/i,
			/кюретаж.*открыт/i,
		],
		secondaryKeywords: [/остеопластик/i, /мембран/i],
		defaultPriceRub: 3500,
		defaultPriceKopecks: 350000n,
		defaultDurationMinutes: 60,
		taxDeductible: true,
	},
	{
		code: "A22.07.002",
		title: "Ультразвуковое удаление наддесневых и поддесневых зубных отложений в области зуба",
		category: "periodontology",
		specialty: "periodontist",
		primaryKeywords: [
			/ультразвук.*удаление.*зубн.*отложен/i,
			/поддеснев.*скейлинг/i,
			/vector[-\s]?терапи/i,
			/вектор[-\s]?терапи/i,
			/полировк.*корн/i,
		],
		secondaryKeywords: [/пьезо/i, /vector.*polish/i],
		defaultPriceRub: 2500,
		defaultPriceKopecks: 250000n,
		defaultDurationMinutes: 30,
		taxDeductible: true,
	},
];
