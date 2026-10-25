import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateOpgOdontogram,
	type OpgToothDetection,
	type OpgPathologyDetection,
} from "../opgTopologicalEngine";

const expect = (actual: any) => ({
	toBe: (expected: any) => assert.equal(actual, expected),
	toBeDefined: () => assert.notEqual(actual, undefined),
	toContain: (substr: string) => assert.ok(typeof actual === "string" && actual.includes(substr)),
});

describe("OPG Topological Graph Matching — Pathology & Complete Dentition", () => {
	it("fuses impacted wisdom tooth pathology and updates Form 043/y odontogram state", () => {
		const teeth: OpgToothDetection[] = [
			{ id: 47, cx: 250, cy: 400, x1: 230, y1: 370, x2: 270, y2: 430, width: 40, height: 60, confidence: 0.9 },
			{ id: 48, cx: 180, cy: 410, x1: 150, y1: 380, x2: 210, y2: 440, width: 60, height: 60, confidence: 0.9 },
			{ id: 31, cx: 520, cy: 400, x1: 505, y1: 380, x2: 535, y2: 420, width: 30, height: 40, confidence: 0.9 },
		];

		const pathologies: OpgPathologyDetection[] = [
			{ id: "p1", label: "impacted_tooth", confidence: 0.88, x1: 150, y1: 380, x2: 210, y2: 440, cx: 180, cy: 410 },
			{ id: "p2", label: "periapical_lesion", confidence: 0.75, x1: 235, y1: 420, x2: 265, y2: 445, cx: 250, cy: 432 },
		];

		const result = calculateOpgOdontogram(teeth, pathologies, 1000, 600);
		expect(result.teeth[48]?.status).toBe("Retained");
		expect(result.teeth[48]?.clinicalDescriptionRu).toContain("Ретинированный зуб 48");
		expect(result.teeth[47]?.status).toBe("Periodontitis");
		expect(result.teeth[11]?.status).toBe("Missing");
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

		for (let slot = 8; slot >= 1; slot--) {
			const cx = midlineX - slot * spacing + spacing / 2;
			full32Teeth.push({ id: `1${slot}`, cx, cy: 200, x1: cx - 15, y1: 180, x2: cx + 15, y2: 220, width: 30, height: 40, confidence: 0.95 });
		}
		for (let slot = 1; slot <= 8; slot++) {
			const cx = midlineX + slot * spacing - spacing / 2;
			full32Teeth.push({ id: `2${slot}`, cx, cy: 200, x1: cx - 15, y1: 180, x2: cx + 15, y2: 220, width: 30, height: 40, confidence: 0.95 });
		}
		for (let slot = 8; slot >= 1; slot--) {
			const cx = midlineX - slot * spacing + spacing / 2;
			full32Teeth.push({ id: `4${slot}`, cx, cy: 400, x1: cx - 15, y1: 380, x2: cx + 15, y2: 420, width: 30, height: 40, confidence: 0.95 });
		}
		for (let slot = 1; slot <= 8; slot++) {
			const cx = midlineX + slot * spacing - spacing / 2;
			full32Teeth.push({ id: `3${slot}`, cx, cy: 400, x1: cx - 15, y1: 380, x2: cx + 15, y2: 420, width: 30, height: 40, confidence: 0.95 });
		}

		const res = calculateOpgOdontogram(full32Teeth, [], 1000, 600);
		expect(res.totalTeethDetected).toBe(32);
		expect(res.missingTeethCount).toBe(0);

		for (let q = 1; q <= 4; q++) {
			for (let s = 1; s <= 8; s++) {
				const fdi = q * 10 + s;
				expect(res.teeth[fdi]?.status).toBe("Healthy");
				expect(res.teeth[fdi]?.toothDetection).toBeDefined();
			}
		}
	});
});
