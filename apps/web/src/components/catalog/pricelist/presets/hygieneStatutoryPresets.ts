/**
 * DENTE Dental CRM — Statutory Hygiene Presets
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";

export const HYGIENE_STATUTORY_PRESETS: readonly ServicePricelistItem[] = [
	{
		id: "srv-a16-07-051-001",
		code804n: "A16.07.051.001",
		statutoryTitle804n:
			"Профессиональная гигиена полости рта и зубов (комплекс)",
		commercialTitle:
			"Комплексная гигиена полости рта (УЗ-скейлинг + Air-Flow + полировка + фторирование)",
		category: "hygiene",
		specialty: "hygienist",
		basePriceRub: 6500,
		basePriceKopecks: 650000,
		materialCostRub: 1200,
		labCostRub: 0,
		tierPrices: { vip: 8500, dms: 5000, promo: 4900 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K03.6", "K05.0"],
		estimatedDurationMin: 60,
		isActive: true,
		isArchived: false,
		tags: ["гигиена", "чистка", "air flow", "ультразвук", "фторирование"],
	},
	{
		id: "srv-a16-07-051-002",
		code804n: "A16.07.051.001",
		statutoryTitle804n:
			"Ультразвуковое удаление наддесневых и поддесневых зубных отложений",
		commercialTitle:
			"Ультразвуковой скейлинг зубных отложений (снятие зубного камня в области челюстей)",
		category: "hygiene",
		specialty: "hygienist",
		basePriceRub: 3800,
		basePriceKopecks: 380000,
		materialCostRub: 500,
		labCostRub: 0,
		tierPrices: { vip: 4900, dms: 3100, promo: 3200 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K03.6", "K05.0"],
		estimatedDurationMin: 40,
		isActive: true,
		isArchived: false,
		tags: ["ультразвук", "скейлинг", "зубной камень", "чистка"],
	},
	{
		id: "srv-a16-07-050",
		code804n: "A16.07.050",
		statutoryTitle804n:
			"Профессиональное отбеливание зубов в условиях стоматологического кабинета",
		commercialTitle:
			"Клиническое отбеливание зубов холодным светом (Philips ZOOM 4 / Beyond Polus)",
		category: "hygiene",
		specialty: "hygienist",
		basePriceRub: 29000,
		basePriceKopecks: 2900000,
		materialCostRub: 9500,
		labCostRub: 0,
		tierPrices: { vip: 37000, dms: 25000, promo: 24900 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K03.7", "K03.8"],
		estimatedDurationMin: 90,
		isActive: true,
		isArchived: false,
		tags: ["отбеливание", "zoom 4", "beyond", "белоснежная улыбка"],
	},
];
