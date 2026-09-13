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

import type { Vec3 } from "./implantGeometryEngine.js";
import {
  IDENTITY4,
  identity4,
  mul4,
  applyMat4,
  rigidMatrix,
  type JacobiEigenResult,
  jacobiEigenSymmetric,
  centroid,
  kabschTransform,
  type KabschResultWithRms,
  kabschTransformWithRms,
  type IcpOptions,
  type IcpResult,
  nearestPoint,
  nearestRms,
  icpAlign,
  rayTriangleHit,
  pickTriangleSoup,
} from "./scanRegistrationEngine.js";

export type { JacobiEigenResult, KabschResultWithRms, IcpOptions, IcpResult, Vec3 };
export {
  IDENTITY4,
  identity4,
  mul4,
  applyMat4,
  rigidMatrix,
  jacobiEigenSymmetric,
  centroid,
  kabschTransform,
  kabschTransformWithRms,
  nearestPoint,
  nearestRms,
  icpAlign,
  rayTriangleHit,
  pickTriangleSoup,
};

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
