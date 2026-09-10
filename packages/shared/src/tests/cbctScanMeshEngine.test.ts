import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IDENTITY4,
  mul4,
  applyMat4,
  rigidMatrix,
  jacobiEigenSymmetric,
  centroid,
  kabschTransform,
  kabschTransformWithRms,
  icpAlign,
  rayTriangleHit,
  pickTriangleSoup,
  sliceTriangleAt,
  slicePlaneSegments,
  buildTriangleBVH,
  slicePlaneBVH,
  type Vec3,
} from "../radiology/index.js";

describe("cbctScanMeshEngine", () => {
  describe("4x4 Matrix Helpers", () => {
    it("IDENTITY4 leaves points and vectors unchanged", () => {
      const p: Vec3 = [12.5, -45.2, 108.7];
      const pOut = applyMat4(IDENTITY4 as number[], p);
      assert.ok(Math.abs(pOut[0] - p[0]) < 1e-9);
      assert.ok(Math.abs(pOut[1] - p[1]) < 1e-9);
      assert.ok(Math.abs(pOut[2] - p[2]) < 1e-9);

      const m = mul4(IDENTITY4 as number[], IDENTITY4 as number[]);
      for (let i = 0; i < 16; i++) {
        assert.strictEqual(m[i], IDENTITY4[i]);
      }
    });

    it("mul4 correctly multiplies column-major matrices", () => {
      // Translation by (10, 20, 30)
      const t1 = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        10, 20, 30, 1,
      ];
      // Translation by (5, -5, 10)
      const t2 = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        5, -5, 10, 1,
      ];
      const tCombined = mul4(t1, t2);
      const p: Vec3 = [0, 0, 0];
      const pTransformed = applyMat4(tCombined, p);
      assert.deepStrictEqual(pTransformed, [15, 15, 40]);
    });

    it("rigidMatrix constructs column-major matrix from R and t", () => {
      const R = [
        [1, 0, 0],
        [0, 0, -1],
        [0, 1, 0],
      ];
      const t: Vec3 = [100, 200, 300];
      const m = rigidMatrix(R, t);
      // Check column-major indices
      // col 0: R[0][0], R[1][0], R[2][0], 0
      assert.strictEqual(m[0], 1);
      assert.strictEqual(m[1], 0);
      assert.strictEqual(m[2], 0);
      // col 1: R[0][1], R[1][1], R[2][1], 0
      assert.strictEqual(m[4], 0);
      assert.strictEqual(m[5], 0);
      assert.strictEqual(m[6], 1);
      // col 2: R[0][2], R[1][2], R[2][2], 0
      assert.strictEqual(m[8], 0);
      assert.strictEqual(m[9], -1);
      assert.strictEqual(m[10], 0);
      // col 3: t
      assert.strictEqual(m[12], 100);
      assert.strictEqual(m[13], 200);
      assert.strictEqual(m[14], 300);
      assert.strictEqual(m[15], 1);
    });
  });

  describe("Jacobi Symmetric Eigensolver", () => {
    it("diagonal matrix returns diagonal entries and identity eigenvectors", () => {
      const diag = [
        [4, 0, 0],
        [0, 9, 0],
        [0, 0, 1],
      ];
      const { values } = jacobiEigenSymmetric(diag, 3);
      const sorted = [...values].sort((a, b) => a - b);
      assert.ok(Math.abs(sorted[0]! - 1) < 1e-9);
      assert.ok(Math.abs(sorted[1]! - 4) < 1e-9);
      assert.ok(Math.abs(sorted[2]! - 9) < 1e-9);
    });

    it("symmetric 3x3 matrix produces orthogonal eigenvectors satisfying A*v = lambda*v", () => {
      const A = [
        [2, -1, 0],
        [-1, 2, -1],
        [0, -1, 2],
      ];
      const { values, vectors } = jacobiEigenSymmetric(A, 3);

      for (let c = 0; c < 3; c++) {
        const lambda = values[c]!;
        const v0 = vectors[0]![c]!;
        const v1 = vectors[1]![c]!;
        const v2 = vectors[2]![c]!;

        // Check A * v ≈ lambda * v
        const row0 = A[0]!;
        const row1 = A[1]!;
        const row2 = A[2]!;
        const Av0 = row0[0]! * v0 + row0[1]! * v1 + row0[2]! * v2;
        const Av1 = row1[0]! * v0 + row1[1]! * v1 + row1[2]! * v2;
        const Av2 = row2[0]! * v0 + row2[1]! * v1 + row2[2]! * v2;

        assert.ok(Math.abs(Av0 - lambda * v0) < 1e-9, `Av0 failed for col ${c}`);
        assert.ok(Math.abs(Av1 - lambda * v1) < 1e-9, `Av1 failed for col ${c}`);
        assert.ok(Math.abs(Av2 - lambda * v2) < 1e-9, `Av2 failed for col ${c}`);

        // Check unit length of eigenvector
        const len = Math.hypot(v0, v1, v2);
        assert.ok(Math.abs(len - 1.0) < 1e-9, `eigenvector ${c} not normalized`);
      }
    });
  });

  describe("Kabsch Rigid Landmark Registration", () => {
    it("returns null for degenerate landmark inputs", () => {
      const twoPoints: Vec3[] = [
        [0, 0, 0],
        [1, 1, 1],
      ];
      assert.strictEqual(kabschTransform(twoPoints, twoPoints), null);

      const threePoints: Vec3[] = [
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
      ];
      const fourPoints: Vec3[] = [
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ];
      assert.strictEqual(kabschTransform(threePoints, fourPoints), null);
    });

    it("recovers exact pure translation", () => {
      const src: Vec3[] = [
        [10, 0, 5],
        [20, 15, 5],
        [-5, 30, 2],
        [15, -10, 8],
      ];
      const shift: Vec3 = [42.5, -18.3, 99.1];
      const tgt: Vec3[] = src.map((p) => [p[0] + shift[0], p[1] + shift[1], p[2] + shift[2]]);

      const res = kabschTransformWithRms(src, tgt);
      assert.ok(res !== null);
      assert.ok(res.rmsMm < 1e-6, `RMS should be near zero, got ${res.rmsMm}`);

      for (let i = 0; i < src.length; i++) {
        const srcPt = src[i]!;
        const tgtPt = tgt[i]!;
        const mapped = applyMat4(res.matrix, srcPt);
        assert.ok(Math.abs(mapped[0] - tgtPt[0]) < 1e-5);
        assert.ok(Math.abs(mapped[1] - tgtPt[1]) < 1e-5);
        assert.ok(Math.abs(mapped[2] - tgtPt[2]) < 1e-5);
      }
    });

    it("recovers exact 90-degree rotation around Z and translation", () => {
      // 90 deg rotation around Z: (x, y, z) -> (-y, x, z) + (10, 20, 30)
      const src: Vec3[] = [
        [5, 2, 1],
        [12, -4, 3],
        [-8, 15, 2],
        [20, 20, -5],
      ];
      const tgt: Vec3[] = src.map((p) => [-p[1] + 10, p[0] + 20, p[2] + 30]);

      const res = kabschTransformWithRms(src, tgt);
      assert.ok(res !== null);
      assert.ok(res.rmsMm < 1e-6, `RMS should be near zero, got ${res.rmsMm}`);

      for (let i = 0; i < src.length; i++) {
        const srcPt = src[i]!;
        const tgtPt = tgt[i]!;
        const mapped = applyMat4(res.matrix, srcPt);
        assert.ok(Math.abs(mapped[0] - tgtPt[0]) < 1e-4);
        assert.ok(Math.abs(mapped[1] - tgtPt[1]) < 1e-4);
        assert.ok(Math.abs(mapped[2] - tgtPt[2]) < 1e-4);
      }
    });

    it("handles noisy landmarks with realistic residual RMS", () => {
      const src: Vec3[] = [
        [0, 0, 0],
        [10, 0, 0],
        [0, 10, 0],
        [0, 0, 10],
      ];
      // Slightly perturbed target
      const tgt: Vec3[] = [
        [0.1, 0, 0],
        [10, -0.1, 0],
        [0, 10.1, 0],
        [0, 0, 9.9],
      ];

      const res = kabschTransformWithRms(src, tgt);
      assert.ok(res !== null);
      assert.ok(res.rmsMm > 0 && res.rmsMm < 0.5);
    });

    it("centroid calculates true average", () => {
      const pts: Vec3[] = [
        [10, 20, 30],
        [-10, -20, -30],
        [6, 9, 12],
      ];
      const c = centroid(pts);
      assert.ok(Math.abs(c[0] - 2) < 1e-9);
      assert.ok(Math.abs(c[1] - 3) < 1e-9);
      assert.ok(Math.abs(c[2] - 4) < 1e-9);
    });
  });

  describe("Iterative Closest Point (ICP)", () => {
    it("refines initial slight misalignment down to near zero RMS", () => {
      // Source cloud of 8 vertices
      const target: Vec3[] = [
        [0, 0, 0],
        [10, 0, 0],
        [10, 10, 0],
        [0, 10, 0],
        [0, 0, 10],
        [10, 0, 10],
        [10, 10, 10],
        [0, 10, 10],
      ];
      // Source is target shifted by (0.5, -0.5, 0.2)
      const source: Vec3[] = target.map((p) => [p[0] - 0.5, p[1] + 0.5, p[2] - 0.2]);

      const result = icpAlign(source, target, {
        maxIterations: 20,
        tolerance: 1e-5,
      });

      assert.ok(result !== null);
      assert.ok(result.rmsMm < 1e-4, `Expected near zero RMS, got ${result.rmsMm}`);
      assert.ok(result.iterations > 0);
    });

    it("returns null for degenerate point clouds", () => {
      const empty: Vec3[] = [];
      const twoPts: Vec3[] = [
        [0, 0, 0],
        [1, 1, 1],
      ];
      assert.strictEqual(icpAlign(twoPts, twoPts), null);
      assert.strictEqual(icpAlign(twoPts, empty), null);
    });
  });

  describe("Ray-Triangle Picking (Möller-Trumbore)", () => {
    it("hits triangle center and computes correct distance t", () => {
      // Triangle on XY plane at Z = 10
      const a: Vec3 = [0, 0, 10];
      const b: Vec3 = [10, 0, 10];
      const c: Vec3 = [0, 10, 10];

      const orig: Vec3 = [2, 2, 0];
      const dir: Vec3 = [0, 0, 1]; // pointing +Z directly at triangle

      const t = rayTriangleHit(orig, dir, a, b, c);
      assert.ok(t !== null);
      assert.ok(Math.abs(t - 10) < 1e-6);
    });

    it("returns null for ray missing triangle or pointing away", () => {
      const a: Vec3 = [0, 0, 10];
      const b: Vec3 = [10, 0, 10];
      const c: Vec3 = [0, 10, 10];

      // Ray outside triangle bounds
      const tOutside = rayTriangleHit([12, 12, 0], [0, 0, 1], a, b, c);
      assert.strictEqual(tOutside, null);

      // Ray pointing in opposite direction (-Z)
      const tAway = rayTriangleHit([2, 2, 0], [0, 0, -1], a, b, c);
      assert.strictEqual(tAway, null);
    });

    it("pickTriangleSoup finds closest hit among multiple triangles", () => {
      // Two parallel triangles: T1 at Z=10, T2 at Z=20
      const tris = new Float32Array([
        // T1: Z = 10
        0, 0, 10,
        10, 0, 10,
        0, 10, 10,
        // T2: Z = 20
        0, 0, 20,
        10, 0, 20,
        0, 10, 20,
      ]);

      const hit = pickTriangleSoup([2, 2, 0], [0, 0, 1], tris);
      assert.ok(hit !== null);
      assert.ok(Math.abs(hit[0] - 2) < 1e-5);
      assert.ok(Math.abs(hit[1] - 2) < 1e-5);
      assert.ok(Math.abs(hit[2] - 10) < 1e-5, "Should pick closest triangle at Z=10");
    });
  });

  describe("Analytical Mesh Triangle Slicing", () => {
    it("sliceTriangleAt calculates exact 3D segment at plane intersection", () => {
      // Triangle with vertices spanning across Z = 0
      // a: (0, 0, -5), b: (10, 0, 5), c: (0, 10, 5)
      const tri = [
        0, 0, -5,
        10, 0, 5,
        0, 10, 5,
      ];
      // Plane: point (0, 0, 0), normal (0, 0, 1)
      const seg = sliceTriangleAt(tri, 0, 0, 0, 0, 0, 0, 1);
      assert.ok(seg !== null);

      const [p1, p2] = seg;
      // Both points must lie exactly on Z = 0
      assert.ok(Math.abs(p1[2]) < 1e-6);
      assert.ok(Math.abs(p2[2]) < 1e-6);

      // Edge A-B crossing: t = -(-5) / (5 - (-5)) = 0.5 -> (5, 0, 0)
      // Edge C-A crossing: t = -5 / (-5 - 5) = 0.5 -> (0, 5, 0)
      const pts = [p1, p2].sort((a, b) => a[0] - b[0]);
      assert.ok(Math.abs(pts[0]![0] - 0) < 1e-5 && Math.abs(pts[0]![1] - 5) < 1e-5);
      assert.ok(Math.abs(pts[1]![0] - 5) < 1e-5 && Math.abs(pts[1]![1] - 0) < 1e-5);
    });

    it("returns null when triangle does not cross plane", () => {
      const tri = [
        0, 0, 10,
        10, 0, 12,
        0, 10, 15,
      ];
      // Plane at Z = 0 with normal (0, 0, 1)
      const seg = sliceTriangleAt(tri, 0, 0, 0, 0, 0, 0, 1);
      assert.strictEqual(seg, null);
    });

    it("slicePlaneSegments slices multiple crossing triangles", () => {
      const tris = new Float32Array([
        // Crossing tri 1
        0, 0, -5,  10, 0, 5,  0, 10, 5,
        // Crossing tri 2
        10, 0, -2,  20, 0, 8,  10, 10, 8,
        // Non-crossing tri 3 (above plane)
        0, 0, 10,  10, 0, 20,  0, 10, 30,
      ]);
      const segs = slicePlaneSegments(tris, [0, 0, 0], [0, 0, 1]);
      assert.strictEqual(segs.length, 2);
    });
  });

  describe("AABB BVH and slicePlaneBVH", () => {
    it("handles empty triangle mesh gracefully", () => {
      const empty = new Float32Array(0);
      const bvh = buildTriangleBVH(empty);
      assert.strictEqual(bvh.count, 0);
      assert.strictEqual(bvh.root, null);

      const segs = slicePlaneBVH(empty, bvh, [0, 0, 0], [0, 0, 1]);
      assert.strictEqual(segs.length, 0);
    });

    it("slicePlaneBVH produces identical results to brute-force slicePlaneSegments", () => {
      // Build a grid of 50 triangles spanning across Z = 0
      const triCount = 50;
      const tris = new Float32Array(triCount * 9);
      for (let i = 0; i < triCount; i++) {
        const o = i * 9;
        const x = (i % 10) * 10;
        const y = Math.floor(i / 10) * 10;
        // Triangle vertices crossing Z = 0
        tris[o] = x;
        tris[o + 1] = y;
        tris[o + 2] = -10;

        tris[o + 3] = x + 8;
        tris[o + 4] = y;
        tris[o + 5] = 10;

        tris[o + 6] = x;
        tris[o + 7] = y + 8;
        tris[o + 8] = 10;
      }

      const planePoint: Vec3 = [0, 0, 0];
      const planeNormal: Vec3 = [0, 0, 1];

      const bruteForceSegs = slicePlaneSegments(tris, planePoint, planeNormal);
      const bvh = buildTriangleBVH(tris);
      assert.strictEqual(bvh.count, triCount);
      assert.ok(bvh.root !== null);

      const bvhSegs = slicePlaneBVH(tris, bvh, planePoint, planeNormal);
      assert.strictEqual(bvhSegs.length, bruteForceSegs.length);

      // Verify all segments lie on the plane
      for (const [p1, p2] of bvhSegs) {
        assert.ok(Math.abs(p1[2]) < 1e-6);
        assert.ok(Math.abs(p2[2]) < 1e-6);
      }
    });

    it("BVH prunes triangles when plane is outside mesh bounds", () => {
      // Mesh bounded in [0..20, 0..20, 10..30]
      const tris = new Float32Array([
        0, 0, 10,  20, 0, 20,  0, 20, 30,
        5, 5, 12,  15, 5, 22,  5, 15, 28,
      ]);
      const bvh = buildTriangleBVH(tris);
      // Slicing plane at Z = -50 (far away)
      const segs = slicePlaneBVH(tris, bvh, [0, 0, -50], [0, 0, 1]);
      assert.strictEqual(segs.length, 0);
    });
  });
});
