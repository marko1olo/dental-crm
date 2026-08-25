import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Dashboard, Patient } from "@dental/shared";
import { QuickBookingDrawer } from "./QuickBookingDrawer";

const mockPatients: Patient[] = [
	{
		id: "pat-1",
		organizationId: "org-1",
		fullName: "Иванов Иван Иванович",
		phone: "+7 999 111-22-33",
		email: null,
		notes: null,
		birthDate: "1990-05-15",
		status: "active",
		balanceRub: 0,
		administrativeProfile: null,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	},
	{
		id: "pat-2",
		organizationId: "org-1",
		fullName: "Смирнова Елена Петровна",
		phone: "+7 999 444-55-66",
		email: null,
		notes: null,
		birthDate: "1985-11-20",
		status: "active",
		balanceRub: 0,
		administrativeProfile: null,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	},
];

// biome-ignore lint/suspicious/noExplicitAny: mock dashboard
const mockDashboard: any = {
	patients: mockPatients,
	appointments: [],
	clinicSettings: {
		staff: [
			{ id: "doc-1", fullName: "Д-р Айболит", role: "doctor", active: true },
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

describe("QuickBookingDrawer", () => {
	it("returns null when isOpen is false", () => {
		const html = renderToStaticMarkup(
			React.createElement(QuickBookingDrawer, {
				isOpen: false,
				onClose: () => {},
				dashboard: mockDashboard as Dashboard,
			}),
		);
		assert.equal(html, "");
	});

	it("renders quick booking drawer with header, duration buttons and typeahead input", () => {
		const html = renderToStaticMarkup(
			React.createElement(QuickBookingDrawer, {
				isOpen: true,
				onClose: () => {},
				dashboard: mockDashboard as Dashboard,
				initialSlot: {
					dateKey: "2026-08-20",
					startTime: "14:00",
					durationMinutes: 30,
				},
			}),
		);

		assert.ok(html.includes("Быстрая запись на прием"), "должен быть заголовок быстрой записи");
		assert.ok(html.includes("data-testid=\"quick-booking-drawer\""), "должен быть testid");
		assert.ok(html.includes("30 мин"), "должна быть кнопка длительности 30 мин");
		assert.ok(html.includes("60 мин"), "должна быть кнопка длительности 60 мин");
		assert.ok(html.includes("Поиск по ФИО, телефону или дате рождения"), "должен быть placeholder поиска");
		assert.ok(html.includes("+ Новый пациент"), "должна быть кнопка inline создания пациента");
	});

	it("renders CITO emergency header, badge, and express patient button when isCitoEmergency is true", () => {
		const html = renderToStaticMarkup(
			React.createElement(QuickBookingDrawer, {
				isOpen: true,
				onClose: () => {},
				dashboard: mockDashboard as Dashboard,
				initialSlot: {
					dateKey: "2026-08-20",
					startTime: "14:00",
					durationMinutes: 20,
					reason: "CITO! Острая боль",
					isCitoEmergency: true,
				},
			}),
		);

		assert.ok(
			html.includes("Экстренный прием (CITO!)"),
			"должен быть заголовок экстренного приема CITO",
		);
		assert.ok(
			html.includes("Острая боль"),
			"должен быть бейдж Острая боль",
		);
		assert.ok(
			html.includes("+ Экспресс-пациент CITO"),
			"должна быть кнопка быстрого создания пациента CITO",
		);
	});
});

