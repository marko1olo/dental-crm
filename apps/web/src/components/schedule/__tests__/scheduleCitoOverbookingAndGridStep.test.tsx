/**
 * scheduleCitoOverbookingAndGridStep.test.tsx
 *
 * Wave 40 Parity Suite — Feature 192 (Mandates 8b, 8zi):
 * - Feature 192: CITO overbooking during Drag-and-Drop & Schedule grid step selector (15/30/60m)
 */

import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ScheduleGrid,
	generateTimeSlots,
} from "../ScheduleGrid";
import {
	checkAppointmentResourceCollision,
	isCitoAppointment,
} from "../../../utils/scheduleCollisionUtils";
import type { Appointment, Dashboard } from "@dental/shared";

const mockDashboard = {
	stats: {
		totalPatients: 10,
		activeTreatmentPlans: 2,
		todayAppointmentsCount: 2,
		monthRevenue: 150000,
	},
	todayAppointments: [],
	recentPatients: [],
	clinicSettings: {
		profile: {
			clinicName: "Клиника ДЕНТЕ",
			address: "г. Москва, ул. Ленина, д. 1",
			phone: "+7 495 123-45-67",
			timezone: "Europe/Moscow",
		},
		staff: [
			{
				id: "doc-1",
				fullName: "Иванов Иван Иванович",
				role: "doctor",
				specialties: ["therapist"],
				active: true,
			},
			{
				id: "doc-2",
				fullName: "Петров Петр Петрович",
				role: "doctor",
				specialties: ["surgeon"],
				active: true,
			},
		],
		chairs: [
			{
				id: "chair-1",
				name: "Кресло 1 (Терапия)",
				room: "1",
				color: "#0d9488",
				active: true,
			},
			{
				id: "chair-2",
				name: "Кресло 2 (Хирургия)",
				room: "2",
				color: "#2563eb",
				active: true,
			},
		],
	},
	patients: [
		{
			id: "pat-1",
			fullName: "Смирнов Алексей Владимирович",
			phone: "+7 999 111-22-33",
			birthDate: "1985-05-10",
		},
		{
			id: "pat-2",
			fullName: "Кузнецова Мария Ивановна",
			phone: "+7 999 444-55-66",
			birthDate: "1990-12-15",
		},
	],
} as unknown as Dashboard;

const defaultAppointmentLabels = {
	planned: "Запланирован",
	confirmed: "Подтвержден",
	arrived: "Прибыл",
	in_treatment: "В кресле",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Не явился",
};

describe("Feature 192: CITO Overbooking & Configurable Grid Step", () => {
	it("isCitoAppointment correctly detects CITO / emergency appointments", () => {
		assert.strictEqual(isCitoAppointment({ isCito: true }), true);
		assert.strictEqual(isCitoAppointment({ cito: true } as any), true);
		assert.strictEqual(isCitoAppointment({ isEmergency: true }), true);
		assert.strictEqual(isCitoAppointment({ reason: "Острая боль, пульпит" }), true);
		assert.strictEqual(isCitoAppointment({ reason: "Плановый осмотр" }), false);
		assert.strictEqual(isCitoAppointment(null), false);
	});

	it("checkAppointmentResourceCollision permits CITO-overbooking on doctor/chair slot with isCitoOverbooking: true", () => {
		const existingAppts: Appointment[] = [
			{
				id: "appt-1",
				startsAt: "2026-09-08T10:00:00.000Z",
				endsAt: "2026-09-08T11:00:00.000Z",
				chairId: "chair-1",
				doctorUserId: "doc-1",
				patientId: "pat-1",
				status: "confirmed",
				reason: "Кариес",
				organizationId: "org-1",
				comment: null,
			} as unknown as Appointment,
		];

		// Standard non-CITO booking triggers hard collision
		const standardResult = checkAppointmentResourceCollision(
			{
				startsAt: "2026-09-08T10:30:00.000Z",
				endsAt: "2026-09-08T11:00:00.000Z",
				chairId: "chair-1",
				doctorUserId: "doc-1",
				patientId: "pat-2",
				isCito: false,
			},
			existingAppts,
			{
				chairs: mockDashboard.clinicSettings.chairs,
				staff: mockDashboard.clinicSettings.staff,
				patients: mockDashboard.patients,
			},
		);
		assert.strictEqual(standardResult.hasCollision, true);
		assert.strictEqual(standardResult.isCitoOverbooking, false);

		// CITO booking (emergency) allows overbooking with isCitoOverbooking = true and hasCollision = false
		const citoResult = checkAppointmentResourceCollision(
			{
				startsAt: "2026-09-08T10:30:00.000Z",
				endsAt: "2026-09-08T11:00:00.000Z",
				chairId: "chair-1",
				doctorUserId: "doc-1",
				patientId: "pat-2",
				isCito: true,
			},
			existingAppts,
			{
				chairs: mockDashboard.clinicSettings.chairs,
				staff: mockDashboard.clinicSettings.staff,
				patients: mockDashboard.patients,
				allowCitoOverbooking: true,
			},
		);
		assert.strictEqual(citoResult.hasCollision, false, "Doctor/chair collision is non-blocking for CITO");
		assert.strictEqual(citoResult.isCitoOverbooking, true, "isCitoOverbooking is flagged true");
		assert.ok(citoResult.message?.includes("Запись по острой боли"), "Message explains CITO booking");
	});

	it("checkAppointmentResourceCollision still blocks duplicate patient even if CITO", () => {
		const existingAppts: Appointment[] = [
			{
				id: "appt-1",
				startsAt: "2026-09-08T10:00:00.000Z",
				endsAt: "2026-09-08T11:00:00.000Z",
				chairId: "chair-1",
				doctorUserId: "doc-1",
				patientId: "pat-1",
				status: "confirmed",
				organizationId: "org-1",
				comment: null,
				reason: null,
			} as unknown as Appointment,
		];

		// Same patient cannot physically be in two places at once
		const patientCollisionResult = checkAppointmentResourceCollision(
			{
				startsAt: "2026-09-08T10:30:00.000Z",
				endsAt: "2026-09-08T11:00:00.000Z",
				chairId: "chair-2",
				doctorUserId: "doc-2",
				patientId: "pat-1",
				isCito: true,
			},
			existingAppts,
			{
				patients: mockDashboard.patients,
				allowCitoOverbooking: true,
			},
		);
		assert.strictEqual(patientCollisionResult.hasCollision, true, "Patient double-booking remains blocked");
		assert.strictEqual(patientCollisionResult.conflictType, "patient");
	});

	it("generateTimeSlots generates correct intervals for 15, 30, and 60 minutes", () => {
		const slots60 = generateTimeSlots(60);
		assert.strictEqual(slots60.length, 13);
		assert.strictEqual(slots60[0], "08:00");
		assert.strictEqual(slots60[slots60.length - 1], "20:00");

		const slots30 = generateTimeSlots(30);
		assert.strictEqual(slots30.length, 25);
		assert.strictEqual(slots30[0], "08:00");
		assert.strictEqual(slots30[1], "08:30");
		assert.strictEqual(slots30[slots30.length - 1], "20:00");

		const slots15 = generateTimeSlots(15);
		assert.strictEqual(slots15.length, 49);
		assert.strictEqual(slots15[0], "08:00");
		assert.strictEqual(slots15[1], "08:15");
		assert.strictEqual(slots15[2], "08:30");
		assert.strictEqual(slots15[3], "08:45");
		assert.strictEqual(slots15[slots15.length - 1], "20:00");
	});

	it("ScheduleGrid renders grid step selector with 15/30/60 buttons and appointment-cito-overbooking-badge", () => {
		const citoAppt: Appointment = {
			id: "appt-cito",
			startsAt: "2026-09-08T09:00:00.000Z",
			endsAt: "2026-09-08T09:30:00.000Z",
			chairId: "chair-1",
			doctorUserId: "doc-1",
			patientId: "pat-1",
			status: "confirmed",
			reason: "Острая боль CITO",
			organizationId: "org-1",
			comment: null,
		} as unknown as Appointment;

		const html = renderToString(
			<ScheduleGrid
				dashboard={mockDashboard}
				dateKey="2026-09-08"
				appointments={[citoAppt]}
				onSlotClick={() => {}}
				onAppointmentClick={() => {}}
				patientName={(_, id) => id || ""}
				formatTime={(iso) => iso.slice(11, 16)}
				toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
				appointmentLabels={defaultAppointmentLabels}
				gridStepMinutes={30}
			/>,
		);

		assert.ok(html.includes('data-testid="schedule-grid-step-selector"'), "renders step selector");
		assert.ok(html.includes('data-testid="btn-grid-step-15"'), "renders 15 min button");
		assert.ok(html.includes('data-testid="btn-grid-step-30"'), "renders 30 min button");
		assert.ok(html.includes('data-testid="btn-grid-step-60"'), "renders 60 min button");
		assert.ok(html.includes('data-testid="appointment-cito-overbooking-badge"'), "renders CITO overbooking badge");
	});
});
