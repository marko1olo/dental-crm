/**
 * DENTE Dental CRM — Therapy & Endodontics Statutory Presets (SSOT)
 *
 * Implements Mandates 8b/8zi (Sweet Spot ~270 lines), 8e, 8n.
 * Consolidated statutory therapy & endodontics presets.
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";

export {
	HYGIENE_STATUTORY_PRESETS,
	HYGIENE_BASELINE_SERVICES,
} from "./hygienePresets";

export {
	THERAPY_BASELINE_PART1,
	THERAPY_BASELINE_PART2,
	THERAPY_BASELINE_SERVICES,
} from "./therapyBaselinePresets";

export const THERAPY_CARIES_PRESETS: readonly ServicePricelistItem[] = [
	{
		id: "srv-a16-07-002-001",
		code804n: "A16.07.002.001",
		statutoryTitle804n:
			"Восстановление зуба пломбой I, V, VI класс по Блэку с использованием материалов из фотополимеров",
		commercialTitle:
			"Лечение поверхностного/среднего кариеса с фотополимерной пломбой (Estelite/Filtek)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 5500,
		basePriceKopecks: 550000,
		materialCostRub: 950,
		labCostRub: 0,
		tierPrices: { vip: 7200, dms: 4500, promo: 4500 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K02.0", "K02.1"],
		estimatedDurationMin: 45,
		isActive: true,
		isArchived: false,
		tags: ["кариес", "пломба", "композит", "estelite", "filtek"],
	},
	{
		id: "srv-a16-07-002-002",
		code804n: "A16.07.002.002",
		statutoryTitle804n:
			"Восстановление зуба пломбой II, III класс по Блэку с использованием материалов из фотополимеров",
		commercialTitle:
			"Лечение глубокого кариеса с лечебной прокладкой и контактным пунктом",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 6800,
		basePriceKopecks: 680000,
		materialCostRub: 1300,
		labCostRub: 0,
		tierPrices: { vip: 8800, dms: 5500, promo: 5800 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K02.1", "K02.2"],
		estimatedDurationMin: 60,
		isActive: true,
		isArchived: false,
		tags: ["глубокий кариес", "пломба", "контактный пункт", "прокладка"],
	},
	{
		id: "srv-a16-07-002-003",
		code804n: "A16.07.002.003",
		statutoryTitle804n:
			"Восстановление зуба пломбой IV класс по Блэку с использованием материалов из фотополимеров",
		commercialTitle:
			"Художественная эстетическая реставрация фронтального зуба (прямой композитный винир)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 9500,
		basePriceKopecks: 950000,
		materialCostRub: 1800,
		labCostRub: 0,
		tierPrices: { vip: 12500, dms: 7800, promo: 8000 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K03.8", "K02.1"],
		estimatedDurationMin: 90,
		isActive: true,
		isArchived: false,
		tags: ["реставрация", "прямой винир", "эстетика", "фронт"],
	},
	{
		id: "srv-a16-07-003",
		code804n: "A16.07.003",
		statutoryTitle804n:
			"Восстановление зуба пломбировочными материалами с использованием штифта",
		commercialTitle:
			"Восстановление культи зуба с фиксацией стекловолоконного штифта (Build-Up)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 4500,
		basePriceKopecks: 450000,
		materialCostRub: 1100,
		labCostRub: 0,
		tierPrices: { vip: 5800, dms: 3800, promo: 3900 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K02.2", "K04.0"],
		estimatedDurationMin: 45,
		isActive: true,
		isArchived: false,
		tags: ["штифт", "билдап", "стекловолокно", "культя"],
	},
];

export const THERAPY_ENDO_PREP_PRESETS: readonly ServicePricelistItem[] = [
	{
		id: "srv-a16-07-030-001",
		code804n: "A16.07.030.001",
		statutoryTitle804n:
			"Инструментальная и медикаментозная обработка корневого канала (1-канальный зуб)",
		commercialTitle:
			"Механическая и медикаментозная обработка корневого канала машинным NiTi-инструментом (1 канал)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 3500,
		basePriceKopecks: 350000,
		materialCostRub: 800,
		labCostRub: 0,
		tierPrices: { vip: 4500, dms: 2900, promo: 3000 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K04.0", "K04.1"],
		estimatedDurationMin: 40,
		isAnatomicalCanalScalable: true,
		isActive: true,
		isArchived: false,
		tags: [
			"эндодонтия",
			"обработка канала",
			"пульпит",
			"периодонтит",
			"нерв",
			"удаление нерва",
			"депульпирование",
		],
	},
	{
		id: "srv-a16-07-008-001",
		code804n: "A16.07.008.001",
		statutoryTitle804n:
			"Пломбирование корневого канала зуба пастой/гуттаперчей (1 канал)",
		commercialTitle:
			"Обтурация корневого канала горячей гуттаперчей / биокерамическим силером (1 канал)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 4000,
		basePriceKopecks: 400000,
		materialCostRub: 900,
		labCostRub: 0,
		tierPrices: { vip: 5200, dms: 3300, promo: 3500 },
		vatRate: 0,
		vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
		icd10Indications: ["K04.0", "K04.1"],
		estimatedDurationMin: 35,
		isAnatomicalCanalScalable: true,
		isActive: true,
		isArchived: false,
		tags: [
			"обтурация",
			"гуттаперча",
			"силер",
			"пломбирование канала",
			"лечение нерва",
			"нерв",
		],
	},
];

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
		icd10Indications: ["K03.1"],
		estimatedDurationMin: 35,
		isActive: true,
		isArchived: false,
		tags: ["клиновидный дефект", "эрозия эмали", "пришеечный кариес"],
	},
];

export const THERAPY_ENDO_PRESETS: readonly ServicePricelistItem[] = [
	...THERAPY_ENDO_PREP_PRESETS,
	...THERAPY_ENDO_RETREAT_PRESETS,
];

export const THERAPY_STATUTORY_PRESETS: readonly ServicePricelistItem[] = [
	...THERAPY_CARIES_PRESETS,
	...THERAPY_ENDO_PRESETS,
];
