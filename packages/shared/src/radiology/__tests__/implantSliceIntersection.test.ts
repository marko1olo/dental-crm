/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAVE 140: ANALYTICAL IMPLANT SLICE INTERSECTION UNIT TESTS (MANDATE 8s)
 * ═══════════════════════════════════════════════════════════════════════════
 * Rigorous mathematical verification for:
 * 1. 0° Parallel intersection (longitudinal cutting through cylinder body)
 * 2. 0° Parallel offset chord intersection (analytical chord width 2*sqrt(R^2 - w^2))
 * 3. 90° Perpendicular intersection (transverse cross-section yielding a true circle)
 * 4. 45° Oblique intersection (cross-section yielding an analytical ellipse)
 * 5. Tangent / grazing boundary (thin plane vs thick slab)
 * 6. Non-intersecting scenarios (out-of-bounds, far away, above/below)
 * 7. Degenerate inputs & boundary guards
 *
 * 100% Zero-Mock, Node.js native test runner.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	computeImplantSliceIntersection,
	type VirtualImplantParams,
	type Vec3,
} from "../implantGeometryEngine.js";

describe("Wave 140: Analytical Implant Slice Intersection (Mandate 8s)", () => {
	// ── 1. 0° Parallel Section (Longitudinal) ─────────────────────
	describe("1. 0° Parallel Intersection (Longitudinal)", () => {
		it("computes exact longitudinal strip when plane cuts through implant axis", () => {
			const implant: VirtualImplantParams = {
				entry: [0, 0, 0],
				axis: [1, 0, 0],
				length: 10.0,
				diameter: 4.0, // R = 2.0
				radiusFn: () => 1.0, // pure cylinder
			};
			const planeOrigin: Vec3 = [0, 0, 0];
			const planeNormal: Vec3 = [0, 0, 1]; // Z-plane cutting along X-axis

			const contour = computeImplantSliceIntersection(implant, planeOrigin, planeNormal, 0);
			assert.ok(contour !== null, "Contour must not be null for parallel intersection");
			assert.equal(contour.isVisible, true);
			assert.ok(contour.points2D.length >= 60, "Contour must contain at least 60 polygon vertices");
			assert.equal(contour.points3D.length, contour.points2D.length);

			// Longitudinal span should closely match implant length (10 mm)
			assert.ok(
				Math.abs(contour.maxSpanMm - 10.0) < 0.8,
				`Expected span ~10.0 mm, got ${contour.maxSpanMm}`,
			);

			// All 3D points must lie on the slice plane (Z ≈ 0)
			for (const pt of contour.points3D) {
				assert.ok(
					Math.abs(pt[2]) < 1e-4,
					`Vertex Z should be 0 on slice plane, got ${pt[2]}`,
				);
			}

			// Center 3D should be at mid-body (X ≈ 5.0, Y ≈ 0, Z ≈ 0)
			assert.ok(
				Math.abs(contour.center3D[0] - 5.0) < 0.5,
				`Center X expected ~5.0, got ${contour.center3D[0]}`,
			);
			assert.ok(Math.abs(contour.center3D[1]) < 0.1);
			assert.ok(Math.abs(contour.center3D[2]) < 1e-4);
		});

		it("computes accurate chord width for parallel slice with perpendicular offset", () => {
			const implant: VirtualImplantParams = {
				entry: [0, 0, 0],
				axis: [1, 0, 0],
				length: 10.0,
				diameter: 4.0, // R = 2.0
				radiusFn: () => 1.0,
			};
			// Plane offset at Z = 1.0 mm (halfway to radius)
			const planeOrigin: Vec3 = [0, 0, 1.0];
			const planeNormal: Vec3 = [0, 0, 1];

			const contour = computeImplantSliceIntersection(implant, planeOrigin, planeNormal, 0);
			assert.ok(contour !== null);

			// Theoretical chord width: 2 * sqrt(R^2 - w^2) = 2 * sqrt(4 - 1) = 2 * sqrt(3) ≈ 3.464 mm
			// In points2D, the distance between left and right at any mid-t sample should be ~3.464 mm
			const midIdx = Math.floor(contour.points2D.length / 4);
			const ptLeft = contour.points2D[midIdx]!;
			const ptRight = contour.points2D[contour.points2D.length - 1 - midIdx]!;
			const chordWidth = Math.hypot(ptLeft[0] - ptRight[0], ptLeft[1] - ptRight[1]);

			const theoreticalChord = 2 * Math.sqrt(2.0 * 2.0 - 1.0 * 1.0);
			assert.ok(
				Math.abs(chordWidth - theoreticalChord) < 0.1,
				`Expected chord width ~${theoreticalChord.toFixed(3)}, got ${chordWidth.toFixed(3)}`,
			);
		});
	});

	// ── 2. 90° Perpendicular Section (Transverse Cross-Section) ──
	describe("2. 90° Perpendicular Intersection (Transverse)", () => {
		it("generates an exact circular cross-section when slice plane cuts perpendicularly", () => {
			const implant: VirtualImplantParams = {
				entry: [0, 0, 0],
				axis: [0, 0, 1], // Along Z
				length: 12.0,
				diameter: 4.0, // R = 2.0
				radiusFn: () => 1.0, // Uniform cylinder
			};
			// Plane at Z = 6.0 mm (mid-body)
			const planeOrigin: Vec3 = [0, 0, 6.0];
			const planeNormal: Vec3 = [0, 0, 1];

			const contour = computeImplantSliceIntersection(implant, planeOrigin, planeNormal, 0);
			assert.ok(contour !== null, "Perpendicular cross section must not be null");
			assert.equal(contour.isVisible, true);
			assert.equal(contour.points2D.length, 32, "Must produce 32-segment circle");

			// All 3D points must have Z exactly at the plane (Z ≈ 6.0)
			for (const pt of contour.points3D) {
				assert.ok(
					Math.abs(pt[2] - 6.0) < 1e-4,
					`Vertex Z should be 6.0 mm on slice plane, got ${pt[2]}`,
				);
			}

			// Center 3D must be at [0, 0, 6.0]
			assert.ok(Math.abs(contour.center3D[0]) < 1e-3);
			assert.ok(Math.abs(contour.center3D[1]) < 1e-3);
			assert.ok(Math.abs(contour.center3D[2] - 6.0) < 1e-4);

			// Every vertex must be at exact distance R = 2.0 from center3D
			for (const pt of contour.points3D) {
				const r = Math.hypot(pt[0] - contour.center3D[0], pt[1] - contour.center3D[1]);
				assert.ok(
					Math.abs(r - 2.0) < 0.02,
					`Circle radius must be 2.0 mm, got ${r}`,
				);
			}

			// Span must be 2 * R = 4.0 mm
			assert.ok(Math.abs(contour.maxSpanMm - 4.0) < 0.05);
			assert.ok(Math.abs(contour.averageRadiusMm - 2.0) < 0.02);
		});

		it("correctly evaluates tapered implant radius profile on perpendicular cut", () => {
			const implant: VirtualImplantParams = {
				entry: [0, 0, 0],
				axis: [0, 0, 1],
				length: 10.0,
				diameter: 4.0,
				// Custom radius profile: 1.0 at entry, 0.5 at apex
				radiusFn: (t01) => 1.0 - 0.5 * t01,
			};
			// Plane at Z = 5.0 (t01 = 0.5 => radius factor = 0.75, radius = 2.0 * 0.75 = 1.5 mm)
			const planeOrigin: Vec3 = [0, 0, 5.0];
			const planeNormal: Vec3 = [0, 0, 1];

			const contour = computeImplantSliceIntersection(implant, planeOrigin, planeNormal, 0);
			assert.ok(contour !== null);
			assert.ok(
				Math.abs(contour.averageRadiusMm - 1.5) < 0.05,
				`Expected tapered radius ~1.5 mm, got ${contour.averageRadiusMm}`,
			);
		});
	});

	// ── 3. 45° Oblique Section (Elliptical) ───────────────────────
	describe("3. 45° Oblique Intersection (Elliptical)", () => {
		it("generates an analytical ellipse when plane intersects cylinder at 45°", () => {
			// Axis tilted at 45° in XZ plane: [1/sqrt(2), 0, 1/sqrt(2)]
			const invSqrt2 = 1 / Math.SQRT2;
			const implant: VirtualImplantParams = {
				entry: [-5 * invSqrt2, 0, -5 * invSqrt2],
				axis: [invSqrt2, 0, invSqrt2],
				length: 14.142, // ~10 * sqrt(2)
				diameter: 4.0,  // R = 2.0
				radiusFn: () => 1.0, // pure cylinder
			};
			// Plane at Z = 0 with normal [0, 0, 1]
			const planeOrigin: Vec3 = [0, 0, 0];
			const planeNormal: Vec3 = [0, 0, 1];

			const contour = computeImplantSliceIntersection(implant, planeOrigin, planeNormal, 0);
			assert.ok(contour !== null, "Oblique 45° intersection must not be null");
			assert.equal(contour.isVisible, true);

			// All 3D points must lie on the slice plane (Z ≈ 0)
			for (const pt of contour.points3D) {
				assert.ok(
					Math.abs(pt[2]) < 1e-3,
					`Vertex Z must be ~0 on slice plane, got ${pt[2]}`,
				);
			}

			// In a cylinder cut at 45°:
			// Minor diameter = 2 * R = 4.0 mm
			// Major diameter = 2 * R / sin(45°) = 4.0 * sqrt(2) ≈ 5.657 mm
			const expectedMajorDiameter = 4.0 * Math.SQRT2;
			assert.ok(
				Math.abs(contour.maxSpanMm - expectedMajorDiameter) < 0.25,
				`Expected elliptical major axis ~${expectedMajorDiameter.toFixed(3)} mm, got ${contour.maxSpanMm.toFixed(3)} mm`,
			);

			// Center 3D must be near [0, 0, 0]
			assert.ok(Math.abs(contour.center3D[2]) < 1e-3);
		});
	});

	// ── 4. Tangent / Grazing Boundary ─────────────────────────────
	describe("4. Tangent / Grazing Boundary", () => {
		it("returns null for exact thin plane tangent contact (zero penetration)", () => {
			const implant: VirtualImplantParams = {
				entry: [0, 0, 0],
				axis: [1, 0, 0],
				length: 10.0,
				diameter: 4.0, // R = 2.0
				radiusFn: () => 1.0,
			};
			// Plane at Z = 2.0 mm (distance w0 = 2.0 mm = R, zero penetration)
			const planeOrigin: Vec3 = [0, 0, 2.0];
			const planeNormal: Vec3 = [0, 0, 1];

			const contour = computeImplantSliceIntersection(implant, planeOrigin, planeNormal, 0);
			assert.equal(contour, null, "Zero-thickness grazing plane must return null");
		});

		it("returns valid contour when grazing cylinder enters thick slab (sliceThickness > 0)", () => {
			const implant: VirtualImplantParams = {
				entry: [0, 0, 0],
				axis: [1, 0, 0],
				length: 10.0,
				diameter: 4.0, // R = 2.0
				radiusFn: () => 1.0,
			};
			// Plane at Z = 2.5 mm, but slab thickness = 2.0 mm (slab bounds [1.5, 3.5])
			// Cylinder surface reaches Z = 2.0 mm, which is inside [1.5, 3.5]!
			const planeOrigin: Vec3 = [0, 0, 2.5];
			const planeNormal: Vec3 = [0, 0, 1];

			const contour = computeImplantSliceIntersection(implant, planeOrigin, planeNormal, 2.0);
			assert.ok(contour !== null, "Cylinder entering slab must return valid contour");
			assert.equal(contour.isVisible, true);
		});
	});

	// ── 5. Non-Intersecting Scenarios ─────────────────────────────
	describe("5. Non-Intersecting Scenarios", () => {
		it("returns null when plane is far away from implant", () => {
			const implant: VirtualImplantParams = {
				entry: [0, 0, 0],
				axis: [1, 0, 0],
				length: 10.0,
				diameter: 4.0,
			};
			const planeOrigin: Vec3 = [0, 0, 50.0]; // 50 mm away
			const planeNormal: Vec3 = [0, 0, 1];

			const contour = computeImplantSliceIntersection(implant, planeOrigin, planeNormal, 0);
			assert.equal(contour, null);
		});

		it("returns null when implant is completely past the plane along perpendicular axis", () => {
			const implant: VirtualImplantParams = {
				entry: [0, 0, 10.0],
				axis: [0, 0, 1], // Z: 10.0 to 20.0
				length: 10.0,
				diameter: 4.0,
			};
			const planeOrigin: Vec3 = [0, 0, 0]; // Plane at Z = 0
			const planeNormal: Vec3 = [0, 0, 1];

			const contour = computeImplantSliceIntersection(implant, planeOrigin, planeNormal, 0);
			assert.equal(contour, null);
		});

		it("returns null when implant is parallel to plane but beyond radius", () => {
			const implant: VirtualImplantParams = {
				entry: [0, 0, 0],
				axis: [1, 0, 0],
				length: 10.0,
				diameter: 4.0, // R = 2.0
			};
			const planeOrigin: Vec3 = [0, 0, 3.5]; // 3.5 mm > 2.0 mm
			const planeNormal: Vec3 = [0, 0, 1];

			const contour = computeImplantSliceIntersection(implant, planeOrigin, planeNormal, 0);
			assert.equal(contour, null);
		});
	});

	// ── 6. Robustness & Degenerate Inputs ─────────────────────────
	describe("6. Robustness & Degenerate Inputs", () => {
		it("safely returns null on non-positive diameter or length", () => {
			const invalidDiam: VirtualImplantParams = {
				entry: [0, 0, 0],
				axis: [1, 0, 0],
				length: 10.0,
				diameter: 0,
			};
			assert.equal(computeImplantSliceIntersection(invalidDiam, [0, 0, 0], [0, 0, 1]), null);

			const invalidLen: VirtualImplantParams = {
				entry: [0, 0, 0],
				axis: [1, 0, 0],
				length: -5.0,
				diameter: 4.0,
			};
			assert.equal(computeImplantSliceIntersection(invalidLen, [0, 0, 0], [0, 0, 1]), null);
		});

		it("safely returns null on zero plane normal or zero implant axis", () => {
			const implant: VirtualImplantParams = {
				entry: [0, 0, 0],
				axis: [0, 0, 0],
				length: 10.0,
				diameter: 4.0,
			};
			assert.equal(computeImplantSliceIntersection(implant, [0, 0, 0], [0, 0, 1]), null);

			const validImplant: VirtualImplantParams = {
				entry: [0, 0, 0],
				axis: [1, 0, 0],
				length: 10.0,
				diameter: 4.0,
			};
			assert.equal(computeImplantSliceIntersection(validImplant, [0, 0, 0], [0, 0, 0]), null);
		});
	});
});
