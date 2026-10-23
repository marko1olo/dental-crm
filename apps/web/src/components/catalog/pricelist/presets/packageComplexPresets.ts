/**
 * DENTE Dental CRM — Clinic Sutures & Complex Checkup Packages
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";

export const PACKAGE_COMPLEX_PRESETS: readonly ServicePricelistItem[] = [
	{
		id: "srv-clinic-sut-001",
		code804n: "CLINIC.SUT.001",
		statutoryTitle804n:
			"Снятие послеоперационных швов (лигатур) с антисептической обработкой раны",
		commercialTitle:
			"Снятие швов сторонней клиники с антисептической обработкой",
		category: "package",
		specialty: "surgeon",
		basePriceRub: 1500,
		basePriceKopecks: 150000,
		materialCostRub: 250,
		labCostRub: 0,
		tierPrices: { vip: 2000, dms: 1200, promo: 1200 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["Z48.0"],
		estimatedDurationMin: 20,
		isClinicPackage: true,
		isActive: true,
		isArchived: false,
		tags: [
			"снятие швов",
			"швы",
			"сторонняя клиника",
			"перевязка",
			"лигатуры",
			"антисептика",
		],
	},
	{
		id: "srv-pkg-smile-001",
		code804n: "PKG.SMILE.001",
		statutoryTitle804n:
			"Комплексная диагностика и профилактика заболеваний полости рта",
		commercialTitle:
			"Комплексный пакет «Здоровая улыбка» (Осмотр + КЛКТ + Профгигиена)",
		category: "package",
		specialty: "general",
		basePriceRub: 9900,
		basePriceKopecks: 990000,
		materialCostRub: 1600,
		labCostRub: 0,
		tierPrices: { vip: 13000, dms: 8500, promo: 8500 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["Z01.2", "K03.6"],
		estimatedDurationMin: 75,
		isClinicPackage: true,
		isActive: true,
		isArchived: false,
		tags: [
			"пакет",
			"комплекс",
			"здоровая улыбка",
			"чекап",
			"акция",
			"гигиена",
			"чистка",
			"снимок",
		],
	},
];
