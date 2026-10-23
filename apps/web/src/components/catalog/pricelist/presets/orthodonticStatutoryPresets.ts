/**
 * DENTE Dental CRM — Statutory Minzdrav Order № 804n Service Catalog & Nomenclature Presets
 *
 * Section 5: ОРТОДОНТИЯ (A16.07)
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";

export const ORTHODONTIC_STATUTORY_PRESETS: readonly ServicePricelistItem[] = [
	{
		id: "srv-a16-07-047-001",
		code804n: "A16.07.047.001",
		statutoryTitle804n:
			"Ортодонтическая коррекция с применением брекет-системы (металлическая)",
		commercialTitle:
			"Фиксация самолигирующей металлической брекет-системы Damon Q (1 челюсть)",
		category: "orthodontics",
		specialty: "orthodontist",
		basePriceRub: 45000,
		basePriceKopecks: 4500000,
		materialCostRub: 18000,
		labCostRub: 0,
		tierPrices: { vip: 58000, dms: 38000, promo: 39000 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K07.2", "K07.4"],
		estimatedDurationMin: 90,
		isActive: true,
		isArchived: false,
		tags: ["брекеты", "damon q", "металл", "ортодонтия"],
	},
	{
		id: "srv-a16-07-047-002",
		code804n: "A16.07.047.002",
		statutoryTitle804n:
			"Ортодонтическая коррекция с применением брекет-системы (керамическая)",
		commercialTitle:
			"Фиксация эстетической керамической брекет-системы Damon Clear (1 челюсть)",
		category: "orthodontics",
		specialty: "orthodontist",
		basePriceRub: 65000,
		basePriceKopecks: 6500000,
		materialCostRub: 28000,
		labCostRub: 0,
		tierPrices: { vip: 85000, dms: 55000, promo: 58000 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K07.2", "K07.4"],
		estimatedDurationMin: 90,
		isActive: true,
		isArchived: false,
		tags: ["керамика", "damon clear", "эстетика", "сапфир"],
	},
	{
		id: "srv-a16-07-047-003",
		code804n: "A16.07.047.003",
		statutoryTitle804n: "Активация ортодонтического аппарата / брекет-системы",
		commercialTitle:
			"Плановый прием с заменой ортодонтической дуги и активацией брекетов (1 челюсть)",
		category: "orthodontics",
		specialty: "orthodontist",
		basePriceRub: 4500,
		basePriceKopecks: 450000,
		materialCostRub: 1100,
		labCostRub: 0,
		tierPrices: { vip: 5800, dms: 3800, promo: 3900 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K07.2"],
		estimatedDurationMin: 30,
		isActive: true,
		isArchived: false,
		tags: ["активация", "дуга", "прием ортодонта"],
	},
	{
		id: "srv-a16-07-047-004",
		code804n: "A16.07.047.004",
		statutoryTitle804n:
			"Ортодонтическое лечение с применением элайнеров (прозрачных капп)",
		commercialTitle:
			"Комплексный курс лечения на элайнерах Star Smile / FlexiLigner (полный кейс)",
		category: "orthodontics",
		specialty: "orthodontist",
		basePriceRub: 240000,
		basePriceKopecks: 24000000,
		materialCostRub: 90000,
		labCostRub: 0,
		tierPrices: { vip: 300000, dms: 210000, promo: 219000 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K07.2", "K07.4"],
		estimatedDurationMin: 60,
		isActive: true,
		isArchived: false,
		tags: ["элайнеры", "каппы", "star smile", "flexiligner", "invisalign"],
	},
];
