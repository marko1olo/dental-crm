import { type AnestheticDrugId, DENTAL_ANESTHETICS } from '../anesthesiaCatalog';
import type { AsaPhysicalStatus } from '../anesthesiaEngine';
import type { AnesthesiaQuickBarProps } from './types';
import { useAnesthesiaQuickBarState } from './useAnesthesiaQuickBarState';
import { useAnesthesiaApplyAction } from './useAnesthesiaApplyAction';
import { useAnesthesiaDisposalActions } from './useAnesthesiaDisposalActions';
import { useAnesthesiaCorePresets } from './useAnesthesiaCorePresets';
import { useAnesthesiaTargetedPresets } from './useAnesthesiaTargetedPresets';
import { useSingleCarpuleCalculation } from './useSingleCarpuleCalculation';

export function useAnesthesiaQuickBar(props: AnesthesiaQuickBarProps) {
	const state = useAnesthesiaQuickBarState({ ...props, initialWeightKg: props.patientWeightKg });
	const {
		patientWeightKg, setPatientWeightKg, isCardioRisk,
		sessionInjectedCarpules, setSessionInjectedCarpules,
		selectedCarpulesCount, setSelectedCarpulesCount,
		selectedDrugId, setSelectedDrugId,
		techniqueId, setTechniqueId,
		activeToastMessage, showQuickToast,
		safetyWarning, setSafetyWarning,
	} = state;

	const asaStatus: AsaPhysicalStatus = isCardioRisk ? 'asa_3' : 'asa_1';

	const singleCarpuleResult = useSingleCarpuleCalculation({
		...props,
		selectedDrugId,
		patientWeightKg,
		patientAgeYears: props.patientAgeYears ?? 35,
		asaStatus,
		isCardioRisk,
		techniqueId,
	});

	const selectedDrugInfo = DENTAL_ANESTHETICS[selectedDrugId] ?? DENTAL_ANESTHETICS.articaine_1_200k;
	const maxSafeCarpules = singleCarpuleResult.maxSafeCarpulesCount;

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

	const presetProps = {
		...props,
		disabled: Boolean(props.disabled),
		patientWeightKg,
		patientAgeYears: props.patientAgeYears ?? 35,
		asaStatus,
		isCardioRisk,
		hasCardiovascularRisk: Boolean(props.hasCardiovascularRisk || isCardioRisk),
		hasSulfiteAllergy: Boolean(props.hasSulfiteAllergy),
		hasBronchialAsthma: Boolean(props.hasBronchialAsthma),
		isPregnantOrLactating: Boolean(props.isPregnantOrLactating),
		setSelectedDrugId,
		setTechniqueId,
		showQuickToast,
	};

	const corePresets = useAnesthesiaCorePresets(presetProps);
	const targetedPresets = useAnesthesiaTargetedPresets(presetProps);

	const handleSelectDrug = (drugId: AnestheticDrugId) => {
		setSelectedDrugId(drugId);
		setSafetyWarning(null);
		if (props.hasLidocaineAllergy && (drugId === 'lidocaine_1_100k' || drugId === 'lidocaine_plain')) {
			showQuickToast('Внимание: У пациента зафиксирована аллергия на Лидокаин! Рекомендован Скандонест 3%', 4500);
		} else if (props.hasArticaineAllergy && (drugId === 'articaine_1_100k' || drugId === 'articaine_1_200k')) {
			showQuickToast('Внимание: У пациента зафиксирована аллергия на Артикаин! Рекомендован Скандонест 3%', 4500);
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
		safetyWarning,
		handleSelectDrug,
		handleDismissWarning: () => setSafetyWarning(null),
		handleConfirmWarningOverride: (count: number) => handleApplyCarpules(count, true),
		handleApplyCarpules,
		...disposalActions,
		...corePresets,
		...targetedPresets,
	};
}
