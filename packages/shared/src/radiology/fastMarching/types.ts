/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT RADIOLOGY: FAST MARCHING TYPES & SCHEMAS
 * ═══════════════════════════════════════════════════════════════════════════
 * Type definitions, Zod validation schemas, default options, and coordinate
 * conversion helpers for the 3D endodontic Fast Marching Method engine.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import type { Vec3 } from "../implantGeometryEngine.js";
import type { VolumeSpacingMm } from "../cbctCropBox.js";

export type { Vec3 };

// ── Voxel Wavefront States ───────────────────────────────────────

export const VOXEL_STATE_FAR = 0;
export const VOXEL_STATE_TRIAL = 1;
export const VOXEL_STATE_ACCEPTED = 2;

// ── Zod Schemas & Strict Data Contracts ──────────────────────────

export const OrificePointSchema = z.object({
	id: z.string(),
	/** Anatomical canal designation: MB1, MB2, DB, P, ML, MB, D, B, L, or generic */
	canalName: z.string(),
	/** 3D Physical coordinates in CBCT space (mm) */
	worldPositionMm: z.tuple([z.number(), z.number(), z.number()]),
	/** Discrete voxel coordinates [x, y, z] */
	voxelCoordinates: z.tuple([z.number(), z.number(), z.number()]),
	/** Local Frangi tubeness value at orifice */
	tubeness: z.number().min(0).max(1),
	/** Local Hounsfield Unit density */
	hu: z.number(),
	/** Local estimated canal diameter in mm */
	estimatedDiameterMm: z.number().positive(),
});
export type OrificePoint = z.infer<typeof OrificePointSchema>;

export const ApicalForamenSchema = z.object({
	id: z.string(),
	canalName: z.string(),
	/** 3D Physical coordinates of anatomical apex (mm) */
	worldPositionMm: z.tuple([z.number(), z.number(), z.number()]),
	/** Discrete voxel coordinates [x, y, z] */
	voxelCoordinates: z.tuple([z.number(), z.number(), z.number()]),
	/** Local Frangi tubeness */
	tubeness: z.number().min(0).max(1),
	/** Local Hounsfield Unit density */
	hu: z.number(),
});
export type ApicalForamen = z.infer<typeof ApicalForamenSchema>;

export const FastMarchingTraceOptionsSchema = z.object({
	/** Minimum Frangi tubeness considered viable lumen (default: 0.05) */
	minTubenessThreshold: z.number().min(0).max(1).default(0.05),
	/** Soft dentin penalty exponent cutoff HU (default: 1100) */
	dentinPenaltyCutoffHU: z.number().default(1100),
	/** Soft dentin penalty scale HU (default: 400) */
	dentinPenaltyScaleHU: z.number().positive().default(400),
	/** Minimum travel speed epsilon to avoid division by zero (default: 0.001) */
	minSpeedEpsilon: z.number().positive().default(0.001),
	/** RK4 gradient descent sub-voxel step size factor (default: 0.25) */
	rk4StepFactor: z.number().positive().default(0.25),
	/** Maximum number of RK4 integration steps before aborting (default: 5000) */
	maxTraceSteps: z.number().int().positive().default(5000),
	/** Spatial tolerance to declare arrival at orifice in mm (default: 0.6) */
	arrivalToleranceMm: z.number().positive().default(0.6),
});
export type FastMarchingTraceOptions = z.infer<typeof FastMarchingTraceOptionsSchema>;

export const TracedCanalPathSchema = z.object({
	canalId: z.string(),
	canalName: z.string(),
	orifice: OrificePointSchema,
	apicalForamen: ApicalForamenSchema,
	/** Continuous ordered polyline of 3D points from orifice to apex (in mm) */
	polylineMm: z.array(z.tuple([z.number(), z.number(), z.number()])).min(2),
	/** Physical geodesic length in mm */
	geodesicLengthMm: z.number().positive(),
	/** Mean Frangi tubeness along the traced trajectory */
	meanTubeness: z.number().min(0).max(1),
	/** Mean HU along the canal trajectory */
	meanHU: z.number(),
	/** Indicates whether tracing reached the orifice within arrivalToleranceMm */
	reachedOrifice: z.boolean(),
});
export type TracedCanalPath = z.infer<typeof TracedCanalPathSchema>;

export const RootCanalSystemSchema = z.object({
	toothFdi: z.number().int().optional(),
	rootCount: z.number().int().positive(),
	canals: z.array(TracedCanalPathSchema),
	detectedOrifices: z.array(OrificePointSchema),
	detectedApices: z.array(ApicalForamenSchema),
});
export type RootCanalSystem = z.infer<typeof RootCanalSystemSchema>;

export const DEFAULT_TRACE_OPTIONS: Readonly<FastMarchingTraceOptions> = Object.freeze({
	minTubenessThreshold: 0.05,
	dentinPenaltyCutoffHU: 1100,
	dentinPenaltyScaleHU: 400,
	minSpeedEpsilon: 0.001,
	rk4StepFactor: 0.25,
	maxTraceSteps: 5000,
	arrivalToleranceMm: 0.6,
});

export interface OrificeCandidateFilter {
	/** Minimum distance between two distinct canal orifices in mm (default: 1.5) */
	minInterOrificeDistMm?: number;
	/** Expected canal count (e.g., 1 to 4) */
	maxCanalCount?: number;
	/** Vertical search range in mm from cervical constriction */
	searchDepthMm?: number;
}

// ── Voxel Index to Physical Coordinates Conversion ───────────────

/**
 * Converts discrete 3D voxel index [x, y, z] to physical CBCT coordinates in mm.
 */
export function voxelToWorldMm(
	x: number,
	y: number,
	z: number,
	spacing: VolumeSpacingMm,
	origin: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
): Vec3 {
	return [
		origin.x + x * spacing.x,
		origin.y + y * spacing.y,
		origin.z + z * spacing.z,
	];
}

/**
 * Converts physical coordinates in mm to continuous floating-point voxel coordinates.
 */
export function worldToVoxelContinuous(
	posMm: Vec3,
	spacing: VolumeSpacingMm,
	origin: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
): Vec3 {
	return [
		(posMm[0] - origin.x) / Math.max(1e-6, spacing.x),
		(posMm[1] - origin.y) / Math.max(1e-6, spacing.y),
		(posMm[2] - origin.z) / Math.max(1e-6, spacing.z),
	];
}
