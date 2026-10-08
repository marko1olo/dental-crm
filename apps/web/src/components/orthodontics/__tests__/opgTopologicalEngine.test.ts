import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
	detectDentalMidline,
	partitionUpperLowerJaws,
	assignQuadrantSlots,
	calculateOpgOdontogram,
	type OpgToothDetection,
	type OpgPathologyDetection,
} from "../opgTopologicalEngine";

const expect = (actual: any) => ({
	toBe: (expected: any) => assert.equal(actual, expected),
	toBeDefined: () => assert.notEqual(actual, undefined),
	toBeGreaterThan: (expected: number) => assert.ok(actual > expected),
	toBeLessThan: (expected: number) => assert.ok(actual < expected),
	toBeGreaterThanOrEqual: (expected: number) => assert.ok(actual >= expected),
	toContain: (substr: string) => assert.ok(typeof actual === "string" && actual.includes(substr)),
});

describe("Anchor-Guided Topological OPG Graph Matching Engine", () => {
	it("correctly identifies dental midline from tooth positions", () => {
		const teeth: OpgToothDetection[] = [
			{ id: 1, cx: 480, cy: 200, x1: 460, y1: 180, x2: 500, y2: 220, width: 40, height: 40, confidence: 0.9 },
			{ id: 2, cx: 520, cy: 200, x1: 500, y1: 180, x2: 540, y2: 220, width: 40, height: 40, confidence: 0.9 },
			{ id: 3, cx: 440, cy: 210, x1: 420, y1: 190, x2: 460, y2: 230, width: 40, height: 40, confidence: 0.9 },
			{ id: 4, cx: 560, cy: 210, x1: 540, y1: 190, x2: 580, y2: 230, width: 40, height: 40, confidence: 0.9 },
		];

		const midline = detectDentalMidline(teeth, 1000);
		// Midline should be between 480 and 520 -> 500
		expect(Math.abs(midline - 500) <= 1).toBe(true);
	});

	it("accurately partitions teeth into Upper and Lower jaws", () => {
		const teeth: OpgToothDetection[] = [
			// Upper teeth (Y around 200)
			{ id: 1, cx: 480, cy: 200, x1: 460, y1: 180, x2: 500, y2: 220, width: 40, height: 40, confidence: 0.9 },
			{ id: 2, cx: 520, cy: 205, x1: 500, y1: 180, x2: 540, y2: 220, width: 40, height: 40, confidence: 0.9 },
			// Lower teeth (Y around 400)
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
		// Quadrant 1 (Upper Right, on image left): Midline is at X = 500.
		// Teeth go outwards to the left (decreasing X):
		// Slot 1 (11): cx = 465 (spacing ~35)
		// Slot 2 (12): cx = 430 (spacing ~35)
		// Slot 3 (13): cx = 395 (spacing ~35)
		// Slot 4 (14): cx = 360 (spacing ~35)
		// Slot 5 (15): cx = 325 (spacing ~35)
		// GAP: Tooth 16 is missing!
		// Slot 7 (17): cx = 255 (jump of 70px = 2x spacing!)
		// Slot 8 (18): cx = 220 (spacing ~35)
		const q1Teeth: OpgToothDetection[] = [
			{ id: 11, cx: 465, cy: 200, x1: 450, y1: 180, x2: 480, y2: 220, width: 30, height: 40, confidence: 0.9 },
			{ id: 12, cx: 430, cy: 200, x1: 415, y1: 180, x2: 445, y2: 220, width: 30, height: 40, confidence: 0.9 },
			{ id: 13, cx: 395, cy: 200, x1: 380, y1: 180, x2: 410, y2: 220, width: 30, height: 40, confidence: 0.9 },
			{ id: 14, cx: 360, cy: 200, x1: 345, y1: 180, x2: 375, y2: 220, width: 30, height: 40, confidence: 0.9 },
			{ id: 15, cx: 325, cy: 200, x1: 310, y1: 180, x2: 340, y2: 220, width: 30, height: 40, confidence: 0.9 },
			// 16 is missing!
			{ id: 17, cx: 255, cy: 200, x1: 240, y1: 180, x2: 270, y2: 220, width: 30, height: 40, confidence: 0.9 },
			{ id: 18, cx: 220, cy: 200, x1: 205, y1: 180, x2: 235, y2: 220, width: 30, height: 40, confidence: 0.9 },
		];

		const assignments = assignQuadrantSlots(q1Teeth, 1, 500);

		// Tooth 11..15 must be assigned correctly
		expect(assignments.has(11)).toBe(true);
		expect(assignments.has(12)).toBe(true);
		expect(assignments.has(13)).toBe(true);
		expect(assignments.has(14)).toBe(true);
		expect(assignments.has(15)).toBe(true);

		// Tooth 16 must NOT be assigned because it was extracted!
		expect(assignments.has(16)).toBe(false);

		// Tooth 17 and 18 must be in their proper slots, NOT shifted into 16!
		expect(assignments.has(17)).toBe(true);
		expect(assignments.get(17)?.id).toBe(17);
		expect(assignments.has(18)).toBe(true);
		expect(assignments.get(18)?.id).toBe(18);
	});

	it("fuses impacted wisdom tooth pathology and updates Form 043/y odontogram state", () => {
		const teeth: OpgToothDetection[] = [
			// Lower right molar 47 and impacted 48
			{ id: 47, cx: 250, cy: 400, x1: 230, y1: 370, x2: 270, y2: 430, width: 40, height: 60, confidence: 0.9 },
			{ id: 48, cx: 180, cy: 410, x1: 150, y1: 380, x2: 210, y2: 440, width: 60, height: 60, confidence: 0.9 },
			// Lower left 31
			{ id: 31, cx: 520, cy: 400, x1: 505, y1: 380, x2: 535, y2: 420, width: 30, height: 40, confidence: 0.9 },
		];

		const pathologies: OpgPathologyDetection[] = [
			{
				id: "p1",
				label: "impacted_tooth",
				confidence: 0.88,
				x1: 150,
				y1: 380,
				x2: 210,
				y2: 440,
				cx: 180,
				cy: 410,
			},
			{
				id: "p2",
				label: "periapical_lesion",
				confidence: 0.75,
				x1: 235,
				y1: 420,
				x2: 265,
				y2: 445,
				cx: 250,
				cy: 432,
			},
		];

		const result = calculateOpgOdontogram(teeth, pathologies, 1000, 600);

		// Tooth 48 must be marked Retained
		expect(result.teeth[48]?.status).toBe("Retained");
		expect(result.teeth[48]?.clinicalDescriptionRu).toContain("Ретинированный зуб 48");

		// Tooth 47 must be marked Periodontitis due to periapical lesion
		expect(result.teeth[47]?.status).toBe("Periodontitis");

		// Unfound teeth must be marked Missing
		expect(result.teeth[11]?.status).toBe("Missing");

		// Protocol text must be generated
		expect(result.protocol043Ru).toContain("ПРОТОКОЛ АНАЛИЗА ОРТОПАНТОМОГРАММЫ (ОПТГ)");
		expect(result.protocol043Ru).toContain("Ретенция зубов: 48");
	});

	it("handles completely edentulous arch gracefully without throwing", () => {
		const emptyResult = calculateOpgOdontogram([], [], 1000, 600);
		expect(emptyResult.totalTeethDetected).toBe(0);
		expect(emptyResult.missingTeethCount).toBe(32);
		expect(emptyResult.protocol043Ru).toContain("Обнаружено зубов в зубной дуге: 0 из 32");
	});

	it("correctly maps full 32 dentition without slot collisions", () => {
		const full32Teeth: OpgToothDetection[] = [];
		const midlineX = 500;
		const spacing = 34;

		// Generate upper teeth: 18..11 (left of midline), 21..28 (right of midline)
		for (let slot = 8; slot >= 1; slot--) {
			const cx = midlineX - slot * spacing + spacing / 2;
			full32Teeth.push({
				id: `1${slot}`,
				cx,
				cy: 200,
				x1: cx - 15,
				y1: 180,
				x2: cx + 15,
				y2: 220,
				width: 30,
				height: 40,
				confidence: 0.95,
			});
		}
		for (let slot = 1; slot <= 8; slot++) {
			const cx = midlineX + slot * spacing - spacing / 2;
			full32Teeth.push({
				id: `2${slot}`,
				cx,
				cy: 200,
				x1: cx - 15,
				y1: 180,
				x2: cx + 15,
				y2: 220,
				width: 30,
				height: 40,
				confidence: 0.95,
			});
		}

		// Generate lower teeth: 48..41 (left of midline), 31..38 (right of midline)
		for (let slot = 8; slot >= 1; slot--) {
			const cx = midlineX - slot * spacing + spacing / 2;
			full32Teeth.push({
				id: `4${slot}`,
				cx,
				cy: 400,
				x1: cx - 15,
				y1: 380,
				x2: cx + 15,
				y2: 420,
				width: 30,
				height: 40,
				confidence: 0.95,
			});
		}
		for (let slot = 1; slot <= 8; slot++) {
			const cx = midlineX + slot * spacing - spacing / 2;
			full32Teeth.push({
				id: `3${slot}`,
				cx,
				cy: 400,
				x1: cx - 15,
				y1: 380,
				x2: cx + 15,
				y2: 420,
				width: 30,
				height: 40,
				confidence: 0.95,
			});
		}

		const res = calculateOpgOdontogram(full32Teeth, [], 1000, 600);
		expect(res.totalTeethDetected).toBe(32);
		expect(res.missingTeethCount).toBe(0);

		// Every single FDI slot 11..48 must be mapped and marked Healthy
		for (let q = 1; q <= 4; q++) {
			for (let s = 1; s <= 8; s++) {
				const fdi = q * 10 + s;
				expect(res.teeth[fdi]?.status).toBe("Healthy");
				expect(res.teeth[fdi]?.toothDetection).toBeDefined();
			}
		}
	});
});
