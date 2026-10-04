import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appointments, patients, updateAppointment } from "../sampleData.js";

describe("Waitlist & Hot-Slot Concurrency Protection", () => {
	it("successfully books into a cancelled appointment when expectedCurrentStatus matches", () => {
		const targetAppt = appointments[1];
		assert.ok(targetAppt, "Sample appointment must exist");
		const testPatient = patients[0];
		assert.ok(testPatient, "Sample patient must exist");

		// Put target appointment into cancelled state to simulate a freed slot
		const originalStatus = targetAppt.status;
		const originalPatientId = targetAppt.patientId;
		targetAppt.status = "cancelled";

		try {
			const updated = updateAppointment(targetAppt.id, {
				patientId: testPatient.id,
				status: "planned",
				expectedCurrentStatus: ["cancelled", "no_show"],
				reason: "Посадка из листа ожидания (Администратор 1)",
			});

			assert.equal(updated.status, "planned");
			assert.equal(updated.patientId, testPatient.id);
			assert.equal(updated.reason, "Посадка из листа ожидания (Администратор 1)");
		} finally {
			// Restore original state
			targetAppt.status = originalStatus;
			targetAppt.patientId = originalPatientId;
		}
	});

	it("rejects booking and throws conflict error when expectedCurrentStatus does not match (race condition prevention)", () => {
		const targetAppt = appointments[1];
		assert.ok(targetAppt, "Sample appointment must exist");

		// Target appointment is already planned (e.g. booked by Administrator 1)
		const originalStatus = targetAppt.status;
		targetAppt.status = "planned";

		try {
			assert.throws(
				() => {
					updateAppointment(targetAppt.id, {
						patientId: patients[1]?.id ?? patients[0]?.id ?? "00000000-0000-0000-0000-000000000001",
						status: "planned",
						expectedCurrentStatus: ["cancelled", "no_show"],
						reason: "Посадка из листа ожидания (Администратор 2 - опоздал)",
					});
				},
				(err: any) => {
					assert.ok(
						err instanceof Error,
						"Should throw an Error instance",
					);
					assert.ok(
						err.message.includes("Слот уже занят другим администратором") ||
							err.message.includes("больше не свободен"),
						`Error message should explain race condition conflict, got: ${err.message}`,
					);
					return true;
				},
			);
		} finally {
			targetAppt.status = originalStatus;
		}
	});
});
