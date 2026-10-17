import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Droplets, ShieldAlert, AlertOctagon, ShieldCheck } from "lucide-react";
import { showToast } from "../GlobalToast";
import { estimatePediatricWeightKg } from "@dental/shared";
import {
	type PediatricAnestheticDrugId,
	type PediatricAnesthesiaCalculatorProps,
	PEDIATRIC_ANESTHETIC_SPECS,
} from "./anesthesia/pediatricAnesthesiaSpecs";
import { calculatePediatricAnesthesia } from "./anesthesia/pediatricAnesthesiaCalculation";
import { PediatricAnesthesiaHeader } from "./anesthesia/PediatricAnesthesiaHeader";
import { PediatricAnesthesiaDrugSelect } from "./anesthesia/PediatricAnesthesiaDrugSelect";
import { PediatricAnesthesiaDoseControl } from "./anesthesia/PediatricAnesthesiaDoseControl";
import { PediatricAnesthesiaAlerts } from "./anesthesia/PediatricAnesthesiaAlerts";

export * from "./anesthesia/pediatricAnesthesiaSpecs";
export * from "./anesthesia/pediatricAnesthesiaCalculation";

export const PediatricAnesthesiaCalculator: React.FC<PediatricAnesthesiaCalculatorProps> = ({
	initialWeightKg,
	patientAgeYears = 6,
	somaticProfile,
	allergies,
	onCalculationChange,
	onApplyToProtocol,
	className = "",
}) => {
	const resolvedInitialWeight = useMemo(() => {
		if (typeof initialWeightKg === "number" && initialWeightKg > 0) return initialWeightKg;
		return estimatePediatricWeightKg(patientAgeYears);
	}, [initialWeightKg, patientAgeYears]);

	const articaineContraindicated = useMemo(() => {
		if (somaticProfile?.hasArticaineAllergy || somaticProfile?.hasSulfiteAllergy) return true;
		if (somaticProfile?.hasBronchialAsthma || somaticProfile?.hasThyrotoxicosis) return true;
		if (allergies && /артикаин|ультракаин|септанест|убистезин|сульфит|метабисульфит|астма/i.test(allergies)) return true;
		return false;
	}, [somaticProfile, allergies]);

	const mepivacaineContraindicated = useMemo(() => {
		if (somaticProfile?.hasMepivacaineAllergy) return true;
		if (allergies && /мепивакаин|скандонест|мепивастезин/i.test(allergies)) return true;
		return false;
	}, [somaticProfile, allergies]);

	const [selectedDrugId, setSelectedDrugId] = useState<PediatricAnestheticDrugId>(() => {
		return articaineContraindicated && !mepivacaineContraindicated ? "mepivacaine_3" : "articaine_4";
	});

	useEffect(() => {
		if (articaineContraindicated && !mepivacaineContraindicated && selectedDrugId === "articaine_4") {
			setSelectedDrugId("mepivacaine_3");
		}
	}, [articaineContraindicated, mepivacaineContraindicated, selectedDrugId]);

	const [weightKg, setWeightKg] = useState<number>(resolvedInitialWeight);
	useEffect(() => setWeightKg(resolvedInitialWeight), [resolvedInitialWeight]);

	const [carpules, setCarpules] = useState<number>(0.5);
	const drug = PEDIATRIC_ANESTHETIC_SPECS[selectedDrugId];

	const calculation = useMemo(() => calculatePediatricAnesthesia({
		drug,
		selectedDrugId,
		weightKg,
		carpules,
		patientAgeYears,
		articaineContraindicated,
		mepivacaineContraindicated,
	}), [articaineContraindicated, carpules, drug, mepivacaineContraindicated, patientAgeYears, selectedDrugId, weightKg]);

	useEffect(() => {
		onCalculationChange?.(calculation);
	}, [calculation, onCalculationChange]);

	const handleApplyAnesthesia = useCallback(() => {
		onApplyToProtocol?.(calculation.formattedClinicalNote, calculation);
		if (calculation.isContraindicated) {
			showToast(`Внимание: ${calculation.contraindicationReasonRu} (зафиксировано в дневнике визита)`, "warning", 4000);
		} else if (calculation.isOverdose) {
			showToast(`Внимание: превышение расчетной дозы МРД (${calculation.totalDoseAdministeredMg} мг > ${calculation.maxAllowedTotalDoseMg} мг). Зафиксировано в дневнике визита.`, "warning", 4000);
		} else {
			showToast(`Анестезия ${drug.shortLabelRu} (${calculation.carpulesAdministered} карп.) внесена в дневник визита`, "success", 2500);
		}
	}, [calculation, drug.shortLabelRu, onApplyToProtocol]);

	const handleSetMaxSafeDose = useCallback(() => {
		const safeCarpules = Math.floor(calculation.maxSafeCarpulesCount * 4) / 4;
		const nextCarpules = Math.max(0.25, safeCarpules);
		setCarpules(nextCarpules);
		showToast(`Установлена предельная безопасная доза: ${nextCarpules} карп.`, "info", 2000);
	}, [calculation.maxSafeCarpulesCount]);

	return (
		<div
			className={`pediatric-anesthesia-calc rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-3 sm:p-4 shadow-xs ${className}`.trim()}
			data-testid="pediatric-anesthesia-calculator"
		>
			<PediatricAnesthesiaHeader calculation={calculation} />
			<PediatricAnesthesiaDrugSelect selectedDrugId={selectedDrugId} onSelectDrugId={setSelectedDrugId} articaineContraindicated={articaineContraindicated} mepivacaineContraindicated={mepivacaineContraindicated} />
			<PediatricAnesthesiaDoseControl weightKg={weightKg} setWeightKg={setWeightKg} carpules={carpules} setCarpules={setCarpules} calculation={calculation} onSetMaxSafeDose={handleSetMaxSafeDose} />
			<PediatricAnesthesiaAlerts calculation={calculation} onSetMaxSafeDose={handleSetMaxSafeDose} onApplyAnesthesia={handleApplyAnesthesia} />
		</div>
	);
};

export default PediatricAnesthesiaCalculator;
