/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT 3D IMPLANT GEOMETRY — TYPES & INTERFACES (LAYER 0)
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure data types, geometry vectors, implant parameters, safety zone results,
 * resection contours, and report input structures.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Point2, Vec3 } from "../cprMath.js";

export type { Vec3 };

export interface ImplantDimensions {
	lengthMm: number;
	diameterMm: number;
	platformDiameterMm: number;
	apexDiameterMm: number;
	threadPitchMm: number;
}

export interface Implant3DPlacement {
	position: Vec3;
	direction: Vec3;
	rollDeg?: number;
	toothNumber?: number;
	implantModel?: string;
	dimensions?: ImplantDimensions;
	lengthMm?: number;
	diameterMm?: number;
	corticalClearanceMm?: number;
	canalRadiusMm?: number;
	adjacentToothRadiusMm?: number;
}

export interface ImplantMeshBuffers {
	positions: Float32Array;
	indices: Uint32Array;
	normals: Float32Array;
}

export interface SafetyZoneCheckResult {
	isSafe: boolean;
	minCanalDistanceMm: number;
	minAdjacentDistanceMm: number;
	corticalClearanceMm: number;
	violations: string[];
}

export interface ImplantSafetyOptions {
	canalRadiusMm?: number;
	toothRadiusMm?: number;
	minCanalThresholdMm?: number;
	minAdjacentThresholdMm?: number;
	minCorticalThresholdMm?: number;
	corticalClearanceMm?: number;
}

export interface ImplantPlanningReportInput {
	patientName?: string;
	patientBirthDate?: string;
	medicalRecordNumber?: string;
	studyDate?: string;
	doctorName?: string;
	clinicName?: string;
	toothNumber?: number;
	implantModel?: string;
	dimensions: ImplantDimensions;
	placement: Implant3DPlacement;
	safetyCheck: SafetyZoneCheckResult;
	boneDensityHU?: number;
	boneClass?: string;
	surgicalNotes?: string;
}

export interface ArchFrame {
	s: number;
	point: Point2;
	normal: Point2;
	tangent: Point2;
}

export interface PlaneFrame {
	origin: Vec3;
	eU: Vec3;
	eV: Vec3;
}

export interface ImplantBody {
	entry: Vec3;
	axis: Vec3;
	diameter: number;
	length: number;
}

export interface SleeveSpec {
	diameter: number;
	offset: number;
	height: number;
}

export interface VirtualImplantParams {
	readonly id?: string;
	readonly entry: Vec3;
	readonly axis: Vec3;
	readonly length: number;
	readonly diameter: number;
	readonly apexRadius?: number;
	readonly radiusFn?: (t01: number) => number;
	readonly toothNumber?: number;
	readonly fdiCode?: string;
}

export interface ImplantSliceContour {
	readonly points2D: [number, number][];
	readonly points3D: Vec3[];
	readonly center3D: Vec3;
	readonly planeFrame: PlaneFrame;
	readonly isVisible: boolean;
	readonly maxSpanMm: number;
	readonly averageRadiusMm: number;
}
