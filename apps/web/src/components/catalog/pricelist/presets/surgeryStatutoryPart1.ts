/**
 * DENTE Dental CRM — Statutory Minzdrav Order № 804n Service Catalog & Nomenclature Presets
 *
 * Section 3: ХИРУРГИЯ И ИМПЛАНТАЦИЯ (A16.07) — Часть 1 (Удаление простое/сложное/8-ки, Osstem)
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";

export const SURGERY_STATUTORY_PRESETS_PART1: readonly ServicePricelistItem[] = [
	{
		id: "srv-a16-07-001-001",
		code804n: "A16.07.001.001",
		statutoryTitle804n: "Удаление постоянного зуба простое",
		commercialTitle: "Простое атравматичное удаление зуба щипцами/элеватором",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 3500,
		basePriceKopecks: 350000,
		materialCostRub: 500,
		labCostRub: 0,
		tierPrices: { vip: 4500, dms: 2800, promo: 2900 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K08.3", "K04.7"],
		estimatedDurationMin: 30,
		isActive: true,
		isArchived: false,
		tags: ["удаление", "простое удаление", "экстракция"],
	},
	{
		id: "srv-a16-07-001-002",
		code804n: "A16.07.001.002",
		statutoryTitle804n:
			"Удаление постоянного зуба сложное с разъединением корней",
		commercialTitle:
			"Сложное удаление зуба с сепарацией корней, остеотомией и наложением швов",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 6500,
		basePriceKopecks: 650000,
		materialCostRub: 900,
		labCostRub: 0,
		tierPrices: { vip: 8500, dms: 5000, promo: 5200 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K08.3", "K04.8"],
		estimatedDurationMin: 60,
		isActive: true,
		isArchived: false,
		tags: ["сложное удаление", "сепарация", "швы"],
	},
	{
		id: "srv-a16-07-024",
		code804n: "A16.07.024",
		statutoryTitle804n:
			"Операция удаления ретинированного, дистопированного или сверхкомплектного зуба",
		commercialTitle:
			"Удаление ретинированного/дистопированного зуба мудрости (8-ки) с пьезохирургией",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 9500,
		basePriceKopecks: 950000,
		materialCostRub: 1400,
		labCostRub: 0,
		tierPrices: { vip: 12500, dms: 7500, promo: 7900 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K01.0", "K01.1"],
		estimatedDurationMin: 60,
		isActive: true,
		isArchived: false,
		tags: ["зуб мудрости", "ретинированный", "восьмерка", "дистопия"],
	},
	{
		id: "srv-a16-07-054-001",
		code804n: "A16.07.054.001",
		statutoryTitle804n:
			"Внутрикостная дентальная имплантация (установка имплантата)",
		commercialTitle:
			"Установка дентального имплантата системы Osstem TS III (Южная Корея)",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 35000,
		basePriceKopecks: 3500000,
		materialCostRub: 11500,
		labCostRub: 0,
		tierPrices: { vip: 45000, dms: 30000, promo: 28900 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K08.1"],
		estimatedDurationMin: 60,
		isActive: true,
		isArchived: false,
		tags: ["имплантация", "osstem", "титан", "имплант"],
	},
];
