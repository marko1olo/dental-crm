/**
 * DENTE Dental CRM — Anatomical Odontogram Arch Body Router
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import { AnatomicalDualArchView } from "../AnatomicalDualArchView";
import { ToothCarouselFocus } from "../chart/ToothCarouselFocus";
import { MobileQuadrantTabs } from "../MobileQuadrantTabs";
import { AnatomicalQuadrantFocusedArch } from "./AnatomicalQuadrantFocusedArch";
import type { useAnatomicalOdontogramState } from "./useAnatomicalOdontogramState";

export interface AnatomicalOdontogramArchBodyProps {
	s: ReturnType<typeof useAnatomicalOdontogramState>;
	selectedTeeth: number[];
	activeStamp?: any;
	onToothClick: (num: number, rect: DOMRect, surface?: string | undefined) => void;
	onQuickStateChange?: any;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
	useSurfaces?: boolean | undefined;
	pediatricMode?: boolean | undefined;
}

export const AnatomicalOdontogramArchBody: React.FC<AnatomicalOdontogramArchBodyProps> = ({
	s, selectedTeeth, activeStamp, onToothClick, onQuickStateChange, showPulpAndCanals,
	showPeriapicalHalos, showPeriodontalBoneLoss, useSurfaces, pediatricMode,
}) => {
	if (s.effectiveMobileDisplayMode === "carousel") {
		const fallbackTooth = s.isPediatricEffective ? 55 : 16;
		const carouselActiveTooth = s.carouselTooth ?? (selectedTeeth?.[0] || s.activeQuadrantTeeth[0] || fallbackTooth);

		return (
			<div className="w-full flex flex-col gap-2">
				<div className="w-full sm:hidden">
					<MobileQuadrantTabs
						currentQuadrant={s.currentQuadrant} onSelectQuadrant={s.handleSelectQuadrant}
						isPediatricEffective={s.isPediatricEffective} isMixedEffective={s.isMixedEffective}
						showAllOption={true} mobileDisplayMode={s.effectiveMobileDisplayMode}
						onToggleMobileDisplayMode={s.handleToggleMobileDisplayMode}
					/>
				</div>
				<ToothCarouselFocus
					toothNumber={carouselActiveTooth} toothDataMap={s.teethDataMap}
					isPediatricEffective={s.isPediatricEffective} pediatricMode={pediatricMode}
					onSelectTooth={s.setCarouselTooth}
					onOpenStatusSheet={(num, rect) => onToothClick(num, rect ?? ({} as any))}
					onQuickStateChange={onQuickStateChange} showPulpAndCanals={showPulpAndCanals}
					showPeriapicalHalos={showPeriapicalHalos} showPeriodontalBoneLoss={showPeriodontalBoneLoss}
					useSurfaces={useSurfaces}
				/>
			</div>
		);
	}

	if (s.isQuadrantView) {
		return (
			<AnatomicalQuadrantFocusedArch
				currentQuadrant={s.currentQuadrant} handleSelectQuadrant={s.handleSelectQuadrant}
				isPediatricEffective={s.isPediatricEffective} isMixedEffective={s.isMixedEffective}
				effectiveMobileDisplayMode={s.effectiveMobileDisplayMode}
				handleToggleMobileDisplayMode={s.handleToggleMobileDisplayMode}
				isTopQuadrant={s.isTopQuadrant} hoveredArch={s.hoveredArch}
				activeQuadrantTeeth={s.activeQuadrantTeeth} teethDataMap={s.teethDataMap}
				bridgePropsMap={s.bridgePropsMap} getToothBridgeProps={s.getToothBridgeProps}
				topTeethList={s.topTeethList} bottomTeethList={s.bottomTeethList}
				upperBridgeSpans={s.upperBridgeSpans} lowerBridgeSpans={s.lowerBridgeSpans}
				selectedTeeth={selectedTeeth} archScale={s.archScale} activeStamp={activeStamp}
				handleToothClick={s.handleToothClick} stableQuickStateChange={s.stableQuickStateChange}
				useSurfaces={useSurfaces} showPulpAndCanals={showPulpAndCanals}
				showPeriapicalHalos={showPeriapicalHalos} showPeriodontalBoneLoss={showPeriodontalBoneLoss}
			/>
		);
	}

	return (
		<AnatomicalDualArchView
			topSplit={s.topSplit} bottomSplit={s.bottomSplit} teethDataMap={s.teethDataMap}
			bridgePropsMap={s.bridgePropsMap} topTeethList={s.topTeethList} bottomTeethList={s.bottomTeethList}
			upperBridgeSpans={s.upperBridgeSpans} lowerBridgeSpans={s.lowerBridgeSpans}
			getToothBridgeProps={s.getToothBridgeProps} selectedTeeth={selectedTeeth}
			archScale={s.archScale} activeStamp={activeStamp} handleToothClick={s.handleToothClick}
			onQuickStateChange={s.stableQuickStateChange} useSurfaces={useSurfaces}
			showPulpAndCanals={showPulpAndCanals} showPeriapicalHalos={showPeriapicalHalos}
			showPeriodontalBoneLoss={showPeriodontalBoneLoss} isPediatricEffective={s.isPediatricEffective}
			hoveredArch={s.hoveredArch}
		/>
	);
};
