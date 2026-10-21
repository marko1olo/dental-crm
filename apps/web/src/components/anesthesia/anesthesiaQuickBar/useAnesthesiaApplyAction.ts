import { useRef } from 'react';
import { type AnestheticDrugId, DENTAL_ANESTHETICS } from '../anesthesiaCatalog';
import { calculateAnesthesiaSafety, resolveClinicalDefaultWeightKg } from '../anesthesiaEngine';
import { persistAnesthesiaLog } from './anesthesiaApiPersistence';
import {
	type UseAnesthesiaApplyActionProps,
	resolveAnesthesiaApplicationConflicts,
} from './anesthesiaConflictResolver';

export type { UseAnesthesiaApplyActionProps };

export function useAnesthesiaApplyAction({
	disabled,
	patientId,
	visitId,
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
	hasLidocaineAllergy,
	hasArticaineAllergy,
	targetToothNumberFdi,
	servicePriceRub,
	selectedDrugId,
	selectedDrugInfo,
	techniqueId,
	setSessionInjectedCarpules,
	showQuickToast,
	onApplyAnesthesia,
}: UseAnesthesiaApplyActionProps) {
	const inFlightRef = useRef(false);

	const handleApplyCarpules = (
		carpulesCount: number,
		bypassCheck = false,
		overrideDrugId?: AnestheticDrugId,
	) => {
		if (disabled || inFlightRef.current) return;
		inFlightRef.current = true;

		try {
			const targetDrugId = overrideDrugId ?? selectedDrugId;
			const drugInfo = DENTAL_ANESTHETICS[targetDrugId] ?? selectedDrugInfo;
			const effectiveWeight = resolveClinicalDefaultWeightKg(patientWeightKg, patientAgeYears, patientAgeYears < 18);

			const result = calculateAnesthesiaSafety({
				drugId: targetDrugId,
				carpulesCount,
				patientWeightKg: effectiveWeight,
				patientAgeYears,
				asaStatus,
				hasCardiovascularRisk: isCardioRisk,
				hasHypertension: Boolean(hasHypertension),
				hasCardiacArrhythmia: Boolean(hasCardiacArrhythmia),
				hasIschemicHeartDisease: Boolean(hasIschemicHeartDisease),
				hasMyocardialInfarctionHistory: Boolean(hasMyocardialInfarctionHistory),
				takesBetaBlockers: Boolean(takesBetaBlockers),
				hasSulfiteAllergy: Boolean(hasSulfiteAllergy),
				hasBronchialAsthma: Boolean(hasBronchialAsthma),
				isPregnantOrLactating: Boolean(isPregnantOrLactating),
				techniqueId,
				needleType: 'g30_short_21mm',
				targetToothNumberFdi,
				aspirationNegativeConfirmed: true,
			});

			setSessionInjectedCarpules((prev) => prev + carpulesCount);

			const { diaryEntry, toastMessage, toastDurationMs } = resolveAnesthesiaApplicationConflicts({
				targetDrugId,
				drugInfo,
				carpulesCount,
				isCardioRisk,
				hasLidocaineAllergy: Boolean(hasLidocaineAllergy),
				hasArticaineAllergy: Boolean(hasArticaineAllergy),
				result,
				bypassCheck,
			});

			persistAnesthesiaLog({
				patientId,
				visitId,
				drugId: targetDrugId,
				techniqueId,
				carpulesCount,
				patientWeightKg,
				patientAgeYears,
				isCardioRisk,
				targetToothNumberFdi,
				diaryEntry,
			});

			if (typeof window !== 'undefined') {
				const code804n = techniqueId?.includes('mandibular') ? 'A11.07.011' : 'A11.07.010';
				const unitPrice = servicePriceRub ?? 950;
				const priceRub = unitPrice * Math.ceil(carpulesCount);
				const drugName = drugInfo?.tradeNamesRu?.[0] ?? drugInfo?.activeSubstanceRu ?? 'Артикаин';
				window.dispatchEvent(new CustomEvent('dente-add-services-to-invoice', {
					detail: {
						service: {
							id: `anes-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
							title: `Анестезия местная (${drugName}) — ${carpulesCount} карп.`,
							code804n,
							priceRub,
							amountKopecks: priceRub * 100,
							quantity: Math.ceil(carpulesCount),
						},
					},
				}));
			}

			onApplyAnesthesia?.(diaryEntry, result);
			showQuickToast(toastMessage, toastDurationMs);
		} finally {
			setTimeout(() => {
				inFlightRef.current = false;
			}, 300);
		}
	};

	return { handleApplyCarpules, inFlightRef };
}
