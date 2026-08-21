import assert from "node:assert";
import { describe, test } from "node:test";
import { trilinearInterpolate } from "../../../mprMath";

describe("Trilinear Interpolation Numerical Accuracy", () => {
	test("exact reproduction of 3D linear field f(x,y,z) = 100 + 10x + 20y + 30z", () => {
		const dimX = 5;
		const dimY = 5;
		const dimZ = 5;
		const scalarData = new Float32Array(dimX * dimY * dimZ);

		const f = (x: number, y: number, z: number) => 100 + 10 * x + 20 * y + 30 * z;

		for (let z = 0; z < dimZ; z++) {
			for (let y = 0; y < dimY; y++) {
				for (let x = 0; x < dimX; x++) {
					scalarData[x + y * dimX + z * dimX * dimY] = f(x, y, z);
				}
			}
		}

		// Test arbitrary non-integer query points
		const testPoints = [
			{ x: 1.5, y: 2.5, z: 3.5 },
			{ x: 0.2, y: 0.8, z: 1.4 },
			{ x: 2.75, y: 1.25, z: 2.1 },
			{ x: 3.0, y: 4.0, z: 2.0 },
		];

		for (const pt of testPoints) {
			const interpolated = trilinearInterpolate(
				scalarData,
				[dimX, dimY, dimZ],
				pt.x,
				pt.y,
				pt.z,
			);
			const expected = f(pt.x, pt.y, pt.z);
			assert.ok(
				Math.abs(interpolated - expected) < 1e-4,
				`Failed at (${pt.x}, ${pt.y}, ${pt.z}): got ${interpolated}, expected ${expected}`,
			);
		}
	});

	test("exact reproduction of trilinear polynomial f(x,y,z) = x*y*z", () => {
		const dim = 4;
		const scalarData = new Float32Array(dim * dim * dim);
		const f = (x: number, y: number, z: number) => x * y * z;

		for (let z = 0; z < dim; z++) {
			for (let y = 0; y < dim; y++) {
				for (let x = 0; x < dim; x++) {
					scalarData[x + y * dim + z * dim * dim] = f(x, y, z);
				}
			}
		}

		const interpolated = trilinearInterpolate(
			scalarData,
			[dim, dim, dim],
			1.5,
			2.5,
			1.5,
		);
		const expected = 1.5 * 2.5 * 1.5; // 5.625
		assert.ok(Math.abs(interpolated - expected) < 1e-4);
	});

	test("returns outOfBoundsValue when querying outside volume bounding box", () => {
		const scalarData = new Float32Array(8); // 2x2x2
		scalarData.fill(100);

		const out1 = trilinearInterpolate(scalarData, [2, 2, 2], -0.5, 0.5, 0.5, -1000);
		assert.strictEqual(out1, -1000);

		const out2 = trilinearInterpolate(scalarData, [2, 2, 2], 0.5, 2.5, 0.5, -1000);
		assert.strictEqual(out2, -1000);

		const out3 = trilinearInterpolate(scalarData, [2, 2, 2], 0.5, 0.5, 3.0, -1000);
		assert.strictEqual(out3, -1000);
	});
});
