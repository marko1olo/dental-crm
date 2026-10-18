import type React from "react";
import { memo } from "react";
import type {
	ToothData,
	ToothState,
	RootResorptionStage,
} from "../toothChartTypes";
import { ToothArchGroup } from "./ToothArchGroup";

export interface FullArchViewProps {
	topSplit: { left: number[]; right: number[] };
	bottomSplit: { left: number[]; right: number[] };
	toothDataMap: Map<number, ToothData>;
	archScale: number;
	useSurfaces?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
	selectedTeeth: number[];
	activeStamp?: ToothState | null | undefined;
	handleToothClick: (e: React.MouseEvent, num: number, surface?: string) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	onResorptionChange?: ((targets: number[], stage: RootResorptionStage) => void) | undefined;
	isPediatricEffective: boolean;
}

export const FullArchView: React.FC<FullArchViewProps> = memo(({
	topSplit,
	bottomSplit,
	toothDataMap,
	archScale,
	useSurfaces,
	showPulpAndCanals,
	showPeriapicalHalos,
	showPeriodontalBoneLoss,
	selectedTeeth,
	activeStamp,
	handleToothClick,
	onQuickStateChange,
	onResorptionChange,
	isPediatricEffective,
}) => {
	const commonProps = {
		toothDataMap,
		scale: archScale,
		useSurfaces,
		showPulpAndCanals,
		showPeriapicalHalos,
		showPeriodontalBoneLoss,
		selectedTeeth,
		activeStamp,
		handleToothClick,
		onQuickStateChange,
		onResorptionChange,
		pediatricMode: isPediatricEffective,
	};

	return (
		<div className="tooth-chart-arch-wrapper w-full max-w-full overflow-x-auto" style={{ margin: "0 auto", position: "relative" }}>
			{/* Upper Arch (Maxilla) */}
			<div className="teeth-row top-row">
				<ToothArchGroup {...commonProps} teeth={topSplit.left} className="tooth-quadrant-group top-left-quad" />
				<div className="tooth-arch-midline-guide top-guide" title="Сагиттальная линия (Midline)">
					<div className="midline-notch" />
				</div>
				<ToothArchGroup {...commonProps} teeth={topSplit.right} className="tooth-quadrant-group top-right-quad" />
			</div>

			{/* Horizontal Dental Occlusal Plane Guide */}
			<div className="tooth-arch-occlusal-plane" title="Окклюзионная плоскость" />

			{/* Lower Arch (Mandible) */}
			<div className="teeth-row bottom-row">
				<ToothArchGroup {...commonProps} teeth={bottomSplit.left} className="tooth-quadrant-group bottom-left-quad" />
				<div className="tooth-arch-midline-guide bottom-guide" title="Сагиттальная линия (Midline)">
					<div className="midline-notch" />
				</div>
				<ToothArchGroup {...commonProps} teeth={bottomSplit.right} className="tooth-quadrant-group bottom-right-quad" />
			</div>
		</div>
	);
});
FullArchView.displayName = "FullArchView";
