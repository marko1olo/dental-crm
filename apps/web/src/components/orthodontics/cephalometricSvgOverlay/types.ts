import type React from "react";
import type { LandmarkKey, LandmarkMap, Point2D } from "../cephalometricMath";

export interface CephalometricSvgOverlayProps {
	landmarks: LandmarkMap;
	showPlanes: boolean;
	showPolygon: boolean;
	showLabels: boolean;
	calibrationPoints: Point2D[];
	activeTargetKey: LandmarkKey | null;
	hoveredKey: LandmarkKey | null;
	draggingKey: LandmarkKey | null;
	onHoverKey: (key: LandmarkKey | null) => void;
	onStartDrag: (key: LandmarkKey) => void;
	onSelectTargetKey: (key: LandmarkKey | null) => void;
	onRemoveLandmark?: ((key: LandmarkKey) => void) | undefined;
	viewBoxWidth: number;
	viewBoxHeight: number;
	svgRef: React.RefObject<SVGSVGElement | null>;
}
