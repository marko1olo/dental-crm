/**
 * DENTE Dental CRM — Statutory Minzdrav Order № 804n Service Catalog & Nomenclature Presets
 *
 * Baseline 804n Services: Orthopedics Part 1 - Crowns, Inlays, Impressions (srv-base-12 to srv-base-16)
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";

export const ORTHOPEDIC_BASELINE_SERVICES_PART1: readonly ServicePricelistItem[] = [
	{
		id: "srv-base-12",
		code804n: "A16.07.006.004",
		statutoryTitle804n: "Восстановление зуба коронкой из диоксида циркония",
		commercialTitle:
			"Коронка из цельного диоксида циркония (Prettau / Katana)",
		category: "orthopedics",
		specialty: "orthopedist",
		basePriceRub: 25000,
		basePriceKopecks: 2500000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K08.1", "K08.2"],
		estimatedDurationMin: 60,
		isActive: true,
		isArchived: false,
		tags: ["коронка", "цирконий", "диоксид циркония"],
	},
	{
		id: "srv-base-13",
		code804n: "A16.07.006.002",
		statutoryTitle804n: "Восстановление зуба коронкой металлокерамической",
		commercialTitle: "Коронка металлокерамическая (Duceram / Vita)",
		category: "orthopedics",
		specialty: "orthopedist",
		basePriceRub: 14500,
		basePriceKopecks: 1450000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K08.1"],
		estimatedDurationMin: 60,
		isActive: true,
		isArchived: false,
		tags: ["коронка", "металлокерамика"],
	},
	{
		id: "srv-base-14",
		code804n: "A16.07.003.001",
		statutoryTitle804n:
			"Восстановление зуба керамической вкладкой / виниром (E.max)",
		commercialTitle: "Керамическая вкладка / винир E.max Press",
		category: "orthopedics",
		specialty: "orthopedist",
		basePriceRub: 24000,
		basePriceKopecks: 2400000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K02.1", "K03.0"],
		estimatedDurationMin: 60,
		isActive: true,
		isArchived: false,
		tags: ["винир", "керамика", "e.max", "вкладка"],
	},
	{
		id: "srv-base-15",
		code804n: "A02.07.010.001",
		statutoryTitle804n:
			"Снятие оттиска с одной челюсти эластомерным материалом (А-силикон)",
		commercialTitle:
			"Снятие двухслойного прецизионного слепка А-силиконом (Elite HD+ / Honigum)",
		category: "orthopedics",
		specialty: "orthopedist",
		basePriceRub: 2500,
		basePriceKopecks: 250000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["Z01.2"],
		estimatedDurationMin: 20,
		isActive: true,
		isArchived: false,
		tags: ["слепок", "оттиск", "а-силикон"],
	},
	{
		id: "srv-base-16",
		code804n: "A16.07.053",
		statutoryTitle804n:
			"Фиксация на постоянный цемент несъемных ортопедических конструкций (1 единица)",
		commercialTitle:
			"Постоянная фиксация коронки на цемент двойного отверждения (Fuji Plus / RelyX)",
		category: "orthopedics",
		specialty: "orthopedist",
		basePriceRub: 1500,
		basePriceKopecks: 150000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["Z01.2"],
		estimatedDurationMin: 20,
		isActive: true,
		isArchived: false,
		tags: ["фиксация", "цемент", "коронка"],
	},
];
