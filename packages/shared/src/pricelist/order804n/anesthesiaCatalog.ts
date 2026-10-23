/**
 * packages/shared/src/pricelist/order804n/anesthesiaCatalog.ts
 * Layer 1: Statutory Catalog for Dental Local Anesthesia Services (B01.003).
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Zero synthetic mocks — 100% statutory Minzdrav Order 804n positions.
 */

import type { StatutoryNomenclatureEntry } from "./types.js";

/**
 * Statutory 804n dental anesthesia services.
 */
export const ANESTHESIA_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "B01.003.004.005",
		title: "Инфильтрационная анестезия",
		category: "other",
		specialty: "universal",
		primaryKeywords: [
			/инфильтрационн.*анестези/i,
			/ультракаин/i,
			/септанест/i,
			/убистезин/i,
			/артикаин/i,
			/карпульн.*анестези/i,
			/анестезия.*инфильтрац/i,
		],
		secondaryKeywords: [/карпул/i, /обезболиван/i, /адреналин/i],
		defaultPriceRub: 800,
		defaultDurationMinutes: 10,
		taxDeductible: true,
	},
	{
		code: "B01.003.004.004",
		title: "Проводниковая анестезия",
		category: "other",
		specialty: "surgeon",
		primaryKeywords: [
			/проводников.*анестези/i,
			/торусальн.*анестези/i,
			/мандибулярн.*анестези/i,
			/мандибулярк/i,
			/туберальн.*анестези/i,
		],
		secondaryKeywords: [/блокад.*нерв/i, /стволов/i],
		defaultPriceRub: 950,
		defaultDurationMinutes: 15,
		taxDeductible: true,
	},
	{
		code: "B01.003.004.001",
		title: "Аппликационная анестезия",
		category: "other",
		specialty: "universal",
		primaryKeywords: [
			/аппликационн.*анестези/i,
			/гель.*обезболив/i,
			/лидокаин.*спрей/i,
			/дисилан/i,
			/анестезия.*десн.*гель/i,
		],
		secondaryKeywords: [/смазывание/i, /вкусов/i],
		defaultPriceRub: 400,
		defaultDurationMinutes: 5,
		taxDeductible: true,
	},
];
