/**
 * DENTE Dental CRM — Anesthesia Presets
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";

export const ANESTHESIA_STATUTORY_PRESETS: readonly ServicePricelistItem[] = [
	{
		id: "srv-a16-07-004-001",
		code804n: "A16.07.004.001",
		statutoryTitle804n: "Анестезия местная инфильтрационная",
		commercialTitle:
			"Местная инфильтрационная анестезия (Ультракаин Д-С форте 1:100 000)",
		category: "anesthesia",
		specialty: "therapist",
		basePriceRub: 950,
		basePriceKopecks: 95000,
		materialCostRub: 220,
		labCostRub: 0,
		tierPrices: { vip: 1300, dms: 750, promo: 750 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["Z01.2"],
		estimatedDurationMin: 10,
		isActive: true,
		isArchived: false,
		tags: ["анестезия", "инфильтрация", "ультракаин", "обезболивание"],
	},
	{
		id: "srv-a16-07-004-002",
		code804n: "A16.07.004.002",
		statutoryTitle804n: "Анестезия местная проводниковая",
		commercialTitle: "Проводниковая (мандибулярная / торусальная) анестезия",
		category: "anesthesia",
		specialty: "surgeon",
		basePriceRub: 1200,
		basePriceKopecks: 120000,
		materialCostRub: 280,
		labCostRub: 0,
		tierPrices: { vip: 1600, dms: 950, promo: 950 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["Z01.2"],
		estimatedDurationMin: 15,
		isActive: true,
		isArchived: false,
		tags: ["проводниковая", "мандибулярная", "торусальная"],
	},
	{
		id: "srv-a16-07-004-003",
		code804n: "A16.07.004.003",
		statutoryTitle804n: "Анестезия местная без адреналина (мепивакаин)",
		commercialTitle:
			"Безадреналиновая анестезия Мепивакаин / Скандонест 3% (для пациентов группы риска)",
		category: "anesthesia",
		specialty: "therapist",
		basePriceRub: 1100,
		basePriceKopecks: 110000,
		materialCostRub: 260,
		labCostRub: 0,
		tierPrices: { vip: 1500, dms: 900, promo: 900 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["Z01.2"],
		estimatedDurationMin: 10,
		isActive: true,
		isArchived: false,
		tags: ["мепивакаин", "без адреналина", "сердечники", "беременные"],
	},
];
