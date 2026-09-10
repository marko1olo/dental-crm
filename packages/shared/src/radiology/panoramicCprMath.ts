/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL DENTAL CBCT: PANORAMIC CPR & ARCH CURVE MATH ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure mathematical algorithms for dental arch curve modeling, Catmull-Rom
 * spline interpolation, uniform arc-length parameterization, automatic arch
 * detection from axial bone MIP slabs, and Curved Planar Reformation (CPR).
 *
 * Designed for dental radiology workstations:
 * - 100% pure TypeScript, zero dependencies on DOM, Canvas, or CornerstoneJS.
 * - Deterministic, floating-point accurate, fully unit-testable.
 * - Standard LPS coordinate convention (Left-Posterior-Superior, +X Left, +Y Post, +Z Sup).
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type Point2 = [number, number];

export interface CPRResult {
  pixelData: Float32Array;
  width: number;
  height: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  zMin: number;
  zMax: number;
}

/** Minimal volume description needed for 3D sampling */
export interface VolumeSamplingData {
  dims: [number, number, number];
  origin: [number, number, number];
  getVoxel: (i: number, j: number, k: number) => number;
  invSx: number;
  invSy: number;
  invSz: number;
  zMin: number;
  zMax: number;
  vSpacing: number;
}

// ── Trilinear Voxel Interpolation ──────────────────────────────

/**
 * Standard CT air sentinel (-1024 HU) for coordinates outside the physical volume.
 */
export const AIR_HU = -1024;

/**
 * High-precision trilinear interpolation over a discrete 3D scalar field.
 * Samples exactly on outermost voxel boundaries are preserved rather than
 * dropping to air sentinel.
 */
export function trilinear(
  getVoxel: (i: number, j: number, k: number) => number,
  dims: [number, number, number],
  ci: number,
  cj: number,
  ck: number,
): number {
  // Genuinely outside the volume -> air sentinel
  if (ci < 0 || ci > dims[0] - 1 || cj < 0 || cj > dims[1] - 1 || ck < 0 || ck > dims[2] - 1) {
    return AIR_HU;
  }

  // Clamp safely within volume boundary to eliminate one-pixel edge artifact
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
    getVoxel(i1, j0, k0) * fi  * nfj * nfk +
    getVoxel(i0, j1, k0) * nfi * fj  * nfk +
    getVoxel(i1, j1, k0) * fi  * fj  * nfk +
    getVoxel(i0, j0, k1) * nfi * nfj * fk  +
    getVoxel(i1, j0, k1) * fi  * nfj * fk  +
    getVoxel(i0, j1, k1) * nfi * fj  * fk  +
    getVoxel(i1, j1, k1) * fi  * fj  * fk
  );
}

// ── Catmull-Rom Spline Interpolation ───────────────────────────

/**
 * Catmull-Rom spline point calculation for parameter t in [0, 1] between p1 and p2,
 * with p0 and p3 acting as directional tangent control points.
 */
export function catmullRom(p0: Point2, p1: Point2, p2: Point2, p3: Point2, t: number): Point2 {
  const t2 = t * t;
  const t3 = t2 * t;
  return [
    0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
  ];
}

/**
 * Interpolate an array of 2D control points through a standard Catmull-Rom spline.
 * Evaluates smooth intermediate points along each segment.
 */
export function interpolateArchCurve(controlPoints: Point2[], samplesPerSegment = 50): Point2[] {
  const n = controlPoints.length;
  if (n < 2) return [...controlPoints];

  const result: Point2[] = [];
  const first = controlPoints[0] ?? [0, 0];
  const last = controlPoints[n - 1] ?? [0, 0];

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

// ── Normals & Arc Length ───────────────────────────────────────

/**
 * Compute unit 2D normals perpendicular to the dental arch curve at each point.
 * The normal is rotated 90 degrees clockwise from the tangent in the XY plane:
 * tangent [tx, ty] -> normal [-ty/len, tx/len] (buccolingual direction).
 */
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

/**
 * Cumulative total Euclidean arc length of a polyline in mm.
 */
export function totalArcLength(curve: Point2[]): number {
  let len = 0;
  for (let i = 1; i < curve.length; i++) {
    const cCurr = curve[i];
    const cPrev = curve[i - 1];
    if (cCurr && cPrev) {
      len += Math.hypot(cCurr[0] - cPrev[0], cCurr[1] - cPrev[1]);
    }
  }
  return len;
}

/**
 * Resample a polyline so that all emitted points are uniformly spaced by arc length.
 * This guarantees uniform pixel scaling across panoramic and cross-sectional reconstructions.
 */
export function resampleByArcLength(curve: Point2[], numSamples: number): Point2[] {
  if (curve.length < 2 || numSamples < 2) return [...curve];

  const firstPt = curve[0] ?? [0, 0];
  const cumLen: number[] = [0];
  for (let i = 1; i < curve.length; i++) {
    const pCurr = curve[i] ?? firstPt;
    const pPrev = curve[i - 1] ?? firstPt;
    const lastLen = cumLen[i - 1] ?? 0;
    cumLen.push(lastLen + Math.hypot(
      pCurr[0] - pPrev[0],
      pCurr[1] - pPrev[1],
    ));
  }
  const total = cumLen[cumLen.length - 1] ?? 0;
  if (total === 0) return [firstPt];

  const result: Point2[] = [];
  let seg = 0;

  for (let s = 0; s < numSamples; s++) {
    const target = (s / (numSamples - 1)) * total;

    while (seg < curve.length - 2 && (cumLen[seg + 1] ?? 0) < target) {
      seg++;
    }

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

/**
 * Generate a standard U-shaped dental arch centered on `center` with
 * approximate extent given by `size` (usable volume dimensions in XY).
 * 9 control points arranged in dental anatomical order:
 * Patient Right Wisdom/Molar -> Right Canine -> Anterior Incisors -> Left Canine -> Left Wisdom/Molar.
 */
export function generateDefaultArchCurve(
  center: Point2,
  size: Point2,
): Point2[] {
  const [cx, cy] = center;
  const sx = size[0] * 0.32;
  const sy = size[1] * 0.32;

  // Horseshoe opening posteriorly (+Y in LPS coordinate system)
  return [
    [cx - sx,          cy + sy * 0.85], // right wisdom / posterior molar
    [cx - sx * 0.97,   cy + sy * 0.35], // right molar
    [cx - sx * 0.85,   cy - sy * 0.20], // right premolar
    [cx - sx * 0.55,   cy - sy * 0.70], // right canine
    [cx,               cy - sy],        // central incisors (most anterior)
    [cx + sx * 0.55,   cy - sy * 0.70], // left canine
    [cx + sx * 0.85,   cy - sy * 0.20], // left premolar
    [cx + sx * 0.97,   cy + sy * 0.35], // left molar
    [cx + sx,          cy + sy * 0.85], // left wisdom / posterior molar
  ];
}

/**
 * Parallel offset curve for slab-width or periodontal boundary visualization.
 */
export function offsetCurve(curve: Point2[], normals: Point2[], distance: number): Point2[] {
  return curve.map((p, i) => {
    const norm = normals[i] ?? [0, 1];
    return [
      p[0] + norm[0] * distance,
      p[1] + norm[1] * distance,
    ];
  });
}

/**
 * Build a dense, arc-length-uniform curve with orthogonal unit normals.
 */
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
  const safeCurve = curve.length < 2 ? [first, first] : curve;
  const normals = computeCurveNormals(safeCurve);
  const arcLen = totalArcLength(safeCurve);

  return { curve: safeCurve, normals, arcLen };
}

// ── Cross-Section Resection & Dynamic Tilt Math ────────────────

export interface CrossSectionGeometryParams {
  controlPoints: Point2[];
  position: number;   // 0-1 normalized along the arch curve
  tiltDeg: number;    // degrees: tilt/lean of slice vertical axis along curve tangent
  widthMm: number;    // total width of cross-section in mm (buccolingual)
  resolution: number; // mm per pixel
}

/** World-space 3D frame of the cross-section resection plane */
export interface CrossSectionFrame {
  point: Point2;    // Curve point (XY)
  normal: Point2;   // Buccolingual unit normal (XY)
  tangent: Point2;  // Unit tangent pointing toward increasing arch position (XY)
  origin: [number, number, number]; // Plane origin: curve point at mid-Z
  eU: [number, number, number];     // In-plane horizontal unit vector (buccolingual)
  eV: [number, number, number];     // In-plane vertical unit vector (tilted cranial-caudal)
}

/** Maximum allowed clinical cross-section tilt in degrees (±30°) */
export const MAX_CROSS_SECTION_TILT_DEG = 30;

/**
 * Calculate the world-space coordinate frame of a cross-section slice
 * perpendicular to the dental arch curve at a normalized position (0..1).
 */
export function crossSectionFrame(
  controlPoints: Point2[],
  position: number,
  tiltDeg: number,
  zMin: number,
  zMax: number,
): CrossSectionFrame | null {
  const { curve, normals } = buildUniformCurve(controlPoints, 500);
  if (curve.length < 2) return null;

  const idx = Math.round(Math.max(0, Math.min(1, position)) * (curve.length - 1));
  const point = curve[idx] ?? [0, 0];
  const normal = normals[idx] ?? [0, 1];

  // Normal is tangent rotated 90° CW ([-ty, tx]), so tangent is [ny, -nx]
  const tangent: Point2 = [normal[1], -normal[0]];

  // Clamp tilt to medical safe limit ±30° to prevent anatomical distortion
  const clampedTiltDeg = Math.max(-MAX_CROSS_SECTION_TILT_DEG, Math.min(MAX_CROSS_SECTION_TILT_DEG, tiltDeg));
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

/**
 * Sample a 2D cross-section slice (transverse cut) perpendicular to the dental arch curve.
 * Used for precise implant site evaluation, bone width/height measurement, and mandibular canal locating.
 */
export function computeCrossSection(
  vol: VolumeSamplingData,
  params: CrossSectionGeometryParams,
): CPRResult | null {
  const frame = crossSectionFrame(params.controlPoints, params.position, params.tiltDeg, vol.zMin, vol.zMax);
  if (!frame) return null;

  const { origin, eU, eV } = frame;
  const halfW = params.widthMm / 2;
  const width = Math.max(1, Math.round(params.widthMm / params.resolution));
  const height = Math.max(1, Math.round((vol.zMax - vol.zMin) / vol.vSpacing));
  const hSpacing = params.widthMm / Math.max(1, width - 1);
  const zMid = (vol.zMin + vol.zMax) / 2;

  const pixelData = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    const v = (vol.zMax - y * vol.vSpacing) - zMid;
    const bx = origin[0] + eV[0] * v;
    const by = origin[1] + eV[1] * v;
    const ck = (origin[2] + eV[2] * v - vol.origin[2]) * vol.invSz;

    for (let x = 0; x < width; x++) {
      const offset = -halfW + x * hSpacing;
      const ci = (bx + eU[0] * offset - vol.origin[0]) * vol.invSx;
      const cj = (by + eU[1] * offset - vol.origin[1]) * vol.invSy;
      pixelData[y * width + x] = trilinear(vol.getVoxel, vol.dims, ci, cj, ck);
    }
  }

  return {
    pixelData,
    width,
    height,
    horizontalSpacing: hSpacing,
    verticalSpacing: vol.vSpacing,
    zMin: vol.zMin,
    zMax: vol.zMax,
  };
}

// ── Automatic Arch Detection Math ──────────────────────────────

export interface ArchDetectOptions {
  /** World Z of slab center in mm (default: mid-Z) */
  focalWorldZ?: number;
  /** Half-thickness of projected slab in mm (default: 6.0 mm) */
  slabHalfMm?: number;
  /** Bone density threshold in HU/GV (default: 400 for cortical bone / teeth) */
  boneThreshold?: number;
  /** Number of output Catmull-Rom control points (default: 9) */
  numControlPoints?: number;
  /** Angular half-span of swept arc from anterior in degrees (default: 115) */
  angularSpanDeg?: number;
}

/**
 * Automatically detects dental arch control points from an axial CBCT volume.
 * Algorithm:
 * 1. Computes Maximum Intensity Projection (MIP) of an axial slab around the focal Z.
 * 2. Identifies bone centroid using thresholded cortical bone mask (>400 HU).
 * 3. Sweeps radial rays from centroid across anterior arch, finding peak bone radius.
 * 4. Applies moving average smoothing and arc-length resampling to 9 control points.
 *
 * Returns null if insufficient bone density is detected (fallback to manual curve).
 */
export function detectArchControlPoints(
  vol: VolumeSamplingData,
  opts: ArchDetectOptions = {},
): Point2[] | null {
  const {
    slabHalfMm = 6,
    boneThreshold = 400,
    numControlPoints = 9,
    angularSpanDeg = 115,
  } = opts;

  const [nx, ny, nz] = vol.dims;
  const [ox, oy, oz] = vol.origin;
  const sx = 1 / vol.invSx;
  const sy = 1 / vol.invSy;
  const sz = 1 / vol.invSz;

  if (nx < 4 || ny < 4 || nz < 1) return null;

  const focalZ = opts.focalWorldZ ?? (vol.zMin + vol.zMax) / 2;
  const kCenter = Math.round((focalZ - oz) / sz);
  const kHalf = Math.max(0, Math.round(slabHalfMm / Math.abs(sz)));
  const kLo = Math.max(0, kCenter - kHalf);
  const kHi = Math.min(nz - 1, kCenter + kHalf);

  if (kLo > kHi) return null;

  // 1. Max-intensity projection over slab
  const M = new Float32Array(nx * ny);
  for (let k = kLo; k <= kHi; k++) {
    for (let j = 0; j < ny; j++) {
      const row = j * nx;
      for (let i = 0; i < nx; i++) {
        const v = vol.getVoxel(i, j, k);
        const idx = row + i;
        const curM = M[idx] ?? 0;
        if (v > curM) M[idx] = v;
      }
    }
  }

  // 2. Bone centroid
  let sumI = 0;
  let sumJ = 0;
  let count = 0;
  for (let j = 0; j < ny; j++) {
    const row = j * nx;
    for (let i = 0; i < nx; i++) {
      const valM = M[row + i] ?? 0;
      if (valM > boneThreshold) {
        sumI += i;
        sumJ += j;
        count++;
      }
    }
  }

  if (count < Math.max(50, nx * ny * 0.002)) return null;

  const ci = sumI / count;
  const cj = sumJ / count;
  const cxw = ox + ci * sx;
  const cyw = oy + cj * sy;

  // Bilinear sample of M
  const sampleM = (fi: number, fj: number): number => {
    if (fi < 0 || fj < 0 || fi > nx - 1 || fj > ny - 1) return 0;
    const i0 = Math.floor(fi);
    const j0 = Math.floor(fj);
    const i1 = Math.min(nx - 1, i0 + 1);
    const j1 = Math.min(ny - 1, j0 + 1);
    const ti = fi - i0;
    const tj = fj - j0;
    const a = M[j0 * nx + i0] ?? 0;
    const b = M[j0 * nx + i1] ?? 0;
    const c = M[j1 * nx + i0] ?? 0;
    const d = M[j1 * nx + i1] ?? 0;
    return (a * (1 - ti) + b * ti) * (1 - tj) + (c * (1 - ti) + d * ti) * tj;
  };

  // 3. Radial trace across anterior arc
  const spanRad = (angularSpanDeg * Math.PI) / 180;
  const stepRad = (1.5 * Math.PI) / 180;
  const rMin = 4;
  const rMax = 0.48 * Math.min(nx * sx, ny * sy);
  const rStep = Math.max(0.5, Math.min(sx, sy));
  const band: Point2[] = [];

  for (let phi = -spanRad; phi <= spanRad + 1e-6; phi += stepRad) {
    const dx = Math.sin(phi);
    const dy = -Math.cos(phi);
    let bestR = -1;
    let bestV = boneThreshold;

    for (let r = rMin; r <= rMax; r += rStep) {
      const wx = cxw + r * dx;
      const wy = cyw + r * dy;
      const v = sampleM((wx - ox) / sx, (wy - oy) / sy);
      if (v > bestV) {
        bestV = v;
        bestR = r;
      }
    }

    if (bestR > 0) {
      band.push([cxw + bestR * dx, cyw + bestR * dy]);
    }
  }

  if (band.length < 5) return null;

  // 4. Moving average smoothing and arc-length resampling
  const smoothed = smoothPolyline2D(band, 2);
  const cps = resampleByArcLength(smoothed, numControlPoints);
  return cps.length === numControlPoints ? cps : null;
}

function smoothPolyline2D(pts: Point2[], radius: number): Point2[] {
  const n = pts.length;
  if (radius < 1 || n < 3) return pts;
  const out: Point2[] = [];
  for (let i = 0; i < n; i++) {
    let sx = 0;
    let sy = 0;
    let c = 0;
    for (let k = -radius; k <= radius; k++) {
      const idx = i + k;
      if (idx >= 0 && idx < n) {
        const pt = pts[idx];
        if (pt) {
          sx += pt[0];
          sy += pt[1];
          c++;
        }
      }
    }
    out.push([sx / c, sy / c]);
  }
  return out;
}

// ── Pure Panoramic CPR Volumetric Sampling ─────────────────────

export interface PanoramicSamplingParams {
  controlPoints: Point2[];
  slabWidthMm: number;
  projection: 'MIP' | 'AVG' | 'THIN';
  resolutionMm: number;
}

/**
 * Pure volumetric Panoramic CPR generator.
 * Produces a full panoramic reconstructed radiograph from CBCT voxels along the arch curve.
 */
export function computePanoramicCPR(
  vol: VolumeSamplingData,
  params: PanoramicSamplingParams,
): CPRResult | null {
  const roughCurve = interpolateArchCurve(params.controlPoints, 10);
  const arcEstimate = totalArcLength(roughCurve);
  const targetWidth = Math.max(50, Math.round(arcEstimate / params.resolutionMm));

  const { curve, normals, arcLen } = buildUniformCurve(params.controlPoints, targetWidth);
  if (curve.length < 2) return null;

  const width = curve.length;
  const height = Math.max(1, Math.round((vol.zMax - vol.zMin) / vol.vSpacing));
  const hSpacing = arcLen / Math.max(1, width - 1);

  const halfSlab = params.slabWidthMm / 2;
  const SLAB_STEP_MM = 1.0;
  const numSlab = params.projection === 'THIN' || params.slabWidthMm <= 1.0
    ? 1
    : Math.max(1, Math.round(params.slabWidthMm / SLAB_STEP_MM));
  const isMIP = params.projection === 'MIP';

  const pixelData = new Float32Array(width * height);

  for (let x = 0; x < width; x++) {
    const curPt = curve[x] ?? [0, 0];
    const curNorm = normals[x] ?? [0, 1];
    const cx = curPt[0];
    const cy = curPt[1];
    const nx = curNorm[0];
    const ny = curNorm[1];

    for (let y = 0; y < height; y++) {
      const wz = vol.zMax - y * vol.vSpacing;

      if (numSlab <= 1) {
        const ci = (cx - vol.origin[0]) * vol.invSx;
        const cj = (cy - vol.origin[1]) * vol.invSy;
        const ck = (wz - vol.origin[2]) * vol.invSz;
        pixelData[y * width + x] = trilinear(vol.getVoxel, vol.dims, ci, cj, ck);
      } else {
        let acc = isMIP ? -Infinity : 0;
        for (let s = 0; s < numSlab; s++) {
          const offset = -halfSlab + (s / (numSlab - 1)) * params.slabWidthMm;
          const wx = cx + nx * offset;
          const wy = cy + ny * offset;
          const ci = (wx - vol.origin[0]) * vol.invSx;
          const cj = (wy - vol.origin[1]) * vol.invSy;
          const ck = (wz - vol.origin[2]) * vol.invSz;
          const val = trilinear(vol.getVoxel, vol.dims, ci, cj, ck);
          if (isMIP) {
            if (val > acc) acc = val;
          } else {
            acc += val;
          }
        }
        if (!isMIP) acc /= numSlab;
        pixelData[y * width + x] = acc;
      }
    }
  }

  return {
    pixelData,
    width,
    height,
    horizontalSpacing: hSpacing,
    verticalSpacing: vol.vSpacing,
    zMin: vol.zMin,
    zMax: vol.zMax,
  };
}
