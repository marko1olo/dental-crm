import { resolveClinicalDefaultWeightKg } from "@dental/shared";
import type { PatientAgeCategory } from "./anesthesiaEngineTypes.js";

export { resolveClinicalDefaultWeightKg };

export function determineAgeCategory(ageYears: number): PatientAgeCategory {
	if (ageYears < 18) return "pediatric";
	if (ageYears >= 65) return "geriatric";
	return "adult";
}

export function calculateAgeReductionFactor(
	ageYears: number,
	weightKg?: number,
): number {
	if (ageYears < 18 && typeof weightKg === "number" && weightKg > 0) {
		return Math.min(1.0, Number((weightKg / 70).toFixed(2)));
	}
	if (ageYears >= 65) {
		return 0.7; // 30% reduction for geriatric patients
	}
	return 1.0;
}
