import { useEffect, useMemo, useState } from "react";
import {
	ALL_PRIMARY_TEETH,
	type CariogramInput,
	DEFAULT_CARIOGRAM_INPUT,
	generatePediatricCariogramDiaryText,
	RESORPTION_STAGE_DEFINITIONS,
	type ResorptionStagePercent,
	calculateCariogramRisk,
	calculateEruptionTimelineByAge,
	type FranklRating,
	calculatePediatricPhysiologicalNorm,
	getPediatricProcedurePreset,
	dispatchPediatricSoapProtocol,
} from "../pediatricDentitionEngine";
import type { ToothData } from "../ToothChart";
import { showToast } from "../GlobalToast";
import {
	type ModalTab,
	UPPER_PRIMARY_TEETH,
	LOWER_PRIMARY_TEETH,
} from "./types";

export interface UsePediatricModalLogicProps {
	isOpen: boolean;
	onClose: () => void;
	teethData?: ToothData[];
	onApplyAgeArch?: (teethNumbers: number[]) => void;
	onUpdateToothResorption?: (toothNumber: number, resorptionStage: ResorptionStagePercent) => void;
	onBatchUpdateResorption?: (updates: { toothNumber: number; resorptionStage: ResorptionStagePercent }[]) => void;
	initialAge?: number;
}

export function usePediatricModalLogic({
	isOpen,
	onClose,
	teethData = [],
	onApplyAgeArch,
	onUpdateToothResorption,
	onBatchUpdateResorption,
	initialAge = 7.5,
}: UsePediatricModalLogicProps) {
	const [activeTab, setActiveTab] = useState<ModalTab>("timeline");
	const [franklRating, setFranklRating] = useState<FranklRating>(3);
	const [isParentMemoModalOpen, setIsParentMemoModalOpen] = useState<boolean>(false);

	// 1. Eruption Timeline State
	const [selectedAge, setSelectedAge] = useState<number>(initialAge);
	const timelineAnalysis = useMemo(
		() => calculateEruptionTimelineByAge(selectedAge),
		[selectedAge],
	);

	// First permanent molars erupt at age ~6 years
	const hasFirstPermanentMolars = selectedAge >= 6.0;

	// Anatomical dental arch models (10 primary columns for 3–5 years, 12 columns for 6–12 years)
	const upperRow = useMemo(() => {
		const pairs: Array<{ primary: number; permanent: number }> = [
			{ primary: 55, permanent: 15 },
			{ primary: 54, permanent: 14 },
			{ primary: 53, permanent: 13 },
			{ primary: 52, permanent: 12 },
			{ primary: 51, permanent: 11 },
			{ primary: 61, permanent: 21 },
			{ primary: 62, permanent: 22 },
			{ primary: 63, permanent: 23 },
			{ primary: 64, permanent: 24 },
			{ primary: 65, permanent: 25 },
		];
		const mid = pairs.map(({ primary, permanent }) => {
			const st = timelineAnalysis.toothStatuses.find((t) => t.predecessorPrimaryFdi === primary);
			return st?.status === "future_permanent" ? permanent : primary;
		});
		return hasFirstPermanentMolars ? [16, ...mid, 26] : mid;
	}, [hasFirstPermanentMolars, timelineAnalysis.toothStatuses]);

	const lowerRow = useMemo(() => {
		const pairs: Array<{ primary: number; permanent: number }> = [
			{ primary: 85, permanent: 45 },
			{ primary: 84, permanent: 44 },
			{ primary: 83, permanent: 43 },
			{ primary: 82, permanent: 42 },
			{ primary: 81, permanent: 41 },
			{ primary: 71, permanent: 31 },
			{ primary: 72, permanent: 32 },
			{ primary: 73, permanent: 33 },
			{ primary: 74, permanent: 34 },
			{ primary: 75, permanent: 35 },
		];
		const mid = pairs.map(({ primary, permanent }) => {
			const st = timelineAnalysis.toothStatuses.find((t) => t.predecessorPrimaryFdi === primary);
			return st?.status === "future_permanent" ? permanent : primary;
		});
		return hasFirstPermanentMolars ? [46, ...mid, 36] : mid;
	}, [hasFirstPermanentMolars, timelineAnalysis.toothStatuses]);

	// 2. Cariogram State
	const [cariogramInput, setCariogramInput] = useState<CariogramInput>(DEFAULT_CARIOGRAM_INPUT);
	const cariogramResult = useMemo(
		() => calculateCariogramRisk(cariogramInput),
		[cariogramInput],
	);

	// 3. Resorption Selected Primary Tooth
	const [selectedPrimaryTooth, setSelectedPrimaryTooth] = useState<number>(51);
	const [selectedResorptionStage, setSelectedResorptionStage] = useState<ResorptionStagePercent>(0);

	const handleInsertCariogramTo043 = () => {
		const teethStatesMap = (teethData ?? []).reduce(
			(acc, t) => ({ ...acc, [t.toothNumber]: t.state }),
			{} as Record<number, string>,
		);
		const text = generatePediatricCariogramDiaryText({
			patientAgeYears: selectedAge,
			cariogramInput,
			teethStates: teethStatesMap,
			franklRating,
		});
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							diagnosisIcd10: "Z01.2",
							statusLocalis: text,
							treatmentDescription: `• Индивидуальный план профилактики кариеса (Шанс избежать: ${cariogramResult.chanceOfAvoidingCariesPercent}%, Риск: ${cariogramResult.riskCategoryNameRu}).\n• Поведение по Франклу: Рейтинг ${franklRating}.\n• ${cariogramResult.preventiveProgram.professionalHygieneRu}\n• ${cariogramResult.preventiveProgram.fluorideVarnishProtocolRu}\n• ${cariogramResult.preventiveProgram.homeCareProtocolRu}\n• ${cariogramResult.preventiveProgram.dietaryGuidanceRu}`,
						},
						mode: "smart_append",
					},
				}),
			);
		} catch {
			// ignore event dispatch error
		}
		showToast(
			"Протокол Cariogram и шкала Франкла успешно перенесены в медицинскую карту!",
			"success",
		);
	};

	const handleApplyPrimaryNorm = () => {
		const norm = calculatePediatricPhysiologicalNorm("primary");
		setSelectedAge(3.0);
		if (onApplyAgeArch) {
			onApplyAgeArch([...norm.teethNumbers]);
		}
		if (onBatchUpdateResorption) {
			const batch = norm.teethNumbers.map((t) => ({
				toothNumber: t,
				resorptionStage: 0 as ResorptionStagePercent,
			}));
			onBatchUpdateResorption(batch);
		}
		dispatchPediatricSoapProtocol({
			diagnosisIcd10: norm.diagnosisIcd10,
			statusLocalis: norm.statusLocalisRu,
			treatmentDescription: norm.treatmentDescriptionRu,
		});
		showToast(
			"1-клик: Применена норма временного прикуса (3 года: 51–85 интактны, кариеса нет, 0% резорбция). Протокол перенесен в дневник!",
			"success",
		);
	};

	const handleApplyFirstMolarNorm = () => {
		const norm = calculatePediatricPhysiologicalNorm("first_molar");
		setSelectedAge(6.0);
		if (onApplyAgeArch) {
			onApplyAgeArch([...norm.teethNumbers]);
		}
		if (onBatchUpdateResorption) {
			const batch = Object.entries(norm.resorptionStages).map(([toothStr, stage]) => ({
				toothNumber: Number(toothStr),
				resorptionStage: stage,
			}));
			onBatchUpdateResorption(batch);
		}
		dispatchPediatricSoapProtocol({
			diagnosisIcd10: norm.diagnosisIcd10,
			statusLocalis: norm.statusLocalisRu,
			treatmentDescription: norm.treatmentDescriptionRu,
		});
		showToast(
			"1-клик: Применена норма прорезывания первых моляров (6 лет: 16, 26, 36, 46 + 20 молочных). Протокол перенесен в дневник!",
			"success",
		);
	};

	const handleApplyEarlyMixedNorm = () => {
		const norm = calculatePediatricPhysiologicalNorm("mixed");
		setSelectedAge(9.0);
		if (onApplyAgeArch) {
			onApplyAgeArch([...norm.teethNumbers]);
		}
		if (onBatchUpdateResorption) {
			const batch = Object.entries(norm.resorptionStages).map(([toothStr, stage]) => ({
				toothNumber: Number(toothStr),
				resorptionStage: stage,
			}));
			onBatchUpdateResorption(batch);
		}
		dispatchPediatricSoapProtocol({
			diagnosisIcd10: norm.diagnosisIcd10,
			statusLocalis: norm.statusLocalisRu,
			treatmentDescription: norm.treatmentDescriptionRu,
		});
		showToast(
			"1-клик: Применена норма сменного прикуса (9 лет: резцы 11..42, 1-е моляры 16..46, молочные 53..85). Протокол перенесен в дневник!",
			"success",
		);
	};

	const handleApplyPermanentNorm = () => {
		const norm = calculatePediatricPhysiologicalNorm("permanent");
		setSelectedAge(12.0);
		if (onApplyAgeArch) {
			onApplyAgeArch([...norm.teethNumbers]);
		}
		if (onBatchUpdateResorption) {
			const batch = ALL_PRIMARY_TEETH.map((t) => ({
				toothNumber: t,
				resorptionStage: 100 as ResorptionStagePercent,
			}));
			onBatchUpdateResorption(batch);
		}
		dispatchPediatricSoapProtocol({
			diagnosisIcd10: norm.diagnosisIcd10,
			statusLocalis: norm.statusLocalisRu,
			treatmentDescription: norm.treatmentDescriptionRu,
		});
		showToast(
			"1-клик: Применена норма постоянного прикуса (12 лет: 28 зубов 17..27, 47..37). Протокол перенесен в дневник!",
			"success",
		);
	};

	const handleApplyProcedurePreset = (presetId: "saforide" | "fissurit" | "pulpotec") => {
		const preset = getPediatricProcedurePreset(presetId);
		dispatchPediatricSoapProtocol({
			diagnosisIcd10: preset.diagnosisIcd10,
			statusLocalis: preset.statusLocalisRu,
			treatmentDescription: preset.treatmentDescriptionRu,
		});
		showToast(
			`1-клик: Протокол ${preset.labelRu} перенесен в медицинскую карту!`,
			"success",
		);
	};

	// Keyboard Navigation and Fast Hotkeys
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			const activeTag = (document.activeElement?.tagName || "").toUpperCase();
			if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") {
				return;
			}

			// Esc: Close modal
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
				return;
			}

			// Enter: Apply timeline age formula or apply resorption
			if (e.key === "Enter") {
				e.preventDefault();
				if (activeTab === "timeline" && onApplyAgeArch) {
					onApplyAgeArch([
						...timelineAnalysis.expectedUpperArchTeeth,
						...timelineAnalysis.expectedLowerArchTeeth,
					]);
					showToast(
						`Возрастная зубная формула (${selectedAge.toFixed(1)} лет) применена к одонтограмме`,
						"success",
						3000,
					);
				} else if (activeTab === "resorption" && onUpdateToothResorption) {
					onUpdateToothResorption(selectedPrimaryTooth, selectedResorptionStage);
					showToast(
						`Резорбция ${selectedResorptionStage}% применена к молочному зубу ${selectedPrimaryTooth}`,
						"success",
						3000,
					);
				}
				return;
			}

			// Fast keys 0, 1, 2, 3, 4 for root resorption stages (0%, 25%, 50%, 75%, 100%)
			const resorptionMap: Record<string, ResorptionStagePercent> = {
				"0": 0,
				"1": 25,
				"2": 50,
				"3": 75,
				"4": 100,
			};
			if (resorptionMap[e.key] !== undefined) {
				const stage = resorptionMap[e.key]!;
				e.preventDefault();
				setSelectedResorptionStage(stage);
				if (onUpdateToothResorption) {
					onUpdateToothResorption(selectedPrimaryTooth, stage);
					showToast(
						`Зуб ${selectedPrimaryTooth}: установлена резорбция ${stage}% (${RESORPTION_STAGE_DEFINITIONS[stage].nameRu})`,
						"info",
						2000,
					);
				}
				return;
			}

			// Arrow Navigation across primary dental arches
			if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab"].includes(e.key)) {
				e.preventDefault();
				let nextTooth: number = selectedPrimaryTooth;

				if (e.key === "Tab") {
					const all: readonly number[] = ALL_PRIMARY_TEETH;
					const idx = all.indexOf(selectedPrimaryTooth);
					if (e.shiftKey) {
						nextTooth = idx > 0 ? (all[idx - 1] ?? all[0]!) : all[all.length - 1]!;
					} else {
						nextTooth = idx >= 0 && idx < all.length - 1 ? (all[idx + 1] ?? all[0]!) : all[0]!;
					}
				} else if (e.key === "ArrowLeft") {
					const isUpper = (UPPER_PRIMARY_TEETH as readonly number[]).includes(selectedPrimaryTooth);
					const arch = isUpper ? UPPER_PRIMARY_TEETH : LOWER_PRIMARY_TEETH;
					const idx = (arch as readonly number[]).indexOf(selectedPrimaryTooth);
					if (idx > 0 && arch[idx - 1] !== undefined) nextTooth = arch[idx - 1]!;
				} else if (e.key === "ArrowRight") {
					const isUpper = (UPPER_PRIMARY_TEETH as readonly number[]).includes(selectedPrimaryTooth);
					const arch = isUpper ? UPPER_PRIMARY_TEETH : LOWER_PRIMARY_TEETH;
					const idx = (arch as readonly number[]).indexOf(selectedPrimaryTooth);
					if (idx >= 0 && idx < arch.length - 1 && arch[idx + 1] !== undefined) nextTooth = arch[idx + 1]!;
				} else if (e.key === "ArrowDown") {
					const idx = (UPPER_PRIMARY_TEETH as readonly number[]).indexOf(selectedPrimaryTooth);
					if (idx >= 0 && LOWER_PRIMARY_TEETH[idx] !== undefined) {
						nextTooth = LOWER_PRIMARY_TEETH[idx]!;
					}
				} else if (e.key === "ArrowUp") {
					const idx = (LOWER_PRIMARY_TEETH as readonly number[]).indexOf(selectedPrimaryTooth);
					if (idx >= 0 && UPPER_PRIMARY_TEETH[idx] !== undefined) {
						nextTooth = UPPER_PRIMARY_TEETH[idx]!;
					}
				}

				setSelectedPrimaryTooth(nextTooth);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		isOpen,
		activeTab,
		selectedPrimaryTooth,
		selectedResorptionStage,
		selectedAge,
		timelineAnalysis,
		onApplyAgeArch,
		onUpdateToothResorption,
		onClose,
	]);

	return {
		activeTab,
		setActiveTab,
		franklRating,
		setFranklRating,
		isParentMemoModalOpen,
		setIsParentMemoModalOpen,
		selectedAge,
		setSelectedAge,
		timelineAnalysis,
		hasFirstPermanentMolars,
		upperRow,
		lowerRow,
		cariogramInput,
		setCariogramInput,
		cariogramResult,
		selectedPrimaryTooth,
		setSelectedPrimaryTooth,
		selectedResorptionStage,
		setSelectedResorptionStage,
		handleInsertCariogramTo043,
		handleApplyPrimaryNorm,
		handleApplyFirstMolarNorm,
		handleApplyEarlyMixedNorm,
		handleApplyPermanentNorm,
		handleApplyProcedurePreset,
	};
}
