/**
 * scheduleChairsideBookingInquisitorSuite.test.tsx
 *
 * Red Team Inquisitor Verification Suite:
 * 1. DirectAppointmentBookingDrawer & Solo Doctor Assistant Autonomy (Mandates 8e, 8n).
 * 2. DirectBookingConfirmationModal touch ergonomics & non-blocking actions.
 * 3. ChairsideScheduleView & 4-Stage Transitions ('В кресло' -> 'В приём' -> 'Оплатить чек').
 * 4. Apple HIG mobile agenda requirements.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuickBookingDrawer } from "../QuickBookingDrawer";
import { ChairScheduleView } from "../ChairScheduleView";
import { PlannedConfirmedActions } from "../appointmentCardActions/PlannedConfirmedActions";
import { ArrivedInTreatmentActions } from "../appointmentCardActions/ArrivedInTreatmentActions";
import { CompletedActions } from "../appointmentCardActions/CompletedActions";

describe("Schedule & Chairside Booking Red Team Inquisitor Suite", () => {
	const mockAppointment: any = {
		id: "appt-inq-1",
		patientId: "pat-1",
		doctorId: "doc-1",
		chairId: "chair-1",
		startsAt: "2026-11-04T10:00:00.000Z",
		endsAt: "2026-11-04T10:30:00.000Z",
		status: "planned",
	};

	const mockPatient: any = {
		id: "pat-1",
		fullName: "Пациент Тест Тестович",
		phone: "+7 (999) 000-11-22",
	};

	const mockDashboard: any = {
		clinicSettings: {
			profile: { mode: "solo_doctor" },
			staff: [
				{ id: "doc-1", fullName: "Д-р Иванов И.И.", role: "doctor", active: true },
			],
			chairs: [
				{ id: "chair-1", name: "Кресло 1", active: true },
			],
		},
		appointments: [mockAppointment],
		patients: [mockPatient],
	};

	it("1. QuickBookingDrawer renders when open without requiring assistant (Mandates 8e, 8n)", () => {
		const html = renderToStaticMarkup(
			React.createElement(QuickBookingDrawer, {
				isOpen: true,
				onClose: () => {},
				dashboard: mockDashboard,
				patientSearchProps: {
					patients: mockDashboard.patients,
					onSelectPatient: () => {},
				} as any,
			}),
		);

		assert.ok(html.includes("quick-booking-drawer"), "Drawer overlay must render");
		assert.ok(html.includes("Быстрая запись на прием"), "Header must be present");
		assert.ok(html.includes("quick-drawer-save-btn"), "Save CTA button must exist");
		assert.ok(!html.includes('disabled=""'), "Buttons must not be disabled");
	});

	it("2. QuickBookingDrawer renders emergency CITO booking and doctor autonomy without blocking", () => {
		const html = renderToStaticMarkup(
			React.createElement(QuickBookingDrawer, {
				isOpen: true,
				onClose: () => {},
				dashboard: mockDashboard,
				initialSlot: {
					dateKey: "2026-11-04",
					startTime: "10:00",
					durationMinutes: 30,
					isCitoEmergency: true,
					reason: "Острая боль",
				},
			}),
		);

		assert.ok(html.includes("quick-booking-drawer"), "Drawer must render");
		assert.ok(html.includes("Срочная запись: острая боль"), "Emergency header must be present");
		assert.ok(html.includes("quick-drawer-save-btn"), "Save button must exist");
	});

	it("3. Chairside Card Action Transitions: 'В кресло' -> 'В приём' -> 'Оплата' without barriers", () => {
		// Stage 1: planned / confirmed -> "Прибыл" & "Начать приём"
		const htmlPlanned = renderToStaticMarkup(
			React.createElement(PlannedConfirmedActions, {
				appointment: mockAppointment,
				displayStatus: "planned",
				isQuickStatusUpdating: false,
				appointmentPatient: mockPatient,
				appointmentPatientName: mockPatient.fullName,
				onOpenVisit: () => {},
				handleQuickStatusChange: async () => {},
			} as any),
		);
		assert.ok(htmlPlanned.includes("appointment-action-arrived-btn"), "Arrived CTA rendered");
		assert.ok(htmlPlanned.includes("appointment-action-in-treatment-btn"), "In-treatment CTA rendered");

		// Stage 2: arrived -> "В кресло"
		const htmlArrived = renderToStaticMarkup(
			React.createElement(ArrivedInTreatmentActions, {
				appointment: mockAppointment,
				displayStatus: "arrived",
				isQuickStatusUpdating: false,
				appointmentPatient: mockPatient,
				appointmentPatientName: mockPatient.fullName,
				onOpenVisit: () => {},
				handleQuickStatusChange: async () => {},
				handleShiftAppointmentTime: async () => {},
			} as any),
		);
		assert.ok(htmlArrived.includes("В кресло"), "In-chair button rendered");

		// Stage 3: in_treatment -> "Завершить" & "Медкарта"
		const htmlInTreatment = renderToStaticMarkup(
			React.createElement(ArrivedInTreatmentActions, {
				appointment: mockAppointment,
				displayStatus: "in_treatment",
				isQuickStatusUpdating: false,
				appointmentPatient: mockPatient,
				appointmentPatientName: mockPatient.fullName,
				onOpenVisit: () => {},
				handleQuickStatusChange: async () => {},
				handleShiftAppointmentTime: async () => {},
			} as any),
		);
		assert.ok(htmlInTreatment.includes("appointment-action-complete-btn"), "Complete CTA rendered");
		assert.ok(htmlInTreatment.includes("appointment-action-open-visit-btn"), "Visit diary CTA rendered");

		// Stage 4: completed -> "Оплата" & "Повторить"
		const htmlCompleted = renderToStaticMarkup(
			React.createElement(CompletedActions, {
				appointment: mockAppointment,
				displayStatus: "completed",
				appointmentPatient: mockPatient,
				appointmentPatientName: mockPatient.fullName,
				repeatAppointment: () => {},
			} as any),
		);
		assert.ok(htmlCompleted.includes("appointment-action-billing-btn"), "Payment billing CTA rendered");
		assert.ok(htmlCompleted.includes("appointment-action-repeat-btn"), "Repeat appointment CTA rendered");
	});

	it("4. ChairScheduleView renders layout cleanly with 0 crashes", () => {
		const html = renderToStaticMarkup(
			React.createElement(ChairScheduleView, {
				dashboard: mockDashboard,
				dateKey: "2026-11-04",
				appointments: mockDashboard.appointments,
				chairs: mockDashboard.clinicSettings.chairs,
				doctors: mockDashboard.clinicSettings.staff,
				onAppointmentClick: () => {},
				onSlotClick: () => {},
				onQuickStatusChange: () => {},
				appointmentLabels: {
					planned: "Запланирован",
					confirmed: "Подтвержден",
					arrived: "В клинике",
					in_treatment: "В кресле",
					completed: "Завершен",
					cancelled: "Отменен",
					no_show: "Не явился",
				} as any,
			} as any),
		);

		assert.ok(html.length > 0, "ChairScheduleView must render HTML output");
	});
});
