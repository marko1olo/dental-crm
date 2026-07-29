import { describe, test } from "node:test";
import assert from "node:assert";
import { normalizeDate } from "../utils/dates.js";

describe("normalizeDate", () => {
  test("returns null for null or empty strings", () => {
    assert.strictEqual(normalizeDate(null), null);
    assert.strictEqual(normalizeDate(""), null);
  });

  test("normalizes dates with dot separator and pads zeros", () => {
    assert.strictEqual(normalizeDate("1.2.2023"), "2023-02-01");
    assert.strictEqual(normalizeDate("01.12.2024"), "2024-12-01");
  });

  test("normalizes dates with slash separator", () => {
    assert.strictEqual(normalizeDate("12/3/2023"), "2023-03-12");
  });

  test("normalizes dates with dash separator", () => {
    assert.strictEqual(normalizeDate("5-6-2024"), "2024-06-05");
  });

  test("trims whitespace from input", () => {
    assert.strictEqual(normalizeDate("  1.2.2023  "), "2023-02-01");
    assert.strictEqual(normalizeDate("  invalid  "), "invalid");
  });

  test("returns the trimmed original string if it doesn't match the format", () => {
    assert.strictEqual(normalizeDate("2023-01-01"), "2023-01-01");
    assert.strictEqual(normalizeDate("invalid string"), "invalid string");
    assert.strictEqual(normalizeDate("1.2.23"), "1.2.23");
  });
});
