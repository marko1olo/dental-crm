/**
 * extractionSimpleNorms.ts — Клиническая норма простого удаления зуба (Мандаты 8e, 8b).
 */
import type { SurgicalOperationNorm } from "@dental/shared";
import { SIMPLE_EXTRACTION_NORM_TEXT } from "./surgeryCanonicalTexts";

export const EXTRACTION_SIMPLE_NORM: SurgicalOperationNorm = {
	id: "surgery_extraction_simple",
	title: "Простое удаление зуба (Физиологическая норма)",
	shortBadge: "Удаление простое",
	category: "extraction",
	icd10: "K08.8",
	icd10Label: "Другие уточненные изменения зубов и их опорного аппарата",
	serviceCode: "A16.07.001",
	serviceSubcode: "A16.07.001.001",
	serviceTitle: "Удаление зуба (простое)",
	code804n: "A16.07.001",
	code804nSubcode: "A16.07.001.001",
	service804nTitle: "Удаление зуба (простое)",
	defaultToothFdi: 36,
	standardProtocolTextRu: SIMPLE_EXTRACTION_NORM_TEXT,
	anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
	postOpRecommendationsRu: "Марлевый тампон сплюнуть через 20 минут. Не полоскать рот 24 часа. При болях — Нимесил 1 пак.",
	order804nServices: [
		{
			code: "A16.07.001",
			nameRu: "Удаление постоянного зуба (простое)",
			name: "Удаление постоянного зуба (простое)",
			priceRub: 3500,
			quantity: 1,
			suggestedPriceRub: 3500,
			stageKind: "stage_2_surgery",
			isPrimary: true,
		},
		{
			code: "A16.07.026",
			nameRu: "Кюретаж лунки удаленного зуба (ревизия и гемостаз)",
			name: "Кюретаж лунки удаленного зуба (ревизия и гемостаз)",
			priceRub: 1200,
			quantity: 1,
			suggestedPriceRub: 1200,
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
		{ name: "Губка гемостатическая Альвожиль / коллагеновая", unit: "шт.", quantity: 1, isWarehouseCritical: false },
		{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
		{ name: "Марлевые тампоны стерильные", unit: "шт.", quantity: 2, isWarehouseCritical: false },
	],
};
