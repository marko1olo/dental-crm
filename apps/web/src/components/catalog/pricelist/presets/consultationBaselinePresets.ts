/**
 * DENTE Dental CRM — Consultation Baseline Services
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";

export const CONSULTATION_BASELINE_SERVICES: readonly ServicePricelistItem[] = [
	{
		id: "srv-base-27",
		code804n: "B01.065.001",
		statutoryTitle804n: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
		commercialTitle: "Первичный прием врача-стоматолога с осмотром и составлением плана лечения",
		category: "consultation",
		specialty: "therapist",
		basePriceRub: 1000,
		basePriceKopecks: 100000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["Z01.2"],
		estimatedDurationMin: 30,
		isActive: true,
		isArchived: false,
		tags: ["консультация", "осмотр", "первичный прием"],
	},
];
