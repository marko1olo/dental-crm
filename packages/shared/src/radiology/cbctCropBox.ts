/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL DENTAL CBCT: CROP BOX ENGINE & SUB-VOLUME EXTRACTION
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure 3D analytical geometry and sub-volume extraction algorithms for
 * dental CBCT (Cone Beam Computed Tomography) interest zone clipping:
 *
 * 1. Normalized Axis-Aligned CropBox ([0..1] range per axis)
 * 2. World-Space Analytical Clipping Planes (VTK convention: point-normal halfspaces)
 * 3. Point Containment Predicates (World and Normalized Coordinates)
 * 4. Sub-Volume Extraction (extractSubVolume) into Calibrated CbctVoxelVolume
 *    - 3x to 5x RAM reduction when focusing on single quadrants or implant beds
 *    - High-throughput TypedArray row copies (native memcpy speed)
 *    - Millimeter-exact spatial recalibration of originMm and physicalSizeMm
 * 5. Anatomical Dental Presets (Maxilla, Mandible, Quadrants 1-4, Anterior Zone)
 *
 * 100% pure TypeScript, zero dependencies on DOM or React, fully unit-testable.
 * Standards: DICOM Part 3, Misch Bone Quality, ITI Consensus
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Point3D } from "../imaging/voxelAnatomy3D.js";
import { type Vec3 } from "./cbctSafetyEngine.js";

export type { Vec3 };
export type CbctPoint3D = Point3D;

export interface VolumeDimensions {
  readonly width: number; // X voxels (Sagittal)
  readonly height: number; // Y voxels (Coronal)
  readonly depth: number; // Z voxels (Axial)
}

export interface VolumeSpacingMm {
  readonly x: number; // mm per voxel along X
  readonly y: number; // mm per voxel along Y
  readonly z: number; // mm per voxel along Z
}

export interface CbctVoxelVolume {
  readonly id: string;
  readonly dimensions: VolumeDimensions;
  readonly spacingMm: VolumeSpacingMm;
  readonly originMm: Point3D;
  readonly physicalSizeMm: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  data: Int16Array | null; // Calibrated HU data: index = z * (W * H) + y * W + x
  readonly minHU: number;
  readonly maxHU: number;
  readonly rescaleSlope?: number | undefined;
  readonly rescaleIntercept?: number | undefined;
  readonly defaultWindowWidth?: number | undefined;
  readonly defaultWindowLevel?: number | undefined;
  readonly isDisposed: boolean;
}

/**
 * Normalized axis-aligned bounding box for CBCT region of interest (0..1).
 */
export interface CropBox {
  /** Lower corner, normalized 0–1 of the volume bounds: [xMin, yMin, zMin] */
  min: [number, number, number];
  /** Upper corner, normalized 0–1 of the volume bounds: [xMax, yMax, zMax] */
  max: [number, number, number];
}

/**
 * Full uncropped volume box sentinel.
 */
export const NO_CROP: Readonly<CropBox> = Object.freeze({
  min: [0, 0, 0] as [number, number, number],
  max: [1, 1, 1] as [number, number, number],
});

/**
 * World-space plane definition for volumetric mappers and raymarchers.
 * Retains the half-space where: (point - origin) · normal >= 0
 */
export interface ClipPlaneParam {
  origin: Vec3;
  normal: Vec3;
}

/** Standard Cartesian axes in 3D: +X, +Y, +Z */
export const AXES_3D: readonly Vec3[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/**
 * Discrete voxel index range for a cropped sub-volume.
 */
export interface VoxelCropBounds {
  startX: number;
  startY: number;
  startZ: number;
  endX: number;
  endY: number;
  endZ: number;
  width: number;
  height: number;
  depth: number;
}

/**
 * Configuration options for sub-volume extraction.
 */
export interface ExtractSubVolumeOptions {
  idPrefix?: string | undefined;
  targetId?: string | undefined;
  computeActualHURange?: boolean | undefined;
}

/**
 * Memory footprint reduction telemetry for a given crop box.
 */
export interface SubVolumeMemoryEstimate {
  originalVoxels: number;
  subVoxels: number;
  originalBytes: number;
  subBytes: number;
  reductionFactor: number;
  savingsPercent: number;
}

/**
 * Standard clinical dental anatomical presets for quick ROI cropping.
 */
export const DENTAL_CROP_PRESETS = {
  FULL: NO_CROP,
  /** Upper jaw (Maxilla + maxillary sinus floor) */
  MAXILLA: Object.freeze({
    min: [0.0, 0.0, 0.45] as [number, number, number],
    max: [1.0, 0.85, 1.0] as [number, number, number],
  } as CropBox),
  /** Lower jaw (Mandible + mandibular canal + chin) */
  MANDIBLE: Object.freeze({
    min: [0.0, 0.0, 0.0] as [number, number, number],
    max: [1.0, 0.85, 0.55] as [number, number, number],
  } as CropBox),
  /** Upper Right Quadrant 1 (teeth 18..11) */
  QUADRANT_1: Object.freeze({
    min: [0.5, 0.0, 0.45] as [number, number, number],
    max: [1.0, 0.85, 1.0] as [number, number, number],
  } as CropBox),
  /** Upper Left Quadrant 2 (teeth 21..28) */
  QUADRANT_2: Object.freeze({
    min: [0.0, 0.0, 0.45] as [number, number, number],
    max: [0.5, 0.85, 1.0] as [number, number, number],
  } as CropBox),
  /** Lower Left Quadrant 3 (teeth 31..38) */
  QUADRANT_3: Object.freeze({
    min: [0.0, 0.0, 0.0] as [number, number, number],
    max: [0.5, 0.85, 0.55] as [number, number, number],
  } as CropBox),
  /** Lower Right Quadrant 4 (teeth 48..41) */
  QUADRANT_4: Object.freeze({
    min: [0.5, 0.0, 0.0] as [number, number, number],
    max: [1.0, 0.85, 0.55] as [number, number, number],
  } as CropBox),
  /** Anterior aesthetic zone (teeth 13..23 / 33..43) */
  ANTERIOR_ZONE: Object.freeze({
    min: [0.25, 0.0, 0.1] as [number, number, number],
    max: [0.75, 0.45, 0.9] as [number, number, number],
  } as CropBox),
} as const;

// ── Normalization & Validation ─────────────────────────────────

/**
 * Validates and normalizes a CropBox ensuring min <= max and all values in [0..1].
 */
export function normalizeCropBox(crop: CropBox): CropBox {
  const min: [number, number, number] = [
    Math.max(0, Math.min(1, Math.min(crop.min[0], crop.max[0]))),
    Math.max(0, Math.min(1, Math.min(crop.min[1], crop.max[1]))),
    Math.max(0, Math.min(1, Math.min(crop.min[2], crop.max[2]))),
  ];
  const max: [number, number, number] = [
    Math.max(0, Math.min(1, Math.max(crop.min[0], crop.max[0]))),
    Math.max(0, Math.min(1, Math.max(crop.min[1], crop.max[1]))),
    Math.max(0, Math.min(1, Math.max(crop.min[2], crop.max[2]))),
  ];
  return { min, max };
}

/**
 * Checks whether any clipping actually cuts into the volume.
 */
export function isCropActive(crop: CropBox, tolerance = 0.001): boolean {
  const norm = normalizeCropBox(crop);
  for (let a = 0; a < 3; a++) {
    const minVal = norm.min[a as 0 | 1 | 2]!;
    const maxVal = norm.max[a as 0 | 1 | 2]!;
    if (minVal > tolerance || maxVal < 1.0 - tolerance) {
      return true;
    }
  }
  return false;
}

// ── World-Space Analytical Clipping Planes ─────────────────────

/**
 * Clipping planes for the crop box within world bounds [bmin, bmax].
 * Only the sides that actually cut (crop.min > tolerance or crop.max < 1 - tolerance)
 * produce a plane.
 *
 * Convention: a plane keeps the half-space where (point - origin) · normal >= 0.
 * - Min side: normal = +AXIS (keeps coords >= origin)
 * - Max side: normal = -AXIS (keeps coords <= origin)
 */
export function clipPlanes(
  bmin: Vec3,
  bmax: Vec3,
  crop: CropBox,
  tolerance = 0.001,
): ClipPlaneParam[] {
  const norm = normalizeCropBox(crop);
  const planes: ClipPlaneParam[] = [];

  for (let a = 0; a < 3; a++) {
    const bminA = bmin[a as 0 | 1 | 2]!;
    const bmaxA = bmax[a as 0 | 1 | 2]!;
    const span = bmaxA - bminA;
    const pos = AXES_3D[a]!;
    const neg: Vec3 = [-pos[0], -pos[1], -pos[2]];

    const normMin = norm.min[a as 0 | 1 | 2]!;
    const normMax = norm.max[a as 0 | 1 | 2]!;

    if (normMin > tolerance) {
      const o: Vec3 = [bmin[0]!, bmin[1]!, bmin[2]!];
      o[a] = bminA + normMin * span;
      planes.push({ origin: o, normal: pos }); // keep coord >= lo
    }

    if (normMax < 1.0 - tolerance) {
      const o: Vec3 = [bmin[0]!, bmin[1]!, bmin[2]!];
      o[a] = bminA + normMax * span;
      planes.push({ origin: o, normal: neg }); // keep coord <= hi
    }
  }

  return planes;
}

/**
 * Computes world-space clipping planes directly from a CbctVoxelVolume.
 */
export function clipPlanesFromVolume(
  volume: CbctVoxelVolume,
  crop: CropBox,
  tolerance = 0.001,
): ClipPlaneParam[] {
  const bmin: Vec3 = [volume.originMm.x, volume.originMm.y, volume.originMm.z];
  const bmax: Vec3 = [
    volume.originMm.x + volume.physicalSizeMm.x,
    volume.originMm.y + volume.physicalSizeMm.y,
    volume.originMm.z + volume.physicalSizeMm.z,
  ];
  return clipPlanes(bmin, bmax, crop, tolerance);
}

// ── Point Containment Predicates ───────────────────────────────

/**
 * Checks if a 3D point (world mm) is inside the world-space crop box bounds.
 */
export function isPointInsideCropBox(
  p: Vec3 | Point3D,
  bmin: Vec3,
  bmax: Vec3,
  crop: CropBox,
  tolerance = 1e-5,
): boolean {
  const norm = normalizeCropBox(crop);
  const px = Array.isArray(p) ? p[0]! : p.x;
  const py = Array.isArray(p) ? p[1]! : p.y;
  const pz = Array.isArray(p) ? p[2]! : p.z;
  const pt: [number, number, number] = [px, py, pz];

  for (let a = 0; a < 3; a++) {
    const bminA = bmin[a as 0 | 1 | 2]!;
    const bmaxA = bmax[a as 0 | 1 | 2]!;
    const span = bmaxA - bminA;
    const lo = bminA + norm.min[a as 0 | 1 | 2]! * span;
    const hi = bminA + norm.max[a as 0 | 1 | 2]! * span;
    const ptA = pt[a as 0 | 1 | 2]!;
    if (ptA < lo - tolerance || ptA > hi + tolerance) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if a normalized point [0..1] per axis is inside the crop box.
 */
export function isNormalizedPointInsideCropBox(
  normP: Vec3 | Point3D,
  crop: CropBox,
  tolerance = 1e-5,
): boolean {
  const norm = normalizeCropBox(crop);
  const px = Array.isArray(normP) ? normP[0]! : normP.x;
  const py = Array.isArray(normP) ? normP[1]! : normP.y;
  const pz = Array.isArray(normP) ? normP[2]! : normP.z;
  const pt: [number, number, number] = [px, py, pz];

  for (let a = 0; a < 3; a++) {
    const ptA = pt[a as 0 | 1 | 2]!;
    const minA = norm.min[a as 0 | 1 | 2]!;
    const maxA = norm.max[a as 0 | 1 | 2]!;
    if (ptA < minA - tolerance || ptA > maxA + tolerance) {
      return false;
    }
  }

  return true;
}

/**
 * Verifies if a point satisfies all clipping half-space planes.
 */
export function doesPointSatisfyClipPlanes(
  p: Vec3 | Point3D,
  planes: readonly ClipPlaneParam[],
  tolerance = 1e-5,
): boolean {
  const px = Array.isArray(p) ? p[0]! : p.x;
  const py = Array.isArray(p) ? p[1]! : p.y;
  const pz = Array.isArray(p) ? p[2]! : p.z;

  for (const plane of planes) {
    const dx = px - plane.origin[0]!;
    const dy = py - plane.origin[1]!;
    const dz = pz - plane.origin[2]!;
    const dot = dx * plane.normal[0]! + dy * plane.normal[1]! + dz * plane.normal[2]!;
    if (dot < -tolerance) {
      return false;
    }
  }

  return true;
}

// ── Voxel Indexing & Bounds Conversion ─────────────────────────

/**
 * Converts a normalized CropBox into discrete voxel bounding indices.
 */
export function voxelBoundsFromCropBox(
  crop: CropBox,
  dims: VolumeDimensions,
): VoxelCropBounds {
  const norm = normalizeCropBox(crop);
  const { width: W, height: H, depth: D } = dims;

  let startX = Math.floor(norm.min[0] * W);
  let endX = Math.ceil(norm.max[0] * W);
  let startY = Math.floor(norm.min[1] * H);
  let endY = Math.ceil(norm.max[1] * H);
  let startZ = Math.floor(norm.min[2] * D);
  let endZ = Math.ceil(norm.max[2] * D);

  // Clamp to valid discrete voxel coordinates
  startX = Math.max(0, Math.min(W - 1, startX));
  endX = Math.max(startX + 1, Math.min(W, endX));

  startY = Math.max(0, Math.min(H - 1, startY));
  endY = Math.max(startY + 1, Math.min(H, endY));

  startZ = Math.max(0, Math.min(D - 1, startZ));
  endZ = Math.max(startZ + 1, Math.min(D, endZ));

  return {
    startX,
    startY,
    startZ,
    endX,
    endY,
    endZ,
    width: endX - startX,
    height: endY - startY,
    depth: endZ - startZ,
  };
}

/**
 * Converts discrete voxel coordinates back to a normalized CropBox.
 */
export function cropBoxFromVoxelBounds(
  bounds: { startX: number; startY: number; startZ: number; endX: number; endY: number; endZ: number },
  dims: VolumeDimensions,
): CropBox {
  const W = Math.max(1, dims.width);
  const H = Math.max(1, dims.height);
  const D = Math.max(1, dims.depth);

  return {
    min: [
      Math.max(0, Math.min(1, bounds.startX / W)),
      Math.max(0, Math.min(1, bounds.startY / H)),
      Math.max(0, Math.min(1, bounds.startZ / D)),
    ],
    max: [
      Math.max(0, Math.min(1, bounds.endX / W)),
      Math.max(0, Math.min(1, bounds.endY / H)),
      Math.max(0, Math.min(1, bounds.endZ / D)),
    ],
  };
}

/**
 * Calculates world-space min and max bounds for a crop box.
 */
export function worldBoundsFromCropBox(
  crop: CropBox,
  bmin: Vec3,
  bmax: Vec3,
): { min: Vec3; max: Vec3 } {
  const norm = normalizeCropBox(crop);
  const min: Vec3 = [
    bmin[0]! + norm.min[0] * (bmax[0]! - bmin[0]!),
    bmin[1]! + norm.min[1] * (bmax[1]! - bmin[1]!),
    bmin[2]! + norm.min[2] * (bmax[2]! - bmin[2]!),
  ];
  const max: Vec3 = [
    bmin[0]! + norm.max[0] * (bmax[0]! - bmin[0]!),
    bmin[1]! + norm.max[1] * (bmax[1]! - bmin[1]!),
    bmin[2]! + norm.max[2] * (bmax[2]! - bmin[2]!),
  ];
  return { min, max };
}

// ── Sub-Volume Extraction ──────────────────────────────────────

/**
 * Extracts a cropped sub-volume from an existing CBCT volume into a newly
 * allocated CbctVoxelVolume with updated spatial metadata and typed buffer.
 *
 * Performance:
 * - Uses typed array `subarray` and `set` for high-throughput row copies (SIMD/memcpy).
 * - Drastically reduces memory usage (typically 3x to 5x reduction for dental quadrants).
 */
export function extractSubVolume(
  volume: CbctVoxelVolume,
  crop: CropBox,
  options: ExtractSubVolumeOptions = {},
): CbctVoxelVolume {
  if (volume.isDisposed || !volume.data) {
    throw new Error("Cannot extract sub-volume: source CBCT volume is disposed or has null voxel data");
  }

  const { width: W, height: H, depth: D } = volume.dimensions;
  if (W <= 0 || H <= 0 || D <= 0) {
    throw new Error(`Invalid source volume dimensions: ${W}x${H}x${D}`);
  }

  const bounds = voxelBoundsFromCropBox(crop, volume.dimensions);
  const { startX, startY, startZ, width: subW, height: subH, depth: subD } = bounds;

  const subVoxelCount = subW * subH * subD;
  const subData = new Int16Array(subVoxelCount);

  const srcData = volume.data;
  const sliceSizeSrc = W * H;
  const sliceSizeDst = subW * subH;

  let minVoxelHU = Infinity;
  let maxVoxelHU = -Infinity;
  const trackHU = options.computeActualHURange ?? true;

  for (let kz = 0; kz < subD; kz++) {
    const srcZ = startZ + kz;
    const srcSliceOffset = srcZ * sliceSizeSrc;
    const dstSliceOffset = kz * sliceSizeDst;

    for (let ky = 0; ky < subH; ky++) {
      const srcY = startY + ky;
      const srcRowOffset = srcSliceOffset + srcY * W + startX;
      const dstRowOffset = dstSliceOffset + ky * subW;

      const rowSlice = srcData.subarray(srcRowOffset, srcRowOffset + subW);
      subData.set(rowSlice, dstRowOffset);

      if (trackHU) {
        for (let i = 0; i < subW; i++) {
          const val = rowSlice[i]!;
          if (val < minVoxelHU) minVoxelHU = val;
          if (val > maxVoxelHU) maxVoxelHU = val;
        }
      }
    }
  }

  if (!trackHU || minVoxelHU === Infinity) {
    minVoxelHU = volume.minHU;
    maxVoxelHU = volume.maxHU;
  }

  const sx = volume.spacingMm.x;
  const sy = volume.spacingMm.y;
  const sz = volume.spacingMm.z;

  const subOriginMm: Point3D = {
    x: volume.originMm.x + startX * sx,
    y: volume.originMm.y + startY * sy,
    z: volume.originMm.z + startZ * sz,
  };

  const subPhysicalSizeMm = {
    x: subW * sx,
    y: subH * sy,
    z: subD * sz,
  };

  const prefix = options.idPrefix ?? "subvolume";
  const subId = options.targetId ?? `${prefix}-${volume.id}-${Date.now()}`;

  return {
    id: subId,
    dimensions: {
      width: subW,
      height: subH,
      depth: subD,
    },
    spacingMm: {
      x: sx,
      y: sy,
      z: sz,
    },
    originMm: subOriginMm,
    physicalSizeMm: subPhysicalSizeMm,
    data: subData,
    minHU: minVoxelHU,
    maxHU: maxVoxelHU,
    rescaleSlope: volume.rescaleSlope ?? 1.0,
    rescaleIntercept: volume.rescaleIntercept ?? 0.0,
    defaultWindowWidth: volume.defaultWindowWidth,
    defaultWindowLevel: volume.defaultWindowLevel,
    isDisposed: false,
  };
}

/**
 * Estimates the memory footprint reduction before extracting a sub-volume.
 */
export function estimateSubVolumeMemory(
  volume: CbctVoxelVolume,
  crop: CropBox,
): SubVolumeMemoryEstimate {
  const { width: W, height: H, depth: D } = volume.dimensions;
  const originalVoxels = Math.max(0, W * H * D);
  const bounds = voxelBoundsFromCropBox(crop, volume.dimensions);
  const subVoxels = bounds.width * bounds.height * bounds.depth;

  // Int16Array: 2 bytes per voxel
  const originalBytes = originalVoxels * 2;
  const subBytes = subVoxels * 2;
  const reductionFactor = subBytes > 0 ? originalBytes / subBytes : 1.0;
  const savingsPercent = originalBytes > 0 ? ((originalBytes - subBytes) / originalBytes) * 100 : 0.0;

  return {
    originalVoxels,
    subVoxels,
    originalBytes,
    subBytes,
    reductionFactor,
    savingsPercent,
  };
}

// ── Box Intersection & Expansion ───────────────────────────────

/**
 * Computes the intersection of two CropBoxes, or returns null if they are disjoint.
 */
export function intersectCropBoxes(a: CropBox, b: CropBox): CropBox | null {
  const normA = normalizeCropBox(a);
  const normB = normalizeCropBox(b);

  const minX = Math.max(normA.min[0], normB.min[0]);
  const minY = Math.max(normA.min[1], normB.min[1]);
  const minZ = Math.max(normA.min[2], normB.min[2]);

  const maxX = Math.min(normA.max[0], normB.max[0]);
  const maxY = Math.min(normA.max[1], normB.max[1]);
  const maxZ = Math.min(normA.max[2], normB.max[2]);

  if (minX > maxX || minY > maxY || minZ > maxZ) {
    return null; // Disjoint
  }

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
  };
}

/**
 * Expands a CropBox by a fractional margin along each axis, clamped to [0..1].
 */
export function expandCropBoxWithMargin(
  crop: CropBox,
  margin: number | [number, number, number],
): CropBox {
  const norm = normalizeCropBox(crop);
  const mx = Array.isArray(margin) ? margin[0]! : margin;
  const my = Array.isArray(margin) ? margin[1]! : margin;
  const mz = Array.isArray(margin) ? margin[2]! : margin;

  return {
    min: [
      Math.max(0, norm.min[0] - mx),
      Math.max(0, norm.min[1] - my),
      Math.max(0, norm.min[2] - mz),
    ],
    max: [
      Math.min(1, norm.max[0] + mx),
      Math.min(1, norm.max[1] + my),
      Math.min(1, norm.max[2] + mz),
    ],
  };
}
