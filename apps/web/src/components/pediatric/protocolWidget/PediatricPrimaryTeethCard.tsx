import React from "react";
import type { ResorptionStagePercent } from "../../odontogram/pediatricDentitionEngine";
import {
	PediatricTeethChart,
	type PediatricDentitionMode,
	type ToothClinicalFinding,
} from "../PediatricTeethChart";
import { PediatricOrthoNormGrid } from "./PediatricOrthoNormGrid";

export interface PediatricPrimaryTeethCardProps {
	readonly currentTooth: number;
	readonly onSelectTooth: (tooth: number) => void;
	readonly dentitionMode: PediatricDentitionMode;
	readonly onModeChange: (mode: PediatricDentitionMode) => void;
	readonly toothFindings: Record<number, ToothClinicalFinding>;
	readonly resorptionStages: Record<number, ResorptionStagePercent>;
	readonly onResorptionChange: (tooth: number, stage: ResorptionStagePercent) => void;
	readonly onToothFindingChange: (tooth: number, finding: ToothClinicalFinding) => void;
	readonly onSetAllHealthy: () => void;
	readonly onApplyMixedDentitionPreset: () => void;
	readonly orthoFrenulumNormal: boolean;
	readonly setOrthoFrenulumNormal: React.Dispatch<React.SetStateAction<boolean>>;
	readonly orthoNasalBreathing: boolean;
	readonly setOrthoNasalBreathing: React.Dispatch<React.SetStateAction<boolean>>;
	readonly orthoNoHarmfulHabits: boolean;
	readonly setOrthoNoHarmfulHabits: React.Dispatch<React.SetStateAction<boolean>>;
}

export const PediatricPrimaryTeethCard: React.FC<PediatricPrimaryTeethCardProps> = ({
	currentTooth,
	onSelectTooth,
	dentitionMode,
	onModeChange,
	toothFindings,
	resorptionStages,
	onResorptionChange,
	onToothFindingChange,
	onSetAllHealthy,
	onApplyMixedDentitionPreset,
	orthoFrenulumNormal,
	setOrthoFrenulumNormal,
	orthoNasalBreathing,
	setOrthoNasalBreathing,
	orthoNoHarmfulHabits,
	setOrthoNoHarmfulHabits,
}) => {
	return (
		<div className="mb-4">
			<div className="mb-4">
				<PediatricTeethChart
					activeTooth={currentTooth}
					onSelectTooth={onSelectTooth}
					mode={dentitionMode}
					onModeChange={onModeChange}
					toothFindings={toothFindings}
					resorptionStages={resorptionStages}
					onResorptionChange={onResorptionChange}
					onToothFindingChange={onToothFindingChange}
					onSetAllHealthy={onSetAllHealthy}
					onApplyMixedDentitionPreset={onApplyMixedDentitionPreset}
				/>
			</div>
			<PediatricOrthoNormGrid
				orthoFrenulumNormal={orthoFrenulumNormal}
				setOrthoFrenulumNormal={setOrthoFrenulumNormal}
				orthoNasalBreathing={orthoNasalBreathing}
				setOrthoNasalBreathing={setOrthoNasalBreathing}
				orthoNoHarmfulHabits={orthoNoHarmfulHabits}
				setOrthoNoHarmfulHabits={setOrthoNoHarmfulHabits}
			/>
		</div>
	);
};
