/**
 * statutoryNomenclatureSurgery.ts — Позиции хирургии, ортопедии и ортодонтии
 */

import type { DmsNomenclature804nItem } from "./types.js";

export const SURGERY_AND_SPECIALIZED_NOMENCLATURE: readonly DmsNomenclature804nItem[] = [
	{
		code: "A16.07.001",
		name: "Удаление постоянного зуба (простое)",
		category: "surgery",
		defaultPriceKopecks: 280000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.001.001",
		name: "Удаление зуба сложное с разъединением корней",
		category: "surgery",
		defaultPriceKopecks: 490000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.001.002",
		name: "Удаление ретинированного или дистопированного зуба «мудрости» (8-й зуб)",
		category: "surgery",
		defaultPriceKopecks: 850000,
		isBaseDmsCovered: true,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.054",
		name: "Внутрикостная дентальная имплантация (установка имплантата)",
		category: "surgery",
		defaultPriceKopecks: 3800000,
		isBaseDmsCovered: false,
		requiresToothNumber: true,
		requiresXrayProof: true,
	},
	{
		code: "A16.07.003",
		name: "Восстановление зуба керамическим виниром / люминиром",
		category: "orthopedics",
		defaultPriceKopecks: 3200000,
		isBaseDmsCovered: false,
		requiresToothNumber: true,
		requiresXrayProof: false,
	},
	{
		code: "A16.07.050",
		name: "Профессиональное клиническое отбеливание зубов (Zoom 4)",
		category: "hygiene",
		defaultPriceKopecks: 2600000,
		isBaseDmsCovered: false,
		requiresToothNumber: false,
		requiresXrayProof: false,
	},
	{
		code: "A16.07.047",
		name: "Ортодонтическая коррекция с применением брекет-системы",
		category: "orthodontics",
		defaultPriceKopecks: 6500000,
		isBaseDmsCovered: false,
		requiresToothNumber: false,
		requiresXrayProof: false,
	},
];
