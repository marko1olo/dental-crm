/**
 * perioPericoronitisAndApicoNorms.ts — Клинические нормы перикоронита и резекции верхушки корня.
 */

import type { SurgicalOperationNorm } from "@dental/shared";
import { PERICORONITIS_NORM_TEXT, APICOECTOMY_NORM_TEXT } from "./surgeryCanonicalTexts";

export const PERIO_PERICORONITIS_AND_APICO_NORMS: readonly SurgicalOperationNorm[] = [
	{
		id: "surgery_pericoronitis",
		title: "Иссечение капюшона (Перикоронит)",
		shortBadge: "Перикоронит",
		category: "perio_surgery",
		icd10: "K05.2",
		icd10Label: "Острый пародонтит / Перикоронит",
		serviceCode: "A16.07.058",
		serviceTitle: "Иссечение десневого капюшона (перикоронаротомия)",
		code804n: "A16.07.058",
		service804nTitle: "Иссечение десневого капюшона (перикоронаротомия)",
		defaultToothFdi: 48,
		standardProtocolTextRu: PERICORONITIS_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Ротовые ванночки с ромашкой и хлоргексидином 0.05% 3-4 раза в день. Метрогил Дента локально.",
		order804nServices: [
			{
				code: "A16.07.058",
				nameRu: "Иссечение десневого капюшона (перикоронаротомия)",
				name: "Иссечение десневого капюшона (перикоронаротомия)",
				priceRub: 2500,
				quantity: 1,
				suggestedPriceRub: 2500,
				stageKind: "stage_2_surgery",
				isPrimary: true,
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
			{ name: "Лента йодоформная турунда", unit: "см", quantity: 5, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_apicoectomy",
		title: "Резекция верхушки корня (апикоэктомия с ретроградным пломбированием)",
		shortBadge: "Резекция корня",
		category: "perio_surgery",
		icd10: "K04.5",
		icd10Label: "Хронический апикальный периодонтит / Апикальная гранулема",
		serviceCode: "A16.07.007",
		serviceTitle: "Резекция верхушки корня",
		code804n: "A16.07.007",
		service804nTitle: "Резекция верхушки корня",
		defaultToothFdi: 21,
		standardProtocolTextRu: APICOECTOMY_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Холод локально 15 мин 3-4 раза в первые сутки. Щадящая диета 3-5 дней. Ротовые ванночки 0.05% хлоргексидином со 2-х суток. Осмотр через 3 дня, снятие швов через 7-10 дней.",
		order804nServices: [
			{
				code: "A16.07.007",
				nameRu: "Резекция верхушки корня с ретроградным пломбированием МТА",
				name: "Резекция верхушки корня с ретроградным пломбированием МТА",
				priceRub: 8500,
				quantity: 1,
				suggestedPriceRub: 8500,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение шва на слизистую оболочку рта (ПГА 5-0)",
				name: "Наложение шва на слизистую оболочку рта (ПГА 5-0)",
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
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
			{ name: "МТА материал для ретроградного пломбирования", unit: "доз.", quantity: 1, isWarehouseCritical: true },
			{ name: "Шовный материал ПГА 5-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
		],
	},
];
