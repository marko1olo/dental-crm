import type { Dispatch, SetStateAction } from 'react';
import type { AnestheticDrugId, AnestheticDrugInfo, InjectionTechniqueId } from '../anesthesiaCatalog';
import type { AnesthesiaCalculationResult, AsaPhysicalStatus } from '../anesthesiaEngine';

export interface UseAnesthesiaApplyActionProps {
	disabled: boolean;
	patientId?: string | undefined;
	visitId?: string | undefined;
	patientWeightKg: number;
	patientAgeYears: number;
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
	hasLidocaineAllergy?: boolean | undefined;
	hasArticaineAllergy?: boolean | undefined;
	targetToothNumberFdi?: number | string | undefined;
	servicePriceRub?: number | undefined;
	selectedDrugId: AnestheticDrugId;
	selectedDrugInfo: AnestheticDrugInfo;
	techniqueId: InjectionTechniqueId;
	setSessionInjectedCarpules: Dispatch<SetStateAction<number>>;
	showQuickToast: (msg: string, durationMs?: number | undefined) => void;
	onApplyAnesthesia?: ((diaryEntry: string, result: AnesthesiaCalculationResult) => void) | undefined;
}

export interface AnesthesiaConflictCheckParams {
	targetDrugId: AnestheticDrugId;
	drugInfo: AnestheticDrugInfo;
	carpulesCount: number;
	isCardioRisk: boolean;
	hasLidocaineAllergy?: boolean | undefined;
	hasArticaineAllergy?: boolean | undefined;
	result: AnesthesiaCalculationResult;
	bypassCheck: boolean;
}

export interface AnesthesiaConflictCheckResult {
	diaryEntry: string;
	toastMessage: string;
	toastDurationMs: number;
}

export function resolveAnesthesiaApplicationConflicts(
	params: AnesthesiaConflictCheckParams,
): AnesthesiaConflictCheckResult {
	const {
		targetDrugId,
		drugInfo,
		carpulesCount,
		isCardioRisk,
		hasLidocaineAllergy,
		hasArticaineAllergy,
		result,
		bypassCheck,
	} = params;

	const isCardioConflict =
		isCardioRisk && (targetDrugId === 'articaine_1_100k' || targetDrugId === 'lidocaine_1_100k');
	const isLidocaineAllergyConflict =
		Boolean(hasLidocaineAllergy) &&
		(targetDrugId === 'lidocaine_1_100k' || targetDrugId === 'lidocaine_plain');
	const isArticaineAllergyConflict =
		Boolean(hasArticaineAllergy) &&
		(targetDrugId === 'articaine_1_100k' || targetDrugId === 'articaine_1_200k');
	const isCriticalConflict =
		result.contraindicationsTriggered.length > 0 || (result.isOverdose && carpulesCount > 2.0);

	const diaryEntry =
		bypassCheck || isCardioConflict || isCriticalConflict || isLidocaineAllergyConflict || isArticaineAllergyConflict
			? `${result.diaryEntryRu} (Введено по клиническому решению лечащего врача)`
			: result.diaryEntryRu;

	let toastMessage = `Зафиксировано: ${drugInfo.tradeNamesRu[0]} ${(carpulesCount * 1.7).toFixed(1)} мл (${carpulesCount} карп.) в медицинскую карту`;
	let toastDurationMs = 3500;

	if (isLidocaineAllergyConflict) {
		toastMessage = `Зафиксировано (Аллергия на лидокаин): ${drugInfo.tradeNamesRu[0]} ${(carpulesCount * 1.7).toFixed(1)} мл (${carpulesCount} карп.) по решению врача`;
		toastDurationMs = 4000;
	} else if (isArticaineAllergyConflict) {
		toastMessage = `Зафиксировано (Аллергия на артикаин): ${drugInfo.tradeNamesRu[0]} ${(carpulesCount * 1.7).toFixed(1)} мл (${carpulesCount} карп.) по решению врача`;
		toastDurationMs = 4000;
	} else if (isCardioConflict) {
		toastMessage = `Зафиксировано (ССЗ риск): ${drugInfo.tradeNamesRu[0]} ${(carpulesCount * 1.7).toFixed(1)} мл (${carpulesCount} карп.) по решению врача`;
		toastDurationMs = 4000;
	}

	return { diaryEntry, toastMessage, toastDurationMs };
}
