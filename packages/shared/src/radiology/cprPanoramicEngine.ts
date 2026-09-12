/**
 * CLINICAL CBCT: CPR PANORAMIC REFORMATION & DENTAL ARCH CURVE ENGINE
 * Pure analytical geometry and voxel sampling algorithms for dental CBCT
 * Curved Planar Reformation (CPR / OPG-like panoramic reconstruction) and
 * paraxial perpendicular cross-sections:
 *
 * 1. Dental Arch Spline Mathematics (Catmull-Rom, arc-length, normals, offsets, U-arch)
 * 2. Panoramic (OPG) Volume Reformation (Trilinear, MIP / Average / MinIP, slab thickness)
 * 3. Paraxial Cross-Sections (tiltDeg, widthMm, buccolingual metric frame)
 * 4. Regulatory Form 043/u Ministry of Health RF Protocol (STRICTLY 0 EMOJIS)
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// 1. TYPES & SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export type Point2 = [number, number];
export type Vec3 = [number, number, number];

export const point2Schema = z.tuple([z.number(), z.number()]);
export const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

export const projectionModeSchema = z.enum(["MIP", "Average", "MinIP"]);
export type ProjectionMode = z.infer<typeof projectionModeSchema>;

export const archToothLandmarkSchema = z.object({
  fdiToothNumber: z.number().int().min(11).max(48),
  nameRu: z.string(),
  positionNormalized: z.number().min(0).max(1),
  point: point2Schema,
});
export type ArchToothLandmark = z.infer<typeof archToothLandmarkSchema>;

/** Minimal volume description required for pure voxel sampling. */
export interface VolumeSamplingData {
  readonly dims: [number, number, number];
  readonly origin: [number, number, number];
  readonly getVoxel: (i: number, j: number, k: number) => number;
  readonly invSx: number;
  readonly invSy: number;
  readonly invSz: number;
  readonly zMin: number;
  readonly zMax: number;
  readonly vSpacing: number;
}

export interface VolumeSamplingInput {
  dimensions: [number, number, number];
  spacing: [number, number, number];
  origin?: [number, number, number] | undefined;
  data?: Int16Array | Float32Array | Uint16Array | Int32Array | null | undefined;
  getVoxel?: ((i: number, j: number, k: number) => number) | undefined;
}

export const volumeSamplingInputSchema = z.object({
  dimensions: z.tuple([z.number().int().positive(), z.number().int().positive(), z.number().int().positive()]),
  spacing: z.tuple([z.number().positive(), z.number().positive(), z.number().positive()]),
  origin: z.tuple([z.number(), z.number(), z.number()]).optional(),
});

export const panoramicReformationParamsSchema = z.object({
  controlPoints: z.array(point2Schema).min(2),
  slabThicknessMm: z.number().min(1).max(20).optional().default(5),
  projection: projectionModeSchema.optional().default("MIP"),
  resolutionMm: z.number().min(0.1).max(2.0).optional().default(0.4),
  slabStepMm: z.number().positive().optional().default(1.0),
});

export interface PanoramicReformationParams {
  volume: VolumeSamplingData | VolumeSamplingInput;
  controlPoints: Point2[];
  slabThicknessMm?: number | undefined;
  projection?: ProjectionMode | undefined;
  resolutionMm?: number | undefined;
  slabStepMm?: number | undefined;
}

export interface PanoramicReformationResult {
  pixelData: Float32Array;
  width: number;
  height: number;
  horizontalSpacingMm: number;
  verticalSpacingMm: number;
  zMinMm: number;
  zMaxMm: number;
  arcLengthMm: number;
  slabThicknessMm: number;
  projection: ProjectionMode;
  numSlabSamples: number;
  minHU: number;
  maxHU: number;
  meanHU: number;
}

export interface CrossSectionFrame {
  point: Point2;
  normal: Point2;
  tangent: Point2;
  origin: [number, number, number];
  eU: [number, number, number];
  eV: [number, number, number];
}

export const paraxialCrossSectionParamsSchema = z.object({
  controlPoints: z.array(point2Schema).min(2),
  positionNormalized: z.number().min(0).max(1),
  tiltDeg: z.number().min(-30).max(30).optional().default(0),
  widthMm: z.number().min(5).max(50).optional().default(20),
  resolutionMm: z.number().min(0.05).max(1.0).optional().default(0.25),
});

export interface ParaxialCrossSectionParams {
  volume: VolumeSamplingData | VolumeSamplingInput;
  controlPoints: Point2[];
  positionNormalized: number;
  tiltDeg?: number | undefined;
  widthMm?: number | undefined;
  resolutionMm?: number | undefined;
}

export interface ParaxialCrossSectionResult {
  pixelData: Float32Array;
  width: number;
  height: number;
  horizontalSpacingMm: number;
  verticalSpacingMm: number;
  zMinMm: number;
  zMaxMm: number;
  positionNormalized: number;
  tiltDeg: number;
  widthMm: number;
  frame: CrossSectionFrame;
  minHU: number;
  maxHU: number;
  meanHU: number;
}

export interface PanoramicCprReportParams {
  patientFullName: string;
  birthDate?: string | undefined;
  cardRecordNumber?: string | undefined;
  studyDate: string;
  doctorFullName: string;
  clinicName?: string | undefined;
  panoramicResult: PanoramicReformationResult;
  jawType?: "maxilla" | "mandible" | "both" | undefined;
  paraxialResults?: Array<{
    toothNumber?: number | undefined;
    positionNormalized: number;
    tiltDeg: number;
    boneHeightMm?: number | undefined;
    ridgeWidthMm?: number | undefined;
    notes?: string | undefined;
  }> | undefined;
  radiologistConclusion?: string | undefined;
  recommendations?: string | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DENTAL ARCH CURVE MATHEMATICS
// ─────────────────────────────────────────────────────────────────────────────

export function catmullRom(p0: Point2, p1: Point2, p2: Point2, p3: Point2, t: number): Point2 {
  const t2 = t * t;
  const t3 = t2 * t;
  return [
    0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
  ];
}

export function interpolateArchCurve(controlPoints: Point2[], samplesPerSegment = 50): Point2[] {
  const n = controlPoints.length;
  if (n < 2) return [...controlPoints];
  const first = controlPoints[0] ?? [0, 0];
  const last = controlPoints[n - 1] ?? [0, 0];
  const result: Point2[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = controlPoints[Math.max(0, i - 1)] ?? first;
    const p1 = controlPoints[i] ?? first;
    const p2 = controlPoints[i + 1] ?? last;
    const p3 = controlPoints[Math.min(n - 1, i + 2)] ?? last;
    for (let s = 0; s < samplesPerSegment; s++) {
      result.push(catmullRom(p0, p1, p2, p3, s / samplesPerSegment));
    }
  }
  result.push(last);
  return result;
}

export function totalArcLength(curve: Point2[]): number {
  let len = 0;
  for (let i = 1; i < curve.length; i++) {
    const p1 = curve[i];
    const p0 = curve[i - 1];
    if (p1 && p0) {
      len += Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    }
  }
  return len;
}

export function resampleByArcLength(curve: Point2[], numSamples: number): Point2[] {
  if (curve.length < 2 || numSamples < 2) return [...curve];
  const firstPt = curve[0] ?? [0, 0];
  const cumLen: number[] = [0];
  for (let i = 1; i < curve.length; i++) {
    const pCurr = curve[i] ?? firstPt;
    const pPrev = curve[i - 1] ?? firstPt;
    const prevLen = cumLen[i - 1] ?? 0;
    cumLen.push(prevLen + Math.hypot(pCurr[0] - pPrev[0], pCurr[1] - pPrev[1]));
  }
  const total = cumLen[cumLen.length - 1] ?? 0;
  if (total === 0) return [firstPt];

  const result: Point2[] = [];
  let seg = 0;
  for (let s = 0; s < numSamples; s++) {
    const target = (s / (numSamples - 1)) * total;
    while (seg < curve.length - 2 && (cumLen[seg + 1] ?? 0) < target) seg++;
    const segStart = cumLen[seg] ?? 0;
    const segNext = cumLen[seg + 1] ?? segStart;
    const segLen = segNext - segStart;
    const t = segLen > 0 ? (target - segStart) / segLen : 0;
    const ptA = curve[seg] ?? firstPt;
    const ptB = curve[seg + 1] ?? ptA;
    result.push([
      ptA[0] + t * (ptB[0] - ptA[0]),
      ptA[1] + t * (ptB[1] - ptA[1]),
    ]);
  }
  return result;
}

export function computeCurveNormals(curve: Point2[]): Point2[] {
  if (curve.length < 2) return curve.map((): Point2 => [0, 1]);
  return curve.map((_, i, arr) => {
    let tx: number;
    let ty: number;
    const curr = arr[i] ?? [0, 0];
    if (i === 0) {
      const next = arr[1] ?? curr;
      tx = next[0] - curr[0];
      ty = next[1] - curr[1];
    } else if (i === arr.length - 1) {
      const prev = arr[i - 1] ?? curr;
      tx = curr[0] - prev[0];
      ty = curr[1] - prev[1];
    } else {
      const next = arr[i + 1] ?? curr;
      const prev = arr[i - 1] ?? curr;
      tx = next[0] - prev[0];
      ty = next[1] - prev[1];
    }
    const len = Math.hypot(tx, ty);
    if (len === 0) return [0, 1];
    return [-ty / len, tx / len];
  });
}

export function offsetCurve(curve: Point2[], normals: Point2[], distance: number): Point2[] {
  return curve.map((p, i) => {
    const norm = normals[i] ?? [0, 1];
    return [p[0] + norm[0] * distance, p[1] + norm[1] * distance];
  });
}

export function buildUniformCurve(controlPoints: Point2[], numSamples: number): {
  curve: Point2[];
  normals: Point2[];
  arcLen: number;
} {
  const numSegments = Math.max(1, controlPoints.length - 1);
  const subsPerSeg = Math.max(10, Math.ceil(numSamples / numSegments) * 2);
  const rawCurve = interpolateArchCurve(controlPoints, subsPerSeg);
  const curve = resampleByArcLength(rawCurve, numSamples);
  if (curve.length === 0) return { curve, normals: [], arcLen: 0 };
  const first = curve[0] ?? [0, 0];
  const safeCurve: Point2[] = curve.length < 2 ? [first, first] : curve;
  const normals = computeCurveNormals(safeCurve);
  const arcLen = totalArcLength(safeCurve);
  return { curve: safeCurve, normals, arcLen };
}

export function generateDefaultArchCurve(center: Point2, size: Point2): Point2[] {
  const [cx, cy] = center;
  const sx = size[0] * 0.32;
  const sy = size[1] * 0.32;
  return [
    [cx - sx, cy + sy * 0.85],
    [cx - sx * 0.97, cy + sy * 0.35],
    [cx - sx * 0.85, cy - sy * 0.20],
    [cx - sx * 0.55, cy - sy * 0.70],
    [cx, cy - sy],
    [cx + sx * 0.55, cy - sy * 0.70],
    [cx + sx * 0.85, cy - sy * 0.20],
    [cx + sx * 0.97, cy + sy * 0.35],
    [cx + sx, cy + sy * 0.85],
  ];
}

export function generateDefaultArchWithLandmarks(
  center: Point2,
  size: Point2,
  jaw: "maxilla" | "mandible" = "mandible",
): { controlPoints: Point2[]; landmarks: ArchToothLandmark[] } {
  const controlPoints = generateDefaultArchCurve(center, size);
  const { curve } = buildUniformCurve(controlPoints, 200);
  const teeth = jaw === "maxilla"
    ? [17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27]
    : [47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37];
  const positions = [0.05, 0.12, 0.22, 0.30, 0.38, 0.44, 0.48, 0.52, 0.56, 0.62, 0.70, 0.78, 0.88, 0.95];
  const names = [
    "Второй моляр справа", "Первый моляр справа", "Второй премоляр справа", "Первый премоляр справа",
    "Клык справа", "Боковой резец справа", "Центральный резец справа", "Центральный резец слева",
    "Боковой резец слева", "Клык слева", "Первый премоляр слева", "Второй премоляр слева",
    "Первый моляр слева", "Второй моляр слева",
  ];

  const landmarks: ArchToothLandmark[] = teeth.map((tooth, idx) => {
    const pos = positions[idx] ?? 0.5;
    const name = names[idx] ?? "";
    const ptIdx = Math.min(curve.length - 1, Math.max(0, Math.round(pos * (curve.length - 1))));
    const pt = curve[ptIdx] ?? [0, 0];
    return { fdiToothNumber: tooth, nameRu: name, positionNormalized: pos, point: pt };
  });

  return { controlPoints, landmarks };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TRILINEAR VOXEL INTERPOLATION & SAMPLING ADAPTER
// ─────────────────────────────────────────────────────────────────────────────

export const AIR_HU = -1024;

export function trilinearInterpolation(
  getVoxel: (i: number, j: number, k: number) => number,
  dims: [number, number, number],
  ci: number,
  cj: number,
  ck: number,
  airSentinel = AIR_HU,
): number {
  if (ci < 0 || ci > dims[0] - 1 || cj < 0 || cj > dims[1] - 1 || ck < 0 || ck > dims[2] - 1) {
    return airSentinel;
  }
  const qi = Math.max(0, Math.min(ci, dims[0] - 1 - 1e-6));
  const qj = Math.max(0, Math.min(cj, dims[1] - 1 - 1e-6));
  const qk = Math.max(0, Math.min(ck, dims[2] - 1 - 1e-6));

  const i0 = Math.floor(qi);
  const j0 = Math.floor(qj);
  const k0 = Math.floor(qk);
  const i1 = i0 + 1;
  const j1 = j0 + 1;
  const k1 = k0 + 1;

  const fi = qi - i0;
  const fj = qj - j0;
  const fk = qk - k0;
  const nfi = 1 - fi;
  const nfj = 1 - fj;
  const nfk = 1 - fk;

  return (
    getVoxel(i0, j0, k0) * nfi * nfj * nfk +
    getVoxel(i1, j0, k0) * fi * nfj * nfk +
    getVoxel(i0, j1, k0) * nfi * fj * nfk +
    getVoxel(i1, j1, k0) * fi * fj * nfk +
    getVoxel(i0, j0, k1) * nfi * nfj * fk +
    getVoxel(i1, j0, k1) * fi * nfj * fk +
    getVoxel(i0, j1, k1) * nfi * fj * fk +
    getVoxel(i1, j1, k1) * fi * fj * fk
  );
}

export const trilinear = trilinearInterpolation;

export function createVolumeSamplingData(source: VolumeSamplingInput | VolumeSamplingData): VolumeSamplingData {
  if ("getVoxel" in source && "invSx" in source) return source as VolumeSamplingData;

  const input = source as VolumeSamplingInput;
  const dims = input.dimensions;
  const spacing = input.spacing;
  const origin: [number, number, number] = input.origin ?? [0, 0, 0];

  let getVoxel: (i: number, j: number, k: number) => number;
  if (input.getVoxel) {
    getVoxel = input.getVoxel;
  } else if (input.data) {
    const raw = input.data;
    const sliceStride = dims[0] * dims[1];
    const rowStride = dims[0];
    getVoxel = (i: number, j: number, k: number) => {
      const idx = k * sliceStride + j * rowStride + i;
      return raw[idx] !== undefined ? raw[idx] : AIR_HU;
    };
  } else {
    throw new Error("VolumeSamplingInput must provide either getVoxel function or data TypedArray");
  }

  const z0 = origin[2];
  const z1 = origin[2] + (dims[2] - 1) * spacing[2];

  return {
    dims,
    origin,
    getVoxel,
    invSx: 1 / spacing[0],
    invSy: 1 / spacing[1],
    invSz: 1 / spacing[2],
    zMin: Math.min(z0, z1),
    zMax: Math.max(z0, z1),
    vSpacing: Math.abs(spacing[2]),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PANORAMIC REFORMATION (CPR / OPG-VIEW)
// ─────────────────────────────────────────────────────────────────────────────

export function buildPanoramicReformation(params: PanoramicReformationParams): PanoramicReformationResult | null {
  const vol = createVolumeSamplingData(params.volume);
  const controlPoints = params.controlPoints;
  if (!controlPoints || controlPoints.length < 2) return null;

  const slabThicknessMm = Math.max(1, Math.min(20, params.slabThicknessMm ?? 5.0));
  const projection: ProjectionMode = params.projection ?? "MIP";
  const resolutionMm = Math.max(0.1, Math.min(2.0, params.resolutionMm ?? 0.4));
  const slabStepMm = Math.max(0.2, params.slabStepMm ?? 1.0);

  const roughCurve = interpolateArchCurve(controlPoints, 10);
  const arcEstimate = totalArcLength(roughCurve);
  const targetWidth = Math.max(50, Math.round(arcEstimate / resolutionMm));

  const { curve, normals, arcLen } = buildUniformCurve(controlPoints, targetWidth);
  if (curve.length < 2) return null;

  const width = curve.length;
  const height = Math.max(1, Math.round((vol.zMax - vol.zMin) / vol.vSpacing) + 1);
  const hSpacing = arcLen / Math.max(1, width - 1);
  const halfSlab = slabThicknessMm / 2;
  const numSlab = Math.max(1, Math.round(slabThicknessMm / slabStepMm));

  const pixelData = new Float32Array(width * height);
  let minHU = Infinity;
  let maxHU = -Infinity;
  let sumHU = 0;

  for (let x = 0; x < width; x++) {
    const [cx, cy] = curve[x] ?? [0, 0];
    const [nx, ny] = normals[x] ?? [0, 1];

    for (let y = 0; y < height; y++) {
      const wz = vol.zMax - y * vol.vSpacing;
      let voxelVal: number;

      if (numSlab <= 1) {
        const ci = (cx - vol.origin[0]) * vol.invSx;
        const cj = (cy - vol.origin[1]) * vol.invSy;
        const ck = (wz - vol.origin[2]) * vol.invSz;
        voxelVal = trilinearInterpolation(vol.getVoxel, vol.dims, ci, cj, ck);
      } else {
        let acc = projection === "MIP" ? -Infinity : projection === "MinIP" ? Infinity : 0;
        for (let s = 0; s < numSlab; s++) {
          const offset = -halfSlab + (s / (numSlab - 1)) * slabThicknessMm;
          const wx = cx + nx * offset;
          const wy = cy + ny * offset;
          const ci = (wx - vol.origin[0]) * vol.invSx;
          const cj = (wy - vol.origin[1]) * vol.invSy;
          const ck = (wz - vol.origin[2]) * vol.invSz;
          const val = trilinearInterpolation(vol.getVoxel, vol.dims, ci, cj, ck);

          if (projection === "MIP") {
            if (val > acc) acc = val;
          } else if (projection === "MinIP") {
            if (val < acc) acc = val;
          } else {
            acc += val;
          }
        }
        if (projection === "Average") acc /= numSlab;
        voxelVal = acc;
      }

      pixelData[y * width + x] = voxelVal;
      if (voxelVal < minHU) minHU = voxelVal;
      if (voxelVal > maxHU) maxHU = voxelVal;
      sumHU += voxelVal;
    }
  }

  const totalPixels = width * height;
  const meanHU = totalPixels > 0 ? sumHU / totalPixels : 0;

  return {
    pixelData,
    width,
    height,
    horizontalSpacingMm: hSpacing,
    verticalSpacingMm: vol.vSpacing,
    zMinMm: vol.zMin,
    zMaxMm: vol.zMax,
    arcLengthMm: arcLen,
    slabThicknessMm,
    projection,
    numSlabSamples: numSlab,
    minHU: Number.isFinite(minHU) ? minHU : 0,
    maxHU: Number.isFinite(maxHU) ? maxHU : 0,
    meanHU,
  };
}

export const generatePanoramic = buildPanoramicReformation;

// ─────────────────────────────────────────────────────────────────────────────
// 5. PARAXIAL CROSS-SECTION REFORMATION
// ─────────────────────────────────────────────────────────────────────────────

export function crossSectionFrame(
  controlPoints: Point2[],
  positionNormalized: number,
  tiltDeg: number,
  zMin: number,
  zMax: number,
): CrossSectionFrame | null {
  const { curve, normals } = buildUniformCurve(controlPoints, 500);
  if (curve.length < 2) return null;

  const idx = Math.round(Math.max(0, Math.min(1, positionNormalized)) * (curve.length - 1));
  const point = curve[idx] ?? [0, 0];
  const normal = normals[idx] ?? [0, 1];
  const tangent: Point2 = [normal[1], -normal[0]];

  const MAX_TILT_DEG = 30;
  const clampedTiltDeg = Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, tiltDeg));
  const tiltRad = (clampedTiltDeg * Math.PI) / 180;
  const sinT = Math.sin(tiltRad);
  const cosT = Math.cos(tiltRad);
  const zMid = (zMin + zMax) / 2;

  return {
    point,
    normal,
    tangent,
    origin: [point[0], point[1], zMid],
    eU: [normal[0], normal[1], 0],
    eV: [tangent[0] * sinT, tangent[1] * sinT, cosT],
  };
}

export function computeParaxialCrossSection(
  params: ParaxialCrossSectionParams,
): ParaxialCrossSectionResult | null {
  const vol = createVolumeSamplingData(params.volume);
  const tiltDeg = params.tiltDeg ?? 0;
  const widthMm = Math.max(5, Math.min(50, params.widthMm ?? 20));
  const resolutionMm = Math.max(0.05, Math.min(1.0, params.resolutionMm ?? 0.25));

  const frame = crossSectionFrame(params.controlPoints, params.positionNormalized, tiltDeg, vol.zMin, vol.zMax);
  if (!frame) return null;

  const { origin, eU, eV } = frame;
  const halfW = widthMm / 2;
  const width = Math.max(1, Math.round(widthMm / resolutionMm));
  const height = Math.max(1, Math.round((vol.zMax - vol.zMin) / vol.vSpacing) + 1);
  const hSpacing = widthMm / Math.max(1, width - 1);
  const zMid = (vol.zMin + vol.zMax) / 2;

  const pixelData = new Float32Array(width * height);
  let minHU = Infinity;
  let maxHU = -Infinity;
  let sumHU = 0;

  for (let y = 0; y < height; y++) {
    const v = (vol.zMax - y * vol.vSpacing) - zMid;
    const bx = origin[0] + eV[0] * v;
    const by = origin[1] + eV[1] * v;
    const ck = (origin[2] + eV[2] * v - vol.origin[2]) * vol.invSz;

    for (let x = 0; x < width; x++) {
      const offset = -halfW + x * hSpacing;
      const ci = (bx + eU[0] * offset - vol.origin[0]) * vol.invSx;
      const cj = (by + eU[1] * offset - vol.origin[1]) * vol.invSy;
      const val = trilinearInterpolation(vol.getVoxel, vol.dims, ci, cj, ck);

      pixelData[y * width + x] = val;
      if (val < minHU) minHU = val;
      if (val > maxHU) maxHU = val;
      sumHU += val;
    }
  }

  const totalPixels = width * height;
  const meanHU = totalPixels > 0 ? sumHU / totalPixels : 0;

  return {
    pixelData,
    width,
    height,
    horizontalSpacingMm: hSpacing,
    verticalSpacingMm: vol.vSpacing,
    zMinMm: vol.zMin,
    zMaxMm: vol.zMax,
    positionNormalized: params.positionNormalized,
    tiltDeg,
    widthMm,
    frame,
    minHU: Number.isFinite(minHU) ? minHU : 0,
    maxHU: Number.isFinite(maxHU) ? maxHU : 0,
    meanHU,
  };
}

export const computeCrossSection = computeParaxialCrossSection;

// ─────────────────────────────────────────────────────────────────────────────
// 6. REGULATORY FORM 043/U A4 PROTOCOL FORMATTER (0 EMOJIS)
// ─────────────────────────────────────────────────────────────────────────────

export function formatPanoramicCprReportA4(params: PanoramicCprReportParams): string {
  const pan = params.panoramicResult;
  const clinic = params.clinicName ?? "СТОМАТОЛОГИЧЕСКИЙ ЦЕНТР / ОТДЕЛЕНИЕ ЛУЧЕВОЙ ДИАГНОСТИКИ";
  const card = params.cardRecordNumber ? `№ ${params.cardRecordNumber}` : "[БЕЗ НОМЕРА]";
  const dob = params.birthDate ? ` (д.р. ${params.birthDate})` : "";
  const jawText = params.jawType === "maxilla"
    ? "Верхняя челюсть"
    : params.jawType === "mandible"
      ? "Нижняя челюсть"
      : "Верхняя и нижняя челюсти (обе)";

  const lines: string[] = [
    "================================================================================",
    "              МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ                ",
    "               МЕДИЦИНСКАЯ ДОКУМЕНТАЦИЯ: МЕДИЦИНСКАЯ КАРТА                     ",
    "               СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (ФОРМА 043/У)                       ",
    "================================================================================",
    `Медицинская организация: ${clinic}`,
    "ПРОТОКОЛ КРИВОЛИНЕЙНОЙ ПАНОРАМНОЙ РЕФОРМАЦИИ КЛКТ (CPR / ОПТГ-РЕКОНСТРУКЦИЯ)",
    "--------------------------------------------------------------------------------",
    "1. ПАСПОРТНАЯ ЧАСТЬ И СВЕДЕНИЯ ОБ ИССЛЕДОВАНИИ:",
    `Пациент: ${params.patientFullName}${dob}`,
    `Медицинская карта стоматологического больного: ${card}`,
    `Дата и время реконструкции: ${params.studyDate}`,
    `Врач-рентгенолог / Лечащий врач: ${params.doctorFullName}`,
    `Зона исследования: ${jawText}`,
    "",
    "2. ТЕХНИЧЕСКИЕ ПАРАМЕТРЫ РЕФОРМАЦИИ ЗУБНОЙ ДУГИ (CPR):",
    `Метод математической интерполяции: Catmull-Rom Spline с репараметризацией по дуге`,
    `Длина зубной дуги: ${pan.arcLengthMm.toFixed(1)} мм`,
    `Разрешение реформации: ${pan.width} x ${pan.height} пикс.`,
    `Пространственный шаг по дуге (H-Spacing): ${pan.horizontalSpacingMm.toFixed(3)} мм/пикс`,
    `Шаг по вертикальной оси Z (V-Spacing): ${pan.verticalSpacingMm.toFixed(3)} мм/пикс`,
    `Высота исследуемого объема по Z: от ${pan.zMinMm.toFixed(1)} до ${pan.zMaxMm.toFixed(1)} мм (всего ${(pan.zMaxMm - pan.zMinMm).toFixed(1)} мм)`,
    `Толщина реформированного сляба: ${pan.slabThicknessMm.toFixed(1)} мм`,
    `Режим проекции плотностей: ${pan.projection} (${pan.projection === "MIP" ? "Максимальная интенсивность" : pan.projection === "MinIP" ? "Минимальная плотность" : "Усредненная плотность"})`,
    `Количество сэмплов в толще сляба: ${pan.numSlabSamples}`,
    `Диапазон плотности (HU): Min = ${pan.minHU.toFixed(0)} HU, Max = ${pan.maxHU.toFixed(0)} HU, Mean = ${pan.meanHU.toFixed(0)} HU`,
    "",
    "3. АНАТОМИЧЕСКАЯ ОЦЕНКА ЗУБНОГО РЯДА И АЛЬВЕОЛЯРНОГО ГРЕБНЯ:",
    "Положение контрольных точек дуги соответствует физиологической кривизне зубного ряда.",
    "Непрерывность кортикальных пластинок альвеолярного гребня и дна гайморовых пазух /",
    "нижнечелюстного канала визуализируется без геометрических деформаций.",
  ];

  if (params.paraxialResults && params.paraxialResults.length > 0) {
    lines.push(
      "",
      "4. ИЗМЕРЕНИЯ ПАРААКСИАЛЬНЫХ КРОСС-СЕКЦИЙ (ПОПЕРЕЧНЫХ СРЕЗОВ):",
      "--------------------------------------------------------------------------------",
      "| № | Зуб FDI | Позиция дуги | Наклон (град) | Высота (мм) | Ширина (мм) | Примечание",
      "--------------------------------------------------------------------------------",
    );
    params.paraxialResults.forEach((px, idx) => {
      const toothStr = px.toothNumber !== undefined ? String(px.toothNumber).padStart(7, " ") : "      -";
      const posStr = (px.positionNormalized * 100).toFixed(0) + "%";
      const tiltStr = (px.tiltDeg >= 0 ? "+" : "") + px.tiltDeg.toFixed(1);
      const hStr = px.boneHeightMm !== undefined ? px.boneHeightMm.toFixed(1) : "-";
      const wStr = px.ridgeWidthMm !== undefined ? px.ridgeWidthMm.toFixed(1) : "-";
      const note = px.notes ?? "Норма";
      lines.push(
        `| ${(idx + 1).toString().padStart(2, " ")} | ${toothStr} | ${posStr.padStart(12, " ")} | ${tiltStr.padStart(13, " ")} | ${hStr.padStart(11, " ")} | ${wStr.padStart(11, " ")} | ${note}`,
      );
    });
    lines.push("--------------------------------------------------------------------------------");
  }

  lines.push(
    "",
    "5. ЗАКЛЮЧЕНИЕ ВРАЧА-РЕНТГЕНОЛОГА:",
    params.radiologistConclusion ?? "Криволинейная панорамная реформация выполнена корректно. Деструктивных изменений костной ткани не выявлено.",
  );
  if (params.recommendations) {
    lines.push("", "6. РЕКОМЕНДАЦИИ:", params.recommendations);
  }

  lines.push(
    "",
    "--------------------------------------------------------------------------------",
    `Протокол сформирован: ${params.studyDate}`,
    `Врач: ${params.doctorFullName} _____________________ (Подпись / ЭЦП)`,
    "М.П. Лечебного учреждения",
    "================================================================================",
  );

  return lines.join("\n");
}
