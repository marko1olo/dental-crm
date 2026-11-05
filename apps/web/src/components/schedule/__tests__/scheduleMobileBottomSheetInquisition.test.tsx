import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Appointment, Dashboard } from "@dental/shared";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ScheduleMobileBottomSheet } from "../grid/ScheduleMobileBottomSheet";

describe("ScheduleMobileBottomSheet Red Team Inquisition", () => {
	const mockAppointment: Appointment = {
		id: "appt-mobile-1",
		organizationId: "org-1",
		patientId: "patient-101",
		doctorUserId: "doc-1",
		chairId: "chair-1",
		startsAt: "2026-10-19T10:00:00Z",
		endsAt: "2026-10-19T11:00:00Z",
		status: "confirmed",
		reason: "Лечение кариеса 16 зуба",
		comment: "",
	};

	const mockDashboard: Dashboard = {
		patients: [
			{
				id: "patient-101",
				fullName: "Иванов Иван Иванович",
				phone: "+79991234567",
				balanceRub: 1500,
			},
		],
		clinicSettings: {
			chairs: [{ id: "chair-1", name: "Кабинет 1", color: "#0d9488" }],
			staff: [
				{
					id: "doc-1",
					fullName: "Доктор Смирнов А. В.",
					role: "Стоматолог-терапевт",
				},
			],
			profile: {
				clinicName: "Клиника ДЕНТЕ",
				address: "г. Москва, ул. Ленина, 10",
				phone: "+7 (495) 123-45-67",
			},
		},
	} as unknown as Dashboard;

	const noop = () => {};
	const mockProps = {
		selectedMobileAppt: mockAppointment,
		onClose: noop,
		patientName: () => "Иванов Иван Иванович",
		dashboard: mockDashboard,
		timezone: "Europe/Moscow",
		toDateTimeLocalValue: (_iso: string) => "2026-10-19T13:00",
		appointmentLabels: {
			planned: "Запланирован",
			confirmed: "Подтверждён",
			arrived: "В холле",
			in_treatment: "В кресле",
			completed: "Завершён",
			no_show: "Не явился",
			cancelled: "Отменён",
		} as Record<Appointment["status"], string>,
		effectiveChairs: [{ id: "chair-1", name: "Кабинет 1", color: "#0d9488" }],
		doctors: [{ id: "doc-1", fullName: "Доктор Смирнов А. В." }],
		onAppointmentClick: noop,
		onQuickStatusChange: noop,
		handleAdjustAppointmentDuration: noop,
		handleShiftAppointmentLateness: noop,
		handleReassignAppointmentChair: noop,
		handleReassignAppointmentDoctor: noop,
		handleFreeSlotToWaitlist: noop,
	};

	it("1. Renders mobile sheet with patient details, balance, phone, and doctor", () => {
		const html = renderToStaticMarkup(
			<ScheduleMobileBottomSheet {...mockProps} />,
		);

		assert.ok(html.includes("Иванов Иван Иванович"));
		assert.ok(html.includes("+79991234567"));
		assert.match(html, /Депозит: \+1[\s\u00a0]500 ₽/);
		assert.ok(html.includes("Доктор Смирнов А. В."));
		assert.ok(html.includes('data-testid="schedule-grid-mobile-bottom-sheet"'));
	});

	it("2. Features 1-click clinical entry CTA and separates appointment edit drawer", () => {
		const html = renderToStaticMarkup(
			<ScheduleMobileBottomSheet {...mockProps} />,
		);

		// Primary 1-click clinical entrance to EMR / visit diary
		assert.ok(
			html.includes('data-testid="mobile-sheet-open-visit-appt-mobile-1"'),
		);
		assert.ok(html.includes("Начать приём в кресле"));

		// Secondary edit drawer
		assert.ok(
			html.includes('data-testid="mobile-sheet-edit-appt-appt-mobile-1"'),
		);
		assert.ok(html.includes("Изменить запись в расписании"));
	});

	it("3. Renders full suite of 1-click status triggers", () => {
		const html = renderToStaticMarkup(
			<ScheduleMobileBottomSheet {...mockProps} />,
		);

		assert.ok(
			html.includes('data-testid="mobile-status-confirmed-appt-mobile-1"'),
		);
		assert.ok(html.includes('data-testid="mobile-status-arrived-appt-mobile-1"'));
		assert.ok(
			html.includes('data-testid="mobile-status-in-treatment-appt-mobile-1"'),
		);
		assert.ok(
			html.includes('data-testid="mobile-status-completed-appt-mobile-1"'),
		);
	});

	it("4. Touch targets conform to Apple HIG minimum touch area (>= 44px)", () => {
		const html = renderToStaticMarkup(
			<ScheduleMobileBottomSheet {...mockProps} />,
		);

		// Buttons have min-h-[44px] or min-h-[48px]
		assert.ok(html.includes("min-h-[48px]"));
		assert.ok(html.includes("min-h-[44px]"));
	});
});
