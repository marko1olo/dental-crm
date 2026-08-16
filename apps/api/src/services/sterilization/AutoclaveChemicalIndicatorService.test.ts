import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { AutoclaveChemicalIndicatorService } from "./AutoclaveChemicalIndicatorService.js";

describe("AutoclaveChemicalIndicatorService — Feature #274 Autoclave Chemical Indicators & PCD", () => {
	test("1. Validates standard Class B 134C sterilization cycle", () => {
		const result = AutoclaveChemicalIndicatorService.validateBClassCycle(134.5, 2.15, 5.5);
		assert.equal(result.isValid, true);
		assert.equal(result.errors.length, 0);
	});

	test("2. Rejects cycle with low pressure and insufficient holding time", () => {
		const result = AutoclaveChemicalIndicatorService.validateBClassCycle(134.0, 1.8, 3.0);
		assert.equal(result.isValid, false);
		assert.equal(result.errors.length, 2);
	});

	test("3. Quarantines tray batch when chemical indicator fails color change", () => {
		const evalResult = AutoclaveChemicalIndicatorService.evaluateIndicator("class_5", false);
		assert.equal(evalResult.status, "failed_quarantine");
		assert.equal(evalResult.isQuarantineRequired, true);
	});
});
