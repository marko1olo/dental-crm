import React from "react";
import type { CephalometricSvgOverlayProps } from "./cephalometricSvgOverlay/types";
import { PlanesLayer } from "./cephalometricSvgOverlay/PlanesLayer";
import { PolygonLayer } from "./cephalometricSvgOverlay/PolygonLayer";
import { CalibrationLayer } from "./cephalometricSvgOverlay/CalibrationLayer";
import { LandmarksLayer } from "./cephalometricSvgOverlay/LandmarksLayer";

export type { CephalometricSvgOverlayProps };

export function CephalometricSvgOverlay(props: CephalometricSvgOverlayProps) {
	return (
		<svg
			ref={props.svgRef}
			viewBox={`0 0 ${props.viewBoxWidth} ${props.viewBoxHeight}`}
			className="absolute inset-0 w-full h-full overflow-visible pointer-events-auto"
		>
			{props.showPlanes && <PlanesLayer landmarks={props.landmarks} />}
			{props.showPolygon && <PolygonLayer landmarks={props.landmarks} />}
			<CalibrationLayer calibrationPoints={props.calibrationPoints} />
			<LandmarksLayer
				landmarks={props.landmarks}
				showLabels={props.showLabels}
				activeTargetKey={props.activeTargetKey}
				hoveredKey={props.hoveredKey}
				draggingKey={props.draggingKey}
				onHoverKey={props.onHoverKey}
				onStartDrag={props.onStartDrag}
				onSelectTargetKey={props.onSelectTargetKey}
				onRemoveLandmark={props.onRemoveLandmark}
			/>
		</svg>
	);
}
