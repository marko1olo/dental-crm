import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	evaluateAppointmentLabStatus,
	getPatientActiveLabStatus,
	type MinimalLabOrderForSchedule,
} from "../labScheduleIntegration.js";

describe("Shared Dental Lab — Lab Schedule Integration (Appointment Badges)", () => {
	test("evaluateAppointmentLabStatus returns null for empty order or finished/cancelled statuses", () => {
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

		const deliveredOrder: MinimalLabOrderForSchedule = {
			id: "ord_3",
			status: "delivered_to_patient",
			patientId: "pat_1",
		};
		assert.equal(evaluateAppointmentLabStatus(deliveredOrder), null);
	});

	test("evaluateAppointmentLabStatus correctly identifies ready_in_clinic state", () => {
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
		assert.equal(status.shortLabelRu, "В клинике");
		assert.equal(status.toothFdi, "16");
		assert.equal(status.colorVita, "A2");
		assert.equal(status.isOverdue, false);
		assert.equal(status.daysOverdue, 0);

		// Also when receivedDate is set
		const orderWithReceived: MinimalLabOrderForSchedule = {
			id: "ord_101",
			status: "in_progress",
			receivedDate: new Date("2026-10-01T10:00:00Z"),
		};
		const statusReceived = evaluateAppointmentLabStatus(orderWithReceived);
		assert.ok(statusReceived);
		assert.equal(statusReceived.state, "ready_in_clinic");
	});

	test("evaluateAppointmentLabStatus detects overdue orders when due date is in the past", () => {
		const order: MinimalLabOrderForSchedule = {
			id: "ord_200",
			orderNumber: "ЗТЛ-200",
			status: "in_production",
			patientId: "pat_2",
			dueDate: "2026-10-01T12:00:00Z",
		};
		const refDate = new Date("2026-10-03T12:00:00Z");
		const status = evaluateAppointmentLabStatus(order, refDate);
		assert.ok(status);
		assert.equal(status.state, "overdue");
		assert.equal(status.isOverdue, true);
		assert.equal(status.daysOverdue, 2);
		assert.ok(status.labelRu.includes("Просрочен на 2 дн."));
		assert.equal(status.shortLabelRu, "Просрочен");
	});

	test("evaluateAppointmentLabStatus returns in_lab when due date is in the future", () => {
		const order: MinimalLabOrderForSchedule = {
			id: "ord_300",
			status: "casting",
			patientId: "pat_3",
			dueDate: "2026-10-10T12:00:00Z",
		};
		const refDate = new Date("2026-10-03T12:00:00Z");
		const status = evaluateAppointmentLabStatus(order, refDate);
		assert.ok(status);
		assert.equal(status.state, "in_lab");
		assert.equal(status.isOverdue, false);
		assert.equal(status.shortLabelRu, "В ЗТЛ");
	});

	test("getPatientActiveLabStatus prioritizes overdue over ready_in_clinic and in_lab", () => {
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
