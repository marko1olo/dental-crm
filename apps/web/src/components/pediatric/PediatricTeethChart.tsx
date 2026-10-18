import React, { useMemo, useCallback } from "react";
import {
	type PediatricDentitionMode,
	type PediatricTeethChartProps,
	type ToothClinicalFinding,
	PRIMARY_UPPER_RIGHT,
	PRIMARY_UPPER_LEFT,
	PRIMARY_LOWER_RIGHT,
	PRIMARY_LOWER_LEFT,
	PERMANENT_SIX_TEETH,
	PERMANENT_UPPER_RIGHT,
	PERMANENT_UPPER_LEFT,
	PERMANENT_LOWER_RIGHT,
	PERMANENT_LOWER_LEFT,
} from "./teethChart/pediatricTeethTypes";
import { AnatomicalSvgOdontogram } from "../odontogram/AnatomicalSvgOdontogram";
import {
	type ToothData,
	type ToothState,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	MIXED_TOP_TEETH,
	MIXED_BOTTOM_TEETH,
} from "../odontogram/ToothChart";
import { PediatricTeethHeader } from "./teethChart/PediatricTeethHeader";
import { PediatricTeethMobileQuadrant } from "./teethChart/PediatricTeethMobileQuadrant";
import { PediatricActiveToothToolbar } from "./teethChart/PediatricActiveToothToolbar";

export * from "./teethChart/pediatricTeethTypes";

export const PediatricTeethChart: React.FC<PediatricTeethChartProps> = ({
	activeTooth = 54,
	onSelectTooth,
	mode = "primary",
	onModeChange,
	toothFindings = {},
	resorptionStages = {},
	toothSurfaces = {},
	onResorptionChange,
	onToothFindingChange,
	onSurfaceToggle,
	onSetAllHealthy,
	onApplyMixedDentitionPreset,
	className = "",
}) => {
	const isMixed = mode === "mixed";
	const isPermanent = mode === "permanent";
	const dentitionMode = isPermanent ? "adult" : isMixed ? "mixed" : "pediatric";

	const q5 = useMemo(() => isPermanent ? PERMANENT_UPPER_RIGHT : isMixed ? [PERMANENT_SIX_TEETH[16]!, ...PRIMARY_UPPER_RIGHT] : PRIMARY_UPPER_RIGHT, [isMixed, isPermanent]);
	const q6 = useMemo(() => isPermanent ? PERMANENT_UPPER_LEFT : isMixed ? [...PRIMARY_UPPER_LEFT, PERMANENT_SIX_TEETH[26]!] : PRIMARY_UPPER_LEFT, [isMixed, isPermanent]);
	const q7 = useMemo(() => isPermanent ? PERMANENT_LOWER_LEFT : isMixed ? [...PRIMARY_LOWER_LEFT, PERMANENT_SIX_TEETH[36]!] : PRIMARY_LOWER_LEFT, [isMixed, isPermanent]);
	const q8 = useMemo(() => isPermanent ? PERMANENT_LOWER_RIGHT : isMixed ? [PERMANENT_SIX_TEETH[46]!, ...PRIMARY_LOWER_RIGHT] : PRIMARY_LOWER_RIGHT, [isMixed, isPermanent]);

	const teethData: ToothData[] = useMemo(() => {
		const numbers = isMixed ? [...MIXED_TOP_TEETH, ...MIXED_BOTTOM_TEETH] : isPermanent ? [] : [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH];
		return numbers.map((toothNumber) => ({
			toothNumber,
			state: (toothFindings[toothNumber] || "Healthy") as ToothState,
			surfaces: toothSurfaces[toothNumber] ? [...toothSurfaces[toothNumber]] : [],
			rootResorptionStage: resorptionStages[toothNumber] ?? 0,
		}));
	}, [isMixed, isPermanent, toothFindings, toothSurfaces, resorptionStages]);

	const handleToothClick = useCallback((num: number) => onSelectTooth?.(num), [onSelectTooth]);

	const handleQuickState = useCallback((targets: number[], state: ToothState) => {
		targets.forEach((t) => onToothFindingChange?.(t, state as ToothClinicalFinding));
	}, [onToothFindingChange]);

	const handleResorption = useCallback((targets: number[], stage: any) => {
		const percent = typeof stage === "number" ? stage : stage === "complete" ? 100 : stage === "half" ? 50 : stage === "initial" ? 25 : 0;
		targets.forEach((t) => onResorptionChange?.(t, percent as any));
	}, [onResorptionChange]);

	return (
		<div
			className={`pediatric-teeth-chart rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-3 sm:p-4 ${className}`.trim()}
			data-testid="pediatric-teeth-chart"
		>
			<PediatricTeethHeader mode={mode} onModeChange={onModeChange} onSetAllHealthy={onSetAllHealthy} onApplyMixedDentitionPreset={onApplyMixedDentitionPreset} />

			<PediatricTeethMobileQuadrant activeTooth={activeTooth} onSelectTooth={onSelectTooth} toothFindings={toothFindings} resorptionStages={resorptionStages} toothSurfaces={toothSurfaces} q5Teeth={q5} q6Teeth={q6} q7Teeth={q7} q8Teeth={q8} isPermanent={isPermanent} />

			<div className="hidden sm:block my-2 p-1 overflow-x-auto">
				<AnatomicalSvgOdontogram
					pediatricMode={!isPermanent}
					mixedDentition={isMixed}
					dentitionMode={dentitionMode}
					teethData={teethData}
					selectedTeeth={activeTooth ? [activeTooth] : []}
					onToothClick={handleToothClick}
					onQuickStateChange={handleQuickState}
					hideLegend={true}
					hideQuadrantSwitcher={true}
					showWisdomTeeth={false}
					showPulpAndCanals={false}
					showPeriapicalHalos={true}
					className="w-full"
				/>
			</div>

			{activeTooth && (onToothFindingChange || onResorptionChange || onSurfaceToggle) && (
				<PediatricActiveToothToolbar
					activeTooth={activeTooth}
					toothFindings={toothFindings}
					onToothFindingChange={onToothFindingChange}
					toothSurfaces={toothSurfaces}
					onSurfaceToggle={onSurfaceToggle}
					resorptionStages={resorptionStages}
					onResorptionChange={onResorptionChange}
				/>
			)}
		</div>
	);
};

export default PediatricTeethChart;
