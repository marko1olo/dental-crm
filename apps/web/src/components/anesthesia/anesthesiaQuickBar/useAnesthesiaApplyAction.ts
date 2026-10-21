import { useRef } from "react";
import {
	type AnestheticDrugId,
	DENTAL_ANESTHETICS,
} from "../anesthesiaCatalog";
import {
	calculateAnesthesiaSafety,
	resolveClinicalDefaultWeightKg,
} from "../anesthesiaEngine";
import { persistAnesthesiaLog } from "./anesthesiaApiPersistence";
import {
	resolveAnesthesiaApplicationConflicts,
	type UseAnesthesiaApplyActionProps,
} from "./anesthesiaConflictResolver";
import { dispatchAnesthesiaInvoiceEvent } from "./anesthesiaInvoiceEvent";

export type { UseAnesthesiaApplyActionProps };

export function useAnesthesiaApplyAction(props: UseAnesthesiaApplyActionProps) {
	const inFlightRef = useRef(false);

	const handleApplyCarpules = (
		carpulesCount: number,
		bypassCheck = false,
		overrideDrugId?: AnestheticDrugId,
	) => {
		if (props.disabled || inFlightRef.current) return;
		inFlightRef.current = true;

		try {
			const targetDrugId = overrideDrugId ?? props.selectedDrugId;
			const drugInfo =
				DENTAL_ANESTHETICS[targetDrugId] ?? props.selectedDrugInfo;
			const effectiveWeight = resolveClinicalDefaultWeightKg(
				props.patientWeightKg,
				props.patientAgeYears,
				props.patientAgeYears < 18,
			);

			const result = calculateAnesthesiaSafety({
				drugId: targetDrugId,
				carpulesCount,
				patientWeightKg: effectiveWeight,
				patientAgeYears: props.patientAgeYears,
				asaStatus: props.asaStatus,
				hasCardiovascularRisk: props.isCardioRisk,
				hasHypertension: Boolean(props.hasHypertension),
				hasCardiacArrhythmia: Boolean(props.hasCardiacArrhythmia),
				hasIschemicHeartDisease: Boolean(props.hasIschemicHeartDisease),
				hasMyocardialInfarctionHistory: Boolean(
					props.hasMyocardialInfarctionHistory,
				),
				takesBetaBlockers: Boolean(props.takesBetaBlockers),
				hasSulfiteAllergy: Boolean(props.hasSulfiteAllergy),
				hasBronchialAsthma: Boolean(props.hasBronchialAsthma),
				isPregnantOrLactating: Boolean(props.isPregnantOrLactating),
				techniqueId: props.techniqueId,
				needleType: "g30_short_21mm",
				targetToothNumberFdi: props.targetToothNumberFdi,
				aspirationNegativeConfirmed: true,
			});

			props.setSessionInjectedCarpules((prev) => prev + carpulesCount);

			const { diaryEntry, toastMessage, toastDurationMs } =
				resolveAnesthesiaApplicationConflicts({
					targetDrugId,
					drugInfo,
					carpulesCount,
					isCardioRisk: props.isCardioRisk,
					hasLidocaineAllergy: Boolean(props.hasLidocaineAllergy),
					hasArticaineAllergy: Boolean(props.hasArticaineAllergy),
					result,
					bypassCheck,
				});

			persistAnesthesiaLog({
				patientId: props.patientId,
				visitId: props.visitId,
				drugId: targetDrugId,
				techniqueId: props.techniqueId,
				carpulesCount,
				patientWeightKg: props.patientWeightKg,
				patientAgeYears: props.patientAgeYears,
				isCardioRisk: props.isCardioRisk,
				targetToothNumberFdi: props.targetToothNumberFdi,
				diaryEntry,
			});

			const drugName =
				drugInfo?.tradeNamesRu?.[0] ??
				drugInfo?.activeSubstanceRu ??
				"Артикаин";

			dispatchAnesthesiaInvoiceEvent({
				servicePriceRub: props.servicePriceRub,
				carpulesCount,
				drugName,
				techniqueId: props.techniqueId,
			});

			props.onApplyAnesthesia?.(diaryEntry, result);
			props.showQuickToast(toastMessage, toastDurationMs);
		} finally {
			setTimeout(() => {
				inFlightRef.current = false;
			}, 300);
		}
	};

	return { handleApplyCarpules, inFlightRef };
}
