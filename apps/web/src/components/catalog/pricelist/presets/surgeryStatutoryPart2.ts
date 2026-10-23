/**
 * DENTE Dental CRM — Statutory Minzdrav Order № 804n Service Catalog & Nomenclature Presets
 *
 * Section 3: ХИРУРГИЯ И ИМПЛАНТАЦИЯ (A16.07) — Часть 2 (Straumann, ФДМ, Синус-лифтинг)
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";

export const SURGERY_STATUTORY_PRESETS_PART2: readonly ServicePricelistItem[] = [
	{
		id: "srv-a16-07-054-002",
		code804n: "A16.07.054.002",
		statutoryTitle804n: "Внутрикостная дентальная имплантация премиум-системы",
		commercialTitle:
			"Установка дентального имплантата Straumann Roxolid SLActive (Швейцария)",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 65000,
		basePriceKopecks: 6500000,
		materialCostRub: 24000,
		labCostRub: 0,
		tierPrices: { vip: 85000, dms: 55000, promo: 59000 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K08.1"],
		estimatedDurationMin: 60,
		isActive: true,
		isArchived: false,
		tags: ["straumann", "швейцария", "премиум", "имплант"],
	},
	{
		id: "srv-a16-07-007",
		code804n: "A16.07.007",
		statutoryTitle804n: "Установка формирователя десны на имплантат",
		commercialTitle:
			"Установка формирователя десны (раскрытие имплантата, 2-й хирургический этап)",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 4500,
		basePriceKopecks: 450000,
		materialCostRub: 1200,
		labCostRub: 0,
		tierPrices: { vip: 6000, dms: 3600, promo: 3800 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K08.1"],
		estimatedDurationMin: 30,
		isActive: true,
		isArchived: false,
		tags: ["формирователь", "фдм", "десна", "имплант"],
	},
	{
		id: "srv-a16-07-041",
		code804n: "A16.07.041",
		statutoryTitle804n:
			"Костная пластика челюстно-лицевой области (синус-лифтинг)",
		commercialTitle:
			"Закрытый синус-лифтинг с остеопластическим материалом (Bio-Oss)",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 25000,
		basePriceKopecks: 2500000,
		materialCostRub: 9000,
		labCostRub: 0,
		tierPrices: { vip: 32000, dms: 21000, promo: 22000 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K08.2"],
		estimatedDurationMin: 45,
		isActive: true,
		isArchived: false,
		tags: ["синус-лифтинг", "кость", "bio-oss", "аугментация"],
	},
	{
		id: "srv-a16-07-055",
		code804n: "A16.07.055",
		statutoryTitle804n: "Синус-лифтинг открытый (латеральный доступ)",
		commercialTitle:
			"Открытый синус-лифтинг с латеральным окном и коллагеновой мембраной (Bio-Gide)",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 45000,
		basePriceKopecks: 4500000,
		materialCostRub: 16000,
		labCostRub: 0,
		tierPrices: { vip: 58000, dms: 38000, promo: 39900 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K08.2"],
		estimatedDurationMin: 90,
		isActive: true,
		isArchived: false,
		tags: ["открытый синус", "латеральный", "мембрана", "bio-gide"],
	},
];
