/**
 * emergencyPeriostotomyNorms.ts — Клиническая норма периостотомии при остром гнойном периостите.
 */

import type { SurgicalOperationNorm } from "@dental/shared";
import { PERIOSTOTOMY_NORM_TEXT } from "./surgeryCanonicalTexts";

export const EMERGENCY_PERIOSTOTOMY_NORMS: readonly SurgicalOperationNorm[] = [
	{
		id: "surgery_periostotomy",
		title: "Вскрытие поднадкостничного очага воспаления (периостотомия) с дренированием",
		shortBadge: "Периостотомия",
		category: "emergency",
		icd10: "K10.2",
		icd10Label: "Воспалительные заболевания челюстей (острый гнойный периостит)",
		serviceCode: "A16.07.011",
		serviceTitle: "Вскрытие поднадкостничного очага воспаления (периостотомия)",
		code804n: "A16.07.011",
		service804nTitle: "Вскрытие поднадкостничного очага воспаления (периостотомия)",
		defaultToothFdi: 46,
		standardProtocolTextRu: PERIOSTOTOMY_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия по переходной складке Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Холод на область отека локально 15 мин 3-4 раза. Не греть щеку компрессами! Ротовые ванночки с 0.05% хлоргексидином 4-5 раз в день. Дренаж самостоятельно не извлекать! Антибиотикотерапия и НПВП по схеме. Обязательная явка на перевязку и осмотр на следующий день.",
		order804nServices: [
			{
				code: "A16.07.011",
				nameRu: "Вскрытие поднадкостничного очага воспаления (периостотомия) с дренированием",
				name: "Вскрытие поднадкостничного очага воспаления (периостотомия) с дренированием",
				priceRub: 2100,
				quantity: 1,
				suggestedPriceRub: 2100,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия по переходной складке",
				name: "Инфильтрационная анестезия по переходной складке",
				priceRub: 900,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Артикаин 1:100000", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Дренаж резиновый ленточный", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Хлоргексидин 0.05%", unit: "мл", quantity: 50, isWarehouseCritical: false },
			{ name: "Стерильные марлевые салфетки", unit: "шт.", quantity: 2, isWarehouseCritical: false },
		],
	},
];
