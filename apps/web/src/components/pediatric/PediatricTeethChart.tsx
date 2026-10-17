import React, { useMemo } from "react";
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
import { PediatricTeethHeader } from "./teethChart/PediatricTeethHeader";
import { PediatricTeethMobileQuadrant } from "./teethChart/PediatricTeethMobileQuadrant";
import { PediatricTeethDesktopArch } from "./teethChart/PediatricTeethDesktopArch";
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

	const q5 = useMemo(() => isPermanent ? PERMANENT_UPPER_RIGHT : isMixed ? [PERMANENT_SIX_TEETH[16]!, ...PRIMARY_UPPER_RIGHT] : PRIMARY_UPPER_RIGHT, [isMixed, isPermanent]);
	const q6 = useMemo(() => isPermanent ? PERMANENT_UPPER_LEFT : isMixed ? [...PRIMARY_UPPER_LEFT, PERMANENT_SIX_TEETH[26]!] : PRIMARY_UPPER_LEFT, [isMixed, isPermanent]);
	const q7 = useMemo(() => isPermanent ? PERMANENT_LOWER_LEFT : isMixed ? [...PRIMARY_LOWER_LEFT, PERMANENT_SIX_TEETH[36]!] : PRIMARY_LOWER_LEFT, [isMixed, isPermanent]);
	const q8 = useMemo(() => isPermanent ? PERMANENT_LOWER_RIGHT : isMixed ? [PERMANENT_SIX_TEETH[46]!, ...PRIMARY_LOWER_RIGHT] : PRIMARY_LOWER_RIGHT, [isMixed, isPermanent]);


	return (
		<div
			className={`pediatric-teeth-chart rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-3 sm:p-4 ${className}`.trim()}
			data-testid="pediatric-teeth-chart"
		>
			<PediatricTeethHeader mode={mode} onModeChange={onModeChange} onSetAllHealthy={onSetAllHealthy} onApplyMixedDentitionPreset={onApplyMixedDentitionPreset} />
			<PediatricTeethMobileQuadrant activeTooth={activeTooth} onSelectTooth={onSelectTooth} toothFindings={toothFindings} resorptionStages={resorptionStages} toothSurfaces={toothSurfaces} q5Teeth={q5} q6Teeth={q6} q7Teeth={q7} q8Teeth={q8} isPermanent={isPermanent} />
			<PediatricTeethDesktopArch
				activeTooth={activeTooth}
				onSelectTooth={onSelectTooth}
				toothFindings={toothFindings}
				resorptionStages={resorptionStages}
				toothSurfaces={toothSurfaces}
				upperTeeth={[...q5, ...q6]}
				lowerTeeth={[...q8, ...q7]}
				isMixed={isMixed}
			/>
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
