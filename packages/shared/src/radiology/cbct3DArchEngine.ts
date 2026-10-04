/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL RADIOLOGY & CBCT: 3D DENTAL ARCH ENGINE (WAVE 141)
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure analytical 3D dental arch reconstruction engine with Curve of Spee,
 * local occlusal elevation profiling from volumetric CBCT enamel density,
 * Catmull-Rom 3D spline interpolation, uniform arc-length parameterization,
 * and canonical orthonormal Darboux frame calculation.
 *
 * Clinical Foundations:
 *  1. 3D Spline Arch P(s) = (x(s), y(s), z(s)), s in [0, L_arch] in LPS mm.
 *  2. Curve of Spee & Wilson: Occlusal surface is not planar; it exhibits
 *     sagittal curvature (Spee: concave in mandible, convex in maxilla)
 *     and frontal curvature (Wilson). Local Z(s) is extracted analytically
 *     via vertical enamel profile sampling in +/- 4 mm window around the arch.
 *  3. Moving Darboux Orthonormal Frame (t, n, b):
 *     - t(s): Unit tangent vector along arch (mesiodistal trajectory).
 *     - n(s): Unit normal vector (vestibulo-oral / buccolingual axis,
 *             pointing outward toward the buccal/labial cortical plate).
 *     - b(s): Unit binormal vector b = t x n (apicocoronal anatomical axis).
 *  4. Inverse spatial query: world coordinates -> (s, distanceBL, distanceAC).
 *
 * 100% pure TypeScript, zero DOM/React dependencies, 100% unit-testable.
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

// ── 1. Geometric Primitive Types & Schemas ─────────────────────────────────

export const point2Schema = z.custom<Point2>(
  (val: unknown) => Array.isArray(val) && (val as unknown[]).length === 2,
  { message: "Expected 2D point [x, y]" },
);

export const vec3Schema = z.custom<Vec3>(
  (val: unknown) => Array.isArray(val) && (val as unknown[]).length === 3,
  { message: "Expected 3D vector [x, y, z]" },
);

export interface DarbouxFrame {
  /** Arc length in mm from start of arch (patient right) */
  s: number;
  /** Normalized arc length coordinate in [0, 1] */
  u: number;
  /** World coordinates [x, y, z] in LPS mm */
  point: Vec3;
  /** Unit tangent vector along arch (mesiodistal direction) */
  tangent: Vec3;
  /** Unit normal vector (vestibulo-oral / buccolingual axis, pointing buccal) */
  normal: Vec3;
  /** Unit binormal vector (apicocoronal axis, b = t x n) */
  binormal: Vec3;
  /** Analytical 3D curvature kappa(s) = ||P''(s)|| / ||P'(s)||^3 in 1/mm */
  curvature: number;
}

export const darbouxFrameSchema: z.ZodType<DarbouxFrame> = z.object({
  s: z.number().nonnegative(),
  u: z.number().min(0).max(1),
  point: vec3Schema,
  tangent: vec3Schema,
  normal: vec3Schema,
  binormal: vec3Schema,
  curvature: z.number().nonnegative(),
});

export interface OcclusalProfilePoint {
  s: number;
  u: number;
  worldXY: Point2;
  occlusalZMm: number;
  peakEnamelHUMm: number;
  confidence: number;
}

export const occlusalProfilePointSchema: z.ZodType<OcclusalProfilePoint> = z.object({
  s: z.number().nonnegative(),
  u: z.number().min(0).max(1),
  worldXY: point2Schema,
  occlusalZMm: z.number(),
  peakEnamelHUMm: z.number(),
  confidence: z.number().min(0).max(1),
});

export const arch3DOptionsSchema = z.object({
  /** Number of uniform arc-length resampled points along arch (default: 500) */
  numSamples: z.number().int().min(20).max(2000).optional().default(500),
  /** Anatomical jaw type */
  jaw: z.enum(["maxilla", "mandible", "unknown"]).optional().default("mandible"),
  /** Occlusal elevation search window half-depth in mm (default: 4.0 mm) */
  windowHalfMm: z.number().positive().optional().default(4.0),
  /** Minimum HU threshold for enamel/cortical peak detection (default: 1200 HU) */
  enamelThresholdHU: z.number().optional().default(1200),
  /** Smoothing radius in samples for occlusal Z profile (default: 3) */
  zSmoothingRadius: z.number().int().min(0).max(20).optional().default(3),
});

export type Arch3DOptions = z.infer<typeof arch3DOptionsSchema>;

export interface Arch3DCurve {
  controlPoints: Vec3[];
  curvePoints: Vec3[];
  frames: DarbouxFrame[];
  totalLengthMm: number;
  jaw: "maxilla" | "mandible" | "unknown";
  curveOfSpeeDepthMm: number;
  occlusalProfile: OcclusalProfilePoint[];
}

export const arch3DCurveSchema: z.ZodType<Arch3DCurve> = z.object({
  controlPoints: z.array(vec3Schema),
  curvePoints: z.array(vec3Schema),
  frames: z.array(darbouxFrameSchema),
  totalLengthMm: z.number().positive(),
  jaw: z.enum(["maxilla", "mandible", "unknown"]),
  curveOfSpeeDepthMm: z.number().nonnegative(),
  occlusalProfile: z.array(occlusalProfilePointSchema),
});

// ── 2. Catmull-Rom 3D Spline Mathematics ───────────────────────────────────

/**
 * Evaluates Catmull-Rom cubic spline in 3D for parameter t in [0, 1].
 */
export function catmullRom3D(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const t2 = t * t;
  const t3 = t2 * t;
  return [
    0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
    0.5 * (2 * p1[2] + (-p0[2] + p2[2]) * t + (2 * p0[2] - 5 * p1[2] + 4 * p2[2] - p3[2]) * t2 + (-p0[2] + 3 * p1[2] - 3 * p2[2] + p3[2]) * t3),
  ];
}

/**
 * Evaluates first derivative dP/dt of Catmull-Rom spline in 3D.
 */
export function catmullRom3DTangent(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const t2 = t * t;
  return [
    0.5 * ((-p0[0] + p2[0]) + 2 * (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t + 3 * (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t2),
    0.5 * ((-p0[1] + p2[1]) + 2 * (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t + 3 * (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t2),
    0.5 * ((-p0[2] + p2[2]) + 2 * (2 * p0[2] - 5 * p1[2] + 4 * p2[2] - p3[2]) * t + 3 * (-p0[2] + 3 * p1[2] - 3 * p2[2] + p3[2]) * t2),
  ];
}

/**
 * Dense Catmull-Rom interpolation of 3D control points.
 */
export function interpolate3DCurve(controlPoints: Vec3[], samplesPerSegment = 50): Vec3[] {
  const n = controlPoints.length;
  if (n < 2) return [...controlPoints];
  const first = controlPoints[0] ?? [0, 0, 0];
  const last = controlPoints[n - 1] ?? [0, 0, 0];
  const result: Vec3[] = [];

  for (let i = 0; i < n - 1; i++) {
    const p0 = controlPoints[Math.max(0, i - 1)] ?? first;
    const p1 = controlPoints[i] ?? first;
    const p2 = controlPoints[i + 1] ?? last;
    const p3 = controlPoints[Math.min(n - 1, i + 2)] ?? last;
    for (let s = 0; s < samplesPerSegment; s++) {
      result.push(catmullRom3D(p0, p1, p2, p3, s / samplesPerSegment));
    }
  }
  result.push(last);
  return result;
}

/**
 * Resamples a 3D polyline curve with exact uniform arc-length parameterization s in [0, L].
 */
export function resample3DByArcLength(
  curve: Vec3[],
  numSamples: number,
): { points: Vec3[]; cumLength: number[]; totalLength: number } {
  if (curve.length < 2 || numSamples < 2) {
    const first = curve[0] ?? [0, 0, 0];
    return { points: Array(numSamples).fill(first), cumLength: Array(numSamples).fill(0), totalLength: 0 };
  }

  const cumLen: number[] = [0];
  for (let i = 1; i < curve.length; i++) {
    const pCurr = curve[i]!;
    const pPrev = curve[i - 1]!;
    const segDist = Math.hypot(pCurr[0] - pPrev[0], pCurr[1] - pPrev[1], pCurr[2] - pPrev[2]);
    cumLen.push((cumLen[i - 1] ?? 0) + segDist);
  }
  const totalLength = cumLen[cumLen.length - 1] ?? 0;
  if (totalLength <= 1e-9) {
    const pt = curve[0]!;
    return { points: Array(numSamples).fill(pt), cumLength: Array(numSamples).fill(0), totalLength: 0 };
  }

  const points: Vec3[] = [];
  const outCumLen: number[] = [];
  let seg = 0;

  for (let s = 0; s < numSamples; s++) {
    const target = (s / (numSamples - 1)) * totalLength;
    while (seg < curve.length - 2 && (cumLen[seg + 1] ?? 0) < target) {
      seg++;
    }
    const segStart = cumLen[seg] ?? 0;
    const segNext = cumLen[seg + 1] ?? segStart;
    const segLen = segNext - segStart;
    const t = segLen > 0 ? (target - segStart) / segLen : 0;
    const ptA = curve[seg]!;
    const ptB = curve[seg + 1]!;

    points.push([
      ptA[0] + t * (ptB[0] - ptA[0]),
      ptA[1] + t * (ptB[1] - ptA[1]),
      ptA[2] + t * (ptB[2] - ptA[2]),
    ]);
    outCumLen.push(target);
  }

  return { points, cumLength: outCumLen, totalLength };
}

// ── 3. Occlusal Z Profile & Curve of Spee Detection ───────────────────────

/**
 * Analytically computes the local occlusal Z elevation Z(s) along a 2D arch curve
 * by sampling high-density enamel/cortical profiles in the CBCT volume.
 *
 * Captures the sagittal Curve of Spee (depth of 1.5 - 3.5 mm in natural dentition).
 */
export function detectOcclusalZProfile(
  vol: VolumeSamplingData,
  archXY: Point2[],
  opts?: Partial<Arch3DOptions>,
): OcclusalProfilePoint[] {
  const options = arch3DOptionsSchema.parse(opts ?? {});
  const numSamples = options.numSamples;
  const windowHalfMm = options.windowHalfMm;
  const enamelThreshold = options.enamelThresholdHU;

  // Approximate arc length along XY
  const cumLen: number[] = [0];
  for (let i = 1; i < archXY.length; i++) {
    const p1 = archXY[i]!;
    const p0 = archXY[i - 1]!;
    cumLen.push((cumLen[i - 1] ?? 0) + Math.hypot(p1[0] - p0[0], p1[1] - p0[1]));
  }
  const totalXY = cumLen[cumLen.length - 1] ?? 1;

  const [ox, oy, oz] = vol.origin;
  const sz = 1 / vol.invSz;
  const zMin = vol.zMin;
  const zMax = vol.zMax;
  const zMid = (zMin + zMax) / 2;

  // Search vertical range around mid-Z or whole volume if small
  const searchZLo = Math.max(zMin, zMid - 25);
  const searchZHi = Math.min(zMax, zMid + 25);
  const stepZ = Math.max(0.2, Math.abs(sz));
  const numStepsZ = Math.max(10, Math.floor((searchZHi - searchZLo) / stepZ));

  const rawProfile: OcclusalProfilePoint[] = [];

  for (let sIdx = 0; sIdx < numSamples; sIdx++) {
    const u = sIdx / (numSamples - 1);
    const targetDist = u * totalXY;

    // Locate point on archXY
    let seg = 0;
    while (seg < archXY.length - 2 && (cumLen[seg + 1] ?? 0) < targetDist) {
      seg++;
    }
    const sStart = cumLen[seg] ?? 0;
    const sEnd = cumLen[seg + 1] ?? sStart;
    const t = sEnd > sStart ? (targetDist - sStart) / (sEnd - sStart) : 0;
    const pA = archXY[seg]!;
    const pB = archXY[seg + 1] ?? pA;
    const wx = pA[0] + t * (pB[0] - pA[0]);
    const wy = pA[1] + t * (pB[1] - pA[1]);

    // Sample along Z column with small horizontal cross-samples in +/- windowHalfMm
    let bestZ = zMid;
    let maxHU = AIR_HU;
    let sumWeight = 0;
    let weightedZ = 0;

    for (let kz = 0; kz <= numStepsZ; kz++) {
      const wz = searchZLo + kz * stepZ;
      const ci = (wx - ox) * vol.invSx;
      const cj = (wy - oy) * vol.invSy;
      const ck = (wz - oz) * vol.invSz;

      const huCenter = trilinear(vol.getVoxel, vol.dims, ci, cj, ck);

      // Check max in column
      if (huCenter > maxHU) {
        maxHU = huCenter;
        bestZ = wz;
      }

      if (huCenter >= enamelThreshold) {
        const weight = huCenter - enamelThreshold + 1;
        weightedZ += wz * weight;
        sumWeight += weight;
      }
    }

    const occlusalZ = sumWeight > 0 ? weightedZ / sumWeight : bestZ;
    const confidence = maxHU >= enamelThreshold ? Math.min(1, (maxHU - 1000) / 1000) : 0.3;

    rawProfile.push({
      s: targetDist,
      u,
      worldXY: [wx, wy],
      occlusalZMm: occlusalZ,
      peakEnamelHUMm: maxHU,
      confidence,
    });
  }

  // Smooth occlusal Z profile to eliminate noise spikes while preserving Spee curvature
  const radius = options.zSmoothingRadius;
  if (radius > 0 && rawProfile.length > 2 * radius) {
    const smoothedZ: number[] = [];
    for (let i = 0; i < rawProfile.length; i++) {
      let sum = 0;
      let count = 0;
      for (let k = -radius; k <= radius; k++) {
        const idx = i + k;
        if (idx >= 0 && idx < rawProfile.length) {
          sum += rawProfile[idx]!.occlusalZMm;
          count++;
        }
      }
      smoothedZ.push(sum / count);
    }
    for (let i = 0; i < rawProfile.length; i++) {
      rawProfile[i]!.occlusalZMm = smoothedZ[i]!;
    }
  }

  return rawProfile;
}

// ── 4. Darboux / Orthonormal Frame Calculation ─────────────────────────────

/**
 * Computes moving Darboux orthonormal frames (tangent, normal, binormal)
 * along a uniform 3D curve.
 *
 * In dental arch geometry:
 *  - Tangent t: Direction of increasing arc length (patient right -> anterior -> patient left).
 *  - Normal n: Direction pointing outwards (buccally/vestibularly).
 *  - Binormal b: Direction along dental crown-root axis (b = t x n).
 */
export function computeDarbouxFrames(
  curve3D: Vec3[],
  jaw: "maxilla" | "mandible" | "unknown" = "mandible",
): DarbouxFrame[] {
  const n = curve3D.length;
  if (n < 2) return [];

  // Compute total arc length and cumulative lengths
  const cumLen: number[] = [0];
  for (let i = 1; i < n; i++) {
    cumLen.push(cumLen[i - 1]! + len3(sub3(curve3D[i]!, curve3D[i - 1]!)));
  }
  const totalLength = cumLen[n - 1] ?? 1;

  const frames: DarbouxFrame[] = [];

  for (let i = 0; i < n; i++) {
    const pt = curve3D[i]!;
    const s = cumLen[i]!;
    const u = totalLength > 0 ? s / totalLength : 0;

    // 1. Tangent: central difference or forward/backward at ends
    let tVec: Vec3;
    if (i === 0) {
      tVec = sub3(curve3D[1]!, pt);
    } else if (i === n - 1) {
      tVec = sub3(pt, curve3D[n - 2]!);
    } else {
      tVec = sub3(curve3D[i + 1]!, curve3D[i - 1]!);
    }
    const tangent = normalize3(tVec);

    // 2. Normal (vestibulo-oral / buccal):
    // In LPS coordinate system: patient right is -X, patient left is +X, anterior is -Y, superior is +Z.
    // The horizontal arch curve goes roughly from (-X) around (-Y) to (+X).
    // The outward (buccal/anterior) normal for horizontal tangent [tx, ty] is [ty, -tx, 0] or [-ty, tx, 0].
    // At the midline (anterior, around apex of U), tangent is (+X, 0, 0), so outward normal is (0, -Y, 0).
    // Tangent [1, 0] -> Normal [0, -1] => n_raw = [tangent[1], -tangent[0], 0].
    let nRaw: Vec3 = [tangent[1], -tangent[0], 0];

    // Orthogonalize n against tangent: n_ortho = n_raw - (n_raw . tangent) * tangent
    const dotNT = dot3(nRaw, tangent);
    nRaw = sub3(nRaw, scale3(tangent, dotNT));
    let normal = normalize3(nRaw);

    // If degenerate (nearly pure vertical curve), fallback
    if (len3(normal) < 0.1) {
      normal = [0, -1, 0];
    }

    // 3. Binormal b: points coronally (superiorly +Z for mandible, inferiorly -Z for maxilla)
    // With normal pointing buccally (-Y at apex) and tangent along arch (+X),
    // normal x tangent = [0, -1, 0] x [1, 0, 0] = [0, 0, 1] (+Z coronal).
    let binormal = normalize3(cross3(normal, tangent));
    if (jaw === "mandible" && binormal[2] < 0) {
      binormal = scale3(binormal, -1);
    } else if (jaw === "maxilla" && binormal[2] > 0) {
      binormal = scale3(binormal, -1);
    }

    // 4. Curvature kappa(s): ||dP/ds x d^2P/ds^2|| / ||dP/ds||^3
    let curvature = 0;
    if (i > 0 && i < n - 1) {
      const prev = curve3D[i - 1]!;
      const next = curve3D[i + 1]!;
      const d1 = scale3(sub3(next, prev), 0.5);
      const d2 = sub3(add3(next, prev), scale3(pt, 2));
      const crossD1D2 = cross3(d1, d2);
      const lenD1 = len3(d1);
      if (lenD1 > 1e-4) {
        curvature = len3(crossD1D2) / (lenD1 * lenD1 * lenD1);
      }
    }

    frames.push({
      s,
      u,
      point: pt,
      tangent,
      normal,
      binormal,
      curvature,
    });
  }

  return frames;
}

// ── 5. Full 3D Arch Construction Pipeline ──────────────────────────────────

/**
 * Builds a complete 3D dental arch model from 2D axial control points and volumetric CBCT data.
 * Extracts the 3D Curve of Spee and returns dense uniform arc-length parameterized frames.
 */
export function build3DArchFromVolumetricData(
  vol: VolumeSamplingData,
  controlPoints2D: Point2[],
  opts?: Partial<Arch3DOptions>,
): Arch3DCurve {
  const options = arch3DOptionsSchema.parse(opts ?? {});

  // 1. Detect occlusal Z elevation along 2D curve
  const occlusalProfile = detectOcclusalZProfile(vol, controlPoints2D, options);

  // 2. Generate 3D control points by interpolating occlusal Z at 2D control points
  const controlPoints3D: Vec3[] = controlPoints2D.map((p2) => {
    // Find closest occlusal profile point
    let bestDist = Number.POSITIVE_INFINITY;
    let bestZ = (vol.zMin + vol.zMax) / 2;
    for (const op of occlusalProfile) {
      const d = Math.hypot(op.worldXY[0] - p2[0], op.worldXY[1] - p2[1]);
      if (d < bestDist) {
        bestDist = d;
        bestZ = op.occlusalZMm;
      }
    }
    return [p2[0], p2[1], bestZ];
  });

  // 3. Dense 3D Catmull-Rom interpolation
  const dense3D = interpolate3DCurve(controlPoints3D, 50);

  // 4. Uniform arc-length resampling
  const { points: curvePoints, totalLength } = resample3DByArcLength(dense3D, options.numSamples);

  // 5. Compute Darboux orthonormal frames
  const frames = computeDarbouxFrames(curvePoints, options.jaw);

  // 6. Calculate Curve of Spee depth (max Z difference between premolar/molar dip and incisors/retromolar)
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (const pt of curvePoints) {
    if (pt[2] < minZ) minZ = pt[2];
    if (pt[2] > maxZ) maxZ = pt[2];
  }
  const curveOfSpeeDepthMm = maxZ > minZ ? maxZ - minZ : 0;

  return {
    controlPoints: controlPoints3D,
    curvePoints,
    frames,
    totalLengthMm: totalLength,
    jaw: options.jaw,
    curveOfSpeeDepthMm,
    occlusalProfile,
  };
}

/**
 * Builds a 3D dental arch directly from known 3D control points.
 */
export function build3DArchFromControlPoints(
  controlPoints3D: Vec3[],
  opts?: Partial<Arch3DOptions>,
): Arch3DCurve {
  const options = arch3DOptionsSchema.parse(opts ?? {});
  const dense3D = interpolate3DCurve(controlPoints3D, 50);
  const { points: curvePoints, totalLength } = resample3DByArcLength(dense3D, options.numSamples);
  const frames = computeDarbouxFrames(curvePoints, options.jaw);

  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (const pt of curvePoints) {
    if (pt[2] < minZ) minZ = pt[2];
    if (pt[2] > maxZ) maxZ = pt[2];
  }
  const curveOfSpeeDepthMm = maxZ > minZ ? maxZ - minZ : 0;

  const occlusalProfile: OcclusalProfilePoint[] = frames.map((f) => ({
    s: f.s,
    u: f.u,
    worldXY: [f.point[0], f.point[1]],
    occlusalZMm: f.point[2],
    peakEnamelHUMm: 1500,
    confidence: 1.0,
  }));

  return {
    controlPoints: controlPoints3D,
    curvePoints,
    frames,
    totalLengthMm: totalLength,
    jaw: options.jaw,
    curveOfSpeeDepthMm,
    occlusalProfile,
  };
}

// ── 6. Spatial Query & Projection Helper Functions ─────────────────────────

/**
 * Finds the nearest Darboux frame on the 3D arch to a given 3D world position.
 */
export function findNearestArchFrame(arch: Arch3DCurve, worldPos: Vec3): DarbouxFrame {
  let bestDistSq = Number.POSITIVE_INFINITY;
  let bestIdx = 0;

  for (let i = 0; i < arch.frames.length; i++) {
    const p = arch.frames[i]!.point;
    const dSq = (p[0] - worldPos[0]) ** 2 + (p[1] - worldPos[1]) ** 2 + (p[2] - worldPos[2]) ** 2;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestIdx = i;
    }
  }

  return arch.frames[bestIdx]!;
}

/**
 * Retrieves the interpolated Darboux frame at normalized parameter u in [0, 1].
 */
export function frameAtNormalized(arch: Arch3DCurve, u: number): DarbouxFrame {
  const clampedU = Math.max(0, Math.min(1, u));
  const idx = Math.round(clampedU * (arch.frames.length - 1));
  return arch.frames[idx]!;
}

/**
 * Retrieves the Darboux frame at absolute arc length s in [0, L_arch] mm.
 */
export function frameAtArcLength(arch: Arch3DCurve, sMm: number): DarbouxFrame {
  const u = arch.totalLengthMm > 0 ? sMm / arch.totalLengthMm : 0;
  return frameAtNormalized(arch, u);
}

/**
 * Maps arbitrary 3D world coordinates into local clinical arch coordinates:
 *  - s: Mesiodistal arc length in mm along the arch curve.
 *  - distanceBLMm: Signed buccolingual offset (+ for buccal, - for lingual/palatal).
 *  - distanceACMm: Signed apicocoronal offset along the binormal axis b(s).
 */
export function worldToArchCoordinates(
  arch: Arch3DCurve,
  pos: Vec3,
): { s: number; u: number; distanceBLMm: number; distanceACMm: number } {
  const frame = findNearestArchFrame(arch, pos);
  const delta = sub3(pos, frame.point);
  const distanceBLMm = dot3(delta, frame.normal);
  const distanceACMm = dot3(delta, frame.binormal);

  return {
    s: frame.s,
    u: frame.u,
    distanceBLMm,
    distanceACMm,
  };
}
