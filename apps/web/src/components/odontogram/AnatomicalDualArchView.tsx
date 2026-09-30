/**
 * DENTE Dental CRM — Anatomical Dual-Arch View (Maxilla & Mandible)
 *
 * Renders complete 32-tooth adult or 20-tooth pediatric dual dental arches
 * separated by sagittal midline guide and occlusal plane divider.
 */

import React from "react";
import type { ToothData, ToothState } from "./ToothChart";
import type { BridgeSpanInfo, RestorativeMaterialKey } from "./anatomicalToothGeometries";
import { ToothWrapper } from "./ToothWrapper";

export interface ToothBridgePropsResult {
	isPontic: boolean;
	bridgeMaterial?: RestorativeMaterialKey | undefined;
	hasLeftBridgeConnector: boolean;
	hasRightBridgeConnector: boolean;
}

export interface AnatomicalDualArchViewProps {
	topSplit: { left: number[]; right: number[] };
	bottomSplit: { left: number[]; right: number[] };
	teethDataMap: Map<number, ToothData>;
	bridgePropsMap: Map<number, ToothBridgePropsResult>;
	topTeethList: number[];
	bottomTeethList: number[];
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
	return (
		<div
			className="tooth-chart-arch-wrapper"
			style={{
				minWidth: "max-content",
				margin: "0 auto",
				position: "relative",
			}}
		>
			{/* Upper Arch (Maxilla) */}
			<div
				className={`teeth-row top-row ${
					hoveredArch === "upper"
						? "ring-2 ring-blue-400/80 shadow-lg shadow-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20 rounded-xl transition-all duration-300"
						: ""
				}`}
			>
				<div className="tooth-quadrant-group top-left-quad">
					{topSplit.left.map((num) => {
						const tData: ToothData = teethDataMap.get(num) ?? {
							toothNumber: num,
							state: "Healthy",
						};
						const bridgeProps =
							bridgePropsMap.get(num) ??
							getToothBridgeProps(num, topTeethList, upperBridgeSpans);
						return (
							<ToothWrapper
								key={num}
								tooth={tData}
								scale={archScale}
								isTop={true}
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

				<div
					className="tooth-arch-midline-guide top-guide"
					title="Сагиттальная линия (Midline)"
				>
					<div className="midline-notch" />
				</div>

				<div className="tooth-quadrant-group top-right-quad">
					{topSplit.right.map((num) => {
						const tData: ToothData = teethDataMap.get(num) ?? {
							toothNumber: num,
							state: "Healthy",
						};
						const bridgeProps =
							bridgePropsMap.get(num) ??
							getToothBridgeProps(num, topTeethList, upperBridgeSpans);
						return (
							<ToothWrapper
								key={num}
								tooth={tData}
								scale={archScale}
								isTop={true}
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
			</div>

			<div className="teeth-divider">
				<div className="divider-line" />
				<div className="divider-center" title="Центр окклюзионной плоскости">
					<div className="divider-diamond" />
				</div>
			</div>

			{/* Lower Arch (Mandible) */}
			<div
				className={`teeth-row bottom-row ${
					hoveredArch === "lower"
						? "ring-2 ring-blue-400/80 shadow-lg shadow-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20 rounded-xl transition-all duration-300"
						: ""
				}`}
			>
				<div className="tooth-quadrant-group bottom-left-quad">
					{bottomSplit.left.map((num) => {
						const tData: ToothData = teethDataMap.get(num) ?? {
							toothNumber: num,
							state: "Healthy",
						};
						const bridgeProps =
							bridgePropsMap.get(num) ??
							getToothBridgeProps(num, bottomTeethList, lowerBridgeSpans);
						return (
							<ToothWrapper
								key={num}
								tooth={tData}
								scale={archScale}
								isTop={false}
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

				<div
					className="tooth-arch-midline-guide bottom-guide"
					title="Сагиттальная линия (Midline)"
				>
					<div className="midline-notch" />
				</div>

				<div className="tooth-quadrant-group bottom-right-quad">
					{bottomSplit.right.map((num) => {
						const tData: ToothData = teethDataMap.get(num) ?? {
							toothNumber: num,
							state: "Healthy",
						};
						const bridgeProps =
							bridgePropsMap.get(num) ??
							getToothBridgeProps(num, bottomTeethList, lowerBridgeSpans);
						return (
							<ToothWrapper
								key={num}
								tooth={tData}
								scale={archScale}
								isTop={false}
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
			</div>
		</div>
	);
});
AnatomicalDualArchView.displayName = "AnatomicalDualArchView";
