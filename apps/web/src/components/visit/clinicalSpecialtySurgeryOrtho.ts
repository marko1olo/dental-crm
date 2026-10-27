/**
 * apps/web/src/components/visit/clinicalSpecialtySurgeryOrtho.ts
 *
 * Разделы Хирургии, Ортопедии и Пародонтологии (Мандат 8e).
 */

import { Crown, HeartPulse, Scissors } from "lucide-react";
import type { ClinicalSpecialtySection } from "./clinicalSpecialtyTypes";

export const SURGERY_SECTION: ClinicalSpecialtySection = {
	id: "surgery",
	label: "Хирургия",
	icon: Scissors,
	items: [
		{ presetId: "surgery_extraction_simple", label: "Простое удаление зуба", subtext: "Простое удаление", compactSubtext: "Простое удаление" },
		{ presetId: "surgery_extraction_complex", label: "Сложное удаление зуба", subtext: "Сложное удаление", compactSubtext: "Сложное удаление" },
		{ presetId: "surgery_periostotomy", label: "Периостотомия", subtext: "Дренирование очага", compactSubtext: "Дренирование очага" },
		{ presetId: "surgery_implant_standard", label: "Дентальная имплантация", subtext: "Имплантация", compactSubtext: "Имплантация" },
	],
};

export const ORTHOPEDICS_SECTION: ClinicalSpecialtySection = {
	id: "orthopedics",
	label: "Ортопедия",
	icon: Crown,
	items: [
		{ presetId: "ortho_prep_zirconia_emax", label: "Коронка из диоксида циркония", subtext: "Диоксид циркония", compactSubtext: "Диоксид циркония" },
		{ presetId: "ortho_crown_prep", label: "Препарирование под коронку", subtext: "Препарирование", compactSubtext: "Препарирование" },
		{ presetId: "ortho_try_in_framework_crown", label: "Примерка каркаса коронки", subtext: "Примерка каркаса", compactSubtext: "Примерка каркаса" },
		{ presetId: "crown_adhesive_cementation", label: "Постоянная фиксация", subtext: "Адгезивная фиксация", compactSubtext: "Адгезивная фиксация" },
		{ presetId: "ortho_removable_prosthetics", label: "Съёмный протез", subtext: "Съёмный протез", compactSubtext: "Съёмный протез" },
	],
};

export const PERIODONTOLOGY_SECTION: ClinicalSpecialtySection = {
	id: "periodontology",
	label: "Пародонтология",
	icon: HeartPulse,
	items: [
		{ presetId: "perio_srp_curettage", label: "Закрытый кюретаж карманов", subtext: "Закрытый кюретаж", compactSubtext: "Закрытый кюретаж" },
		{ presetId: "perio_vector_therapy", label: "Аппаратная пародонтотерапия", subtext: "Вектор-терапия", compactSubtext: "Вектор-терапия" },
		{ presetId: "perio_srp_curettage", label: "Хронический пародонтит", subtext: "Шинирование зубов", compactSubtext: "Шинирование зубов" },
		{ presetId: "perio_gingivitis_catarrhal", label: "Катаральный гингивит", subtext: "Аппликации геля", compactSubtext: "Аппликации геля" },
	],
};
