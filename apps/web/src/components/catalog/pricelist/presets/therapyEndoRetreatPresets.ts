/**
 * DENTE Dental CRM — Endodontic Retreatment & Specialty Therapy Presets
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";

export const THERAPY_ENDO_RETREAT_PRESETS: readonly ServicePricelistItem[] = [
	{
		id: "srv-a16-07-082",
		code804n: "A16.07.082",
		statutoryTitle804n:
			"Распломбирование корневого канала ранее леченного пастой/гуттаперчей",
		commercialTitle:
			"Ревизия и распломбирование корневого канала (перелечивание зуба)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 2800,
		basePriceKopecks: 280000,
		materialCostRub: 600,
		labCostRub: 0,
		tierPrices: { vip: 3600, dms: 2200, promo: 2300 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K04.5", "K04.4"],
		estimatedDurationMin: 45,
		isActive: true,
		isArchived: false,
		tags: [
			"перелечивание",
			"распломбирование",
			"ревизия",
			"лечение нерва",
			"нерв",
		],
	},
	{
		id: "srv-a16-07-091",
		code804n: "A16.07.091",
		statutoryTitle804n:
			"Временное пломбирование лекарственным препаратом корневого канала",
		commercialTitle:
			"Временное пломбирование корневого канала гидроксидом кальция Ca(OH)2 при периодонтите",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 2000,
		basePriceKopecks: 200000,
		materialCostRub: 450,
		labCostRub: 0,
		tierPrices: { vip: 2600, dms: 1600, promo: 1700 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K04.4", "K04.5"],
		estimatedDurationMin: 30,
		isActive: true,
		isArchived: false,
		tags: [
			"кальций",
			"caoh2",
			"периодонтит",
			"лекарство",
			"лечение нерва",
			"нерв",
		],
	},
	{
		id: "srv-a16-07-002-005",
		code804n: "A16.07.002.005",
		statutoryTitle804n: "Наложение коффердама (раббердама)",
		commercialTitle:
			"Изоляция операционного поля системой Коффердам / ОптраГейт",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 900,
		basePriceKopecks: 90000,
		materialCostRub: 250,
		labCostRub: 0,
		tierPrices: { vip: 1200, dms: 700, promo: 700 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K02.0", "K04.0"],
		estimatedDurationMin: 10,
		isActive: true,
		isArchived: false,
		tags: ["коффердам", "раббердам", "изоляция", "оптрагейт"],
	},
	{
		id: "srv-a16-07-002-005-erosion",
		code804n: "A16.07.002.005",
		statutoryTitle804n:
			"Наложение пломбы при клиновидных дефектах и эрозии эмали",
		commercialTitle:
			"Пломбирование пришеечного клиновидного дефекта / эрозии эмали (V класс по Блэку)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 4200,
		basePriceKopecks: 420000,
		materialCostRub: 800,
		labCostRub: 0,
		tierPrices: { vip: 5500, dms: 3500, promo: 3600 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K03.1", "K03.2", "K02.1"],
		estimatedDurationMin: 40,
		isActive: true,
		isArchived: false,
		tags: [
			"клиновидный дефект",
			"эрозия",
			"пришеечный кариес",
			"v класс",
			"пломба",
		],
	},
];
