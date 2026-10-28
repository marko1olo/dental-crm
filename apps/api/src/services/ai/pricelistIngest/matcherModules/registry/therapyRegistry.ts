/**
 * therapyRegistry.ts — Statutory Nomenclature for Therapeutic Dentistry.
 * Strictly <= 120 lines.
 */

import type { StatutoryNomenclatureEntry } from "../../types.js";

export const THERAPY_STATUTORY_REGISTRY: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "A16.07.002", title: "Восстановление зуба пломбой", category: "therapy", specialty: "therapist",
		primaryKeywords: [
			/кариес/i, /пломб/i, /реставрац/i, /светоотвержд/i, /фотополимер/i,
			/эмаль/i, /герметизац/i, /композит/i, /клиновидн/i, /эстетическ.*реставрац/i,
		],
		secondaryKeywords: [/дентин/i, /изолирующ.*прокладк/i, /лечебн.*прокладк/i],
		defaultPriceRub: 4500,
	},
	{
		code: "A16.07.008", title: "Пломбирование корневого канала зуба", category: "therapy", specialty: "therapist",
		primaryKeywords: [
			/пульпит/i, /периодонтит/i, /корнев.*канал/i, /эндодонт/i, /депульпир/i,
			/обтурац/i, /гуттаперч/i, /пломбирование.*канал/i, /латеральн.*конденсац/i,
		],
		secondaryKeywords: [/апекслокац/i, /лечение.*канал/i, /биокерамик/i],
		defaultPriceRub: 5500,
	},
	{
		code: "A16.07.030", title: "Инструментальная и медикаментозная обработка корневого канала",
		category: "therapy", specialty: "therapist",
		primaryKeywords: [
			/механическ.*обработк.*канал/i, /инструментальн.*обработк.*канал/i,
			/медикаментозн.*обработк.*канал/i, /расширение.*канал/i, /прохождение.*канал/i,
		],
		secondaryKeywords: [/эндомотор/i, /протейпер/i, /хлоргекисидин/i],
		defaultPriceRub: 3500,
	},
	{
		code: "A16.07.031", title: "Препарирование твердых тканей зуба при лечении кариеса",
		category: "therapy", specialty: "therapist",
		primaryKeywords: [/препарирован/i, /некрэктоми/i, /раскрытие.*полост/i],
		secondaryKeywords: [/формирование.*полост/i],
		defaultPriceRub: 1200,
	},
	{
		code: "A16.07.091", title: "Временное пломбирование лекарственным препаратом корневого канала",
		category: "therapy", specialty: "therapist",
		primaryKeywords: [
			/временн.*пломбирован.*канал/i, /каласепт/i, /метапекс/i,
			/кальци/i, /гидроокис.*кальци/i, /лечебн.*повязк.*канал/i,
		],
		secondaryKeywords: [/паста.*канал/i],
		defaultPriceRub: 2000,
	},
	{
		code: "A16.07.082", title: "Распломбирование корневого канала",
		category: "therapy", specialty: "therapist",
		primaryKeywords: [
			/распломбиров/i, /перелечиван.*канал/i,
			/извлечение.*штифт/i, /извлечение.*вкладк/i,
		],
		secondaryKeywords: [/резорцин/i, /фосфат.*цемент/i],
		defaultPriceRub: 2500,
	},
];
