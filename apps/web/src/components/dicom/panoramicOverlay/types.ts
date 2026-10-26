/**
 * types.ts — Типы измерений для панорамного оверлея
 * Mandate 8b: строго <= 120 строк.
 */

export interface RulerMeasurement {
	readonly id: string;
	readonly p1: { x: number; y: number };
	readonly p2: { x: number; y: number };
	readonly distanceMm: number;
}

export interface AngleMeasurement {
	readonly id: string;
	readonly p1: { x: number; y: number };
	readonly p2: { x: number; y: number }; // Vertex
	readonly p3: { x: number; y: number };
	readonly angleDeg: number;
}

export interface PanoramicMeasurementOverlayProps {
	readonly activeTool: "select" | "ruler" | "angle";
	readonly mmPerPixel: number; // Calibration factor
	readonly width: number;
	readonly height: number;
	readonly rulers: RulerMeasurement[];
	readonly onUpdateRulers: (rulers: RulerMeasurement[]) => void;
	readonly angles: AngleMeasurement[];
	readonly onUpdateAngles: (angles: AngleMeasurement[]) => void;
}
