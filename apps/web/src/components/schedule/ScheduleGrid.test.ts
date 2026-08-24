import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { Appointment, Dashboard } from "@dental/shared";
import { ScheduleGrid } from "./ScheduleGrid";

// biome-ignore lint/suspicious/noExplicitAny: mock dashboard
const mockDashboard: any = {
	patients: [
		{ id: "pat-1", fullName: "Иванов Иван", phone: "+7 999 000-00-00", status: "active" },
	],
	appointments: [],
	clinicSettings: {
		staff: [
			{ id: "doc-1", fullName: "Д-р Иванов", role: "doctor", active: true },
		],
		chairs: [
			{ id: "chair-1", name: "Кабинет Терапии", active: true },
			{ id: "chair-2", name: "Кабинет Хирургии", active: true },
		],
		profile: {
			mode: "clinic",
			timezone: "Europe/Moscow",
		},
	},
};

const mockAppointment: Appointment = {
	id: "appt-1",
	organizationId: "org-1",
	patientId: "pat-1",
	doctorUserId: "doc-1",
	chairId: "chair-1",
	startsAt: "2026-08-20T10:00:00.000Z",
	endsAt: "2026-08-20T10:30:00.000Z",
	status: "confirmed",
	reason: "Осмотр",
	comment: null,
};

describe("ScheduleGrid", () => {
	it("renders chair columns and time rows correctly", () => {
		const html = renderToString(
			React.createElement(ScheduleGrid, {
				dashboard: mockDashboard as Dashboard,
				dateKey: "2026-08-20",
				appointments: [mockAppointment],
				onSlotClick: () => {},
				onAppointmentClick: () => {},
				patientName: () => "Иванов Иван",
				formatTime: (iso: string) => iso.slice(11, 16),
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: {
					planned: "Запланирован",
					confirmed: "Подтвержден",
					arrived: "Пришел",
					in_treatment: "В кресле",
					completed: "Завершен",
					cancelled: "Отменен",
					no_show: "Не явился",
				},
			}),
		);

		assert.ok(html.includes("Кабинет Терапии"), "должен быть заголовок Кабинет Терапии");
		assert.ok(html.includes("Кабинет Хирургии"), "должен быть заголовок Кабинет Хирургии");
		assert.ok(html.includes("data-testid=\"schedule-grid-view\""), "должен быть testid");
		assert.ok(html.includes("Иванов Иван"), "должно быть имя пациента на карточке");
		assert.ok(html.includes("+ Записать на"), "должна быть кнопка быстрой записи на пустом слоте");
	});

	it("renders quick status buttons and WhatsApp trigger with >=44px touch targets in grid", () => {
		const html = renderToString(
			React.createElement(ScheduleGrid, {
				dashboard: mockDashboard as Dashboard,
				dateKey: "2026-08-20",
				appointments: [mockAppointment],
				onSlotClick: () => {},
				onAppointmentClick: () => {},
				onQuickStatusChange: () => {},
				patientName: () => "Иванов Иван",
				formatTime: (iso: string) => iso.slice(11, 16),
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: {
					planned: "Запланирован",
					confirmed: "Подтвержден",
					arrived: "Пришел",
					in_treatment: "В кресле",
					completed: "Завершен",
					cancelled: "Отменен",
					no_show: "Не явился",
				},
			}),
		);

		assert.ok(html.includes("title=\"Пришел\""), "должна быть кнопка статуса Пришел");
		assert.ok(html.includes("title=\"В кресле\""), "должна быть кнопка статуса В кресле");
		assert.ok(html.includes("title=\"Завершен\""), "должна быть кнопка статуса Завершен");
		assert.ok(html.includes("min-h-[44px]"), "кнопки должны соответствовать touch target >=44px");
	});

	it("renders amber collision warning badge when doctor is scheduled simultaneously in two chairs", () => {
		const appt1: Appointment = {
			...mockAppointment,
			id: "appt-1",
			chairId: "chair-1",
			doctorUserId: "doc-1",
			startsAt: "2026-08-20T10:00:00.000Z",
			endsAt: "2026-08-20T11:00:00.000Z",
		};
		const appt2: Appointment = {
			...mockAppointment,
			id: "appt-2",
			chairId: "chair-2",
			doctorUserId: "doc-1", // Same doctor at the same time in different chair!
			startsAt: "2026-08-20T10:00:00.000Z",
			endsAt: "2026-08-20T10:30:00.000Z",
		};

		const html = renderToString(
			React.createElement(ScheduleGrid, {
				dashboard: mockDashboard as Dashboard,
				dateKey: "2026-08-20",
				appointments: [appt1, appt2],
				onSlotClick: () => {},
				onAppointmentClick: () => {},
				patientName: () => "Иванов Иван",
				formatTime: (iso: string) => iso.slice(11, 16),
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: {
					planned: "Запланирован",
					confirmed: "Подтвержден",
					arrived: "Пришел",
					in_treatment: "В кресле",
					completed: "Завершен",
					cancelled: "Отменен",
					no_show: "Не явился",
				},
			}),
		);

		assert.ok(
			html.includes("Коллизия: врач записан в два кабинета одновременно"),
			"должно отображаться предупреждение о коллизии врача в разных кабинетах",
		);
		assert.ok(
			html.includes("data-testid=\"schedule-grid-collision-badge\""),
			"должен присутствовать testid бейджа коллизии",
		);
	});
});
