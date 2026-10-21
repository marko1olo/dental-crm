/**
 * nomenclatureCatalogOther.ts — Хирургические, диагностические и прочие услуги для сопоставления ДМС
 */

import type { Nomenclature804nItem } from "./types.js";

export const NOMENCLATURE_CATALOG_OTHER: readonly Nomenclature804nItem[] = [
	{
		code: "A16.07.001.001",
		name: "Удаление постоянного зуба (простое)",
		category: "surgery",
		categoryTitleRu: "Хирургическая стоматология",
		defaultPriceRub: 3200,
		standardCoveredDms: true,
		uet: 1.0,
	},
	{
		code: "A16.07.001.002",
		name: "Удаление зуба сложное с разъединением корней",
		category: "surgery",
		categoryTitleRu: "Хирургическая стоматология",
		defaultPriceRub: 5900,
		standardCoveredDms: true,
		uet: 2.0,
	},
	{
		code: "A16.07.024",
		name: "Операция удаления ретинированного, дистопированного или сверхкомплектного зуба",
		category: "surgery",
		categoryTitleRu: "Хирургическая стоматология",
		defaultPriceRub: 9800,
		standardCoveredDms: true,
		uet: 3.5,
	},
	{
		code: "A16.07.051",
		name: "Профессиональная гигиена полости рта и зубов (ультразвук + AirFlow + полировка)",
		category: "hygiene",
		categoryTitleRu: "Профилактика и гигиена",
		defaultPriceRub: 6500,
		standardCoveredDms: true,
		uet: 2.5,
	},
	{
		code: "A06.07.007",
		name: "Прицельная внутриротовая контактная рентгенография",
		category: "diagnostics",
		categoryTitleRu: "Диагностика и рентгенология",
		defaultPriceRub: 600,
		standardCoveredDms: true,
		uet: 0.5,
	},
	{
		code: "A06.07.004",
		name: "Ортопантомография (ОПТГ)",
		category: "diagnostics",
		categoryTitleRu: "Диагностика и рентгенология",
		defaultPriceRub: 1800,
		standardCoveredDms: true,
		uet: 1.0,
	},
	{
		code: "B01.003.004.001",
		name: "Местная анестезия (инфильтрационная, проводниковая, аппликационная)",
		category: "anesthesia",
		categoryTitleRu: "Анестезиология",
		defaultPriceRub: 900,
		standardCoveredDms: true,
		uet: 0.5,
	},
	{
		code: "A16.07.004",
		name: "Восстановление зуба коронкой металлокерамической",
		category: "orthopedics",
		categoryTitleRu: "Ортопедическая стоматология",
		defaultPriceRub: 18500,
		standardCoveredDms: false,
		uet: 4.0,
	},
	{
		code: "A16.07.006",
		name: "Установка дентального имплантата (хирургический этап)",
		category: "surgery",
		categoryTitleRu: "Имплантология",
		defaultPriceRub: 35000,
		standardCoveredDms: false,
		uet: 5.0,
	},
];
