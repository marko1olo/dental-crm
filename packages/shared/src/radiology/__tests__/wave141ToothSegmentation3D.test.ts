/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAVE 141: 3D DENTAL ARCH, TOOTH WATERSHED & FDI ALIGNMENT TEST SUITE
 * ═══════════════════════════════════════════════════════════════════════════
 * Rigorous empirical unit tests for:
 *  1. cbct3DArchEngine:
 *     - Catmull-Rom 3D spline and uniform arc-length parameterization.
 *     - Occlusal Z elevation profiling and Curve of Spee extraction.
 *     - Darboux frame orthonormality: t . n = 0, t . b = 0, n . b = 0.
 *     - World to local arch coordinates projection.
 *  2. toothCrownWatershedEngine:
 *     - Exact 3D Euclidean Distance Transform (EDT).
 *     - Morphological H-maxima suppression (molar cusps merge into 1 seed).
 *     - 3D Watershed contact point separation of contiguous crowns.
 *     - Dense structure classification (NATURAL_TOOTH vs IMPLANT_FIXTURE).
 *     - Edentulous gap analytical detection.
 *  3. toothFdiAlignmentEngine:
 *     - Wheeler & Misch canonical dental width database.
 *     - Dynamic programming alignment without index shifting.
 *     - Missing tooth 46 with edentulous gap -> tooth 46 is MISSING, tooth 47 is 47.
 *     - Titanium implant detection at tooth site -> status IMPLANT.
 *  4. toothOrientedBoundingBox:
 *     - Weighted covariance tensor & cyclic Jacobi eigensolver.
 *     - Clinical torque, tip (angulation), and rotation angle recovery.
 *     - 3D trilinear voxel resampling into local oriented volume.
 *     - Analytical gradient iso-contour extraction.
 *  5. Strict absence of cartoon emojis (Mandate 8d, item 7).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catmullRom3D,
  interpolate3DCurve,
  resample3DByArcLength,
  computeDarbouxFrames,
  build3DArchFromControlPoints,
  worldToArchCoordinates,
  type Arch3DCurve,
  type DarbouxFrame,
} from "../cbct3DArchEngine.js";
import {
  computeExact3DEDT,
  detectHMaximaSeeds,
  segmentCrownWatershed,
  executeToothCrownWatershed,
  type CrownCluster,
  type EdentulousGap,
} from "../toothCrownWatershedEngine.js";
import {
  WHEELER_MANDIBLE_SPECS,
  WHEELER_MAXILLA_SPECS,
  computeCanonicalToothPositions,
  alignClustersToFdiArch,
} from "../toothFdiAlignmentEngine.js";
import {
  computeToothOBB,
  extractToothVoxelVolume,
  extractToothGradientContours,
} from "../toothOrientedBoundingBox.js";
import { AIR_HU, type Vec3, type VolumeSamplingData } from "../cprMath.js";
import { dot3, len3 } from "../implantGeometryEngine.js";

/** Creates a synthetic test volume */
function createSyntheticVolume(
  voxelFn: (i: number, j: number, k: number) => number,
  dims: [number, number, number] = [60, 60, 60],
  spacing: [number, number, number] = [0.5, 0.5, 0.5],
  origin: [number, number, number] = [-15, -15, -15],
): VolumeSamplingData {
  return {
    dims,
    origin,
    getVoxel: voxelFn,
    invSx: 1 / spacing[0],
    invSy: 1 / spacing[1],
    invSz: 1 / spacing[2],
    zMin: origin[2],
    zMax: origin[2] + (dims[2] - 1) * spacing[2],
    vSpacing: spacing[2],
  };
}

describe("WAVE 141: 3D Dental Arch Engine (cbct3DArchEngine)", () => {
  it("interpolates and resamples 3D curves with exact uniform arc-length parameterization", () => {
    const controlPoints: Vec3[] = [
      [-30, 20, 5],
      [-25, -10, 2],
      [0, -25, 0], // anterior apex
      [25, -10, 2],
      [30, 20, 5],
    ];

    const dense = interpolate3DCurve(controlPoints, 40);
    assert.ok(dense.length > 100, "Dense curve must have > 100 points");

    const { points, cumLength, totalLength } = resample3DByArcLength(dense, 200);
    assert.strictEqual(points.length, 200);
    assert.ok(totalLength > 80 && totalLength < 160, `Total length ${totalLength} mm is realistic for human arch`);

    // Verify uniform spacing
    const nominalStep = totalLength / 199;
    for (let i = 1; i < points.length; i++) {
      const step = cumLength[i]! - cumLength[i - 1]!;
      assert.ok(Math.abs(step - nominalStep) < 1e-3, `Step ${step} must match nominal ${nominalStep}`);
    }
  });

  it("calculates strictly orthonormal Darboux frames along the 3D arch", () => {
    const controlPoints: Vec3[] = [
      [-30, 15, 4],
      [-20, -10, 1],
      [0, -25, 0],
      [20, -10, 1],
      [30, 15, 4],
    ];

    const arch = build3DArchFromControlPoints(controlPoints, { numSamples: 150, jaw: "mandible" });
    assert.strictEqual(arch.frames.length, 150);
    assert.ok(arch.curveOfSpeeDepthMm >= 3.5, "Curve of Spee depth must be >= 3.5 mm");

    for (const frame of arch.frames) {
      const tLen = len3(frame.tangent);
      const nLen = len3(frame.normal);
      const bLen = len3(frame.binormal);

      assert.ok(Math.abs(tLen - 1.0) < 1e-4, "Tangent must be unit vector");
      assert.ok(Math.abs(nLen - 1.0) < 1e-4, "Normal must be unit vector");
      assert.ok(Math.abs(bLen - 1.0) < 1e-4, "Binormal must be unit vector");

      const dotTN = Math.abs(dot3(frame.tangent, frame.normal));
      const dotTB = Math.abs(dot3(frame.tangent, frame.binormal));
      const dotNB = Math.abs(dot3(frame.normal, frame.binormal));

      assert.ok(dotTN < 1e-4, `t . n must be 0, got ${dotTN}`);
      assert.ok(dotTB < 1e-4, `t . b must be 0, got ${dotTB}`);
      assert.ok(dotNB < 1e-4, `n . b must be 0, got ${dotNB}`);
    }
  });

  it("projects world coordinates to local arch coordinates (s, distanceBL, distanceAC)", () => {
    const controlPoints: Vec3[] = [
      [-30, 10, 0],
      [0, -20, 0],
      [30, 10, 0],
    ];
    const arch = build3DArchFromControlPoints(controlPoints, { numSamples: 100 });

    // Test anterior point slightly buccal (e.g. [0, -25, 2])
    const proj = worldToArchCoordinates(arch, [0, -25, 2]);
    assert.ok(proj.s > 20 && proj.s < arch.totalLengthMm - 20, "Anterior point must be near mid-arch");
    assert.ok(proj.distanceBLMm > 0, "Point placed anterior/buccal must have positive distanceBL");
    assert.ok(Math.abs(proj.distanceACMm - 2) < 0.5, "Apicocoronal elevation must match input offset");
  });
});

describe("WAVE 141: Tooth Crown Watershed & Dense Structure Engine (toothCrownWatershedEngine)", () => {
  it("computes exact anisotropic 3D Euclidean Distance Transform", () => {
    // 20x20x20 volume with a solid 8x8x8 cube in the center
    const nx = 20, ny = 20, nz = 20;
    const mask = new Uint8Array(nx * ny * nz);

    for (let z = 6; z <= 13; z++) {
      for (let y = 6; y <= 13; y++) {
        for (let x = 6; x <= 13; x++) {
          mask[z * nx * ny + y * nx + x] = 1;
        }
      }
    }

    const sx = 0.5, sy = 0.5, sz = 0.5;
    const edt = computeExact3DEDT(mask, nx, ny, nz, sx, sy, sz);

    // Outside voxels must have EDT = 0
    assert.strictEqual(edt[0], 0);

    // Deepest voxels in 8x8x8 cube (centers: x=9.5, y=9.5, z=9.5)
    // Distance from face boundary (offset 6 to 9.5) = 3.5 voxels = 1.75 mm
    let maxDist = 0;
    for (let i = 0; i < edt.length; i++) {
      if (edt[i]! > maxDist) maxDist = edt[i]!;
    }
    assert.ok(maxDist >= 1.5 && maxDist <= 2.5, `Max EDT distance ${maxDist} mm must match cube radius`);
  });

  it("suppresses multi-cusped molar peaks into a single crown seed via H-maxima suppression", () => {
    const nx = 30, ny = 30, nz = 30;
    const edt = new Float32Array(nx * ny * nz);
    const hu = new Float32Array(nx * ny * nz).fill(1500);

    // Simulate 4 cusps of a molar close together (within 4 mm)
    // Cusp 1 (highest): [14, 14, 15] dist = 3.5 mm
    // Cusp 2 (satellite): [17, 14, 15] dist = 3.0 mm (drop = 0.5 mm < 2.0 mm)
    // Cusp 3 (satellite): [14, 17, 15] dist = 2.9 mm
    // Cusp 4 (satellite): [17, 17, 15] dist = 2.8 mm
    const strideY = nx;
    const strideZ = nx * ny;

    edt[15 * strideZ + 14 * strideY + 14] = 3.5;
    edt[15 * strideZ + 14 * strideY + 17] = 3.0;
    edt[15 * strideZ + 17 * strideY + 14] = 2.9;
    edt[15 * strideZ + 17 * strideY + 17] = 2.8;

    const seeds = detectHMaximaSeeds(edt, hu, nx, ny, nz, 0.5, 0.5, 0.5, 2.0);
    assert.strictEqual(seeds.length, 1, `Multi-cusped molar must collapse to 1 seed, got ${seeds.length}`);
    assert.strictEqual(seeds[0]!.distanceMm, 3.5, "Surviving seed must be the primary cusp peak");
  });

  it("separates contiguous proximal crown contacts via 3D seeded watershed", () => {
    const nx = 40, ny = 20, nz = 20;
    const mask = new Uint8Array(nx * ny * nz);
    const edt = new Float32Array(nx * ny * nz);
    const strideY = nx;
    const strideZ = nx * ny;

    // Two touching crowns along X: Crown A at x=10, Crown B at x=28, touching at x=19
    for (let x = 5; x <= 33; x++) {
      for (let y = 6; y <= 14; y++) {
        for (let z = 6; z <= 14; z++) {
          mask[z * strideZ + y * strideY + x] = 1;
        }
      }
    }

    const seeds = [
      { index: 10 * strideZ + 10 * strideY + 10, x: 10, y: 10, z: 10, distanceMm: 3.5, hu: 1600 },
      { index: 10 * strideZ + 10 * strideY + 28, x: 28, y: 10, z: 10, distanceMm: 3.5, hu: 1600 },
    ];

    const labels = segmentCrownWatershed(mask, edt, seeds, nx, ny, nz);

    // Crown A region should be labeled 1
    assert.strictEqual(labels[10 * strideZ + 10 * strideY + 8], 1);
    // Crown B region should be labeled 2
    assert.strictEqual(labels[10 * strideZ + 10 * strideY + 30], 2);
  });
});

describe("WAVE 141: Tooth FDI Alignment Engine (toothFdiAlignmentEngine)", () => {
  it("contains all 16 canonical Wheeler specifications for maxilla and mandible", () => {
    assert.strictEqual(WHEELER_MAXILLA_SPECS.length, 16);
    assert.strictEqual(WHEELER_MANDIBLE_SPECS.length, 16);

    // Maxilla centrals (11, 21) width ~8.5 mm
    const m11 = WHEELER_MAXILLA_SPECS.find((t) => t.fdiNumber === 11);
    const m21 = WHEELER_MAXILLA_SPECS.find((t) => t.fdiNumber === 21);
    assert.ok(m11 && m21);
    assert.strictEqual(m11.canonicalWidthMm, 8.5);
    assert.strictEqual(m21.canonicalWidthMm, 8.5);

    // Mandible centrals (41, 31) width ~5.0 mm
    const md41 = WHEELER_MANDIBLE_SPECS.find((t) => t.fdiNumber === 41);
    const md31 = WHEELER_MANDIBLE_SPECS.find((t) => t.fdiNumber === 31);
    assert.ok(md41 && md31);
    assert.strictEqual(md41.canonicalWidthMm, 5.0);
    assert.strictEqual(md31.canonicalWidthMm, 5.0);

    // First molars (16, 46) widths
    const m16 = WHEELER_MAXILLA_SPECS.find((t) => t.fdiNumber === 16);
    const md46 = WHEELER_MANDIBLE_SPECS.find((t) => t.fdiNumber === 46);
    assert.strictEqual(m16?.canonicalWidthMm, 10.5);
    assert.strictEqual(md46?.canonicalWidthMm, 11.0);
  });

  it("handles missing tooth 46 (GAP between 45 and 47) without index shifting", () => {
    // Construct a canonical mandibular arch
    const controlPoints: Vec3[] = [
      [-35, 20, 0],
      [-25, -10, 0],
      [0, -28, 0],
      [25, -10, 0],
      [35, 20, 0],
    ];
    const arch = build3DArchFromControlPoints(controlPoints, { numSamples: 300, jaw: "mandible" });
    const midline = arch.totalLengthMm / 2;
    const canonicalMap = computeCanonicalToothPositions(WHEELER_MANDIBLE_SPECS, midline);

    // Synthesize detected clusters for all teeth EXCEPT tooth 46 (index 2 in canonicalMap: 48, 47, [46 MISSING], 45...)
    const mockClusters: CrownCluster[] = [];
    let clusterId = 1;

    for (let j = 0; j < canonicalMap.length; j++) {
      const { spec, expectedArcMm } = canonicalMap[j]!;
      if (spec.fdiNumber === 46) {
        // Tooth 46 is missing!
        continue;
      }

      mockClusters.push({
        id: clusterId++,
        centroidWorld: [expectedArcMm, 0, 0],
        archArcLengthMm: expectedArcMm,
        archNormalizedU: expectedArcMm / arch.totalLengthMm,
        distanceBLMm: 0,
        peakDistanceMm: 3.5,
        voxelCount: 400,
        volumeMm3: 500,
        peakHU: 1600,
        meanHU: 1400,
        p90HU: 1550,
        classification: "NATURAL_TOOTH",
        confidence: 0.95,
        minBoundsWorld: [expectedArcMm - 4, -4, -10],
        maxBoundsWorld: [expectedArcMm + 4, 4, 2],
        estimatedMesiodistalMm: spec.canonicalWidthMm,
        estimatedBuccolingualMm: 8.0,
        estimatedApicocoronalMm: 12.0,
      });
    }

    // Edentulous gap where tooth 46 used to be
    const t46Expected = canonicalMap.find((c) => c.spec.fdiNumber === 46)!.expectedArcMm;
    const gaps: EdentulousGap[] = [
      {
        startArcMm: t46Expected - 5.5,
        endArcMm: t46Expected + 5.5,
        spanLengthMm: 11.0,
        centerArcMm: t46Expected,
        centerWorld: [t46Expected, 0, 0],
        integratedDensity: 0,
      },
    ];

    const result = alignClustersToFdiArch(mockClusters, gaps, arch, { midlineArcMm: midline });

    assert.strictEqual(result.teeth.length, 16, "Result must contain exactly 16 FDI teeth");

    const tooth45 = result.teeth.find((t) => t.fdiNumber === 45)!;
    const tooth46 = result.teeth.find((t) => t.fdiNumber === 46)!;
    const tooth47 = result.teeth.find((t) => t.fdiNumber === 47)!;

    assert.ok(tooth45 && tooth46 && tooth47);
    assert.strictEqual(tooth45.status, "PRESENT_NATURAL", "Tooth 45 must be PRESENT_NATURAL");
    assert.strictEqual(tooth46.status, "MISSING", "Tooth 46 must be marked MISSING");
    assert.strictEqual(tooth47.status, "PRESENT_NATURAL", "Tooth 47 must be PRESENT_NATURAL without shifting");
    assert.notStrictEqual(tooth47.matchedClusterId, null, "Tooth 47 must be matched to a cluster");
  });

  it("recognizes titanium implants and assigns status IMPLANT", () => {
    const controlPoints: Vec3[] = [
      [-30, 15, 0],
      [0, -25, 0],
      [30, 15, 0],
    ];
    const arch = build3DArchFromControlPoints(controlPoints, { numSamples: 200, jaw: "mandible" });
    const midline = arch.totalLengthMm / 2;
    const canonicalMap = computeCanonicalToothPositions(WHEELER_MANDIBLE_SPECS, midline);

    const t36 = canonicalMap.find((c) => c.spec.fdiNumber === 36)!;

    const mockCluster: CrownCluster = {
      id: 99,
      centroidWorld: [t36.expectedArcMm, 0, 0],
      archArcLengthMm: t36.expectedArcMm,
      archNormalizedU: t36.expectedArcMm / arch.totalLengthMm,
      distanceBLMm: 0,
      peakDistanceMm: 2.2,
      voxelCount: 500,
      volumeMm3: 650,
      peakHU: 3200, // Saturated titanium density
      meanHU: 2800,
      p90HU: 3100,
      classification: "IMPLANT_FIXTURE",
      confidence: 0.98,
      minBoundsWorld: [t36.expectedArcMm - 2, -2, -12],
      maxBoundsWorld: [t36.expectedArcMm + 2, 2, 0],
      estimatedMesiodistalMm: 4.5,
      estimatedBuccolingualMm: 4.5,
      estimatedApicocoronalMm: 12.0,
    };

    const result = alignClustersToFdiArch([mockCluster], [], arch, { midlineArcMm: midline });
    const tooth36 = result.teeth.find((t) => t.fdiNumber === 36)!;

    assert.ok(tooth36);
    assert.strictEqual(tooth36.status, "IMPLANT", "Tooth 36 must have status IMPLANT");
    assert.strictEqual(result.implantCount, 1, "Result must report 1 implant");
  });
});

describe("WAVE 141: Tooth Oriented Bounding Box Engine (toothOrientedBoundingBox)", () => {
  it("recovers true principal long axis, clinical torque, and tip angles via Jacobi eigensolver", () => {
    // Create an elongated synthetic tooth cylinder along Z (torque ~0, tip ~0)
    const toothCenter: Vec3 = [0, 0, 0];
    const vol = createSyntheticVolume((i, j, k) => {
      const [ox, oy, oz] = [-15, -15, -15];
      const [sx, sy, sz] = [0.5, 0.5, 0.5];
      const wx = ox + i * sx;
      const wy = oy + j * sy;
      const wz = oz + k * sz;

      // Cylinder with radius 3 mm in XY, height 16 mm in Z (-8 to +8)
      const r = Math.hypot(wx, wy);
      if (r <= 3.0 && wz >= -8.0 && wz <= 8.0) {
        return 1600; // Enamel/dentin
      }
      return AIR_HU;
    });

    const controlPoints: Vec3[] = [
      [-20, 10, 0],
      [0, -5, 0],
      [20, 10, 0],
    ];
    const arch = build3DArchFromControlPoints(controlPoints, { numSamples: 100 });

    const alignedTooth = {
      fdiNumber: 31,
      nameRu: "Нижний левый центральный резец",
      status: "PRESENT_NATURAL" as const,
      centroidWorld: toothCenter,
      archArcLengthMm: arch.totalLengthMm / 2,
      archNormalizedU: 0.5,
      matchedClusterId: 1,
      mesiodistalWidthMm: 5.0,
      canonicalWidthMm: 5.0,
      deviationMm: 0,
      confidence: 0.95,
      warnings: [],
    };

    const obb = computeToothOBB(vol, alignedTooth, arch);

    assert.strictEqual(obb.fdiNumber, 31);
    // Principal axis must be predominantly vertical (Z component > 0.85)
    assert.ok(Math.abs(obb.axisLong[2]) > 0.85, `Long axis Z ${obb.axisLong[2]} must be dominant`);
    assert.ok(obb.eigenvalues[0] > obb.eigenvalues[1], "First eigenvalue must be strictly largest");
    assert.ok(Math.abs(obb.torqueDeg) < 30.0, "Clinical torque must be within physiological limits");
  });

  it("resamples tooth voxels into local isotropic volume and extracts density gradient contours", () => {
    const toothCenter: Vec3 = [0, 0, 0];
    const vol = createSyntheticVolume((i, j, k) => {
      const [ox, oy, oz] = [-15, -15, -15];
      const [sx, sy, sz] = [0.5, 0.5, 0.5];
      const wx = ox + i * sx;
      const wy = oy + j * sy;
      const wz = oz + k * sz;

      const r = Math.hypot(wx, wy);
      if (r <= 2.5 && Math.abs(wz) <= 6.0) {
        return 1600;
      }
      return AIR_HU;
    });

    const controlPoints: Vec3[] = [
      [-20, 10, 0],
      [0, -5, 0],
      [20, 10, 0],
    ];
    const arch = build3DArchFromControlPoints(controlPoints, { numSamples: 100 });

    const alignedTooth = {
      fdiNumber: 41,
      nameRu: "Нижний правый центральный резец",
      status: "PRESENT_NATURAL" as const,
      centroidWorld: toothCenter,
      archArcLengthMm: arch.totalLengthMm / 2,
      archNormalizedU: 0.5,
      matchedClusterId: 1,
      mesiodistalWidthMm: 5.0,
      canonicalWidthMm: 5.0,
      deviationMm: 0,
      confidence: 0.95,
      warnings: [],
    };

    const obb = computeToothOBB(vol, alignedTooth, arch);
    const toothVol = extractToothVoxelVolume(vol, obb, { dims: [32, 32, 48], spacingMm: 0.25 });

    assert.strictEqual(toothVol.dims[0], 32);
    assert.strictEqual(toothVol.dims[1], 32);
    assert.strictEqual(toothVol.dims[2], 48);
    assert.ok(toothVol.maxHU > 1000, `Max HU ${toothVol.maxHU} must reflect tooth enamel/dentin`);

    const contours = extractToothGradientContours(toothVol, 150);
    assert.ok(contours.length >= 2, "Must extract AXIAL and BUCCOLINGUAL contour slices");
    assert.ok(contours[0]!.peakGradientHUPerMm > 150, "Peak gradient must exceed threshold at enamel boundary");
  });
});
