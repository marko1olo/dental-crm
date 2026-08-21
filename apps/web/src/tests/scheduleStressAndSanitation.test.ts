import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Appointment, Dashboard } from "@dental/shared";
import {
	type ChairMaintenanceBlock,
	checkAppointmentResourceCollision,
} from "../utils/scheduleCollisionUtils";

// Mock entities
const mockStaff: any = [
	{ id: "doc-1", fullName: "Д-р Иванов А.С.", role: "doctor", active: true },
	{ id: "doc-2", fullName: "Д-р Петров В.И.", role: "doctor", active: true },
	{ id: "doc-3", fullName: "Д-р Сидорова Е.Н.", role: "doctor", active: true },
	{ id: "ast-1", fullName: "Асс. Николаева О.П.", role: "assistant", active: true },
	{ id: "ast-2", fullName: "Асс. Васильев Д.К.", role: "assistant", active: true },
];

const mockChairs: any = [
	{ id: "chair-1", name: "Кабинет 1 (Терапия)", active: true },
	{ id: "chair-2", name: "Кабинет 2 (Хирургия)", active: true },
	{ id: "chair-3", name: "Кабинет 3 (Ортодонтия)", active: true },
	{ id: "chair-offline", name: "Кабинет 4 (Ремонт)", active: false },
];

const mockPatients: any = [
	{ id: "pat-1", fullName: "Смирнов Сергей", phone: "+79001112233" },
	{ id: "pat-2", fullName: "Кузнецова Анна", phone: "+79002223344" },
	{ id: "pat-3", fullName: "Попов Дмитрий", phone: "+79003334455" },
	{ id: "pat-4", fullName: "Васильева Елена", phone: "+79004445566" },
];

describe("Schedule Stress & High-Density Concurrency Suite", () => {
	it("handles 10 contiguous 30-minute adjacent appointments with 0 false collisions", () => {
		// Generate 10 consecutive 30-min appointments for doc-1 in chair-1 from 08:00 to 13:00
		const appointments: Appointment[] = [];
		for (let i = 8; i < 13; i++) {
			for (const min of ["00", "30"]) {
				const startHour = String(i).padStart(2, "0");
				const nextHour = min === "30" ? String(i + 1).padStart(2, "0") : startHour;
				const nextMin = min === "00" ? "30" : "00";
				appointments.push({
					id: `appt-${startHour}-${min}`,
					organizationId: "org-1",
					patientId: `pat-${(appointments.length % 4) + 1}`,
					doctorUserId: "doc-1",
					assistantUserId: "ast-1",
					chairId: "chair-1",
					startsAt: `2026-08-21T${startHour}:${min}:00.000Z`,
					endsAt: `2026-08-21T${nextHour}:${nextMin}:00.000Z`,
					status: "confirmed",
					reason: "Плановый осмотр",
					comment: null,
				});
			}
		}
		assert.equal(appointments.length, 10);

		// Verify every existing appointment does not collide with the others when excluded
		for (const appt of appointments) {
			const check = checkAppointmentResourceCollision(
				{
					startsAt: appt.startsAt,
					endsAt: appt.endsAt,
					doctorUserId: appt.doctorUserId,
					chairId: appt.chairId,
					patientId: appt.patientId,
				},
				appointments,
				{
					excludeAppointmentId: appt.id,
					staff: mockStaff,
					chairs: mockChairs,
					patients: mockPatients,
				},
			);
			assert.equal(
				check.hasCollision,
				false,
				`Слот ${appt.startsAt}-${appt.endsAt} не должен давать ложную коллизию сам с собой`,
			);
		}

		// Attempting to book a new appointment in an adjacent slot before (07:30-08:00) -> OK
		const earlyCheck = checkAppointmentResourceCollision(
			{
				startsAt: "2026-08-21T07:30:00.000Z",
				endsAt: "2026-08-21T08:00:00.000Z",
				doctorUserId: "doc-1",
				chairId: "chair-1",
			},
			appointments,
			{ staff: mockStaff, chairs: mockChairs },
		);
		assert.equal(earlyCheck.hasCollision, false);

		// Attempting to book a new appointment in an adjacent slot after (13:00-13:30) -> OK
		const lateCheck = checkAppointmentResourceCollision(
			{
				startsAt: "2026-08-21T13:00:00.000Z",
				endsAt: "2026-08-21T13:30:00.000Z",
				doctorUserId: "doc-1",
				chairId: "chair-1",
			},
			appointments,
			{ staff: mockStaff, chairs: mockChairs },
		);
		assert.equal(lateCheck.hasCollision, false);

		// Overlapping middle by 15 min (09:15-09:45) -> MUST collide with doc-1 and chair-1
		const overlapCheck = checkAppointmentResourceCollision(
			{
				startsAt: "2026-08-21T09:15:00.000Z",
				endsAt: "2026-08-21T09:45:00.000Z",
				doctorUserId: "doc-1",
				chairId: "chair-1",
			},
			appointments,
			{ staff: mockStaff, chairs: mockChairs },
		);
		assert.equal(overlapCheck.hasCollision, true);
		assert.ok(overlapCheck.message?.includes("Д-р Иванов"));
	});

	it("detects doctor overlap across different chairs simultaneously", () => {
		const existingAppts: Appointment[] = [
			{
				id: "appt-chair1",
				organizationId: "org-1",
				patientId: "pat-1",
				doctorUserId: "doc-2",
				chairId: "chair-1",
				startsAt: "2026-08-21T14:00:00.000Z",
				endsAt: "2026-08-21T15:00:00.000Z",
				status: "confirmed",
				reason: "Имплантация",
				comment: null,
			},
		];

		// Doctor doc-2 tries to be booked in chair-2 at 14:30
		const res = checkAppointmentResourceCollision(
			{
				startsAt: "2026-08-21T14:30:00.000Z",
				endsAt: "2026-08-21T15:30:00.000Z",
				doctorUserId: "doc-2",
				chairId: "chair-2",
			},
			existingAppts,
			{ staff: mockStaff, chairs: mockChairs },
		);

		assert.equal(res.hasCollision, true);
		assert.equal(res.conflictType, "doctor");
		assert.ok(res.message?.includes("Д-р Петров В.И."));
	});

	it("detects chair double booking by different doctors", () => {
		const existingAppts: Appointment[] = [
			{
				id: "appt-chair2",
				organizationId: "org-1",
				patientId: "pat-2",
				doctorUserId: "doc-1",
				chairId: "chair-2",
				startsAt: "2026-08-21T11:00:00.000Z",
				endsAt: "2026-08-21T12:00:00.000Z",
				status: "confirmed",
				reason: null,
				comment: null,
			},
		];

		// Doctor doc-3 tries to book chair-2 at 11:30
		const res = checkAppointmentResourceCollision(
			{
				startsAt: "2026-08-21T11:30:00.000Z",
				endsAt: "2026-08-21T12:30:00.000Z",
				doctorUserId: "doc-3",
				chairId: "chair-2",
			},
			existingAppts,
			{ staff: mockStaff, chairs: mockChairs },
		);

		assert.equal(res.hasCollision, true);
		assert.equal(res.conflictType, "chair");
		assert.ok(res.message?.includes("Кабинет 2 (Хирургия)"));
	});

	it("detects same patient double booking at identical time", () => {
		const existingAppts: Appointment[] = [
			{
				id: "appt-pat3",
				organizationId: "org-1",
				patientId: "pat-3",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-08-21T16:00:00.000Z",
				endsAt: "2026-08-21T17:00:00.000Z",
				status: "confirmed",
				reason: null,
				comment: null,
			},
		];

		const res = checkAppointmentResourceCollision(
			{
				startsAt: "2026-08-21T16:30:00.000Z",
				endsAt: "2026-08-21T17:30:00.000Z",
				doctorUserId: "doc-2",
				chairId: "chair-2",
				patientId: "pat-3",
			},
			existingAppts,
			{ staff: mockStaff, chairs: mockChairs, patients: mockPatients },
		);

		assert.equal(res.hasCollision, true);
		assert.equal(res.conflictType, "patient");
		assert.ok(res.message?.includes("Попов Дмитрий"));
	});
});

describe("Chair Maintenance, Deactivation & Sanitation Blocking Suite", () => {
	it("blocks booking on globally deactivated / offline chairs (active: false)", () => {
		const res = checkAppointmentResourceCollision(
			{
				startsAt: "2026-08-21T10:00:00.000Z",
				endsAt: "2026-08-21T11:00:00.000Z",
				doctorUserId: "doc-1",
				chairId: "chair-offline",
			},
			[],
			{ staff: mockStaff, chairs: mockChairs },
		);

		assert.equal(res.hasCollision, true);
		assert.equal(res.conflictType, "chair");
		assert.ok(res.message?.includes("Кабинет 4 (Ремонт)"));
		assert.ok(res.message?.includes("временно заблокировано"));
	});

	it("blocks booking during scheduled sanitation windows (санитарная обработка)", () => {
		const sanitationBlocks: ChairMaintenanceBlock[] = [
			{
				id: "maint-1",
				chairId: "chair-1",
				startsAt: "2026-08-21T13:00:00.000Z",
				endsAt: "2026-08-21T14:00:00.000Z",
				reason: "sanitation",
				note: "Генеральная дезинфекция и замена фильтров установки",
			},
		];

		// Attempting to book inside sanitation block
		const insideCheck = checkAppointmentResourceCollision(
			{
				startsAt: "2026-08-21T13:15:00.000Z",
				endsAt: "2026-08-21T13:45:00.000Z",
				doctorUserId: "doc-1",
				chairId: "chair-1",
			},
			[],
			{
				staff: mockStaff,
				chairs: mockChairs,
				chairMaintenanceBlocks: sanitationBlocks,
			},
		);

		assert.equal(insideCheck.hasCollision, true);
		assert.equal(insideCheck.conflictType, "chair");
		assert.ok(insideCheck.message?.includes("санитарная обработка"));
		assert.ok(insideCheck.message?.includes("Кабинет 1"));

		// Booking immediately before sanitation block (12:00-13:00) -> Allowed
		const beforeCheck = checkAppointmentResourceCollision(
			{
				startsAt: "2026-08-21T12:00:00.000Z",
				endsAt: "2026-08-21T13:00:00.000Z",
				doctorUserId: "doc-1",
				chairId: "chair-1",
			},
			[],
			{
				staff: mockStaff,
				chairs: mockChairs,
				chairMaintenanceBlocks: sanitationBlocks,
			},
		);
		assert.equal(beforeCheck.hasCollision, false);

		// Booking immediately after sanitation block (14:00-15:00) -> Allowed
		const afterCheck = checkAppointmentResourceCollision(
			{
				startsAt: "2026-08-21T14:00:00.000Z",
				endsAt: "2026-08-21T15:00:00.000Z",
				doctorUserId: "doc-1",
				chairId: "chair-1",
			},
			[],
			{
				staff: mockStaff,
				chairs: mockChairs,
				chairMaintenanceBlocks: sanitationBlocks,
			},
		);
		assert.equal(afterCheck.hasCollision, false);
	});

	it("blocks booking during technical maintenance and disinfection breaks", () => {
		const techBlocks: ChairMaintenanceBlock[] = [
			{
				id: "maint-2",
				chairId: "chair-2",
				startsAt: "2026-08-21T15:00:00.000Z",
				endsAt: "2026-08-21T16:00:00.000Z",
				reason: "maintenance",
				note: "ТО компрессора и автоклава",
			},
			{
				id: "maint-3",
				chairId: "chair-3",
				startsAt: "2026-08-21T12:00:00.000Z",
				endsAt: "2026-08-21T12:30:00.000Z",
				reason: "tech_break",
				note: "Технический перерыв",
			},
		];

		// Chair 2 maintenance conflict
		const resChair2 = checkAppointmentResourceCollision(
			{
				startsAt: "2026-08-21T15:30:00.000Z",
				endsAt: "2026-08-21T16:30:00.000Z",
				doctorUserId: "doc-2",
				chairId: "chair-2",
			},
			[],
			{
				staff: mockStaff,
				chairs: mockChairs,
				chairMaintenanceBlocks: techBlocks,
			},
		);
		assert.equal(resChair2.hasCollision, true);
		assert.ok(resChair2.message?.includes("техобслуживание"));

		// Chair 3 tech break conflict
		const resChair3 = checkAppointmentResourceCollision(
			{
				startsAt: "2026-08-21T12:00:00.000Z",
				endsAt: "2026-08-21T12:30:00.000Z",
				doctorUserId: "doc-3",
				chairId: "chair-3",
			},
			[],
			{
				staff: mockStaff,
				chairs: mockChairs,
				chairMaintenanceBlocks: techBlocks,
			},
		);
		assert.equal(resChair3.hasCollision, true);
		assert.ok(resChair3.message?.includes("технический перерыв"));
	});
});
