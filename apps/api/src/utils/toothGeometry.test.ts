import assert from "node:assert";
import { describe, test } from "node:test";
import { getToothPath, TOOTH_GEOMETRY } from "./toothGeometry.js";

describe("toothGeometry", () => {
	describe("getToothPath", () => {
		test("returns UPPER_CENTRAL_INCISOR for upper quadrants (1, 2) and index 1", () => {
			assert.strictEqual(getToothPath(11), TOOTH_GEOMETRY.UPPER_CENTRAL_INCISOR);
			assert.strictEqual(getToothPath(21), TOOTH_GEOMETRY.UPPER_CENTRAL_INCISOR);
		});

		test("returns UPPER_LATERAL_INCISOR for upper quadrants (1, 2) and index 2", () => {
			assert.strictEqual(getToothPath(12), TOOTH_GEOMETRY.UPPER_LATERAL_INCISOR);
			assert.strictEqual(getToothPath(22), TOOTH_GEOMETRY.UPPER_LATERAL_INCISOR);
		});

		test("returns UPPER_CANINE for upper quadrants (1, 2) and index 3", () => {
			assert.strictEqual(getToothPath(13), TOOTH_GEOMETRY.UPPER_CANINE);
			assert.strictEqual(getToothPath(23), TOOTH_GEOMETRY.UPPER_CANINE);
		});

		test("returns UPPER_PREMOLAR for upper quadrants (1, 2) and index 4-5", () => {
			assert.strictEqual(getToothPath(14), TOOTH_GEOMETRY.UPPER_PREMOLAR);
			assert.strictEqual(getToothPath(15), TOOTH_GEOMETRY.UPPER_PREMOLAR);
			assert.strictEqual(getToothPath(24), TOOTH_GEOMETRY.UPPER_PREMOLAR);
			assert.strictEqual(getToothPath(25), TOOTH_GEOMETRY.UPPER_PREMOLAR);
		});

		test("returns UPPER_MOLAR for upper quadrants (1, 2) and index >= 6", () => {
			assert.strictEqual(getToothPath(16), TOOTH_GEOMETRY.UPPER_MOLAR);
			assert.strictEqual(getToothPath(17), TOOTH_GEOMETRY.UPPER_MOLAR);
			assert.strictEqual(getToothPath(18), TOOTH_GEOMETRY.UPPER_MOLAR);
			assert.strictEqual(getToothPath(28), TOOTH_GEOMETRY.UPPER_MOLAR);
		});

		test("returns LOWER_INCISOR for lower quadrants (3, 4) and index 1-2", () => {
			assert.strictEqual(getToothPath(31), TOOTH_GEOMETRY.LOWER_INCISOR);
			assert.strictEqual(getToothPath(32), TOOTH_GEOMETRY.LOWER_INCISOR);
			assert.strictEqual(getToothPath(41), TOOTH_GEOMETRY.LOWER_INCISOR);
			assert.strictEqual(getToothPath(42), TOOTH_GEOMETRY.LOWER_INCISOR);
		});

		test("returns LOWER_CANINE for lower quadrants (3, 4) and index 3", () => {
			assert.strictEqual(getToothPath(33), TOOTH_GEOMETRY.LOWER_CANINE);
			assert.strictEqual(getToothPath(43), TOOTH_GEOMETRY.LOWER_CANINE);
		});

		test("returns LOWER_PREMOLAR for lower quadrants (3, 4) and index 4-5", () => {
			assert.strictEqual(getToothPath(34), TOOTH_GEOMETRY.LOWER_PREMOLAR);
			assert.strictEqual(getToothPath(35), TOOTH_GEOMETRY.LOWER_PREMOLAR);
			assert.strictEqual(getToothPath(44), TOOTH_GEOMETRY.LOWER_PREMOLAR);
			assert.strictEqual(getToothPath(45), TOOTH_GEOMETRY.LOWER_PREMOLAR);
		});

		test("returns LOWER_MOLAR for lower quadrants (3, 4) and index >= 6", () => {
			assert.strictEqual(getToothPath(36), TOOTH_GEOMETRY.LOWER_MOLAR);
			assert.strictEqual(getToothPath(37), TOOTH_GEOMETRY.LOWER_MOLAR);
			assert.strictEqual(getToothPath(38), TOOTH_GEOMETRY.LOWER_MOLAR);
			assert.strictEqual(getToothPath(48), TOOTH_GEOMETRY.LOWER_MOLAR);
		});

		// Edge Cases
		test("handles invalid index (0 or negative) for upper quadrants", () => {
			assert.strictEqual(getToothPath(10), TOOTH_GEOMETRY.UPPER_PREMOLAR); // index 0 <= 5
			assert.strictEqual(getToothPath(20), TOOTH_GEOMETRY.UPPER_PREMOLAR);
		});

		test("handles invalid index (0 or negative) for lower quadrants", () => {
			assert.strictEqual(getToothPath(30), TOOTH_GEOMETRY.LOWER_INCISOR); // index 0 <= 2
			assert.strictEqual(getToothPath(40), TOOTH_GEOMETRY.LOWER_INCISOR);
		});

		test("handles large index for upper quadrants", () => {
			assert.strictEqual(getToothPath(19), TOOTH_GEOMETRY.UPPER_MOLAR); // > 5
			assert.strictEqual(getToothPath(29), TOOTH_GEOMETRY.UPPER_MOLAR);
		});

		test("handles large index for lower quadrants", () => {
			assert.strictEqual(getToothPath(39), TOOTH_GEOMETRY.LOWER_MOLAR); // > 5
			assert.strictEqual(getToothPath(49), TOOTH_GEOMETRY.LOWER_MOLAR);
		});

		test("handles negative toothId", () => {
			// -10 / 10 -> -1
			// -10 % 10 -> -0
			// Quadrant is -1 (not 1 or 2), index is 0
			// Falls into else branch
			// index 0 <= 2 -> LOWER_INCISOR
			assert.strictEqual(getToothPath(-10), TOOTH_GEOMETRY.LOWER_INCISOR);
			assert.strictEqual(getToothPath(-11), TOOTH_GEOMETRY.LOWER_INCISOR); // index -1 <= 2
			assert.strictEqual(getToothPath(-15), TOOTH_GEOMETRY.LOWER_INCISOR); // index -5 <= 2
		});

		test("handles non-integer toothId", () => {
			// e.g. 11.5
			// quadrant = floor(1.15) = 1
			// index = 11.5 % 10 = 1.5
			// 1.5 <= 5 -> UPPER_PREMOLAR
			assert.strictEqual(getToothPath(11.5), TOOTH_GEOMETRY.UPPER_PREMOLAR);

			// e.g. 31.5
			// quadrant = floor(3.15) = 3
			// index = 31.5 % 10 = 1.5
			// 1.5 <= 2 -> LOWER_INCISOR
			assert.strictEqual(getToothPath(31.5), TOOTH_GEOMETRY.LOWER_INCISOR);
		});
	});
});
