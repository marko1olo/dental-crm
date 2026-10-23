/**
 * DENTE Dental CRM — Therapy Caries & Restoration Presets
 */

import { STATUTORY_VAT_EXEMPTION_NOTE } from "./constants";
import type { ServicePricelistItem } from "./types";

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
