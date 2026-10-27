import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	getAllWarrantyPresets,
	MANDATORY_WARRANTY_CONDITIONS,
	STAR_QUICK_PRESETS,
	VITA_SHADES,
} from "../index.js";

describe("Warranty Presets Decomposition: Master Verification", () => {
	test("verifies core presets and conditions load properly", () => {
		assert.equal(getAllWarrantyPresets().length, 8);
		assert.equal(MANDATORY_WARRANTY_CONDITIONS.length, 9);
		assert.equal(VITA_SHADES.length, 55);
		assert.equal(STAR_QUICK_PRESETS.length, 4);
	});
});
