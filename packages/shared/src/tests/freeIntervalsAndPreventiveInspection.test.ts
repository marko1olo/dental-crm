import assert from "node:assert";
import { describe, test } from "node:test";
import {
	findFreeScheduleIntervals,
	type FindFreeScheduleIntervalsParams,
} from "../schedule/freeIntervalsEngine.js";
import {
	findPreventiveInspectionCandidates,
} from "../schedule/preventiveInspectionEngine.js";

describe("DentalPRO Expo26 & IDENT Parity: Free Schedule Intervals Engine", () => {
	const mockDoctors = [
		{ id: "doc-1", fullName: "Д-р Смирнов А.П.", active: true },
		{ id: "doc-2", fullName: "Д-р Кузнецова Е.В.", active: true },
	];
	const mockChairs = [
		{ id: "chair-1", name: "Кабинет 1 (Терапия)", active: true },
		{ id: "chair-2", name: "Кабинет 2 (Хирургия)", active: true },
	];

	test("finds free 60-minute intervals in clean schedule", () => {
		const intervals = findFreeScheduleIntervals({
			doctorId: "doc-1",
			chairId: "chair-1",
			dateFrom: "2026-10-12", // Monday
			dateTo: "2026-10-12",
			durationMinutes: 60,
			existingAppointments: [],
			chairs: mockChairs,
			doctors: mockDoctors,
			workingHours: {
				startHour: 9,
				endHour: 12,
				stepMinutes: 30,
			},
		});

		// 9:00-10:00, 9:30-10:30, 10:00-11:00, 10:30-11:30, 11:00-12:00 -> 5 intervals
		assert.strictEqual(intervals.length, 5);
		assert.strictEqual(intervals[0]?.startTime, "09:00");
		assert.strictEqual(intervals[0]?.endTime, "10:00");
		assert.strictEqual(intervals[0]?.timeDisplay, "09:00 – 10:00");
		assert.strictEqual(intervals[0]?.doctorName, "Д-р Смирнов А.П.");
		assert.strictEqual(intervals[0]?.chairName, "Кабинет 1 (Терапия)");
	});

	test("skips intervals that collide with existing active appointment", () => {
		const existingAppointments = [
			{
				id: "appt-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-10-12T10:00:00Z",
				endsAt: "2026-10-12T11:00:00Z",
				status: "planned",
			},
		];

		const intervals = findFreeScheduleIntervals({
			doctorId: "doc-1",
			chairId: "chair-1",
			dateFrom: "2026-10-12",
			dateTo: "2026-10-12",
			durationMinutes: 60,
			existingAppointments,
			chairs: mockChairs,
			doctors: mockDoctors,
			workingHours: {
				startHour: 9,
				endHour: 12,
				stepMinutes: 30,
			},
		});

		// 9:00-10:00 -> free (ends at 10:00)
		// 9:30-10:30 -> collides with 10:00-11:00
		// 10:00-11:00 -> collides
		// 10:30-11:30 -> collides
		// 11:00-12:00 -> free (starts at 11:00)
		assert.strictEqual(intervals.length, 2);
		assert.strictEqual(intervals[0]?.startTime, "09:00");
		assert.strictEqual(intervals[1]?.startTime, "11:00");
	});

	test("cancelled and no_show appointments do not block free slots", () => {
		const existingAppointments = [
			{
				id: "appt-cancelled",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-10-12T10:00:00Z",
				endsAt: "2026-10-12T11:00:00Z",
				status: "cancelled",
			},
		];

		const intervals = findFreeScheduleIntervals({
			doctorId: "doc-1",
			chairId: "chair-1",
			dateFrom: "2026-10-12",
			durationMinutes: 60,
			existingAppointments,
			chairs: mockChairs,
			doctors: mockDoctors,
			workingHours: {
				startHour: 9,
				endHour: 12,
				stepMinutes: 30,
			},
		});

		assert.strictEqual(intervals.length, 5);
	});

	test("respects break intervals (e.g. 13:00 - 14:00)", () => {
		const intervals = findFreeScheduleIntervals({
			doctorId: "doc-1",
			chairId: "chair-1",
			dateFrom: "2026-10-12",
			durationMinutes: 60,
			existingAppointments: [],
			chairs: mockChairs,
			doctors: mockDoctors,
			workingHours: {
				startHour: 12,
				endHour: 15,
				stepMinutes: 60,
				breakIntervals: [{ startTime: "13:00", endTime: "14:00" }],
			},
		});

		// 12:00-13:00: free
		// 13:00-14:00: break -> skipped
		// 14:00-15:00: free
		assert.strictEqual(intervals.length, 2);
		assert.strictEqual(intervals[0]?.startTime, "12:00");
		assert.strictEqual(intervals[1]?.startTime, "14:00");
	});

	test("filters by timeOfDay (morning, day, evening)", () => {
		const intervalsMorning = findFreeScheduleIntervals({
			dateFrom: "2026-10-12",
			durationMinutes: 60,
			existingAppointments: [],
			chairs: mockChairs,
			doctors: mockDoctors,
			timeOfDayFilter: "morning",
			workingHours: {
				startHour: 9,
				endHour: 18,
				stepMinutes: 60,
			},
		});

		assert.ok(intervalsMorning.length > 0);
		for (const slot of intervalsMorning) {
			assert.strictEqual(slot.timeOfDay, "morning");
			const hour = Number(slot.startTime.split(":")[0]);
			assert.ok(hour < 12);
		}
	});

	test("resolves any doctor and any chair dynamically", () => {
		const appointments = [
			{
				id: "appt-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-10-12T09:00:00Z",
				endsAt: "2026-10-12T10:00:00Z",
				status: "planned",
			},
		];

		const intervals = findFreeScheduleIntervals({
			// No doctorId, no chairId specified: Any doctor, any chair
			dateFrom: "2026-10-12",
			durationMinutes: 60,
			existingAppointments: appointments,
			chairs: mockChairs,
			doctors: mockDoctors,
			workingHours: {
				startHour: 9,
				endHour: 10,
				stepMinutes: 60,
			},
		});

		// 9:00-10:00: doc-1 & chair-1 is busy, but doc-2 & chair-2 is free!
		assert.strictEqual(intervals.length, 1);
		assert.strictEqual(intervals[0]?.doctorId, "doc-2");
		assert.strictEqual(intervals[0]?.doctorName, "Д-р Кузнецова Е.В.");
		assert.strictEqual(intervals[0]?.chairId, "chair-2");
	});
});

describe("Mandate 8x: Preventive Inspection & Warranty Checkup Engine", () => {
	const mockDoctors = [
		{ id: "doc-impl", fullName: "Д-р Хирургов И.И." },
		{ id: "doc-ortho", fullName: "Д-р Ортопедов П.П." },
		{ id: "doc-therap", fullName: "Д-р Терапевтов Т.Т." },
	];

	const referenceDate = new Date("2026-10-01T12:00:00Z");

	test("identifies patients with implant warranty due after 6 months", () => {
		const patients = [
			{ id: "pat-1", fullName: "Иванов Иван", phone: "+7 999 111-22-33" },
			{ id: "pat-2", fullName: "Петров Петр", phone: "+7 999 222-33-44" },
			{ id: "pat-3", fullName: "Сидоров Сидор", phone: "+7 999 333-44-55" },
		];

		const appointments = [
			// pat-1: implant visit completed ~180 days ago (2026-04-01)
			{
				id: "a-1",
				patientId: "pat-1",
				doctorUserId: "doc-impl",
				startsAt: "2026-04-01T10:00:00Z",
				status: "completed",
				reason: "Установка имплантата Osstem 3.6",
			},
			// pat-2: crown completed ~180 days ago
			{
				id: "a-2",
				patientId: "pat-2",
				doctorUserId: "doc-ortho",
				startsAt: "2026-04-01T11:00:00Z",
				status: "completed",
				reason: "Фиксация циркониевой коронки",
			},
			// pat-3: has a future appointment booked
			{
				id: "a-3",
				patientId: "pat-3",
				doctorUserId: "doc-therap",
				startsAt: "2026-04-01T12:00:00Z",
				status: "completed",
				reason: "Лечение кариеса",
			},
			{
				id: "a-3-future",
				patientId: "pat-3",
				doctorUserId: "doc-therap",
				startsAt: "2026-10-15T12:00:00Z",
				status: "planned",
				reason: "Плановый осмотр",
			},
		];

		const candidates = findPreventiveInspectionCandidates({
			patients,
			appointments,
			doctors: mockDoctors,
			referenceDate,
			minDaysSinceVisit: 150,
			maxDaysSinceVisit: 300,
		});

		assert.strictEqual(candidates.length, 2);

		const pat1 = candidates.find((c) => c.patientId === "pat-1");
		assert.ok(pat1);
		assert.strictEqual(pat1?.category, "implant_warranty");
		assert.strictEqual(pat1?.categoryTitle, "Осмотр по гарантии (имплантация)");
		assert.strictEqual(pat1?.lastDoctorName, "Д-р Хирургов И.И.");
		assert.ok(pat1?.suggestedChannelMessage.includes("гарантии на имплантацию"));
		// Mandate 8x: strictly zero bird language
		assert.ok(!pat1?.suggestedChannelMessage.includes("диспансер"));
		assert.ok(!pat1?.suggestedChannelMessage.includes("контингент"));

		const pat2 = candidates.find((c) => c.patientId === "pat-2");
		assert.ok(pat2);
		assert.strictEqual(pat2?.category, "orthopedic_warranty");
		assert.strictEqual(pat2?.categoryTitle, "Осмотр по гарантии (коронки и протезирование)");
		assert.strictEqual(pat2?.lastDoctorName, "Д-р Ортопедов П.П.");

		// pat-3 must NOT be in candidates because future appointment is already scheduled
		assert.ok(!candidates.some((c) => c.patientId === "pat-3"));
	});
});
