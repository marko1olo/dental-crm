/**
 * doctorFreeSlotsEngine.test.ts — Тесты алгоритма поиска свободных окон у врача на 7–14 дней.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Appointment } from "@dental/shared";
import {
	calculateDailyChairDoctorTally,
	findDoctorFreeSlots,
	getTimeOfDayCategory,
} from "../doctorFreeSlotsEngine";

describe("Doctor Free Slots Engine Suite", () => {
	it("categorizes time of day accurately", () => {
		assert.equal(getTimeOfDayCategory(9), "morning");
		assert.equal(getTimeOfDayCategory(11), "morning");
		assert.equal(getTimeOfDayCategory(12), "day");
		assert.equal(getTimeOfDayCategory(15), "day");
		assert.equal(getTimeOfDayCategory(16), "evening");
		assert.equal(getTimeOfDayCategory(19), "evening");
	});

	it("finds free slots on an empty schedule over 7 days horizon", () => {
		const result = findDoctorFreeSlots({
			doctorId: "doc-1",
			startDate: "2026-08-25",
			horizonDays: 7,
			durationMinutes: 60,
			appointments: [],
			chairs: [{ id: "chair-1", name: "Кабинет 1", active: true }],
			clinicStartHour: 9,
			clinicEndHour: 12, // 3 hours = 3 slots (09:00, 09:30, 10:00, 10:30, 11:00) with 30m step
			stepMinutes: 60,
		});

		assert.equal(result.length, 7);
		assert.equal(result[0]?.date, "2026-08-25");
		// 9:00, 10:00, 11:00 = 3 slots
		assert.equal(result[0]?.slots.length, 3);
		assert.equal(result[0]?.slots[0]?.timeDisplay, "09:00 – 10:00");
		assert.equal(result[0]?.slots[1]?.timeDisplay, "10:00 – 11:00");
		assert.equal(result[0]?.slots[2]?.timeDisplay, "11:00 – 12:00");
	});

	it("excludes slots that conflict with existing appointments of the doctor", () => {
		const existingAppts: Appointment[] = [
			{
				id: "appt-1",
				organizationId: "org-1",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-08-25T10:00:00Z",
				endsAt: "2026-08-25T11:00:00Z",
				status: "confirmed",
				reason: null,
				comment: null,
			},
		];

		const result = findDoctorFreeSlots({
			doctorId: "doc-1",
			startDate: "2026-08-25",
			horizonDays: 1,
			durationMinutes: 60,
			appointments: existingAppts,
			chairs: [{ id: "chair-1", name: "Кабинет 1", active: true }],
			clinicStartHour: 9,
			clinicEndHour: 12,
			stepMinutes: 60,
		});

		// 10:00 - 11:00 is busy, so only 09:00-10:00 and 11:00-12:00 remain
		assert.equal(result[0]?.slots.length, 2);
		assert.equal(result[0]?.slots[0]?.timeDisplay, "09:00 – 10:00");
		assert.equal(result[0]?.slots[1]?.timeDisplay, "11:00 – 12:00");
	});

	it("filters slots by time of day (morning, day, evening)", () => {
		const resultMorning = findDoctorFreeSlots({
			doctorId: "doc-1",
			startDate: "2026-08-25",
			horizonDays: 1,
			durationMinutes: 60,
			timeOfDayFilter: "morning",
			appointments: [],
			chairs: [{ id: "chair-1", name: "Кабинет 1", active: true }],
			clinicStartHour: 9,
			clinicEndHour: 18,
			stepMinutes: 60,
		});

		// Morning is hours < 12 (09:00, 10:00, 11:00)
		assert.equal(resultMorning[0]?.slots.length, 3);
		resultMorning[0]?.slots.forEach((s) => {
			assert.equal(s.timeOfDay, "morning");
		});
	});

	it("correctly skips doctor break intervals (e.g. lunch break 13:00 - 14:00)", () => {
		const result = findDoctorFreeSlots({
			doctorId: "doc-1",
			startDate: "2026-08-25",
			horizonDays: 1,
			durationMinutes: 60,
			appointments: [],
			chairs: [{ id: "chair-1", name: "Кабинет 1", active: true }],
			clinicStartHour: 12,
			clinicEndHour: 15,
			stepMinutes: 60,
			breakIntervals: [{ startTime: "13:00", endTime: "14:00" }],
		});

		// 12:00-13:00 (free), 13:00-14:00 (break -> skipped), 14:00-15:00 (free)
		assert.equal(result[0]?.slots.length, 2);
		assert.equal(result[0]?.slots[0]?.timeDisplay, "12:00 – 13:00");
		assert.equal(result[0]?.slots[1]?.timeDisplay, "14:00 – 15:00");
	});

	it("identifies doctor days off / weekends when workingDays are specified", () => {
		// 2026-08-30 is Sunday (day 0), 2026-08-31 is Monday (day 1)
		const result = findDoctorFreeSlots({
			doctorId: "doc-1",
			startDate: "2026-08-30",
			horizonDays: 2,
			durationMinutes: 60,
			appointments: [],
			chairs: [{ id: "chair-1", name: "Кабинет 1", active: true }],
			clinicStartHour: 9,
			clinicEndHour: 12,
			workingDays: [1, 2, 3, 4, 5], // Mon-Fri only
		});

		// Sunday (2026-08-30): day off
		assert.equal(result[0]?.date, "2026-08-30");
		assert.equal(result[0]?.isDayOff, true);
		assert.equal(result[0]?.slots.length, 0);

		// Monday (2026-08-31): working day
		assert.equal(result[1]?.date, "2026-08-31");
		assert.equal(result[1]?.isDayOff, false);
		assert.ok((result[1]?.slots.length ?? 0) > 0);
	});

	it("calculates daily chair and doctor occupancy, visit count and revenue tally", () => {
		const appointments: Appointment[] = [
			{
				id: "appt-1",
				organizationId: "org-1",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-08-25T09:00:00Z",
				endsAt: "2026-08-25T10:00:00Z",
				status: "completed",
				reason: null,
				comment: null,
			},
			{
				id: "appt-2",
				organizationId: "org-1",
				patientId: "pat-2",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-08-25T10:00:00Z",
				endsAt: "2026-08-25T11:00:00Z",
				status: "completed",
				reason: null,
				comment: null,
			},
			{
				id: "appt-3",
				organizationId: "org-1",
				patientId: "pat-3",
				doctorUserId: "doc-2",
				chairId: "chair-2",
				startsAt: "2026-08-25T14:00:00Z",
				endsAt: "2026-08-25T15:30:00Z", // 90 min
				status: "confirmed",
				reason: null,
				comment: null,
			},
		];

		const chairs = [
			{ id: "chair-1", name: "Терапевтический кабинет 1", active: true },
			{ id: "chair-2", name: "Хирургический кабинет 2", active: true },
		];

		const doctors = [
			{ id: "doc-1", fullName: "Иванов Иван Иванович" },
			{ id: "doc-2", fullName: "Петрова Анна Сергеевна" },
		];

		const invoices = [
			{ appointmentId: "appt-1", totalRub: 5000, status: "paid" },
			{ appointmentId: "appt-2", totalRub: 7500, status: "paid" },
			{ appointmentId: "appt-3", totalRub: 15000, status: "issued" },
		];

		const tally = calculateDailyChairDoctorTally({
			dateKey: "2026-08-25",
			appointments,
			chairs,
			doctors,
			invoices,
			clinicStartHour: 9,
			clinicEndHour: 19, // 10 hours = 600 min per chair
		});

		assert.equal(tally.date, "2026-08-25");
		assert.equal(tally.totalAppointmentsCount, 3);
		assert.equal(tally.totalDurationMinutes, 210); // 60 + 60 + 90
		assert.equal(tally.totalRevenueRub, 27500); // 5000 + 7500 + 15000

		// Chair 1: 2 visits, 120 min (120/600 = 20%), 12500 ₽
		assert.equal(tally.chairs[0]?.chairId, "chair-1");
		assert.equal(tally.chairs[0]?.appointmentsCount, 2);
		assert.equal(tally.chairs[0]?.completedCount, 2);
		assert.equal(tally.chairs[0]?.totalDurationMinutes, 120);
		assert.equal(tally.chairs[0]?.occupancyPercent, 20);
		assert.equal(tally.chairs[0]?.totalRevenueRub, 12500);
		assert.deepEqual(tally.chairs[0]?.activeDoctorNames, ["Иванов Иван Иванович"]);

		// Chair 2: 1 visit, 90 min (90/600 = 15%), 15000 ₽
		assert.equal(tally.chairs[1]?.chairId, "chair-2");
		assert.equal(tally.chairs[1]?.appointmentsCount, 1);
		assert.equal(tally.chairs[1]?.totalDurationMinutes, 90);
		assert.equal(tally.chairs[1]?.occupancyPercent, 15);
		assert.equal(tally.chairs[1]?.totalRevenueRub, 15000);

		// Doctor 1: 2 visits, 120 min, 12500 ₽
		const doc1Stats = tally.doctors.find((d) => d.doctorId === "doc-1");
		assert.ok(doc1Stats);
		assert.equal(doc1Stats?.appointmentsCount, 2);
		assert.equal(doc1Stats?.totalRevenueRub, 12500);
	});
});

