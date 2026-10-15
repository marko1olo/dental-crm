import { useMemo } from 'react';
import type { AnestheticDrugId, InjectionTechniqueId } from '../anesthesiaCatalog';
import {
	calculateAnesthesiaSafety,
	resolveClinicalDefaultWeightKg,
	type AnesthesiaCalculationResult,
	type AsaPhysicalStatus,
} from '../anesthesiaEngine';

export interface UseSingleCarpuleCalculationParams {
	selectedDrugId: AnestheticDrugId;
	patientWeightKg: number;
	patientAgeYears?: number | undefined;
	asaStatus: AsaPhysicalStatus;
	isCardioRisk: boolean;
	hasHypertension?: boolean | undefined;
	hasCardiacArrhythmia?: boolean | undefined;
	hasIschemicHeartDisease?: boolean | undefined;
	hasMyocardialInfarctionHistory?: boolean | undefined;
	takesBetaBlockers?: boolean | undefined;
	hasSulfiteAllergy?: boolean | undefined;
	hasBronchialAsthma?: boolean | undefined;
	isPregnantOrLactating?: boolean | undefined;
	techniqueId: InjectionTechniqueId;
	targetToothNumberFdi?: number | string | undefined;
}

export function useSingleCarpuleCalculation(
	params: UseSingleCarpuleCalculationParams,
): AnesthesiaCalculationResult {
	const {
		selectedDrugId,
		patientWeightKg,
		patientAgeYears = 35,
		asaStatus,
		isCardioRisk,
		hasHypertension,
		hasCardiacArrhythmia,
		hasIschemicHeartDisease,
		hasMyocardialInfarctionHistory,
		takesBetaBlockers,
		hasSulfiteAllergy,
		hasBronchialAsthma,
		isPregnantOrLactating,
		techniqueId,
		targetToothNumberFdi,
	} = params;

	return useMemo(() => {
		const effectiveWeight = resolveClinicalDefaultWeightKg(
			patientWeightKg,
			patientAgeYears,
			patientAgeYears < 18,
		);
		return calculateAnesthesiaSafety({
			drugId: selectedDrugId,
			carpulesCount: 1.0,
			patientWeightKg: effectiveWeight,
			patientAgeYears,
			asaStatus,
			hasCardiovascularRisk: isCardioRisk,
			hasHypertension,
			hasCardiacArrhythmia,
			hasIschemicHeartDisease,
			hasMyocardialInfarctionHistory,
			takesBetaBlockers,
			hasSulfiteAllergy: Boolean(hasSulfiteAllergy),
			hasBronchialAsthma: Boolean(hasBronchialAsthma),
			isPregnantOrLactating: Boolean(isPregnantOrLactating),
			techniqueId,
			needleType: 'g30_short_21mm',
			targetToothNumberFdi,
			aspirationNegativeConfirmed: true,
		});
	}, [
		selectedDrugId,
		patientWeightKg,
		patientAgeYears,
		asaStatus,
		isCardioRisk,
		hasHypertension,
		hasCardiacArrhythmia,
		hasIschemicHeartDisease,
		hasMyocardialInfarctionHistory,
		takesBetaBlockers,
		hasSulfiteAllergy,
		hasBronchialAsthma,
		isPregnantOrLactating,
		techniqueId,
		targetToothNumberFdi,
	]);
}
