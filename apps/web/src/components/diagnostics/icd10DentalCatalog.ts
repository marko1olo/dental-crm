export * from "./icd10Types";
import type { DentalIcd10Item } from "./icd10Types";
import { DENTAL_ICD10_CATALOG_PART1 } from "./icd10CatalogPart1";
import { DENTAL_ICD10_CATALOG_PART2 } from "./icd10CatalogPart2";
import { DENTAL_ICD10_RUBRIC_MAP } from "./icd10/catalog/icd10RubricMap";

export { DENTAL_ICD10_RUBRIC_MAP };

/**
 * Полный реестр стоматологических диагнозов МКБ-10 с синонимами, клиническими тегами и правилами валидации.
 */
export const DENTAL_ICD10_CATALOG: readonly DentalIcd10Item[] = [
	...DENTAL_ICD10_CATALOG_PART1,
	...DENTAL_ICD10_CATALOG_PART2,
];

/**
 * Быстрый поиск элемента каталога по нормализованному коду.
 */
export const DENTAL_ICD10_MAP = new Map<string, DentalIcd10Item>(
	DENTAL_ICD10_CATALOG.map((item) => [item.code, item]),
);

/**
 * Канонический ТОП-12 амбулаторных стоматологических диагнозов для мгновенного 1-клик выбора врачом.
 */
export const TOP_12_AMBULATORY_DIAGNOSES_CODES = [
	"K02.0", // Кариес эмали
	"K02.1", // Кариес дентина
	"K04.0", // Пульпит
	"K04.5", // Хронический апикальный периодонтит
	"K05.0", // Острый гингивит
	"K05.1", // Хронический гингивит
	"K05.3", // Хронический пародонтит
	"K08.1", // Потеря зубов вследствие удаления
	"K07.4", // Аномалия прикуса неуточненная
	"K01.1", // Ретинированные зубы
	"K03.1", // Сошлифовывание твердых тканей / клиновидный дефект
	"K08.8", // Другие уточненные изменения зубов
] as const;

export const TOP_12_AMBULATORY_PRESETS: readonly DentalIcd10Item[] =
	TOP_12_AMBULATORY_DIAGNOSES_CODES.map((code) => {
		const item = DENTAL_ICD10_MAP.get(code);
		if (!item) {
			throw new Error(`Top-12 diagnosis ${code} missing from DENTAL_ICD10_MAP`);
		}
		return item;
	});

export const POPULAR_CLINICAL_PRESETS: readonly DentalIcd10Item[] =
	TOP_12_AMBULATORY_PRESETS;
