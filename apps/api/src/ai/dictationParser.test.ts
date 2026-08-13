import assert from "node:assert/strict";
import { test } from "node:test";
import { dictationTodayDate } from "./dictationParser.js";

test("dictationTodayDate tests", async (t) => {
  await t.test("returns UTC server date when timezone is missing", () => {
    const mockDate = new Date("2024-03-15T01:00:00Z");
    const result = dictationTodayDate(undefined, mockDate);
    assert.strictEqual(result, "2024-03-15");
  });

  await t.test("returns UTC server date when timezone is null", () => {
    const mockDate = new Date("2024-03-15T01:00:00Z");
    const result = dictationTodayDate(null, mockDate);
    assert.strictEqual(result, "2024-03-15");
  });

  await t.test(
    "applies positive timezone offset correctly (crossing midnight forward)",
    () => {
      // Server time: March 14, 23:00 UTC
      // Samara (UTC+4): March 15, 03:00
      const mockDate = new Date("2024-03-14T23:00:00Z");
      const result = dictationTodayDate("Europe/Samara", mockDate);
      assert.strictEqual(result, "2024-03-15");
    },
  );

  await t.test("applies positive timezone offset correctly (same day)", () => {
    // Server time: March 15, 12:00 UTC
    // Samara (UTC+4): March 15, 16:00
    const mockDate = new Date("2024-03-15T12:00:00Z");
    const result = dictationTodayDate("Europe/Samara", mockDate);
    assert.strictEqual(result, "2024-03-15");
  });

  await t.test(
    "applies negative timezone offset correctly (crossing midnight backward)",
    () => {
      // Server time: March 15, 02:00 UTC
      // New York (UTC-4/-5): March 14, 21:00/22:00
      const mockDate = new Date("2024-03-15T02:00:00Z");
      const result = dictationTodayDate("America/New_York", mockDate);
      assert.strictEqual(result, "2024-03-14");
    },
  );

  await t.test("falls back to server date on invalid timezone", () => {
    const mockDate = new Date("2024-03-15T01:00:00Z");
    const result = dictationTodayDate("Invalid/Timezone", mockDate);
    assert.strictEqual(result, "2024-03-15");
  });
});
