/**
 * nomenclatureCatalogTherapy.ts — Терапевтические услуги номенклатуры для сопоставления ДМС
 */

import type { Nomenclature804nItem } from "./types.js";

export const NOMENCLATURE_CATALOG_THERAPY: readonly Nomenclature804nItem[] = [
	{
		code: "A16.07.002.001",
		name: "Восстановление зуба пломбой (I, V, VI класс по Блэку) с использованием светоотверждаемых материалов",
		category: "therapy",
		categoryTitleRu: "Терапевтическая стоматология",
		defaultPriceRub: 4500,
		standardCoveredDms: true,
		uet: 1.0,
	},
	{
		code: "A16.07.002.002",
		name: "Восстановление зуба пломбой (II, III класс по Блэку)",
		category: "therapy",
		categoryTitleRu: "Терапевтическая стоматология",
		defaultPriceRub: 5600,
		standardCoveredDms: true,
		uet: 1.5,
	},
	{
		code: "A16.07.002.003",
		name: "Восстановление зуба пломбой (IV класс по Блэку с разрушением более 1/2 коронки)",
		category: "therapy",
		categoryTitleRu: "Терапевтическая стоматология",
		defaultPriceRub: 7200,
		standardCoveredDms: true,
		uet: 2.25,
	},
	{
		code: "A16.07.030.001",
		name: "Инструментальная и медикаментозная обработка корневого канала (1 канал)",
		category: "therapy",
		categoryTitleRu: "Эндодонтия",
		defaultPriceRub: 3500,
		standardCoveredDms: true,
		uet: 1.25,
	},
	{
		code: "A16.07.030.002",
		name: "Инструментальная и медикаментозная обработка корневых каналов (2 канала)",
		category: "therapy",
		categoryTitleRu: "Эндодонтия",
		defaultPriceRub: 5800,
		standardCoveredDms: true,
		uet: 2.0,
	},
	{
		code: "A16.07.030.003",
		name: "Инструментальная и медикаментозная обработка корневых каналов (3 канала)",
		category: "therapy",
		categoryTitleRu: "Эндодонтия",
		defaultPriceRub: 8200,
		standardCoveredDms: true,
		uet: 2.75,
	},
	{
		code: "A16.07.008.001",
		name: "Пломбирование корневого канала зуба гуттаперчей / биокерамикой (1 канал)",
		category: "therapy",
		categoryTitleRu: "Эндодонтия",
		defaultPriceRub: 4000,
		standardCoveredDms: true,
		uet: 1.25,
	},
	{
		code: "A16.07.008.002",
		name: "Пломбирование корневых каналов двухканального зуба (2 канала)",
		category: "therapy",
		categoryTitleRu: "Эндодонтия",
		defaultPriceRub: 6700,
		standardCoveredDms: true,
		uet: 2.0,
	},
	{
		code: "A16.07.008.003",
		name: "Пломбирование корневых каналов трехканального зуба (3 канала)",
		category: "therapy",
		categoryTitleRu: "Эндодонтия",
		defaultPriceRub: 9500,
		standardCoveredDms: true,
		uet: 2.75,
	},
];
