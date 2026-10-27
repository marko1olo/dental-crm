/**
 * apps/web/src/components/visit/clinicalSpecialtyTherapy.ts
 *
 * Разделы Терапии, Эндодонтии и Профгигиены (Мандат 8e).
 */

import { Flame, Sparkles, Stethoscope } from "lucide-react";
import type { ClinicalSpecialtySection } from "./clinicalSpecialtyTypes";

export const THERAPY_SECTION: ClinicalSpecialtySection = {
	id: "therapy",
	label: "Терапия",
	icon: Stethoscope,
	items: [
		{ presetId: "caries_initial_icon", label: "Кариес начальный", subtext: "Инфильтрация полимером без препарирования", compactSubtext: "Инфильтрация Icon" },
		{ presetId: "caries_medium", label: "Кариес средний", subtext: "Препарирование + Светоотверждаемый нанокомпозит", compactSubtext: "Световая пломба" },
		{ presetId: "caries_deep", label: "Кариес глубокий", subtext: "СИЦ-прокладка", compactSubtext: "СИЦ-прокладка" },
		{ presetId: "wedge_defect_cervical", label: "Клиновидный дефект", subtext: "Текучий гибридный композит + полировка", compactSubtext: "Текучий композит" },
		{ presetId: "filling_restoration", label: "Реставрация коронки", subtext: "Анатомич. форма", compactSubtext: "Анатомич. форма" },
		{ presetId: "pulpitis_acute", label: "Острый пульпит", subtext: "Эндо (1 канал)", compactSubtext: "Эндо (1 канал)" },
		{ presetId: "pulpitis_visit1", label: "Пульпит (1-й этап)", subtext: "Экстирпация", compactSubtext: "Экстирпация" },
		{ presetId: "pulpitis_obturation", label: "Обтурация каналов", subtext: "Гуттаперча", compactSubtext: "Гуттаперча" },
		{ presetId: "periodontitis_destructive", label: "Периодонтит", subtext: "УЗ-дезинфекция", compactSubtext: "УЗ-дезинфекция" },
		{ presetId: "cold_hot_sensitivity", label: "Гиперестезия", subtext: "Десенситайзер", compactSubtext: "Десенситайзер" },
	],
};

export const ENDO_SECTION: ClinicalSpecialtySection = {
	id: "endo",
	label: "Эндодонтия",
	icon: Flame,
	items: [
		{ presetId: "pulpitis_acute", label: "Острый пульпит", subtext: "Эндо (1 канал)", compactSubtext: "Эндо (1 канал)" },
		{ presetId: "pulpitis_visit1", label: "Пульпит (1-й этап)", subtext: "Экстирпация", compactSubtext: "Экстирпация" },
		{ presetId: "pulpitis_obturation", label: "Обтурация каналов", subtext: "Гуттаперча + силер", compactSubtext: "Гуттаперча" },
		{ presetId: "periodontitis_destructive", label: "Деструктивный периодонтит", subtext: "УЗ-дезинфекция", compactSubtext: "УЗ-дезинфекция" },
		{ presetId: "periodontitis_chronic", label: "Хронический периодонтит", subtext: "Временная обтурация", compactSubtext: "Временная паста" },
	],
};

export const HYGIENE_SECTION: ClinicalSpecialtySection = {
	id: "hygiene",
	label: "Гигиена",
	icon: Sparkles,
	items: [
		{ presetId: "hygiene_complex", label: "Комплексная профгигиена", subtext: "УЗ + Air-Flow", compactSubtext: "УЗ + Air-Flow" },
		{ presetId: "hygiene_k036", label: "Снятие зубных отложений", subtext: "УЗ-скейлинг", compactSubtext: "УЗ-скейлинг" },
		{ presetId: "hygiene_and_caries_mixed", label: "Порошкоструйная чистка", subtext: "Air-Flow чистка", compactSubtext: "Air-Flow чистка" },
		{ presetId: "cold_hot_sensitivity", label: "Реминерализация", subtext: "Фторирование", compactSubtext: "Фторирование" },
	],
};
