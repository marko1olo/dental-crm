/**
 * DENTE Dental CRM — Anatomical Arch Row (Quadrants + Midline Guide)
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import type { ToothData, ToothState } from "../ToothChart";
import type { BridgeSpanInfo } from "../anatomicalToothGeometries";
import { ToothWrapper } from "../ToothWrapper";
import type { ToothBridgePropsResult } from "./archTypes";

export interface AnatomicalArchRowProps {
	isTop: boolean;
	split: { left: number[]; right: number[] };
	teethList: readonly number[];
	spans: readonly BridgeSpanInfo[];
	teethDataMap: Map<number, ToothData>;
	bridgePropsMap: Map<number, ToothBridgePropsResult>;
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
	isHovered: boolean;
}

export const AnatomicalArchRow: React.FC<AnatomicalArchRowProps> = ({
	isTop,
	split,
	teethList,
	spans,
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
	isHovered,
}) => {
	const renderQuadrant = (teethGroup: number[], quadClass: string) => (
		<div className={`tooth-quadrant-group ${quadClass}`}>
			{teethGroup.map((num) => {
				const tData: ToothData = teethDataMap.get(num) ?? { toothNumber: num, state: "Healthy" };
				const bridgeProps = bridgePropsMap.get(num) ?? getToothBridgeProps(num, teethList, spans);
				return (
					<ToothWrapper
						key={num}
						tooth={tData}
						scale={archScale}
						isTop={isTop}
						isSelected={selectedTeeth.includes(num)}
						selectedTeeth={selectedTeeth}
						activeStamp={activeStamp}
						onClick={handleToothClick}
						onQuickStateChange={onQuickStateChange}
						useSurfaces={useSurfaces}
						showPulpAndCanals={showPulpAndCanals}
						showPeriapicalHalos={showPeriapicalHalos}
						showPeriodontalBoneLoss={showPeriodontalBoneLoss}
						pediatricMode={isPediatricEffective}
						{...bridgeProps}
					/>
				);
			})}
		</div>
	);

	return (
		<div
			className={`teeth-row ${isTop ? "top-row" : "bottom-row"} ${
				isHovered ? "ring-2 ring-blue-400/80 shadow-lg shadow-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20 rounded-xl transition-all duration-300" : ""
			}`}
		>
			{renderQuadrant(split.left, isTop ? "top-left-quad" : "bottom-left-quad")}
			<div className={`tooth-arch-midline-guide ${isTop ? "top-guide" : "bottom-guide"}`} title="Сагиттальная линия (Midline)">
				<div className="midline-notch" />
			</div>
			{renderQuadrant(split.right, isTop ? "top-right-quad" : "bottom-right-quad")}
		</div>
	);
};
