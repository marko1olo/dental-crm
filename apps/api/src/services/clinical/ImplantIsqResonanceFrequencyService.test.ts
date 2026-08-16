import { describe, it } from "node:test";
import assert from "node:assert";
import { ImplantIsqResonanceFrequencyService } from "./ImplantIsqResonanceFrequencyService.js";

describe("ImplantIsqResonanceFrequencyService", () => {
	it("should classify low stability correctly (ISQ < 60)", () => {
		const result = ImplantIsqResonanceFrequencyService.classifyIsqStability(55);
		assert.strictEqual(result.classification, "low");
		assert.strictEqual(result.protocolRu, "Двухэтапный протокол");
	});

	it("should classify medium stability correctly (60 <= ISQ < 70)", () => {
		const result = ImplantIsqResonanceFrequencyService.classifyIsqStability(65);
		assert.strictEqual(result.classification, "medium");
		assert.strictEqual(result.protocolRu, "Одноэтапный протокол");
	});

	it("should classify high stability correctly (ISQ >= 70)", () => {
		const result = ImplantIsqResonanceFrequencyService.classifyIsqStability(75);
		assert.strictEqual(result.classification, "high");
		assert.strictEqual(result.protocolRu, "Допуск к немедленной нагрузке");
	});

	it("should detect stability dip on 3-4 week", () => {
		const isDip = ImplantIsqResonanceFrequencyService.detectStabilityDip(70, 68, 3.5);
		assert.strictEqual(isDip, true);
	});

	it("should not detect stability dip outside 3-4 week", () => {
		const isDip = ImplantIsqResonanceFrequencyService.detectStabilityDip(70, 68, 1);
		assert.strictEqual(isDip, false);
	});

	it("should not detect stability dip if ISQ improved", () => {
		const isDip = ImplantIsqResonanceFrequencyService.detectStabilityDip(70, 72, 3.5);
		assert.strictEqual(isDip, false);
	});
});
