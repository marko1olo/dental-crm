/**
 * DENTE Dental CRM — Statutory Minzdrav Order № 804n Service Catalog & Nomenclature Presets
 *
 * Baseline 804n Services: Orthopedics Part 2 - Custom Zirconia Abutment (srv-base-26)
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";
import { ORTHOPEDIC_BASELINE_SERVICES_PART1 } from "./orthopedicBaselinePart1";

export const ORTHOPEDIC_BASELINE_SERVICES_PART2: readonly ServicePricelistItem[] = [
	{
		id: "srv-base-26",
		code804n: "A16.07.006.007",
		statutoryTitle804n:
			"Протезирование с использованием индивидуального циркониевого абатмента",
		commercialTitle:
			"Индивидуальный абатмент из диоксида циркония на титановом основании",
		category: "orthopedics",
		specialty: "orthopedist",
		basePriceRub: 12000,
		basePriceKopecks: 1200000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K08.1"],
		estimatedDurationMin: 45,
		isActive: true,
		isArchived: false,
		tags: ["абатмент", "цирконий", "титан", "протезирование"],
	},
];

export const ORTHOPEDIC_BASELINE_SERVICES: readonly ServicePricelistItem[] = [
	...ORTHOPEDIC_BASELINE_SERVICES_PART1,
	...ORTHOPEDIC_BASELINE_SERVICES_PART2,
];
