import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	dot3,
	cross3,
	norm3,
	normalize3,
	planeFromPointAndNormal,
	intersectPlanes3D,
	clipLineToAABB3D,
	clipSegment2D,
	buildCrossSectionFrame,
	computeAxialIntersections,
	computeCoronalIntersections,
	computeSagittalIntersections,
	computeCrossSectionViewIntersections,
	computePanoramicIntersections,
	SliceIntersectionScratch,
	type Vec3,
	type BoundingBox3D,
	type CrossSectionPlaneSpec,
	type OrthogonalSliceCoordinates,
	type Segment2D,
	type Segment3D,
} from "./sliceIntersectionMath";

describe("Slice Intersection Math Engine (Dental CBCT / MPR Cut Lines)", () => {
	const defaultBox: BoundingBox3D = {
		xMin: -100,
		xMax: 100,
		yMin: -100,
		yMax: 100,
		zMin: -50,
		zMax: 50,
	};

	it("1. Evaluates 3D vector algebra: dot, cross, norm, and unit normalization", () => {
		const a: Vec3 = [1, 2, 3];
		const b: Vec3 = [4, -5, 6];

		// Dot product: 1*4 + 2*(-5) + 3*6 = 4 - 10 + 18 = 12
		assert.equal(dot3(a, b), 12);

		// Cross product: [2*6 - 3*(-5), 3*4 - 1*6, 1*(-5) - 2*4] = [27, 6, -13]
		const c = cross3(a, b);
		assert.deepEqual(c, [27, 6, -13]);
		assert.equal(dot3(c, a), 0); // Orthogonal to a
		assert.equal(dot3(c, b), 0); // Orthogonal to b

		// In-place cross product
		const outC: Vec3 = [0, 0, 0];
		cross3(a, b, outC);
		assert.deepEqual(outC, [27, 6, -13]);

		// Norm & Normalize
		const v: Vec3 = [0, 3, 4];
		assert.equal(norm3(v), 5);
		const n = normalize3(v);
		assert.ok(Math.abs(n[0] - 0) < 1e-12);
		assert.ok(Math.abs(n[1] - 0.6) < 1e-12);
		assert.ok(Math.abs(n[2] - 0.8) < 1e-12);
		assert.ok(Math.abs(norm3(n) - 1.0) < 1e-12);
	});

	it("2. Constructs analytical plane equation from point and normal", () => {
		const pt: Vec3 = [10, 20, 30];
		const norm: Vec3 = [0, 0, 2]; // Non-unit, should be normalized to [0, 0, 1]
		const plane = planeFromPointAndNormal(pt, norm);

		assert.deepEqual(plane.normal, [0, 0, 1]);
		assert.equal(plane.d, 30); // 0*10 + 0*20 + 1*30 = 30
	});

	it("3. Analytically computes intersection between two non-parallel 3D planes", () => {
		// Plane 1: Axial plane Z = 10 (normal [0, 0, 1], d = 10)
		// Plane 2: Coronal plane Y = 20 (normal [0, 1, 0], d = 20)
		const n1: Vec3 = [0, 0, 1];
		const d1 = 10;
		const n2: Vec3 = [0, 1, 0];
		const d2 = 20;

		const rayPt: Vec3 = [0, 0, 0];
		const rayDir: Vec3 = [0, 0, 0];

		const hasIntersection = intersectPlanes3D(n1, d1, n2, d2, rayPt, rayDir);
		assert.equal(hasIntersection, true);

		// Direction of intersection must be ±X [1, 0, 0]
		assert.equal(Math.abs(rayDir[0]), 1);
		assert.equal(rayDir[1], 0);
		assert.equal(rayDir[2], 0);

		// Point on line must satisfy both planes: Y = 20, Z = 10, X = 0 (closest to origin)
		assert.equal(rayPt[0], 0);
		assert.equal(rayPt[1], 20);
		assert.equal(rayPt[2], 10);

		// Verify dot products with normals
		assert.equal(dot3(n1, rayPt), d1);
		assert.equal(dot3(n2, rayPt), d2);
	});

	it("4. Detects parallel and coincident planes without dividing by zero", () => {
		const n1: Vec3 = [0, 0, 1];
		const d1 = 10;
		const n2: Vec3 = [0, 0, 1]; // Parallel plane
		const d2 = 25;

		const rayPt: Vec3 = [0, 0, 0];
		const rayDir: Vec3 = [0, 0, 0];

		const parallelResult = intersectPlanes3D(n1, d1, n2, d2, rayPt, rayDir);
		assert.equal(parallelResult, false);

		// Anti-parallel planes
		const n3: Vec3 = [0, 0, -1];
		const d3 = -10;
		const antiParallelResult = intersectPlanes3D(n1, d1, n3, d3, rayPt, rayDir);
		assert.equal(antiParallelResult, false);
	});

	it("5. Clips infinite 3D line to AABB volume bounding box (Liang-Barsky 3D)", () => {
		// Line along X at Y = 20, Z = 10
		const rayPt: Vec3 = [0, 20, 10];
		const rayDir: Vec3 = [1, 0, 0];

		const outSeg: Segment3D = { p1: [0, 0, 0], p2: [0, 0, 0] };
		const clipped = clipLineToAABB3D(rayPt, rayDir, defaultBox, outSeg);

		assert.equal(clipped, true);
		assert.deepEqual(outSeg.p1, [-100, 20, 10]);
		assert.deepEqual(outSeg.p2, [100, 20, 10]);

		// Line outside the box completely
		const outsidePt: Vec3 = [0, 200, 10]; // Y=200 is outside [-100, 100]
		const clippedOutside = clipLineToAABB3D(outsidePt, rayDir, defaultBox, outSeg);
		assert.equal(clippedOutside, false);
	});

	it("6. Clips 2D segment against 2D bounding box (Liang-Barsky 2D)", () => {
		const outSeg: Segment2D = { x1: 0, y1: 0, x2: 0, y2: 0 };

		// Line from (-150, 0) to (150, 0) inside box [-100, 100] x [-50, 50]
		const clipped = clipSegment2D(-150, 0, 150, 0, -100, 100, -50, 50, outSeg);
		assert.equal(clipped, true);
		assert.equal(outSeg.x1, -100);
		assert.equal(outSeg.y1, 0);
		assert.equal(outSeg.x2, 100);
		assert.equal(outSeg.y2, 0);

		// Completely outside
		const outside = clipSegment2D(0, 120, 50, 150, -100, 100, -50, 50, outSeg);
		assert.equal(outside, false);
	});

	it("7. Constructs orthonormal Frenet-Serret cross-section frame with tilt angle", () => {
		const spec: CrossSectionPlaneSpec = {
			point: [10, 20],
			normal: [0, 1], // pointing anteriorly (+Y)
			tangent: [1, 0], // pointing along arch (+X)
			tiltDeg: 15,
			widthMm: 30,
			zMin: -50,
			zMax: 50,
		};

		const frame = buildCrossSectionFrame(spec);

		// Check origin at midpoint in Z
		assert.deepEqual(frame.origin, [10, 20, 0]);

		// Check unit vectors
		assert.ok(Math.abs(norm3(frame.eU) - 1.0) < 1e-6);
		assert.ok(Math.abs(norm3(frame.eV) - 1.0) < 1e-6);
		assert.ok(Math.abs(norm3(frame.normal) - 1.0) < 1e-6);

		// Check mutual orthogonality: eU · eV = 0, eU · normal = 0, eV · normal = 0
		assert.ok(Math.abs(dot3(frame.eU, frame.eV)) < 1e-6);
		assert.ok(Math.abs(dot3(frame.eU, frame.normal)) < 1e-6);
		assert.ok(Math.abs(dot3(frame.eV, frame.normal)) < 1e-6);

		// eV should have vertical component cos(15°) and horizontal along tangent sin(15°)
		const tiltRad = (15 * Math.PI) / 180;
		assert.ok(Math.abs(frame.eV[2] - Math.cos(tiltRad)) < 1e-6);
		assert.ok(Math.abs(frame.eV[0] - Math.sin(tiltRad)) < 1e-6);
	});

	it("8. Computes reference cut lines for AXIAL viewport", () => {
		const coords: OrthogonalSliceCoordinates = {
			axialZ: 5,
			coronalY: 25,
			sagittalX: -15,
		};

		const csSpec: CrossSectionPlaneSpec = {
			point: [0, 30],
			normal: [0, 1], // buccolingual
			tangent: [1, 0], // mesiodistal
			tiltDeg: 0,
			widthMm: 20,
			zMin: -50,
			zMax: 50,
		};

		const lines = computeAxialIntersections(coords, defaultBox, csSpec);

		// Coronal line: horizontal line Y = 25, spanning X [-100, 100]
		assert.ok(lines.coronalLine !== null);
		assert.equal(lines.coronalLine.y1, 25);
		assert.equal(lines.coronalLine.y2, 25);
		assert.equal(lines.coronalLine.x1, -100);
		assert.equal(lines.coronalLine.x2, 100);

		// Sagittal line: vertical line X = -15, spanning Y [-100, 100]
		assert.ok(lines.sagittalLine !== null);
		assert.equal(lines.sagittalLine.x1, -15);
		assert.equal(lines.sagittalLine.x2, -15);
		assert.equal(lines.sagittalLine.y1, -100);
		assert.equal(lines.sagittalLine.y2, 100);

		// Cross-section cut line: centered at (0, 30), widthMm = 20 along normal [0, 1]
		assert.ok(lines.crossSectionLine !== null);
		assert.equal(lines.crossSectionLine.x1, 0);
		assert.equal(lines.crossSectionLine.x2, 0);
		assert.equal(lines.crossSectionLine.y1, 20); // 30 - 10
		assert.equal(lines.crossSectionLine.y2, 40); // 30 + 10
	});

	it("9. Computes reference cut lines for CORONAL viewport", () => {
		const coords: OrthogonalSliceCoordinates = {
			axialZ: 10,
			coronalY: 20,
			sagittalX: 35,
		};

		const lines = computeCoronalIntersections(coords, defaultBox);

		// Axial line: horizontal line Z = 10, spanning X [-100, 100]
		assert.ok(lines.axialLine !== null);
		assert.equal(lines.axialLine.y1, 10);
		assert.equal(lines.axialLine.y2, 10);
		assert.equal(lines.axialLine.x1, -100);
		assert.equal(lines.axialLine.x2, 100);

		// Sagittal line: vertical line X = 35, spanning Z [-50, 50]
		assert.ok(lines.sagittalLine !== null);
		assert.equal(lines.sagittalLine.x1, 35);
		assert.equal(lines.sagittalLine.x2, 35);
		assert.equal(lines.sagittalLine.y1, -50);
		assert.equal(lines.sagittalLine.y2, 50);
	});

	it("10. Computes reference cut lines for SAGITTAL viewport", () => {
		const coords: OrthogonalSliceCoordinates = {
			axialZ: -12,
			coronalY: 45,
			sagittalX: 18,
		};

		const lines = computeSagittalIntersections(coords, defaultBox);

		// Axial line: horizontal line Z = -12, spanning Y [-100, 100]
		assert.ok(lines.axialLine !== null);
		assert.equal(lines.axialLine.y1, -12);
		assert.equal(lines.axialLine.y2, -12);
		assert.equal(lines.axialLine.x1, -100);
		assert.equal(lines.axialLine.x2, 100);

		// Coronal line: vertical line Y = 45, spanning Z [-50, 50]
		assert.ok(lines.coronalLine !== null);
		assert.equal(lines.coronalLine.x1, 45);
		assert.equal(lines.coronalLine.x2, 45);
		assert.equal(lines.coronalLine.y1, -50);
		assert.equal(lines.coronalLine.y2, 50);
	});

	it("11. Computes CROSS-SECTION viewport cut lines in local (u, v) coordinates", () => {
		const csSpec: CrossSectionPlaneSpec = {
			point: [0, 20],
			normal: [0, 1], // +Y
			tangent: [1, 0], // +X
			tiltDeg: 0,
			widthMm: 24, // halfW = 12 -> u in [-12, +12]
			zMin: -40, // halfH = 40 -> v in [-40, +40], zMid = 0
			zMax: 40,
		};

		const coords: OrthogonalSliceCoordinates = {
			axialZ: 15,
			coronalY: 20,
			sagittalX: 0,
		};

		const csLines = computeCrossSectionViewIntersections(csSpec, coords);

		// Arch center line: vertical at u = 0, spanning v [-40, 40]
		assert.equal(csLines.archCenterLine.x1, 0);
		assert.equal(csLines.archCenterLine.x2, 0);
		assert.equal(csLines.archCenterLine.y1, -40);
		assert.equal(csLines.archCenterLine.y2, 40);

		// Axial slice line: horizontal at v = 15, spanning u [-12, 12]
		assert.ok(csLines.axialLine !== null);
		assert.equal(csLines.axialLine.y1, 15);
		assert.equal(csLines.axialLine.y2, 15);
		assert.equal(csLines.axialLine.x1, -12);
		assert.equal(csLines.axialLine.x2, 12);
	});

	it("12. Computes PANORAMIC viewport cut lines in (sMm, zMm) coordinates", () => {
		const archLengthMm = 160;
		const zMin = -50;
		const zMax = 50;

		// No tilt: vertical line at s = 0.5 * 160 = 80 mm
		const panLines = computePanoramicIntersections(
			10, // axialZ
			0.5, // csPosition
			0, // csTiltDeg
			archLengthMm,
			zMin,
			zMax,
		);

		assert.ok(panLines.axialLine !== null);
		assert.equal(panLines.axialLine.y1, 10);
		assert.equal(panLines.axialLine.y2, 10);
		assert.equal(panLines.axialLine.x1, 0);
		assert.equal(panLines.axialLine.x2, 160);

		assert.ok(panLines.crossSectionLine !== null);
		assert.equal(panLines.crossSectionLine.x1, 80);
		assert.equal(panLines.crossSectionLine.x2, 80);
		assert.equal(panLines.crossSectionLine.y1, -50);
		assert.equal(panLines.crossSectionLine.y2, 50);

		// Tilted: 15° tilt creates lean across Z
		const tiltedPan = computePanoramicIntersections(
			10,
			0.5,
			15,
			archLengthMm,
			zMin,
			zMax,
		);
		assert.ok(tiltedPan.crossSectionLine !== null);
		// Top and bottom s coordinates should differ due to tilt
		assert.notEqual(tiltedPan.crossSectionLine.x1, tiltedPan.crossSectionLine.x2);
	});

	it("13. Supports zero-allocation hot path with reusable scratch buffers", () => {
		const scratch = new SliceIntersectionScratch();
		const coords: OrthogonalSliceCoordinates = {
			axialZ: 0,
			coronalY: 0,
			sagittalX: 0,
		};
		const outAxial = {
			coronalLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
			sagittalLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
			crossSectionLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		};

		// Call multiple times: outAxial reference must remain identical (zero garbage)
		const ref1 = computeAxialIntersections(coords, defaultBox, undefined, outAxial, scratch);
		assert.equal(ref1, outAxial);

		coords.coronalY = 10;
		const ref2 = computeAxialIntersections(coords, defaultBox, undefined, outAxial, scratch);
		assert.equal(ref2, outAxial);
		assert.equal(outAxial.coronalLine.y1, 10);
	});
});
