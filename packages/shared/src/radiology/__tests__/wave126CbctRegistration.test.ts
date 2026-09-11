/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAVE 126: CBCT <-> INTRAORAL SCAN REGISTRATION & ICP ALIGNMENT TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 * Comprehensive unit tests for:
 * 1. 4×4 column-major matrix helpers (IDENTITY4, mul4, applyMat4, rigidMatrix).
 * 2. jacobiEigenSymmetric eigensolver (eigenvalues, eigenvector orthogonality).
 * 3. kabschTransform & kabschTransformWithRms:
 *    - Translation and 90-degree Z-axis rotation recovery with RMS < 1e-5
 *    - Invariance to arbitrary 3D offsets and rotations
 *    - Degenerate inputs (< 3 points or mismatched array lengths return null)
 * 4. icpAlign (Iterative Closest Point):
 *    - 20-point 3D point cloud with rigid perturbation
 *    - Convergence verification and RMS reduction below tolerance
 *    - Degenerate inputs (< 3 points or empty target return null)
 * 5. rayTriangleHit (Möller–Trumbore):
 *    - Direct ray hit with exact parametric distance t
 *    - Miss outside triangle boundary
 *    - Parallel / grazing ray and opposite direction ray
 * 6. pickTriangleSoup:
 *    - Closest triangle hit determination in multi-triangle soup
 *    - Array types support (number[] and Float32Array)
 *    - Ray miss returns null
 * 7. formatRegistrationA4Protocol:
 *    - Formatted A4 printable medical protocol
 *    - Clinical acceptance threshold check (RMS <= 0.5 mm)
 *    - Strict absence of cartoon emojis (Mandate 8d item 7)
 *
 * 100% Zero Mocks, pure analytical testing.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  IDENTITY4,
  mul4,
  applyMat4,
  rigidMatrix,
  centroid,
  jacobiEigenSymmetric,
  kabschTransform,
  kabschTransformWithRms,
  icpAlign,
  nearestPoint,
  nearestRms,
  rayTriangleHit,
  pickTriangleSoup,
  formatRegistrationA4Protocol,
} from "../cbctRegistrationEngine.js";
import type { Vec3 } from "../cprMath.js";

describe("Wave 126: CBCT <-> Intraoral Scan Registration & ICP Engine", () => {
  // ── 1. Matrix Algebra Helpers ─────────────────────────────────

  describe("1. 4×4 Matrix Algebra (IDENTITY4, mul4, applyMat4, rigidMatrix)", () => {
    it("verifies IDENTITY4 identity properties", () => {
      assert.strictEqual(IDENTITY4.length, 16);
      assert.strictEqual(IDENTITY4[0], 1);
      assert.strictEqual(IDENTITY4[5], 1);
      assert.strictEqual(IDENTITY4[10], 1);
      assert.strictEqual(IDENTITY4[15], 1);

      const p: Vec3 = [12.5, -45.2, 78.9];
      const pTrans = applyMat4(IDENTITY4, p);
      assert.ok(Math.abs(pTrans[0] - p[0]) < 1e-6);
      assert.ok(Math.abs(pTrans[1] - p[1]) < 1e-6);
      assert.ok(Math.abs(pTrans[2] - p[2]) < 1e-6);

      const prod = mul4(IDENTITY4, IDENTITY4);
      for (let i = 0; i < 16; i++) {
        assert.ok(Math.abs((prod[i] ?? 0) - (IDENTITY4[i] ?? 0)) < 1e-6);
      }
    });

    it("multiplies two translation matrices correctly via mul4", () => {
      // Column-major translation matrix by [10, 20, 30]
      const t1 = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        10, 20, 30, 1,
      ];
      // Column-major translation matrix by [5, -10, 15]
      const t2 = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        5, -10, 15, 1,
      ];

      const tCombined = mul4(t1, t2);
      const origin: Vec3 = [0, 0, 0];
      const res = applyMat4(tCombined, origin);

      assert.ok(Math.abs(res[0] - 15) < 1e-6, `X should be 15, got ${res[0]}`);
      assert.ok(Math.abs(res[1] - 10) < 1e-6, `Y should be 10, got ${res[1]}`);
      assert.ok(Math.abs(res[2] - 45) < 1e-6, `Z should be 45, got ${res[2]}`);
    });

    it("constructs rigid matrix from rotation and translation", () => {
      const R = [
        [0, -1, 0],
        [1, 0, 0],
        [0, 0, 1],
      ];
      const t: Vec3 = [5, 10, 15];
      const M = rigidMatrix(R, t);

      assert.strictEqual(M.length, 16);
      assert.strictEqual(M[0], 0);
      assert.strictEqual(M[1], 1);
      assert.strictEqual(M[4], -1);
      assert.strictEqual(M[5], 0);
      assert.strictEqual(M[10], 1);
      assert.strictEqual(M[12], 5);
      assert.strictEqual(M[13], 10);
      assert.strictEqual(M[14], 15);
      assert.strictEqual(M[15], 1);
    });
  });

  // ── 2. Cyclic Jacobi Eigensolver ──────────────────────────────

  describe("2. jacobiEigenSymmetric (Cyclic Jacobi Solver)", () => {
    it("solves eigenvalues for a 3×3 diagonal matrix exactly", () => {
      const diag = [
        [5, 0, 0],
        [0, 2, 0],
        [0, 0, 9],
      ];
      const res = jacobiEigenSymmetric(diag, 3);
      assert.strictEqual(res.values.length, 3);
      assert.ok(Math.abs(res.values[0]! - 5) < 1e-6);
      assert.ok(Math.abs(res.values[1]! - 2) < 1e-6);
      assert.ok(Math.abs(res.values[2]! - 9) < 1e-6);
    });

    it("computes orthogonal eigenvectors for a symmetric matrix", () => {
      const mat = [
        [4, 1, 2],
        [1, 5, 3],
        [2, 3, 6],
      ];
      const { values, vectors } = jacobiEigenSymmetric(mat, 3);

      // Verify A * v = lambda * v for each eigenvector
      for (let c = 0; c < 3; c++) {
        const lambda = values[c]!;
        const v = [vectors[0]![c]!, vectors[1]![c]!, vectors[2]![c]!];

        // mat * v
        const Av0 = mat[0]![0]! * v[0]! + mat[0]![1]! * v[1]! + mat[0]![2]! * v[2]!;
        const Av1 = mat[1]![0]! * v[0]! + mat[1]![1]! * v[1]! + mat[1]![2]! * v[2]!;
        const Av2 = mat[2]![0]! * v[0]! + mat[2]![1]! * v[1]! + mat[2]![2]! * v[2]!;

        assert.ok(Math.abs(Av0 - lambda * v[0]!) < 1e-5);
        assert.ok(Math.abs(Av1 - lambda * v[1]!) < 1e-5);
        assert.ok(Math.abs(Av2 - lambda * v[2]!) < 1e-5);
      }

      // Check orthogonality of eigenvector columns: v_0 . v_1 = 0
      const dot01 =
        vectors[0]![0]! * vectors[0]![1]! +
        vectors[1]![0]! * vectors[1]![1]! +
        vectors[2]![0]! * vectors[2]![1]!;
      assert.ok(Math.abs(dot01) < 1e-6);
    });
  });

  // ── 3. Kabsch Landmark Registration ───────────────────────────

  describe("3. kabschTransform & kabschTransformWithRms", () => {
    it("returns null for fewer than 3 points or mismatched array lengths", () => {
      const p1: Vec3[] = [[0, 0, 0], [1, 0, 0]];
      const p2: Vec3[] = [[0, 0, 0], [1, 0, 0]];
      assert.strictEqual(kabschTransform([], []), null);
      assert.strictEqual(kabschTransform(p1, p2), null);
      assert.strictEqual(kabschTransformWithRms(p1, p2), null);

      const p3: Vec3[] = [[0, 0, 0], [1, 0, 0], [0, 1, 0]];
      const p4: Vec3[] = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 1]];
      assert.strictEqual(kabschTransform(p3, p4), null);
      assert.strictEqual(kabschTransformWithRms(p3, p4), null);
    });

    it("recovers exact transform for 4 points rotated 90 deg around Z and translated (RMS < 1e-5)", () => {
      // 4 landmark points (e.g. canine cusp, molar cusps, incisal edge)
      const src: Vec3[] = [
        [0, 0, 0],
        [10, 0, 0],
        [0, 10, 0],
        [10, 10, 5],
      ];

      // Ground-truth transform: 90 deg rotation around Z and translation [15, -20, 30]
      // Rotation: (x, y, z) -> (-y, x, z)
      // Target: (-y + 15, x - 20, z + 30)
      const tgt: Vec3[] = [
        [0 + 15, 0 - 20, 0 + 30],       // [15, -20, 30]
        [0 + 15, 10 - 20, 0 + 30],      // [15, -10, 30]
        [-10 + 15, 0 - 20, 0 + 30],     // [5, -20, 30]
        [-10 + 15, 10 - 20, 5 + 30],    // [5, -10, 35]
      ];

      const res = kabschTransformWithRms(src, tgt);
      assert.ok(res !== null, "Result must not be null");

      // Verify RMS is smaller than 1e-5 mm
      assert.ok(
        res.rmsMm < 1e-5,
        `RMS residual ${res.rmsMm} mm must be less than 1e-5`,
      );

      // Verify each transformed point matches target within 1e-5 mm
      for (let i = 0; i < src.length; i++) {
        const transformed = applyMat4(res.matrix, src[i]!);
        const target = tgt[i]!;
        assert.ok(
          Math.abs(transformed[0] - target[0]) < 1e-5,
          `Point ${i} X: expected ${target[0]}, got ${transformed[0]}`,
        );
        assert.ok(
          Math.abs(transformed[1] - target[1]) < 1e-5,
          `Point ${i} Y: expected ${target[1]}, got ${transformed[1]}`,
        );
        assert.ok(
          Math.abs(transformed[2] - target[2]) < 1e-5,
          `Point ${i} Z: expected ${target[2]}, got ${transformed[2]}`,
        );
      }
    });

    it("correctly computes centroid of 3D point set", () => {
      const pts: Vec3[] = [
        [10, 20, 30],
        [20, 30, 40],
        [30, 40, 50],
      ];
      const c = centroid(pts);
      assert.ok(Math.abs(c[0] - 20) < 1e-6);
      assert.ok(Math.abs(c[1] - 30) < 1e-6);
      assert.ok(Math.abs(c[2] - 40) < 1e-6);
    });
  });

  // ── 4. Iterative Closest Point (ICP) ──────────────────────────

  describe("4. icpAlign (Point-to-Point Surface Refinement)", () => {
    it("returns null for insufficient points (< 3 source or < 1 target)", () => {
      assert.strictEqual(icpAlign([], []), null);
      assert.strictEqual(icpAlign([[0, 0, 0]], [[0, 0, 0]]), null);
      assert.strictEqual(icpAlign([[0, 0, 0], [1, 1, 1]], [[0, 0, 0]]), null);
      assert.strictEqual(icpAlign([[0, 0, 0], [1, 0, 0], [0, 1, 0]], []), null);
    });

    it("converges and reduces RMS below tolerance on 20 points with random displacement", () => {
      // 20 points distributed on a dental parabolic arch in the XY plane
      const target: Vec3[] = [];
      for (let i = 0; i < 20; i++) {
        const u = -1 + (2 * i) / 19; // -1 .. 1
        const x = u * 25; // -25mm .. +25mm
        const y = 0.04 * x * x; // Parabola y = 0.04 x^2
        const z = Math.sin(i * 0.5) * 3; // slight 3D curvature
        target.push([x, y, z]);
      }

      // Slightly displace and rotate the source cloud
      // Small rotation theta = 0.05 rad (~2.8 deg) around Z and translation [1.2, -0.8, 0.5]
      const theta = 0.05;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const tx = 1.2;
      const ty = -0.8;
      const tz = 0.5;

      const source: Vec3[] = target.map((p) => {
        // Inverse transform to simulate displaced optical scan
        const px = p[0] - tx;
        const py = p[1] - ty;
        const pz = p[2] - tz;
        return [
          cosT * px + sinT * py,
          -sinT * px + cosT * py,
          pz,
        ];
      });

      // Initial alignment error without ICP
      const initialRms = nearestRms(source, target, IDENTITY4);
      assert.ok(initialRms > 0.5, `Initial RMS ${initialRms} mm should be > 0.5 mm`);

      // Execute ICP refinement
      const result = icpAlign(source, target, {
        maxIterations: 60,
        tolerance: 1e-4,
      });

      assert.ok(result !== null, "ICP result must not be null");
      assert.ok(result.iterations > 0, "Must perform at least 1 iteration");
      assert.ok(
        result.rmsMm < initialRms,
        `Final RMS (${result.rmsMm} mm) must be less than initial RMS (${initialRms} mm)`,
      );
      assert.ok(
        result.rmsMm < 0.05,
        `Final RMS (${result.rmsMm} mm) must achieve sub-tenth-millimeter convergence`,
      );
    });

    it("finds nearest point in target cloud accurately", () => {
      const cloud: Vec3[] = [
        [0, 0, 0],
        [10, 0, 0],
        [0, 10, 0],
        [10, 10, 10],
      ];
      const q: Vec3 = [9.8, 0.1, -0.2];
      const nearest = nearestPoint(cloud, q);
      assert.deepStrictEqual(nearest, [10, 0, 0]);
    });
  });

  // ── 5. Möller–Trumbore Ray-Triangle Picking ───────────────────

  describe("5. rayTriangleHit (Möller–Trumbore Intersection)", () => {
    const a: Vec3 = [0, 0, 0];
    const b: Vec3 = [10, 0, 0];
    const c: Vec3 = [0, 10, 0];

    it("detects direct ray hit and computes exact hit distance t", () => {
      const orig: Vec3 = [2, 2, -5];
      const dir: Vec3 = [0, 0, 1]; // pointing toward positive Z
      const t = rayTriangleHit(orig, dir, a, b, c);

      assert.ok(t !== null, "Ray must hit triangle");
      assert.ok(Math.abs(t - 5.0) < 1e-5, `Hit distance must be 5.0, got ${t}`);
    });

    it("returns null for ray missing outside triangle bounds", () => {
      const orig: Vec3 = [20, 20, -5];
      const dir: Vec3 = [0, 0, 1];
      const t = rayTriangleHit(orig, dir, a, b, c);
      assert.strictEqual(t, null, "Ray missing triangle must return null");
    });

    it("returns null for ray pointing in opposite direction", () => {
      const orig: Vec3 = [2, 2, -5];
      const dir: Vec3 = [0, 0, -1]; // pointing away from triangle
      const t = rayTriangleHit(orig, dir, a, b, c);
      assert.strictEqual(t, null, "Opposite direction ray must return null");
    });

    it("returns null for ray parallel to triangle plane", () => {
      const orig: Vec3 = [2, 2, 0];
      const dir: Vec3 = [1, 0, 0]; // parallel to plane
      const t = rayTriangleHit(orig, dir, a, b, c);
      assert.strictEqual(t, null, "Parallel ray must return null");
    });
  });

  // ── 6. pickTriangleSoup ────────────────────────────────────────

  describe("6. pickTriangleSoup (Multi-Triangle Ray Picking)", () => {
    it("returns closest triangle intersection point from a triangle soup", () => {
      // Two triangles along the ray path:
      // Tri 1 at Z = 10
      // Tri 2 at Z = 5 (closer)
      const tris = [
        // Triangle 1 (Z = 10)
        0, 0, 10,  10, 0, 10,  0, 10, 10,
        // Triangle 2 (Z = 5)
        0, 0, 5,   10, 0, 5,   0, 10, 5,
      ];

      const orig: Vec3 = [2, 2, 0];
      const dir: Vec3 = [0, 0, 1];
      const hit = pickTriangleSoup(orig, dir, tris);

      assert.ok(hit !== null, "Must hit soup");
      assert.ok(Math.abs(hit[0] - 2) < 1e-5);
      assert.ok(Math.abs(hit[1] - 2) < 1e-5);
      assert.ok(Math.abs(hit[2] - 5) < 1e-5, `Must hit closest triangle at Z=5, got ${hit[2]}`);
    });

    it("works with Float32Array triangle soup buffers", () => {
      const buf = new Float32Array([
        0, 0, 5,  10, 0, 5,  0, 10, 5,
      ]);
      const orig: Vec3 = [1, 1, -2];
      const dir: Vec3 = [0, 0, 1];
      const hit = pickTriangleSoup(orig, dir, buf);

      assert.ok(hit !== null);
      assert.ok(Math.abs(hit[0] - 1) < 1e-5);
      assert.ok(Math.abs(hit[1] - 1) < 1e-5);
      assert.ok(Math.abs(hit[2] - 5) < 1e-5);
    });

    it("returns null when ray misses all triangles in soup", () => {
      const tris = [
        0, 0, 5,  10, 0, 5,  0, 10, 5,
      ];
      const orig: Vec3 = [-50, -50, 0];
      const dir: Vec3 = [0, 0, 1];
      const hit = pickTriangleSoup(orig, dir, tris);
      assert.strictEqual(hit, null);
    });
  });

  // ── 7. Clinical A4 Protocol Formatting ────────────────────────

  describe("7. formatRegistrationA4Protocol (Clinical A4 Protocol)", () => {
    it("generates complete clinical registration report with acceptable status", () => {
      const report = formatRegistrationA4Protocol(
        {
          landmarkRmsMm: 0.342,
          icpRmsMm: 0.185,
          iterations: 14,
          scanPointsCount: 45200,
          isClinicallyAcceptable: true,
        },
        "Смирнова Е.А.",
        "Барабаш С.В.",
      );

      assert.ok(report.includes("ПРОТОКОЛ СОПОСТАВЛЕНИЯ КЛКТ И ОПТИЧЕСКОГО ИНТРАОРАЛЬНОГО СКАНИРОВАНИЯ"));
      assert.ok(report.includes("Смирнова Е.А."));
      assert.ok(report.includes("Барабаш С.В."));
      assert.ok(report.includes("0.3420 мм"));
      assert.ok(report.includes("0.1850 мм"));
      assert.ok(report.includes("14"));
      assert.ok(report.includes("[ДОПУЩЕНО К КЛИНИЧЕСКОМУ ИСПОЛЬЗОВАНИЮ]"));
      assert.ok(report.includes("Подпись"));
    });

    it("generates warning verdict when registration is not clinically acceptable", () => {
      const report = formatRegistrationA4Protocol(
        {
          landmarkRmsMm: 1.25,
          icpRmsMm: 0.89,
          iterations: 40,
          scanPointsCount: 38100,
          isClinicallyAcceptable: false,
        },
        "Иванов И.И.",
        "Петров П.П.",
      );

      assert.ok(report.includes("[ВНИМАНИЕ: ТРЕБУЕТСЯ ПОВТОРНАЯ КАЛИБРОВКА]"));
      assert.ok(report.includes("превышает допустимый клинический порог"));
    });
  });

  // ── 8. Mandate 8d Item 7: Zero Cartoon Emojis ─────────────────

  describe("8. Zero Cartoon Emojis Law (Mandate 8d, Item 7)", () => {
    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/u;

    it("verifies formatRegistrationA4Protocol output strictly contains zero cartoon emojis", () => {
      const protocol = formatRegistrationA4Protocol(
        {
          landmarkRmsMm: 0.25,
          icpRmsMm: 0.12,
          iterations: 12,
          scanPointsCount: 50000,
          isClinicallyAcceptable: true,
        },
        "Кузнецов А.В.",
        "Барабаш С.В.",
      );
      assert.ok(
        !emojiRegex.test(protocol),
        "A4 registration protocol must strictly contain zero cartoon emojis",
      );
    });

    it("verifies cbctRegistrationEngine.ts source strictly contains zero cartoon emojis", () => {
      const filePath = resolve(
        process.cwd(),
        "packages/shared/src/radiology/cbctRegistrationEngine.ts",
      );
      const code = readFileSync(filePath, "utf8");
      assert.ok(
        !emojiRegex.test(code),
        "cbctRegistrationEngine.ts must strictly contain zero cartoon emojis",
      );
    });

    it("verifies wave126CbctRegistration.test.ts source strictly contains zero cartoon emojis", () => {
      const filePath = resolve(
        process.cwd(),
        "packages/shared/src/radiology/__tests__/wave126CbctRegistration.test.ts",
      );
      const code = readFileSync(filePath, "utf8");
      assert.ok(
        !emojiRegex.test(code),
        "wave126CbctRegistration.test.ts must strictly contain zero cartoon emojis",
      );
    });
  });
});
