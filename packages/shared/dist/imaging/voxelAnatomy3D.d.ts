/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTAL 3D VOXEL ANATOMY & IMPLANT CALIBRATION ENGINE
 * Voxel Spacing (X, Y, Z), Mandibular Nerve Safety Corridors & Maxillary Sinus Floor
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type { VoxelSpacing3D } from "./dicomParser.js";
export interface Point3D {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}
export type VoxelSpacingInput = VoxelSpacing3D | readonly [number, number, number];
export declare function normalizeVoxelSpacing(input: VoxelSpacingInput): VoxelSpacing3D;
/**
 * Calculates physical 3D Euclidean distance in mm calibrated with anisotropic voxel spacing.
 */
export declare function measure3DDistanceMm(p1: Point3D, p2: Point3D, voxelSpacing?: VoxelSpacingInput): number;
/**
 * Calculates shortest distance from a 3D point to a 3D line segment (in physical mm).
 */
export declare function distancePointToSegment3DMm(point: Point3D, segStart: Point3D, segEnd: Point3D, voxelSpacing: VoxelSpacingInput): {
    readonly distanceMm: number;
    readonly closestPoint: Point3D;
};
/** ─── 1. MANDIBULAR NERVE (НИЖНЕЧЕЛЮСТНОЙ КАНАЛ) SAFETY CORRIDOR ─── */
export interface MandibularNerveMeasurement {
    readonly distanceMm: number;
    readonly safetyZone: "safe" | "warning" | "danger";
    readonly isSafe: boolean;
    readonly clinicalAdvice: string;
    readonly closestNervePoint: Point3D;
    readonly voxelSpacing: VoxelSpacing3D;
}
/**
 * Evaluates the safety distance from an implant apex to the mandibular canal (N. Alveolaris Inferior).
 * - Safe: >= 2.0 mm
 * - Warning: 1.0 - 2.0 mm
 * - Danger: < 1.0 mm (Immediate risk of neurotmesis/paresthesia)
 */
export declare function measureDistanceToMandibularNerve(implantApex: Point3D, nerveTrajectoryPoints: readonly Point3D[], voxelSpacing?: VoxelSpacingInput): MandibularNerveMeasurement;
/** ─── 2. MAXILLARY SINUS FLOOR (ДНО ГАЙМОРОВОЙ ПАЗУХИ) & SINUS LIFT PROTOCOL ─── */
export interface MaxillarySinusMeasurement {
    readonly residualBoneHeightMm: number;
    readonly sinusLiftRecommended: boolean;
    readonly sinusLiftType: "none" | "crestal_closed" | "lateral_open";
    readonly clinicalAdvice: string;
    readonly voxelSpacing: VoxelSpacing3D;
}
/**
 * Measures residual alveolar bone height to the floor of the maxillary sinus
 * and calculates surgical sinus lift indications (Crestal Summers vs Lateral Window).
 */
export declare function measureDistanceToMaxillarySinus(alveolarCrestPoint: Point3D, sinusFloorPoint: Point3D, voxelSpacing?: VoxelSpacingInput): MaxillarySinusMeasurement;
