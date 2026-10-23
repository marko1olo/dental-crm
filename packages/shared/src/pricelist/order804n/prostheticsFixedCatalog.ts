/**
 * packages/shared/src/pricelist/order804n/prostheticsFixedCatalog.ts
 * Layer 1: Statutory Catalog for Fixed Prosthodontic Restorations (A16.07).
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Zero synthetic mocks — 100% statutory Minzdrav Order 804n positions.
 */

import type { StatutoryNomenclatureEntry } from "./types.js";

/**
 * Fixed prosthetics statutory 804n services (crowns, veneers, core inlays).
 */
export const PROSTHETICS_FIXED_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "A16.07.004",
		title: "Восстановление зуба коронкой постоянной",
		category: "prosthetics",
		specialty: "orthopedist",
		primaryKeywords: [
			/коронк.*постоянн/i,
			/коронк/i,
			/металлокерамик/i,
			/диоксид.*циркони/i,
			/циркони/i,
			/e[-\s]?max/i,
			/цельнокерамическ.*коронк/i,
			/цельнолит.*коронк/i,
			/(?:^|[\s(])мк(?:[\s)]|$).*коронк/i,
			/мостовидн.*протез/i,
			/коронка.*на.*имплант/i,
		],
		secondaryKeywords: [/колпачок/i, /эмаль.*глазурь/i, /культев.*вкладк/i, /абатмент/i],
		defaultPriceRub: 18000,
		defaultDurationMinutes: 60,
		taxDeductible: true,
	},
	{
		code: "A16.07.004.002",
		title: "Изготовление и фиксация временной провизорной коронки",
		category: "prosthetics",
		specialty: "orthopedist",
		primaryKeywords: [
			/временн.*коронк/i,
			/провизорн.*коронк/i,
			/коронк.*pmma/i,
			/пластмассов.*коронк/i,
			/luxatemp/i,
		],
		secondaryKeywords: [/прямой.*метод/i, /лабораторн.*временн/i],
		defaultPriceRub: 2500,
		defaultDurationMinutes: 30,
		taxDeductible: true,
	},
	{
		code: "A16.07.005",
		title: "Восстановление зуба виниром, полукоронкой",
		category: "prosthetics",
		specialty: "orthopedist",
		primaryKeywords: [
			/винир/i,
			/люминир/i,
			/керамическ.*накладк/i,
			/полукоронк/i,
			/вкладк.*overlay/i,
			/вкладк.*inlay/i,
			/керамическ.*вкладк/i,
		],
		secondaryKeywords: [/полевошпат/i, /рефрактор/i, /эмалевый.*срез/i],
		defaultPriceRub: 22000,
		defaultDurationMinutes: 60,
		taxDeductible: true,
	},
	{
		code: "A16.07.003",
		title: "Восстановление зуба культевой вкладкой",
		category: "prosthetics",
		specialty: "orthopedist",
		primaryKeywords: [
			/культев.*вкладк/i,
			/вкладка.*кхс/i,
			/вкладка.*циркони/i,
			/литая.*вкладка/i,
			/штифтов.*культев/i,
		],
		secondaryKeywords: [/разборная.*вкладка/i, /моделировка/i],
		defaultPriceRub: 6500,
		defaultDurationMinutes: 45,
		taxDeductible: true,
	},
];
