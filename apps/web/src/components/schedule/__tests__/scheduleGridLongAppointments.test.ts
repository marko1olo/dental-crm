/**
 * scheduleGridLongAppointments.test.ts
 *
 * Inquisitorial Test Suite:
 * 1. Multi-Hour Continuous Blocks (1.5h, 2h, 3h):
 *    - Monolithic continuous height (height = durationMinutes * pxPerMinute)
 *    - Single continuous card without fragmented rows or repeated names/buttons
 * 2. Chair & Doctor Collision Guard:
 *    - Chair collision detection
 *    - Doctor double-booking across different cabinets strictly guarded against
 *    - Alternative chairs suggestion
 *    - Shift minutes (+15, +30, +45, +60 min)
 * 3. Solo Doctor Fast 5-Second Booking validation (Phone, Name, Time minimal requirements)
 * 4. SlotConflictModal rich options rendering
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { Appointment } from "@dental/shared";
import {
	getAppointmentDurationMinutes,
	calculateAppointmentSpan,
	calculateAppointmentCardHeight,
	validateQuickBookingFields,
} from "../appointmentCardHelpers";
import {
	detectAppointmentCollisions,
	findAlternativeChairsForSlot,
	findShiftMinutesOptions,
} from "../chairRosterMath";
import { findDoctorFreeSlots } from "../doctorFreeSlotsEngine";
import { SlotConflictModal } from "../SlotConflictModal";

describe("Schedule Multi-Hour Blocks & Collision Inquisitor Suite", () => {
	describe("1. Multi-Hour Appointment Duration & Monolithic Span Math", () => {
		it("calculates accurate duration for 30m, 90m (1.5h), 120m (2h), and 180m (3h) appointments", () => {
			// 30 min
			const dur30 = getAppointmentDurationMinutes("2026-08-25T10:00:00Z", "2026-08-25T10:30:00Z");
			assert.equal(dur30, 30);

			// 90 min (1.5h) - complex extraction & bone grafting
			const dur90 = getAppointmentDurationMinutes("2026-08-25T10:00:00Z", "2026-08-25T11:30:00Z");
			assert.equal(dur90, 90);

			// 120 min (2h) - multi-canal endodontic instrumentation
			const dur120 = getAppointmentDurationMinutes("2026-08-25T14:00:00Z", "2026-08-25T16:00:00Z");
			assert.equal(dur120, 120);

			// 180 min (3h) - full mouth rehabilitation / All-on-4 implantation
			const dur180 = getAppointmentDurationMinutes("2026-08-25T09:00:00Z", "2026-08-25T12:00:00Z");
			assert.equal(dur180, 180);
		});

		it("falls back to durationMinutes or default 30 min when endsAt is missing or invalid", () => {
			assert.equal(getAppointmentDurationMinutes("2026-08-25T10:00:00Z", null, 60), 60);
			assert.equal(getAppointmentDurationMinutes("2026-08-25T10:00:00Z", undefined, 90), 90);
			assert.equal(getAppointmentDurationMinutes("2026-08-25T10:00:00Z", "invalid-date", 45), 45);
			assert.equal(getAppointmentDurationMinutes(null, null), 30);
		});

		it("calculates grid slot span correctly for various grid step sizes", () => {
			// With default 30 min step
			assert.equal(calculateAppointmentSpan(30, 30), 1);
			assert.equal(calculateAppointmentSpan(90, 30), 3); // 1.5h = 3 rows
			assert.equal(calculateAppointmentSpan(120, 30), 4); // 2h = 4 rows
			assert.equal(calculateAppointmentSpan(180, 30), 6); // 3h = 6 rows

			// With 15 min high-density step
			assert.equal(calculateAppointmentSpan(30, 15), 2);
			assert.equal(calculateAppointmentSpan(90, 15), 6);
			assert.equal(calculateAppointmentSpan(120, 15), 8);
			assert.equal(calculateAppointmentSpan(180, 15), 12);
		});

		it("calculates monolithic continuous card height proportional to duration without row fragmentation", () => {
			const baseHeightPx = 64; // base 30m slot height
			const step = 30;

			// 30 min = 64px
			assert.equal(calculateAppointmentCardHeight(30, step, baseHeightPx), 64);

			// 90 min (1.5h) = 192px (continuous monolithic block)
			assert.equal(calculateAppointmentCardHeight(90, step, baseHeightPx), 192);

			// 120 min (2h) = 256px
			assert.equal(calculateAppointmentCardHeight(120, step, baseHeightPx), 256);

			// 180 min (3h) = 384px
			assert.equal(calculateAppointmentCardHeight(180, step, baseHeightPx), 384);
		});
	});

	describe("2. Fast 5-Second Solo Doctor Quick Booking Validation", () => {
		it("validates successfully with ONLY patientName, patientPhone, and startsAt", () => {
			const validForm = {
				patientName: "Иванов Иван",
				patientPhone: "+7 (999) 123-45-67",
				startsAt: "2026-08-25T10:00:00Z",
			};
			const res = validateQuickBookingFields(validForm);
			assert.equal(res.isValid, true);
			assert.equal(res.missingFields.length, 0);
			assert.equal(res.errors.length, 0);
		});

		it("guarantees assistant and INN are strictly optional and NEVER block booking", () => {
			const formWithoutCorpFields = {
				patientName: "Петрова Анна",
				patientPhone: "89211112233",
				startsAt: "2026-08-25T11:00:00Z",
				assistantId: null, // no assistant for solo doctor
				inn: null, // no INN needed for fast booking
			};
			const res = validateQuickBookingFields(formWithoutCorpFields);
			assert.equal(res.isValid, true);
			assert.equal(res.missingFields.length, 0);
		});

		it("fails validation when mandatory fields are missing", () => {
			// Missing name
			const noName = validateQuickBookingFields({
				patientName: "   ",
				patientPhone: "+79991234567",
				startsAt: "2026-08-25T10:00:00Z",
			});
			assert.equal(noName.isValid, false);
			assert.ok(noName.missingFields.includes("patientName"));

			// Missing phone
			const noPhone = validateQuickBookingFields({
				patientName: "Сидоров",
				patientPhone: "   ",
				startsAt: "2026-08-25T10:00:00Z",
			});
			assert.equal(noPhone.isValid, false);
			assert.ok(noPhone.missingFields.includes("patientPhone"));

			// Missing startsAt
			const noTime = validateQuickBookingFields({
				patientName: "Сидоров",
				patientPhone: "+79991234567",
				startsAt: "",
			});
			assert.equal(noTime.isValid, false);
			assert.ok(noTime.missingFields.includes("startsAt"));
		});
	});

	describe("3. Chair & Doctor Collision Detection Guard", () => {
		const chairs = [
			{ id: "chair-1", name: "Кресло 1 (Терапия)", active: true },
			{ id: "chair-2", name: "Кресло 2 (Хирургия)", active: true },
			{ id: "chair-3", name: "Кресло 3 (Ортодонтия)", active: true },
		];
		const staff = [
			{ id: "doc-1", fullName: "Д-р Смирнов А. В." },
			{ id: "doc-2", fullName: "Д-р Васильев И. П." },
		];
		const patients = [
			{ id: "pat-1", fullName: "Иванов И. И." },
			{ id: "pat-2", fullName: "Петров П. П." },
		];

		const existingAppointments: Appointment[] = [
			{
				id: "appt-1",
				organizationId: "org-1",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-08-25T10:00:00Z",
				endsAt: "2026-08-25T12:00:00Z", // 2-hour appointment
				status: "confirmed",
				reason: "Эндодонтия 4 каналов",
				comment: null,
			},
		];

		it("detects chair collision when two appointments overlap on the same chair", () => {
			const candidate = {
				startsAt: "2026-08-25T11:00:00Z", // overlaps appt-1 (10:00 - 12:00)
				endsAt: "2026-08-25T11:30:00Z",
				chairId: "chair-1",
				doctorId: "doc-2", // different doctor, same chair
			};

			const result = detectAppointmentCollisions({
				candidate,
				existingAppointments,
				chairs,
				staff,
				patients,
			});

			assert.equal(result.hasCollision, true);
			assert.equal(result.primaryConflictType, "chair");
			assert.ok(result.collisions.some((c) => c.type === "chair"));
			assert.ok(result.message.includes("Кресло 1"));
		});

		it("strictly guards against doctor double-booking across different cabinets", () => {
			// doc-1 is already in chair-1 from 10:00 to 12:00.
			// Admin attempts to book doc-1 in chair-2 at 10:30.
			const candidate = {
				startsAt: "2026-08-25T10:30:00Z",
				endsAt: "2026-08-25T11:30:00Z",
				chairId: "chair-2", // Different chair!
				doctorId: "doc-1", // Same doctor!
			};

			const result = detectAppointmentCollisions({
				candidate,
				existingAppointments,
				chairs,
				staff,
				patients,
			});

			assert.equal(result.hasCollision, true);
			assert.equal(result.primaryConflictType, "doctor");
			assert.ok(result.collisions.some((c) => c.type === "doctor"));
			assert.ok(result.message.includes("Смирнов"));
			assert.ok(result.message.includes("Одновременный приём запрещён"));
		});

		it("allows different doctor in different chair at the same time without collision", () => {
			const candidate = {
				startsAt: "2026-08-25T10:00:00Z",
				endsAt: "2026-08-25T11:00:00Z",
				chairId: "chair-2", // Different chair
				doctorId: "doc-2", // Different doctor
			};

			const result = detectAppointmentCollisions({
				candidate,
				existingAppointments,
				chairs,
				staff,
				patients,
			});

			assert.equal(result.hasCollision, false);
			assert.equal(result.collisions.length, 0);
		});

		it("allows same doctor on same chair at consecutive non-overlapping times", () => {
			const candidate = {
				startsAt: "2026-08-25T12:00:00Z", // Starts exactly when appt-1 ends
				endsAt: "2026-08-25T13:00:00Z",
				chairId: "chair-1",
				doctorId: "doc-1",
			};

			const result = detectAppointmentCollisions({
				candidate,
				existingAppointments,
				chairs,
				staff,
				patients,
			});

			assert.equal(result.hasCollision, false);
			assert.equal(result.collisions.length, 0);
		});

		it("ignores cancelled appointments during collision checks", () => {
			const cancelledAppts: Appointment[] = [
				{
					...existingAppointments[0]!,
					status: "cancelled",
				},
			];

			const candidate = {
				startsAt: "2026-08-25T10:00:00Z",
				endsAt: "2026-08-25T11:00:00Z",
				chairId: "chair-1",
				doctorId: "doc-1",
			};

			const result = detectAppointmentCollisions({
				candidate,
				existingAppointments: cancelledAppts,
				chairs,
				staff,
				patients,
			});

			assert.equal(result.hasCollision, false);
		});
	});

	describe("4. Alternative Chairs & Shift Minutes Finder", () => {
		const chairs = [
			{ id: "chair-1", name: "Кресло 1", active: true },
			{ id: "chair-2", name: "Кресло 2", active: true },
			{ id: "chair-3", name: "Кресло 3", active: true },
		];
		const existingAppointments: Appointment[] = [
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
			{
				id: "appt-2",
				organizationId: "org-1",
				patientId: "pat-2",
				doctorUserId: "doc-2",
				chairId: "chair-2",
				startsAt: "2026-08-25T10:00:00Z",
				endsAt: "2026-08-25T10:30:00Z",
				status: "confirmed",
				reason: null,
				comment: null,
			},
		];

		it("findAlternativeChairsForSlot returns only free chairs during requested slot", () => {
			// At 10:00 - 10:30, chair-1 and chair-2 are busy. Chair-3 is free!
			const alternatives = findAlternativeChairsForSlot({
				startsAt: "2026-08-25T10:00:00Z",
				endsAt: "2026-08-25T10:30:00Z",
				currentChairId: "chair-1",
				chairs,
				existingAppointments,
			});

			assert.equal(alternatives.length, 1);
			assert.equal(alternatives[0]?.id, "chair-3");
			assert.equal(alternatives[0]?.name, "Кресло 3");
		});

		it("findShiftMinutesOptions evaluates +15, +30, +45, +60 min availability", () => {
			// At 10:00 - 10:30, chair-1 has appt-1 (10:00 - 11:00).
			// +15 min (10:15) -> still busy
			// +30 min (10:30) -> still busy
			// +45 min (10:45) -> still busy
			// +60 min (11:00) -> FREE!
			const shifts = findShiftMinutesOptions({
				startsAt: "2026-08-25T10:00:00Z",
				durationMinutes: 30,
				chairId: "chair-1",
				doctorId: "doc-1",
				shiftMinutes: [15, 30, 45, 60],
				existingAppointments,
			});

			assert.equal(shifts.length, 4);
			assert.equal(shifts[0]?.minutes, 15);
			assert.equal(shifts[0]?.isFree, false);
			assert.equal(shifts[1]?.minutes, 30);
			assert.equal(shifts[1]?.isFree, false);
			assert.equal(shifts[2]?.minutes, 45);
			assert.equal(shifts[2]?.isFree, false);
			assert.equal(shifts[3]?.minutes, 60);
			assert.equal(shifts[3]?.isFree, true); // 11:00 is free!
		});
	});

	describe("5. Doctor Free Slots Engine with Multi-Hour Appointments", () => {
		it("excludes all 30m slots contained in a multi-hour appointment (10:00 - 12:00)", () => {
			const existingAppts: Appointment[] = [
				{
					id: "appt-long",
					organizationId: "org-1",
					patientId: "pat-1",
					doctorUserId: "doc-1",
					chairId: "chair-1",
					startsAt: "2026-08-25T10:00:00Z",
					endsAt: "2026-08-25T12:00:00Z", // 2 full hours (4 slots of 30m: 10:00, 10:30, 11:00, 11:30)
					status: "confirmed",
					reason: "Комплексная имплантация",
					comment: null,
				},
			];

			const result = findDoctorFreeSlots({
				doctorId: "doc-1",
				startDate: "2026-08-25",
				horizonDays: 1,
				durationMinutes: 30,
				stepMinutes: 30,
				clinicStartHour: 9,
				clinicEndHour: 13,
				chairs: [{ id: "chair-1", name: "Кабинет 1", active: true }],
				appointments: existingAppts,
			});

			const daySlots = result[0]?.slots ?? [];
			const times = daySlots.map((s) => s.startTime);

			// 09:00, 09:30 should be free
			assert.ok(times.includes("09:00"));
			assert.ok(times.includes("09:30"));

			// 10:00, 10:30, 11:00, 11:30 MUST NOT appear (they are inside the 2-hour appointment!)
			assert.ok(!times.includes("10:00"));
			assert.ok(!times.includes("10:30"));
			assert.ok(!times.includes("11:00"));
			assert.ok(!times.includes("11:30"));

			// 12:00, 12:30 should be free
			assert.ok(times.includes("12:00"));
			assert.ok(times.includes("12:30"));
		});

		it("resiliently blocks multi-hour appointment even when endsAt is missing if durationMinutes is specified", () => {
			const apptMissingEndsAt: any = {
				id: "appt-fallback-dur",
				organizationId: "org-1",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-08-25T10:00:00Z",
				endsAt: null, // Missing endsAt!
				durationMinutes: 90, // 1.5h = 90 min (10:00 - 11:30)
				status: "confirmed",
			};

			const result = findDoctorFreeSlots({
				doctorId: "doc-1",
				startDate: "2026-08-25",
				horizonDays: 1,
				durationMinutes: 30,
				stepMinutes: 30,
				clinicStartHour: 9,
				clinicEndHour: 13,
				chairs: [{ id: "chair-1", name: "Кабинет 1", active: true }],
				appointments: [apptMissingEndsAt],
			});

			const times = (result[0]?.slots ?? []).map((s) => s.startTime);
			// 10:00, 10:30, 11:00 must be blocked!
			assert.ok(!times.includes("10:00"));
			assert.ok(!times.includes("10:30"));
			assert.ok(!times.includes("11:00"));
			// 11:30 should be free!
			assert.ok(times.includes("11:30"));
		});
	});

	describe("6. SlotConflictModal Comprehensive Rendering", () => {
		it("renders inline conflict container with all required options: shift, alternative chair, and suggested slots", () => {
			const html = renderToString(
				React.createElement(SlotConflictModal, {
					isOpen: true,
					inline: true,
					onClose: () => {},
					conflictMessage: "Выбранное время уже занято приёмом на Кресле 1",
					conflictType: "chair",
					suggestedSlots: ["12:00", "12:30", "14:00"],
					onSelectSlot: () => {},
					onShiftMinutes: () => {},
					shiftMinutesList: [15, 30, 45, 60],
					alternativeChairs: [
						{ id: "chair-2", name: "Кресло 2 (Хирургия)" },
					],
					onMoveToChair: () => {},
					onOverbook: () => {},
					patientName: "Смирнова Ольга",
					doctorName: "Д-р Васильев",
				}),
			);

			// Testids check
			assert.ok(html.includes('data-testid="slot-conflict-modal"'), "renders modal root");
			assert.ok(html.includes('data-testid="slot-conflict-shift-section"'), "renders shift section");
			assert.ok(html.includes('data-testid="shift-minutes-15"'), "renders +15 min button");
			assert.ok(html.includes('data-testid="shift-minutes-30"'), "renders +30 min button");
			assert.ok(html.includes('data-testid="shift-minutes-45"'), "renders +45 min button");
			assert.ok(html.includes('data-testid="shift-minutes-60"'), "renders +60 min button");
			assert.ok(html.includes('data-testid="slot-conflict-alternative-chairs-section"'), "renders alternative chairs section");
			assert.ok(html.includes("Перенести на Кресло 2 (Хирургия)"), "renders alternative chair button text");
			assert.ok(html.includes('data-testid="suggested-slot-btn"'), "renders suggested free slot buttons");
			assert.ok(html.includes('data-testid="slot-conflict-overbook-btn"'), "renders CITO overbook button");
		});

		it("displays strict doctor double-booking warning banner when conflictType is doctor", () => {
			const html = renderToString(
				React.createElement(SlotConflictModal, {
					isOpen: true,
					inline: true,
					onClose: () => {},
					conflictMessage: "Врач уже ведёт приём в другом кабинете",
					conflictType: "doctor",
					suggestedSlots: ["15:00"],
					onSelectSlot: () => {},
					patientName: "Кузнецов А.",
					doctorName: "Д-р Смирнов",
				}),
			);

			assert.ok(html.includes('data-testid="doctor-double-booking-warning"'), "must render doctor double booking alert");
			assert.ok(html.includes("Врачебная коллизия"), "contains clinical collision heading");
			assert.ok(html.includes("Одновременное ведение двух инвазивных приёмов строго запрещено"), "contains mandatory medical prohibition message");
		});
	});
});
