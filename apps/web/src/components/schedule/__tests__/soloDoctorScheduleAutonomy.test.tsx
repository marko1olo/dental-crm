import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { ScheduleGrid, DEFAULT_SOLO_CHAIR } from "../ScheduleGrid";
import type { Dashboard } from "@dental/shared";

const mockLabels = {
	planned: "Запланирован",
	confirmed: "Подтвержден",
	arrived: "Пришел",
	in_treatment: "В кресле",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Не явился",
};

describe("Solo Doctor Schedule Autonomy (Mandates 8e, 8n)", () => {
	it("exports DEFAULT_SOLO_CHAIR with resilient fallback configuration", () => {
		assert.equal(DEFAULT_SOLO_CHAIR.id, "default-chair");
		assert.equal(DEFAULT_SOLO_CHAIR.name, "Кресло 1 (Основное)");
		assert.equal(DEFAULT_SOLO_CHAIR.room, "1");
		assert.equal(DEFAULT_SOLO_CHAIR.isActive, true);
	});

	it("renders ScheduleGrid with DEFAULT_SOLO_CHAIR when chairs array is completely empty", () => {
		const emptyChairsDashboard = {
			clinicSettings: {
				profile: {
					organizationId: "c-solo",
					clinicName: "Стоматолог ИП Соловьев",
					timezone: "Europe/Moscow",
					phone: "+7 900 123-45-67",
					address: "Москва",
					inn: "770123456789",
					mode: "solo_practice",
					updatedAt: new Date().toISOString(),
				},
				chairs: [],
				staff: [
					{
						id: "doc-solo",
						organizationId: "c-solo",
						fullName: "Д-р Соловьев А.В.",
						role: "doctor",
						active: true,
						color: "#0d9488",
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					},
				],
			},
			appointments: [],
			patients: [],
			inventory: [],
			treatmentPlans: [],
			invoices: [],
		} as unknown as Dashboard;

		const html = renderToString(
			React.createElement(ScheduleGrid, {
				dashboard: emptyChairsDashboard,
				dateKey: "2026-09-07",
				appointments: [],
				onSlotClick: () => {},
				onAppointmentClick: () => {},
				patientName: (_, id) => (id ? "Пациент" : "—"),
				formatTime: (iso: string) => iso.slice(11, 16),
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: mockLabels,
			})
		);

		assert.match(html, /Кресло 1 \(Основное\)/);
		assert.match(html, /repeat\(1, minmax\((180|200)px, 1fr\)\)/);
		assert.match(html, /09:00/);
		assert.match(html, /18:00/);
	});

	it("renders ScheduleGrid with DEFAULT_SOLO_CHAIR when clinicSettings has undefined chairs", () => {
		const undefinedChairsDashboard = {
			clinicSettings: {
				profile: {
					timezone: "Europe/Moscow",
				},
			},
			appointments: [],
			patients: [],
		} as unknown as Dashboard;

		const html = renderToString(
			React.createElement(ScheduleGrid, {
				dashboard: undefinedChairsDashboard,
				dateKey: "2026-09-07",
				appointments: [],
				onSlotClick: () => {},
				onAppointmentClick: () => {},
				patientName: (_, id) => (id ? "Пациент" : "—"),
				formatTime: (iso: string) => iso.slice(11, 16),
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: mockLabels,
			})
		);

		assert.match(html, /Кресло 1 \(Основное\)/);
		assert.match(html, /repeat\(1, minmax\((180|200)px, 1fr\)\)/);
	});
});
