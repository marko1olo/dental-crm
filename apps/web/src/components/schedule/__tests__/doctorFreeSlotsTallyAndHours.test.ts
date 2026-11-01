/**
 * doctorFreeSlotsTallyAndHours.test.ts — Тесты расчета рабочих часов клиники/врача,
 * быстрых повторных слотов (+7д, +14д, +30д) и честной финансовой сводки загрузки.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Appointment } from "@dental/shared";
import {
	calculateDailyChairDoctorTally,
	deriveClinicWorkingHours,
	findNextDoctorFreeSlotAfterDays,
	findQuickRepeatSlotsForDoctor,
} from "../doctorFreeSlotsEngine";

describe("Doctor Free Slots — Tally, Working Hours & Repeat Slots Suite", () => {
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

	it("findNextDoctorFreeSlotAfterDays — 1-Click finds nearest free slot for doctor after 7, 14, and 30 days", () => {
		const chairs = [{ id: "chair-1", name: "Кабинет 1", active: true }];
		// Reference date: 2026-08-25 (Tuesday)
		// +7 days -> 2026-09-01 (Tuesday)
		const slot7 = findNextDoctorFreeSlotAfterDays({
			doctorId: "doc-1",
			referenceDate: "2026-08-25",
			daysOffset: 7,
			durationMinutes: 60,
			appointments: [],
			chairs,
			clinicStartHour: 9,
			clinicEndHour: 18,
			stepMinutes: 60,
		});

		assert.ok(slot7);
		assert.equal(slot7?.date, "2026-09-01");
		assert.equal(slot7?.startTime, "09:00");
		assert.equal(slot7?.doctorId, "doc-1");

		// +14 days -> 2026-09-08 (Tuesday)
		const slot14 = findNextDoctorFreeSlotAfterDays({
			doctorId: "doc-1",
			referenceDate: "2026-08-25",
			daysOffset: 14,
			durationMinutes: 60,
			appointments: [],
			chairs,
			clinicStartHour: 10,
			clinicEndHour: 18,
			stepMinutes: 60,
		});

		assert.ok(slot14);
		assert.equal(slot14?.date, "2026-09-08");
		assert.equal(slot14?.startTime, "10:00");

		// +30 days (1 month) -> 2026-09-24
		const slot30 = findNextDoctorFreeSlotAfterDays({
			doctorId: "doc-1",
			referenceDate: "2026-08-25",
			daysOffset: 30,
			durationMinutes: 60,
			appointments: [],
			chairs,
			clinicStartHour: 9,
			clinicEndHour: 18,
		});

		assert.ok(slot30);
		assert.equal(slot30?.date, "2026-09-24");
	});

	it("findQuickRepeatSlotsForDoctor — Computes +7d, +14d, +30d slots in a single unified call", () => {
		const chairs = [{ id: "chair-1", name: "Кабинет 1", active: true }];
		const existingAppts: Appointment[] = [
			// Occupy 2026-09-01 09:00-10:00
			{
				id: "appt-busy-1",
				organizationId: "org-1",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-09-01T09:00:00Z",
				endsAt: "2026-09-01T10:00:00Z",
				status: "confirmed",
				reason: null,
				comment: null,
			},
		];

		const repeatSlots = findQuickRepeatSlotsForDoctor({
			doctorId: "doc-1",
			referenceDate: "2026-08-25",
			durationMinutes: 60,
			appointments: existingAppts,
			chairs,
			clinicStartHour: 9,
			clinicEndHour: 18,
			stepMinutes: 60,
		});

		// slot7: 2026-09-01 at 09:00 is busy, so next slot is 10:00
		assert.ok(repeatSlots.slot7Days);
		assert.equal(repeatSlots.slot7Days?.date, "2026-09-01");
		assert.equal(repeatSlots.slot7Days?.startTime, "10:00");

		// slot14: 2026-09-08 at 09:00 is free
		assert.ok(repeatSlots.slot14Days);
		assert.equal(repeatSlots.slot14Days?.date, "2026-09-08");
		assert.equal(repeatSlots.slot14Days?.startTime, "09:00");

		// slot30: 2026-09-24 at 09:00 is free
		assert.ok(repeatSlots.slot30Days);
		assert.equal(repeatSlots.slot30Days?.date, "2026-09-24");
		assert.equal(repeatSlots.slot30Days?.startTime, "09:00");
	});

	it("deriveClinicWorkingHours reads real clinic schedule defaults instead of hardcoded 9-20", () => {
		const dashboard = {
			clinicSettings: {
				profile: {
					scheduleDefaults: {
						workdayStart: "08:00",
						workdayEnd: "21:00",
						workingDays: [2, 3, 4, 5, 6],
					},
				},
				staff: [],
			},
		};

		const window = deriveClinicWorkingHours(dashboard);
		assert.equal(window.clinicStartHour, 8);
		assert.equal(window.clinicEndHour, 21);
		assert.deepEqual(window.workingDays, [2, 3, 4, 5, 6]);
		assert.equal(window.perDayWorkingHours, undefined);
	});

	it("deriveClinicWorkingHours applies per-doctor weekly workingHours from staff settings", () => {
		const dashboard = {
			clinicSettings: {
				profile: {
					scheduleDefaults: {
						workdayStart: "08:00",
						workdayEnd: "20:00",
						workingDays: [1, 2, 3, 4, 5, 6],
					},
				},
				staff: [
					{
						id: "doc-1",
						// Врач работает только по вторникам 10:00-18:00 и четвергам 12:00-22:00 (обрезается окном клиники)
						workingHours: [
							{ weekday: 2, enabled: true, start: "10:00", end: "18:00" },
							{ weekday: 4, enabled: true, start: "12:00", end: "22:00" },
							{ weekday: 1, enabled: false, start: "08:00", end: "20:00" },
						],
					},
				],
			},
		};

		const window = deriveClinicWorkingHours(dashboard, "doc-1");
		assert.equal(window.clinicStartHour, 8);
		assert.equal(window.clinicEndHour, 20);
		assert.deepEqual(window.workingDays, [2, 4]);
		assert.deepEqual(window.perDayWorkingHours?.[2], { startHour: 10, endHour: 18 });
		assert.deepEqual(window.perDayWorkingHours?.[4], { startHour: 12, endHour: 20 });
		assert.equal(window.perDayWorkingHours?.[1], undefined);
	});

	it("deriveClinicWorkingHours treats all-disabled weekly schedule as vacation (no working days)", () => {
		const dashboard = {
			clinicSettings: {
				profile: {
					scheduleDefaults: { workdayStart: "08:00", workdayEnd: "20:00", workingDays: [1, 2, 3, 4, 5] },
				},
				staff: [
					{
						id: "doc-1",
						workingHours: [{ weekday: 1, enabled: false, start: "08:00", end: "20:00" }],
					},
				],
			},
		};

		const window = deriveClinicWorkingHours(dashboard, "doc-1");
		assert.deepEqual(window.workingDays, []);
	});

	it("tally counts only real invoice revenue and never fabricates money for visits without invoices", () => {
		const appointments: Appointment[] = [
			{
				id: "appt-paid",
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
				id: "appt-no-invoice",
				organizationId: "org-1",
				patientId: "pat-2",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-08-25T10:00:00Z",
				endsAt: "2026-08-25T11:00:00Z",
				status: "confirmed",
				reason: null,
				comment: null,
			},
		];

		const tally = calculateDailyChairDoctorTally({
			dateKey: "2026-08-25",
			appointments,
			chairs: [{ id: "chair-1", name: "Кабинет 1", active: true }],
			invoices: [{ appointmentId: "appt-paid", totalRub: 5000, status: "paid" }],
			clinicStartHour: 9,
			clinicEndHour: 19,
		});

		assert.equal(tally.totalRevenueRub, 5000);
		assert.equal(tally.chairs[0]?.totalRevenueRub, 5000);
		assert.ok(tally.clinicWorkdayLabel.includes("09:00"));
		assert.ok(tally.clinicWorkdayLabel.includes("19:00"));
	});
});
