/**
 * DENTE Dental CRM — Endodontic Canal Preparation & Obturation Presets
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";

export const THERAPY_ENDO_PREP_PRESETS: readonly ServicePricelistItem[] = [
	{
		id: "srv-a16-07-030-001",
		code804n: "A16.07.030.001",
		statutoryTitle804n:
			"Инструментальная и медикаментозная обработка корневого канала (1-канальный зуб)",
		commercialTitle:
			"Механическая и медикаментозная обработка корневого канала машинным NiTi-инструментом (1 канал)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 3500,
		basePriceKopecks: 350000,
		materialCostRub: 800,
		labCostRub: 0,
		tierPrices: { vip: 4500, dms: 2900, promo: 3000 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K04.0", "K04.1"],
		estimatedDurationMin: 40,
		isAnatomicalCanalScalable: true,
		isActive: true,
		isArchived: false,
		tags: [
			"эндодонтия",
			"обработка канала",
			"пульпит",
			"периодонтит",
			"нерв",
			"удаление нерва",
			"депульпирование",
		],
	},
	{
		id: "srv-a16-07-008-001",
		code804n: "A16.07.008.001",
		statutoryTitle804n:
			"Пломбирование корневого канала зуба пастой/гуттаперчей (1 канал)",
		commercialTitle:
			"Обтурация корневого канала горячей гуттаперчей / биокерамическим силером (1 канал)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 4000,
		basePriceKopecks: 400000,
		materialCostRub: 900,
		labCostRub: 0,
		tierPrices: { vip: 5200, dms: 3300, promo: 3500 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K04.0", "K04.1"],
		estimatedDurationMin: 35,
		isAnatomicalCanalScalable: true,
		isActive: true,
		isArchived: false,
		tags: [
			"обтурация",
			"гуттаперча",
			"силер",
			"пломбирование канала",
			"лечение нерва",
			"нерв",
		],
	},
];
