import type React from "react";
import {
	Crown,
	Flame,
	HeartPulse,
	Scissors,
	Sparkles,
	Stethoscope,
} from "lucide-react";

/**
 * @deprecated Legacy static teeth list. Prefer dynamic patient teeth via `getDynamicPatientTeeth()`
 * or anatomical arch constants `UPPER_JAW_FDI_TEETH` / `LOWER_JAW_FDI_TEETH`.
 */
export const COMMON_FDI_TEETH = [
	16, 26, 36, 46, 11, 21, 31, 41, 14, 24, 34, 44, 18, 48,
];

export {
	UPPER_JAW_FDI_TEETH,
	LOWER_JAW_FDI_TEETH,
	ALL_ADULT_FDI_TEETH,
	INTACT_QUADRANTS,
	TOOTH_UI_STATE_LABELS,
	getToothColorVariant,
	getQuadrantForTooth,
	isPathologicalToothState,
	normalizeToothUiState,
	getDynamicPatientTeeth,
	type DynamicToothItem,
	type DynamicTeethResult,
	type IntactQuadrant,
	type QuadrantId,
	type ToothColorVariant,
} from "./dynamicTeethSelector";

export interface ClinicalSpecialtyItem {
	presetId: string;
	label: string;
	subtext?: string;
	compactSubtext?: string;
}

export interface ClinicalSpecialtySection {
	id: string;
	label: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	items: ClinicalSpecialtyItem[];
}

export const CLINICAL_SPECIALTY_SECTIONS: readonly ClinicalSpecialtySection[] = [
	{
		id: "therapy",
		label: "Терапия",
		icon: Stethoscope,
		items: [
			{
				presetId: "caries_initial_icon",
				label: "Кариес начальный",
				subtext: "Инфильтрация полимером без препарирования",
				compactSubtext: "Инфильтрация Icon",
			},
			{
				presetId: "caries_medium",
				label: "Кариес средний",
				subtext: "Препарирование + Светоотверждаемый нанокомпозит",
				compactSubtext: "Световая пломба",
			},
			{
				presetId: "caries_deep",
				label: "Кариес глубокий",
				subtext: "СИЦ-прокладка",
				compactSubtext: "СИЦ-прокладка",
			},
			{
				presetId: "wedge_defect_cervical",
				label: "Клиновидный дефект",
				subtext: "Текучий гибридный композит + полировка",
				compactSubtext: "Текучий композит",
			},
			{
				presetId: "filling_restoration",
				label: "Реставрация коронки",
				subtext: "Анатомич. форма",
				compactSubtext: "Анатомич. форма",
			},
			{
				presetId: "pulpitis_acute",
				label: "Острый пульпит",
				subtext: "Эндо (1 канал)",
				compactSubtext: "Эндо (1 канал)",
			},
			{
				presetId: "pulpitis_visit1",
				label: "Пульпит (1-й этап)",
				subtext: "Экстирпация",
				compactSubtext: "Экстирпация",
			},
			{
				presetId: "pulpitis_obturation",
				label: "Обтурация каналов",
				subtext: "Гуттаперча",
				compactSubtext: "Гуттаперча",
			},
			{
				presetId: "periodontitis_destructive",
				label: "Периодонтит",
				subtext: "УЗ-дезинфекция",
				compactSubtext: "УЗ-дезинфекция",
			},
			{
				presetId: "cold_hot_sensitivity",
				label: "Гиперестезия",
				subtext: "Десенситайзер",
				compactSubtext: "Десенситайзер",
			},
		],
	},
	{
		id: "endo",
		label: "Эндодонтия",
		icon: Flame,
		items: [
			{
				presetId: "pulpitis_acute",
				label: "Острый пульпит",
				subtext: "Эндо (1 канал)",
				compactSubtext: "Эндо (1 канал)",
			},
			{
				presetId: "pulpitis_visit1",
				label: "Пульпит (1-й этап)",
				subtext: "Экстирпация",
				compactSubtext: "Экстирпация",
			},
			{
				presetId: "pulpitis_obturation",
				label: "Обтурация каналов",
				subtext: "Гуттаперча + силер",
				compactSubtext: "Гуттаперча",
			},
			{
				presetId: "periodontitis_destructive",
				label: "Деструктивный периодонтит",
				subtext: "УЗ-дезинфекция",
				compactSubtext: "УЗ-дезинфекция",
			},
			{
				presetId: "periodontitis_chronic",
				label: "Хронический периодонтит",
				subtext: "Временная обтурация",
				compactSubtext: "Временная паста",
			},
		],
	},
	{
		id: "hygiene",
		label: "Гигиена",
		icon: Sparkles,
		items: [
			{
				presetId: "hygiene_complex",
				label: "Комплексная профгигиена",
				subtext: "УЗ + Air-Flow",
				compactSubtext: "УЗ + Air-Flow",
			},
			{
				presetId: "hygiene_k036",
				label: "Снятие зубных отложений",
				subtext: "УЗ-скейлинг",
				compactSubtext: "УЗ-скейлинг",
			},
			{
				presetId: "hygiene_and_caries_mixed",
				label: "Порошкоструйная чистка",
				subtext: "Air-Flow чистка",
				compactSubtext: "Air-Flow чистка",
			},
			{
				presetId: "cold_hot_sensitivity",
				label: "Реминерализация",
				subtext: "Фторирование",
				compactSubtext: "Фторирование",
			},
		],
	},
	{
		id: "surgery",
		label: "Хирургия",
		icon: Scissors,
		items: [
			{
				presetId: "surgery_extraction_simple",
				label: "Простое удаление зуба",
				subtext: "Простое удаление",
				compactSubtext: "Простое удаление",
			},
			{
				presetId: "surgery_extraction_complex",
				label: "Сложное удаление зуба",
				subtext: "Сложное удаление",
				compactSubtext: "Сложное удаление",
			},
			{
				presetId: "surgery_periostotomy",
				label: "Периостотомия",
				subtext: "Дренирование очага",
				compactSubtext: "Дренирование очага",
			},
			{
				presetId: "surgery_implant_standard",
				label: "Дентальная имплантация",
				subtext: "Имплантация",
				compactSubtext: "Имплантация",
			},
		],
	},
	{
		id: "orthopedics",
		label: "Ортопедия",
		icon: Crown,
		items: [
			{
				presetId: "ortho_prep_zirconia_emax",
				label: "Коронка из диоксида циркония",
				subtext: "Диоксид циркония",
				compactSubtext: "Диоксид циркония",
			},
			{
				presetId: "ortho_crown_prep",
				label: "Препарирование под коронку",
				subtext: "Препарирование",
				compactSubtext: "Препарирование",
			},
			{
				presetId: "ortho_try_in_framework_crown",
				label: "Примерка каркаса коронки",
				subtext: "Примерка каркаса",
				compactSubtext: "Примерка каркаса",
			},
			{
				presetId: "crown_adhesive_cementation",
				label: "Постоянная фиксация",
				subtext: "Адгезивная фиксация",
				compactSubtext: "Адгезивная фиксация",
			},
			{
				presetId: "ortho_removable_prosthetics",
				label: "Съёмный протез",
				subtext: "Съёмный протез",
				compactSubtext: "Съёмный протез",
			},
		],
	},
	{
		id: "periodontology",
		label: "Пародонтология",
		icon: HeartPulse,
		items: [
			{
				presetId: "perio_srp_curettage",
				label: "Закрытый кюретаж карманов",
				subtext: "Закрытый кюретаж",
				compactSubtext: "Закрытый кюретаж",
			},
			{
				presetId: "perio_vector_therapy",
				label: "Аппаратная пародонтотерапия",
				subtext: "Вектор-терапия",
				compactSubtext: "Вектор-терапия",
			},
			{
				presetId: "perio_srp_curettage",
				label: "Хронический пародонтит",
				subtext: "Шинирование зубов",
				compactSubtext: "Шинирование зубов",
			},
			{
				presetId: "perio_gingivitis_catarrhal",
				label: "Катаральный гингивит",
				subtext: "Аппликации геля",
				compactSubtext: "Аппликации геля",
			},
		],
	},
];
