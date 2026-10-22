import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	resolvePatientLastVisit,
	resolvePatientUpcomingAppointment,
} from "../../../store/telephonyStore.js";
import { mockAppointments, mockStaff } from "./telephonyTestFixtures.js";

describe("Telephony: Past & Upcoming Visit Resolution", () => {
	test("resolves past visit and attending doctor", () => {
		const visit = resolvePatientLastVisit(
			"11111111-1111-1111-1111-111111111111",
			mockAppointments,
			mockStaff,
			"2026-06-01T00:00:00Z",
		);
		assert.equal(visit.isNewPatient, false);
		assert.equal(visit.doctorName, "Др. Петров Петр Сергеевич");
		assert.equal(visit.appointmentReason, "Лечение кариеса 1.6");
	});

	test("resolves upcoming future appointment for 1-click confirmation", () => {
		const upcoming = resolvePatientUpcomingAppointment(
			"11111111-1111-1111-1111-111111111111",
			mockAppointments,
			mockStaff,
			"2026-06-01T00:00:00Z",
		);
		assert.ok(upcoming);
		assert.equal(upcoming?.appointmentId, "66666666-6666-6666-6666-666666666666");
		assert.equal(upcoming?.doctorName, "Др. Петров Петр Сергеевич");
		assert.equal(upcoming?.reason, "Профгигиена полости рта");
		assert.equal(upcoming?.status, "planned");
	});

	test("returns null upcoming appointment if patient has no future bookings", () => {
		const upcoming = resolvePatientUpcomingAppointment(
			"22222222-2222-2222-2222-222222222222",
			mockAppointments,
			mockStaff,
			"2026-06-01T00:00:00Z",
		);
		assert.equal(upcoming, null);
	});
});
