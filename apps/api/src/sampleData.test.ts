import assert from "node:assert";
import { describe, test } from "node:test";
import {
	safeDenteTelegramPublicHttpsUrl,
	validScheduleTimeZone,
} from "./sampleData.js";

describe("validScheduleTimeZone", () => {
	test("returns default timezone for invalid timezone", () => {
		assert.strictEqual(
			validScheduleTimeZone("Invalid/Timezone"),
			"Europe/Samara",
		);
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
		assert.strictEqual(
			validScheduleTimeZone("America/New_York"),
			"America/New_York",
		);
	});

	test("trims whitespace from valid timezone strings", () => {
		assert.strictEqual(
			validScheduleTimeZone("  Europe/Moscow  "),
			"Europe/Moscow",
		);
	});
});

describe("safeDenteTelegramPublicHttpsUrl", () => {
	test("returns valid URL string for a valid https URL", () => {
		assert.strictEqual(
			safeDenteTelegramPublicHttpsUrl("testField", "https://example.com/path"),
			"https://example.com/path",
		);
	});

	test("returns null for an invalid URL string", () => {
		assert.strictEqual(
			safeDenteTelegramPublicHttpsUrl("testField", "not-a-valid-url"),
			null,
		);
	});

	test("returns null for a non-https URL", () => {
		assert.strictEqual(
			safeDenteTelegramPublicHttpsUrl("testField", "http://example.com/path"),
			null,
		);
	});

	test("returns null for empty string or null/undefined", () => {
		assert.strictEqual(safeDenteTelegramPublicHttpsUrl("testField", ""), null);
		assert.strictEqual(
			safeDenteTelegramPublicHttpsUrl("testField", null),
			null,
		);
		assert.strictEqual(
			safeDenteTelegramPublicHttpsUrl("testField", undefined),
			null,
		);
	});

	test("returns null for URL with username/password", () => {
		assert.strictEqual(
			safeDenteTelegramPublicHttpsUrl(
				"testField",
				"https://user:pass@example.com",
			),
			null,
		);
	});
});
