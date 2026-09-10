/**
 * ═══════════════════════════════════════════════════════════════════════════
 * OPTICAL SCAN REGISTRATION & MESH SLICING ENGINE (CBCT / STL / PLY)
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure mathematical engine for registering intraoral optical jaw scans (STL/PLY)
 * with CBCT volumetric datasets and analytical slicing for MPR multi-planar
 * reconstruction views.
 *
 * Capabilities:
 *  1. 4×4 Column-Major Matrix Algebra (OpenGL/VTK layout).
 *  2. Cyclic Jacobi Symmetric Eigensolver (n×n eigen-decomposition).
 *  3. Horn's Unit-Quaternion Rigid Registration (Kabsch algorithm) mapping
 *     corresponding landmark pairs (source optical scan → target CBCT)
 *     with RMS residual fit quality calculation.
 *  4. Point-to-Point ICP (Iterative Closest Point) Surface Refinement.
 *  5. Möller–Trumbore Ray-Triangle Picking against mesh triangle soups.
 *  6. Analytical Triangle-Plane Slicing (point + unit normal).
 *  7. Bounding Volume Hierarchy (AABB Tree) with median centroid partitioning
 *     and slab-plane pruning for O(crossings) contour slicing on 100k+ meshes.
 *
 * 100% pure TypeScript, zero DOM/VTK/React dependencies, unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Vec3 } from "./cbctSafetyEngine.js";

// ── 4×4 Column-Major Matrix Helpers ─────────────────────────────

/** Standard 4×4 column-major identity matrix. */
export const IDENTITY4: readonly number[] = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

/**
 * Multiply two column-major 4×4 matrices: returns a · b.
 */
export function mul4(a: readonly number[] | number[], b: readonly number[] | number[]): number[] {
  const out = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) {
        const ak = a[k * 4 + r] ?? 0;
        const bk = b[c * 4 + k] ?? 0;
        s += ak * bk;
      }
      out[c * 4 + r] = s;
    }
  }
  return out;
}

/**
 * Apply a column-major 4×4 affine transformation matrix to a 3D point.
 */
export function applyMat4(m: readonly number[] | number[], p: Vec3): Vec3 {
  const m0 = m[0] ?? 0;
  const m1 = m[1] ?? 0;
  const m2 = m[2] ?? 0;
  const m4 = m[4] ?? 0;
  const m5 = m[5] ?? 0;
  const m6 = m[6] ?? 0;
  const m8 = m[8] ?? 0;
  const m9 = m[9] ?? 0;
  const m10 = m[10] ?? 0;
  const m12 = m[12] ?? 0;
  const m13 = m[13] ?? 0;
  const m14 = m[14] ?? 0;

  return [
    m0 * p[0] + m4 * p[1] + m8 * p[2] + m12,
    m1 * p[0] + m5 * p[1] + m9 * p[2] + m13,
    m2 * p[0] + m6 * p[1] + m10 * p[2] + m14,
  ];
}

/**
 * Construct a column-major rigid matrix from a row-major 3×3 rotation R and translation t.
 */
export function rigidMatrix(R: number[][], t: Vec3): number[] {
  const r0 = R[0] ?? [1, 0, 0];
  const r1 = R[1] ?? [0, 1, 0];
  const r2 = R[2] ?? [0, 0, 1];

  return [
    r0[0] ?? 1, r1[0] ?? 0, r2[0] ?? 0, 0,
    r0[1] ?? 0, r1[1] ?? 1, r2[1] ?? 0, 0,
    r0[2] ?? 0, r1[2] ?? 0, r2[2] ?? 1, 0,
    t[0], t[1], t[2], 1,
  ];
}

// ── Symmetric Matrix Eigensolver (Cyclic Jacobi) ────────────────

export interface JacobiEigenResult {
  values: number[];
  vectors: number[][];
}

/**
 * Eigen-decomposition of a symmetric n×n matrix via cyclic Jacobi rotations.
 * vectors[r][c] = component r of eigenvector c (column-organized eigenvectors).
 */
export function jacobiEigenSymmetric(input: number[][], n: number): JacobiEigenResult {
  const a: number[][] = input.map((row) => row.slice());
  const v: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );

  for (let iter = 0; iter < 100; iter++) {
    // Locate largest off-diagonal magnitude in upper triangle
    let p = 0;
    let q = 1;
    let off = 0;
    for (let i = 0; i < n; i++) {
      const rowI = a[i];
      if (!rowI) continue;
      for (let j = i + 1; j < n; j++) {
        const val = Math.abs(rowI[j] ?? 0);
        if (val > off) {
          off = val;
          p = i;
          q = j;
        }
      }
    }
    if (off < 1e-12) break;

    const rowP = a[p]!;
    const rowQ = a[q]!;
    const app = rowP[p] ?? 0;
    const aqq = rowQ[q] ?? 0;
    const apq = rowP[q] ?? 0;
    const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
    const c = Math.cos(phi);
    const s = Math.sin(phi);

    // Apply Givens rotation: B = A * J (transform columns)
    for (let i = 0; i < n; i++) {
      const row = a[i]!;
      const aip = row[p] ?? 0;
      const aiq = row[q] ?? 0;
      row[p] = c * aip - s * aiq;
      row[q] = s * aip + c * aiq;
    }
    // Apply Givens rotation: A' = J^T * B (transform rows)
    for (let i = 0; i < n; i++) {
      const api = a[p]![i] ?? 0;
      const aqi = a[q]![i] ?? 0;
      a[p]![i] = c * api - s * aqi;
      a[q]![i] = s * api + c * aqi;
    }
    // Accumulate eigenvectors: V' = V * J
    for (let i = 0; i < n; i++) {
      const vRow = v[i]!;
      const vip = vRow[p] ?? 0;
      const viq = vRow[q] ?? 0;
      vRow[p] = c * vip - s * viq;
      vRow[q] = s * vip + c * viq;
    }
  }

  const values = a.map((row, i) => row[i] ?? 0);
  return { values, vectors: v };
}

// ── Horn's Unit-Quaternion Rigid Registration (Kabsch) ──────────

/**
 * Compute the 3D centroid of an array of points.
 */
export function centroid(pts: Vec3[]): Vec3 {
  if (pts.length === 0) return [0, 0, 0];
  const c: Vec3 = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    c[0] += p[0];
    c[1] += p[1];
    c[2] += p[2];
  }
  const inv = 1 / pts.length;
  return [c[0] * inv, c[1] * inv, c[2] * inv];
}

/**
 * Best-fit rigid transform mapping source landmarks to target landmarks (N ≥ 3).
 * Uses Horn's unit-quaternion method (symmetric 4×4 eigenproblem).
 * Returns a 4×4 column-major affine transform matrix, or null if degenerate.
 */
export function kabschTransform(src: Vec3[], tgt: Vec3[]): number[] | null {
  if (src.length < 3 || src.length !== tgt.length) return null;

  const cs = centroid(src);
  const ct = centroid(tgt);

  // Cross-covariance matrix S[a][b] = Σ (src - cs)[a] · (tgt - ct)[b]
  const S: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  for (let i = 0; i < src.length; i++) {
    const sp = src[i]!;
    const tp = tgt[i]!;
    const p: Vec3 = [sp[0] - cs[0], sp[1] - cs[1], sp[2] - cs[2]];
    const q: Vec3 = [tp[0] - ct[0], tp[1] - ct[1], tp[2] - ct[2]];
    for (let a = 0; a < 3; a++) {
      const sa = S[a]!;
      for (let b = 0; b < 3; b++) {
        sa[b] = (sa[b] ?? 0) + p[a]! * q[b]!;
      }
    }
  }

  const row0 = S[0]!;
  const row1 = S[1]!;
  const row2 = S[2]!;

  const Sxx = row0[0] ?? 0;
  const Sxy = row0[1] ?? 0;
  const Sxz = row0[2] ?? 0;

  const Syx = row1[0] ?? 0;
  const Syy = row1[1] ?? 0;
  const Syz = row1[2] ?? 0;

  const Szx = row2[0] ?? 0;
  const Szy = row2[1] ?? 0;
  const Szz = row2[2] ?? 0;

  // Horn's 4×4 symmetric key matrix N
  const N: number[][] = [
    [Sxx + Syy + Szz, Syz - Szy, Szx - Sxz, Sxy - Syx],
    [Syz - Szy, Sxx - Syy - Szz, Sxy + Syx, Szx + Sxz],
    [Szx - Sxz, Sxy + Syx, -Sxx + Syy - Szz, Syz + Szy],
    [Sxy - Syx, Szx + Sxz, Syz + Szy, -Sxx - Syy + Szz],
  ];

  const { values, vectors } = jacobiEigenSymmetric(N, 4);

  // Optimal rotation quaternion corresponds to maximum eigenvalue
  let best = 0;
  for (let i = 1; i < 4; i++) {
    if ((values[i] ?? -Infinity) > (values[best] ?? -Infinity)) best = i;
  }

  const q0 = vectors[0]?.[best] ?? 1;
  const q1 = vectors[1]?.[best] ?? 0;
  const q2 = vectors[2]?.[best] ?? 0;
  const q3 = vectors[3]?.[best] ?? 0;
  const nrm = Math.hypot(q0, q1, q2, q3) || 1;
  const w = q0 / nrm;
  const x = q1 / nrm;
  const y = q2 / nrm;
  const z = q3 / nrm;

  // Convert unit quaternion to 3×3 rotation matrix R
  const R: number[][] = [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
  ];

  const r0 = R[0]!;
  const r1 = R[1]!;
  const r2 = R[2]!;

  // R * cs
  const Rcs: Vec3 = [
    r0[0]! * cs[0] + r0[1]! * cs[1] + r0[2]! * cs[2],
    r1[0]! * cs[0] + r1[1]! * cs[1] + r1[2]! * cs[2],
    r2[0]! * cs[0] + r2[1]! * cs[1] + r2[2]! * cs[2],
  ];

  // Translation vector t = ct - R * cs
  const t: Vec3 = [ct[0] - Rcs[0], ct[1] - Rcs[1], ct[2] - Rcs[2]];

  return rigidMatrix(R, t);
}

export interface KabschResultWithRms {
  matrix: number[];
  rmsMm: number;
}

/**
 * kabschTransform() plus the RMS point-pair residual in mm.
 * High RMS (> 1.0 mm) indicates inconsistent landmark selection.
 */
export function kabschTransformWithRms(src: Vec3[], tgt: Vec3[]): KabschResultWithRms | null {
  const matrix = kabschTransform(src, tgt);
  if (!matrix) return null;
  let sum = 0;
  for (let i = 0; i < src.length; i++) {
    const sp = src[i]!;
    const tp = tgt[i]!;
    const p = applyMat4(matrix, sp);
    sum += (p[0] - tp[0]) ** 2 + (p[1] - tp[1]) ** 2 + (p[2] - tp[2]) ** 2;
  }
  return { matrix, rmsMm: Math.sqrt(sum / src.length) };
}

// ── Iterative Closest Point (Surface Refinement) ────────────────

export interface IcpOptions {
  /** Maximum iterations (default 40). */
  maxIterations?: number;
  /** Stop when the RMS improvement between iterations drops below this threshold (mm, default 1e-4). */
  tolerance?: number;
  /** Initial source → target transform (default identity). */
  initial?: number[];
}

export interface IcpResult {
  /** Refined source → target rigid transform (4×4 column-major). */
  transform: number[];
  /** Final RMS of each source point to its nearest target point, mm. */
  rmsMm: number;
  /** Total iterations executed. */
  iterations: number;
}

/** Find nearest target point to point q. */
export function nearestPoint(target: Vec3[], q: Vec3): Vec3 {
  let bd = Infinity;
  let bj = 0;
  for (let j = 0; j < target.length; j++) {
    const t = target[j]!;
    const d = (q[0] - t[0]) ** 2 + (q[1] - t[1]) ** 2 + (q[2] - t[2]) ** 2;
    if (d < bd) {
      bd = d;
      bj = j;
    }
  }
  return target[bj]!;
}

/** RMS of transformed source points to their nearest target points, mm. */
export function nearestRms(source: Vec3[], target: Vec3[], m: number[]): number {
  let sum = 0;
  for (let i = 0; i < source.length; i++) {
    const p = source[i]!;
    const q = applyMat4(m, p);
    const t = nearestPoint(target, q);
    sum += (q[0] - t[0]) ** 2 + (q[1] - t[1]) ** 2 + (q[2] - t[2]) ** 2;
  }
  return Math.sqrt(sum / source.length);
}

/**
 * Point-to-point ICP (Iterative Closest Point):
 * Refines an initial alignment between source and target point clouds.
 */
export function icpAlign(
  source: Vec3[],
  target: Vec3[],
  opts: IcpOptions = {},
): IcpResult | null {
  const maxIter = opts.maxIterations ?? 40;
  const tol = opts.tolerance ?? 1e-4;
  if (source.length < 3 || target.length < 1) return null;

  let current: number[] = opts.initial ? [...opts.initial] : [...IDENTITY4];
  let prevRms = Infinity;
  let iter = 0;

  for (; iter < maxIter; iter++) {
    const moved = source.map((p) => applyMat4(current, p));
    const matched = moved.map((m) => nearestPoint(target, m));
    const delta = kabschTransform(moved, matched);
    if (!delta) break;

    current = mul4(delta, current);
    const rms = nearestRms(source, target, current);
    const improved = prevRms - rms;
    prevRms = rms;

    if (improved >= 0 && improved < tol) {
      iter++;
      break;
    }
  }

  const rmsMm = prevRms === Infinity ? nearestRms(source, target, current) : prevRms;
  return { transform: current, rmsMm, iterations: iter };
}

// ── Möller–Trumbore Ray-Triangle Picking ─────────────────────────

/**
 * Möller–Trumbore ray-triangle intersection test.
 * Returns the ray parameter t at intersection (> 1e-6), or null if no hit.
 */
export function rayTriangleHit(
  orig: Vec3,
  dir: Vec3,
  a: Vec3,
  b: Vec3,
  c: Vec3,
): number | null {
  const e1: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const e2: Vec3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];

  const px = dir[1] * e2[2] - dir[2] * e2[1];
  const py = dir[2] * e2[0] - dir[0] * e2[2];
  const pz = dir[0] * e2[1] - dir[1] * e2[0];
  const det = e1[0] * px + e1[1] * py + e1[2] * pz;

  if (Math.abs(det) < 1e-9) return null;
  const inv = 1 / det;

  const tv: Vec3 = [orig[0] - a[0], orig[1] - a[1], orig[2] - a[2]];
  const u = (tv[0] * px + tv[1] * py + tv[2] * pz) * inv;
  if (u < 0 || u > 1) return null;

  const qx = tv[1] * e1[2] - tv[2] * e1[1];
  const qy = tv[2] * e1[0] - tv[0] * e1[2];
  const qz = tv[0] * e1[1] - tv[1] * e1[0];
  const v = (dir[0] * qx + dir[1] * qy + dir[2] * qz) * inv;
  if (v < 0 || u + v > 1) return null;

  const t = (e2[0] * qx + e2[1] * qy + e2[2] * qz) * inv;
  return t > 1e-6 ? t : null;
}

/**
 * Find nearest ray hit against a triangle soup [ax,ay,az, bx,by,bz, cx,cy,cz, ...].
 * Returns the 3D world hit point, or null if no triangle was hit.
 */
export function pickTriangleSoup(
  orig: Vec3,
  dir: Vec3,
  tris: Float32Array | number[],
): Vec3 | null {
  let bestT = Infinity;
  for (let i = 0; i + 8 < tris.length; i += 9) {
    const a: Vec3 = [tris[i] ?? 0, tris[i + 1] ?? 0, tris[i + 2] ?? 0];
    const b: Vec3 = [tris[i + 3] ?? 0, tris[i + 4] ?? 0, tris[i + 5] ?? 0];
    const c: Vec3 = [tris[i + 6] ?? 0, tris[i + 7] ?? 0, tris[i + 8] ?? 0];
    const t = rayTriangleHit(orig, dir, a, b, c);
    if (t !== null && t < bestT) {
      bestT = t;
    }
  }
  if (!Number.isFinite(bestT)) return null;
  return [
    orig[0] + dir[0] * bestT,
    orig[1] + dir[1] * bestT,
    orig[2] + dir[2] * bestT,
  ];
}

// ── Analytical Mesh Triangle Slicing ────────────────────────────

/**
 * Intersect one triangle (at float offset o in tris) with the slicing plane
 * defined by plane point (px, py, pz) and normal (nx, ny, nz).
 * Returns a 3D line segment [Vec3, Vec3] or null if no crossing.
 */
export function sliceTriangleAt(
  tris: Float32Array | number[],
  o: number,
  px: number,
  py: number,
  pz: number,
  nx: number,
  ny: number,
  nz: number,
): [Vec3, Vec3] | null {
  const ax = tris[o] ?? 0;
  const ay = tris[o + 1] ?? 0;
  const az = tris[o + 2] ?? 0;
  const bx = tris[o + 3] ?? 0;
  const by = tris[o + 4] ?? 0;
  const bz = tris[o + 5] ?? 0;
  const cx = tris[o + 6] ?? 0;
  const cy = tris[o + 7] ?? 0;
  const cz = tris[o + 8] ?? 0;

  const d0 = (ax - px) * nx + (ay - py) * ny + (az - pz) * nz;
  const d1 = (bx - px) * nx + (by - py) * ny + (bz - pz) * nz;
  const d2 = (cx - px) * nx + (cy - py) * ny + (cz - pz) * nz;

  const pts: Vec3[] = [];
  const edge = (
    x0: number,
    y0: number,
    z0: number,
    da: number,
    x1: number,
    y1: number,
    z1: number,
    db: number,
  ) => {
    if ((da < 0 && db >= 0) || (da >= 0 && db < 0)) {
      const denom = da - db;
      if (Math.abs(denom) > 1e-12) {
        const t = da / denom;
        pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t]);
      }
    }
  };

  edge(ax, ay, az, d0, bx, by, bz, d1);
  edge(bx, by, bz, d1, cx, cy, cz, d2);
  edge(cx, cy, cz, d2, ax, ay, az, d0);

  const p0 = pts[0];
  const p1 = pts[1];
  return pts.length === 2 && p0 && p1 ? [p0, p1] : null;
}

/**
 * Slice a triangle soup [ax,ay,az, bx,by,bz, cx,cy,cz, ...] with an arbitrary plane.
 * Returns array of 3D segments (one per crossing triangle).
 */
export function slicePlaneSegments(
  tris: Float32Array | number[],
  planePoint: Vec3,
  planeNormal: Vec3,
): [Vec3, Vec3][] {
  const [nx, ny, nz] = planeNormal;
  const [px, py, pz] = planePoint;
  const segs: [Vec3, Vec3][] = [];
  for (let i = 0; i + 8 < tris.length; i += 9) {
    const seg = sliceTriangleAt(tris, i, px, py, pz, nx, ny, nz);
    if (seg) segs.push(seg);
  }
  return segs;
}

// ── Bounding-Volume Hierarchy (AABB Tree) ───────────────────────

export interface BVHNode {
  cx: number;
  cy: number;
  cz: number; // AABB centre
  hx: number;
  hy: number;
  hz: number; // AABB half-extent
  left: BVHNode | null;
  right: BVHNode | null;
  tris: Int32Array | null; // leaf: triangle indices (index * 9 = float offset)
}

export interface TriangleBVH {
  root: BVHNode | null;
  count: number;
}

const BVH_LEAF_SIZE = 4;

/**
 * Build an AABB tree over a triangle soup using median centroid splitting.
 * Enables O(crossings) planar slicing on dense surface scans.
 */
export function buildTriangleBVH(tris: Float32Array | number[]): TriangleBVH {
  const n = Math.floor(tris.length / 9);
  if (n === 0) return { root: null, count: 0 };

  const bmin = new Float64Array(n * 3);
  const bmax = new Float64Array(n * 3);
  const cen = new Float64Array(n * 3);

  for (let t = 0; t < n; t++) {
    const o = t * 9;
    let mnx = tris[o] ?? 0;
    let mny = tris[o + 1] ?? 0;
    let mnz = tris[o + 2] ?? 0;
    let mxx = mnx;
    let mxy = mny;
    let mxz = mnz;

    for (let k = 1; k < 3; k++) {
      const p = o + k * 3;
      const x = tris[p] ?? 0;
      const y = tris[p + 1] ?? 0;
      const z = tris[p + 2] ?? 0;
      if (x < mnx) mnx = x;
      if (y < mny) mny = y;
      if (z < mnz) mnz = z;
      if (x > mxx) mxx = x;
      if (y > mxy) mxy = y;
      if (z > mxz) mxz = z;
    }

    const t3 = t * 3;
    bmin[t3] = mnx;
    bmin[t3 + 1] = mny;
    bmin[t3 + 2] = mnz;

    bmax[t3] = mxx;
    bmax[t3 + 1] = mxy;
    bmax[t3 + 2] = mxz;

    cen[t3] = (mnx + mxx) * 0.5;
    cen[t3 + 1] = (mny + mxy) * 0.5;
    cen[t3 + 2] = (mnz + mxz) * 0.5;
  }

  const idx = new Int32Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;

  const build = (lo: number, hi: number): BVHNode => {
    let mnx = Infinity;
    let mny = Infinity;
    let mnz = Infinity;
    let mxx = -Infinity;
    let mxy = -Infinity;
    let mxz = -Infinity;

    for (let i = lo; i < hi; i++) {
      const t = idx[i] ?? 0;
      const t3 = t * 3;
      const bminX = bmin[t3] ?? 0;
      const bminY = bmin[t3 + 1] ?? 0;
      const bminZ = bmin[t3 + 2] ?? 0;
      const bmaxX = bmax[t3] ?? 0;
      const bmaxY = bmax[t3 + 1] ?? 0;
      const bmaxZ = bmax[t3 + 2] ?? 0;

      if (bminX < mnx) mnx = bminX;
      if (bminY < mny) mny = bminY;
      if (bminZ < mnz) mnz = bminZ;
      if (bmaxX > mxx) mxx = bmaxX;
      if (bmaxY > mxy) mxy = bmaxY;
      if (bmaxZ > mxz) mxz = bmaxZ;
    }

    const node: BVHNode = {
      cx: (mnx + mxx) * 0.5,
      cy: (mny + mxy) * 0.5,
      cz: (mnz + mxz) * 0.5,
      hx: (mxx - mnx) * 0.5,
      hy: (mxy - mny) * 0.5,
      hz: (mxz - mnz) * 0.5,
      left: null,
      right: null,
      tris: null,
    };

    const cnt = hi - lo;
    if (cnt <= BVH_LEAF_SIZE) {
      node.tris = idx.slice(lo, hi);
      return node;
    }

    // Split on axis with widest spread of centroids
    let cmnx = Infinity;
    let cmny = Infinity;
    let cmnz = Infinity;
    let cmxx = -Infinity;
    let cmxy = -Infinity;
    let cmxz = -Infinity;

    for (let i = lo; i < hi; i++) {
      const t = idx[i] ?? 0;
      const t3 = t * 3;
      const x = cen[t3] ?? 0;
      const y = cen[t3 + 1] ?? 0;
      const z = cen[t3 + 2] ?? 0;
      if (x < cmnx) cmnx = x;
      if (y < cmny) cmny = y;
      if (z < cmnz) cmnz = z;
      if (x > cmxx) cmxx = x;
      if (y > cmxy) cmxy = y;
      if (z > cmxz) cmxz = z;
    }

    const dx = cmxx - cmnx;
    const dy = cmxy - cmny;
    const dz = cmxz - cmnz;
    const axis = dx >= dy && dx >= dz ? 0 : dy >= dz ? 1 : 2;
    const mid =
      (axis === 0
        ? cmnx + cmxx
        : axis === 1
          ? cmny + cmxy
          : cmnz + cmxz) * 0.5;

    // Partition idx[lo, hi) by centroid[axis] < mid
    let i = lo;
    let j = hi - 1;
    while (i <= j) {
      const ti = idx[i] ?? 0;
      const cenVal = cen[ti * 3 + axis] ?? 0;
      if (cenVal < mid) {
        i++;
      } else {
        const tmp = idx[i] ?? 0;
        idx[i] = idx[j] ?? 0;
        idx[j] = tmp;
        j--;
      }
    }

    let split = i;
    if (split === lo || split === hi) {
      split = lo + (cnt >> 1); // Degenerate centroid spread fallback
    }

    node.left = build(lo, split);
    node.right = build(split, hi);
    return node;
  };

  return { root: build(0, n), count: n };
}

/**
 * Slice a triangle soup using an AABB BVH.
 * Prunes subtrees whose AABB does not intersect the plane:
 *   |center · n - d| > extent · |n|
 * Identical segment geometry to slicePlaneSegments, but orders of magnitude faster.
 */
export function slicePlaneBVH(
  tris: Float32Array | number[],
  bvh: TriangleBVH,
  planePoint: Vec3,
  planeNormal: Vec3,
): [Vec3, Vec3][] {
  const segs: [Vec3, Vec3][] = [];
  if (!bvh.root) return segs;

  const [nx, ny, nz] = planeNormal;
  const [px, py, pz] = planePoint;
  const anx = Math.abs(nx);
  const any = Math.abs(ny);
  const anz = Math.abs(nz);

  const stack: BVHNode[] = [bvh.root];
  while (stack.length > 0) {
    const nd = stack.pop()!;
    const s = (nd.cx - px) * nx + (nd.cy - py) * ny + (nd.cz - pz) * nz;
    const r = nd.hx * anx + nd.hy * any + nd.hz * anz;

    // Entire box on one side of plane -> prune subtree
    if (Math.abs(s) > r) continue;

    if (nd.tris) {
      for (let k = 0; k < nd.tris.length; k++) {
        const triIdx = nd.tris[k];
        if (triIdx !== undefined) {
          const seg = sliceTriangleAt(tris, triIdx * 9, px, py, pz, nx, ny, nz);
          if (seg) segs.push(seg);
        }
      }
    } else {
      if (nd.left) stack.push(nd.left);
      if (nd.right) stack.push(nd.right);
    }
  }

  return segs;
}
