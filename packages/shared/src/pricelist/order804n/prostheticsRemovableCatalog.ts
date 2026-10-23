/**
 * packages/shared/src/pricelist/order804n/prostheticsRemovableCatalog.ts
 * Layer 1: Statutory Catalog for Removable Prosthodontic Dentures (A16.07).
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Zero synthetic mocks — 100% statutory Minzdrav Order 804n positions.
 */

import type { StatutoryNomenclatureEntry } from "./types.js";

/**
 * Removable dentures statutory 804n services.
 */
export const PROSTHETICS_REMOVABLE_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "A16.07.006",
		title: "Протезирование съемными бюгельными протезами",
		category: "prosthetics",
		specialty: "orthopedist",
		primaryKeywords: [
			/бюгельн.*протез/i,
			/бюгел/i,
			/кламмерн.*бюгел/i,
			/замков.*бюгел/i,
			/аттачмен.*бюгел/i,
		],
		secondaryKeywords: [/дуга.*протез/i, /литье.*бюгел/i],
		defaultPriceRub: 42000,
		defaultDurationMinutes: 60,
		taxDeductible: true,
	},
	{
		code: "A16.07.023",
		title: "Протезирование зубов съемными пластиночными протезами (полными/частичными)",
		category: "prosthetics",
		specialty: "orthopedist",
		primaryKeywords: [
			/съемн.*протез/i,
			/пластиночн.*протез/i,
			/акри-фри/i,
			/acry[-\s]?free/i,
			/нейлонов.*протез/i,
			/акрилов.*протез/i,
			/полн.*съемн/i,
			/частичн.*съемн/i,
			/протез.*квадротти/i,
			/quattro.*ti/i,
		],
		secondaryKeywords: [/базис.*протез/i, /искусственн.*зубы/i, /гарнитур/i],
		defaultPriceRub: 28000,
		defaultDurationMinutes: 60,
		taxDeductible: true,
	},
];
