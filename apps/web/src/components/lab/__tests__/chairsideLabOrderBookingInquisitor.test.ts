import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ORTHOPEDIC_WORK_TYPES } from "../dentalLabWorkflowEngine";

describe("chairsideLabOrderBookingInquisitor — Smoke Facade", () => {
	test("ORTHOPEDIC_WORK_TYPES are defined", () => {
		assert.ok(Object.keys(ORTHOPEDIC_WORK_TYPES).length >= 4);
	});
});
