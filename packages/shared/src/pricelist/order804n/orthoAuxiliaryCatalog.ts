/**
 * packages/shared/src/pricelist/order804n/orthoAuxiliaryCatalog.ts
 * Layer 1: Statutory Catalog for Prosthodontic Impressions & Cementation Services (A02.07, A16.07).
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Zero synthetic mocks — 100% statutory Minzdrav Order 804n positions.
 */

import type { StatutoryNomenclatureEntry } from "./types.js";

/**
 * Dental impression, cementation and prosthesis removal statutory 804n services.
 */
export const ORTHO_AUXILIARY_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "A02.07.010",
		title: "Снятие оттиска с одной челюсти",
		category: "prosthetics",
		specialty: "orthopedist",
		primaryKeywords: [
			/оттиск/i,
			/слепок/i,
			/альгинат/i,
			/силикон/i,
			/а[-\s]?силикон/i,
			/с[-\s]?силикон/i,
			/интраоральн.*сканирован/i,
			/цифров.*слепок/i,
		],
		secondaryKeywords: [/индивидуальн.*ложк/i, /ложка.*слепочн/i],
		defaultPriceRub: 1500,
		defaultDurationMinutes: 20,
		taxDeductible: true,
	},
	{
		code: "A16.07.049",
		title: "Фиксация на постоянный цемент несъемных ортопедических конструкций",
		category: "prosthetics",
		specialty: "orthopedist",
		primaryKeywords: [
			/фиксаци.*коронк/i,
			/постоянн.*цемент/i,
			/fuji/i,
			/цементировк/i,
			/фиксация.*протез/i,
			/цемент.*variolink/i,
		],
		secondaryKeywords: [/стеклоиономер/i, /адгезивн.*фиксац/i],
		defaultPriceRub: 1800,
		defaultDurationMinutes: 20,
		taxDeductible: true,
	},
	{
		code: "A16.07.053",
		title: "Снятие несъемной ортопедической конструкции (коронки)",
		category: "prosthetics",
		specialty: "orthopedist",
		primaryKeywords: [
			/снятие.*коронк/i,
			/распиливание.*коронк/i,
			/снятие.*мостовидн/i,
			/снятие.*протез/i,
		],
		secondaryKeywords: [/коронкосниматель/i, /распил/i],
		defaultPriceRub: 1500,
		defaultDurationMinutes: 20,
		taxDeductible: true,
	},
];
