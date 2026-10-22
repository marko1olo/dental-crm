import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	getPatientActiveLabStatus,
	type MinimalLabOrderForSchedule,
} from "../labScheduleIntegration.js";

describe("Shared Dental Lab — getPatientActiveLabStatus", () => {
	test("prioritizes overdue over ready_in_clinic and in_lab", () => {
		const orders: MinimalLabOrderForSchedule[] = [
			{
				id: "ord_ready",
				patientId: "pat_priority",
				status: "ready_in_clinic",
			},
			{
				id: "ord_overdue",
				patientId: "pat_priority",
				status: "in_production",
				dueDate: "2026-10-01T12:00:00Z",
			},
			{
				id: "ord_future",
				patientId: "pat_priority",
				status: "in_production",
				dueDate: "2026-10-15T12:00:00Z",
			},
		];

		const refDate = new Date("2026-10-03T12:00:00Z");
		const result = getPatientActiveLabStatus(orders, "pat_priority", refDate);
		assert.ok(result);
		assert.equal(result.orderId, "ord_overdue");
		assert.equal(result.state, "overdue");
	});
});
