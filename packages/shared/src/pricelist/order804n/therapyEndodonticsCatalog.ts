/**
 * packages/shared/src/pricelist/order804n/therapyEndodonticsCatalog.ts
 * Layer 1: Statutory Catalog for Endodontic & Root Canal Therapy Services (A16.07).
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Zero synthetic mocks — 100% statutory Minzdrav Order 804n positions.
 */

import type { StatutoryNomenclatureEntry } from "./types.js";

/**
 * Statutory 804n endodontic and root canal treatment services.
 */
export const THERAPY_ENDO_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "A16.07.008",
		title: "Пломбирование корневого канала зуба (эндодонтия)",
		category: "therapy",
		specialty: "therapist",
		primaryKeywords: [
			/пульпит/i,
			/периодонтит/i,
			/корнев.*канал/i,
			/эндодонт/i,
			/депульпир/i,
			/обтурац.*канал/i,
			/гуттаперч/i,
			/пломбирование.*канал/i,
			/латеральн.*конденсац/i,
			/вертикальн.*конденсац/i,
			/термафил/i,
			/лечение.*канал/i,
		],
		secondaryKeywords: [/апекслокац/i, /силер/i, /биокерамик/i, /ah.*plus/i],
		defaultPriceRub: 5500,
		defaultDurationMinutes: 60,
		taxDeductible: true,
	},
	{
		code: "A16.07.030",
		title: "Инструментальная и медикаментозная обработка корневого канала",
		category: "therapy",
		specialty: "therapist",
		primaryKeywords: [
			/механическ.*обработк.*канал/i,
			/инструментальн.*обработк.*канал/i,
			/медикаментозн.*обработк.*канал/i,
			/эндодонтическ.*обработк.*канал/i,
			/обработк.*корнев.*канал/i,
			/ротационн.*файл/i,
			/расширение.*канал/i,
			/прохождение.*канал/i,
			/эндомотор/i,
			/протейпер/i,
		],
		secondaryKeywords: [/гипохлорит/i, /эдта/i, /ирригаци/i, /ультразвук.*активац/i],
		defaultPriceRub: 3500,
		defaultDurationMinutes: 45,
		taxDeductible: true,
	},
	{
		code: "A16.07.082",
		title: "Распломбирование корневого канала",
		category: "therapy",
		specialty: "therapist",
		primaryKeywords: [
			/распломбиров/i,
			/перелечиван.*канал/i,
			/извлечение.*штифт/i,
			/извлечение.*вкладк/i,
			/извлечение.*обломк.*инструмент/i,
			/удаление.*гуттаперч/i,
		],
		secondaryKeywords: [/резорцин.*формалин/i, /фосфат.*цемент/i, /микроскоп/i],
		defaultPriceRub: 2500,
		defaultDurationMinutes: 45,
		taxDeductible: true,
	},
	{
		code: "A16.07.091",
		title: "Временное пломбирование лекарственным препаратом корневого канала",
		category: "therapy",
		specialty: "therapist",
		primaryKeywords: [
			/временн.*пломбирован.*канал/i,
			/каласепт/i,
			/метапекс/i,
			/кальци/i,
			/гидроокис.*кальци/i,
			/лечебн.*повязк.*канал/i,
			/паста.*в.*канал/i,
		],
		secondaryKeywords: [/дентин.*паста/i, /септомп/i],
		defaultPriceRub: 2000,
		defaultDurationMinutes: 30,
		taxDeductible: true,
	},
	{
		code: "A16.07.093",
		title: "Фиксация внутриканального штифта",
		category: "therapy",
		specialty: "therapist",
		primaryKeywords: [
			/стекловолоконн.*штифт/i,
			/анкерн.*штифт/i,
			/внутриканальн.*штифт/i,
			/установка.*штифт/i,
			/фиксация.*штифт/i,
		],
		secondaryKeywords: [/корневой.*штифт/i, /билд.*ап/i, /build.*up/i],
		defaultPriceRub: 2800,
		defaultDurationMinutes: 30,
		taxDeductible: true,
	},
];
