/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 3D OPTICAL SCAN REGISTRATION & TOOTH SETUP — TYPES & CONTRACTS (LAYER 0)
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure data types, geometry interfaces, quality ratings, ICP configurations,
 * and clinical protocol DTOs for intraoral optical and CBCT registration.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Point2, Vec3 } from "../cprMath.js";
import type { ArchFrame } from "../implantGeometryEngine.js";

export type { ArchFrame };
export type { Point2, Vec3 };

export interface JacobiEigenResult {
	values: number[];
	vectors: number[][];
}

export type RegistrationQuality = "excellent" | "acceptable" | "poor";

export interface KabschResultWithQuality {
	matrix: number[];
	rmsMm: number;
	quality: RegistrationQuality;
}

export interface KabschResultWithRms {
	matrix: number[];
	rmsMm: number;
}

export interface IcpOptions {
	/** Maximum iterations (default 40). */
	maxIterations?: number;
	/** Stop when the RMS improvement between iterations drops below this threshold in mm (default 1e-4). */
	tolerance?: number;
	/** Initial source -> target transform (4x4 column-major, default identity). */
	initial?: number[];
}

export interface IcpResult {
	/** Refined source -> target rigid transform (4x4 column-major). */
	transform: number[];
	/** Final RMS of each source point to its nearest target point in mm. */
	rmsMm: number;
	/** Total iterations executed. */
	iterations: number;
}

export interface MeshRayHit {
	point: Vec3;
	distance: number;
	triangleIndex: number;
}

export interface PrincipalAxis {
	/** 3D Centroid [cx, cy, cz] of the point cluster. */
	centroid: Vec3;
	/** Normalized unit eigenvector of largest variance (tooth long axis; sign arbitrary). */
	axis: Vec3;
	/** Total extent (max - min projection) along the long axis in mm. */
	extent: number;
}

export interface CrownImplantSuggestion {
	position: Vec3;
	angleBLDeg: number;
	angleMDDeg: number;
	axis: Vec3;
	centroid: Vec3;
	extentMm: number;
}

export interface ScanRegistrationProtocolInput {
	patientName?: string;
	doctorName?: string;
	clinicName?: string;
	dateStr?: string;
	toothNumber?: number;
	landmarkCount?: number;
	rmsMm: number;
	quality: RegistrationQuality;
	transformMatrix?: number[];
	crownSuggestion?: CrownImplantSuggestion | null;
	clinicalNotes?: string;
}

export interface RegistrationProtocolInput {
	landmarkRmsMm: number;
	icpRmsMm: number;
	iterations: number;
	scanPointsCount: number;
	isClinicallyAcceptable: boolean;
}
