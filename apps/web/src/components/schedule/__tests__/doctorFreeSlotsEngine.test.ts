/**
 * doctorFreeSlotsEngine.test.ts — Тесты алгоритма поиска свободных окон у врача на 7–14 дней.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Appointment } from "@dental/shared";
import {
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

	it("findDoctorFreeSlots honors perDayWorkingHours window per weekday", () => {
		// 2026-09-01 is Tuesday (weekday 2)
		const result = findDoctorFreeSlots({
			doctorId: "doc-1",
			startDate: "2026-09-01",
			horizonDays: 1,
			durationMinutes: 60,
			appointments: [],
			chairs: [{ id: "chair-1", name: "Кабинет 1", active: true }],
			clinicStartHour: 9,
			clinicEndHour: 20,
			stepMinutes: 60,
			perDayWorkingHours: { 2: { startHour: 10, endHour: 12 } },
		});

		// Только 10:00-11:00 и 11:00-12:00 из окна врача, а не весь день клиники
		assert.equal(result[0]?.slots.length, 2);
		assert.equal(result[0]?.slots[0]?.timeDisplay, "10:00 – 11:00");
		assert.equal(result[0]?.slots[1]?.timeDisplay, "11:00 – 12:00");
	});

	it("never fabricates slots for a clinic without active chairs", () => {
		const result = findDoctorFreeSlots({
			doctorId: "doc-1",
			startDate: "2026-09-01",
			horizonDays: 2,
			durationMinutes: 30,
			appointments: [],
			chairs: [],
			clinicStartHour: 9,
			clinicEndHour: 20,
			stepMinutes: 30,
		});

		assert.equal(result.length, 2);
		for (const day of result) {
			assert.equal(day.isDayOff, true);
			assert.equal(day.slots.length, 0);
			assert.equal(day.dayOffReason, "В клинике нет активных кресел");
		}
	});

	it("skips intervals when every real chair is busy instead of inventing a free cabinet", () => {
		const result = findDoctorFreeSlots({
			doctorId: "doc-1",
			startDate: "2026-09-01",
			horizonDays: 1,
			durationMinutes: 60,
			appointments: [
				{
					id: "appt-other",
					organizationId: "org-1",
					patientId: "pat-9",
					doctorUserId: "doc-2",
					chairId: "chair-1",
					startsAt: "2026-09-01T09:00:00Z",
					endsAt: "2026-09-01T12:00:00Z",
					status: "planned",
					reason: null,
					comment: null,
				},
			],
			chairs: [{ id: "chair-1", name: "Кабинет 1", active: true }],
			clinicStartHour: 9,
			clinicEndHour: 12,
			stepMinutes: 60,
		});

		assert.equal(result[0]?.slots.length, 0);
	});
});
