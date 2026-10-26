/**
 * extractionAtypicalNorms.ts — Клиническая норма сложного/атипичного удаления ретинированного зуба.
 */

import type { SurgicalOperationNorm } from "@dental/shared";
import { ATYPICAL_EXTRACTION_NORM_TEXT } from "./surgeryCanonicalTexts";

export const EXTRACTION_ATYPICAL_NORMS: readonly SurgicalOperationNorm[] = [
	{
		id: "surgery_extraction_atypical",
		title: "Сложное удаление ретинированного зуба мудрости",
		shortBadge: "Удаление 8-ки (сложное)",
		category: "extraction",
		icd10: "K01.1",
		icd10Label: "Ретинированные зубы",
		serviceCode: "A16.07.001.002",
		serviceSubcode: "A16.07.024",
		serviceTitle: "Операция удаления ретинированного, дистопированного или сверхкомплектного зуба",
		code804n: "A16.07.001.002",
		code804nSubcode: "A16.07.024",
		service804nTitle: "Операция удаления ретинированного, дистопированного или сверхкомплектного зуба",
		defaultToothFdi: 48,
		standardProtocolTextRu: ATYPICAL_EXTRACTION_NORM_TEXT,
		anesthesiaDefaultRu: "Проводниковая торусальная и инфильтрационная анестезия Sol. Articaini 4% — 3.4 мл",
		postOpRecommendationsRu:
			"Холод на щеку локально. Щадящая диета. Антибиотикотерапия (Амоксиклав 625 мг 2 р/сут 5 дней). Швы снять через 7-10 суток.",
		order804nServices: [
			{
				code: "A16.07.001.002",
				nameRu: "Операция удаления ретинированного, дистопированного зуба (сложное)",
				name: "Операция удаления ретинированного, дистопированного зуба (сложное)",
				priceRub: 9500,
				quantity: 1,
				suggestedPriceRub: 9500,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.026",
				nameRu: "Кюретаж лунки удаленного зуба с антисептической обработкой",
				name: "Кюретаж лунки удаленного зуба с антисептической обработкой",
				priceRub: 1200,
				quantity: 1,
				suggestedPriceRub: 1200,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение шва на слизистую оболочку рта (ПГА/Викрил 4-0)",
				name: "Наложение шва на слизистую оболочку рта (ПГА/Викрил 4-0)",
				priceRub: 1500,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Проводниковая (торусальная) анестезия (Артикаин)",
				name: "Проводниковая (торусальная) анестезия (Артикаин)",
				priceRub: 1200,
				quantity: 1,
				suggestedPriceRub: 1200,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Шовный материал ПГА 4-0 с атравматической иглой", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Бор твердосплавный хирургический Lindemann", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Губка гемостатическая коллагеновая", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 2, isWarehouseCritical: false },
		],
	},
];
