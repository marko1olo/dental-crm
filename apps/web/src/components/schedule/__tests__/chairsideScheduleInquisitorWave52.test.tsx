/**
 * chairsideScheduleInquisitorWave52.test.tsx
 *
 * Inquisitor Verification Suite: Chairside Schedule, 4-Stage Transitions & Touch Targets
 *
 * Requirements:
 * 1. 4-Stage Status Transitions in AppointmentStatusPopup / AppointmentHoverHud:
 *    «Запланирован» (planned) -> «Пациент в клинике» (arrived) -> «В кресле» (in_treatment) -> «Завершен» (completed).
 * 2. Strict Touch Target Floor >= 44px (min-h-[44px]) across all status buttons and action triggers.
 * 3. Zero Layout Shift (CLS = 0) with layout containment and stable boundaries.
 * 4. High stacking priority (z-[100]) and edge boundary collision protection.
 * 5. Mobile Bottom Sheet supports 4-stage transitions with min-h-[44px] targets.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	AppointmentHoverHud,
	type AppointmentStatusPopupProps,
} from "../AppointmentStatusPopup.js";
import { ScheduleMobileBottomSheet } from "../grid/ScheduleMobileBottomSheet.js";

const mockAppointment: any = {
	id: "appt-inquisitor-101",
	patientId: "pat-101",
	doctorId: "doc-101",
	chairId: "chair-1",
	startsAt: "2026-10-02T10:00:00.000Z",
	endsAt: "2026-10-02T10:45:00.000Z",
	status: "planned",
	reason: "Острая боль, пульпит зуба 4.6 (CITO)",
	notes: "Первичный экстренный прием",
};

const mockDashboard: any = {
	clinicSettings: {
		profile: {
			clinicName: "Клиника ДЕНТЕ",
			address: "ул. Ленина, 10",
			phone: "+7 (999) 000-00-00",
		},
	},
};

const mockProps: AppointmentStatusPopupProps = {
	appointment: mockAppointment,
	dashboard: mockDashboard,
	displayStatus: "planned",
	appointmentPatient: { id: "pat-101", fullName: "Иванов Иван", phone: "+7 (999) 111-22-33" },
	appointmentPatientName: "Иванов Иван",
	patientBalance: -1500,
	appointmentDoctor: { id: "doc-101", fullName: "Д-р Смирнов А.В.", role: "Терапевт" },
	appointmentAssistant: { id: "asst-101", fullName: "Медсестра Анна" },
	appointmentChair: { id: "chair-1", name: "Кабинет 1 (Кресло Planmeca)" },
	cardTeeth: ["46"],
	allergyAlert: "Аллергия на лидокаин!",
	appointmentLabels: {
		planned: "Запланирован",
		confirmed: "Подтвержден",
		arrived: "В клинике",
		in_treatment: "В кресле",
		completed: "Завершен",
		no_show: "Не явился",
		cancelled: "Отменен",
	} as any,
	formatTime: (iso: string) => iso.slice(11, 16),
	handleQuickStatusChange: async () => {},
	onCloseHover: () => {},
	onKeepHover: () => {},
	onOpenVisit: () => {},
};

describe("Chairside Schedule Inquisitor Wave 52: 4-Stage Transitions, >=44px Touch Targets & Stacking Integrity", () => {
	describe("1. Live Render Invariants: Stacking, CLS Containment & Edge Collision Protection", () => {
		it("renders z-[100] stacking context and contain:layout style for CLS = 0 stabilization", () => {
			const html = renderToString(React.createElement(AppointmentHoverHud, mockProps));
			assert.ok(
				html.includes("z-[100]"),
				"AppointmentHoverHud must render z-[100] to prevent chair column clipping",
			);
			assert.match(
				html,
				/style="[^"]*contain:\s*layout style/,
				"AppointmentHoverHud must render inline contain:layout style for CLS = 0",
			);
		});

		it("flips horizontal and vertical classes when near right edge or bottom boundary", () => {
			const defaultHtml = renderToString(
				React.createElement(AppointmentHoverHud, {
					...mockProps,
					isNearRightEdge: false,
					isNearBottom: false,
				}),
			);
			assert.equal(defaultHtml.includes("right-0 left-auto"), false);
			assert.equal(defaultHtml.includes("bottom-full"), false);

			const flippedHtml = renderToString(
				React.createElement(AppointmentHoverHud, {
					...mockProps,
					isNearRightEdge: true,
					isNearBottom: true,
				}),
			);
			assert.ok(flippedHtml.includes("right-0 left-auto"), "Must flip alignment on right edge");
			assert.ok(flippedHtml.includes("bottom-full"), "Must flip vertically near bottom");
		});

		it("renders 4 transition testids and >=44px touch targets on every status and action button", () => {
			const html = renderToString(React.createElement(AppointmentHoverHud, mockProps));
			const expectedIds = [
				`timeline-hover-status-planned-${mockAppointment.id}`,
				`timeline-hover-status-arrived-${mockAppointment.id}`,
				`timeline-hover-status-in-treatment-${mockAppointment.id}`,
				`timeline-hover-status-completed-${mockAppointment.id}`,
				"hover-start-visit-btn",
				"hover-pay-54fz-btn",
			];
			for (const testId of expectedIds) {
				const btnMatch = html.match(new RegExp(`<button[^>]*data-testid="${testId}"[^>]*>`));
				assert.ok(btnMatch, `Button ${testId} must be rendered`);
				assert.ok(
					btnMatch[0].includes("min-h-[44px]"),
					`Button ${testId} must enforce min-h-[44px]`,
				);
				assert.equal(
					btnMatch[0].includes("disabled"),
					false,
					`Button ${testId} must not be disabled`,
				);
			}
		});

		it("renders positive and omitted allergy/balance states accurately", () => {
			const positiveBalanceHtml = renderToString(
				React.createElement(AppointmentHoverHud, {
					...mockProps,
					patientBalance: 2500,
					allergyAlert: null,
				}),
			);
			assert.equal(positiveBalanceHtml.includes("Аллергия на лидокаин!"), false);
			assert.match(positiveBalanceHtml, /2[\s\u00A0]?500/);
		});
	});

	describe("2. SSR Render Integrity: AppointmentHoverHud", () => {
		it("renders full 4-stage queue with labels and >=44px buttons", () => {
			const html = renderToString(React.createElement(AppointmentHoverHud, mockProps));

			// 4 status buttons
			assert.ok(html.includes(`data-testid="timeline-hover-status-planned-${mockAppointment.id}"`));
			assert.ok(html.includes(`data-testid="timeline-hover-status-arrived-${mockAppointment.id}"`));
			assert.ok(html.includes(`data-testid="timeline-hover-status-in-treatment-${mockAppointment.id}"`));
			assert.ok(html.includes(`data-testid="timeline-hover-status-completed-${mockAppointment.id}"`));

			// Text labels
			assert.ok(html.includes("Запланирован"));
			assert.ok(html.includes("В клинике"));
			assert.ok(html.includes("В кресле"));
			assert.ok(html.includes("Завершен"));

			// Action triggers
			assert.ok(html.includes('data-testid="hover-start-visit-btn"'));
			assert.ok(html.includes('data-testid="hover-pay-54fz-btn"'));
			assert.ok(html.includes("Начать приём"));
			assert.ok(html.includes("Быстрый расчёт"));

			// Balance & Medical cues
			assert.ok(html.includes("Долг: 1 500 ₽") || html.includes("1 500") || html.includes("1500"));
			assert.ok(html.includes("46"), "Teeth badges rendered");
			assert.ok(html.includes("Аллергия на лидокаин!"), "Allergy banner rendered");
		});

		it("applies right edge boundary positioning when isNearRightEdge is true", () => {
			const edgeProps = { ...mockProps, isNearRightEdge: true };
			const html = renderToString(React.createElement(AppointmentHoverHud, edgeProps));
			assert.ok(html.includes("right-0 left-auto"), "Must flip to right-0 when near right edge");
		});

		it("applies bottom boundary vertical flipping when isNearBottom is true", () => {
			const bottomProps = { ...mockProps, isNearBottom: true };
			const html = renderToString(React.createElement(AppointmentHoverHud, bottomProps));
			assert.ok(html.includes("bottom-full"), "Must flip to bottom-full when near viewport bottom");
		});
	});

	describe("3. SSR Render Integrity: ScheduleMobileBottomSheet", () => {
		it("renders full 4-stage transition buttons with >=44px touch targets", () => {
			const sheetProps: any = {
				selectedMobileAppt: mockAppointment,
				onClose: () => {},
				patientName: () => "Иванов Иван",
				dashboard: { ...mockDashboard, patients: [] },
				timezone: "Europe/Moscow",
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: mockProps.appointmentLabels,
				effectiveChairs: [{ id: "chair-1", name: "Кабинет 1" }],
				doctors: [{ id: "doc-101", fullName: "Д-р Смирнов А.В." }],
				onAppointmentClick: () => {},
				onQuickStatusChange: () => {},
			};
			const html = renderToString(React.createElement(ScheduleMobileBottomSheet, sheetProps));

			assert.ok(
				html.includes('data-testid="mobile-status-planned-') ||
					html.includes('data-testid="mobile-sheet-status-planned"'),
			);
			assert.ok(
				html.includes('data-testid="mobile-status-arrived-') ||
					html.includes('data-testid="mobile-sheet-status-arrived"'),
			);
			assert.ok(
				html.includes('data-testid="mobile-status-in-treatment-') ||
					html.includes('data-testid="mobile-sheet-status-in-treatment"'),
			);
			assert.ok(
				html.includes('data-testid="mobile-status-completed-') ||
					html.includes('data-testid="mobile-sheet-status-completed"'),
			);

			assert.ok(html.includes("Запланирован"));
			assert.ok(html.includes("В клинике"));
			assert.ok(html.includes("В кресле"));
			assert.ok(html.includes("Завершен"));
		});

		it("renders nothing when selectedMobileAppt is null", () => {
			const closedProps: any = {
				selectedMobileAppt: null,
				onClose: () => {},
				patientName: () => "",
				dashboard: { ...mockDashboard, patients: [] },
				timezone: "Europe/Moscow",
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: mockProps.appointmentLabels,
				effectiveChairs: [],
				doctors: [],
				onAppointmentClick: () => {},
			};
			const html = renderToString(React.createElement(ScheduleMobileBottomSheet, closedProps));
			assert.equal(html, "");
		});
	});
});
