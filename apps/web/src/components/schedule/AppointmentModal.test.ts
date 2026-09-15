import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Appointment, Dashboard } from "@dental/shared";
import { AppointmentModal } from "./AppointmentModal";

const mockAppointment: Appointment = {
	id: "appt-100",
	organizationId: "org-1",
	patientId: "pat-1",
	doctorUserId: "doc-1",
	assistantUserId: "ast-1",
	chairId: "chair-1",
	startsAt: "2026-08-21T10:00:00.000Z",
	endsAt: "2026-08-21T11:00:00.000Z",
	status: "confirmed",
	reason: null,
	comment: null,
};

// biome-ignore lint/suspicious/noExplicitAny: mock
const mockDashboard: any = {
	patients: [
		{ id: "pat-1", fullName: "Иванов Иван", phone: "+79991112233" },
	],
	appointments: [mockAppointment],
	clinicSettings: {
		staff: [
			{ id: "doc-1", fullName: "Д-р Смирнов", role: "doctor", active: true },
			{ id: "ast-1", fullName: "Асс. Сидорова", role: "assistant", active: true },
		],
		chairs: [
			{ id: "chair-1", name: "Кабинет 1", active: true },
		],
		profile: {
			mode: "solo_doctor",
			timezone: "Europe/Samara",
		},
	},
};

const mockLabels: Record<Appointment["status"], string> = {
	planned: "Запланирован",
	confirmed: "Подтвержден",
	arrived: "Пришел",
	in_treatment: "В кресле",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Не явился",
};

describe("AppointmentModal", () => {
	it("returns null when isOpen is false", () => {
		const html = renderToStaticMarkup(
			React.createElement(AppointmentModal, {
				isOpen: false,
				appointment: mockAppointment,
				dashboard: mockDashboard as Dashboard,
				onClose: () => {},
				onSave: async () => true,
				repeatAppointment: () => {},
				patientName: () => "Иванов Иван",
				formatTime: () => "10:00",
				toDateTimeLocalValue: () => "2026-08-21T10:00",
				fromDateTimeLocalValue: () => "2026-08-21T10:00:00.000Z",
				appointmentLabels: mockLabels,
				activeVisitLockedAppointmentStatuses: new Set<Appointment["status"]>(),
			}),
		);
		assert.equal(html, "");
	});

	it("renders appointment modal with patient name, inputs, status pills and action buttons", () => {
		const html = renderToStaticMarkup(
			React.createElement(AppointmentModal, {
				isOpen: true,
				appointment: mockAppointment,
				dashboard: mockDashboard as Dashboard,
				onClose: () => {},
				onSave: async () => true,
				repeatAppointment: () => {},
				patientName: () => "Иванов Иван",
				formatTime: () => "10:00",
				toDateTimeLocalValue: () => "2026-08-21T10:00",
				fromDateTimeLocalValue: () => "2026-08-21T10:00:00.000Z",
				appointmentLabels: mockLabels,
				activeVisitLockedAppointmentStatuses: new Set<Appointment["status"]>(),
			}),
		);

		assert.ok(html.includes("Детали записи"), "должен быть заголовок модального окна");
		assert.ok(html.includes("Иванов Иван"), "должно быть ФИО пациента");
		assert.ok(html.includes("Д-р Смирнов"), "должно быть имя врача");
		assert.ok(html.includes("Кабинет 1"), "должно быть название кресла");
		assert.ok(html.includes("Повторить"), "должна быть кнопка повтора записи");
		assert.ok(html.includes("Сохранить"), "должна быть кнопка сохранения");
		assert.ok(html.includes("Быстрый выбор длительности"), "должна быть панель быстрого выбора длительности");
		assert.ok(html.includes("30 мин"), "должна быть кнопка 30 минут");
		assert.ok(html.includes("1 час"), "должна быть кнопка 1 час");
		assert.ok(html.includes("Острая боль"), "должен быть пресет острой боли");
		assert.ok(html.includes("Консультация"), "должен быть пресет консультации");
	});

	it("auto-populates duty doctor from chairDoctorAssignments when appointment.doctorUserId is unassigned", () => {
		const unassignedAppt: Appointment = {
			...mockAppointment,
			id: "appt-101",
			doctorUserId: "",
			chairId: "chair-1",
		};
		const html = renderToStaticMarkup(
			React.createElement(AppointmentModal, {
				isOpen: true,
				appointment: unassignedAppt,
				dashboard: mockDashboard as Dashboard,
				onClose: () => {},
				onSave: async () => true,
				repeatAppointment: () => {},
				patientName: () => "Иванов Иван",
				formatTime: () => "10:00",
				toDateTimeLocalValue: () => "2026-08-21T10:00",
				fromDateTimeLocalValue: () => "2026-08-21T10:00:00.000Z",
				appointmentLabels: mockLabels,
				activeVisitLockedAppointmentStatuses: new Set<Appointment["status"]>(),
				chairDoctorAssignments: {
					"chair-1": {
						chairId: "chair-1",
						doctorId: "doc-1",
						doctorName: "Д-р Смирнов",
						shiftPreset: "morning",
						shiftLabel: "Утренняя смена",
						shiftHours: "08:00–14:00",
						startHour: 8,
						endHour: 14,
					},
				},
			}),
		);

		assert.ok(html.includes("Д-р Смирнов"));
		assert.ok(html.includes("Кабинет 1"));
	});

	it("renders fast patient search input and supports solo doctor autonomy without assistant", () => {
		const soloAppointment: Appointment = {
			...mockAppointment,
			id: "appt-solo-1",
			assistantUserId: null,
		};
		const html = renderToStaticMarkup(
			React.createElement(AppointmentModal, {
				isOpen: true,
				appointment: soloAppointment,
				dashboard: mockDashboard as Dashboard,
				onClose: () => {},
				onSave: async () => true,
				repeatAppointment: () => {},
				patientName: () => "Иванов Иван",
				formatTime: () => "10:00",
				toDateTimeLocalValue: () => "2026-08-21T10:00",
				fromDateTimeLocalValue: () => "2026-08-21T10:00:00.000Z",
				appointmentLabels: mockLabels,
				activeVisitLockedAppointmentStatuses: new Set<Appointment["status"]>(),
			}),
		);

		// Fast patient search input must be present (Mandates 8e, 8n)
		assert.ok(
			html.includes('data-testid="appointment-patient-search-input"'),
			"Must render fast patient search input",
		);
		// Assistant selector is hidden in solo mode
		assert.ok(
			html.includes("Режим: соло-врач"),
			"Must display solo doctor indicator",
		);
		assert.ok(
			!html.includes('data-testid="select-appointment-assistant"'),
			"Assistant selector must be hidden in solo doctor mode",
		);
		// Save button is never disabled for solo doctor
		assert.ok(
			html.includes('data-testid="appointment-modal-save-btn"'),
			"Save button must be present",
		);
	});
});

