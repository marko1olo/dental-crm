import { useState, useRef, useEffect } from 'react';
import type { AnestheticDrugId, InjectionTechniqueId } from '../anesthesiaCatalog';
import { resolveClinicalDefaultWeightKg } from '../anesthesiaEngine';
import type { SafetyWarningState } from './types';

export interface UseAnesthesiaQuickBarStateProps {
	initialWeightKg?: number | null | undefined;
	patientAgeYears?: number | undefined;
	hasCardiovascularRisk?: boolean | undefined;
	hasHypertension?: boolean | undefined;
	hasCardiacArrhythmia?: boolean | undefined;
	hasIschemicHeartDisease?: boolean | undefined;
	hasMyocardialInfarctionHistory?: boolean | undefined;
	takesBetaBlockers?: boolean | undefined;
	hasSulfiteAllergy?: boolean | undefined;
	hasBronchialAsthma?: boolean | undefined;
	hasLidocaineAllergy?: boolean | undefined;
	hasArticaineAllergy?: boolean | undefined;
}

export function useAnesthesiaQuickBarState({
	initialWeightKg,
	patientAgeYears = 35,
	hasCardiovascularRisk = false,
	hasHypertension = false,
	hasCardiacArrhythmia = false,
	hasIschemicHeartDisease = false,
	hasMyocardialInfarctionHistory = false,
	takesBetaBlockers = false,
	hasSulfiteAllergy = false,
	hasBronchialAsthma = false,
	hasLidocaineAllergy = false,
	hasArticaineAllergy = false,
}: UseAnesthesiaQuickBarStateProps) {
	const defaultWeight = resolveClinicalDefaultWeightKg(
		initialWeightKg,
		patientAgeYears,
		patientAgeYears < 18,
	);
	const [customWeightKg, setCustomWeightKg] = useState<number | null>(null);
	const patientWeightKg = customWeightKg ?? defaultWeight;
	const setPatientWeightKg = (w: number) => setCustomWeightKg(w);

	const isCardioRisk = Boolean(
		hasCardiovascularRisk ||
		hasHypertension ||
		hasCardiacArrhythmia ||
		hasIschemicHeartDisease ||
		hasMyocardialInfarctionHistory ||
		takesBetaBlockers,
	);

	const [sessionInjectedCarpules, setSessionInjectedCarpules] = useState<number>(0);
	const [selectedCarpulesCount, setSelectedCarpulesCount] = useState<number>(1.0);

	const [selectedDrugId, setSelectedDrugId] = useState<AnestheticDrugId>(() => {
		if (hasLidocaineAllergy || hasArticaineAllergy) return 'mepivacaine_plain';
		if (hasSulfiteAllergy || hasBronchialAsthma) return 'mepivacaine_plain';
		if (isCardioRisk) return 'mepivacaine_plain';
		return 'articaine_1_100k';
	});

	const [techniqueId, setTechniqueId] = useState<InjectionTechniqueId>('infiltration');
	const [activeToastMessage, setActiveToastMessage] = useState<string | null>(null);
	const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const showQuickToast = (msg: string, durationMs = 3500) => {
		if (toastTimerRef.current) {
			clearTimeout(toastTimerRef.current);
		}
		setActiveToastMessage(msg);
		toastTimerRef.current = setTimeout(() => {
			toastTimerRef.current = null;
			setActiveToastMessage(null);
		}, durationMs);
	};

	useEffect(() => {
		return () => {
			if (toastTimerRef.current) {
				clearTimeout(toastTimerRef.current);
				toastTimerRef.current = null;
			}
		};
	}, []);

	const [safetyWarning, setSafetyWarning] = useState<SafetyWarningState | null>(null);

	return {
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
	};
}
