import {
	type AnestheticDrugId,
	DENTAL_ANESTHETICS,
} from "../anesthesiaCatalog";
import type { AsaPhysicalStatus } from "../anesthesiaEngine";
import type { AnesthesiaQuickBarProps } from "./types";
import { useAnesthesiaApplyAction } from "./useAnesthesiaApplyAction";
import { useAnesthesiaDisposalActions } from "./useAnesthesiaDisposalActions";
import { useAnesthesiaPresetsCombined } from "./useAnesthesiaPresetsCombined";
import { useAnesthesiaQuickBarState } from "./useAnesthesiaQuickBarState";
import { useAnesthesiaSingleCarpule } from "./useAnesthesiaSingleCarpule";

export function useAnesthesiaQuickBar(props: AnesthesiaQuickBarProps) {
	const state = useAnesthesiaQuickBarState({
		...props,
		initialWeightKg: props.patientWeightKg,
	});
	const {
		patientWeightKg,
		setPatientWeightKg,
		isCardioRisk,
		sessionInjectedCarpules,
		setSessionInjectedCarpules,
		selectedCarpulesCount,
		setSelectedCarpulesCount,
		selectedDrugId,
		setSelectedDrugId,
		techniqueId,
		setTechniqueId,
		activeToastMessage,
		showQuickToast,
		safetyWarning,
		setSafetyWarning,
	} = state;

	const asaStatus: AsaPhysicalStatus = isCardioRisk ? "asa_3" : "asa_1";
	const selectedDrugInfo =
		DENTAL_ANESTHETICS[selectedDrugId] ?? DENTAL_ANESTHETICS.articaine_1_200k;

	const { singleCarpuleResult, maxSafeCarpules } = useAnesthesiaSingleCarpule({
		...props,
		patientWeightKg,
		asaStatus,
		isCardioRisk,
		selectedDrugId,
		techniqueId,
	});

	const { handleApplyCarpules } = useAnesthesiaApplyAction({
		...props,
		disabled: Boolean(props.disabled),
		patientWeightKg,
		patientAgeYears: props.patientAgeYears ?? 35,
		asaStatus,
		isCardioRisk,
		selectedDrugId,
		selectedDrugInfo,
		techniqueId,
		setSessionInjectedCarpules,
		showQuickToast,
	});

	const disposalActions = useAnesthesiaDisposalActions({
		disabled: Boolean(props.disabled),
		visitId: props.visitId,
		selectedDrugId,
		selectedDrugInfo,
		showQuickToast,
		onDisposalCarpules: props.onDisposalCarpules,
	});

	const combinedPresets = useAnesthesiaPresetsCombined({
		props,
		patientWeightKg,
		asaStatus,
		isCardioRisk,
		setSelectedDrugId,
		setTechniqueId,
		showQuickToast,
	});

	const handleSelectDrug = (drugId: AnestheticDrugId) => {
		setSelectedDrugId(drugId);
		setSafetyWarning(null);
		const lidoWarn =
			props.hasLidocaineAllergy && drugId.startsWith("lidocaine");
		const artWarn = props.hasArticaineAllergy && drugId.startsWith("articaine");
		if (lidoWarn || artWarn) {
			const drug = lidoWarn ? "Лидокаин" : "Артикаин";
			showQuickToast(`⚠️ Аллергия на ${drug}! Рекомендован Скандонест 3%`, 4000);
		}
	};

	return {
		patientWeightKg,
		setPatientWeightKg,
		isCardioRisk,
		sessionInjectedCarpules,
		selectedCarpulesCount,
		setSelectedCarpulesCount,
		selectedDrugId,
		setSelectedDrugId,
		selectedDrugInfo,
		techniqueId,
		setTechniqueId,
		singleCarpuleResult,
		maxSafeCarpules,
		activeToastMessage,
		showQuickToast,
		safetyWarning,
		handleSelectDrug,
		handleDismissWarning: () => setSafetyWarning(null),
		handleConfirmWarningOverride: (count: number) =>
			handleApplyCarpules(count, true),
		handleApplyCarpules,
		...disposalActions,
		...combinedPresets,
	};
}
