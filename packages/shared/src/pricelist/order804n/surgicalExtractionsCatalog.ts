/**
 * packages/shared/src/pricelist/order804n/surgicalExtractionsCatalog.ts
 * Layer 1: Statutory Catalog for Tooth Extractions & Emergency Surgical Care (A16.07).
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Zero synthetic mocks — 100% statutory Minzdrav Order 804n positions.
 */

import type { StatutoryNomenclatureEntry } from "./types.js";

/**
 * Statutory 804n tooth extractions and emergency inflammatory surgery.
 */
export const SURGICAL_EXTRACTIONS_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "A16.07.001",
		title: "Удаление зуба (простое / сложное)",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/удалени.*зуб/i,
			/экстракц.*зуб/i,
			/удаление.*постоянн.*зуб/i,
			/удаление.*корн/i,
			/простое.*удаление/i,
			/сложное.*удаление/i,
			/удаление.*однокорневого/i,
			/удаление.*многокорневого/i,
		],
		secondaryKeywords: [/щипцы/i, /элеватор/i, /люксатор/i, /альвеолит/i],
		defaultPriceRub: 3500,
		defaultDurationMinutes: 40,
		taxDeductible: true,
	},
	{
		code: "A16.07.024",
		title: "Удаление ретинированного, дистопированного зуба (зуб мудрости)",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/ретинирован/i,
			/дистопирован/i,
			/зуб.*мудрост/i,
			/восьмерк/i,
			/полуретинирован/i,
			/сверхкомплектн/i,
			/атипичн.*удален/i,
			/удаление.*8[-\s]?ки/i,
		],
		secondaryKeywords: [/выпиливание.*кост/i, /разъединение.*корней/i, /пьезохирурги/i],
		defaultPriceRub: 8500,
		defaultDurationMinutes: 60,
		taxDeductible: true,
	},
	{
		code: "A16.07.017",
		title: "Вскрытие поднадкостничного очага воспаления (периостотомия)",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/периостотоми/i,
			/вскрытие.*абсцесс/i,
			/дренирован.*очаг/i,
			/дренаж/i,
			/разрез.*по.*переходн/i,
			/флюс/i,
		],
		secondaryKeywords: [/гной/i, /резиновый.*дренаж/i],
		defaultPriceRub: 3000,
		defaultDurationMinutes: 20,
		taxDeductible: true,
	},
];
