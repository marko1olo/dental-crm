import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { opgAiInferenceService } from "../opgAiInferenceService";
import { calculateOpgOdontogram, type OpgToothDetection, type OpgPathologyDetection } from "../opgTopologicalEngine";

const expect = (actual: any) => ({
	toBe: (expected: any) => assert.equal(actual, expected),
	toBeDefined: () => assert.notEqual(actual, undefined),
	toBeGreaterThan: (expected: number) => assert.ok(actual > expected),
	toBeGreaterThanOrEqual: (expected: number) => assert.ok(actual >= expected),
	toContain: (substr: string) => assert.ok(typeof actual === "string" && actual.includes(substr)),
});

describe("SMART-OPG-01: AI Inference Service & Fallback Pipeline", () => {
	it("returns 32 detected teeth and accurate pathologies for Temur dataset", async () => {
		const response = await opgAiInferenceService.runInference("sample_opg_temur.png", { allowFallback: true });
		expect(response).toBeDefined();
		expect(response.latencyMs).toBeGreaterThan(0);
		expect(response.analysis.totalTeethDetected).toBe(32);
		expect(response.analysis.pathologiesCount).toBeGreaterThanOrEqual(1);
	});

	it("generates valid Form 043/y clinical text protocol with Russian nomenclature", async () => {
		const response = await opgAiInferenceService.runInference("sample_opg_temur.png", { allowFallback: true });
		const protocol = response.analysis.protocol043Ru;
		expect(protocol).toContain("ПРОТОКОЛ АНАЛИЗА ОРТОПАНТОМОГРАММЫ (ОПТГ)");
		expect(protocol).toContain("Медицинская карта пациента");
		expect(protocol).toContain("ЗАКЛЮЧЕНИЕ ОПТГ");
	});
});

describe("SMART-OPG-02: Topological Arch Matching & Missing Tooth Gap Invariant", () => {
	it("preserves correct slot indices when tooth 47 is extracted (no index-shift cascade)", () => {
		const teeth: OpgToothDetection[] = [
			{ id: 31, cx: 520, cy: 380, x1: 510, y1: 360, x2: 530, y2: 400, width: 20, height: 40, confidence: 0.95 },
			{ id: 41, cx: 480, cy: 380, x1: 470, y1: 360, x2: 490, y2: 400, width: 20, height: 40, confidence: 0.95 },
			{ id: 42, cx: 445, cy: 380, x1: 435, y1: 360, x2: 455, y2: 400, width: 20, height: 40, confidence: 0.95 },
			{ id: 43, cx: 410, cy: 380, x1: 400, y1: 360, x2: 420, y2: 400, width: 20, height: 40, confidence: 0.95 },
			{ id: 44, cx: 375, cy: 380, x1: 365, y1: 360, x2: 385, y2: 400, width: 20, height: 40, confidence: 0.95 },
			{ id: 45, cx: 340, cy: 380, x1: 330, y1: 360, x2: 350, y2: 400, width: 20, height: 40, confidence: 0.95 },
			{ id: 46, cx: 300, cy: 380, x1: 285, y1: 360, x2: 315, y2: 400, width: 30, height: 40, confidence: 0.95 },
			{ id: 48, cx: 180, cy: 380, x1: 165, y1: 360, x2: 195, y2: 400, width: 30, height: 40, confidence: 0.95 },
		];
		const result = calculateOpgOdontogram(teeth, [], 1000, 600);
		expect(result.teeth[46]?.status).toBe("Healthy");
		expect(result.teeth[47]?.status).toBe("Missing");
		expect(result.teeth[48]?.status).toBe("Healthy");
	});

	it("fuses impacted wisdom tooth pathology into slot 48 as Retained", () => {
		const teeth: OpgToothDetection[] = [
			{ id: 31, cx: 520, cy: 400, x1: 510, y1: 380, x2: 530, y2: 420, width: 20, height: 40, confidence: 0.95 },
			{ id: 41, cx: 480, cy: 400, x1: 470, y1: 380, x2: 490, y2: 420, width: 20, height: 40, confidence: 0.95 },
			{ id: 48, cx: 180, cy: 400, x1: 160, y1: 380, x2: 200, y2: 420, width: 40, height: 40, confidence: 0.92 },
		];
		const pathologies: OpgPathologyDetection[] = [
			{ id: "p1", label: "impacted_tooth", confidence: 0.94, cx: 182, cy: 400, x1: 160, y1: 380, x2: 200, y2: 420 },
		];
		const result = calculateOpgOdontogram(teeth, pathologies, 1000, 600);
		expect(result.teeth[48]?.status).toBe("Retained");
		expect(result.teeth[48]?.clinicalDescriptionRu).toContain("Ретинированный зуб 48");
	});
});
