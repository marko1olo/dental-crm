/**
 * DENTE Dental CRM — Anatomical SVG Odontogram
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React, { useState } from "react";
import { DenteToothSvgDefs } from "./ToothChart";
import { GlobalTreatmentsStrip, type GlobalTreatmentItem } from "./GlobalTreatmentsStrip";
import { AnatomicalQuadrantSwitcher } from "./AnatomicalQuadrantSwitcher";
import type { AnatomicalSvgOdontogramProps } from "./anatomicalSvg/anatomicalSvgProps";
import { areAnatomicalSvgOdontogramPropsEqual } from "./anatomicalSvg/areAnatomicalSvgOdontogramPropsEqual";
import { useAnatomicalOdontogramState } from "./anatomicalSvg/useAnatomicalOdontogramState";
import { AnatomicalBridgeBanner } from "./anatomicalSvg/AnatomicalBridgeBanner";
import { AnatomicalOdontogramLegend } from "./anatomicalSvg/AnatomicalOdontogramLegend";
import { AnatomicalOdontogramArchBody } from "./anatomicalSvg/AnatomicalOdontogramArchBody";

export type { AnatomicalSvgOdontogramProps };
export { areAnatomicalSvgOdontogramPropsEqual };
export * from "./ToothWrapper";
export * from "./AnatomicalToothColors";
export * from "./AnatomicalToothSVG";
export * from "./AnatomicalToothSurfacesLayer";
export * from "./AnatomicalQuadrantSwitcher";
export * from "./AnatomicalDualArchView";

export const AnatomicalSvgOdontogram: React.FC<AnatomicalSvgOdontogramProps> = React.memo((props) => {
	const {
		selectedTeeth = [], activeStamp = null, onToothClick, onQuickStateChange, useSurfaces,
		hideLegend = false, hideQuadrantSwitcher = false, showWisdomTeeth = true, showPulpAndCanals = false,
		showPeriapicalHalos = true, showPeriodontalBoneLoss = true, globalTreatments, onGlobalTreatmentsChange,
		className = "", pediatricMode,
	} = props;

	const s = useAnatomicalOdontogramState(props);
	const [internalGlobals, setInternalGlobals] = useState<GlobalTreatmentItem[]>([]);
	const currentGlobals = globalTreatments ?? internalGlobals;

	return (
		<div className={`tooth-chart-container anatomical-svg-mode ${className}`.trim()} ref={s.containerRef}>
			<DenteToothSvgDefs />
			{!hideQuadrantSwitcher && (
				<AnatomicalQuadrantSwitcher
					currentQuadrant={s.currentQuadrant}
					onSelectQuadrant={s.handleSelectQuadrant}
					isPediatricEffective={s.isPediatricEffective}
					isMixedEffective={s.isMixedEffective}
					showWisdomTeeth={showWisdomTeeth}
					mobileDisplayMode={s.effectiveMobileDisplayMode}
					onToggleMobileDisplayMode={s.handleToggleMobileDisplayMode}
				/>
			)}
			<div className="tooth-chart-arch-container" ref={s.archContainerRef}>
				<AnatomicalOdontogramArchBody
					s={s}
					selectedTeeth={selectedTeeth}
					activeStamp={activeStamp}
					onToothClick={onToothClick}
					onQuickStateChange={onQuickStateChange}
					showPulpAndCanals={showPulpAndCanals}
					showPeriapicalHalos={showPeriapicalHalos}
					showPeriodontalBoneLoss={showPeriodontalBoneLoss}
					useSurfaces={useSurfaces}
					pediatricMode={pediatricMode}
				/>
			</div>
			<AnatomicalBridgeBanner allBridgeSpans={s.allBridgeSpans} />
			<div className="my-1">
				<GlobalTreatmentsStrip
					treatments={currentGlobals}
					onArchHover={s.setHoveredArch}
					onQuickAdd={(item) => {
						const newItem: GlobalTreatmentItem = {
							...item,
							id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
								? `gt-${crypto.randomUUID()}`
								: `gt-${Date.now()}-${currentGlobals.length + 1}`,
						};
						const next = [...currentGlobals, newItem];
						setInternalGlobals(next);
						onGlobalTreatmentsChange?.(next);
					}}
				/>
			</div>
			{!hideLegend && !onQuickStateChange && <AnatomicalOdontogramLegend />}
		</div>
	);
}, areAnatomicalSvgOdontogramPropsEqual);
AnatomicalSvgOdontogram.displayName = "AnatomicalSvgOdontogram";
