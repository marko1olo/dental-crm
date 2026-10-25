import { useCallback, useMemo, useState } from "react";
import { estimatePediatricWeightKg } from "@dental/shared";
import type { FranklRating } from "../odontogram/pediatricDentitionEngine";
import type { ToothClinicalFinding, PediatricDentitionMode } from "./PediatricTeethChart";
import {
	type PediatricAnestheticDrugId,
	PEDIATRIC_ANESTHETIC_SPECS,
	calculatePediatricAnesthesia,
	checkPediatricAnesthesiaContraindications,
} from "./pediatricAnesthesiaEngine";
import { showToast } from "../GlobalToast";

export interface UsePediatricVisitLogicOptions {
	readonly initialPatientName?: string | undefined;
	readonly initialAgeYears?: number | undefined;
	readonly initialWeightKg?: number | undefined;
	readonly initialFrankl?: FranklRating | undefined;
	readonly initialTooth?: number | undefined;
	readonly allergies?: string | undefined;
	readonly onApplyToProtocol?: ((note: string) => void) | undefined;
}

export function usePediatricVisitLogic(options: UsePediatricVisitLogicOptions = {}) {
	const { initialPatientName = "Юный пациент", initialAgeYears = 6, initialWeightKg, initialFrankl = 3, initialTooth = 54, allergies, onApplyToProtocol } = options;
	const resolvedWeight = useMemo(() => (typeof initialWeightKg === "number" && initialWeightKg > 0 ? initialWeightKg : estimatePediatricWeightKg(initialAgeYears)), [initialWeightKg, initialAgeYears]);

	const [weightKg, setWeightKg] = useState<number>(resolvedWeight);
	const [franklRating, setFranklRating] = useState<FranklRating>(initialFrankl);
	const [activeTooth, setActiveTooth] = useState<number>(initialTooth);
	const [dentitionMode, setDentitionMode] = useState<PediatricDentitionMode>(initialAgeYears >= 6 && initialAgeYears <= 11 ? "mixed" : "primary");
	const [toothFindings, setToothFindings] = useState<Record<number, ToothClinicalFinding>>({});
	const [isDiplomaOpen, setIsDiplomaOpen] = useState<boolean>(false);

	const contraindications = useMemo(() => checkPediatricAnesthesiaContraindications(undefined, allergies), [allergies]);
	const [selectedDrugId, setSelectedDrugId] = useState<PediatricAnestheticDrugId>(() => (contraindications.isArticaineContraindicated && !contraindications.isMepivacaineContraindicated ? "mepivacaine_3" : "articaine_4"));
	const [carpules, setCarpules] = useState<number>(0.5);

	const anesthesiaCalculation = useMemo(() => calculatePediatricAnesthesia({
		drug: PEDIATRIC_ANESTHETIC_SPECS[selectedDrugId], selectedDrugId, weightKg, carpules, patientAgeYears: initialAgeYears,
		articaineContraindicated: contraindications.isArticaineContraindicated, mepivacaineContraindicated: contraindications.isMepivacaineContraindicated,
	}), [selectedDrugId, weightKg, carpules, initialAgeYears, contraindications]);

	const handleApplyIntactNorm = useCallback(() => {
		const primaryTeeth = [51, 52, 53, 54, 55, 61, 62, 63, 64, 65, 71, 72, 73, 74, 75, 81, 82, 83, 84, 85];
		const updated: Record<number, ToothClinicalFinding> = {};
		for (const t of primaryTeeth) updated[t] = "Healthy";
		setToothFindings(updated);
		showToast("Физиологическая норма: все молочные зубы интактны", "success", 2000);
	}, []);

	const handleApplyAnesthesia = useCallback(() => {
		onApplyToProtocol?.(anesthesiaCalculation.formattedClinicalNote);
		showToast(`Анестезия ${anesthesiaCalculation.drug.nameRu} (${carpules} карп.) внесена в карту`, "success", 2000);
	}, [anesthesiaCalculation, carpules, onApplyToProtocol]);

	const generateVisitSummaryNote = useCallback(() => {
		const franklDesc = franklRating === 4 ? "отличное сотрудничество (++" : franklRating === 3 ? "положительное контактное (+)" : franklRating === 2 ? "нерешительное (-)" : "негативное (-- )";
		return [
			`Дневник детского стоматологического приёма (пациент: ${initialPatientName}, ${initialAgeYears} лет, вес: ${weightKg} кг).`,
			`• Поведение ребенка по шкале Франкла: ${franklRating}/4 (${franklDesc}).`,
			`• Молочная зубная формула: осмотрено. Активный зуб: ${activeTooth}.`,
			anesthesiaCalculation.formattedClinicalNote,
			`• Рекомендации: гигиена полости рта, выдан Диплом супергероя за храбрость.`,
		].join("\n");
	}, [initialPatientName, initialAgeYears, weightKg, franklRating, activeTooth, anesthesiaCalculation]);

	return {
		weightKg, setWeightKg, franklRating, setFranklRating, activeTooth, setActiveTooth,
		dentitionMode, setDentitionMode, toothFindings, setToothFindings, isDiplomaOpen, setIsDiplomaOpen,
		selectedDrugId, setSelectedDrugId, carpules, setCarpules, anesthesiaCalculation,
		handleApplyIntactNorm, handleApplyAnesthesia, generateVisitSummaryNote,
	};
}
