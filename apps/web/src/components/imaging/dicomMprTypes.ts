/**
 * DENTE CRM — Clinical DICOM & CBCT MPR Types & Clinical Constants
 * Native Multi-Planar Reconstruction and Sectioning data models
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandates 8b, 8c, 8d, 8e
 * Mandate 8b: строго <= 120 строк.
 */

export type DicomMprTabType = "2D" | "MPR" | "SECTION" | "3D_PANO" | "TMJ";

export type DicomActiveTool =
	| "pan"
	| "zoom"
	| "angle"
	| "ruler"
	| "polyline"
	| "implant"
	| "rotate"
	| "none";

export type DicomVrPreset =
	| "bone"
	| "dense_bone"
	| "soft_tissue"
	| "mip"
	| "roots"
	| "contrast";

export interface DicomSliceState {
	coronal: number;
	coronalMax: number;
	sagittal: number;
	sagittalMax: number;
	axial: number;
	axialMax: number;
	thicknessMm: number;
	intervalMm: number;
}

export interface SkullOrientationPreset {
	id: number;
	nameRu: string;
	shortCode: string;
	pitch: number;
	yaw: number;
	roll: number;
	iconSvgPath?: string;
}

export interface DicomCrosshairPosition {
	x: number; // 0..1 relative to viewport width
	y: number; // 0..1 relative to viewport height
}

export interface DicomPoint2D {
	x: number;
	y: number;
}

export interface DicomImplantModel {
	id: string;
	toothFdi: string;
	lengthMm: number;
	diameterMm: number;
	position: { x: number; y: number; z: number };
	angleDeg: number;
	typeLabel: string;
}

export interface DicomMeasurement {
	id: string;
	plane: "coronal" | "sagittal" | "axial" | "3d";
	start: DicomPoint2D;
	end: DicomPoint2D;
	distanceMm: number;
	label?: string;
}

export { SKULL_PRESETS, VR_PRESET_CONFIGS } from "./dicomMprPresets.js";

// ============================================================================
// Zero-downtime backwards compatibility aliases
// ============================================================================
export type Ez3dTabType = DicomMprTabType;
export type Ez3dActiveTool = DicomActiveTool;
export type Ez3dVrPreset = DicomVrPreset;
export type Ez3dSliceState = DicomSliceState;
export type Ez3dCrosshairPosition = DicomCrosshairPosition;
export type Ez3dPoint2D = DicomPoint2D;
export type Ez3dImplantModel = DicomImplantModel;
export type Ez3dMeasurement = DicomMeasurement;
