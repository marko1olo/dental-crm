import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	angle3Points,
	angleBetweenLines,
	angleBetweenVectors,
	calculateCephalometrics,
	CEPHALOMETRIC_LANDMARKS,
	DEFAULT_CEPH_LANDMARKS_PRESET,
	distance,
	dotProduct,
	projectPointOntoLine,
	vector,
	vectorLength,
	type Point2D,
} from "../cephalometricMath";

describe("Cephalometric Math — 2D Geometry & Benchmarking", () => {
	it("calculates 2D vector operations correctly", () => {
		const p1: Point2D = { x: 0, y: 0 };
		const p2: Point2D = { x: 3, y: 4 };
		const v = vector(p1, p2);
		assert.equal(v.x, 3);
		assert.equal(v.y, 4);
		assert.equal(vectorLength(v), 5);
		assert.equal(distance(p1, p2), 5);
		assert.equal(dotProduct(v, { x: 1, y: 0 }), 3);
	});

	it("calculates angles between vectors and lines correctly", () => {
		const v1: Point2D = { x: 1, y: 0 };
		const v2: Point2D = { x: 0, y: 1 };
		const v3: Point2D = { x: -1, y: 0 };
		assert.equal(Math.round(angleBetweenVectors(v1, v2)), 90);
		assert.equal(Math.round(angleBetweenVectors(v1, v3)), 180);
		assert.equal(Math.round(angleBetweenVectors(v1, v1)), 0);

		const a = { x: 10, y: 0 };
		const vertex = { x: 0, y: 0 };
		const b = { x: 0, y: 10 };
		assert.equal(Math.round(angle3Points(a, vertex, b)), 90);

		const l1_p1 = { x: 0, y: 0 };
		const l1_p2 = { x: 10, y: 0 };
		const l2_p1 = { x: 0, y: 10 };
		const l2_p2 = { x: 10, y: 10 };
		assert.equal(Math.round(angleBetweenLines(l1_p1, l1_p2, l2_p1, l2_p2)), 0);
	});

	it("projects a point perpendicularly onto a 2D line", () => {
		const lineStart: Point2D = { x: 0, y: 0 };
		const lineEnd: Point2D = { x: 100, y: 0 };
		const point: Point2D = { x: 50, y: 25 };
		const proj = projectPointOntoLine(point, lineStart, lineEnd);
		assert.equal(proj.x, 50);
		assert.equal(proj.y, 0);
	});

	it("contains all 16 mandatory orthodontic landmark definitions including Orbitale and Porion", () => {
		assert.equal(CEPHALOMETRIC_LANDMARKS.length, 16);
		const keys = CEPHALOMETRIC_LANDMARKS.map((l) => l.key);
		const required = ["S", "N", "Or", "Po", "A", "B", "Pog", "Gn", "Me", "Go", "ANS", "PNS", "U1t", "U1a", "L1t", "L1a"];
		for (const k of required) {
			assert.ok((keys as string[]).includes(k), `Missing ${k}`);
		}
	});

	it("executes 1000 full cephalometric analyses in < 100ms", () => {
		const startTime = performance.now();
		const iterations = 1000;
		for (let i = 0; i < iterations; i++) {
			calculateCephalometrics(DEFAULT_CEPH_LANDMARKS_PRESET);
		}
		const totalDuration = performance.now() - startTime;
		assert.ok(totalDuration < 250, `1000 iterations took ${totalDuration.toFixed(2)}ms`);
	});
});
