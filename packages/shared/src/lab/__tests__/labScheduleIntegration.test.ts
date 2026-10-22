import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { evaluateAppointmentLabStatus } from "../labScheduleIntegration.js";

describe("Shared Dental Lab — labScheduleIntegration Smoke Facade", () => {
	test("evaluateAppointmentLabStatus handles null", () => {
		assert.equal(evaluateAppointmentLabStatus(null), null);
	});
});
