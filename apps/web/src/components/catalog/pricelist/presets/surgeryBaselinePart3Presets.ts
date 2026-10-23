/**
 * DENTE Dental CRM — Statutory Minzdrav Order № 804n Service Catalog & Nomenclature Presets
 *
 * Baseline 804n Services: Surgery Part 3 - Suture Removal (srv-base-30)
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";
import { SURGERY_BASELINE_SERVICES_PART1 } from "./surgeryBaselinePart1Presets";
import { SURGERY_BASELINE_SERVICES_PART2 } from "./surgeryBaselinePart2Presets";

export const SURGERY_BASELINE_SERVICES_PART3: readonly ServicePricelistItem[] = [
	{
		id: "srv-base-30",
		code804n: "A16.01.008",
		statutoryTitle804n: "Снятие послеоперационных швов (лигатур)",
		commercialTitle:
			"Снятие послеоперационных швов с антисептической обработкой",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 500,
		basePriceKopecks: 50000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["Z01.2"],
		estimatedDurationMin: 15,
		isActive: true,
		isArchived: false,
		tags: ["снятие швов", "швы", "лигатуры"],
	},
];

export const SURGERY_BASELINE_SERVICES: readonly ServicePricelistItem[] = [
	...SURGERY_BASELINE_SERVICES_PART1,
	...SURGERY_BASELINE_SERVICES_PART2,
	...SURGERY_BASELINE_SERVICES_PART3,
];
