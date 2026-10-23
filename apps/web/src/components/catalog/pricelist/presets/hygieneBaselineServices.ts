/**
 * DENTE Dental CRM — Baseline Hygiene Services
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";

export const HYGIENE_BASELINE_SERVICES: readonly ServicePricelistItem[] = [
	{
		id: "srv-base-21",
		code804n: "A16.07.051.001",
		statutoryTitle804n:
			"Ультразвуковое удаление наддесневых и поддесневых зубных отложений (УЗ-скейлинг)",
		commercialTitle:
			"Ультразвуковое удаление зубных отложений и поддесневого камня",
		category: "hygiene",
		specialty: "hygienist",
		basePriceRub: 3500,
		basePriceKopecks: 350000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K03.6", "K05.1"],
		estimatedDurationMin: 30,
		isActive: true,
		isArchived: false,
		tags: ["гигиена", "уз-чистка", "скейлинг", "зубной камень"],
	},
	{
		id: "srv-base-22",
		code804n: "A16.07.051",
		statutoryTitle804n:
			"Снятие пигментированного зубного налета аппаратом Air-Flow",
		commercialTitle:
			"Снятие пигментированного налета и биопленки системой Air-Flow (порошок KaVo)",
		category: "hygiene",
		specialty: "hygienist",
		basePriceRub: 2500,
		basePriceKopecks: 250000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K03.6"],
		estimatedDurationMin: 30,
		isActive: true,
		isArchived: false,
		tags: ["air-flow", "чистка", "налет курильщика", "полировка"],
	},
	{
		id: "srv-base-23",
		code804n: "A11.07.024",
		statutoryTitle804n:
			"Глубокое фторирование эмали зубов (реминерализующая терапия)",
		commercialTitle: "Глубокое фторирование эмали и дентина (Tiefenfluorid)",
		category: "hygiene",
		specialty: "hygienist",
		basePriceRub: 1200,
		basePriceKopecks: 120000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K02.0", "K03.1"],
		estimatedDurationMin: 20,
		isActive: true,
		isArchived: false,
		tags: ["фторирование", "реминерализация", "эмаль"],
	},
];
