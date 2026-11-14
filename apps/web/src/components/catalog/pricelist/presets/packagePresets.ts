/**
 * DENTE Dental CRM — Clinic Packages & Gift Presets (SSOT)
 *
 * Implements Mandates 8b/8zi (Sweet Spot ~140 lines, ban on micro-shredder), 8e, 8n.
 * Consolidated clinical package & gift certificate presets.
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";

export const PACKAGE_GIFT_KAPA_PRESETS: readonly ServicePricelistItem[] = [
	{
		id: "srv-clinic-gift-010",
		code804n: "CLINIC.GIFT.010",
		statutoryTitle804n:
			"Депозитный авансовый платеж / сертификат на медицинские услуги",
		commercialTitle: "Подарочный сертификат клиники (депозит 10 000 ₽)",
		category: "package",
		specialty: "general",
		basePriceRub: 10000,
		basePriceKopecks: 1000000,
		materialCostRub: 200,
		labCostRub: 0,
		tierPrices: { vip: 10000, dms: 10000, promo: 9000 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["Z01.2"],
		estimatedDurationMin: 15,
		isClinicPackage: true,
		isActive: true,
		isArchived: false,
		tags: [
			"сертификат",
			"подарочный сертификат",
			"депозит",
			"аванс",
			"подарок",
			"пакет",
		],
	},
	{
		id: "srv-clinic-kapa-001",
		code804n: "CLINIC.KAPA.001",
		statutoryTitle804n:
			"Изготовление индивидуального защитного/окклюзионного разобщающего аппарата (капы)",
		commercialTitle:
			"Индивидуальная капа (ночная при бруксизме / спортивная защитная)",
		category: "package",
		specialty: "orthopedist",
		basePriceRub: 9500,
		basePriceKopecks: 950000,
		materialCostRub: 1500,
		labCostRub: 3500,
		tierPrices: { vip: 12500, dms: 8000, promo: 8500 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["F45.8", "K07.6"],
		estimatedDurationMin: 45,
		isClinicPackage: true,
		isActive: true,
		isArchived: false,
		tags: [
			"индивидуальная капа",
			"капа",
			"бруксизм",
			"сплинт",
			"каппа",
			"защитная капа",
			"спорт",
		],
	},
];

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

export const PACKAGE_STATUTORY_PRESETS: readonly ServicePricelistItem[] = [
	...PACKAGE_GIFT_KAPA_PRESETS,
	...PACKAGE_COMPLEX_PRESETS,
];
