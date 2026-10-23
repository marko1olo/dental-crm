/**
 * DENTE Dental CRM — Statutory Minzdrav Order № 804n Service Catalog & Nomenclature Presets
 *
 * Layer 1: Orthopedics & Prosthetics (Part 2 - Implants, Temporary, Inlays)
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";

export const ORTHOPEDIC_STATUTORY_PRESETS_PART2: readonly ServicePricelistItem[] = [
	{
		id: "srv-a16-07-006-004-zirconia",
		code804n: "A16.07.006.004",
		statutoryTitle804n:
			"Восстановление зуба коронкой из диоксида циркония с винтовой фиксацией на имплантате",
		commercialTitle:
			"Анатомическая коронка из диоксида циркония (Zirconia Prettau/Katana) на имплантате с винтовой фиксацией",
		category: "orthopedics",
		specialty: "orthopedist",
		basePriceRub: 26000,
		basePriceKopecks: 2600000,
		materialCostRub: 2800,
		labCostRub: 8500,
		tierPrices: { vip: 33000, dms: 22000, promo: 23500 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K08.1"],
		estimatedDurationMin: 60,
		isActive: true,
		isArchived: false,
		tags: [
			"коронка на импланте",
			"винтовая фиксация",
			"цирконий",
			"zirconia",
			"dentalia",
			"prettau",
		],
	},
	{
		id: "srv-a16-07-006-004",
		code804n: "A16.07.006.004",
		statutoryTitle804n: "Протезирование временной коронкой",
		commercialTitle: "Временная коронка длительного ношения PMMA Cad/Cam",
		category: "orthopedics",
		specialty: "orthopedist",
		basePriceRub: 4500,
		basePriceKopecks: 450000,
		materialCostRub: 500,
		labCostRub: 1500,
		tierPrices: { vip: 5800, dms: 3600, promo: 3800 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K08.1"],
		estimatedDurationMin: 30,
		isActive: true,
		isArchived: false,
		tags: ["временная коронка", "pmma", "пластмасса"],
	},
	{
		id: "srv-a16-07-003-001",
		code804n: "A16.07.003.001",
		statutoryTitle804n: "Восстановление зуба культевой штифтовой вкладкой",
		commercialTitle:
			"Культевая штифтовая вкладка цельнолитая CoCr / диоксид циркония",
		category: "orthopedics",
		specialty: "orthopedist",
		basePriceRub: 7500,
		basePriceKopecks: 750000,
		materialCostRub: 800,
		labCostRub: 2500,
		tierPrices: { vip: 9800, dms: 6000, promo: 6500 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K02.2"],
		estimatedDurationMin: 45,
		isActive: true,
		isArchived: false,
		tags: ["культевая вкладка", "вкладка", "кшв", "штифт"],
	},
];
