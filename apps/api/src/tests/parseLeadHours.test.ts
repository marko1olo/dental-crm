import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseLeadHours } from "../services/communications/dispatcher.js";

describe("parseLeadHours", () => {
	test("parses valid JSON array of numbers and sorts descending", () => {
		const result = parseLeadHours("[12, 48, 24]");
		assert.deepEqual(result, [48, 24, 12]);
	});

	test("parses string numbers and converts to numbers", () => {
		const result = parseLeadHours("[\"12\", \"24.5\"]");
		assert.deepEqual(result, [24.5, 12]);
	});

	test("deduplicates values", () => {
		const result = parseLeadHours("[24, 24, 48]");
		assert.deepEqual(result, [48, 24]);
	});

	test("filters out non-positive and out-of-bounds values", () => {
		const result = parseLeadHours("[0, -12, 24, 721, 800]");
		assert.deepEqual(result, [24]);
	});

	test("filters out unparseable string values", () => {
		const result = parseLeadHours("[24, \"abc\", {}]");
		assert.deepEqual(result, [24]);
	});

	test("returns default [24] for invalid JSON", () => {
		const result = parseLeadHours("{");
		assert.deepEqual(result, [24]);
	});

	test("returns default [24] for non-array JSON", () => {
		const result = parseLeadHours("{\"hours\": 24}");
		assert.deepEqual(result, [24]);
	});

	test("returns default [24] for empty array", () => {
		const result = parseLeadHours("[]");
		assert.deepEqual(result, [24]);
	});

	test("returns default [24] for array with only invalid values", () => {
		const result = parseLeadHours("[-12, \"abc\"]");
		assert.deepEqual(result, [24]);
	});
});
