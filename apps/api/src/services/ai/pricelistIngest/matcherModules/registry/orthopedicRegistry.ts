/**
 * orthopedicRegistry.ts — Statutory Nomenclature for Prosthodontics & Orthopedics.
 * Strictly <= 120 lines.
 */

import type { StatutoryNomenclatureEntry } from "../../types.js";

export const ORTHOPEDIC_STATUTORY_REGISTRY: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "A16.07.004", title: "Восстановление зуба коронкой постоянной", category: "orthopedics", specialty: "orthopedist",
		primaryKeywords: [
			/коронк/i, /металлокерамик/i, /диоксид.*циркони/i, /циркони/i,
			/e[-\s]?max/i, /цельнокерамическ/i, /цельнолит/i, /\bмк\b/i, /мостовидн.*протез/i,
		],
		secondaryKeywords: [/колпачок/i, /эмаль.*глазурь/i, /культев.*вкладк/i],
		defaultPriceRub: 18000,
	},
	{
		code: "A16.07.004.002", title: "Изготовление и фиксация временной провизорной коронки",
		category: "orthopedics", specialty: "orthopedist",
		primaryKeywords: [/временн.*коронк/i, /провизорн.*коронк/i, /коронк.*pmma/i, /пластмассов.*коронк/i],
		secondaryKeywords: [/luxatemp/i, /прямой.*метод/i],
		defaultPriceRub: 2500,
	},
	{
		code: "A16.07.005", title: "Восстановление зуба виниром, полукоронкой", category: "orthopedics", specialty: "orthopedist",
		primaryKeywords: [
			/винир/i, /люминир/i, /керамическ.*накладк/i, /полукоронк/i,
			/вкладк.*overlay/i, /вкладк.*inlay/i,
		],
		secondaryKeywords: [/полевошпат/i, /рефрактор/i],
		defaultPriceRub: 22000,
	},
	{
		code: "A16.07.006", title: "Протезирование съемными бюгельными протезами", category: "orthopedics", specialty: "orthopedist",
		primaryKeywords: [/бюгельн.*протез/i, /бюгел/i, /кламмерн.*фиксац/i, /замков.*бюгел/i, /аттачмен/i],
		secondaryKeywords: [/дуга.*протез/i],
		defaultPriceRub: 42000,
	},
	{
		code: "A16.07.023", title: "Протезирование зубов полными съемными пластиночными протезами",
		category: "orthopedics", specialty: "orthopedist",
		primaryKeywords: [
			/полн.*съемн/i, /частичн.*съемн.*протез/i, /пластиночн.*протез/i,
			/акри-фри/i, /acry[-\s]?free/i, /нейлонов.*протез/i, /акрилов.*протез/i,
		],
		secondaryKeywords: [/базис.*протез/i, /искусственн.*зубы/i],
		defaultPriceRub: 28000,
	},
	{
		code: "A02.07.010", title: "Снятие оттиска с одной челюсти", category: "orthopedics", specialty: "orthopedist",
		primaryKeywords: [/оттиск/i, /слепок/i, /альгинат/i, /силикон/i, /а[-\s]?силикон/i, /с[-\s]?силикон/i, /интраоральн.*сканирован/i],
		secondaryKeywords: [/ложка.*слепочн/i],
		defaultPriceRub: 1500,
	},
	{
		code: "A16.07.049", title: "Фиксация на постоянный цемент несъемных ортопедических конструкций",
		category: "orthopedics", specialty: "orthopedist",
		primaryKeywords: [/фиксаци.*коронк/i, /постоянн.*цемент/i, /fuji/i, /цементировк/i, /фиксация.*протез/i],
		secondaryKeywords: [/стеклоиономерн.*цемент/i],
		defaultPriceRub: 1800,
	},
];
