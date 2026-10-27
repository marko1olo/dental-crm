/**
 * extractionComplexNorms.ts — Клиническая норма сложного удаления зуба (Мандаты 8e, 8b).
 */
import type { SurgicalOperationNorm } from "@dental/shared";
import { COMPLEX_EXTRACTION_NORM_TEXT } from "./surgeryCanonicalTexts";

export const EXTRACTION_COMPLEX_NORM: SurgicalOperationNorm = {
	id: "surgery_extraction_complex",
	title: "Сложное удаление зуба с разъединением корней и ушиванием",
	shortBadge: "Сложн. удаление",
	category: "extraction",
	icd10: "K04.7",
	icd10Label: "Периапикальный абсцесс без свища / Дистопия",
	serviceCode: "A16.07.001.001",
	serviceSubcode: "A16.07.001.001",
	serviceTitle: "Удаление зуба сложное с разъединением корней",
	code804n: "A16.07.001.001",
	code804nSubcode: "A16.07.001.001",
	service804nTitle: "Удаление зуба сложное с разъединением корней",
	defaultToothFdi: 47,
	standardProtocolTextRu: COMPLEX_EXTRACTION_NORM_TEXT,
	anesthesiaDefaultRu: "Инфильтрационная и проводниковая анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл",
	postOpRecommendationsRu:
		"Холод на щеку локально 15 мин 3-4 раза в первые сутки. Не полоскать, не греть, не пить через трубочку. Прием НПВП (Нимесил) при боли. Осмотр через 3 дня, снятие швов через 7-10 дней.",
	order804nServices: [
		{
			code: "A16.07.001.001",
			nameRu: "Удаление зуба сложное с разъединением корней и фрагментацией",
			name: "Удаление зуба сложное с разъединением корней и фрагментацией",
			priceRub: 6000,
			quantity: 1,
			suggestedPriceRub: 6000,
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
			code: "A16.07.097",
			nameRu: "Наложение шва на слизистую оболочку рта (Викрил 4-0)",
			name: "Наложение шва на слизистую оболочку рта (Викрил 4-0)",
			priceRub: 1500,
			quantity: 1,
			suggestedPriceRub: 1500,
			stageKind: "stage_2_surgery",
		},
		{
			code: "A11.07.015",
			nameRu: "Проводниковая / инфильтрационная анестезия (Артикаин)",
			name: "Проводниковая / инфильтрационная анестезия (Артикаин)",
			priceRub: 1200,
			quantity: 1,
			suggestedPriceRub: 1200,
			stageKind: "stage_2_surgery",
		},
	],
	requiredMaterials: [
		{ name: "Артикаин 1:100000", unit: "шт.", quantity: 2, isWarehouseCritical: false },
		{ name: "Шовный материал Викрил 4-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
		{ name: "Губка Альвожил", unit: "шт.", quantity: 1, isWarehouseCritical: false },
		{ name: "Марлевые тампоны", unit: "шт.", quantity: 2, isWarehouseCritical: false },
		{ name: "Бор твердосплавный хирургический Lindemann", unit: "шт.", quantity: 1, isWarehouseCritical: false },
	],
};
