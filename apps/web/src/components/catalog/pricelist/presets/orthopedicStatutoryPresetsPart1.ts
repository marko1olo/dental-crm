/**
 * DENTE Dental CRM — Statutory Minzdrav Order № 804n Service Catalog & Nomenclature Presets
 *
 * Layer 1: Orthopedics & Prosthetics (Part 1 - Metal-ceramic, Zirconia, E.max, Ti-Base)
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";

export const ORTHOPEDIC_STATUTORY_PRESETS_PART1: readonly ServicePricelistItem[] = [
	{
		id: "srv-a16-07-006-001",
		code804n: "A16.07.006.001",
		statutoryTitle804n:
			"Протезирование зуба коронкой постоянной металлокерамической",
		commercialTitle: "Металлокерамическая коронка на каркасе из CoCr сплава",
		category: "orthopedics",
		specialty: "orthopedist",
		basePriceRub: 14500,
		basePriceKopecks: 1450000,
		materialCostRub: 1200,
		labCostRub: 4500,
		tierPrices: { vip: 18500, dms: 11500, promo: 12000 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K08.1", "K02.2"],
		estimatedDurationMin: 60,
		isActive: true,
		isArchived: false,
		tags: ["металлокерамика", "коронка", "протезирование"],
	},
	{
		id: "srv-a16-07-006-002",
		code804n: "A16.07.006.002",
		statutoryTitle804n: "Протезирование зуба коронкой из диоксида циркония",
		commercialTitle:
			"Коронка из диоксида циркония цельнофрезерованная MultiLayer (Katana/Prettau)",
		category: "orthopedics",
		specialty: "orthopedist",
		basePriceRub: 24000,
		basePriceKopecks: 2400000,
		materialCostRub: 1800,
		labCostRub: 7500,
		tierPrices: { vip: 31000, dms: 19500, promo: 21000 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K08.1", "K02.2"],
		estimatedDurationMin: 60,
		isActive: true,
		isArchived: false,
		tags: ["цирконий", "zirconia", "коронка", "katana", "prettau"],
	},
	{
		id: "srv-a16-07-006-003",
		code804n: "A16.07.006.003",
		statutoryTitle804n: "Протезирование цельнокерамической коронкой / виниром",
		commercialTitle:
			"Керамический винир / коронка из прессованной керамики E.max (IPS e.max Press)",
		category: "orthopedics",
		specialty: "orthopedist",
		basePriceRub: 28000,
		basePriceKopecks: 2800000,
		materialCostRub: 2200,
		labCostRub: 9000,
		tierPrices: { vip: 36000, dms: 23000, promo: 24900 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K03.8", "K08.1"],
		estimatedDurationMin: 75,
		isActive: true,
		isArchived: false,
		tags: ["винир", "emax", "керамика", "эстетика", "e.max"],
	},
	{
		id: "srv-a16-07-006-005",
		code804n: "A16.07.006.005",
		statutoryTitle804n:
			"Протезирование коронкой на имплантате с винтовой фиксацией",
		commercialTitle:
			"Коронка из диоксида циркония на имплантате с винтовой фиксацией на Ti-base",
		category: "orthopedics",
		specialty: "orthopedist",
		basePriceRub: 34000,
		basePriceKopecks: 3400000,
		materialCostRub: 3500,
		labCostRub: 11000,
		tierPrices: { vip: 44000, dms: 28000, promo: 29900 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K08.1"],
		estimatedDurationMin: 60,
		isActive: true,
		isArchived: false,
		tags: [
			"коронка на импланте",
			"винтовая фиксация",
			"титановое основание",
			"tibase",
		],
	},
];
