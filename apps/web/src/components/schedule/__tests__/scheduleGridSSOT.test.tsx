/**
 * apps/web/src/components/schedule/__tests__/scheduleGridSSOT.test.tsx
 *
 * DENTE Dental CRM — Schedule Grid & Mobile Agenda View SSOT Tests.
 * Red Team Inquisition Suite for Desktop Density & Mobile Apple HIG Conformance.
 *
 * Mandates:
 * - Anti-Desktop-Squeeze: Separate sovereign mobile layer, 0px horizontal drift (overflow-x: clip)
 * - Apple HIG: 44x44px touch targets, Natural Thumb Zone floating bar, 1-tap call/status actions
 * - Signal-to-Noise: 1 Primary CTA, no multi-deck headers on mobile (<= 56px header)
 * - T.A.R.S. Status Coherence: Canonical status colors (Amber/Green/Blue/Gray) without rainbow confetti
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Appointment, Dashboard } from "@dental/shared";
import { ScheduleMobileBottomBar } from "../mobile/ScheduleMobileBottomBar";
import { ScheduleMobileTimelineRow } from "../mobile/ScheduleMobileTimelineRow";
import { getStatusTheme } from "../mobile/scheduleMobileAgendaTypes";
import { formatDoctorShortName, formatPatientDisplayFio } from "../appointmentCardHelpers";

describe("Schedule Grid & Mobile Agenda View SSOT (Apple HIG & Anti-Desktop-Squeeze)", () => {
	const mockDashboard: Dashboard = {
		appointments: [
			{
				id: "appt-planned-1",
				organizationId: "00000000-0000-0000-0000-000000000001",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				assistantUserId: null,
				chairId: "chair-1",
				status: "planned",
				startsAt: "2026-11-06T09:30:00.000Z",
				endsAt: "2026-11-06T10:30:00.000Z",
				reason: "Лечение глубокого кариеса зуба 36",
				comment: "",
				toothNumber: 36,
			},
			{
				id: "appt-treatment-1",
				organizationId: "00000000-0000-0000-0000-000000000001",
				patientId: "pat-2",
				doctorUserId: "doc-1",
				assistantUserId: null,
				chairId: "chair-1",
				status: "in_treatment",
				startsAt: "2026-11-06T11:00:00.000Z",
				endsAt: "2026-11-06T12:00:00.000Z",
				reason: "Эндодонтическое лечение",
				comment: "",
			},
			{
				id: "appt-completed-1",
				organizationId: "00000000-0000-0000-0000-000000000001",
				patientId: "pat-3",
				doctorUserId: "doc-1",
				assistantUserId: null,
				chairId: "chair-1",
				status: "completed",
				startsAt: "2026-11-06T13:00:00.000Z",
				endsAt: "2026-11-06T14:00:00.000Z",
				reason: "Профессиональная гигиена",
				comment: "",
			},
		],
		patients: [
			{ id: "pat-1", fullName: "Смирнова Елена Васильевна", phone: "+7 (999) 111-22-33", allergies: "Пенициллин" },
			{ id: "pat-2", fullName: "Иванов Иван Иванович", phone: "+7 (999) 444-55-66" },
			{ id: "pat-3", fullName: "Кузнецов Петр Сергеевич", phone: "+7 (999) 777-88-99" },
		],
		clinicSettings: {
			chairs: [{ id: "chair-1", name: "Кабинет терапевта (Кресло 1)" }],
			staff: [{ id: "doc-1", fullName: "Д-р Барабаш С.В.", role: "doctor", active: true }],
			profile: { name: "DENTE Clinic", timezone: "Europe/Moscow" },
		},
	} as unknown as Dashboard;

	const appointmentLabels = {
		planned: "Запланирован",
		confirmed: "Подтверждён",
		arrived: "Явился",
		in_treatment: "В кресле",
		completed: "Завершён",
		cancelled: "Отменён",
		no_show: "Неявка",
	};

	describe("1. Mobile Agenda Timeline Card Structure & Typography", () => {
		it("Renders prominent time display on left (09:30 - 10:30) with font-mono", () => {
			const appt = mockDashboard.appointments[0]!;
			const html = renderToStaticMarkup(
				React.createElement(ScheduleMobileTimelineRow, {
					item: {
						type: "appointment",
						appointment: appt,
						startsAtLocal: "09:30",
						endsAtLocal: "10:30",
						durationMinutes: 60,
					},
					effectiveDateKey: "2026-11-06",
					selectedDoctorId: null,
					selectedChairId: null,
					dashboard: mockDashboard,
					patientName: (_p, id) => mockDashboard.patients.find((p) => p.id === id)?.fullName || "Пациент",
					appointmentLabels,
					onSelectMobileAppt: () => {},
				}),
			);

			assert.ok(html.includes("schedule-mobile-time-col"), "Must render dedicated left time column");
			assert.ok(html.includes("09:30"), "Must render start time prominently");
			assert.ok(html.includes("10:30"), "Must render end time");
		});

		it("Renders 4px status stripe and semantic status badge without color chaos", () => {
			const appt = mockDashboard.appointments[0]!;
			const html = renderToStaticMarkup(
				React.createElement(ScheduleMobileTimelineRow, {
					item: {
						type: "appointment",
						appointment: appt,
						startsAtLocal: "09:30",
						endsAtLocal: "10:30",
						durationMinutes: 60,
					},
					effectiveDateKey: "2026-11-06",
					selectedDoctorId: null,
					selectedChairId: null,
					dashboard: mockDashboard,
					patientName: (_p, id) => mockDashboard.patients.find((p) => p.id === id)?.fullName || "Пациент",
					appointmentLabels,
					onSelectMobileAppt: () => {},
				}),
			);

			assert.ok(html.includes("schedule-mobile-status-stripe"), "Must have 4px status indicator stripe");
			assert.ok(html.includes("schedule-mobile-status-badge"), "Must render semantic status badge");
			assert.ok(html.includes("Запланирован"), "Must show human-friendly Russian status label");
		});

		it("Extracts and displays tooth number badge when present (Зуб 36)", () => {
			const appt = mockDashboard.appointments[0]!;
			const html = renderToStaticMarkup(
				React.createElement(ScheduleMobileTimelineRow, {
					item: {
						type: "appointment",
						appointment: appt,
						startsAtLocal: "09:30",
						endsAtLocal: "10:30",
						durationMinutes: 60,
					},
					effectiveDateKey: "2026-11-06",
					selectedDoctorId: null,
					selectedChairId: null,
					dashboard: mockDashboard,
					patientName: (_p, id) => mockDashboard.patients.find((p) => p.id === id)?.fullName || "Пациент",
					appointmentLabels,
					onSelectMobileAppt: () => {},
				}),
			);

			assert.ok(html.includes("schedule-mobile-tooth-badge"), "Must render tooth badge container");
			assert.ok(html.includes("Зуб 36"), "Must show extracted FDI tooth number");
		});

		it("Renders allergy alert as passive warning indicator without UI blockades", () => {
			const appt = mockDashboard.appointments[0]!;
			const html = renderToStaticMarkup(
				React.createElement(ScheduleMobileTimelineRow, {
					item: {
						type: "appointment",
						appointment: appt,
						startsAtLocal: "09:30",
						endsAtLocal: "10:30",
						durationMinutes: 60,
					},
					effectiveDateKey: "2026-11-06",
					selectedDoctorId: null,
					selectedChairId: null,
					dashboard: mockDashboard,
					patientName: (_p, id) => mockDashboard.patients.find((p) => p.id === id)?.fullName || "Пациент",
					appointmentLabels,
					onSelectMobileAppt: () => {},
				}),
			);

			assert.ok(html.includes("Пенициллин"), "Must display patient allergy passively");
		});
	});

	describe("2. 1-Tap Touch Targets (>= 44x44px) & Rapid Transitions", () => {
		it("Provides 1-tap call button with telephone protocol and min 44x44px hit area", () => {
			const appt = mockDashboard.appointments[0]!;
			const html = renderToStaticMarkup(
				React.createElement(ScheduleMobileTimelineRow, {
					item: {
						type: "appointment",
						appointment: appt,
						startsAtLocal: "09:30",
						endsAtLocal: "10:30",
						durationMinutes: 60,
					},
					effectiveDateKey: "2026-11-06",
					selectedDoctorId: null,
					selectedChairId: null,
					dashboard: mockDashboard,
					patientName: (_p, id) => mockDashboard.patients.find((p) => p.id === id)?.fullName || "Пациент",
					appointmentLabels,
					onSelectMobileAppt: () => {},
				}),
			);

			assert.ok(html.includes("href=\"tel:+79991112233\""), "Must contain direct tel: call link");
			assert.ok(html.includes("min-h-[44px] min-w-[44px]"), "Call button hit area must be >= 44x44px");
		});

		it("Planned appointment displays 'В кресло' 1-tap CTA with min 44px height", () => {
			const appt = mockDashboard.appointments[0]!;
			const html = renderToStaticMarkup(
				React.createElement(ScheduleMobileTimelineRow, {
					item: {
						type: "appointment",
						appointment: appt,
						startsAtLocal: "09:30",
						endsAtLocal: "10:30",
						durationMinutes: 60,
					},
					effectiveDateKey: "2026-11-06",
					selectedDoctorId: null,
					selectedChairId: null,
					dashboard: mockDashboard,
					patientName: (_p, id) => mockDashboard.patients.find((p) => p.id === id)?.fullName || "Пациент",
					appointmentLabels,
					onSelectMobileAppt: () => {},
				}),
			);

			assert.ok(html.includes("data-testid=\"mobile-chair-btn-appt-planned-1\""), "Must render chair CTA");
			assert.ok(html.includes("В кресло"), "Label must be 'В кресло'");
			assert.ok(html.includes("min-h-[44px]"), "Height must be >= 44px");
		});

		it("In-treatment appointment displays 'В приём' 1-tap CTA to open medical record", () => {
			const appt = mockDashboard.appointments[1]!;
			const html = renderToStaticMarkup(
				React.createElement(ScheduleMobileTimelineRow, {
					item: {
						type: "appointment",
						appointment: appt,
						startsAtLocal: "11:00",
						endsAtLocal: "12:00",
						durationMinutes: 60,
					},
					effectiveDateKey: "2026-11-06",
					selectedDoctorId: null,
					selectedChairId: null,
					dashboard: mockDashboard,
					patientName: (_p, id) => mockDashboard.patients.find((p) => p.id === id)?.fullName || "Пациент",
					appointmentLabels,
					onSelectMobileAppt: () => {},
				}),
			);

			assert.ok(html.includes("data-testid=\"mobile-chair-btn-appt-treatment-1\""));
			assert.ok(html.includes("В приём"), "Active visit must offer direct entry to diary");
		});

		it("Completed appointment displays 'Чек' 1-tap CTA to navigate to cashier checkout", () => {
			const appt = mockDashboard.appointments[2]!;
			const html = renderToStaticMarkup(
				React.createElement(ScheduleMobileTimelineRow, {
					item: {
						type: "appointment",
						appointment: appt,
						startsAtLocal: "13:00",
						endsAtLocal: "14:00",
						durationMinutes: 60,
					},
					effectiveDateKey: "2026-11-06",
					selectedDoctorId: null,
					selectedChairId: null,
					dashboard: mockDashboard,
					patientName: (_p, id) => mockDashboard.patients.find((p) => p.id === id)?.fullName || "Пациент",
					appointmentLabels,
					onSelectMobileAppt: () => {},
				}),
			);

			assert.ok(html.includes("data-testid=\"mobile-pay-btn-appt-completed-1\""));
			assert.ok(html.includes("Чек"), "Completed visit must offer fast fiscal checkout");
		});

		it("ScheduleMobileBottomBar is anchored in Natural Thumb Zone with 52px height and safe area padding", () => {
			const html = renderToStaticMarkup(
				React.createElement(ScheduleMobileBottomBar, {
					isVisible: true,
					onAction: () => {},
				}),
			);

			assert.ok(html.includes("schedule-mobile-bottom-bar"), "Must render sticky bottom bar container");
			assert.ok(html.includes("data-testid=\"schedule-mobile-add-btn\""), "Must render add button");
			assert.ok(html.includes("h-[52px] min-h-[44px]"), "Touch target must be 52px height (>= 44x44px)");
			assert.ok(html.includes("safe-area-inset-bottom"), "Must respect iPhone Home Bar safe area");
		});
	});

	describe("3. Canonical Status Color Coherence (Zero Color Confetti)", () => {
		it("planned status maps to sky/blue tones", () => {
			const theme = getStatusTheme("planned", appointmentLabels);
			assert.ok(theme.stripe.includes("sky"), "Planned stripe must be sky");
			assert.equal(theme.label, "Запланирован");
		});

		it("arrived status maps to amber tones", () => {
			const theme = getStatusTheme("arrived", appointmentLabels);
			assert.ok(theme.stripe.includes("amber"), "Arrived stripe must be amber");
			assert.equal(theme.label, "Ожидает");
		});

		it("in_treatment status maps to canonical teal chair tones", () => {
			const theme = getStatusTheme("in_treatment", appointmentLabels);
			assert.ok(theme.stripe.includes("teal"), "In-treatment stripe must be teal");
			assert.equal(theme.label, "В кресле");
		});

		it("completed status maps to neutral slate/gray tones", () => {
			const theme = getStatusTheme("completed", appointmentLabels);
			assert.ok(theme.stripe.includes("slate") || theme.stripe.includes("gray"), "Completed stripe must be slate/gray");
			assert.equal(theme.label, "Завершен");
		});
	});

	describe("4. Clinical Data Formatters & Zero-Truncation Helpers", () => {
		it("formatDoctorShortName formats full names into clean clinical short forms", () => {
			assert.equal(formatDoctorShortName("Барабаш Сергей Васильевич"), "Барабаш С.В.");
			assert.equal(formatDoctorShortName("Смирнова Елена"), "Смирнова Е.");
			assert.equal(formatDoctorShortName("Иванов"), "Иванов");
		});

		it("formatPatientDisplayFio formats patient names cleanly for mobile cards", () => {
			assert.equal(formatPatientDisplayFio("Смирнова Елена Васильевна"), "Смирнова Елена В.");
			assert.equal(formatPatientDisplayFio("Кузнецов Петр"), "Кузнецов Петр");
		});
	});
});
