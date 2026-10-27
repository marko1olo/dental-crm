import { roundQuantity } from "./consumableLinkManager.js";

/**
 * Standard weight factors per unit for dental Class B medical waste according to SanPiN 2.1.3684-21.
 * Glass carpules ~0.005 kg, sharps/needles/blades ~0.002 kg, contaminated PPE/swabs ~0.015 kg,
 * standard yellow puncture-resistant sharps container tare ~0.15 kg.
 */
export const CLASS_B_WEIGHT_ESTIMATES = {
	carpuleGlassKg: 0.005,
	sharpsNeedleKg: 0.002,
	contaminatedPpeKg: 0.015,
	standardPunctureContainerTareKg: 0.15,
} as const;

/**
 * Deterministically computes estimated Class B waste weight in kg according to SanPiN standards.
 */
export function calculateClassBWasteWeightKg(
	carpulesCount: number,
	sharpsCount: number,
	contaminatedCount: number,
): number {
	const safeCarpules = Math.max(0, carpulesCount);
	const safeSharps = Math.max(0, sharpsCount);
	const safeContaminated = Math.max(0, contaminatedCount);

	const carpulesWeight = safeCarpules * CLASS_B_WEIGHT_ESTIMATES.carpuleGlassKg;
	const sharpsWeight = safeSharps * CLASS_B_WEIGHT_ESTIMATES.sharpsNeedleKg;
	const contaminatedWeight = Math.max(0.05, safeContaminated * CLASS_B_WEIGHT_ESTIMATES.contaminatedPpeKg);

	return roundQuantity(carpulesWeight + sharpsWeight + contaminatedWeight, 3);
}
