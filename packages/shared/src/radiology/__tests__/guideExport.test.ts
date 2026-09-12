/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL RADIOLOGY & CBCT: BINARY STL EXPORTER & GUIDE MESH TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure mathematical unit tests (Zero Mocks):
 * 1. Binary STL layout verification:
 *    - 80-byte header
 *    - Uint32 triangle count Little Endian
 *    - 50-byte facet record (normal vector, 3 vertices, 16-bit attribute)
 * 2. Normal vector correctness (facet normal = normalize((b-a) x (c-a)))
 * 3. 2-Manifold mesh verification (cylinderMesh, sweptBarMesh, divergence volume)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	triMeshToBinarySTL,
	cylinderMesh,
	sweptBarMesh,
	meshVolume,
	isClosedOriented,
	type TriMesh,
} from "../cpr/guideExport.js";

describe("CBCT Surgical Guide Binary STL Exporter & Geometry Engine", () => {
	// ── 1. Binary STL Layout & Specification Verification ───────

	describe("1. Binary STL Format Specification (IEEE 754 float32 Little Endian)", () => {
		it("serializes single triangle into exactly 84 + 1 * 50 = 134 bytes", () => {
			// Single triangle in XY plane at Z=0
			const mesh: TriMesh = {
				positions: new Float32Array([
					0, 0, 0, // Vertex 0
					10, 0, 0, // Vertex 1
					0, 10, 0, // Vertex 2
				]),
				indices: new Uint32Array([0, 1, 2]),
			};

			const headerText = "Dental Surgical Guide Test 3D Print";
			const buffer = triMeshToBinarySTL(mesh, headerText);

			assert.equal(buffer.byteLength, 134);

			const view = new DataView(buffer);
			const bytes = new Uint8Array(buffer);

			// 1a. Validate 80-byte header starts with headerText
			let readHeader = "";
			for (let i = 0; i < headerText.length; i++) {
				readHeader += String.fromCharCode(bytes[i]!);
			}
			assert.equal(readHeader, headerText);

			// 1b. Validate uint32 Little Endian triangle count at byte offset 80
			const triangleCount = view.getUint32(80, true);
			assert.equal(triangleCount, 1);

			// 1c. Validate facet normal at offset 84 (nx, ny, nz)
			// Triangle (0,0,0) -> (10,0,0) -> (0,10,0) has normal (0, 0, 1)
			const nx = view.getFloat32(84, true);
			const ny = view.getFloat32(88, true);
			const nz = view.getFloat32(92, true);
			assert.ok(Math.abs(nx) < 1e-6);
			assert.ok(Math.abs(ny) < 1e-6);
			assert.ok(Math.abs(nz - 1.0) < 1e-6);
			assert.ok(Math.abs(Math.hypot(nx, ny, nz) - 1.0) < 1e-6);

			// 1d. Validate vertices
			// Vertex 1: (0, 0, 0)
			assert.equal(view.getFloat32(96, true), 0);
			assert.equal(view.getFloat32(100, true), 0);
			assert.equal(view.getFloat32(104, true), 0);
			// Vertex 2: (10, 0, 0)
			assert.equal(view.getFloat32(108, true), 10);
			assert.equal(view.getFloat32(112, true), 0);
			assert.equal(view.getFloat32(116, true), 0);
			// Vertex 3: (0, 10, 0)
			assert.equal(view.getFloat32(120, true), 0);
			assert.equal(view.getFloat32(124, true), 10);
			assert.equal(view.getFloat32(128, true), 0);

			// 1e. Validate 16-bit attribute byte count at offset 132
			assert.equal(view.getUint16(132, true), 0);
		});

		it("correctly handles multi-triangle meshes with byte length 84 + N * 50", () => {
			const cylinder = cylinderMesh([0, 0, 0], [0, 0, 10], 2.5, 16);
			const nTriangles = cylinder.indices.length / 3;

			const buffer = triMeshToBinarySTL(cylinder);
			assert.equal(buffer.byteLength, 84 + nTriangles * 50);

			const view = new DataView(buffer);
			assert.equal(view.getUint32(80, true), nTriangles);
		});
	});

	// ── 2. Guide Mesh Geometry & 2-Manifold Generators ───────────

	describe("2. Surgical Guide Mesh Geometry Generators", () => {
		it("generates a closed, consistently-oriented cylinder sleeve", () => {
			const radius = 2.5;
			const height = 10;
			const cyl = cylinderMesh([0, 0, 0], [0, 0, height], radius, 32);

			assert.ok(cyl.positions.length > 0);
			assert.ok(cyl.indices.length > 0);

			// Verify closed 2-manifold topology (every directed edge paired with opposite half-edge)
			const isManifold = isClosedOriented(cyl);
			assert.ok(
				isManifold,
				"Cylinder mesh must be a closed, consistently-oriented 2-manifold",
			);

			// Analytical volume of cylinder: V = pi * r^2 * h
			// For 32 segments, polygon approximation is close to circle
			const analyticalVol = Math.PI * radius * radius * height;
			const computedVol = meshVolume(cyl);

			// 32-gon area is (n/2)*r^2*sin(2pi/n) -> ~98.7% of true circle
			assert.ok(
				Math.abs(computedVol - analyticalVol) / analyticalVol < 0.03,
				`Volume error must be under 3%, got computed=${computedVol}, analytical=${analyticalVol}`,
			);
		});

		it("generates closed swept guide base bar along dental arch centerline", () => {
			const centerline: [number, number, number][] = [
				[-20, 10, 5],
				[-10, 5, 5],
				[0, 2, 5],
				[10, 5, 5],
				[20, 10, 5],
			];

			const bar = sweptBarMesh(centerline, 5.0, 4.0);
			assert.ok(bar.positions.length > 0);
			assert.ok(bar.indices.length > 0);

			const isManifold = isClosedOriented(bar);
			assert.ok(
				isManifold,
				"Swept bar mesh must be a closed, consistently-oriented 2-manifold",
			);

			const vol = meshVolume(bar);
			assert.ok(vol > 0, "Swept bar volume must be strictly positive");
		});
	});
});
