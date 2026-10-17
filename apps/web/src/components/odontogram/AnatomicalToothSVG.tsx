/**
 * DENTE Dental CRM — Anatomical Tooth SVG Renderer
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import { AnatomicalImplantSVG } from "./AnatomicalImplantSVG";
import type { AnatomicalToothSVGProps } from "./anatomicalToothSvg/anatomicalToothSvgProps";
import { areAnatomicalToothSvgPropsEqual } from "./anatomicalToothSvg/areAnatomicalToothSvgPropsEqual";
import { useAnatomicalToothVisuals } from "./anatomicalToothSvg/useAnatomicalToothVisuals";
import { ToothRootsLayer } from "./anatomicalToothSvg/ToothRootsLayer";
import { ToothCanalsLayer } from "./anatomicalToothSvg/ToothCanalsLayer";
import { ToothPeriodontalLayer } from "./anatomicalToothSvg/ToothPeriodontalLayer";
import { ToothPeriapicalLayer } from "./anatomicalToothSvg/ToothPeriapicalLayer";
import { ToothCrownLayer } from "./anatomicalToothSvg/ToothCrownLayer";

export type { AnatomicalToothSVGProps };
export { areAnatomicalToothSvgPropsEqual };
export * from "./AnatomicalImplantSVG";
export * from "./AnatomicalRestorativeAccents";

export const AnatomicalToothSVG: React.FC<AnatomicalToothSVGProps> = React.memo((props) => {
	const {
		number, state, postType = "fiber", hasApicoectomy, hasPost, hasFracture,
		canalObturationLevel = "full", furcation = 0, bopSites, suppurationSites,
		useSurfaces = false, surfaces, onClick, showPeriodontalBoneLoss = true,
	} = props;

	const {
		geom, isTop, effectiveMaterial, isImplantState, colors, scaledWidth, scaledHeight,
		isLowSpec, resorptionGeom, effectiveRootPath, effectiveCanals, effectiveCanalObturation,
		shouldRenderCanals, boneLine, resorptionArea, recessionPath, effectiveLesionSize,
	} = useAnatomicalToothVisuals(props);

	if (isImplantState) {
		return (
			<AnatomicalImplantSVG
				number={number} state={state} isTop={isTop} scaledWidth={scaledWidth}
				scaledHeight={scaledHeight} geom={geom} colors={colors}
			/>
		);
	}

	return (
		<svg
			width={scaledWidth}
			height={scaledHeight}
			viewBox={`${geom.viewBox.x} ${geom.viewBox.y} ${geom.viewBox.width} ${geom.viewBox.height}`}
			preserveAspectRatio="none"
			className={`tooth-svg-element ${colors.isPulsing ? "animate-pulse stroke-[2.5px]" : ""}`}
		>
			<title>{`Зуб ${number} (${state})`}</title>
			<g className="tooth-group-root">
				<ToothRootsLayer
					effectiveRootPath={effectiveRootPath} resorptionGeom={resorptionGeom}
					colors={colors} isLowSpec={isLowSpec} hasApicoectomy={hasApicoectomy} isTop={isTop}
				/>
				{shouldRenderCanals && (
					<ToothCanalsLayer
						pulpChamberPath={geom.pulpChamberPath} effectiveCanals={effectiveCanals}
						hasPost={hasPost} postType={postType} isTop={isTop}
						effectiveCanalObturation={effectiveCanalObturation} effectiveCanalLevel={canalObturationLevel}
					/>
				)}
				{showPeriodontalBoneLoss && (
					<ToothPeriodontalLayer
						boneLine={boneLine} resorptionArea={resorptionArea} gingivalRecessionPath={recessionPath}
						furcationSites={geom.periodontal.furcationSites} effectiveFurcation={furcation}
						isTop={isTop} bopSites={bopSites} suppurationSites={suppurationSites}
					/>
				)}
				<ToothPeriapicalLayer apexHalos={geom.apexHalos} effectiveLesionSize={effectiveLesionSize} />
			</g>
			<ToothCrownLayer
				geom={geom} colors={colors} state={state} material={effectiveMaterial}
				hasFracture={hasFracture} isTop={isTop} useSurfaces={useSurfaces}
				surfaces={surfaces} onSurfaceClick={(surfaceKey) => onClick({} as any, number, surfaceKey)}
			/>
		</svg>
	);
}, areAnatomicalToothSvgPropsEqual);

AnatomicalToothSVG.displayName = "AnatomicalToothSVG";
