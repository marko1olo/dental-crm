import { useMemo } from "react";
import type {
	AnestheticDrugId,
	InjectionTechniqueId,
} from "../anesthesiaCatalog";
import {
	type AsaPhysicalStatus,
	calculateAnesthesiaSafety,
	resolveClinicalDefaultWeightKg,
} from "../anesthesiaEngine";
import type { AnesthesiaQuickBarProps } from "./types";

export function useAnesthesiaSingleCarpule(
	params: AnesthesiaQuickBarProps & {
		patientWeightKg: number;
		asaStatus: AsaPhysicalStatus;
		isCardioRisk: boolean;
		selectedDrugId: AnestheticDrugId;
		techniqueId: InjectionTechniqueId;
	},
) {
	const singleCarpuleResult = useMemo(() => {
		const effectiveWeight = resolveClinicalDefaultWeightKg(
			params.patientWeightKg,
			params.patientAgeYears ?? 35,
			(params.patientAgeYears ?? 35) < 18,
		);
		return calculateAnesthesiaSafety({
			drugId: params.selectedDrugId,
			carpulesCount: 1.0,
			patientWeightKg: effectiveWeight,
			patientAgeYears: params.patientAgeYears ?? 35,
			asaStatus: params.asaStatus,
			hasCardiovascularRisk: params.isCardioRisk,
			hasSulfiteAllergy: Boolean(params.hasSulfiteAllergy),
			hasBronchialAsthma: Boolean(params.hasBronchialAsthma),
			isPregnantOrLactating: Boolean(params.isPregnantOrLactating),
			techniqueId: params.techniqueId,
			needleType: "g30_short_21mm",
			aspirationNegativeConfirmed: true,
		});
	}, [
		params.selectedDrugId,
		params.patientWeightKg,
		params.patientAgeYears,
		params.asaStatus,
		params.isCardioRisk,
		params.hasSulfiteAllergy,
		params.hasBronchialAsthma,
		params.isPregnantOrLactating,
		params.techniqueId,
	]);

	return {
		singleCarpuleResult,
		maxSafeCarpules: singleCarpuleResult.maxSafeCarpulesCount,
	};
}
