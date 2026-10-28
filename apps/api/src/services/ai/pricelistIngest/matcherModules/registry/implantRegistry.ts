/**
 * implantRegistry.ts — Statutory Nomenclature for Dental Implants & Bone Grafting.
 * Strictly <= 120 lines.
 */

import type { StatutoryNomenclatureEntry } from "../../types.js";

export const IMPLANT_STATUTORY_REGISTRY: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "A16.07.054", title: "Внутрикостная дентальная имплантация", category: "surgery", specialty: "surgeon",
		primaryKeywords: [
			/имплант/i, /имплантат/i, /установк.*имплант/i, /дентальн.*имплантац/i,
			/straumann/i, /nobel/i, /osstem/i, /dentium/i, /astra.*tech/i,
			/anyridge/i, /neodent/i, /mis\b/i, /sgs\b/i, /hi-tec/i, /ankylos/i,
		],
		secondaryKeywords: [/хирургическ.*этап/i, /навигационн.*шаблон/i, /титан.*имплант/i],
		defaultPriceRub: 35000,
	},
	{
		code: "A16.07.054.005", title: "Установка формирователя десны", category: "surgery", specialty: "surgeon",
		primaryKeywords: [
			/формировател.*десн/i, /установк.*фдм/i, /\bфдм\b/i, /десневой.*формировател/i,
		],
		secondaryKeywords: [/второй.*этап.*имплант/i],
		defaultPriceRub: 4500,
	},
	{
		code: "A16.07.055", title: "Синус-лифтинг", category: "surgery", specialty: "surgeon",
		primaryKeywords: [
			/синус[-\s]?лифтинг/i, /субантральн.*аугментац/i, /поднятие.*дна.*гайморов/i,
			/открыт.*синус/i, /закрыт.*синус/i,
		],
		secondaryKeywords: [/гайморов.*пазух/i, /мембран.*шнайдер/i],
		defaultPriceRub: 30000,
	},
	{
		code: "A16.07.041", title: "Костная пластика челюстно-лицевой области", category: "surgery", specialty: "surgeon",
		primaryKeywords: [
			/костн.*пластик/i, /аугментац.*кост/i, /остеопластик/i,
			/направленн.*костн.*регенерирац/i, /нкр/i, /bio[-\s]?oss/i,
			/костн.*материал/i, /мембран.*коллаген/i,
		],
		secondaryKeywords: [/костн.*стружк/i, /титанов.*сетк/i],
		defaultPriceRub: 25000,
	},
];
