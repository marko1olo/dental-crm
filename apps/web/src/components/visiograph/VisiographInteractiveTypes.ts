/**
 * VisiographInteractiveTypes.ts
 * Types for in-progress interactive tool drawings.
 */

import type { CalibrationReference, Point2D } from "./VisiographMeasurementMath";

export type ActiveVisiographToolType =
	| "pointer"
	| "ruler"
	| "calibrate"
	| "angle"
	| "lesion"
	| "root_canal";

export interface DrawInteractiveOverlayOptions {
	activeTool: ActiveVisiographToolType;
	drawingPoints: Point2D[];
	hoverPos: Point2D | null;
	calibration: CalibrationReference;
}
