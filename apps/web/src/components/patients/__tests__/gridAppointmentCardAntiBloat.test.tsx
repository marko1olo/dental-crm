import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Appointment, Patient } from "@dental/shared";
import { GridAppointmentCard } from "../../schedule/GridAppointmentCard.js";
import { GridAppointmentMenu } from "../../schedule/GridAppointmentMenu.js";

const samplePatients: Patient[] = [{
	id: "pat-1", organizationId: "org-1", fullName: "Иванов Иван Иванович",
	phone: "+7 (916) 111-22-33", birthDate: "1985-05-15", status: "active",
	balanceRub: 3500, allergies: "Аллергия на пенициллин",
	createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
}];

const mockAppointment: Appointment = {
	id: "appt-wave61-1", organizationId: "org-1", patientId: "pat-1",
	doctorUserId: "doc-1", chairId: "chair-1", assistantUserId: null,
	startsAt: "2026-08-20T10:00:00.000Z", endsAt: "2026-08-20T10:30:00.000Z",
	status: "planned", reason: "Лечение кариеса", comment: "",
};

const mockDashboard: any = {
	patients: samplePatients,
	appointments: [mockAppointment],
	clinicSettings: {
		staff: [{ id: "doc-1", fullName: "Смирнова Анна Владимировна", role: "doctor", active: true }],
		chairs: [{ id: "chair-1", name: "Кабинет 1", active: true }],
		profile: { mode: "standard", timezone: "Europe/Moscow" },
	},
};

describe("2. GridAppointmentCard Anti-Bloat & Ergonomics", () => {
	it("renders at most 2 primary visible controls per card in the action row (В приём + ...)", () => {
		const patientLookup = new Map([["pat-1", samplePatients[0]]]);
		const staffLookup = new Map([["doc-1", mockDashboard.clinicSettings.staff[0]]]);

		const html = renderToStaticMarkup(
			React.createElement(GridAppointmentCard, {
				appointment: mockAppointment,
				chair: { id: "chair-1", name: "Кабинет 1" },
				effectiveChairs: [{ id: "chair-1", name: "Кабинет 1" }],
				doctors: mockDashboard.clinicSettings.staff,
				patientLookupMap: patientLookup,
				staffLookupMap: staffLookup,
				collisionMap: new Map(),
				dashboard: mockDashboard,
				timezone: "Europe/Moscow",
				toDateTimeLocalValue: (iso) => iso,
				appointmentLabels: { planned: "Запланирован", confirmed: "Подтвержден", arrived: "Прибыл", in_treatment: "В кресле", completed: "Завершен", cancelled: "Отменен", no_show: "Не явился" },
				isHovered: false,
				isStatusPickerOpen: false,
				isMenuOpen: false,
				isNearBottom: false,
				isNearRightEdge: false,
				onAppointmentClick: () => {},
				onSelectMobileAppt: () => {},
				onAdjustDuration: () => {},
				onShiftLateness: () => {},
				onReassignChair: () => {},
				onReassignDoctor: () => {},
				onFreeSlotToWaitlist: () => {},
				onMouseEnter: () => {},
				onMouseLeave: () => {},
				onKeepHovered: () => {},
				onToggleStatusPicker: () => {},
				onToggleMenu: () => {},
				onCloseStatusPicker: () => {},
				onCloseMenu: () => {},
			}),
		);

		assert.ok(html.includes('data-testid="appointment-action-start-appt-wave61-1"'));
		assert.ok(html.includes('aria-label="Дополнительные действия визита"'));
		assert.ok(!html.includes('data-testid="appointment-action-pay-'));
		assert.ok(!html.includes('data-testid="appointment-action-call-'));
		assert.ok(html.includes("appointment-action-visit"));
		assert.ok(html.includes("appointment-action-more"));
	});

	it("GridAppointmentMenu contains fast access to cash register and phone call", () => {
		const html = renderToStaticMarkup(
			React.createElement(GridAppointmentMenu, {
				appointment: mockAppointment,
				pName: "Иванов И. И.",
				patObj: samplePatients[0],
				docObj: mockDashboard.clinicSettings.staff[0],
				effectiveChairs: [{ id: "chair-1", name: "Кабинет 1" }],
				doctors: mockDashboard.clinicSettings.staff,
				dashboard: mockDashboard,
				isMenuOpen: true,
				onAppointmentClick: () => {},
				onCloseMenu: () => {},
				onAdjustDuration: () => {},
				onShiftLateness: () => {},
				onReassignChair: () => {},
				onReassignDoctor: () => {},
				onFreeSlotToWaitlist: () => {},
			}),
		);

		assert.ok(html.includes('data-testid="menu-pay-btn-appt-wave61-1"'));
		assert.ok(html.includes('data-testid="menu-call-btn-appt-wave61-1"'));
	});
});
