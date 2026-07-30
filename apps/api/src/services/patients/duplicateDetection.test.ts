import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { nameKey, pairKey, phoneKey, surnameOf } from "./duplicateDetection.js";

describe("nameKey", () => {
	test("should convert to lowercase", () => {
		assert.equal(nameKey("ИВАНОВ"), "иванов");
	});
	test("should replace 'ё' with 'е'", () => {
		assert.equal(nameKey("Семёнов Семён"), "семенов семен");
	});
	test("should strip non-letters except spaces and hyphens", () => {
		assert.equal(nameKey("Иванов, Иван! (Сергеевич)"), "иванов иван сергеевич");
	});
	test("should collapse multiple spaces", () => {
		assert.equal(nameKey("Иванов   Иван    Иванович"), "иванов иван иванович");
	});
	test("should trim leading and trailing spaces", () => {
		assert.equal(nameKey("  Иванов Иван  "), "иванов иван");
	});
	test("should preserve hyphens for compound names", () => {
		assert.equal(nameKey("Салтыков-Щедрин Михаил"), "салтыков-щедрин михаил");
	});
});

describe("phoneKey", () => {
	test("should return null for null input", () => {
		assert.equal(phoneKey(null), null);
	});
	test("should extract digits and return last 10", () => {
		assert.equal(phoneKey("+7 (916) 123-45-67"), "9161234567");
		assert.equal(phoneKey("89161234567"), "9161234567");
	});
	test("should handle non-digit characters", () => {
		assert.equal(phoneKey("916-123-45-67!"), "9161234567");
	});
	test("should return null if less than 10 digits", () => {
		assert.equal(phoneKey("1234567"), null);
	});
	test("should handle empty string", () => {
		assert.equal(phoneKey(""), null);
	});
});

describe("surnameOf", () => {
	test("should extract the first word of the normalized name", () => {
		assert.equal(surnameOf("Иванов Иван Иванович"), "иванов");
	});
	test("should handle double spaces and extra characters", () => {
		assert.equal(surnameOf("  Иванов   Иван  "), "иванов");
	});
	test("should handle hyphens in surname", () => {
		assert.equal(surnameOf("Петрова-Водкина Анна"), "петрова-водкина");
	});
	test("should return empty string for empty input", () => {
		assert.equal(surnameOf(""), "");
	});
});

describe("pairKey", () => {
	test("should create a stable key regardless of order", () => {
		assert.equal(pairKey("a", "b"), "a|b");
		assert.equal(pairKey("b", "a"), "a|b");
	});
	test("should handle UUIDs correctly", () => {
		const id1 = "123e4567-e89b-12d3-a456-426614174000";
		const id2 = "987e6543-e21b-34d3-a456-426614174000";
		assert.equal(pairKey(id1, id2), `${id1}|${id2}`);
		assert.equal(pairKey(id2, id1), `${id1}|${id2}`);
	});
});
