/**
 * DENTE CRM — Mandibular Nerve Fast Marching Types & Constants (Layer 0)
 * Mandate 8b compliant (strictly <= 120 lines).
 */

import type { Point3D } from "../cbctMprMath.js";

export const VATECH_CANAL_BASE_DIAMETER_MM = 2.0;
export const VATECH_CANAL_SAFETY_ZONE_MM = 2.0;
export const VATECH_MINIMAL_APICAL_DISTANCE_MM = 3.0;
export const VATECH_COLLISION_DANGER_MM = 1.5;

export interface VoxelPoint3D {
	readonly x: number;
	readonly y: number;
	readonly z: number;
}

export interface VolumeDimensions3D {
	readonly width: number;
	readonly height: number;
	readonly depth: number;
	readonly spacingX: number;
	readonly spacingY: number;
	readonly spacingZ: number;
}

export interface FastMarchingNerveOptions {
	readonly roiPaddingVoxels?: number | undefined;
	readonly canalHypodenseMinHU?: number | undefined;
	readonly canalHypodenseMaxHU?: number | undefined;
	readonly sigmoidAlpha?: number | undefined;
	readonly sigmoidBeta?: number | undefined;
	readonly defaultDiameterMm?: number | undefined;
	readonly safetyMarginMm?: number | undefined;
	readonly warningApicalDistanceMm?: number | undefined;
	readonly dangerCollisionThresholdMm?: number | undefined;
	readonly subdivisionsPerSegment?: number | undefined;
	readonly precomputedCostField?: Float32Array | undefined;
}

export interface FastMarchingNerveResult {
	readonly voxelPath: readonly VoxelPoint3D[];
	readonly physicalSpline: readonly Point3D[];
	readonly controlPoints: readonly Point3D[];
	readonly totalLengthMm: number;
	readonly estimatedDiameterMm: number;
	readonly executionTimeMs: number;
	readonly seeds: {
		readonly mentalForamen: Point3D;
		readonly mandibularForamen: Point3D;
	};
	readonly safetyZoneMarginMm: number;
	readonly warningApicalDistanceMm: number;
	readonly dangerCollisionThresholdMm: number;
}

export interface VatechClearanceAuditResult {
	readonly apicalClearanceMm: number;
	readonly bodyClearanceMm: number;
	readonly worstClearanceMm: number;
	readonly safetyStatus: "safe" | "warning" | "danger";
	readonly isDanger: boolean;
	readonly isWarning: boolean;
	readonly isSafe: boolean;
	readonly warningApicalDistanceMm: number;
	readonly dangerCollisionThresholdMm: number;
	readonly safetyZoneMarginMm: number;
	readonly messageRu: string;
}
