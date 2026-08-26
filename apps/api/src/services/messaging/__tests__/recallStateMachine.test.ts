/**
 * Recall State Machine Unit Tests
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
	addMonthsToDueMonth,
	normalizeDueMonth,
	RecallStateMachine,
} from "../recallStateMachine.js";
import type { RecallItem } from "../types.js";

function createMockRecall(overrides: Partial<RecallItem> = {}): RecallItem {
	return {
		id: "recall-uuid-1",
		organizationId: "org-uuid-1",
		patientId: "patient-uuid-1",
		dueMonth: "2026-09-01",
		dueDate: null,
		reason: "hygiene",
		reasonNote: null,
		priority: "normal",
		status: "pending",
		contactAttemptCount: 0,
		lastContactAttemptAt: null,
		linkedAppointmentId: null,
		linkedTreatmentId: null,
		linkedTreatmentCategoryKey: "preventive",
		assignedProfessionalId: null,
		completedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

describe("Recall State Machine Unit Tests", () => {
	it("normalizes and adds due months accurately", () => {
		const now = new Date("2026-08-15T12:00:00Z");
		assert.equal(normalizeDueMonth(now), "2026-08-01");

		assert.equal(addMonthsToDueMonth("2026-08-01", 6), "2027-02-01");
		assert.equal(addMonthsToDueMonth("2026-11-01", 2), "2027-01-01");
		assert.equal(addMonthsToDueMonth("2026-05-01", 1), "2026-06-01");
	});

	it("transitions to contacted_no_answer on outbound dispatch", () => {
		const recall = createMockRecall({ status: "pending" });
		const result = RecallStateMachine.transition(recall, {
			type: "OUTBOUND_DISPATCHED",
			channel: "whatsapp",
		});

		assert.equal(result.previousStatus, "pending");
		assert.equal(result.newStatus, "contacted_no_answer");
	});

	it("transitions to contacted_scheduled on positive inbound text reply or button", () => {
		const recall = createMockRecall({ status: "contacted_no_answer" });

		// Text "Подтверждаю"
		const res1 = RecallStateMachine.transition(recall, {
			type: "INBOUND_REPLY",
			text: "Да, я подтверждаю приём",
		});
		assert.equal(res1.newStatus, "contacted_scheduled");

		// Button APPT_CONFIRM
		const res2 = RecallStateMachine.transition(recall, {
			type: "INBOUND_REPLY",
			text: "Подтверждаю",
			interactivePayload: { type: "button_reply", buttonId: "APPT_CONFIRM" },
		});
		assert.equal(res2.newStatus, "contacted_scheduled");
	});

	it("transitions to contacted_declined on negative reply", () => {
		const recall = createMockRecall({ status: "contacted_no_answer" });

		const res = RecallStateMachine.transition(recall, {
			type: "INBOUND_REPLY",
			text: "К сожалению, не смогу прийти",
			interactivePayload: { type: "button_reply", buttonId: "APPT_CANCEL" },
		});
		assert.equal(res.newStatus, "contacted_declined");
	});

	it("transitions to needs_review on reschedule request", () => {
		const recall = createMockRecall({ status: "contacted_no_answer" });

		const res = RecallStateMachine.transition(recall, {
			type: "INBOUND_REPLY",
			text: "Хочу перенести визит на следующую неделю",
			interactivePayload: { type: "button_reply", buttonId: "APPT_RESCHEDULE" },
		});
		assert.equal(res.newStatus, "needs_review");
		assert.ok(res.note?.includes("перенос"));
	});

	it("transitions to done and calculates next suggested recall on treatment completion", () => {
		const recall = createMockRecall({
			status: "contacted_scheduled",
			linkedTreatmentCategoryKey: "hygiene",
		});

		const res = RecallStateMachine.transition(recall, {
			type: "APPOINTMENT_COMPLETED",
			treatmentCategory: "hygiene",
		});

		assert.equal(res.newStatus, "done");
		assert.ok(res.nextSuggestedRecall);
		assert.equal(res.nextSuggestedRecall?.intervalMonths, 6);
		assert.equal(res.nextSuggestedRecall?.reason, "hygiene");
	});

	it("calculates 1-month post-op recall interval for surgery treatments", () => {
		const recall = createMockRecall({ status: "contacted_scheduled" });

		const res = RecallStateMachine.transition(recall, {
			type: "APPOINTMENT_COMPLETED",
			treatmentCategory: "surgery",
		});

		assert.equal(res.newStatus, "done");
		assert.equal(res.nextSuggestedRecall?.intervalMonths, 1);
		assert.equal(res.nextSuggestedRecall?.reason, "post_op");
	});

	it("handles snooze and cancellation actions", () => {
		const recall = createMockRecall({ status: "contacted_no_answer" });

		const snoozed = RecallStateMachine.transition(recall, {
			type: "SNOOZE",
			months: 3,
			reasonNote: "Пациент в отпуске",
		});
		assert.equal(snoozed.newStatus, "pending");
		assert.ok(snoozed.note?.includes("Пациент в отпуске"));

		const cancelled = RecallStateMachine.transition(recall, {
			type: "CANCEL",
			reasonNote: "Пациент переехал",
		});
		assert.equal(cancelled.newStatus, "cancelled");
		assert.ok(cancelled.note?.includes("Пациент переехал"));
	});
});
