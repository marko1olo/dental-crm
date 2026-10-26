/**
 * implantNorms.ts — Каноническая норма дентальной имплантации (Мандаты 8e, 8i).
 */

import type { SurgicalOperationNorm } from "@dental/shared";
import { DENTAL_IMPLANTATION_NORM_TEXT } from "./surgeryCanonicalTexts";

export const IMPLANT_NORMS: readonly SurgicalOperationNorm[] = [
	{
		id: "surgery_implant_standard",
		title: "Дентальная имплантация (Физиологическая норма)",
		shortBadge: "Имплантация 35 Н·см",
		category: "implant",
		icd10: "K08.1",
		icd10Label: "Потеря зубов вследствие несчастного случая, удаления или локализованного пародонтита",
		serviceCode: "A16.07.054",
		serviceTitle: "Внутрикостная дентальная имплантация",
		code804n: "A16.07.054",
		service804nTitle: "Внутрикостная дентальная имплантация",
		defaultToothFdi: 46,
		standardProtocolTextRu: DENTAL_IMPLANTATION_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Артикаин 1:100 000 1.7 мл",
		postOpRecommendationsRu:
			"Холод на область операции 15 мин каждые 2 часа в первый день. Ванночки с 0.05% хлоргексидином с 2-х суток. Исключить горячее, бани, физ. нагрузки 7 дней. Прием НПВП и антибиотикотерапия по назначению. Осмотр через 7 дней.",
		order804nServices: [
			{
				code: "A16.07.054",
				nameRu: "Внутрикостная дентальная имплантация (установка имплантата)",
				name: "Внутрикостная дентальная имплантация (установка имплантата)",
				priceRub: 35000,
				quantity: 1,
				suggestedPriceRub: 35000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.054.002",
				nameRu: "Установка формирователя десны (ФДМ) / винта-заглушки",
				name: "Установка формирователя десны (ФДМ) / винта-заглушки",
				priceRub: 3500,
				quantity: 1,
				suggestedPriceRub: 3500,
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
			{ name: "Дентальный имплантат титановый", unit: "шт.", quantity: 1, isWarehouseCritical: true },
			{ name: "Формирователь десны / винт-заглушка", unit: "шт.", quantity: 1, isWarehouseCritical: true },
			{ name: "Шовный материал рассасывающийся ПГА 4-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
		],
	},
];
