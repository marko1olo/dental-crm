import { test } from "node:test";
import assert from "node:assert";
import {
	combinedStatus,
	type CtPlanningValidationCheck,
} from "./ctPlanningValidation.js";

function createCheck(
	status: "pass" | "warn" | "fail",
): CtPlanningValidationCheck {
	return {
		id: "test",
		title: "test",
		status,
		value: "test",
		detail: "test",
	};
}

test("combinedStatus", async (t) => {
	await t.test("returns 'pass' when array is empty", () => {
		assert.strictEqual(combinedStatus([]), "pass");
	});

	await t.test("returns 'pass' when all checks are 'pass'", () => {
		const checks = [createCheck("pass"), createCheck("pass")];
		assert.strictEqual(combinedStatus(checks), "pass");
	});

	await t.test("returns 'warn' when at least one check is 'warn'", () => {
		const checks = [createCheck("pass"), createCheck("warn"), createCheck("pass")];
		assert.strictEqual(combinedStatus(checks), "warn");
	});

	await t.test("returns 'fail' when at least one check is 'fail'", () => {
		const checks = [createCheck("pass"), createCheck("fail"), createCheck("pass")];
		assert.strictEqual(combinedStatus(checks), "fail");
	});

	await t.test("returns 'fail' when both 'fail' and 'warn' are present", () => {
		const checks = [createCheck("warn"), createCheck("fail")];
		assert.strictEqual(combinedStatus(checks), "fail");
	});
});
