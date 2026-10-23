/**
 * DENTE Dental CRM — Therapy Baseline Services Part 2 (Endodontic Canals)
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";

export const THERAPY_BASELINE_PART2: readonly ServicePricelistItem[] = [
	{
		id: "srv-base-07",
		code804n: "A16.07.030.001",
		statutoryTitle804n:
			"Инструментальная и медикаментозная обработка 1 корневого канала",
		commercialTitle:
			"Эндодонтическая обработка 1 корневого канала (машинные Ni-Ti файлы)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 2100,
		basePriceKopecks: 210000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K04.0", "K04.1"],
		estimatedDurationMin: 30,
		isActive: true,
		isArchived: false,
		tags: ["эндодонтия", "канал", "обработка канала"],
	},
	{
		id: "srv-base-08",
		code804n: "A16.07.030.002",
		statutoryTitle804n:
			"Инструментальная и медикаментозная обработка 2 корневых каналов",
		commercialTitle: "Эндодонтическая обработка 2 корневых каналов",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 3800,
		basePriceKopecks: 380000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K04.0", "K04.1"],
		estimatedDurationMin: 45,
		isActive: true,
		isArchived: false,
		tags: ["эндодонтия", "2 канала"],
	},
	{
		id: "srv-base-09",
		code804n: "A16.07.030.003",
		statutoryTitle804n:
			"Инструментальная и медикаментозная обработка 3 корневых каналов",
		commercialTitle: "Эндодонтическая обработка 3 корневых каналов",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 5200,
		basePriceKopecks: 520000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K04.0", "K04.1"],
		estimatedDurationMin: 60,
		isActive: true,
		isArchived: false,
		tags: ["эндодонтия", "3 канала"],
	},
	{
		id: "srv-base-10",
		code804n: "A16.07.030.004",
		statutoryTitle804n:
			"Инструментальная и медикаментозная обработка 4 корневых каналов",
		commercialTitle: "Эндодонтическая обработка 4 корневых каналов",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 6500,
		basePriceKopecks: 650000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K04.0", "K04.1"],
		estimatedDurationMin: 60,
		isActive: true,
		isArchived: false,
		tags: ["эндодонтия", "4 канала"],
	},
	{
		id: "srv-base-11",
		code804n: "A16.07.008.002",
		statutoryTitle804n:
			"Пломбирование корневого канала зуба гуттаперчевыми штифтами (1 канал)",
		commercialTitle:
			"Пломбирование корневого канала гуттаперчей и силером (1 канал)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 2400,
		basePriceKopecks: 240000,
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K04.0", "K04.1"],
		estimatedDurationMin: 30,
		isActive: true,
		isArchived: false,
		tags: ["гуттаперча", "пломбирование канала"],
	},
];
