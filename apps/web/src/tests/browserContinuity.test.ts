import { describe, it } from "node:test";
import assert from "node:assert";
import { formatMegabytes } from "../browserContinuity.js";

describe("formatMegabytes", () => {
  it('returns "н/д" for null', () => {
    assert.strictEqual(formatMegabytes(null), "н/д");
  });

  it("formats 0 correctly", () => {
    assert.strictEqual(formatMegabytes(0), "0 МБ");
  });

  it("formats an integer value correctly", () => {
    assert.strictEqual(formatMegabytes(15), "15 МБ");
  });

  it("formats decimal values correctly using ru-RU locale (comma)", () => {
    assert.strictEqual(formatMegabytes(12.5), "12,5 МБ");
  });

  it("formats large numbers correctly with non-breaking space", () => {
    // 1024 toLocaleString('ru-RU') returns '1\xa0024' (where \xa0 is non-breaking space)
    assert.strictEqual(formatMegabytes(1024), "1\xa0024 МБ");
  });

  it("formats large decimal numbers correctly", () => {
    assert.strictEqual(formatMegabytes(1234.5), "1\xa0234,5 МБ");
  });
});
