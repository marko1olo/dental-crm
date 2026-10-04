/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT: TOOTH ORIENTED BOUNDING BOX & VOXEL VOLUME ENGINE (WAVE 141)
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure analytical 3D extraction and orientation engine for individual teeth:
 *  1. Weighted Covariance Tensor & Cyclic Jacobi Eigensolver:
 *     Calculates 2nd central moments of high-density voxels around the tooth centroid.
 *     Solves true 3D anatomical long axis, factoring in clinical torque and angulation.
 *  2. Orthonormal Clinical Triad:
 *     - axisLong (apicocoronal, pointing crown-ward towards occlusal plane).
 *     - axisBuccoLingual (pointing outward towards buccal cortical plate).
 *     - axisMesioDistal (pointing along arch trajectory, eMD = eBL x eLong).
 *  3. Clinical Torque, Tip (Angulation), and Rotation Angles:
 *     Directly computed relative to the local 3D Darboux arch frame.
 *  4. High-Precision Trilinear Voxel Resampling:
 *     Extracts isolated 64x64x112 isotropic volume V_tooth (0.25 mm/voxel).
 *  5. 3D Density Gradient & Iso-Contour Extraction:
 *     Extracts analytical gradient ||grad HU|| contours for outer enamel boundary
 *     and metallic implant fixture surface.
 *
 * 100% pure TypeScript, zero DOM/Cornerstone dependencies, 100% unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import {
  type Point2,
  type Vec3,
  type VolumeSamplingData,
  AIR_HU,
  trilinear,
} from "./cprMath.js";
import {
  dot3,
  cross3,
  sub3,
  add3,
  scale3,
  len3,
  normalize3,
} from "./implantGeometryEngine.js";
import { jacobiEigenSymmetric } from "./scanRegistrationEngine.js";
import {
  type Arch3DCurve,
  type DarbouxFrame,
  findNearestArchFrame,
  vec3Schema,
} from "./cbct3DArchEngine.js";
import type { AlignedFdiTooth } from "./toothFdiAlignmentEngine.js";

// ── 1. Types & Schemas ───────────────────────────────────────────────────

export interface ToothOrientedBoundingBox {
  /** FDI tooth identifier (11..48) */
  fdiNumber: number;
  /** Clinical Russian name */
  nameRu: string;
  /** Centroid origin in LPS world coordinates (mm) */
  centerWorld: Vec3;
  /** Primary anatomical long axis (apicocoronal unit vector, pointing crown-ward) */
  axisLong: Vec3;
  /** Secondary buccolingual unit vector (pointing buccal) */
  axisBuccoLingual: Vec3;
  /** Tertiary mesiodistal unit vector (eMD = eBL x eLong) */
  axisMesioDistal: Vec3;
  /** Half extents in mm along [mesiodistal, buccolingual, apicocoronal] */
  halfExtentsMm: Vec3;
  /** Clinical torque in degrees (buccolingual inclination relative to arch normal) */
  torqueDeg: number;
  /** Clinical tip / angulation in degrees (mesiodistal tilt along arch tangent) */
  tipDeg: number;
  /** Axial rotation in degrees (rotation of BL axis relative to arch normal) */
  rotationDeg: number;
  /** True if cluster represents a titanium implant fixture */
  isImplant: boolean;
  /** Eigensystem eigenvalues [lambda1, lambda2, lambda3] (spread along principal axes) */
  eigenvalues: [number, number, number];
}

export const toothOBBSchema: z.ZodType<ToothOrientedBoundingBox> = z.object({
  fdiNumber: z.number().int().min(11).max(48),
  nameRu: z.string(),
  centerWorld: vec3Schema,
  axisLong: vec3Schema,
  axisBuccoLingual: vec3Schema,
  axisMesioDistal: vec3Schema,
  halfExtentsMm: vec3Schema,
  torqueDeg: z.number(),
  tipDeg: z.number(),
  rotationDeg: z.number(),
  isImplant: z.boolean(),
  eigenvalues: z.tuple([z.number(), z.number(), z.number()]),
});

export interface ToothVoxelVolume {
  /** Metadata and orientation frame of tooth */
  obb: ToothOrientedBoundingBox;
  /** Grid dimensions [nx, ny, nz] (e.g. [64, 64, 112]) */
  dims: [number, number, number];
  /** Isotropic voxel spacing in mm (e.g. 0.25 mm) */
  spacingMm: number;
  /** 3D array of resampled Hounsfield Unit values */
  voxels: Int16Array;
  /** Minimum HU in volume */
  minHU: number;
  /** Maximum HU in volume */
  maxHU: number;
  /** Mean HU in volume */
  meanHU: number;
}

export interface ToothContourSlice {
  /** Cut plane orientation */
  plane: "AXIAL" | "BUCCOLINGUAL" | "MESIODISTAL";
  /** Slice index within the local volume */
  sliceIndex: number;
  /** 2D local slice coordinates in mm [[u0, v0], [u1, v1], ...] */
  contourPointsLocalMm: [number, number][];
  /** 3D LPS world coordinates of contour points */
  contourPointsWorld: Vec3[];
  /** Peak gradient magnitude found on slice in HU/mm */
  peakGradientHUPerMm: number;
}

export const toothOBBOptionsSchema = z.object({
  /** Minimum HU density threshold for covariance weighting (default: 900 HU) */
  covarianceThresholdHU: z.number().optional().default(900),
  /** Radius in mm around tooth centroid to evaluate covariance tensor (default: 10.0 mm) */
  samplingRadiusMm: z.number().positive().optional().default(10.0),
});

export type ToothOBBOptions = z.infer<typeof toothOBBOptionsSchema>;

export const toothVolumeOptionsSchema = z.object({
  /** Isotropic voxel spacing in mm for resampled tooth volume (default: 0.25 mm) */
  spacingMm: z.number().positive().optional().default(0.25),
  /** Local grid dimensions [nx, ny, nz] (default: [64, 64, 112]) */
  dims: z.tuple([z.number().int().positive(), z.number().int().positive(), z.number().int().positive()]).optional().default([64, 64, 112]),
});

export type ToothVolumeOptions = z.infer<typeof toothVolumeOptionsSchema>;

// ── 2. Weighted Covariance Tensor & Jacobi Eigensolver ─────────────────────

/**
 * Computes the 3D weighted covariance tensor of mineralized tissue voxels around
 * the tooth centroid and extracts principal axes via Jacobi rotations.
 */
export function computeToothOBB(
  vol: VolumeSamplingData,
  tooth: AlignedFdiTooth,
  arch: Arch3DCurve,
  opts?: Partial<ToothOBBOptions>,
): ToothOrientedBoundingBox {
  const options = toothOBBOptionsSchema.parse(opts ?? {});
  const radius = options.samplingRadiusMm;
  const threshold = options.covarianceThresholdHU;

  const [ox, oy, oz] = vol.origin;
  const sx = 1 / vol.invSx;
  const sy = 1 / vol.invSy;
  const sz = 1 / vol.invSz;

  const center = tooth.centroidWorld;
  const nearestFrame = findNearestArchFrame(arch, center);

  // Voxel bounding box for sampling
  const minI = Math.max(0, Math.floor((center[0] - radius - ox) * vol.invSx));
  const maxI = Math.min(vol.dims[0] - 1, Math.ceil((center[0] + radius - ox) * vol.invSx));
  const minJ = Math.max(0, Math.floor((center[1] - radius - oy) * vol.invSy));
  const maxJ = Math.min(vol.dims[1] - 1, Math.ceil((center[1] + radius - oy) * vol.invSy));
  const minK = Math.max(0, Math.floor((center[2] - radius - oz) * vol.invSz));
  const maxK = Math.min(vol.dims[2] - 1, Math.ceil((center[2] + radius - oz) * vol.invSz));

  // 1. Compute weighted center of mass
  let totalWeight = 0;
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;

  for (let k = minK; k <= maxK; k++) {
    const wz = oz + k * sz;
    for (let j = minJ; j <= maxJ; j++) {
      const wy = oy + j * sy;
      for (let i = minI; i <= maxI; i++) {
        const wx = ox + i * sx;
        const d = Math.hypot(wx - center[0], wy - center[1], wz - center[2]);
        if (d <= radius) {
          const hu = vol.getVoxel(i, j, k);
          if (hu > threshold) {
            const w = hu - threshold;
            totalWeight += w;
            sumX += wx * w;
            sumY += wy * w;
            sumZ += wz * w;
          }
        }
      }
    }
  }

  const meanX = totalWeight > 0 ? sumX / totalWeight : center[0];
  const meanY = totalWeight > 0 ? sumY / totalWeight : center[1];
  const meanZ = totalWeight > 0 ? sumZ / totalWeight : center[2];

  // 2. Symmetric 3x3 covariance matrix
  let cxx = 0, cyy = 0, czz = 0;
  let cxy = 0, cxz = 0, cyz = 0;

  if (totalWeight > 0) {
    for (let k = minK; k <= maxK; k++) {
      const wz = oz + k * sz;
      for (let j = minJ; j <= maxJ; j++) {
        const wy = oy + j * sy;
        for (let i = minI; i <= maxI; i++) {
          const wx = ox + i * sx;
          const d = Math.hypot(wx - center[0], wy - center[1], wz - center[2]);
          if (d <= radius) {
            const hu = vol.getVoxel(i, j, k);
            if (hu > threshold) {
              const w = hu - threshold;
              const dx = wx - meanX;
              const dy = wy - meanY;
              const dz = wz - meanZ;
              cxx += w * dx * dx;
              cyy += w * dy * dy;
              czz += w * dz * dz;
              cxy += w * dx * dy;
              cxz += w * dx * dz;
              cyz += w * dy * dz;
            }
          }
        }
      }
    }
    cxx /= totalWeight;
    cyy /= totalWeight;
    czz /= totalWeight;
    cxy /= totalWeight;
    cxz /= totalWeight;
    cyz /= totalWeight;
  } else {
    cxx = 1; cyy = 1; czz = 4;
  }

  const covMatrix: number[][] = [
    [cxx, cxy, cxz],
    [cxy, cyy, cyz],
    [cxz, cyz, czz],
  ];

  // 3. Jacobi eigen-decomposition
  const { values, vectors } = jacobiEigenSymmetric(covMatrix, 3);

  // Sort eigenvectors descending by eigenvalue
  const indices = [0, 1, 2];
  indices.sort((a, b) => (values[b] ?? 0) - (values[a] ?? 0));

  const sortedValues: [number, number, number] = [
    values[indices[0]!] ?? 1,
    values[indices[1]!] ?? 1,
    values[indices[2]!] ?? 1,
  ];

  // Primary eigenvector = largest spread = anatomical long axis
  const idxLong = indices[0]!;
  let eLong: Vec3 = [
    vectors[0]?.[idxLong] ?? 0,
    vectors[1]?.[idxLong] ?? 0,
    vectors[2]?.[idxLong] ?? 1,
  ];
  eLong = normalize3(eLong);

  // Ensure eLong points crown-ward (aligned with Darboux binormal b)
  if (dot3(eLong, nearestFrame.binormal) < 0) {
    eLong = scale3(eLong, -1);
  }

  // Choose remaining eigenvectors for buccolingual and mesiodistal axes
  const idxB = indices[1]!;
  let eBL: Vec3 = [
    vectors[0]?.[idxB] ?? 0,
    vectors[1]?.[idxB] ?? 1,
    vectors[2]?.[idxB] ?? 0,
  ];
  // Orthogonalize eBL against eLong
  eBL = normalize3(sub3(eBL, scale3(eLong, dot3(eBL, eLong))));

  // Ensure eBL points towards buccal cortical plate (dot with frame normal > 0)
  if (dot3(eBL, nearestFrame.normal) < 0) {
    eBL = scale3(eBL, -1);
  }

  // Right-handed mesiodistal axis eMD = eBL x eLong
  let eMD = normalize3(cross3(eBL, eLong));
  // Ensure eMD points along arch tangent direction
  if (dot3(eMD, nearestFrame.tangent) < 0) {
    eMD = scale3(eMD, -1);
    eBL = normalize3(cross3(eLong, eMD));
  }

  // Extents along axes: default anatomically informed half extents (mm)
  const isImplant = tooth.status === "IMPLANT";
  const halfMD = tooth.canonicalWidthMm > 0 ? tooth.canonicalWidthMm / 2 + 1.0 : 4.0;
  const halfBL = isImplant ? 3.5 : 5.0;
  const halfAC = isImplant ? 8.0 : 11.0;

  // 4. Clinical Torque, Tip, and Rotation Angles
  // Torque: buccolingual tilt relative to the local arch normal plane
  const projBLNormal = dot3(eLong, nearestFrame.normal);
  const projBLBinormal = dot3(eLong, nearestFrame.binormal);
  const torqueRad = Math.atan2(projBLNormal, projBLBinormal);
  const torqueDeg = Number(((torqueRad * 180) / Math.PI).toFixed(1));

  // Tip / Angulation: mesiodistal tilt relative to the arch tangent
  const projMDTangent = dot3(eLong, nearestFrame.tangent);
  const tipRad = Math.atan2(projMDTangent, projBLBinormal);
  const tipDeg = Number(((tipRad * 180) / Math.PI).toFixed(1));

  // Rotation: axial deviation of eBL relative to nearestFrame.normal
  const rotRad = Math.atan2(dot3(eBL, nearestFrame.tangent), dot3(eBL, nearestFrame.normal));
  const rotationDeg = Number(((rotRad * 180) / Math.PI).toFixed(1));

  return {
    fdiNumber: tooth.fdiNumber,
    nameRu: tooth.nameRu,
    centerWorld: [meanX, meanY, meanZ],
    axisLong: eLong,
    axisBuccoLingual: eBL,
    axisMesioDistal: eMD,
    halfExtentsMm: [halfMD, halfBL, halfAC],
    torqueDeg,
    tipDeg,
    rotationDeg,
    isImplant,
    eigenvalues: sortedValues,
  };
}

// ── 3. High-Precision Trilinear Voxel Resampling ───────────────────────────

/**
 * Extracts a local volumetric sub-volume V_tooth (default 64x64x112 voxels, 0.25 mm/voxel)
 * aligned with the tooth's true 3D oriented bounding box.
 */
export function extractToothVoxelVolume(
  vol: VolumeSamplingData,
  obb: ToothOrientedBoundingBox,
  opts?: Partial<ToothVolumeOptions>,
): ToothVoxelVolume {
  const options = toothVolumeOptionsSchema.parse(opts ?? {});
  const [nx, ny, nz] = options.dims;
  const spacing = options.spacingMm;
  const totalVoxels = nx * ny * nz;

  const voxels = new Int16Array(totalVoxels);
  const [ox, oy, oz] = vol.origin;

  const midI = (nx - 1) / 2;
  const midJ = (ny - 1) / 2;
  const midK = (nz - 1) / 2;

  const center = obb.centerWorld;
  const eMD = obb.axisMesioDistal;
  const eBL = obb.axisBuccoLingual;
  const eLong = obb.axisLong;

  let minHU = Infinity;
  let maxHU = -Infinity;
  let sumHU = 0;

  for (let k = 0; k < nz; k++) {
    const dk = (k - midK) * spacing;
    const sliceOffset = k * nx * ny;
    for (let j = 0; j < ny; j++) {
      const dj = (j - midJ) * spacing;
      const rowOffset = sliceOffset + j * nx;
      for (let i = 0; i < nx; i++) {
        const di = (i - midI) * spacing;

        // World coordinates P = center + di * eMD + dj * eBL + dk * eLong
        const wx = center[0] + di * eMD[0] + dj * eBL[0] + dk * eLong[0];
        const wy = center[1] + di * eMD[1] + dj * eBL[1] + dk * eLong[1];
        const wz = center[2] + di * eMD[2] + dj * eBL[2] + dk * eLong[2];

        // Fractional volume voxel indices
        const ci = (wx - ox) * vol.invSx;
        const cj = (wy - oy) * vol.invSy;
        const ck = (wz - oz) * vol.invSz;

        const val = Math.round(trilinear(vol.getVoxel, vol.dims, ci, cj, ck, AIR_HU));
        const idx = rowOffset + i;
        voxels[idx] = val;

        if (val < minHU) minHU = val;
        if (val > maxHU) maxHU = val;
        sumHU += val;
      }
    }
  }

  const meanHU = Number((sumHU / totalVoxels).toFixed(1));

  return {
    obb,
    dims: [nx, ny, nz],
    spacingMm: spacing,
    voxels,
    minHU: minHU === Infinity ? AIR_HU : minHU,
    maxHU: maxHU === -Infinity ? AIR_HU : maxHU,
    meanHU,
  };
}

// ── 4. 3D Density Gradient & Iso-Contour Extraction ───────────────────────

/**
 * Extracts 2D iso-contour points along orthogonal slices of the local tooth volume
 * using the central difference gradient ||grad HU|| to trace outer enamel/metal boundaries.
 */
export function extractToothGradientContours(
  toothVol: ToothVoxelVolume,
  gradientThreshold = 180, // HU per mm
): ToothContourSlice[] {
  const [nx, ny, nz] = toothVol.dims;
  const sp = toothVol.spacingMm;
  const voxels = toothVol.voxels;
  const center = toothVol.obb.centerWorld;
  const eMD = toothVol.obb.axisMesioDistal;
  const eBL = toothVol.obb.axisBuccoLingual;
  const eLong = toothVol.obb.axisLong;

  const midI = (nx - 1) / 2;
  const midJ = (ny - 1) / 2;
  const midK = (nz - 1) / 2;

  const slices: ToothContourSlice[] = [];

  // 1. Axial slice at crown center (mid-K)
  const kMid = Math.floor(midK);
  const axialContourLocal: [number, number][] = [];
  const axialContourWorld: Vec3[] = [];
  let maxGradAxial = 0;

  for (let j = 1; j < ny - 1; j++) {
    for (let i = 1; i < nx - 1; i++) {
      const idx = kMid * nx * ny + j * nx + i;
      // Central difference in-plane gradient
      const dX = (voxels[idx + 1]! - voxels[idx - 1]!) / (2 * sp);
      const dY = (voxels[idx + nx]! - voxels[idx - nx]!) / (2 * sp);
      const gradMag = Math.hypot(dX, dY);

      if (gradMag > maxGradAxial) maxGradAxial = gradMag;

      if (gradMag >= gradientThreshold) {
        const u = (i - midI) * sp;
        const v = (j - midJ) * sp;
        axialContourLocal.push([u, v]);

        const wx = center[0] + u * eMD[0] + v * eBL[0];
        const wy = center[1] + u * eMD[1] + v * eBL[1];
        const wz = center[2] + u * eMD[2] + v * eBL[2];
        axialContourWorld.push([wx, wy, wz]);
      }
    }
  }

  slices.push({
    plane: "AXIAL",
    sliceIndex: kMid,
    contourPointsLocalMm: axialContourLocal,
    contourPointsWorld: axialContourWorld,
    peakGradientHUPerMm: Number(maxGradAxial.toFixed(1)),
  });

  // 2. Buccolingual cross-sectional slice (mid-I)
  const iMid = Math.floor(midI);
  const blContourLocal: [number, number][] = [];
  const blContourWorld: Vec3[] = [];
  let maxGradBL = 0;

  for (let k = 1; k < nz - 1; k++) {
    for (let j = 1; j < ny - 1; j++) {
      const idx = k * nx * ny + j * nx + iMid;
      const dY = (voxels[idx + nx]! - voxels[idx - nx]!) / (2 * sp);
      const dZ = (voxels[idx + nx * ny]! - voxels[idx - nx * ny]!) / (2 * sp);
      const gradMag = Math.hypot(dY, dZ);

      if (gradMag > maxGradBL) maxGradBL = gradMag;

      if (gradMag >= gradientThreshold) {
        const u = (j - midJ) * sp;
        const v = (k - midK) * sp;
        blContourLocal.push([u, v]);

        const wx = center[0] + u * eBL[0] + v * eLong[0];
        const wy = center[1] + u * eBL[1] + v * eLong[1];
        const wz = center[2] + u * eBL[2] + v * eLong[2];
        blContourWorld.push([wx, wy, wz]);
      }
    }
  }

  slices.push({
    plane: "BUCCOLINGUAL",
    sliceIndex: iMid,
    contourPointsLocalMm: blContourLocal,
    contourPointsWorld: blContourWorld,
    peakGradientHUPerMm: Number(maxGradBL.toFixed(1)),
  });

  return slices;
}
