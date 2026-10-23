import type { DentalSpecialty, ServiceCategory } from "../index.js";
import type { NomenclatureMatchResult } from "./matcherTypesAndUtils.js";

/**
 * Category-based fallback resolution for unrecognized service titles.
 */
export function resolveCategoryFallback(
	categoryHint: string,
	cleanedTitle: string,
): NomenclatureMatchResult {
	let fallbackCode = "A16.07.002";
	let fallbackTitle = "Восстановление зуба пломбой";
	let fallbackCat: ServiceCategory = "therapy";
	let fallbackSpec: DentalSpecialty = "therapist";

	if (categoryHint.includes("хирург") || categoryHint === "surgery") {
		fallbackCode = "A16.07.001";
		fallbackTitle = "Удаление зуба";
		fallbackCat = "surgery";
		fallbackSpec = "surgeon";
	} else if (categoryHint.includes("ортопед") || categoryHint.includes("протез") || categoryHint === "prosthetics") {
		fallbackCode = "A16.07.004";
		fallbackTitle = "Восстановление зуба коронкой постоянной";
		fallbackCat = "prosthetics";
		fallbackSpec = "orthopedist";
	} else if (categoryHint.includes("ортодонт") || categoryHint === "orthodontics") {
		fallbackCode = "A16.07.048";
		fallbackTitle = "Ортодонтическая коррекция с применением брекет-систем";
		fallbackCat = "orthodontics";
		fallbackSpec = "orthodontist";
	} else if (categoryHint.includes("гигиен") || categoryHint === "hygiene") {
		fallbackCode = "A16.07.051";
		fallbackTitle = "Профессиональная гигиена полости рта и зубов";
		fallbackCat = "hygiene";
		fallbackSpec = "hygienist";
	} else if (categoryHint.includes("пародонт") || categoryHint === "periodontology") {
		fallbackCode = "A16.07.018";
		fallbackTitle = "Закрытый кюретаж при заболеваниях пародонта";
		fallbackCat = "periodontology";
		fallbackSpec = "periodontist";
	} else if (categoryHint.includes("диагност") || categoryHint.includes("рентген") || categoryHint === "imaging") {
		fallbackCode = "A06.07.007";
		fallbackTitle = "Внутриротовая рентгенография";
		fallbackCat = "imaging";
		fallbackSpec = "radiologist";
	} else if (categoryHint.includes("консульт") || categoryHint === "consultation") {
		fallbackCode = "B01.065.001";
		fallbackTitle = "Прием (осмотр, консультация) врача-стоматолога первичный";
		fallbackCat = "consultation";
		fallbackSpec = "therapist";
	}

	return {
		code804n: fallbackCode,
		statutoryTitle804n: fallbackTitle,
		category: fallbackCat,
		specialty: fallbackSpec,
		confidence: 0.40,
		confidenceKind: "fallback",
		cleanedTitle,
		matchedKeywords: [],
	};
}
