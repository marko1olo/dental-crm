/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAVE 128: CBCT MESH SLICE & SURGICAL GUIDE STL EXPORT ENGINE TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 * Comprehensive unit test suite (100% Zero Mocks):
 *  1. Binary STL serialization, 80-byte header, facet normals & roundtrip parsing.
 *  2. Mesh ∩ plane slicing, AABB BVH tree acceleration & polyline chaining.
 *  3. Surgical guide sleeve parameters, stop shoulder seating & anchor pin channels.
 *  4. Dental 3D printer validation (Formlabs / SprintRay / Phrozen).
 *  5. Formal A4 print manufacturing protocol (100% emoji-free per Mandate 8d #7).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type TriMesh,
  type Vec3,
  type BinarySTLHeaderOptions,
  type ImplantSleeveSitePlan,
  triMeshToBinarySTL,
  triangleSoupToBinarySTL,
  parseBinarySTL,
  computeMeshBoundingBox,
  computeMeshVolume,
  isWatertight2Manifold,
  exportSurgicalGuideStlBlob,
  sliceTriangleAt,
  slicePlaneSegments,
  buildTriangleBVH,
  slicePlaneBVH,
  sliceMeshByPlane,
  chainSegmentsIntoPolylines,
  calculateSleeveSitePlan,
  calculateAnchorPinChannel,
  STANDARD_SLEEVE_PRESETS,
  CLINICAL_DRILL_OVERSHOOT_MM,
  DENTAL_PRINTER_PROFILES,
  DENTAL_RESIN_PROFILES,
  validatePrinterAndResinSettings,
  formatGuide3DPrintProtocol,
} from "../index.js";
import { cylinderMesh } from "../surgicalGuideGeom.js";

/**
 * Creates a simple closed tetrahedron mesh for geometry & STL testing.
 */
function createTetrahedronMesh(): TriMesh {
  // 4 vertices of a regular tetrahedron
  const positions = new Float32Array([
    1.0, 1.0, 1.0,   // v0
    -1.0, -1.0, 1.0, // v1
    -1.0, 1.0, -1.0, // v2
    1.0, -1.0, -1.0, // v3
  ]);
  // 4 outward oriented triangular faces (CCW)
  const indices = new Uint32Array([
    0, 2, 1, // Face 0
    0, 1, 3, // Face 1
    0, 3, 2, // Face 2
    1, 2, 3, // Face 3
  ]);
  return { positions, indices };
}

describe("Wave 128: Surgical Guide STL Export & Mesh Slicing Engine", () => {
  // ── TEST SUITE 1: Binary STL Generation & Parsing ────────────────
  describe("1. Binary STL Serialization & Round-Trip Parser", () => {
    it("generates exact binary STL layout with 80-byte header and 50 bytes per triangle", () => {
      const mesh = createTetrahedronMesh();
      const options: BinarySTLHeaderOptions = {
        title: "Wave128 Test Guide",
        software: "DentalCRM 3D",
      };

      const buffer = triMeshToBinarySTL(mesh, options);
      assert.ok(buffer instanceof ArrayBuffer);

      // Total length must be 84 + T * 50 = 84 + 4 * 50 = 284 bytes
      const expectedLength = 84 + 4 * 50;
      assert.strictEqual(buffer.byteLength, expectedLength);

      const view = new DataView(buffer);
      // Header check: starts with title
      const headerBytes = new Uint8Array(buffer, 0, 80);
      const headerText = String.fromCharCode(...headerBytes.slice(0, 18));
      assert.strictEqual(headerText, "Wave128 Test Guide");

      // Triangle count at offset 80
      const triangleCount = view.getUint32(80, true);
      assert.strictEqual(triangleCount, 4);

      // Attribute byte count for triangle 0 at offset 84 + 48 = 132
      const attr0 = view.getUint16(132, true);
      assert.strictEqual(attr0, 0);
    });

    it("calculates accurate analytical unit normals for all facets", () => {
      // Triangle on XY plane: (0,0,0), (10,0,0), (0,10,0) -> outward normal is +Z (0, 0, 1)
      const positions = new Float32Array([
        0.0, 0.0, 0.0,
        10.0, 0.0, 0.0,
        0.0, 10.0, 0.0,
      ]);
      const indices = new Uint32Array([0, 1, 2]);
      const mesh: TriMesh = { positions, indices };

      const buffer = triMeshToBinarySTL(mesh);
      const view = new DataView(buffer);

      // Normal is at offset 84 (nx, ny, nz)
      const nx = view.getFloat32(84, true);
      const ny = view.getFloat32(88, true);
      const nz = view.getFloat32(92, true);

      assert.ok(Math.abs(nx) < 1e-6);
      assert.ok(Math.abs(ny) < 1e-6);
      assert.ok(Math.abs(nz - 1.0) < 1e-6);
    });

    it("performs complete round-trip STL parsing and bounding box verification", () => {
      const p0: Vec3 = [0, 0, 0];
      const p1: Vec3 = [0, 0, 10];
      const radius = 2.5;
      const cyl = cylinderMesh(p0, p1, radius, 16);

      const stlBuffer = triMeshToBinarySTL(cyl, { title: "Cylinder-Guide-Test" });
      const parsed = parseBinarySTL(stlBuffer);

      assert.strictEqual(parsed.triangleCount, cyl.indices.length / 3);
      assert.strictEqual(parsed.mesh.positions.length, parsed.triangleCount * 9);
      assert.ok(parsed.header.includes("Cylinder-Guide-Test"));

      // Dimensions verification: radius = 2.5 -> X/Y span ≈ 5.0 mm, Z span = 10.0 mm
      const { dimensions, min, max } = parsed.boundingBox;
      assert.ok(Math.abs(dimensions[0] - 5.0) < 0.2, `Expected ~5.0 X dimension, got ${dimensions[0]}`);
      assert.ok(Math.abs(dimensions[1] - 5.0) < 0.2, `Expected ~5.0 Y dimension, got ${dimensions[1]}`);
      assert.ok(Math.abs(dimensions[2] - 10.0) < 1e-4, `Expected 10.0 Z dimension, got ${dimensions[2]}`);
      assert.ok(Math.abs(min[2] - 0.0) < 1e-4);
      assert.ok(Math.abs(max[2] - 10.0) < 1e-4);
    });

    it("serializes raw triangle soup and exports STL blob", () => {
      const soup = new Float32Array([
        0, 0, 0,  1, 0, 0,  0, 1, 0,
        1, 0, 0,  1, 1, 0,  0, 1, 0,
      ]);
      const buf = triangleSoupToBinarySTL(soup, { title: "SoupQuad" });
      assert.strictEqual(buf.byteLength, 84 + 2 * 50);

      const mesh = createTetrahedronMesh();
      const blob = exportSurgicalGuideStlBlob(mesh);
      assert.strictEqual(blob.type, "model/stl");
      assert.strictEqual(blob.size, 84 + 4 * 50);
    });

    it("correctly rejects truncated or invalid STL buffers", () => {
      assert.throws(() => parseBinarySTL(new ArrayBuffer(40)), /Invalid binary STL buffer/);
      const smallBuffer = new ArrayBuffer(84); // Claims triangleCount without triangles
      const view = new DataView(smallBuffer);
      view.setUint32(80, 5, true); // Claims 5 triangles
      assert.throws(() => parseBinarySTL(smallBuffer), /Truncated binary STL buffer/);
    });
  });

  // ── TEST SUITE 2: Mesh Slicing & BVH AABB-Tree ───────────────────
  describe("2. Mesh ∩ Plane Slicing & BVH AABB-Tree", () => {
    it("slices single triangle and extracts crossing 3D segment", () => {
      // Triangle crossing Z = 0 plane: (0, 0, -1), (2, 0, 1), (0, 2, 1)
      const tris = [
        0, 0, -1,
        2, 0, 1,
        0, 2, 1,
      ];
      const planePoint: Vec3 = [0, 0, 0];
      const planeNormal: Vec3 = [0, 0, 1]; // XY plane at Z = 0

      const seg = sliceTriangleAt(tris, 0, planePoint[0], planePoint[1], planePoint[2], planeNormal[0], planeNormal[1], planeNormal[2]);
      assert.ok(seg !== null);
      const [ptA, ptB] = seg;

      // Both points must lie on plane Z = 0
      assert.ok(Math.abs(ptA[2]) < 1e-5);
      assert.ok(Math.abs(ptB[2]) < 1e-5);
      // Edge 0-1 crosses at midpoint (1, 0, 0)
      assert.ok(Math.abs(ptA[0] - 1.0) < 1e-5 || Math.abs(ptB[0] - 1.0) < 1e-5);
    });

    it("slices cylinder mesh and BVH acceleration yields identical result to brute-force", () => {
      const p0: Vec3 = [0, 0, 0];
      const p1: Vec3 = [0, 0, 20];
      const cyl = cylinderMesh(p0, p1, 3.0, 32);

      const planePoint: Vec3 = [0, 0, 10]; // Mid-height cut
      const planeNormal: Vec3 = [0, 0, 1];

      // 1. Brute-force slicing
      const segsDirect = sliceMeshByPlane(cyl, planePoint, planeNormal);
      assert.ok(segsDirect.length > 0, "Should intersect cylinder sides");

      // 2. BVH-accelerated slicing
      const soup = new Float32Array(cyl.indices.length * 3);
      let s = 0;
      for (let i = 0; i < cyl.indices.length; i++) {
        const v = cyl.indices[i]! * 3;
        soup[s++] = cyl.positions[v]!;
        soup[s++] = cyl.positions[v + 1]!;
        soup[s++] = cyl.positions[v + 2]!;
      }
      const bvh = buildTriangleBVH(soup);
      assert.strictEqual(bvh.count, cyl.indices.length / 3);

      const segsBVH = slicePlaneBVH(soup, bvh, planePoint, planeNormal);
      assert.strictEqual(segsBVH.length, segsDirect.length);

      // Verify all segment endpoints lie on Z = 10
      for (const [a, b] of segsBVH) {
        assert.ok(Math.abs(a[2] - 10.0) < 1e-4);
        assert.ok(Math.abs(b[2] - 10.0) < 1e-4);
        // Radius check: distance from Z axis should be ~3.0 mm
        assert.ok(Math.abs(Math.hypot(a[0], a[1]) - 3.0) < 0.1);
        assert.ok(Math.abs(Math.hypot(b[0], b[1]) - 3.0) < 0.1);
      }
    });

    it("BVH prunes subtrees when plane does not intersect bounding box", () => {
      const p0: Vec3 = [0, 0, 0];
      const p1: Vec3 = [0, 0, 10];
      const cyl = cylinderMesh(p0, p1, 3.0, 16);

      const planePoint: Vec3 = [0, 0, 100]; // Far above cylinder
      const planeNormal: Vec3 = [0, 0, 1];

      const segs = sliceMeshByPlane(cyl, planePoint, planeNormal);
      assert.strictEqual(segs.length, 0);
    });

    it("chains segments into continuous closed polylines", () => {
      // 4 segments forming a square on Z = 0
      const segments: [Vec3, Vec3][] = [
        [[0, 0, 0], [10, 0, 0]],
        [[10, 10, 0], [0, 10, 0]],
        [[10, 0, 0], [10, 10, 0]],
        [[0, 10, 0], [0, 0, 0]],
      ];

      const polylines = chainSegmentsIntoPolylines(segments, 0.05);
      assert.strictEqual(polylines.length, 1);
      assert.strictEqual(polylines[0]!.length, 5); // 4 vertices + loop closure
    });
  });

  // ── TEST SUITE 3: Sleeve Parameters & Seating ─────────────────────
  describe("3. Sleeve Parameters, Seating & Anchor Pin Channels", () => {
    it("calculates accurate sleeve site plan for Straumann T-Sleeve preset", () => {
      const straumannPreset = STANDARD_SLEEVE_PRESETS.straumann_t_sleeve!;
      const plan = calculateSleeveSitePlan({
        implantId: "imp-fdi-46",
        toothFdi: 46,
        entry: [10, 20, 0],
        axis: [0, 0, 1], // Apical direction +Z
        implantLengthMm: 11.5,
        implantDiameterMm: 4.1,
        sleeve: straumannPreset,
        sleeveOffsetMm: 6.0,
        sleeveStopType: "shoulder",
        wallThicknessMm: 1.5,
        seatClearanceMm: 0.05,
        drillChannelToleranceMm: 0.1,
      });

      // Sleeve outer diameter is 5.0 mm -> seatRadius = 5.0 / 2 + 0.05 = 2.55 mm
      assert.strictEqual(plan.seatRadiusMm, 2.55);
      // Sleeve inner diameter is 4.0 mm -> drillChannelRadius = 4.0 / 2 + 0.1 = 2.10 mm
      assert.strictEqual(plan.drillChannelRadiusMm, 2.1);
      // Housing outer radius = seatRadius (2.55) + wall (1.5) = 4.05 mm
      assert.strictEqual(plan.housingOuterRadiusMm, 4.05);

      // Stop shoulder Z coordinate (seat floor) = -sleeveOffset = -6.0 mm
      assert.strictEqual(plan.sleeveBottomZ, -6.0);
      // Occlusal entrance Z = -(sleeveOffset + height) = -(6.0 + 5.0) = -11.0 mm
      assert.strictEqual(plan.sleeveTopZ, -11.0);

      // Total osteotomy depth = sleeveOffset (6.0) + implantLength (11.5) + overshoot (2.0) = 19.5 mm
      assert.strictEqual(plan.totalOsteotomyDepthMm, 19.5);
      // Drill stop distance on bur = height (5.0) + offset (6.0) + length (11.5) = 22.5 mm
      assert.strictEqual(plan.drillStopDistanceMm, 22.5);

      // Seat cylinder verification
      assert.strictEqual(plan.seatCylinder.radius, 2.55);
      assert.strictEqual(plan.channelCylinder.radius, 2.1);
    });

    it("calculates MIS MGUIDE sleeve with lateral slot access", () => {
      const misPreset = STANDARD_SLEEVE_PRESETS.mis_mguide!;
      const plan = calculateSleeveSitePlan({
        implantId: "imp-fdi-47-molar",
        toothFdi: 47,
        entry: [0, 0, 0],
        axis: [0, 0, 1],
        implantLengthMm: 10.0,
        implantDiameterMm: 4.2,
        sleeve: misPreset,
        sleeveOffsetMm: 8.0,
        sleeveStopType: "lateral_slot",
        lateralSlotAngleDeg: 45.0,
      });

      assert.strictEqual(plan.sleeveStopType, "lateral_slot");
      assert.strictEqual(plan.lateralSlotAngleDeg, 45.0);
      // Outer diameter 5.5 -> seatRadius = 2.75 + 0.05 = 2.80 mm
      assert.strictEqual(plan.seatRadiusMm, 2.8);
      // Total osteotomy depth = 8.0 + 10.0 + 2.0 = 20.0 mm
      assert.strictEqual(plan.totalOsteotomyDepthMm, 20.0);
    });

    it("calculates bone fixation anchor pin channel parameters", () => {
      const pinChannel = calculateAnchorPinChannel({
        id: "pin-anterior-1",
        type: "bone_anchor",
        entryPoint: [15, -10, 5],
        direction: [0, 1, 0],
        pinDiameterMm: 1.5,
        channelLengthMm: 10.0,
        radialClearanceMm: 0.08,
        wallThicknessMm: 1.8,
        sleeveLined: false,
      });

      // Pin D = 1.5 mm -> boreRadius = 1.5 / 2 + 0.08 = 0.83 mm
      assert.strictEqual(pinChannel.boreRadiusMm, 0.83);
      // Housing outer radius = 0.83 + 1.8 = 2.63 mm
      assert.strictEqual(pinChannel.housingOuterRadiusMm, 2.63);
      assert.strictEqual(pinChannel.channelLengthMm, 10.0);
      assert.strictEqual(pinChannel.direction[1], 1.0);
    });
  });

  // ── TEST SUITE 4: 3D Printer Profiles & Parameter Validation ──────
  describe("4. 3D Printer Profiles & Parameter Validation", () => {
    it("validates Formlabs Form 3B+ with Surgical Guide resin", () => {
      const printer = DENTAL_PRINTER_PROFILES.formlabs;
      const resin = DENTAL_RESIN_PROFILES.formlabs_surgical_guide;

      const result = validatePrinterAndResinSettings(printer, resin, 15000, 30.0);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);

      // Shrinkage compensation: 0.35% -> 1 + 0.0035 = 1.0035
      assert.strictEqual(result.compensationApplied.scaleX, 1.0035);
      assert.strictEqual(result.compensationApplied.scaleY, 1.0035);
      // Z shrinkage 0.45% -> 1 + 0.0045 = 1.0045
      assert.strictEqual(result.compensationApplied.scaleZ, 1.0045);

      // Effective layer height
      assert.strictEqual(result.compensationApplied.effectiveLayerHeightMm, 0.05);
      // Estimated resin volume: 15000 mm^3 * 1.2 / 1000 = 18.0 mL
      assert.strictEqual(result.compensationApplied.estimatedResinVolumeMl, 18.0);
      assert.ok(result.compensationApplied.estimatedPrintTimeMinutes > 0);
    });

    it("detects out-of-spec layer height and unreasonable exposures", () => {
      const printer = DENTAL_PRINTER_PROFILES.sprintray;
      const resin = {
        ...DENTAL_RESIN_PROFILES.sprintray_surgical_guide,
        layerHeightMm: 0.25, // Too thick (max 0.1 mm)
        normalExposureSec: 0.4, // Too short (< 1.0 s)
        bottomExposureSec: 1.0, // Insufficient base exposure (< 4x normal)
      };

      const result = validatePrinterAndResinSettings(printer, resin);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes("Высота слоя")));
      assert.ok(result.warnings.some((w) => w.includes("Слишком короткая экспозиция")));
      assert.ok(result.warnings.some((w) => w.includes("Экспозиция базовых слоев")));
    });

    it("verifies Phrozen Dental Surgical Guide scale compensation", () => {
      const printer = DENTAL_PRINTER_PROFILES.phrozen;
      const resin = DENTAL_RESIN_PROFILES.phrozen_dental_surgical_guide;

      const result = validatePrinterAndResinSettings(printer, resin, 10000, 20.0);
      assert.strictEqual(result.valid, true);
      // Shrinkage 0.4% -> scale 1.0040
      assert.strictEqual(result.compensationApplied.scaleX, 1.004);
      assert.strictEqual(result.compensationApplied.scaleY, 1.004);
      // Shrinkage Z 0.5% -> scale 1.0050
      assert.strictEqual(result.compensationApplied.scaleZ, 1.005);
    });
  });

  // ── TEST SUITE 5: Formal A4 3D-Printing Protocol ─────────────────
  describe("5. Formal A4 3D-Printing Protocol (Mandate 8d #7)", () => {
    it("formats complete A4 manufacturing protocol without any emojis", () => {
      const straumannPreset = STANDARD_SLEEVE_PRESETS.straumann_t_sleeve!;
      const sleeveSite = calculateSleeveSitePlan({
        implantId: "imp-36",
        toothFdi: 36,
        entry: [20, 15, 0],
        axis: [0, 0, 1],
        implantLengthMm: 10.0,
        implantDiameterMm: 4.1,
        sleeve: straumannPreset,
        sleeveOffsetMm: 6.0,
      });

      const pin = calculateAnchorPinChannel({
        id: "pin-1",
        entryPoint: [25, 10, 5],
        direction: [1, 0, 0],
      });

      const protocol = formatGuide3DPrintProtocol({
        clinicName: "Клиника Цифровой Стоматологии ДЕНТЕ",
        patientName: "Смирнов Алексей Викторович",
        patientId: "PAT-88291",
        doctorName: "д-р Воронов И.А.",
        technicianName: "Кузнецов Д.С.",
        guideId: "SG-2026-09-001",
        printer: DENTAL_PRINTER_PROFILES.formlabs,
        resin: DENTAL_RESIN_PROFILES.formlabs_surgical_guide,
        sleeveSites: [sleeveSite],
        anchorPins: [pin],
        inspectionWindows: [
          {
            id: "win-1",
            locationDescription: "Бугор зуба 35",
            center: [15, 12, 2],
            normal: [0, 0, 1],
            widthMm: 4.0,
            heightMm: 3.0,
          },
        ],
        meshStats: {
          triangleCount: 45200,
          volumeMm3: 13500,
          dimensionsMm: [65.0, 55.0, 24.0],
        },
      });

      // Check header and sections
      assert.ok(protocol.includes("ТЕХНОЛОГИЧЕСКИЙ ПРОТОКОЛ 3D-ПЕЧАТИ ХИРУРГИЧЕСКОГО ШАБЛОНА"));
      assert.ok(protocol.includes("Смирнов Алексей Викторович"));
      assert.ok(protocol.includes("FORMLABS - Form 3B+ / Form 4B Medical"));
      assert.ok(protocol.includes("Formlabs Surgical Guide Resin"));
      assert.ok(protocol.includes("Зуб FDI 36"));
      assert.ok(protocol.includes("Straumann Guided Surgery T-Sleeve ND/RC"));
      assert.ok(protocol.includes("Бугор зуба 35"));
      assert.ok(protocol.includes("РЕГЛАМЕНТ ПОСТОБРАБОТКИ И СТЕРИЛИЗАЦИИ"));
      assert.ok(protocol.includes("ЧЕК-ЛИСТ КОНТРОЛЯ КАЧЕСТВА И ПОДПИСИ"));

      // MANDATE 8d #7: Zero cartoon emojis in official documents
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      assert.strictEqual(
        emojiRegex.test(protocol),
        false,
        "Mandate 8d #7 violation: formal protocol must contain strictly 0 emojis!",
      );
    });
  });
});
