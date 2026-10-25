/**
 * sinusOpenGbrNorms.ts — Клиническая норма открытого (латерального) синус-лифтинга и НКР.
 */

import type { SurgicalOperationNorm } from "@dental/shared";
import { SINUS_LIFT_GBR_NORM_TEXT } from "./surgeryCanonicalTexts";

export const SINUS_OPEN_GBR_NORMS: readonly SurgicalOperationNorm[] = [
	{
		id: "surgery_sinus_lift_gbr",
		title: "Открытый синус-лифтинг & Костная пластика",
		shortBadge: "Синус-лифтинг / НКР",
		category: "sinus_gbr",
		icd10: "K08.2",
		icd10Label: "Атрофия беззубого альвеолярного края",
		code804n: "A16.07.041",
		service804nTitle: "Костная пластика челюстно-лицевой области (синус-лифтинг)",
		defaultToothFdi: 16,
		standardProtocolTextRu: SINUS_LIFT_GBR_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Сосудосуживающие капли в нос 5 дней. Не чихать с закрытым ртом, не летать на самолете 14 дней. Антибиотики по схеме.",
		order804nServices: [
			{
				code: "A16.07.041",
				nameRu: "Костная пластика челюстно-лицевой области (синус-лифтинг латеральный)",
				name: "Костная пластика челюстно-лицевой области (синус-лифтинг латеральный)",
				priceRub: 35000,
				quantity: 1,
				suggestedPriceRub: 35000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.041.001",
				nameRu: "Внесение остеопластического материала (ксенографт) и фиксация мембраны",
				name: "Внесение остеопластического материала (ксенографт) и фиксация мембраны",
				priceRub: 18000,
				quantity: 1,
				suggestedPriceRub: 18000,
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
			{ name: "Мембрана коллагеновая резорбируемая 25x25 мм", unit: "шт.", quantity: 1, isWarehouseCritical: true },
			{ name: "Пины титановые фиксирующие", unit: "шт.", quantity: 2, isWarehouseCritical: false },
		],
	},
];
