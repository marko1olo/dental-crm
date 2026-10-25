import React, { useMemo, useState } from "react";
import {
	ALL_PRIMARY_TEETH,
	calculateEruptionTimelineByAge,
	type ResorptionStagePercent,
} from "./pediatricDentitionEngine";
import { showToast } from "../GlobalToast";
import { PediatricResorptionHeader } from "./PediatricResorptionHeader";
import { PediatricResorptionActions } from "./PediatricResorptionActions";
import { PediatricResorptionStagesGrid } from "./PediatricResorptionStagesGrid";
import { PediatricResorptionTeethGrid } from "./PediatricResorptionTeethGrid";

export interface PediatricResorptionTabProps {
	selectedPrimaryTooth: number;
	onSelectPrimaryTooth: (tooth: number) => void;
	selectedResorptionStage: ResorptionStagePercent;
	onSelectResorptionStage: (stage: ResorptionStagePercent) => void;
	onUpdateToothResorption?: ((toothNumber: number, stage: ResorptionStagePercent) => void) | undefined;
	onBatchUpdateResorption?: ((updates: { toothNumber: number; resorptionStage: ResorptionStagePercent }[]) => void) | undefined;
	patientAgeYears?: number | undefined;
	onAgeChange?: ((age: number) => void) | undefined;
}

export const PediatricResorptionTab: React.FC<PediatricResorptionTabProps> = ({
	selectedPrimaryTooth,
	onSelectPrimaryTooth,
	selectedResorptionStage,
	onSelectResorptionStage,
	onUpdateToothResorption,
	onBatchUpdateResorption,
	patientAgeYears,
	onAgeChange,
}) => {
	const [localAge, setLocalAge] = useState<number>(patientAgeYears ?? 7.5);
	const currentAge = patientAgeYears ?? localAge;

	const handleAgeChange = (newAge: number) => {
		setLocalAge(newAge);
		onAgeChange?.(newAge);
	};

	const timelineAnalysis = useMemo(() => calculateEruptionTimelineByAge(currentAge), [currentAge]);

	const physiologicalResorptionMap = useMemo(() => {
		const map = new Map<number, ResorptionStagePercent>();
		for (const st of timelineAnalysis.toothStatuses) {
			if (st.predecessorPrimaryFdi !== undefined) {
				map.set(st.predecessorPrimaryFdi, st.expectedResorptionPercent);
			}
		}
		return map;
	}, [timelineAnalysis]);

	const expectedForSelected = physiologicalResorptionMap.get(selectedPrimaryTooth) ?? 0;

	const handleStageClick = (stage: ResorptionStagePercent) => {
		onSelectResorptionStage(stage);
		onUpdateToothResorption?.(selectedPrimaryTooth, stage);
	};

	const handleApplyCurrent = () => {
		if (onUpdateToothResorption) {
			onUpdateToothResorption(selectedPrimaryTooth, selectedResorptionStage);
			showToast(`Резорбция ${selectedResorptionStage}% применена к зубу ${selectedPrimaryTooth}`, "success", 2500);
		}
	};

	const handleApplyPhysiologicalNorm = () => {
		const updates = ALL_PRIMARY_TEETH.map((tooth) => ({
			toothNumber: tooth,
			resorptionStage: physiologicalResorptionMap.get(tooth) ?? 0,
		}));
		if (onBatchUpdateResorption) onBatchUpdateResorption(updates);
		else if (onUpdateToothResorption) updates.forEach((u) => onUpdateToothResorption(u.toothNumber, u.resorptionStage));
		showToast(`Физиологическая резорбция корней (${currentAge.toFixed(1)} лет) установлена в норму!`, "success", 3500);
	};

	const handleApplyAllZero = () => {
		const updates = ALL_PRIMARY_TEETH.map((tooth) => ({ toothNumber: tooth, resorptionStage: 0 as ResorptionStagePercent }));
		if (onBatchUpdateResorption) onBatchUpdateResorption(updates);
		else if (onUpdateToothResorption) updates.forEach((u) => onUpdateToothResorption(u.toothNumber, u.resorptionStage));
		showToast("Резорбция 0% (интактные корни) применена ко всем молочным зубам", "info", 3000);
	};

	const handleApplyExpectedForSelected = () => {
		onSelectResorptionStage(expectedForSelected);
		onUpdateToothResorption?.(selectedPrimaryTooth, expectedForSelected);
		showToast(`Зуб ${selectedPrimaryTooth}: норма резорбции ${expectedForSelected}%`, "success", 2500);
	};

	return (
		<div className="space-y-6 animate-in fade-in duration-200">
			<PediatricResorptionHeader currentAge={currentAge} stageNameRu={timelineAnalysis.stageNameRu} onAgeChange={handleAgeChange} />
			<PediatricResorptionActions currentAge={currentAge} onApplyNorm={handleApplyPhysiologicalNorm} onApplyAllZero={handleApplyAllZero} />
			<PediatricResorptionStagesGrid selectedResorptionStage={selectedResorptionStage} onSelectStage={handleStageClick} />
			<PediatricResorptionTeethGrid selectedPrimaryTooth={selectedPrimaryTooth} onSelectPrimaryTooth={onSelectPrimaryTooth} selectedResorptionStage={selectedResorptionStage} expectedForSelected={expectedForSelected} currentAge={currentAge} physiologicalResorptionMap={physiologicalResorptionMap} onApplyExpectedForSelected={handleApplyExpectedForSelected} onApplyCurrent={handleApplyCurrent} hasUpdateCallback={Boolean(onUpdateToothResorption)} />
		</div>
	);
};
