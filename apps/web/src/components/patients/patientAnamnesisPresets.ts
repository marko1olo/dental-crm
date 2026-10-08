/**
 * patientAnamnesisPresets.ts — Клинические пресеты и профили здоровья по умолчанию.
 * Мандат 8b: строго <= 800 строк на файл.
 * Мандат 8e: Doctor Autonomy (соматический статус "Здоров / норма" в 1 клик).
 */

import type { PatientClinicalSafetyProfile } from "./safetyMath";

export const DEFAULT_ANAMNESIS_PROFILE: PatientClinicalSafetyProfile = {
	hasLidocaineAllergy: false,
	hasArticaineAllergy: false,
	hasMepivacaineAllergy: false,
	hasSulfiteAllergy: false,
	hasAnaphylaxisHistory: false,
	hasPacemakerExs: false,
	hasCardiovascularDisease: false,
	hasHypertension: false,
	takesAnticoagulants: false,
	anticoagulantName: "",
	takesBisphosphonates: false,
	bisphosphonateName: "",
	pregnancyTrimester: "none",
	hasDiabetesMellitus: false,
	diabetesType: "unknown",
	hasBronchialAsthma: false,
	hasEpilepsy: false,
	hasHepatitis: false,
	hasHiv: false,
	hasThyroidDisease: false,
	hasPenicillinAllergy: false,
	hasLatexAllergy: false,
	hasNsaidAllergy: false,
	customAllergyNotes: "",
	customChronicNotes: "",
	currentMedicationsList: "",
};

export type AnamnesisPresetType =
	| "clean"
	| "cardio"
	| "anticoag"
	| "bisphosphonate"
	| "pregnant_2"
	| "allergy_articaine"
	| "allergy_penicillin"
	| "allergy_nsaid"
	| "allergy_latex";

export const ANAMNESIS_PRESETS: readonly AnamnesisPresetType[] = [
	"clean",
	"cardio",
	"anticoag",
	"bisphosphonate",
	"pregnant_2",
	"allergy_articaine",
	"allergy_penicillin",
	"allergy_nsaid",
	"allergy_latex",
] as const;

export interface PresetApplicationResult {
	readonly updatedProfile: PatientClinicalSafetyProfile;
	readonly toastMessage: string;
	readonly toastType: "info" | "warning" | "error";
}

export function applyAnamnesisPreset(
	current: PatientClinicalSafetyProfile,
	presetType: AnamnesisPresetType,
): PresetApplicationResult {
	switch (presetType) {
		case "clean":
			return {
				updatedProfile: {
					...DEFAULT_ANAMNESIS_PROFILE,
					customChronicNotes:
						"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания (гепатит B/C, ВИЧ, сифилис) со слов отрицает. Физиологическая норма.",
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
