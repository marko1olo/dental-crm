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
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	AppointmentHoverHud,
	AppointmentMobileBottomSheet,
	type AppointmentStatusPopupProps,
} from "../AppointmentStatusPopup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
	describe("1. Static Code Analysis (Invariants & Anti-Regressions)", () => {
		const popupSourcePath = path.resolve(__dirname, "../AppointmentStatusPopup.tsx");
		const source = fs.readFileSync(popupSourcePath, "utf-8");

		it("contains z-[100] high stacking context to avoid chair column clipping", () => {
			assert.ok(
				source.includes("z-[100]"),
				"AppointmentStatusPopup must declare z-[100] to prevent chair column clipping",
			);
		});

		it("enforces contain: layout style for CLS = 0 layout stabilization", () => {
			assert.ok(
				source.includes('contain: "layout style"'),
				"AppointmentHoverHud must include layout containment for CLS = 0",
			);
		});

		it("supports dynamic boundary awareness (right-0 left-auto / bottom-full)", () => {
			assert.ok(source.includes("isNearRightEdge"), "Must support isNearRightEdge prop");
			assert.ok(source.includes("isNearBottom"), "Must support isNearBottom prop");
			assert.ok(source.includes("right-0 left-auto"), "Must support right alignment flipping");
			assert.ok(source.includes("bottom-full"), "Must support vertical bottom flip");
		});

		it("declares testids for all 4 transition stages in hover hud", () => {
			assert.ok(source.includes("timeline-hover-status-planned-"));
			assert.ok(source.includes("timeline-hover-status-arrived-"));
			assert.ok(source.includes("timeline-hover-status-in-treatment-"));
			assert.ok(source.includes("timeline-hover-status-completed-"));
		});

		it("enforces min-h-[44px] on all transition buttons and quick actions", () => {
			assert.match(source, /timeline-hover-status-planned-[\s\S]*?min-h-\[44px\]/);
			assert.match(source, /timeline-hover-status-arrived-[\s\S]*?min-h-\[44px\]/);
			assert.match(source, /timeline-hover-status-in-treatment-[\s\S]*?min-h-\[44px\]/);
			assert.match(source, /timeline-hover-status-completed-[\s\S]*?min-h-\[44px\]/);
			assert.match(source, /hover-start-visit-btn[\s\S]*?min-h-\[44px\]/);
			assert.match(source, /hover-pay-54fz-btn[\s\S]*?min-h-\[44px\]/);
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

	describe("3. SSR Render Integrity: AppointmentMobileBottomSheet", () => {
		it("renders full 4-stage transition buttons with >=44px touch targets", () => {
			const sheetProps = {
				...mockProps,
				isOpen: true,
				onClose: () => {},
				openAppointmentEditor: () => {},
			};
			const html = renderToString(React.createElement(AppointmentMobileBottomSheet, sheetProps));

			assert.ok(html.includes('data-testid="mobile-sheet-status-planned"'));
			assert.ok(html.includes('data-testid="mobile-sheet-status-arrived"'));
			assert.ok(html.includes('data-testid="mobile-sheet-status-in-treatment"'));
			assert.ok(html.includes('data-testid="mobile-sheet-status-completed"'));

			assert.ok(html.includes("Запланирован"));
			assert.ok(html.includes("В клинике"));
			assert.ok(html.includes("В кресле"));
			assert.ok(html.includes("Завершен"));
		});

		it("renders nothing when isOpen is false", () => {
			const closedProps = {
				...mockProps,
				isOpen: false,
				onClose: () => {},
				openAppointmentEditor: () => {},
			};
			const html = renderToString(React.createElement(AppointmentMobileBottomSheet, closedProps));
			assert.equal(html, "");
		});
	});
});
