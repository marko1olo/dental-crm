import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateMeshGeometryMetrics,
	type Triangle3D,
} from "@dental/shared";

function createCube10mmTriangles(): Triangle3D[] {
	// A 10x10x10 mm cube centered from (0,0,0) to (10,10,10)
	// 8 vertices:
	const p0 = { x: 0, y: 0, z: 0 };
	const p1 = { x: 10, y: 0, z: 0 };
	const p2 = { x: 10, y: 10, z: 0 };
	const p3 = { x: 0, y: 10, z: 0 };
	const p4 = { x: 0, y: 0, z: 10 };
	const p5 = { x: 10, y: 0, z: 10 };
	const p6 = { x: 10, y: 10, z: 10 };
	const p7 = { x: 0, y: 10, z: 10 };

	return [
		// Front face (z=0)
		{ v1: p0, v2: p1, v3: p2 },
		{ v1: p0, v2: p2, v3: p3 },
		// Back face (z=10)
		{ v1: p5, v2: p4, v3: p7 },
		{ v1: p5, v2: p7, v3: p6 },
		// Left face (x=0)
		{ v1: p4, v2: p0, v3: p3 },
		{ v1: p4, v2: p3, v3: p7 },
		// Right face (x=10)
		{ v1: p1, v2: p5, v3: p6 },
		{ v1: p1, v2: p6, v3: p2 },
		// Top face (y=10)
		{ v1: p3, v2: p2, v3: p6 },
		{ v1: p3, v2: p6, v3: p7 },
		// Bottom face (y=0)
		{ v1: p4, v2: p5, v3: p1 },
		{ v1: p4, v2: p1, v3: p0 },
	];
}

describe("CAD/CAM 3D Mesh Geometry & ZTL Restoration Engine", () => {
	it("calculates exact mathematical volume, surface area and AABB bounding box for 10mm calibration cube", () => {
		const triangles = createCube10mmTriangles();
		const metrics = calculateMeshGeometryMetrics(triangles);

		assert.equal(metrics.triangleCount, 12, "Cube has 12 triangular facets");
		assert.equal(metrics.surfaceAreaMm2, 600, "Surface area of 10x10x10 cube is 600 mm²");
		assert.equal(metrics.volumeMm3, 1000, "Volume of 10x10x10 cube is 1000 mm³");
		assert.equal(metrics.volumeCm3, 1.0, "Volume is 1.0 cm³");

		assert.deepEqual(metrics.boundingBoxMm.dimensions, { x: 10, y: 10, z: 10 });
		assert.deepEqual(metrics.boundingBoxMm.min, { x: 0, y: 0, z: 0 });
		assert.deepEqual(metrics.boundingBoxMm.max, { x: 10, y: 10, z: 10 });

		// Material mass calculations (Volume * Density)
		assert.equal(metrics.materialMassGrams.zirconia, 6.05, "1.0 cm³ Zirconia @ 6.05 g/cm³ = 6.05g");
		assert.equal(metrics.materialMassGrams.emax, 2.50, "1.0 cm³ E.max @ 2.50 g/cm³ = 2.50g");
		assert.equal(metrics.materialMassGrams.pmma, 1.18, "1.0 cm³ PMMA @ 1.18 g/cm³ = 1.18g");
		assert.equal(metrics.materialMassGrams.titanium, 4.43, "1.0 cm³ Titanium @ 4.43 g/cm³ = 4.43g");

		assert.equal(metrics.isManifold, true, "Closed watertight cube is 2-manifold");
		assert.equal(metrics.boundaryEdgeCount, 0, "No boundary holes");
		assert.equal(metrics.nonManifoldEdgeCount, 0, "No non-manifold junctions");
	});

	it("detects open boundary edges on non-watertight mesh", () => {
		const triangles = createCube10mmTriangles().slice(0, 10); // Remove 2 triangles (open hole)
		const metrics = calculateMeshGeometryMetrics(triangles);

		assert.equal(metrics.isManifold, false, "Open mesh is not 2-manifold watertight");
		assert.ok(metrics.boundaryEdgeCount > 0, "Boundary edge count is non-zero");
	});
});
