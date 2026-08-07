import assert from "node:assert";
import { describe, it } from "node:test";
import { getIcdColor, ICD_GROUP_COLORS } from "./icd10.js";

describe("getIcdColor", () => {
	it("should return the correct color for a known code (Кариес)", () => {
		const result = getIcdColor("K02.0");
		assert.strictEqual(result, ICD_GROUP_COLORS.Кариес);
	});

	it("should return the correct color for a known code (Пульпа)", () => {
		const result = getIcdColor("K04.0");
		assert.strictEqual(result, ICD_GROUP_COLORS.Пульпа);
	});

	it("should return the correct color for a known code (Другое)", () => {
		const result = getIcdColor("K03.0");
		assert.strictEqual(result, ICD_GROUP_COLORS.Другое);
	});

	it("should return the fallback color for an unknown code", () => {
		const result = getIcdColor("UNKNOWN.CODE");
		assert.strictEqual(result, ICD_GROUP_COLORS.Другое);
	});
});
