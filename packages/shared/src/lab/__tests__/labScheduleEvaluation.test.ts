import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	evaluateAppointmentLabStatus,
	type MinimalLabOrderForSchedule,
} from "../labScheduleIntegration.js";

describe("Shared Dental Lab — evaluateAppointmentLabStatus", () => {
	test("returns null for empty order or finished/cancelled statuses", () => {
		assert.equal(evaluateAppointmentLabStatus(null), null);
		assert.equal(evaluateAppointmentLabStatus(undefined), null);

		const completedOrder: MinimalLabOrderForSchedule = {
			id: "ord_1",
			status: "completed",
			patientId: "pat_1",
		};
		assert.equal(evaluateAppointmentLabStatus(completedOrder), null);

		const cancelledOrder: MinimalLabOrderForSchedule = {
			id: "ord_2",
			status: "cancelled",
			patientId: "pat_1",
		};
		assert.equal(evaluateAppointmentLabStatus(cancelledOrder), null);
	});

	test("correctly identifies ready_in_clinic state and overdue state", () => {
		const order: MinimalLabOrderForSchedule = {
			id: "ord_100",
			orderNumber: "ЗТЛ-100",
			status: "ready_in_clinic",
			patientId: "pat_1",
			toothFdi: "16",
			workType: "Коронка ZrO2",
			colorVita: "A2",
		};
		const status = evaluateAppointmentLabStatus(order);
		assert.ok(status);
		assert.equal(status.state, "ready_in_clinic");
		assert.equal(status.labelRu, "Поступил в клинику");

		const orderOverdue: MinimalLabOrderForSchedule = {
			id: "ord_200",
			orderNumber: "ЗТЛ-200",
			status: "in_production",
			patientId: "pat_2",
			dueDate: "2026-10-01T12:00:00Z",
		};
		const refDate = new Date("2026-10-03T12:00:00Z");
		const statusOverdue = evaluateAppointmentLabStatus(orderOverdue, refDate);
		assert.ok(statusOverdue);
		assert.equal(statusOverdue.state, "overdue");
		assert.equal(statusOverdue.daysOverdue, 2);
	});
});
