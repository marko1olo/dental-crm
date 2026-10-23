/**
 * packages/shared/src/pricelist/order804n/hygieneProphylaxisCatalog.ts
 * Layer 1: Statutory Catalog for Ultrasonic Scaling & AirFlow Prophylaxis (A16.07).
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Zero synthetic mocks — 100% statutory Minzdrav Order 804n positions.
 */

import type { StatutoryNomenclatureEntry } from "./types.js";

/**
 * Statutory 804n scaling and air-abrasive prophylaxis services.
 */
export const HYGIENE_PROPHYLAXIS_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "A16.07.051",
		title: "Профессиональная гигиена полости рта и зубов",
		category: "hygiene",
		specialty: "hygienist",
		primaryKeywords: [
			/профессиональн.*гигиен/i,
			/профгигиен/i,
			/комплексн.*чистк/i,
			/чистк.*зуб/i,
			/гигиеническ.*чистк/i,
			/гигиена.*полост.*рта/i,
		],
		secondaryKeywords: [/полировка/i, /паста/i, /индивидуальн.*гигиен/i],
		defaultPriceRub: 4500,
		defaultDurationMinutes: 60,
		taxDeductible: true,
	},
	{
		code: "A16.07.020",
		title: "Удаление наддесневых и поддесневых зубных отложений ультразвуком",
		category: "hygiene",
		specialty: "hygienist",
		primaryKeywords: [
			/ультразвук.*чистк/i,
			/скейлинг/i,
			/снятие.*камн/i,
			/удаление.*камн/i,
			/зубн.*камен/i,
			/зубн.*отложен/i,
			/снятие.*зубн.*отложен/i,
			/удаление.*зубн.*отложен/i,
			/ультразвук/i,
			/наддеснев.*отложен/i,
			/поддеснев.*отложен/i,
		],
		secondaryKeywords: [/пьезо/i, /скейлер/i],
		defaultPriceRub: 2500,
		defaultDurationMinutes: 30,
		taxDeductible: true,
	},
	{
		code: "A16.07.051.001",
		title: "Воздушно-абразивная обработка зубов (AirFlow)",
		category: "hygiene",
		specialty: "hygienist",
		primaryKeywords: [
			/air[-\s]?flow/i,
			/аир[-\s]?флоу/i,
			/воздушно[-\s]?абразивн/i,
			/порошк.*чистк/i,
			/снятие.*налет.*курильщик/i,
			/снятие.*пигмент/i,
		],
		secondaryKeywords: [/глицин/i, /сода/i, /эритритол/i],
		defaultPriceRub: 2500,
		defaultDurationMinutes: 30,
		taxDeductible: true,
	},
];
