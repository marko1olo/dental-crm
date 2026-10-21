import type { AnestheticDrugInfo } from "../anesthesiaCatalog.js";
import {
	type AnesthesiaCalculationInput,
	type AnesthesiaSafetyZone,
	EPINEPHRINE_CEILINGS_MG,
} from "./anesthesiaEngineTypes.js";

export function calculateMaxSafeActiveMg(
	drug: AnestheticDrugInfo,
	weight: number,
	isPediatric: boolean,
	ageFactor: number,
): number {
	const effectiveMaxMgPerKg = isPediatric
		? drug.id.startsWith("articaine")
			? 5.0
			: drug.maxDoseMgPerKgAdult
		: drug.maxDoseMgPerKgAdult;

	const maxActiveByWeight = weight * effectiveMaxMgPerKg * ageFactor;
	return isPediatric
		? Number(maxActiveByWeight.toFixed(1))
		: Number(
				Math.min(
					drug.absoluteMaxDoseMgAdult * ageFactor,
					maxActiveByWeight,
				).toFixed(1),
			);
}

export function resolveMaxSafeEpinephrineMg(
	input: AnesthesiaCalculationInput,
): number {
	const hasCardio =
		Boolean(
			input.hasCardiovascularRisk ||
				input.hasIschemicHeartDisease ||
				input.hasMyocardialInfarctionHistory,
		) ||
		Boolean(
			input.hasHypertension ||
				input.hasCardiacArrhythmia ||
				input.takesBetaBlockers,
		) ||
		(typeof input.bpSystolic === "number" && input.bpSystolic >= 140) ||
		(typeof input.bpDiastolic === "number" && input.bpDiastolic >= 90) ||
		(typeof input.heartRateBpm === "number" && input.heartRateBpm > 90) ||
		input.asaStatus === "asa_3" ||
		input.asaStatus === "asa_4";

	return hasCardio
		? EPINEPHRINE_CEILINGS_MG.cardiovascularRisk
		: EPINEPHRINE_CEILINGS_MG.healthyAdult;
}

export function calculateCarpuleLimits(
	drug: AnestheticDrugInfo,
	maxSafeActiveMg: number,
	maxSafeEpiMg: number,
	carpules: number,
) {
	const maxByActive =
		drug.mgActivePerCarpule > 0
			? maxSafeActiveMg / drug.mgActivePerCarpule
			: 99;
	const maxByEpi =
		!drug.isAdrenalineFree && drug.mgEpiPerCarpule > 0
			? maxSafeEpiMg / drug.mgEpiPerCarpule
			: 99;
	const maxSafeCarpulesCount =
		Math.floor(Math.min(maxByActive, maxByEpi) * 10) / 10;
	const remainingSafeCarpulesCount = Math.max(
		0,
		Math.floor((maxSafeCarpulesCount - carpules) * 10) / 10,
	);
	return { maxSafeCarpulesCount, remainingSafeCarpulesCount };
}

export function determineSafetyZone(
	percentActive: number,
	percentEpi: number,
): AnesthesiaSafetyZone {
	const highest = Math.max(percentActive, percentEpi);
	if (highest > 100) return "overdose_danger";
	if (highest > 90) return "warning";
	if (highest > 70) return "caution";
	return "safe";
}
