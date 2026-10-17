/**
 * DENTE Dental CRM — Anatomical Dual-Arch View (Maxilla & Mandible)
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import type { ToothData, ToothState } from "./ToothChart";
import type { BridgeSpanInfo } from "./anatomicalToothGeometries";
import { AnatomicalArchRow } from "./anatomicalDualArch/AnatomicalArchRow";
import type { ToothBridgePropsResult } from "./anatomicalDualArch/archTypes";

export type { ToothBridgePropsResult };

export interface AnatomicalDualArchViewProps {
	topSplit: { left: number[]; right: number[] };
	bottomSplit: { left: number[]; right: number[] };
	teethDataMap: Map<number, ToothData>;
	bridgePropsMap: Map<number, ToothBridgePropsResult>;
	topTeethList: readonly number[];
	bottomTeethList: readonly number[];
	upperBridgeSpans: readonly BridgeSpanInfo[];
	lowerBridgeSpans: readonly BridgeSpanInfo[];
	getToothBridgeProps: (
		num: number,
		archTeethList: readonly number[],
		spans: readonly BridgeSpanInfo[],
	) => ToothBridgePropsResult;
	selectedTeeth: number[];
	archScale: number;
	activeStamp?: ToothState | null | undefined;
	handleToothClick: (e: React.MouseEvent, num: number, surface?: string) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	useSurfaces?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
	isPediatricEffective: boolean;
	hoveredArch: "upper" | "lower" | null;
}

export const AnatomicalDualArchView: React.FC<AnatomicalDualArchViewProps> = React.memo(({
	topSplit,
	bottomSplit,
	teethDataMap,
	bridgePropsMap,
	topTeethList,
	bottomTeethList,
	upperBridgeSpans,
	lowerBridgeSpans,
	getToothBridgeProps,
	selectedTeeth,
	archScale,
	activeStamp,
	handleToothClick,
	onQuickStateChange,
	useSurfaces,
	showPulpAndCanals,
	showPeriapicalHalos,
	showPeriodontalBoneLoss,
	isPediatricEffective,
	hoveredArch,
}) => {
	const commonProps = {
		teethDataMap,
		bridgePropsMap,
		getToothBridgeProps,
		selectedTeeth,
		archScale,
		activeStamp,
		handleToothClick,
		onQuickStateChange,
		useSurfaces,
		showPulpAndCanals,
		showPeriapicalHalos,
		showPeriodontalBoneLoss,
		isPediatricEffective,
	};

	return (
		<div className="tooth-chart-arch-wrapper" style={{ minWidth: "max-content", margin: "0 auto", position: "relative" }}>
			<AnatomicalArchRow
				isTop={true}
				split={topSplit}
				teethList={topTeethList}
				spans={upperBridgeSpans}
				isHovered={hoveredArch === "upper"}
				{...commonProps}
			/>
			<div className="teeth-divider">
				<div className="divider-line" />
				<div className="divider-center" title="Центр окклюзионной плоскости">
					<div className="divider-diamond" />
				</div>
			</div>
			<AnatomicalArchRow
				isTop={false}
				split={bottomSplit}
				teethList={bottomTeethList}
				spans={lowerBridgeSpans}
				isHovered={hoveredArch === "lower"}
				{...commonProps}
			/>
		</div>
	);
});
AnatomicalDualArchView.displayName = "AnatomicalDualArchView";
