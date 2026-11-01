/**
 * crmSchedulingBooking.test.ts — Scheduling, Appointment Booking & Shift Intelligence Test Suite.
 *
 * Verifies scheduling tools under Mandate 8e (Doctor Autonomy & Zero Bureaucracy):
 * 1. book_appointment (no mandatory assistant)
 * 2. reschedule_appointment (updates timeline)
 * 3. cancel_appointment (cancellation reason)
 * 4. get_doctor_schedule (slots and free windows)
 * 5. get_daily_patients (daily roster)
 * 6. get_doctor_shifts (weekly shifts and chairs)
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import type { AgentContext } from "../../context.js";
import {
	bookAppointmentTool,
	cancelAppointmentTool,
	getDailyPatientsTool,
	getDoctorScheduleTool,
	getDoctorShiftsTool,
	registerCrmUniversalTools,
	rescheduleAppointmentTool,
} from "../crmUniversalTools.js";
import { ToolRegistry } from "../registry.js";

const ORG_ID = "00000000-0000-7000-8000-000000000001";
const CLINIC_ID = "00000000-0000-7000-8000-000000000002";
const DOCTOR_ID = "00000000-0000-7000-8000-000000000003";

function createTestContext(overrides: Partial<AgentContext> = {}): AgentContext {
	const registry = new ToolRegistry();
	registerCrmUniversalTools(registry, "crm");

	return {
		organizationId: ORG_ID,
		clinicId: CLINIC_ID,
		userId: DOCTOR_ID,
		sessionId: "test-session-crm-scheduling",
		mode: "autonomous",
		role: "doctor",
		permissions: [
			"schedule.read",
			"schedule.write",
			"schedule.cancel",
			"clinical.read",
		],
		tools: registry,
		db: null,
		...overrides,
	};
}

describe("1. Scheduling & Visit Tools (Mandate 8l & 8e)", () => {
	test("book_appointment books appointment without requiring assistant (Doctor Autonomy Mandate 8e)", async () => {
		const ctx = createTestContext();
		const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
		const result = await bookAppointmentTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000010",
			doctorUserId: DOCTOR_ID,
			startsAt,
			durationMinutes: 45,
			reason: "Лечение кариеса 46",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.status, "planned");
		assert.strictEqual(result.assistantAssigned, false); // Assistant is optional!
		assert.ok(result.appointmentId.length > 0);
	});

	test("reschedule_appointment updates start and end time", async () => {
		const ctx = createTestContext();
		const newStartsAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
		const result = await rescheduleAppointmentTool.handler(ctx, {
			appointmentId: "app_test_123",
			newStartsAt,
			durationMinutes: 60,
			reason: "Пациент попросил перенести на вечер",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.newStartsAt, newStartsAt);
		assert.ok(result.newEndsAt.length > 0);
	});

	test("cancel_appointment performs destructive cancellation with mandatory reason", async () => {
		const ctx = createTestContext();
		const result = await cancelAppointmentTool.handler(ctx, {
			appointmentId: "app_test_123",
			reason: "Острая простуда у пациента",
			cancelledBy: "patient",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.status, "cancelled");
		assert.strictEqual(result.reason, "Острая простуда у пациента");
	});

	test("get_doctor_schedule returns schedule slots and available windows", async () => {
		const ctx = createTestContext();
		const result = await getDoctorScheduleTool.handler(ctx, {
			doctorUserId: DOCTOR_ID,
			date: "2026-10-15",
			days: 1,
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.doctorUserId, DOCTOR_ID);
		assert.ok(result.appointments.length > 0);
		assert.ok(result.availableSlotsPreview.length > 0);
	});

	test("get_daily_patients returns scheduled patients list with card status", async () => {
		const ctx = createTestContext();
		const result = (await getDailyPatientsTool.handler(ctx, {
			date: "2026-10-03",
			statusFilter: "all",
		})) as any;

		assert.strictEqual(result.success, true);
		assert.ok(result.totalPatients > 0);
		assert.ok(result.patients.length > 0);
		assert.ok(result.patients[0].patientFullName.length > 0);
		assert.ok(result.summaryRu.includes("СПИСОК ПАЦИЕНТОВ"));
	});

	test("get_doctor_shifts returns doctor weekly shift schedule with free windows", async () => {
		const ctx = createTestContext();
		const result = (await getDoctorShiftsTool.handler(ctx, {
			startDate: "2026-10-05",
			days: 7,
		})) as any;

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.daysCount, 7);
		assert.strictEqual(result.shifts.length, 7);
		assert.ok(result.summaryRu.includes("ГРАФИК СМЕН"));
	});
});
