/**
 * @dental/shared/anesthesia/safetyModules/ageAndPediatrics.ts
 * Pediatric and geriatric age & effective dosage factors (Mandate 8b, <= 120 lines)
 */

import type { AnesthesiaDrugSpec } from "../types.js";

export function isPediatricPatient(ageYears?: number, weightKg?: number): boolean {
	if (typeof ageYears === "number" && ageYears > 0 && ageYears < 18) return true;
	if (typeof weightKg === "number" && weightKg > 0 && weightKg < 40) return true;
	return false;
}

export function calculateAge(birthDateStr?: string | null, refDate?: Date): number {
	if (!birthDateStr) return 0;
	const bDate = new Date(birthDateStr);
	if (Number.isNaN(bDate.getTime())) return 0;
	const ref = refDate ?? new Date();
	let age = ref.getFullYear() - bDate.getFullYear();
	const m = ref.getMonth() - bDate.getMonth();
	if (m < 0 || (m === 0 && ref.getDate() < bDate.getDate())) {
		age--;
	}
	return age >= 0 ? age : 0;
}

export function isGeriatricPatient(ageYears?: number): boolean {
	return typeof ageYears === "number" && ageYears >= 65;
}

export function calculateEffectiveMgPerKg(
	drug: AnesthesiaDrugSpec,
	isPediatric: boolean,
	isGeriatric: boolean,
): { effectiveMgPerKg: number; ageFactor: number } {
	if (isPediatric) {
		return { effectiveMgPerKg: drug.maxDoseMgPerKgPediatric, ageFactor: 1.0 };
	}
	if (isGeriatric) {
		return {
			effectiveMgPerKg: Number((drug.maxDoseMgPerKgAdult * 0.8).toFixed(2)),
			ageFactor: 0.8,
		};
	}
	return { effectiveMgPerKg: drug.maxDoseMgPerKgAdult, ageFactor: 1.0 };
}
