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
});

