/**
 * anesthesiaMrdFormulas.ts
 * Pediatric & Weight dosage formulas (Clark & Young rules) for local anesthesia.
 */

export function calculateClarkFactor(patientWeightKg: number): number {
	const weight = Math.max(3, Math.min(150, patientWeightKg));
	return Math.round((weight / 70) * 1000) / 1000;
}

export function calculateClarkDose(adultAbsoluteMaxMg: number, patientWeightKg: number): number {
	const factor = calculateClarkFactor(patientWeightKg);
	return Math.round(adultAbsoluteMaxMg * factor * 10) / 10;
}

export function calculateYoungFactor(ageYears: number): number {
	const age = Math.max(1, Math.min(18, ageYears));
	return Math.round((age / (age + 12)) * 1000) / 1000;
}

export function calculateYoungDose(adultAbsoluteMaxMg: number, ageYears: number): number {
	const factor = calculateYoungFactor(ageYears);
	return Math.round(adultAbsoluteMaxMg * factor * 10) / 10;
}
