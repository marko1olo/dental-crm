/**
 * DENTE Dental CRM — Quadrant Focused Large Touch View
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import type { OdontogramQuadrantId, ToothData, ToothState } from "../ToothChart";
import type { BridgeSpanInfo } from "../anatomicalToothGeometries";
import type { ToothBridgePropsResult } from "../anatomicalDualArch/archTypes";
import { QuadrantFocusedHeader } from "../AnatomicalQuadrantSwitcher";
import { ToothWrapper } from "../ToothWrapper";

export interface AnatomicalQuadrantFocusedArchProps {
	currentQuadrant: OdontogramQuadrantId;
	handleSelectQuadrant: (q: OdontogramQuadrantId) => void;
	isPediatricEffective: boolean;
	isMixedEffective: boolean;
	effectiveMobileDisplayMode: "quadrant" | "carousel";
	handleToggleMobileDisplayMode: (mode: "quadrant" | "carousel") => void;
	isTopQuadrant: boolean;
	hoveredArch: "upper" | "lower" | null;
	activeQuadrantTeeth: readonly number[];
	teethDataMap: Map<number, ToothData>;
	bridgePropsMap: Map<number, ToothBridgePropsResult>;
	getToothBridgeProps: (num: number, archTeethList: readonly number[], spans: readonly BridgeSpanInfo[]) => ToothBridgePropsResult;
	topTeethList: readonly number[];
	bottomTeethList: readonly number[];
	upperBridgeSpans: readonly BridgeSpanInfo[];
	lowerBridgeSpans: readonly BridgeSpanInfo[];
	selectedTeeth: number[];
	archScale: number;
	activeStamp?: ToothState | null | undefined;
	handleToothClick: (e: React.MouseEvent, num: number, surface?: string) => void;
	stableQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[]) => void) | undefined;
	useSurfaces?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
}

export const AnatomicalQuadrantFocusedArch: React.FC<AnatomicalQuadrantFocusedArchProps> = (props) => {
	const {
		currentQuadrant, handleSelectQuadrant, isPediatricEffective, isMixedEffective,
		effectiveMobileDisplayMode, handleToggleMobileDisplayMode, isTopQuadrant, hoveredArch,
		activeQuadrantTeeth, teethDataMap, bridgePropsMap, getToothBridgeProps, topTeethList,
		bottomTeethList, upperBridgeSpans, lowerBridgeSpans, selectedTeeth, archScale, activeStamp,
		handleToothClick, stableQuickStateChange, useSurfaces, showPulpAndCanals,
		showPeriapicalHalos, showPeriodontalBoneLoss,
	} = props;

	const isHovered = (isTopQuadrant && hoveredArch === "upper") || (!isTopQuadrant && hoveredArch === "lower");
	const hoverCls = isHovered ? "ring-2 ring-blue-400/80 shadow-lg shadow-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20 rounded-xl transition-all duration-300" : "";

	return (
		<div
			className="tooth-chart-arch-wrapper quadrant-view-wrapper"
			data-testid="quadrant-focused-view"
			style={{ width: "100%", maxWidth: "100%", margin: 0, position: "relative" }}
		>
			<QuadrantFocusedHeader
				currentQuadrant={currentQuadrant} onSelectQuadrant={handleSelectQuadrant}
				isPediatricEffective={isPediatricEffective} isMixedEffective={isMixedEffective}
				mobileDisplayMode={effectiveMobileDisplayMode} onToggleMobileDisplayMode={handleToggleMobileDisplayMode}
			/>
			<div className={`teeth-row ${isTopQuadrant ? "top-row" : "bottom-row"} quadrant-row ${hoverCls}`}>
				<div className="tooth-quadrant-group focused-quadrant-group">
					{(Array.isArray(activeQuadrantTeeth) ? activeQuadrantTeeth : []).map((num) => {
						const tData: ToothData = teethDataMap.get(num) ?? { toothNumber: num, state: "Healthy" };
						const bridgeProps = bridgePropsMap.get(num) ?? getToothBridgeProps(
							num, isTopQuadrant ? topTeethList : bottomTeethList, isTopQuadrant ? upperBridgeSpans : lowerBridgeSpans,
						);
						return (
							<ToothWrapper
								key={num} tooth={tData} scale={archScale} isTop={isTopQuadrant}
								isSelected={selectedTeeth.includes(num)} selectedTeeth={selectedTeeth}
								activeStamp={activeStamp} onClick={handleToothClick}
								onQuickStateChange={stableQuickStateChange} useSurfaces={useSurfaces}
								showPulpAndCanals={showPulpAndCanals} showPeriapicalHalos={showPeriapicalHalos}
								showPeriodontalBoneLoss={showPeriodontalBoneLoss} pediatricMode={isPediatricEffective}
								{...bridgeProps}
							/>
						);
					})}
				</div>
			</div>
		</div>
	);
};
