/**
 * DENTE DENTAL CRM — 2D Radiology Viewer Mathematical Types & Contracts
 * Pure type definitions (Layer 0) for coordinates, measurements, presets, and transformations.
 */

export interface ViewerPoint2D {
	x: number;
	y: number;
}

export interface ViewerRulerMeasurement {
	id: string;
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	lengthMm: number;
	label?: string;
	color?: string;
}

export interface ClinicalWlPreset {
	id: string;
	label: string;
	shortLabel: string;
	description: string;
	brightness: number; // 0..200 (100 = default)
	contrast: number; // 0..300 (100 = default)
	invert: boolean;
	gamma: number; // 0.5..2.0
}

/** Standard pixel spacing in millimeters for dental modalities */
export type DentalModalityKey =
	| "rvg"
	| "intraoral_rvg"
	| "periapical"
	| "bitewing"
	| "opg"
	| "optg_panoramic"
	| "cbct"
	| "cbct_3d"
	| "cbct_slice"
	| "other";

export interface CursorCenteredZoomParams {
	readonly currentZoom: number;
	readonly zoomFactor: number;
	readonly cursorX: number;
	readonly cursorY: number;
	readonly canvasWidth: number;
	readonly canvasHeight: number;
	readonly currentPanX: number;
	readonly currentPanY: number;
	readonly minZoom?: number;
	readonly maxZoom?: number;
}

export interface CursorCenteredZoomResult {
	readonly nextZoom: number;
	readonly nextPanX: number;
	readonly nextPanY: number;
}

export interface VatechImageProcessingPreset {
	readonly id: string;
	readonly captionRu: string;
	readonly usmSteps: number;
	readonly usmAmount: number;
	readonly usmRadius: number;
	readonly histEquThreshold: number;
	readonly invert: boolean;
	readonly segmentCoeff: number;
}

export interface ViewerCurvedMeasurement {
	id: string;
	points: readonly ViewerPoint2D[];
	totalLengthMm: number;
	lengthMm?: number;
	label?: string;
	color?: string;
}

export interface ViewerAngleMeasurement {
	id: string;
	vertex: ViewerPoint2D;
	arm1: ViewerPoint2D;
	arm2: ViewerPoint2D;
	angleDegrees: number;
	label?: string;
	color?: string;
}

export interface ViewerAreaMeasurement {
	id: string;
	points: readonly ViewerPoint2D[];
	areaMm2: number;
	perimeterMm?: number;
	label?: string;
	color?: string;
}
