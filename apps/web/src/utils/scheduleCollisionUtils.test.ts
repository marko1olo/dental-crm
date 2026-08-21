import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Appointment, Dashboard } from "@dental/shared";
import { checkAppointmentResourceCollision } from "./scheduleCollisionUtils";

const baseAppointment: Appointment = {
	id: "appt-1",
	organizationId: "org-1",
	patientId: "patient-1",
	doctorUserId: "doctor-1",
	assistantUserId: "assistant-1",
	chairId: "chair-1",
	startsAt: "2026-08-21T10:00:00.000Z",
	endsAt: "2026-08-21T11:00:00.000Z",
	status: "confirmed",
	reason: null,
	comment: null,
};

// biome-ignore lint/suspicious/noExplicitAny: mock staff
const mockStaff: any = [
	{ id: "doctor-1", fullName: "Д-р Иванов", role: "doctor", active: true },
	{ id: "doctor-2", fullName: "Д-р Петров", role: "doctor", active: true },
	{ id: "assistant-1", fullName: "Асс. Сидорова", role: "assistant", active: true },
];

// biome-ignore lint/suspicious/noExplicitAny: mock chairs
const mockChairs: any = [
	{ id: "chair-1", name: "Кабинет 1 (Терапия)", active: true },
	{ id: "chair-2", name: "Кабинет 2 (Хирургия)", active: true },
];

// biome-ignore lint/suspicious/noExplicitAny: mock patients
const mockPatients: any = [
	{ id: "patient-1", fullName: "Сергей Смирнов", phone: "+79001112233" },
	{ id: "patient-2", fullName: "Анна Кузнецова", phone: "+79004445566" },
];

describe("checkAppointmentResourceCollision", () => {
	it("detects no collision when schedule is empty", () => {
		const result = checkAppointmentResourceCollision(
			{
				startsAt: "2026-08-21T10:00:00.000Z",
				endsAt: "2026-08-21T11:00:00.000Z",
				doctorUserId: "doctor-1",
			},
			[],
		);
		assert.equal(result.hasCollision, false);
		assert.equal(result.conflictType, null);
	});

	it("detects doctor overlap collision", () => {
		const result = checkAppointmentResourceCollision(
			{
				startsAt: "2026-08-21T10:30:00.000Z",
				endsAt: "2026-08-21T11:30:00.000Z",
				doctorUserId: "doctor-1",
				chairId: "chair-2", // different chair
			},
			[baseAppointment],
			{
				staff: mockStaff as Dashboard["clinicSettings"]["staff"],
				chairs: mockChairs as Dashboard["clinicSettings"]["chairs"],
			},
		);
		assert.equal(result.hasCollision, true);
		assert.equal(result.conflictType, "doctor");
		assert.ok(result.message?.includes("Д-р Иванов"));
	});

	it("detects chair overlap collision", () => {
		const result = checkAppointmentResourceCollision(
			{
				startsAt: "2026-08-21T10:15:00.000Z",
				endsAt: "2026-08-21T10:45:00.000Z",
				doctorUserId: "doctor-2", // different doctor
				chairId: "chair-1", // same chair
			},
			[baseAppointment],
			{
				staff: mockStaff as Dashboard["clinicSettings"]["staff"],
				chairs: mockChairs as Dashboard["clinicSettings"]["chairs"],
			},
		);
		assert.equal(result.hasCollision, true);
		assert.equal(result.conflictType, "chair");
		assert.ok(result.message?.includes("Кабинет 1"));
	});

	it("detects patient overlap collision", () => {
		const result = checkAppointmentResourceCollision(
			{
				startsAt: "2026-08-21T10:00:00.000Z",
				endsAt: "2026-08-21T10:30:00.000Z",
				doctorUserId: "doctor-2",
				chairId: "chair-2",
				patientId: "patient-1",
			},
			[baseAppointment],
			{
				staff: mockStaff as Dashboard["clinicSettings"]["staff"],
				chairs: mockChairs as Dashboard["clinicSettings"]["chairs"],
				patients: mockPatients as Dashboard["patients"],
			},
		);
		assert.equal(result.hasCollision, true);
		assert.equal(result.conflictType, "patient");
		assert.ok(result.message?.includes("Сергей Смирнов"));
	});

	it("ignores cancelled and no-show appointments", () => {
		const cancelledAppt: Appointment = {
			...baseAppointment,
			id: "appt-cancelled",
			status: "cancelled",
		};
		const noShowAppt: Appointment = {
			...baseAppointment,
			id: "appt-noshow",
			status: "no_show",
		};

		const result = checkAppointmentResourceCollision(
			{
				startsAt: "2026-08-21T10:00:00.000Z",
				endsAt: "2026-08-21T11:00:00.000Z",
				doctorUserId: "doctor-1",
			},
			[cancelledAppt, noShowAppt],
			{ staff: mockStaff as Dashboard["clinicSettings"]["staff"] },
		);
		assert.equal(result.hasCollision, false);
	});

	it("excludes the appointment being edited (excludeAppointmentId)", () => {
		const result = checkAppointmentResourceCollision(
			{
				startsAt: "2026-08-21T10:00:00.000Z",
				endsAt: "2026-08-21T11:00:00.000Z",
				doctorUserId: "doctor-1",
			},
			[baseAppointment],
			{
				excludeAppointmentId: "appt-1",
				staff: mockStaff as Dashboard["clinicSettings"]["staff"],
			},
		);
		assert.equal(result.hasCollision, false);
	});

	it("handles non-overlapping adjacent time boundaries correctly", () => {
		// Exactly before
		const beforeResult = checkAppointmentResourceCollision(
			{
				startsAt: "2026-08-21T09:00:00.000Z",
				endsAt: "2026-08-21T10:00:00.000Z",
				doctorUserId: "doctor-1",
			},
			[baseAppointment],
			{ staff: mockStaff as Dashboard["clinicSettings"]["staff"] },
		);
		assert.equal(beforeResult.hasCollision, false);

		// Exactly after
		const afterResult = checkAppointmentResourceCollision(
			{
				startsAt: "2026-08-21T11:00:00.000Z",
				endsAt: "2026-08-21T12:00:00.000Z",
				doctorUserId: "doctor-1",
			},
			[baseAppointment],
			{ staff: mockStaff as Dashboard["clinicSettings"]["staff"] },
		);
		assert.equal(afterResult.hasCollision, false);
	});
});
