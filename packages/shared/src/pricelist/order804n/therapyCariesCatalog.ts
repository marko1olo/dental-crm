/**
 * packages/shared/src/pricelist/order804n/therapyCariesCatalog.ts
 * Layer 1: Statutory Catalog for Caries Therapy & Cavity Preparation Services (A16.07).
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Zero synthetic mocks — 100% statutory Minzdrav Order 804n positions.
 */

import type { StatutoryNomenclatureEntry } from "./types.js";

/**
 * Statutory 804n caries restoration and preparation services.
 */
export const THERAPY_CARIES_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "A16.07.002",
		title: "Восстановление зуба пломбой (лечение кариеса)",
		category: "therapy",
		specialty: "therapist",
		primaryKeywords: [
			/кариес/i,
			/пломб/i,
			/реставрац.*зуб/i,
			/светоотвержд.*пломб/i,
			/фотополимер/i,
			/световая.*пломба/i,
			/композит/i,
			/клиновидн.*дефект/i,
			/эстетическ.*реставрац/i,
			/эмаль/i,
			/дентин/i,
			/filtek/i,
			/estelite/i,
			/gradia/i,
			/градиа/i,
			/charisma/i,
		],
		secondaryKeywords: [/изолирующ.*прокладк/i, /коффердам/i, /матрица/i, /бондинг/i],
		defaultPriceRub: 4500,
		defaultDurationMinutes: 45,
		taxDeductible: true,
	},
	{
		code: "A16.07.031",
		title: "Препарирование твердых тканей зуба при лечении кариеса",
		category: "therapy",
		specialty: "therapist",
		primaryKeywords: [
			/препарирован.*зуб/i,
			/некрэктоми/i,
			/раскрытие.*кариозн.*полост/i,
			/формирование.*полост/i,
		],
		secondaryKeywords: [/бор/i, /водное.*охлаждение/i],
		defaultPriceRub: 1200,
		defaultDurationMinutes: 20,
		taxDeductible: true,
	},
];
