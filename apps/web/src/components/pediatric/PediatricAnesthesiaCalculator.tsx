import React, { useCallback, useEffect, useMemo, useState } from "react";
import { estimatePediatricWeightKg } from "@dental/shared";
import type { SomaticRiskProfile } from "../visit/anesthesiaCalculatorEngine";
import { showToast } from "../GlobalToast";
import {
	type PediatricAnestheticDrugId,
	type PediatricAnesthesiaCalculationResult,
	PEDIATRIC_ANESTHETIC_SPECS,
	checkPediatricAnesthesiaContraindications,
	calculatePediatricAnesthesia,
} from "./pediatricAnesthesiaEngine";
import { PediatricWeightQuickChips } from "./PediatricWeightQuickChips";
import { PediatricAnesthesiaQuickSelector } from "./PediatricAnesthesiaQuickSelector";

export * from "./pediatricAnesthesiaEngine";
export * from "./PediatricWeightQuickChips";
export * from "./PediatricAnesthesiaQuickSelector";

export interface PediatricAnesthesiaCalculatorProps {
	readonly initialWeightKg?: number | undefined;
	readonly initialCarpules?: number | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly somaticProfile?: SomaticRiskProfile | undefined;
	readonly allergies?: string | undefined;
	readonly onCalculationChange?: ((result: PediatricAnesthesiaCalculationResult) => void) | undefined;
	readonly onApplyToProtocol?: ((formattedText: string, result: PediatricAnesthesiaCalculationResult) => void) | undefined;
	readonly className?: string | undefined;
}

export const PediatricAnesthesiaCalculator: React.FC<PediatricAnesthesiaCalculatorProps> = ({
	initialWeightKg, initialCarpules = 1.5, patientAgeYears = 6, somaticProfile,
	allergies, onCalculationChange, onApplyToProtocol, className = "",
}) => {
	const resolvedInitialWeight = useMemo(() => {
		if (typeof initialWeightKg === "number" && initialWeightKg > 0) return initialWeightKg;
		return estimatePediatricWeightKg(patientAgeYears);
	}, [initialWeightKg, patientAgeYears]);

	const { isArticaineContraindicated, isMepivacaineContraindicated, contraindicationReasonRu } = useMemo(
		() => checkPediatricAnesthesiaContraindications(somaticProfile, allergies),
		[somaticProfile, allergies],
	);

	const [selectedDrugId, setSelectedDrugId] = useState<PediatricAnestheticDrugId>(() => {
		return isArticaineContraindicated && !isMepivacaineContraindicated ? "mepivacaine_3" : "articaine_4";
	});

	useEffect(() => {
		if (isArticaineContraindicated && !isMepivacaineContraindicated && selectedDrugId === "articaine_4") {
			setSelectedDrugId("mepivacaine_3");
		}
	}, [isArticaineContraindicated, isMepivacaineContraindicated, selectedDrugId]);

	const [weightKg, setWeightKg] = useState<number>(resolvedInitialWeight);
	useEffect(() => setWeightKg(resolvedInitialWeight), [resolvedInitialWeight]);
	const [carpules, setCarpules] = useState<number>(initialCarpules);

	const calculation = useMemo(() => {
		return calculatePediatricAnesthesia({
			drug: PEDIATRIC_ANESTHETIC_SPECS[selectedDrugId], selectedDrugId,
			weightKg, carpules, patientAgeYears,
			articaineContraindicated: isArticaineContraindicated,
			mepivacaineContraindicated: isMepivacaineContraindicated,
		});
	}, [selectedDrugId, weightKg, carpules, patientAgeYears, isArticaineContraindicated, isMepivacaineContraindicated]);

	useEffect(() => { onCalculationChange?.(calculation); }, [calculation, onCalculationChange]);

	const handleApplyAnesthesia = useCallback(() => {
		onApplyToProtocol?.(calculation.formattedClinicalNote, calculation);
		if (calculation.isContraindicated) {
			showToast(`Внимание: ${calculation.contraindicationReasonRu} (зафиксировано в карте)`, "warning", 4000);
		} else if (calculation.isOverdose) {
			showToast(`Внимание: превышение расчетной дозы (${calculation.totalDoseAdministeredMg} мг). Зафиксировано.`, "warning", 4000);
		} else {
			showToast(`Анестезия ${calculation.drug.nameRu} (${calculation.carpulesAdministered} карп.) внесена в карту`, "success", 2500);
		}
	}, [calculation, onApplyToProtocol]);

	const handleSetMaxSafeDose = useCallback(() => {
		const safe = Math.max(0.25, Math.floor(calculation.maxSafeCarpulesCount * 4) / 4);
		setCarpules(safe);
		showToast(`Установлена безопасная доза: ${safe} карп.`, "info", 2000);
	}, [calculation.maxSafeCarpulesCount]);

	return (
		<div className={`rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-3 sm:p-4 shadow-xs space-y-3 ${className}`.trim()} data-testid="pediatric-anesthesia-calculator">
			<PediatricWeightQuickChips weightKg={weightKg} onWeightChange={setWeightKg} patientAgeYears={patientAgeYears} />
			<PediatricAnesthesiaQuickSelector
				selectedDrugId={selectedDrugId} onSelectDrugId={setSelectedDrugId}
				carpules={carpules} onSelectCarpules={setCarpules} calculation={calculation}
				isArticaineContraindicated={isArticaineContraindicated} isMepivacaineContraindicated={isMepivacaineContraindicated}
				onSetMaxSafeDose={handleSetMaxSafeDose} onApplyAnesthesia={handleApplyAnesthesia}
			/>
		</div>
	);
};

export default PediatricAnesthesiaCalculator;
