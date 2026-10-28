/**
 * surgeryRegistry.ts — Statutory Nomenclature for Surgical Dentistry.
 * Strictly <= 120 lines.
 */

import type { StatutoryNomenclatureEntry } from "../../types.js";

export const SURGERY_STATUTORY_REGISTRY: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "A16.07.001", title: "Удаление зуба", category: "surgery", specialty: "surgeon",
		primaryKeywords: [
			/удалени.*зуб/i, /экстракц.*зуб/i, /удаление.*постоянн.*зуб/i,
			/удаление.*корн/i, /удаление.*сложн/i, /простое.*удаление/i,
		],
		secondaryKeywords: [/щипцы/i, /элеватор/i, /люксатор/i, /альвеол/i],
		defaultPriceRub: 3500,
	},
	{
		code: "A16.07.024", title: "Удаление ретинированного, дистопированного или сверхкомплектного зуба",
		category: "surgery", specialty: "surgeon",
		primaryKeywords: [
			/ретинирован/i, /дистопирован/i, /зуб.*мудрост/i, /восьмерк/i,
			/полуретинирован/i, /сверхкомплектн/i, /атипичн.*удален/i,
		],
		secondaryKeywords: [/выпиливание/i, /разъединение.*корней/i],
		defaultPriceRub: 8500,
	},
	{
		code: "A16.07.017", title: "Вскрытие поднадкостничного очага воспаления (периостотомия)",
		category: "surgery", specialty: "surgeon",
		primaryKeywords: [
			/периостотоми/i, /вскрытие.*абсцесс/i, /дренирован.*очаг/i,
			/дренаж/i, /разрез.*по.*переходн/i,
		],
		secondaryKeywords: [/флюс/i, /гнойник/i],
		defaultPriceRub: 3000,
	},
	{
		code: "A16.07.016", title: "Цистотомия или цистэктомия в области челюсти",
		category: "surgery", specialty: "surgeon",
		primaryKeywords: [/цистэктоми/i, /цистотоми/i, /кист.*челюст/i, /удаление.*кист/i],
		secondaryKeywords: [/оболочк.*кист/i],
		defaultPriceRub: 7500,
	},
	{
		code: "A16.07.007", title: "Резекция верхушки корня", category: "surgery", specialty: "surgeon",
		primaryKeywords: [/резекци.*верхушк/i, /апикоэктоми/i, /ретроградн.*пломбирован/i],
		secondaryKeywords: [/апикальн/i],
		defaultPriceRub: 8000,
	},
	{
		code: "A16.07.097", title: "Наложение шва на слизистую оболочку рта", category: "surgery", specialty: "surgeon",
		primaryKeywords: [/наложение.*шв/i, /шов/i, /ушивание/i, /викрил/i, /пролен/i, /кетгут/i],
		secondaryKeywords: [/снятие.*шв/i],
		defaultPriceRub: 1500,
	},
];
