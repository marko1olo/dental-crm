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
	it("renders all receptionist duration presets with service hints", () => {
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

		assert.ok(html.includes("15 мин"), "должен содержать 15 мин");
		assert.ok(html.includes("Осмотр"), "должен содержать подсказку Осмотр");
		assert.ok(html.includes("30 мин"), "должен содержать 30 мин");
		assert.ok(html.includes("Гигиена/Швы"), "должен содержать подсказку Гигиена/Швы");
		assert.ok(html.includes("60 мин"), "должен содержать 60 мин");
		assert.ok(html.includes("Лечение"), "должен содержать подсказку Лечение");
		assert.ok(html.includes("90 мин"), "должен содержать 90 мин");
		assert.ok(html.includes("Хирургия"), "должен содержать подсказку Хирургия");
		assert.ok(html.includes("120 мин"), "должен содержать 120 мин");
		assert.ok(html.includes("Ортопедия"), "должен содержать подсказку Ортопедия");
		assert.ok(html.includes("data-testid=\"quick-booking-duration-presets\""), "должен быть testid контейнера длительностей");
	});

	it("renders fast appointment type selector with primary, secondary and emergency options", () => {
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

		assert.ok(html.includes("Тип приема"), "должен содержать лейбл Тип приема");
		assert.ok(html.includes("Первичный"), "должен содержать вариант Первичный");
		assert.ok(html.includes("Повторный"), "должен содержать вариант Повторный");
		assert.ok(html.includes("Острая боль"), "должен содержать вариант Острая боль");
		assert.ok(html.includes("quick-booking-type-primary"), "должен быть testid для primary");
		assert.ok(html.includes("quick-booking-type-secondary"), "должен быть testid для secondary");
		assert.ok(html.includes("quick-booking-type-emergency"), "должен быть testid для emergency");
	});

	it("renders selected patient card with reliability badge and debt balance", () => {
		const patientWithDebt: Patient = {
			...mockPatients[0]!,
			id: "pat-debt",
			fullName: "Должников Петр Сергеевич",
			balanceRub: -4500,
		};

		const dashboardWithHistory: any = {
			...mockDashboard,
			patients: [patientWithDebt],
			appointments: [
				{
					id: "app-1",
					patientId: "pat-debt",
					status: "completed",
					startsAt: "2026-07-01T10:00:00.000Z",
					endsAt: "2026-07-01T10:30:00.000Z",
					notes: "Прием завершен вовремя",
				},
				{
					id: "app-2",
					patientId: "pat-debt",
					status: "completed",
					startsAt: "2026-07-15T10:00:00.000Z",
					endsAt: "2026-07-15T10:30:00.000Z",
					notes: "Прием завершен вовремя",
				},
			],
		};

		const html = renderToStaticMarkup(
			React.createElement(QuickBookingDrawer, {
				isOpen: true,
				onClose: () => {},
				dashboard: dashboardWithHistory as Dashboard,
				initialSlot: {
					patientId: "pat-debt",
					dateKey: "2026-08-20",
					startTime: "14:00",
					durationMinutes: 30,
				},
			}),
		);

		assert.ok(html.includes("Должников Петр Сергеевич"), "должно отображаться имя пациента");
		assert.ok(html.includes("Надежный пациент"), "должен отображаться бейдж надежности");
		assert.ok(html.includes("Долг"), "должен отображаться бейдж финансового долга");
		assert.ok(html.includes("500"), "должна отображаться сумма долга");
		assert.ok(html.includes("patient-reliability-section"), "должен быть блок надежности пациента");
		assert.ok(html.includes("patient-financial-badge"), "должен быть testid финансового бейджа");
	});

	it("renders receptionist risk alert when patient has consecutive no-shows", () => {
		const riskyPatient: Patient = {
			...mockPatients[0]!,
			id: "pat-risk",
			fullName: "Неявин Артем Игоревич",
			balanceRub: 0,
		};

		const dashboardWithNoShows: any = {
			...mockDashboard,
			patients: [riskyPatient],
			appointments: [
				{
					id: "app-1",
					patientId: "pat-risk",
					status: "cancelled",
					startsAt: "2026-07-01T10:00:00.000Z",
					endsAt: "2026-07-01T10:30:00.000Z",
					notes: "Не явился на прием без предупреждения",
				},
				{
					id: "app-2",
					patientId: "pat-risk",
					status: "cancelled",
					startsAt: "2026-07-10T10:00:00.000Z",
					endsAt: "2026-07-10T10:30:00.000Z",
					notes: "Пациент не пришел, на звонки не ответил",
				},
			],
		};

		const html = renderToStaticMarkup(
			React.createElement(QuickBookingDrawer, {
				isOpen: true,
				onClose: () => {},
				dashboard: dashboardWithNoShows as Dashboard,
				initialSlot: {
					patientId: "pat-risk",
					dateKey: "2026-08-20",
					startTime: "14:00",
					durationMinutes: 30,
				},
			}),
		);

		assert.ok(html.includes("Неявин Артем Игоревич"), "должно отображаться имя пациента");
		assert.ok(html.includes("Риск срыва приема"), "должен отображаться бейдж риска срыва");
		assert.ok(html.includes("Требуется подтверждение за 2 часа"), "должно отображаться предупреждение о подтверждении за 2 часа");
		assert.ok(html.includes("patient-reliability-risk-alert"), "должен быть testid алерта риска");
	});
});

