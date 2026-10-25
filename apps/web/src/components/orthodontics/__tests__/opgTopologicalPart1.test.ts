import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	detectDentalMidline,
	partitionUpperLowerJaws,
	assignQuadrantSlots,
	type OpgToothDetection,
} from "../opgTopologicalEngine";

const expect = (actual: any) => ({
	toBe: (expected: any) => assert.equal(actual, expected),
	toBeGreaterThan: (expected: number) => assert.ok(actual > expected),
	toBeLessThan: (expected: number) => assert.ok(actual < expected),
});

describe("OPG Topological Graph Matching — Midline & Partitions", () => {
	it("correctly identifies dental midline from tooth positions", () => {
		const teeth: OpgToothDetection[] = [
			{ id: 1, cx: 480, cy: 200, x1: 460, y1: 180, x2: 500, y2: 220, width: 40, height: 40, confidence: 0.9 },
			{ id: 2, cx: 520, cy: 200, x1: 500, y1: 180, x2: 540, y2: 220, width: 40, height: 40, confidence: 0.9 },
			{ id: 3, cx: 440, cy: 210, x1: 420, y1: 190, x2: 460, y2: 230, width: 40, height: 40, confidence: 0.9 },
			{ id: 4, cx: 560, cy: 210, x1: 540, y1: 190, x2: 580, y2: 230, width: 40, height: 40, confidence: 0.9 },
		];
		const midline = detectDentalMidline(teeth, 1000);
		expect(Math.abs(midline - 500) <= 1).toBe(true);
	});

	it("accurately partitions teeth into Upper and Lower jaws", () => {
		const teeth: OpgToothDetection[] = [
			{ id: 1, cx: 480, cy: 200, x1: 460, y1: 180, x2: 500, y2: 220, width: 40, height: 40, confidence: 0.9 },
			{ id: 2, cx: 520, cy: 205, x1: 500, y1: 180, x2: 540, y2: 220, width: 40, height: 40, confidence: 0.9 },
			{ id: 3, cx: 480, cy: 395, x1: 460, y1: 375, x2: 500, y2: 415, width: 40, height: 40, confidence: 0.9 },
			{ id: 4, cx: 520, cy: 400, x1: 500, y1: 380, x2: 540, y2: 420, width: 40, height: 40, confidence: 0.9 },
		];
		const { upper, lower, splitY } = partitionUpperLowerJaws(teeth);
		expect(upper.length).toBe(2);
		expect(lower.length).toBe(2);
		expect(splitY).toBeGreaterThan(250);
		expect(splitY).toBeLessThan(350);
	});

	it("CRITICAL: Detects missing tooth gap and DOES NOT shift downstream tooth indices", () => {
		const q1Teeth: OpgToothDetection[] = [
			{ id: 11, cx: 465, cy: 200, x1: 450, y1: 180, x2: 480, y2: 220, width: 30, height: 40, confidence: 0.9 },
			{ id: 12, cx: 430, cy: 200, x1: 415, y1: 180, x2: 445, y2: 220, width: 30, height: 40, confidence: 0.9 },
			{ id: 13, cx: 395, cy: 200, x1: 380, y1: 180, x2: 410, y2: 220, width: 30, height: 40, confidence: 0.9 },
			{ id: 14, cx: 360, cy: 200, x1: 345, y1: 180, x2: 375, y2: 220, width: 30, height: 40, confidence: 0.9 },
			{ id: 15, cx: 325, cy: 200, x1: 310, y1: 180, x2: 340, y2: 220, width: 30, height: 40, confidence: 0.9 },
			{ id: 17, cx: 255, cy: 200, x1: 240, y1: 180, x2: 270, y2: 220, width: 30, height: 40, confidence: 0.9 },
			{ id: 18, cx: 220, cy: 200, x1: 205, y1: 180, x2: 235, y2: 220, width: 30, height: 40, confidence: 0.9 },
		];

		const assignments = assignQuadrantSlots(q1Teeth, 1, 500);
		expect(assignments.has(11)).toBe(true);
		expect(assignments.has(12)).toBe(true);
		expect(assignments.has(13)).toBe(true);
		expect(assignments.has(14)).toBe(true);
		expect(assignments.has(15)).toBe(true);
		expect(assignments.has(16)).toBe(false);
		expect(assignments.has(17)).toBe(true);
		expect(assignments.get(17)?.id).toBe(17);
		expect(assignments.has(18)).toBe(true);
		expect(assignments.get(18)?.id).toBe(18);
	});
});
