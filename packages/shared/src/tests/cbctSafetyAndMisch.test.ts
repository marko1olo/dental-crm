import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  // Vector math & distances
  dot3,
  cross3,
  sub3,
  add3,
  len3,
  normalize3,
  distPointToSegment3,
  distSegmentToSegment3,
  distSegmentToPolyline3,
  // Safety evaluation
  DEFAULT_SAFETY_THRESHOLDS,
  evaluateImplantSafety,
  markerClearance,
  neighborClearance,
  // 2D chord strip & plane intersection
  cylinderPlaneStrip,
  implantPlaneStrip,
  radiusProfile,
  sleeveBody,
  drillSegment,
  // Arch curve math
  catmullRom,
  interpolateArchCurve,
  computeCurveNormals,
  totalArcLength,
  resampleByArcLength,
  generateDefaultArchCurve,
  offsetCurve,
  buildUniformCurve,
  // Trilinear & CPR
  AIR_HU,
  trilinear,
  crossSectionFrame,
  computeCrossSection,
  computePanoramicCPR,
  detectArchControlPoints,
  // Misch Bone Density
  classifyBone,
  getMischProfile,
  sampleImplantBoneHU,
  MISCH_BONE_PROFILES,
  type Vec3,
  type Point2,
  type ImplantSeg,
  type VolumeSamplingData,
} from "../radiology/index.js";

// Helper to create a synthetic 3D volume for unit testing
function createTestVolume(
  dims: [number, number, number] = [32, 32, 32],
  voxelValueFn: (i: number, j: number, k: number) => number = () => 0,
): VolumeSamplingData {
  const voxelData = new Float32Array(dims[0] * dims[1] * dims[2]);
  for (let k = 0; k < dims[2]; k++) {
    for (let j = 0; j < dims[1]; j++) {
      for (let i = 0; i < dims[0]; i++) {
        voxelData[k * dims[0] * dims[1] + j * dims[0] + i] = voxelValueFn(i, j, k);
      }
    }
  }

  const spacing = 1.0; // 1 mm per voxel
  return {
    dims,
    origin: [0, 0, 0],
    getVoxel: (i, j, k) => {
      if (i < 0 || i >= dims[0] || j < 0 || j >= dims[1] || k < 0 || k >= dims[2]) {
        return AIR_HU;
      }
      return voxelData[k * dims[0] * dims[1] + j * dims[0] + i] ?? AIR_HU;
    },
    invSx: 1 / spacing,
    invSy: 1 / spacing,
    invSz: 1 / spacing,
    zMin: 0,
    zMax: (dims[2] - 1) * spacing,
    vSpacing: spacing,
  };
}

describe("CBCT 3D Math Suite: Implant Geometry, Safety Engine & Misch Bone Quality", () => {
  // ═══════════════════════════════════════════════════════════════
  // 1. Analytical 3D Distance Primitives (Dan Sunday / Ericson)
  // ═══════════════════════════════════════════════════════════════
  describe("1. Analytical 3D Vector & Distance Primitives", () => {
    it("1.1 Vector primitives: dot3, cross3, sub3, add3, len3, normalize3", () => {
      const a: Vec3 = [1, 2, 3];
      const b: Vec3 = [4, 5, 6];
      assert.equal(dot3(a, b), 4 + 10 + 18);
      assert.deepEqual(cross3([1, 0, 0], [0, 1, 0]), [0, 0, 1]);
      assert.deepEqual(sub3(b, a), [3, 3, 3]);
      assert.deepEqual(add3(a, b), [5, 7, 9]);
      assert.equal(len3([3, 4, 0]), 5);

      const n = normalize3([0, 10, 0]);
      assert.deepEqual(n, [0, 1, 0]);
    });

    it("1.2 distPointToSegment3: point projection inside, before, and after segment", () => {
      const a: Vec3 = [0, 0, 0];
      const b: Vec3 = [0, 10, 0];

      // Point projections inside segment
      assert.equal(distPointToSegment3([5, 5, 0], a, b), 5);
      // Point directly on segment
      assert.equal(distPointToSegment3([0, 3, 0], a, b), 0);
      // Point before entry point a (clamped to a)
      assert.equal(distPointToSegment3([0, -4, 0], a, b), 4);
      // Point beyond apex point b (clamped to b)
      assert.equal(distPointToSegment3([0, 13, 0], a, b), 3);
    });

    it("1.3 distSegmentToSegment3: parallel segments at known clearance", () => {
      // Two 10 mm segments parallel along Z, separated by 4 mm in X
      const s1A: Vec3 = [0, 0, 0];
      const s1B: Vec3 = [0, 0, 10];
      const s2A: Vec3 = [4, 0, 0];
      const s2B: Vec3 = [4, 0, 10];

      const d = distSegmentToSegment3(s1A, s1B, s2A, s2B);
      assert.ok(Math.abs(d - 4.0) < 1e-6, `Expected 4.0 mm, got ${d}`);
    });

    it("1.4 distSegmentToSegment3: orthogonal skew segments", () => {
      // Segment 1 along X at Z=0; Segment 2 along Y at Z=5
      const s1A: Vec3 = [-5, 0, 0];
      const s1B: Vec3 = [5, 0, 0];
      const s2A: Vec3 = [0, -5, 5];
      const s2B: Vec3 = [0, 5, 5];

      const d = distSegmentToSegment3(s1A, s1B, s2A, s2B);
      assert.ok(Math.abs(d - 5.0) < 1e-6, `Expected 5.0 mm, got ${d}`);
    });

    it("1.5 distSegmentToSegment3: intersecting and degenerate segments", () => {
      // Intersecting at [0, 0, 0]
      const d1 = distSegmentToSegment3([-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0]);
      assert.ok(d1 < 1e-6, `Intersecting distance should be 0, got ${d1}`);

      // Point-to-point degenerate segments
      const d2 = distSegmentToSegment3([0, 0, 0], [0, 0, 0], [3, 4, 0], [3, 4, 0]);
      assert.ok(Math.abs(d2 - 5.0) < 1e-6);
    });

    it("1.6 distSegmentToPolyline3: distance to mandibular canal polyline", () => {
      const implantEntry: Vec3 = [10, 0, 20];
      const implantApex: Vec3 = [10, 0, 10]; // 10mm implant along Z

      // IAN nerve polyline running along Y at Z=6
      const nervePoly: Vec3[] = [
        [10, -20, 6],
        [10, 0, 6],
        [10, 20, 6],
      ];

      const dist = distSegmentToPolyline3(implantEntry, implantApex, nervePoly);
      // Distance from apex [10, 0, 10] to nerve point [10, 0, 6] = 4 mm
      assert.ok(Math.abs(dist - 4.0) < 1e-6, `Expected 4.0 mm, got ${dist}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. Implant Safety Evaluation (Mandate 8e: IAN, Sinus, Neighbor)
  // ═══════════════════════════════════════════════════════════════
  describe("2. Implant Safety Clearance Evaluation", () => {
    it("2.1 evaluateImplantSafety: completely safe planned implant (clears all zones)", () => {
      const implant: ImplantSeg = {
        id: "imp_46",
        entry: [15, 0, 20],
        apex: [15, 0, 10], // 10 mm length
        radius: 2.0,       // 4.0 mm diameter
      };

      // Nerve canal at Z=5, tube radius 1.5 mm
      // Centerline dist = 5.0 mm; Surface clearance = 5.0 - 2.0 - 1.5 = 1.5 mm (wait, threshold is 2.0)
      // Let's place nerve at Z=4: Centerline = 6.0 mm; Surface clearance = 6.0 - 2.0 - 1.5 = 2.5 mm >= 2.0 mm (OK)
      const markers = [
        {
          id: "ian_right",
          type: "nerve" as const,
          radius: 1.5,
          points: [[15, -10, 4] as Vec3, [15, 10, 4] as Vec3],
        },
      ];

      // Neighbor implant 8 mm away: Centerline = 8.0 mm; Surface = 8.0 - 2.0 - 2.0 = 4.0 mm >= 3.0 mm (OK)
      const others: ImplantSeg[] = [
        {
          id: "imp_45",
          entry: [23, 0, 20],
          apex: [23, 0, 10],
          radius: 2.0,
        },
      ];

      const res = evaluateImplantSafety(implant, others, markers);
      assert.equal(res.worstOk, true);
      assert.equal(res.neighborOk, true);
      assert.ok(res.neighborMm! >= 3.0);
      assert.equal(res.warnings.length, 0);
    });

    it("2.2 evaluateImplantSafety: IAN nerve violation generates paresthesia warning (< 2.0 mm)", () => {
      const implant: ImplantSeg = {
        id: "imp_36",
        entry: [-15, 0, 20],
        apex: [-15, 0, 10],
        radius: 2.125, // 4.25 mm diameter
      };

      // Nerve canal at Z=8.5 (centerline distance = 1.5 mm to apex)
      // Surface clearance = 1.5 - 2.125 - 1.2 = -1.825 mm (collision!)
      const markers = [
        {
          id: "ian_left",
          type: "nerve" as const,
          radius: 1.2,
          points: [[-15, -10, 8.5] as Vec3, [-15, 10, 8.5] as Vec3],
        },
      ];

      const res = evaluateImplantSafety(implant, [], markers);
      assert.equal(res.worstOk, false);
      assert.equal(res.anatomy[0]!.ok, false);
      assert.ok(res.anatomy[0]!.mm < DEFAULT_SAFETY_THRESHOLDS.nerve);
      assert.ok(res.warnings.some((w) => w.includes("нижнечелюстным каналом") && w.includes("парестезии")));
    });

    it("2.3 evaluateImplantSafety: Maxillary sinus proximity generates sinus lift warning (< 1.0 mm)", () => {
      const implant: ImplantSeg = {
        id: "imp_16",
        entry: [15, 0, 0],
        apex: [15, 0, 10], // Apex pointing up towards sinus (+Z)
        radius: 2.0,
      };

      // Sinus floor at Z=10.5 mm: Centerline = 0.5 mm; Surface = 0.5 - 2.0 - 0 = -1.5 mm
      const markers = [
        {
          id: "sinus_right",
          type: "sinus" as const,
          radius: 0.0,
          points: [[10, 0, 10.5] as Vec3, [20, 0, 10.5] as Vec3],
        },
      ];

      const res = evaluateImplantSafety(implant, [], markers);
      assert.equal(res.worstOk, false);
      assert.equal(res.anatomy[0]!.ok, false);
      assert.ok(res.warnings.some((w) => w.includes("гайморовой пазухи") && w.includes("синус-лифтинг")));
    });

    it("2.4 evaluateImplantSafety: Neighbouring implant clearance (< 3.0 mm) violation", () => {
      const impA: ImplantSeg = { id: "a", entry: [0, 0, 10], apex: [0, 0, 0], radius: 2.0 };
      const impB: ImplantSeg = { id: "b", entry: [5, 0, 10], apex: [5, 0, 0], radius: 2.0 };

      // Distance centerlines = 5 mm; Surface clearance = 5 - 2 - 2 = 1.0 mm (< 3.0 mm required)
      const res = evaluateImplantSafety(impA, [impB], []);
      assert.equal(res.worstOk, false);
      assert.equal(res.neighborOk, false);
      assert.equal(res.closestNeighborId, "b");
      assert.ok(Math.abs(res.neighborMm! - 1.0) < 1e-6);
      assert.ok(res.warnings.some((w) => w.includes("соседнему имплантату")));
    });

    it("2.5 markerClearance & neighborClearance standalone helper functions", () => {
      const clrNerve = markerClearance(
        [0, 0, 10],
        [0, 0, 0],
        2.0,
        [[0, 10, 0], [0, 10, 10]],
        1.5,
        2.0,
      );
      // Center dist = 10; Surface = 10 - 2.0 - 1.5 = 6.5 mm >= 2.0 mm
      assert.equal(clrNerve.ok, true);
      assert.equal(clrNerve.mm, 6.5);

      const clrNeigh = neighborClearance(
        [0, 0, 0], [0, 0, 10], 2.0,
        [3, 0, 0], [3, 0, 10], 2.0,
        3.0,
      );
      // Center dist = 3; Surface = 3 - 2 - 2 = -1.0 mm (collision)
      assert.equal(clrNeigh.ok, false);
      assert.equal(clrNeigh.mm, -1.0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. Cylinder Plane Slicing & Guided Surgery Geometry
  // ═══════════════════════════════════════════════════════════════
  describe("3. 2D Resection Plane Slicing & Guided Surgery Geometry", () => {
    it("3.1 radiusProfile accurately reflects collar, 64% taper and rounded apex", () => {
      // Collar zone (0..0.14)
      assert.equal(radiusProfile(0.0), 1.0);
      assert.equal(radiusProfile(0.14), 1.0);

      // Body taper zone (0.14..0.90)
      const midR = radiusProfile(0.52);
      assert.ok(midR < 1.0 && midR > 0.64);
      assert.ok(Math.abs(radiusProfile(0.90) - 0.64) < 1e-5);

      // Rounded apex dome (0.90..1.00)
      assert.ok(radiusProfile(1.0) < 0.05); // Approaches 0 at very tip
    });

    it("3.2 cylinderPlaneStrip: computes closed 2D polygon with analytical chord formula", () => {
      const implant = {
        entry: [0, 0, 10] as Vec3,
        axis: [0, 0, -1] as Vec3, // Pointing down along Z
        diameter: 4.0,            // R = 2.0 mm
        length: 10.0,
      };

      // Plane slicing through X=0, parallel to Z (eU = [0, 1, 0], eV = [0, 0, 1], normal = [1, 0, 0])
      const plane = {
        origin: [0, 0, 5] as Vec3,
        eU: [0, 1, 0] as Vec3,
        eV: [0, 0, 1] as Vec3,
      };

      const strip = cylinderPlaneStrip(implant, plane);
      assert.ok(strip !== null);
      assert.ok(strip.length > 10, "Strip must be a closed polygon");

      // When plane passes directly through axis center (w = 0), chord half-width hw = sqrt(r^2 - 0) = r = 2.0 mm
      // Check that maximum width in plane matches diameter = 4.0 mm
      let minU = Infinity;
      let maxU = -Infinity;
      for (const [u] of strip) {
        if (u < minU) minU = u;
        if (u > maxU) maxU = u;
      }
      assert.ok(Math.abs(maxU - minU - 4.0) < 0.2, `Expected ~4.0 mm width, got ${maxU - minU}`);
    });

    it("3.3 cylinderPlaneStrip returns null when body does not intersect plane", () => {
      const implant = {
        entry: [10, 0, 10] as Vec3, // 10 mm away in X
        axis: [0, 0, -1] as Vec3,
        diameter: 4.0,              // R = 2.0 mm (reaches only to X=8)
        length: 10.0,
      };
      const plane = {
        origin: [0, 0, 5] as Vec3, // Plane at X=0
        eU: [0, 1, 0] as Vec3,
        eV: [0, 0, 1] as Vec3,
      };

      const strip = cylinderPlaneStrip(implant, plane);
      assert.equal(strip, null);
    });

    it("3.4 implantPlaneStrip works with tapered profile", () => {
      const implant = {
        entry: [0, 0, 10] as Vec3,
        axis: [0, 0, -1] as Vec3,
        diameter: 4.0,
        length: 10.0,
      };
      const plane = {
        origin: [0, 0, 5] as Vec3,
        eU: [0, 1, 0] as Vec3,
        eV: [0, 0, 1] as Vec3,
      };

      const strip = implantPlaneStrip(implant, plane);
      assert.ok(strip !== null);
      assert.ok(strip.length > 20);
    });

    it("3.5 Guided surgery sleeveBody & drillSegment calculations", () => {
      const implant = {
        entry: [0, 0, 10] as Vec3,
        axis: [0, 0, -1] as Vec3,
        diameter: 4.0,
        length: 10.0,
      };
      const sleeve = {
        diameter: 5.0,
        offset: 2.0,  // 2 mm above platform
        height: 4.0,  // 4 mm sleeve height
      };

      const sBody = sleeveBody(implant, sleeve);
      // Sleeve top is offset + height = 6 mm coronal (above) platform (so Z = 10 - (-1)*6 = 16)
      assert.deepEqual(sBody.entry, [0, 0, 16]);
      assert.equal(sBody.diameter, 5.0);
      assert.equal(sBody.length, 4.0);

      const [dStart, dEnd] = drillSegment(implant, sleeve, 12.0);
      assert.deepEqual(dStart, [0, 0, 16]);
      assert.deepEqual(dEnd, [0, 0, -2]); // 10 + (-1)*12 = -2
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. Misch Bone Quality Classification & 3D Sampling
  // ═══════════════════════════════════════════════════════════════
  describe("4. Misch Bone Density & Osteotomy Bed 3D Sampler", () => {
    it("4.1 classifyBone: strict adherence to Misch reference ranges", () => {
      assert.equal(classifyBone(1400), "D1");
      assert.equal(classifyBone(1251), "D1");
      assert.equal(classifyBone(1250), "D2");
      assert.equal(classifyBone(850), "D2");
      assert.equal(classifyBone(849), "D3");
      assert.equal(classifyBone(350), "D3");
      assert.equal(classifyBone(349), "D4");
      assert.equal(classifyBone(150), "D4");
      assert.equal(classifyBone(149), "D5");
      assert.equal(classifyBone(0), "D5");
      assert.equal(classifyBone(-50), "D5");
    });

    it("4.2 getMischProfile returns comprehensive clinical protocols", () => {
      const pD1 = getMischProfile("D1");
      assert.ok(pD1.corticalDescription.includes("кость дуба"));
      assert.ok(pD1.drillingProtocol.includes("метчиком"));

      const pD3 = getMischProfile(500); // Should resolve D3
      assert.equal(pD3.boneClass, "D3");
      assert.ok(pD3.drillingProtocol.includes("under-drilling"));

      const pD4 = getMischProfile("D4");
      assert.ok(pD4.drillingProtocol.includes("Остеотомический"));
    });

    it("4.3 sampleImplantBoneHU: 3D osteotomy bed sampling in synthetic volume", () => {
      // Create volume where bone density is 1000 HU (Misch D2)
      const vol = createTestVolume([20, 20, 20], () => 1000);

      const entry: Vec3 = [10, 10, 15];
      const apex: Vec3 = [10, 10, 5]; // 10 mm length along Z
      const radius = 2.0;

      const sample = sampleImplantBoneHU(vol, entry, apex, radius, 12, 4);
      assert.ok(sample !== null);
      assert.equal(sample.meanHU, 1000);
      assert.equal(sample.bone, "D2");
      // 13 axial levels (0..12) * (1 center + 4 radial = 5) = 65 samples
      assert.equal(sample.samples, 65);
      assert.equal(sample.minHU, 1000);
      assert.equal(sample.maxHU, 1000);
      assert.equal(sample.stdDevHU, 0);
      assert.equal(sample.profile?.boneClass, "D2");
    });

    it("4.4 sampleImplantBoneHU: correctly classifies D1 dense bone", () => {
      const vol = createTestVolume([20, 20, 20], () => 1600); // 1600 HU
      const sample = sampleImplantBoneHU(vol, [10, 10, 15], [10, 10, 5], 2.0);
      assert.ok(sample !== null);
      assert.equal(sample.bone, "D1");
      assert.equal(sample.meanHU, 1600);
    });

    it("4.5 sampleImplantBoneHU returns null for out-of-volume or degenerate implants", () => {
      const vol = createTestVolume([10, 10, 10], () => 500);

      // Out of volume
      const sampleOut = sampleImplantBoneHU(vol, [100, 100, 100], [100, 100, 110], 2.0);
      assert.equal(sampleOut, null);

      // Zero-length implant
      const sampleZero = sampleImplantBoneHU(vol, [5, 5, 5], [5, 5, 5], 2.0);
      assert.equal(sampleZero, null);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. Panoramic CPR & Dental Arch Math
  // ═══════════════════════════════════════════════════════════════
  describe("5. Panoramic CPR & Dental Arch Curve Math", () => {
    it("5.1 catmullRom interpolates endpoints and midpoints smoothly", () => {
      const p0: Point2 = [0, 0];
      const p1: Point2 = [1, 0];
      const p2: Point2 = [2, 1];
      const p3: Point2 = [3, 1];

      const start = catmullRom(p0, p1, p2, p3, 0.0);
      assert.ok(Math.abs(start[0] - 1.0) < 1e-6);
      assert.ok(Math.abs(start[1] - 0.0) < 1e-6);

      const end = catmullRom(p0, p1, p2, p3, 1.0);
      assert.ok(Math.abs(end[0] - 2.0) < 1e-6);
      assert.ok(Math.abs(end[1] - 1.0) < 1e-6);
    });

    it("5.2 totalArcLength & resampleByArcLength: uniform point spacing", () => {
      // Straight line from [0, 0] to [10, 0]
      const line: Point2[] = [[0, 0], [10, 0]];
      assert.equal(totalArcLength(line), 10);

      const resampled = resampleByArcLength(line, 11); // 11 points = 1 mm intervals
      assert.equal(resampled.length, 11);
      assert.deepEqual(resampled[0], [0, 0]);
      assert.deepEqual(resampled[10], [10, 0]);
      assert.ok(Math.abs(resampled[5]![0] - 5.0) < 1e-5);
    });

    it("5.3 computeCurveNormals produces orthogonal unit vectors", () => {
      // Horizontal line along +X: normal must point along +Y or -Y
      const line: Point2[] = [[0, 0], [5, 0], [10, 0]];
      const normals = computeCurveNormals(line);
      assert.equal(normals.length, 3);

      for (const [nx, ny] of normals) {
        const len = Math.hypot(nx, ny);
        assert.ok(Math.abs(len - 1.0) < 1e-6);
        assert.ok(Math.abs(nx) < 1e-6, "Horizontal tangent must have zero normal X");
      }
    });

    it("5.4 generateDefaultArchCurve creates 9 control points in anatomical U-shape", () => {
      const cps = generateDefaultArchCurve([100, 100], [100, 100]);
      assert.equal(cps.length, 9);
      // Incisors (index 4) should be most anterior (-Y in LPS)
      const incisors = cps[4]!;
      for (let i = 0; i < 9; i++) {
        if (i !== 4) {
          assert.ok(incisors[1] <= cps[i]![1], "Incisor Y must be most anterior");
        }
      }
    });

    it("5.5 trilinear interpolation with internal points and air sentinel", () => {
      const vol = createTestVolume([10, 10, 10], (i, j, k) => (i + j + k) * 100);

      // Integer voxel coordinate [2, 2, 2]: (2+2+2)*100 = 600
      const vNode = trilinear(vol.getVoxel, vol.dims, 2, 2, 2);
      assert.equal(vNode, 600);

      // Mid-voxel [2.5, 2.5, 2.5]: exact average of adjacent voxels
      const vMid = trilinear(vol.getVoxel, vol.dims, 2.5, 2.5, 2.5);
      assert.ok(Math.abs(vMid - 750) < 1e-4);

      // Outside volume: air sentinel
      const vOut = trilinear(vol.getVoxel, vol.dims, -2, 5, 5);
      assert.equal(vOut, AIR_HU);
    });

    it("5.6 crossSectionFrame clamps dynamic tilt within ±30 degrees", () => {
      const cps: Point2[] = [[0, 20], [10, 0], [20, 20]];

      // Normal tilt: 15 degrees
      const f1 = crossSectionFrame(cps, 0.5, 15, 0, 30);
      assert.ok(f1 !== null);

      // Extreme tilt: 60 degrees -> clamped to 30 degrees
      const f2 = crossSectionFrame(cps, 0.5, 60, 0, 30);
      assert.ok(f2 !== null);
      // At tilt 30 deg, cosT = cos(30°) ≈ 0.866
      assert.ok(Math.abs(f2.eV[2] - Math.cos((30 * Math.PI) / 180)) < 1e-4);
    });

    it("5.7 computeCrossSection produces valid pixel data matrix", () => {
      const vol = createTestVolume([30, 30, 30], () => 800);
      const cps: Point2[] = [[5, 25], [15, 5], [25, 25]];

      const res = computeCrossSection(vol, {
        controlPoints: cps,
        position: 0.5,
        tiltDeg: 0,
        widthMm: 20,
        resolution: 1.0,
      });

      assert.ok(res !== null);
      assert.equal(res.width, 20);
      assert.equal(res.height, Math.round((vol.zMax - vol.zMin) / vol.vSpacing));
      // Central voxel on the arch curve inside the volume should be 800
      const centerIdx = Math.floor(res.height / 2) * res.width + Math.floor(res.width / 2);
      assert.equal(res.pixelData[centerIdx], 800);
    });

    it("5.8 computePanoramicCPR produces volumetric reconstructed slice", () => {
      const vol = createTestVolume([30, 30, 20], () => 750);
      const cps: Point2[] = [[5, 25], [15, 5], [25, 25]];

      const res = computePanoramicCPR(vol, {
        controlPoints: cps,
        slabWidthMm: 5.0,
        projection: "MIP",
        resolutionMm: 1.0,
      });

      assert.ok(res !== null);
      assert.ok(res.width > 20);
      assert.equal(res.height, Math.round((vol.zMax - vol.zMin) / vol.vSpacing));
      assert.equal(res.pixelData.length, res.width * res.height);
      assert.equal(res.pixelData[0], 750);
    });

    it("5.9 detectArchControlPoints detects arch in volume with dense bone", () => {
      // Create volume with U-shaped bone (>400 HU)
      const vol = createTestVolume([40, 40, 10], (i, j) => {
        // Simple U-shape: distance from center arc
        const dx = i - 20;
        const dy = j - 20;
        const dist = Math.hypot(dx, dy);
        if (dist >= 10 && dist <= 14 && j <= 26) {
          return 800; // Cortical bone
        }
        return -500; // Soft tissue / air
      });

      const cps = detectArchControlPoints(vol, {
        slabHalfMm: 4,
        boneThreshold: 400,
        numControlPoints: 9,
      });

      assert.ok(cps !== null);
      assert.equal(cps.length, 9);
    });

    it("5.10 detectArchControlPoints returns null when no bone exists", () => {
      const emptyVol = createTestVolume([30, 30, 10], () => -800); // All air/soft tissue
      const cps = detectArchControlPoints(emptyVol, { boneThreshold: 400 });
      assert.equal(cps, null);
    });
  });
});
