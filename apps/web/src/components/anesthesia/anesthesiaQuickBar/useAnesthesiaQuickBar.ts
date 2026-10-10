import { useState, useMemo, useRef, useEffect } from "react";
import {
	type AnestheticDrugId,
	DENTAL_ANESTHETICS,
	type InjectionTechniqueId,
} from "../anesthesiaCatalog";
import {
	calculateAnesthesiaSafety,
	resolveClinicalDefaultWeightKg,
	type AsaPhysicalStatus,
} from "../anesthesiaEngine";
import { STANDARD_ANESTHESIA_NORM_PRESET_RU } from "../../../lib/clinicalProtocols043";
import type {
	AnesthesiaQuickBarProps,
	SafetyWarningState,
} from "./types";

export function useAnesthesiaQuickBar({
	patientWeightKg: initialWeightKg,
	patientAgeYears = 35,
	hasCardiovascularRisk = false,
	hasHypertension = false,
	hasCardiacArrhythmia = false,
	hasIschemicHeartDisease = false,
	hasMyocardialInfarctionHistory = false,
	takesBetaBlockers = false,
	hasSulfiteAllergy = false,
	hasBronchialAsthma = false,
	isPregnantOrLactating = false,
	targetToothNumberFdi,
	onApplyAnesthesia,
	onDisposalCarpules,
	disabled = false,
}: AnesthesiaQuickBarProps) {
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
		if (hasSulfiteAllergy || hasBronchialAsthma) return "mepivacaine_plain";
		if (isCardioRisk) return "mepivacaine_plain";
		return "articaine_1_200k";
	});
	const [techniqueId, setTechniqueId] = useState<InjectionTechniqueId>("infiltration");
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

	const asaStatus: AsaPhysicalStatus = isCardioRisk ? "asa_3" : "asa_1";

	// Live calculation for 1 carpule (1.7 ml)
	const singleCarpuleResult = useMemo(() => {
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
			hasSulfiteAllergy,
			hasBronchialAsthma,
			isPregnantOrLactating,
			techniqueId,
			needleType: "g30_short_21mm",
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

	const selectedDrugInfo = DENTAL_ANESTHETICS[selectedDrugId] ?? DENTAL_ANESTHETICS.articaine_1_200k;
	const maxSafeCarpules = singleCarpuleResult.maxSafeCarpulesCount;

	const handleApplyCarpules = (
		carpulesCount: number,
		bypassCheck = false,
		overrideDrugId?: AnestheticDrugId,
	) => {
		if (disabled) return;

		const targetDrugId = overrideDrugId ?? selectedDrugId;
		const drugInfo = DENTAL_ANESTHETICS[targetDrugId] ?? selectedDrugInfo;

		const effectiveWeight = resolveClinicalDefaultWeightKg(
			patientWeightKg,
			patientAgeYears,
			patientAgeYears < 18,
		);

		const result = calculateAnesthesiaSafety({
			drugId: targetDrugId,
			carpulesCount,
			patientWeightKg: effectiveWeight,
			patientAgeYears,
			asaStatus,
			hasCardiovascularRisk: isCardioRisk,
			hasHypertension,
			hasCardiacArrhythmia,
			hasIschemicHeartDisease,
			hasMyocardialInfarctionHistory,
			takesBetaBlockers,
			hasSulfiteAllergy,
			hasBronchialAsthma,
			isPregnantOrLactating,
			techniqueId,
			needleType: "g30_short_21mm",
			targetToothNumberFdi,
			aspirationNegativeConfirmed: true,
		});

		// Check epinephrine 1:100 000 with cardio risk (Mandate 8e: Doctor Autonomy - informative, non-blocking)
		const isCardioConflict = isCardioRisk && (targetDrugId === "articaine_1_100k" || targetDrugId === "lidocaine_1_100k");
		const isCriticalConflict = result.contraindicationsTriggered.length > 0 || (result.isOverdose && carpulesCount > 2.0);

		setSessionInjectedCarpules((prev) => prev + carpulesCount);

		const diaryEntry = (bypassCheck || isCardioConflict || isCriticalConflict)
			? `${result.diaryEntryRu} (Введено по клиническому решению врача согласно ст. 70 Федерального закона № 323-ФЗ)`
			: result.diaryEntryRu;

		onApplyAnesthesia?.(diaryEntry, result);
		if (isCardioConflict) {
			showQuickToast(
				`Зафиксировано (ССЗ риск): ${drugInfo.tradeNamesRu[0]} ${(carpulesCount * 1.7).toFixed(1)} мл (${carpulesCount} карп.) по решению врача`,
				4000,
			);
		} else {
			showQuickToast(
				`Зафиксировано: ${drugInfo.tradeNamesRu[0]} ${(carpulesCount * 1.7).toFixed(1)} мл (${carpulesCount} карп.) в протокол 043/у`,
				3500,
			);
		}
	};

	const handleNurseQuickDisposal = (carpulesCount = 1.0) => {
		if (disabled) return;
		showQuickToast(
			`Списана карпула ${selectedDrugInfo.tradeNamesRu[0]} (${carpulesCount} шт.): отходы Класса Б, списание по FEFO (расход сверх остатка)`,
			4000,
		);
		if (onDisposalCarpules) {
			onDisposalCarpules(carpulesCount, selectedDrugId);
		}
	};

	const handleNursePacketDisposal = () => {
		if (disabled) return;
		showQuickToast(
			"Списана 1 карпула Артикаин 1:100 000 + игла 30G: списание по FEFO (расход сверх остатка)",
			4000,
		);
		if (onDisposalCarpules) {
			onDisposalCarpules(1.0, "articaine_1_100k");
		}
	};

	const handleApplyStandardNormPreset = () => {
		if (disabled) return;
		const effectiveWeight = resolveClinicalDefaultWeightKg(
			patientWeightKg,
			patientAgeYears,
			patientAgeYears < 18,
		);
		const result = calculateAnesthesiaSafety({
			drugId: "articaine_1_100k",
			carpulesCount: 1.0,
			patientWeightKg: effectiveWeight,
			patientAgeYears,
			asaStatus: "asa_1",
			hasCardiovascularRisk: false,
			hasSulfiteAllergy: false,
			hasBronchialAsthma: false,
			isPregnantOrLactating: false,
			techniqueId: "infiltration",
			needleType: "g30_short_21mm",
			targetToothNumberFdi,
			aspirationNegativeConfirmed: true,
		});

		const normDiaryText = `Инфильтрационная/проводниковая анестезия: ${STANDARD_ANESTHESIA_NORM_PRESET_RU}`;
		onApplyAnesthesia?.(normDiaryText, result);
		showQuickToast("Анестезия: протокол сформирован", 3500);
	};

	const handleApplyUltracainForteCombined = () => {
		if (disabled) return;
		setSelectedDrugId("articaine_1_100k");
		setTechniqueId("mandibular_torus");
		const effectiveWeight = resolveClinicalDefaultWeightKg(
			patientWeightKg,
			patientAgeYears,
			patientAgeYears < 18,
		);
		const result = calculateAnesthesiaSafety({
			drugId: "articaine_1_100k",
			carpulesCount: 1.0,
			patientWeightKg: effectiveWeight,
			patientAgeYears,
			asaStatus,
			hasCardiovascularRisk,
			hasSulfiteAllergy,
			hasBronchialAsthma,
			isPregnantOrLactating,
			techniqueId,
			needleType: "g27_long_35mm",
			targetToothNumberFdi,
			aspirationNegativeConfirmed: true,
		});

		const diaryText =
			"Комбинированная мандибулярная проводниковая и инфильтрационная анестезия: Ультракаин Д-С Форте 1:100 000 (1.7 мл). Двухплоскостная аспирация отрицательная. Обезболивание глубокое, онемение половины нижней губы и языка.";
		onApplyAnesthesia?.(diaryText, result);
		showQuickToast("Мандибулярная + инфильтрационная (Ультракаин Форте 1.7 мл): протокол сформирован", 3500);
	};

	const handleApplySeptanestInfiltration = () => {
		if (disabled) return;
		setSelectedDrugId("articaine_1_100k");
		setTechniqueId("infiltration");
		const effectiveWeight = resolveClinicalDefaultWeightKg(
			patientWeightKg,
			patientAgeYears,
			patientAgeYears < 18,
		);
		const result = calculateAnesthesiaSafety({
			drugId: "articaine_1_100k",
			carpulesCount: 1.0,
			patientWeightKg: effectiveWeight,
			patientAgeYears,
			asaStatus,
			hasCardiovascularRisk,
			hasSulfiteAllergy,
			hasBronchialAsthma,
			isPregnantOrLactating,
			techniqueId: "infiltration",
			needleType: "g30_short_21mm",
			targetToothNumberFdi,
			aspirationNegativeConfirmed: true,
		});

		const diaryText =
			"Инфильтрационная наднадкостничная анестезия: Септанест 1:100 000 (1.7 мл). Аспирационная проба отрицательная. Обезболивание глубокое, аллергических реакций нет.";
		onApplyAnesthesia?.(diaryText, result);
		showQuickToast("Инфильтрационная анестезия Септанест (1.7 мл): протокол сформирован", 3500);
	};

	const handleNurseSeptanestDisposal = () => {
		if (disabled) return;
		showQuickToast(
			"Списана 1 карпула Септанест 1:100 000 (1.7 мл): отходы Класса Б, списание выполнено",
			4000,
		);
		if (onDisposalCarpules) {
			onDisposalCarpules(1.0, "articaine_1_100k");
		}
	};

	const handleSelectDrug = (drugId: AnestheticDrugId) => {
		setSelectedDrugId(drugId);
		setSafetyWarning(null);
	};

	const handleDismissWarning = () => {
		setSafetyWarning(null);
	};

	const handleConfirmWarningOverride = (count: number) => {
		handleApplyCarpules(count, true);
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
		handleDismissWarning,
		handleConfirmWarningOverride,
		handleApplyCarpules,
		handleNurseQuickDisposal,
		handleNursePacketDisposal,
		handleApplyStandardNormPreset,
		handleApplyUltracainForteCombined,
		handleApplySeptanestInfiltration,
		handleNurseSeptanestDisposal,
	};
}
