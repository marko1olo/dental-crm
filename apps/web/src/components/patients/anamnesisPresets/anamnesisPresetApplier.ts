import { CANONICAL_SOMATIC_HEALTHY_NORM_WITH_INFECTIONS_TEXT } from "@dental/shared";
import type { PatientClinicalSafetyProfile } from "../safetyMath";
import {
	DEFAULT_ANAMNESIS_PROFILE,
	type AnamnesisPresetType,
	type PresetApplicationResult,
} from "./anamnesisPresetTypes";

export function applyAnamnesisPreset(
	current: PatientClinicalSafetyProfile,
	presetType: AnamnesisPresetType,
): PresetApplicationResult {
	switch (presetType) {
		case "clean":
			return {
				updatedProfile: {
					...DEFAULT_ANAMNESIS_PROFILE,
					customChronicNotes: CANONICAL_SOMATIC_HEALTHY_NORM_WITH_INFECTIONS_TEXT,
				},
				toastMessage: "Применен шаблон: Соматически здоров / норма (без особенностей)",
				toastType: "info",
			};
		case "cardio":
			return {
				updatedProfile: {
					...current,
					hasHypertension: true,
					hasCardiovascularDisease: true,
					hasPacemakerExs: true,
				},
				toastMessage: "Применен шаблон: ЭКС + Гипертоническая болезнь (Запрет УЗ)",
				toastType: "warning",
			};
		case "anticoag":
			return {
				updatedProfile: {
					...current,
					takesAnticoagulants: true,
					anticoagulantName: "Ксарелто 20 мг (Ривароксабан)",
					hasCardiovascularDisease: true,
				},
				toastMessage: "Применен шаблон: Прием антикоагулянтов (Риск кровотечения)",
				toastType: "warning",
			};
		case "bisphosphonate":
			return {
				updatedProfile: {
					...current,
					takesBisphosphonates: true,
					bisphosphonateName: "Акласта (Золедроновая к-та)",
				},
				toastMessage: "Применен шаблон: Бисфосфонаты (Риск остеонекроза MRONJ)",
				toastType: "warning",
			};
		case "pregnant_2":
			return {
				updatedProfile: {
					...current,
					pregnancyTrimester: "trimester_2",
					gestationalWeeks: 20,
				},
				toastMessage: "Применен шаблон: Беременность 2 триместр (Безопасное окно)",
				toastType: "info",
			};
		case "diabetes":
			return {
				updatedProfile: {
					...current,
					hasDiabetesMellitus: true,
					diabetesType: "2",
				},
				toastMessage: "Применен шаблон: Сахарный диабет (Контроль гликемии и регенерации)",
				toastType: "warning",
			};
		case "allergy_articaine":
			return {
				updatedProfile: {
					...current,
					hasArticaineAllergy: true,
					hasBronchialAsthma: true,
					hasSulfiteAllergy: true,
				},
				toastMessage: "Применен шаблон: Аллергия на Артикаин + Астма + Сульфиты",
				toastType: "error",
			};
		case "allergy_penicillin":
			return {
				updatedProfile: {
					...current,
					hasPenicillinAllergy: true,
				},
				toastMessage: "Применен пресет: Аллергия на пенициллины (Запрет Амоксиклава)",
				toastType: "warning",
			};
		case "allergy_nsaid":
			return {
				updatedProfile: {
					...current,
					hasNsaidAllergy: true,
				},
				toastMessage: "Применен пресет: Аллергия на НПВП (Запрет Кеторола/Аспирина)",
				toastType: "warning",
			};
		case "allergy_latex":
			return {
				updatedProfile: {
					...current,
					hasLatexAllergy: true,
				},
				toastMessage: "Применен пресет: Аллергия на латекс (Беслатексный режим)",
				toastType: "warning",
			};
	}
}
