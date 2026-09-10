import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type TriMesh,
  type Vec3,
  MeshBuilder,
  cylinderMesh,
  sweptBarMesh,
  planSleeveSeat,
  meshVolume,
  isClosedOriented,
  MIN_WALL_MM,
  MIN_DRILL_MM,
  DRILL_OVERSHOOT_MM,
  DEFAULT_SURGICAL_GUIDE_PARAMS,
  validateSurgicalGuidePlan,
  type SurgicalGuideCheckImplant,
  type SurgicalGuideParams,
  type SurgicalGuideAnatomyMarker,
  triMeshToBinarySTL,
  exportSurgicalGuideStlBlob,
} from "../index.js";

// Helper to create test implants
function testImplant(entry: Vec3, axis: Vec3 = [0, 0, 1], length = 10): SurgicalGuideCheckImplant {
  return {
    entry,
    axis,
    length,
    sleeveDiameter: 5.0,
    sleeveOffset: 9.0,
    sleeveHeight: 5.0,
  };
}

// Helper to create test parameters
function testParams(overrides: Partial<SurgicalGuideParams> = {}): SurgicalGuideParams {
  return { ...DEFAULT_SURGICAL_GUIDE_PARAMS, ...overrides };
}

// Helper to create test anatomy markers
function testMarker(
  type: "nerve" | "sinus",
  points: Vec3[],
  radius = 1.5,
): SurgicalGuideAnatomyMarker {
  return {
    id: `marker-${type}`,
    name: type,
    type,
    radius,
    points,
  };
}

describe("Surgical Guide 3D Geometry & Validation Engine", () => {
  describe("MeshBuilder & cylinderMesh", () => {
    it("MeshBuilder accumulates vertices, triangles, and quads correctly", () => {
      const b = new MeshBuilder();
      const v0 = b.addVertex([0, 0, 0]);
      const v1 = b.addVertexCoords(1, 0, 0);
      const v2 = b.addVertexCoords(1, 1, 0);
      const v3 = b.addVertexCoords(0, 1, 0);

      assert.strictEqual(b.vertexCount, 4);
      b.addQuad(v0, v1, v2, v3);
      assert.strictEqual(b.triangleCount, 2);

      const mesh = b.build();
      assert.strictEqual(mesh.positions.length, 12);
      assert.strictEqual(mesh.indices.length, 6);
    });

    it("cylinderMesh generates exact vertex and triangle counts", () => {
      const seg = 48;
      const m = cylinderMesh([0, 0, 0], [0, 0, 10], 3, seg);

      // Vertices: 2 rings of seg + 2 centers = 2 * seg + 2 = 98
      assert.strictEqual(m.positions.length / 3, 2 * seg + 2);
      // Triangles: seg side quads (2*seg) + 2 caps (2*seg) = 4 * seg = 192
      assert.strictEqual(m.indices.length / 3, 4 * seg);
    });

    it("cylinderMesh is a watertight, closed, consistently-oriented 2-manifold", () => {
      const m = cylinderMesh([0, 0, 0], [0, 0, 10], 3, 48);
      assert.strictEqual(isClosedOriented(m), true);
    });

    it("cylinderMesh volume matches analytical formula pi * r^2 * h", () => {
      const r = 3;
      const h = 10;
      const m = cylinderMesh([0, 0, 0], [0, 0, h], r, 128);
      const expected = Math.PI * r * r * h;
      const vol = meshVolume(m);

      // Polygonal tessellation slightly underestimates continuous circle area
      assert.ok(vol > expected * 0.99, `Volume ${vol} should be > 0.99 of expected ${expected}`);
      assert.ok(vol < expected * 1.001, `Volume ${vol} should be < 1.001 of expected ${expected}`);
    });

    it("cylinderMesh works for an arbitrary off-axis 3D orientation", () => {
      const p0: Vec3 = [1, 2, 3];
      const p1: Vec3 = [5, 7, 9];
      const radius = 2.0;
      const m = cylinderMesh(p0, p1, radius, 32);

      assert.strictEqual(isClosedOriented(m), true);
      const h = Math.hypot(4, 5, 6);
      const expected = Math.PI * radius * radius * h;
      const vol = meshVolume(m);

      assert.ok(vol > expected * 0.97);
      assert.ok(vol < expected * 1.01);
    });
  });

  describe("sweptBarMesh", () => {
    it("returns empty mesh for degenerate centerline (< 2 points)", () => {
      const m = sweptBarMesh([[0, 0, 0]], 5, 4);
      assert.strictEqual(m.positions.length, 0);
      assert.strictEqual(m.indices.length, 0);
      assert.strictEqual(isClosedOriented(m), false);
    });

    it("creates closed oriented straight bar with exact volume width * height * length", () => {
      const line: Vec3[] = [
        [0, 0, 0],
        [15, 0, 0],
        [30, 0, 0],
      ];
      const width = 5.0;
      const height = 4.0;
      const m = sweptBarMesh(line, width, height);

      assert.strictEqual(isClosedOriented(m), true);
      const vol = meshVolume(m);
      const expected = width * height * 30.0;
      assert.ok(Math.abs(vol - expected) < 1e-3, `Volume ${vol} should equal expected ${expected}`);
    });

    it("sweptBarMesh along a curved 3D arch spline is closed and has positive volume", () => {
      const archPoints: Vec3[] = [];
      const numPoints = 16;
      for (let i = 0; i <= numPoints; i++) {
        const theta = (i / numPoints) * Math.PI; // 0 to 180 degrees
        const x = Math.cos(theta) * 25.0;
        const y = Math.sin(theta) * 20.0;
        const z = 5.0 + Math.sin(theta) * 2.0; // 3D elevation
        archPoints.push([x, y, z]);
      }

      const m = sweptBarMesh(archPoints, 4.5, 3.5);
      assert.strictEqual(isClosedOriented(m), true);
      const vol = meshVolume(m);
      assert.ok(vol > 0, "Curved arch guide bar must have strictly positive volume");
    });
  });

  describe("planSleeveSeat", () => {
    const entry: Vec3 = [0, 0, 0];
    const axis: Vec3 = [0, 0, 1]; // +Z is apical, -Z is occlusal
    const implantLength = 12.0;
    const outerDiameter = 5.0;
    const offset = 9.0;
    const sleeveHeight = 5.0;
    const p = {
      wallMm: 1.5,
      seatClearanceMm: 0.05,
      sleeveWallMm: 0.9,
      channelTolMm: 0.1,
    };

    const plan = planSleeveSeat(
      entry,
      axis,
      implantLength,
      outerDiameter,
      offset,
      sleeveHeight,
      p,
    );

    it("seats the metal sleeve on a repeatable depth-stop shoulder at -offset", () => {
      assert.strictEqual(plan.shoulderT, -offset);
      assert.ok(Math.abs(plan.seat.b[2] - (-offset)) < 1e-5);
    });

    it("opens the seat at the occlusal surface with sleeveHeight + 2mm overshoot", () => {
      const topZ = -(offset + sleeveHeight) - 2.0;
      assert.ok(Math.abs(plan.seat.a[2] - topZ) < 1e-5);
      const seatSpan = plan.seat.b[2] - plan.seat.a[2];
      assert.ok(Math.abs(seatSpan - (sleeveHeight + 2.0)) < 1e-5);
    });

    it("creates a stepped geometry with seat radius wider than drill channel", () => {
      const expectedSeatRadius = outerDiameter / 2 + p.seatClearanceMm; // 2.55
      const innerD = outerDiameter - 2 * p.sleeveWallMm; // 3.2
      const expectedChannelRadius = innerD / 2 + p.channelTolMm; // 1.7

      assert.ok(Math.abs(plan.seat.radius - expectedSeatRadius) < 1e-5);
      assert.ok(Math.abs(plan.channel.radius - expectedChannelRadius) < 1e-5);
      assert.ok(plan.seat.radius > plan.channel.radius, "Seat must be wider than channel to form shoulder");
    });

    it("wraps the seat with housing resin wall of thickness wallMm", () => {
      assert.ok(Math.abs(plan.housingRadius - (plan.seat.radius + p.wallMm)) < 1e-5);
    });

    it("extends drill channel from past apex (+2mm) to seat opening", () => {
      assert.ok(Math.abs(plan.channel.a[2] - (implantLength + 2.0)) < 1e-5);
      assert.ok(Math.abs(plan.channel.b[2] - plan.seat.a[2]) < 1e-5);
    });
  });

  describe("validateSurgicalGuidePlan", () => {
    it("exposes the three clinical constants", () => {
      assert.strictEqual(MIN_WALL_MM, 1.0);
      assert.strictEqual(MIN_DRILL_MM, 1.8);
      assert.strictEqual(DRILL_OVERSHOOT_MM, 2.0);
    });

    it("passes a single well-spaced implant clear of anatomy", () => {
      const issues = validateSurgicalGuidePlan({
        implants: [testImplant([0, 0, 0])],
        params: testParams(),
      });
      assert.strictEqual(issues.length, 0);
    });

    it("flags warning on thin housing wall (wallMm < 1.0)", () => {
      const issues = validateSurgicalGuidePlan({
        implants: [testImplant([0, 0, 0])],
        params: testParams({ wallMm: 0.7 }),
      });
      const thin = issues.find((i) => i.code === "thinWall");
      assert.ok(thin);
      assert.strictEqual(thin?.severity, "warning");
      assert.strictEqual(thin?.detail, "0.7 mm");
    });

    it("flags warning when drill channel is too narrow for bur (diameter < 1.8)", () => {
      // Very thick sleeve wall leaves inner hole < 1.8 mm
      const issues = validateSurgicalGuidePlan({
        implants: [testImplant([0, 0, 0])],
        params: testParams({ sleeveWallMm: 1.8 }),
      });
      const narrow = issues.find((i) => i.code === "narrowChannel");
      assert.ok(narrow);
      assert.strictEqual(narrow?.severity, "warning");
    });

    it("detects fragile inter-sleeve web and bore collision", () => {
      // Two implants spaced only 2 mm apart -> channels overlap
      const issues = validateSurgicalGuidePlan({
        implants: [testImplant([0, 0, 0]), testImplant([2, 0, 0])],
        params: testParams(),
      });
      const collision = issues.find((i) => i.code === "boresClose");
      assert.ok(collision);
      assert.strictEqual(collision?.severity, "error");
    });

    it("does not flag well-separated bores", () => {
      const issues = validateSurgicalGuidePlan({
        implants: [testImplant([0, 0, 0]), testImplant([15, 0, 0])],
        params: testParams(),
      });
      assert.strictEqual(issues.some((i) => i.code === "boresClose"), false);
    });

    it("detects nerve collision due to +2.0 mm drill overshoot past implant apex", () => {
      // Implant has length 10 (apex at z = 10).
      // Nerve crosses at z = 11 (1 mm past apex).
      // Without drill overshoot, apex (10) would not hit z = 11.
      // With DRILL_OVERSHOOT_MM = 2.0, drill tip reaches z = 12, directly colliding with nerve!
      const nerve = testMarker("nerve", [
        [-5, 0, 11],
        [5, 0, 11],
      ], 1.0);

      const issues = validateSurgicalGuidePlan({
        implants: [testImplant([0, 0, 0], [0, 0, 1], 10)],
        params: testParams(),
        anatomy: [nerve],
      });

      const nerveHit = issues.find((i) => i.code === "drillNerve");
      assert.ok(nerveHit);
      assert.strictEqual(nerveHit?.severity, "error");
      // Errors sort before warnings
      assert.strictEqual(issues[0]?.severity, "error");
    });

    it("does not flag nerve safely distant from extended drill path", () => {
      const nerve = testMarker("nerve", [
        [-5, 20, 11],
        [5, 20, 11],
      ], 1.0);

      const issues = validateSurgicalGuidePlan({
        implants: [testImplant([0, 0, 0])],
        params: testParams(),
        anatomy: [nerve],
      });
      assert.strictEqual(issues.some((i) => i.code === "drillNerve"), false);
    });
  });

  describe("triMeshToBinarySTL & exportSurgicalGuideStlBlob", () => {
    it("emits exact binary STL size = 84 + nTri * 50 and valid triangle count", () => {
      const mesh = cylinderMesh([0, 0, 0], [0, 0, 5], 2, 12);
      const nTri = mesh.indices.length / 3;
      const buf = triMeshToBinarySTL(mesh);

      assert.strictEqual(buf.byteLength, 84 + nTri * 50);
      const view = new DataView(buf);
      assert.strictEqual(view.getUint32(80, true), nTri);
    });

    it("calculates accurate unit facet normal in binary STL", () => {
      // Single triangle in XY plane at Z = 0
      const mesh: TriMesh = {
        positions: new Float32Array([
          0, 0, 0,
          1, 0, 0,
          0, 1, 0,
        ]),
        indices: new Uint32Array([0, 1, 2]),
      };
      const buf = triMeshToBinarySTL(mesh);
      const view = new DataView(buf);

      const nx = view.getFloat32(84, true);
      const ny = view.getFloat32(88, true);
      const nz = view.getFloat32(92, true);

      assert.ok(Math.abs(Math.hypot(nx, ny, nz) - 1.0) < 1e-4);
      assert.ok(Math.abs(nz - 1.0) < 1e-4); // normal points +Z
    });

    it("exportSurgicalGuideStlBlob creates a valid Blob with model/stl MIME type", () => {
      const mesh = cylinderMesh([0, 0, 0], [0, 0, 8], 2.5, 16);
      const nTri = mesh.indices.length / 3;
      const blob = exportSurgicalGuideStlBlob(mesh);

      assert.strictEqual(blob.size, 84 + nTri * 50);
      assert.strictEqual(blob.type, "model/stl");
    });
  });
});
