import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampMprSlabMm, trilinearInterpolate } from "./mprMath.js";

describe("clampMprSlabMm", () => {
	it("should return the value correctly rounded if within bounds [1, 30]", () => {
		assert.equal(clampMprSlabMm(15), 15);
		assert.equal(clampMprSlabMm(15.1), 15);
		assert.equal(clampMprSlabMm(15.5), 16);
		assert.equal(clampMprSlabMm(1), 1);
		assert.equal(clampMprSlabMm(30), 30);
	});

	it("should clamp values below the minimum bound (1)", () => {
		assert.equal(clampMprSlabMm(0), 1);
		assert.equal(clampMprSlabMm(-10), 1);
		assert.equal(clampMprSlabMm(0.4), 1);
	});

	it("should clamp values above the maximum bound (30)", () => {
		assert.equal(clampMprSlabMm(31), 30);
		assert.equal(clampMprSlabMm(100), 30);
		assert.equal(clampMprSlabMm(30.5), 30);
	});

	it("should handle non-finite values by returning the fallback value (1)", () => {
		assert.equal(clampMprSlabMm(NaN), 1);
		assert.equal(clampMprSlabMm(Infinity), 1);
		assert.equal(clampMprSlabMm(-Infinity), 1);
	});
});

describe("trilinearInterpolate", () => {
	const mockData = new Float32Array([
		10,
		20, // z=0, y=0
		30,
		40, // z=0, y=1
		50,
		60, // z=1, y=0
		70,
		80, // z=1, y=1
	]);
	const dims: [number, number, number] = [2, 2, 2];

	it("should return exact values at integer coordinates", () => {
		assert.equal(trilinearInterpolate(mockData, dims, 0, 0, 0), 10);
		assert.equal(trilinearInterpolate(mockData, dims, 1, 0, 0), 20);
		assert.equal(trilinearInterpolate(mockData, dims, 0, 1, 0), 30);
		assert.equal(trilinearInterpolate(mockData, dims, 1, 1, 0), 40);
		assert.equal(trilinearInterpolate(mockData, dims, 0, 0, 1), 50);
		assert.equal(trilinearInterpolate(mockData, dims, 1, 0, 1), 60);
		assert.equal(trilinearInterpolate(mockData, dims, 0, 1, 1), 70);
		assert.equal(trilinearInterpolate(mockData, dims, 1, 1, 1), 80);
	});

	it("should interpolate correctly along the X axis", () => {
		assert.equal(trilinearInterpolate(mockData, dims, 0.5, 0, 0), 15);
		assert.equal(trilinearInterpolate(mockData, dims, 0.25, 0, 0), 12.5);
	});

	it("should interpolate correctly along the Y axis", () => {
		assert.equal(trilinearInterpolate(mockData, dims, 0, 0.5, 0), 20);
	});

	it("should interpolate correctly along the Z axis", () => {
		assert.equal(trilinearInterpolate(mockData, dims, 0, 0, 0.5), 30);
	});

	it("should interpolate correctly on a 2D face (X and Y)", () => {
		assert.equal(trilinearInterpolate(mockData, dims, 0.5, 0.5, 0), 25);
	});

	it("should trilinearly interpolate correctly exactly in the center", () => {
		assert.equal(trilinearInterpolate(mockData, dims, 0.5, 0.5, 0.5), 45);
	});

	it("should handle boundary values properly without out-of-bounds errors", () => {
		assert.equal(trilinearInterpolate(mockData, dims, 1, 1, 1), 80);
	});
});
