/**
 * DENTE Dental CRM — Statutory Minzdrav Order № 804n Service Catalog & Nomenclature Presets
 *
 * Baseline 804n Services: Surgery Part 2 - Implants & Healing Abutments (srv-base-24 to srv-base-25)
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";

export const SURGERY_BASELINE_SERVICES_PART2: readonly ServicePricelistItem[] = [
	{
		id: "srv-base-24",
		code804n: "A16.07.054",
		statutoryTitle804n:
			"Внутрикостная дентальная имплантация (установка дентального имплантата)",
		commercialTitle: "Установка дентального имплантата премиум-класса",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 35000,
		basePriceKopecks: 3500000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K08.1"],
		estimatedDurationMin: 60,
		isActive: true,
		isArchived: false,
		tags: ["имплантация", "имплант", "хирургия"],
	},
	{
		id: "srv-base-25",
		code804n: "A16.07.055",
		statutoryTitle804n:
			"Установка формирователя десны на дентальный имплантат",
		commercialTitle:
			"Установка формирователя десны (гингивопластика в области имплантата)",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 4500,
		basePriceKopecks: 450000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K08.1"],
		estimatedDurationMin: 30,
		isActive: true,
		isArchived: false,
		tags: ["формирователь", "десна", "имплант"],
	},
];
