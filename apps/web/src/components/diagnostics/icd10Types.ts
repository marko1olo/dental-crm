/**
 * icd10DentalCatalog.ts — Полный клинический справочник МКБ-10 по стоматологии (K00–K14)
 * для автоматического матчинга, быстрого выбора диагноза и валидации карты 043/у.
 *
 * Все формулировки соответствуют официальной номенклатуре МКБ-10 МЗ РФ и клиническим
 * рекомендациям Стоматологической Ассоциации России (СтАР).
 */

export type DentalSpecialty =
	| "therapy" // Терапевтическая стоматология
	| "surgery" // Хирургическая стоматология и имплантология
	| "orthodontics" // Ортодонтия
	| "periodontics" // Пародонтология
	| "orthopedics" // Ортопедическая стоматология
	| "pediatric" // Детская стоматология
	| "general"; // Общая стоматология

export type ClinicalSeverity =
	| "critical" // Острая боль, гнойный процесс, флегмона, абсцесс (неотложная помощь)
	| "high" // Пульпит, периодонтит, острый пародонтит, глубокий кариес
	| "medium" // Средний кариес, хронический гингивит, клиновидный дефект
	| "low"; // Начальный кариес, налет, флюороз, профилактика

export interface DentalIcd10RubricMeta {
	readonly rubric: string;
	readonly titleRu: string;
	readonly shortTitle: string;
	readonly requiresTooth: boolean;
	readonly defaultSpecialty: DentalSpecialty;
	readonly description: string;
}

export interface DentalIcd10Item {
	readonly code: string;
	readonly rubric: string;
	readonly titleRu: string;
	readonly shortTitleRu: string;
	readonly synonyms: readonly string[];
	readonly requiresTooth: boolean;
	readonly specialty: DentalSpecialty;
	readonly severity: ClinicalSeverity;
	readonly popular: boolean;
	readonly description: string;
	readonly recommendations: readonly string[];
	readonly isChildSpecific?: boolean;
}

