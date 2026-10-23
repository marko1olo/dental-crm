/**
 * DENTE Dental CRM — Clinic Gift & Occlusal Splint Presets
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
