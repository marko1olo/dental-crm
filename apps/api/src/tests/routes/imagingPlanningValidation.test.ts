import assert from "node:assert/strict";
import { describe, it } from "node:test";

function validateJsonPointsArray(value: string | undefined): boolean {
	if (!value || value === "[]") return true;
	try {
		const parsed = JSON.parse(value);
		if (!Array.isArray(parsed)) return false;
		for (const item of parsed) {
			if (!item || typeof item !== "object") return false;
		}
		return true;
	} catch {
		return false;
	}
}

describe("CT Planning & DICOM MPR Spline Points Validation", () => {
	it("accepts valid empty string, undefined, and '[]'", () => {
		assert.equal(validateJsonPointsArray(undefined), true);
		assert.equal(validateJsonPointsArray(""), true);
		assert.equal(validateJsonPointsArray("[]"), true);
	});

	it("accepts valid JSON coordinate points array", () => {
		const points = JSON.stringify([
			{ x: 10.5, y: 20.3, z: -45.0 },
			{ x: 15.2, y: 22.1, z: -44.8 },
			{ x: 20.1, y: 25.0, z: -43.5 },
		]);
		assert.equal(validateJsonPointsArray(points), true);
	});

	it("accepts valid stored implant definitions", () => {
		const implants = JSON.stringify([
			{
				id: "imp-1",
				fdiCode: "16",
				diameter: 4.5,
				length: 11.5,
				startWorld: [10.5, 20.3, -45.0],
				endWorld: [10.5, 20.3, -56.5],
				boneDensity: { averageHU: 650, classification: "D2" },
				distanceToNerve: 3.2,
			},
		]);
		assert.equal(validateJsonPointsArray(implants), true);
	});

	it("rejects non-JSON strings, non-array JSON, or primitive array items", () => {
		assert.equal(validateJsonPointsArray("not-json-at-all"), false);
		assert.equal(validateJsonPointsArray('{"x": 10, "y": 20}'), false);
		assert.equal(validateJsonArrayWithPrimitives("[1, 2, 3]"), false);
		assert.equal(validateJsonPointsArray('["point1", "point2"]'), false);
	});
});

function validateJsonArrayWithPrimitives(value: string): boolean {
	return validateJsonPointsArray(value);
}
