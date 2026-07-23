import { test, describe } from "node:test";
import assert from "node:assert";
import { validScheduleTimeZone } from "./telegram/legacyMocks.js";
describe("validScheduleTimeZone", () => {
    test("returns default timezone for invalid timezone", () => {
        assert.strictEqual(validScheduleTimeZone("Invalid/Timezone"), "Europe/Samara");
    });
    test("returns default timezone for null", () => {
        assert.strictEqual(validScheduleTimeZone(null), "Europe/Samara");
    });
    test("returns default timezone for undefined", () => {
        assert.strictEqual(validScheduleTimeZone(undefined), "Europe/Samara");
    });
    test("returns default timezone for empty string", () => {
        assert.strictEqual(validScheduleTimeZone(""), "Europe/Samara");
    });
    test("returns default timezone for whitespace string", () => {
        assert.strictEqual(validScheduleTimeZone("   "), "Europe/Samara");
    });
    test("returns the provided valid timezone", () => {
        assert.strictEqual(validScheduleTimeZone("America/New_York"), "America/New_York");
    });
    test("trims whitespace from valid timezone strings", () => {
        assert.strictEqual(validScheduleTimeZone("  Europe/Moscow  "), "Europe/Moscow");
    });
});
