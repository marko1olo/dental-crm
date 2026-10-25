/**
 * sinusClosedNorms.ts — Клиническая норма закрытого (трансальвеолярного) синус-лифтинга.
 */

import type { SurgicalOperationNorm } from "@dental/shared";
import { CLOSED_SINUS_LIFT_NORM_TEXT } from "./surgeryCanonicalTexts";

export const SINUS_CLOSED_NORMS: readonly SurgicalOperationNorm[] = [
	{
		id: "surgery_sinus_lift_closed",
		title: "Закрытый (трансальвеолярный) синус-лифтинг остеотомами",
		shortBadge: "Закрытый синус",
		category: "sinus_gbr",
		icd10: "K08.2",
		icd10Label: "Атрофия беззубого альвеолярного края",
		code804n: "A16.07.041.001",
		code804nSubcode: "A16.07.041",
		service804nTitle: "Костная пластика челюстно-лицевой области (синус-лифтинг трансальвеолярный)",
		defaultToothFdi: 16,
		standardProtocolTextRu: CLOSED_SINUS_LIFT_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Сосудосуживающие капли в нос 5 дней. Не чихать с закрытым ртом, не летать самолетом 10 дней. Прием НПВП и антибиотикотерапия по назначению. Осмотр через 7 дней.",
		order804nServices: [
			{
				code: "A16.07.041.001",
				nameRu: "Костная пластика челюстно-лицевой области (трансальвеолярный синус-лифтинг)",
				name: "Костная пластика челюстно-лицевой области (трансальвеолярный синус-лифтинг)",
				priceRub: 18000,
				quantity: 1,
				suggestedPriceRub: 18000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.041.001",
				nameRu: "Внесение остеопластического материала (ксенографт 0.5 г)",
				name: "Внесение остеопластического материала (ксенографт 0.5 г)",
				priceRub: 9000,
				quantity: 1,
				suggestedPriceRub: 9000,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение шва на слизистую оболочку рта (ПГА 4-0)",
				name: "Наложение шва на слизистую оболочку рта (ПГА 4-0)",
				priceRub: 1500,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Остеопластический материал ксенографт 0.5 г", unit: "шт.", quantity: 1, isWarehouseCritical: true },
			{ name: "Шовный материал ПГА 4-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% (Артикаин 1:100 000 1.7 мл)", unit: "карп.", quantity: 1, isWarehouseCritical: false },
		],
	},
];
