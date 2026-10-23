/**
 * DENTE Dental CRM — Statutory Minzdrav Order № 804n Service Catalog & Nomenclature Presets
 *
 * Baseline 804n Services: Surgery Part 1 - Extractions & Sutures (srv-base-17 to srv-base-20)
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";

export const SURGERY_BASELINE_SERVICES_PART1: readonly ServicePricelistItem[] = [
	{
		id: "srv-base-17",
		code804n: "A16.07.001.001",
		statutoryTitle804n: "Удаление постоянного зуба простое",
		commercialTitle: "Простое удаление однокорневого зуба с гемостазом",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 3200,
		basePriceKopecks: 320000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K04.7", "K08.1"],
		estimatedDurationMin: 30,
		isActive: true,
		isArchived: false,
		tags: ["удаление", "хирургия", "зуб"],
	},
	{
		id: "srv-base-18",
		code804n: "A16.07.001.002",
		statutoryTitle804n: "Удаление зуба сложное с разъединением корней",
		commercialTitle:
			"Сложное атравматичное удаление многокорневого зуба с фрагментацией корней",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 5500,
		basePriceKopecks: 550000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K04.7", "K08.1"],
		estimatedDurationMin: 45,
		isActive: true,
		isArchived: false,
		tags: ["удаление сложное", "фрагментация", "хирургия"],
	},
	{
		id: "srv-base-19",
		code804n: "A16.07.001.003",
		statutoryTitle804n:
			"Операция удаления ретинированного, дистопированного зуба (8-й зуб)",
		commercialTitle:
			"Атипичное удаление ретинированного / дистопированного зуба мудрости",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 8500,
		basePriceKopecks: 850000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K01.1"],
		estimatedDurationMin: 60,
		isActive: true,
		isArchived: false,
		tags: ["зуб мудрости", "ретинированный", "восьмерка", "хирургия"],
	},
	{
		id: "srv-base-20",
		code804n: "A16.07.097",
		statutoryTitle804n:
			"Наложение шва на слизистую оболочку рта при хирургических операциях",
		commercialTitle: "Наложение хирургического шва (Викрил / Монофиламент)",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 900,
		basePriceKopecks: 90000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K08.1"],
		estimatedDurationMin: 15,
		isActive: true,
		isArchived: false,
		tags: ["шов", "ушивание", "слизистая"],
	},
];
