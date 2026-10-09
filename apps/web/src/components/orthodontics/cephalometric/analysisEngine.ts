/**
 * DENTE CRM — Master Cephalometric Analysis Engine (Layer 2)
 * Coordinates landmark measurement calculation, diagnosis synthesis, and completion statistics.
 */

import { calculateDentalMeasurements } from "./dentalMeasurements";
import { synthesizeCephalometricDiagnosis } from "./diagnosisEngine";
import { CEPHALOMETRIC_LANDMARKS } from "./landmarks";
import { calculateSkeletalMeasurements } from "./skeletalMeasurements";
import type {
	CephalometricAnalysisResult,
	CephalometricMeasurement,
	LandmarkMap,
} from "./types";

export function calculateCephalometrics(
	landmarks: LandmarkMap,
	scaleMmPerPixel = 0.15, // Default scale approx: 1 pixel ~ 0.15mm
): CephalometricAnalysisResult {
	const skeletal = calculateSkeletalMeasurements(landmarks, scaleMmPerPixel);
	const dental = calculateDentalMeasurements(landmarks, scaleMmPerPixel);

	// Original array order preserved 1:1:
	// 1..11: SNA, SNB, ANB, Wits, Downs-FA, Downs-Conv, Downs-AB, SN-GoGn, FMA, Downs-YAxis, Downs-CantOP
	// 12..18: U1-SN, 1-NA-Angle, 1-NA-Dist, L1-MP, 1-NB-Angle, 1-NB-Dist, U1-L1
	// 19..21: NL-ML, McNamara-A-Nperp, McNamara-Pog-Nperp
	const measurements: CephalometricMeasurement[] = [
		...skeletal.measurementsPart1,
		...dental.measurements,
		...skeletal.measurementsPart2,
	];

	const diagnosis = synthesizeCephalometricDiagnosis(skeletal, dental);

	const placedCount = CEPHALOMETRIC_LANDMARKS.filter(
		(l) => landmarks[l.key] !== undefined,
	).length;
	const totalCount = CEPHALOMETRIC_LANDMARKS.length;
	const isComplete = placedCount >= 10; // At least core 10 points
	const completionPercentage = totalCount > 0 ? Math.round((placedCount / totalCount) * 100) : 0;

	return {
		measurements,
		diagnosis,
		landmarks,
		scaleMmPerPixel,
		isComplete,
		placedCount,
		totalCount,
		completionPercentage,
	};
}
