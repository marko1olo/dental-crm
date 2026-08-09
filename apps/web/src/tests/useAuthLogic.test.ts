import assert from "node:assert";
import { describe, test } from "node:test";
import { determineAdminSecretUnlockDomain } from "../hooks/domains/useAuthLogic.js";

describe("determineAdminSecretUnlockDomain", () => {
	test("returns 'all' when unlock is required", () => {
		assert.strictEqual(
			determineAdminSecretUnlockDomain(true, true, "clinical", "general", null),
			"all",
		);
	});

	test("returns 'all' when dashboard is missing", () => {
		assert.strictEqual(
			determineAdminSecretUnlockDomain(false, false, "clinical", "general", null),
			"all",
		);
	});

	test("returns 'schedule' for schedule view", () => {
		assert.strictEqual(
			determineAdminSecretUnlockDomain(false, true, "schedule", "general", null),
			"schedule",
		);
	});

	test("returns 'telegram' for settings view with telegram tab", () => {
		assert.strictEqual(
			determineAdminSecretUnlockDomain(false, true, "settings", "telegram", null),
			"telegram",
		);
	});

	test("returns 'settings' for settings view with other tabs", () => {
		assert.strictEqual(
			determineAdminSecretUnlockDomain(false, true, "settings", "general", null),
			"settings",
		);
	});

	test("returns 'telegram' when onboarding step is telegram", () => {
		assert.strictEqual(
			determineAdminSecretUnlockDomain(false, true, "clinical", "general", "telegram"),
			"telegram",
		);
	});

	test("returns 'clinical' as default", () => {
		assert.strictEqual(
			determineAdminSecretUnlockDomain(false, true, "clinical", "general", null),
			"clinical",
		);
	});
});
