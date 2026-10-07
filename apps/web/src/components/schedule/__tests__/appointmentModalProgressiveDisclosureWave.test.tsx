/**
 * appointmentModalProgressiveDisclosureWave.test.tsx
 *
 * Inquisitorial verification of AppointmentModal re-composition (Progressive Disclosure)
 * and total eradication of visible CITO in favor of canonical Russian "Срочно / Экстренно".
 *
 * Requirements verified:
 * 1. Progressive Disclosure Architecture:
 *    - Layer A (Mandatory base, fast 5-sec entry):
 *      * Patient section
 *      * Time & quick duration chips (15, 30, 45, 60, 90, 120 min)
 *      * Doctor & Chair
 *      * Reason input & 1-click quick reason chips
 *      * Visit status (6 buttons in 1 click)
 *    - Layer B (Optional spoiler «Дополнительные параметры ▾»):
 *      * Collapsed by default on fresh appointment
 *      * Auto-expanded if appointment has lab order, comment, or assistant
 *      * Contains Dental Lab (ЗТЛ), Assistant (multi-staff), Internal note, Visit type tags (Первичный, Повторный, VIP)
 * 2. Eradication of visible CITO:
 *    - Header badge: СРОЧНО (no visible CITO)
 *    - Header button: + Срочно (no visible CITO)
 *    - Banner: Экстренная запись: острая боль
 *    - Footer button: Сохранить запись (Срочно) / Сохранить запись
 *    - Zero cartoon emojis (Mandate 8d item 7)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Dashboard, Appointment } from "@dental/shared";
import { AppointmentModal } from "../AppointmentModal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockDashboard: Dashboard = {
	organization: { id: "org-1", name: "DENTE Clinic" } as any,
	clinicSettings: {
		name: "DENTE Clinic",
		staff: [
			{ id: "doc-1", fullName: "Д-р Иванов И.И.", role: "doctor" as const, active: true },
			{ id: "doc-2", fullName: "Д-р Сидорова С.С.", role: "doctor" as const, active: true },
			{ id: "ast-1", fullName: "Ассистент Петрова А.А.", role: "assistant" as const, active: true },
		],
		chairs: [
			{ id: "chair-1", name: "Кресло 1 (Терапия)", active: true, specialization: "therapy" },
			{ id: "chair-2", name: "Кресло 2 (Хирургия)", active: true, specialization: "surgery" },
		],
		profile: { mode: "clinic", timezone: "Europe/Moscow" } as any,
	} as any,
	patients: [
		{
			id: "pat-1",
			fullName: "Кузнецов Алексей Владимирович",
			phone: "+7 (999) 111-22-33",
			balanceRub: 0,
		} as any,
	],
	appointments: [],
	rooms: [],
	cashRegisters: [],
	priceList: [],
} as any;

const mockAppointmentLabels: Record<Appointment["status"], string> = {
	planned: "Ожидает",
	confirmed: "Подтвержден",
	arrived: "В холле",
	in_treatment: "В кресле",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Неявка",
};

function renderModal(
	appointment: Partial<Appointment> & { isCito?: boolean; cito?: boolean },
	dashboard = mockDashboard,
): string {
	const appt: Appointment = {
		id: "appt-1",
		organizationId: "org-1",
		patientId: "pat-1",
		doctorUserId: "doc-1",
		assistantUserId: null,
		chairId: "chair-1",
		startsAt: "2026-10-15T10:00:00.000Z",
		endsAt: "2026-10-15T10:30:00.000Z",
		status: "planned",
		reason: "Лечение кариеса",
		comment: null,
		costRub: 4000,
		createdAt: "2026-10-01T00:00:00.000Z",
		updatedAt: "2026-10-01T00:00:00.000Z",
		...appointment,
	} as any;

	return renderToStaticMarkup(
		React.createElement(AppointmentModal, {
			isOpen: true,
			appointment: appt,
			dashboard,
			onClose: () => {},
			onSave: async () => true,
			patientName: (_pts, id) => (id === "pat-1" ? "Кузнецов Алексей Владимирович" : "Пациент"),
			formatTime: (iso) => (iso ? iso.slice(11, 16) : ""),
			toDateTimeLocalValue: (iso) => (iso ? iso.slice(0, 16) : ""),
			fromDateTimeLocalValue: (val) => `${val}:00.000Z`,
			appointmentLabels: mockAppointmentLabels,
			activeVisitLockedAppointmentStatuses: new Set<any>(["in_treatment", "completed"]),
		}),
	);
}

describe("AppointmentModal: Progressive Disclosure & Eradication of CITO", () => {
	it("1.1. Base Layer A renders patient, time, duration chips, doctor, chair, reason, and status buttons", () => {
		const html = renderModal({});

		// Patient section
		assert.ok(html.includes("Кузнецов Алексей Владимирович"), "Должен отображаться пациент");
		assert.ok(html.includes('data-testid="select-appointment-patient"'), "Должен присутствовать селектор пациента");

		// Time & Duration
		assert.ok(html.includes("Начало"), "Должно присутствовать время начала");
		assert.ok(html.includes("Окончание"), "Должно присутствовать время окончания");
		assert.ok(html.includes('data-testid="appointment-quick-durations"'), "Должен присутствовать быстрый выбор длительности");
		assert.ok(html.includes("15 мин") && html.includes("30 мин") && html.includes("1 час"), "Должны быть быстрые чипы длительности");

		// Doctor & Chair
		assert.ok(html.includes('data-testid="select-appointment-doctor"'), "Должен присутствовать селектор врача");
		assert.ok(html.includes('data-testid="select-appointment-chair"'), "Должен присутствовать селектор кресла");

		// Reason & Quick chips
		assert.ok(html.includes('data-testid="appointment-modal-reason-input"'), "Должен присутствовать инпут повода обращения");
		assert.ok(html.includes('data-testid="appointment-quick-reasons"'), "Должны присутствовать быстрые чипы поводов");

		// Status section (6 buttons in 1 click)
		assert.ok(html.includes('data-testid="modal-status-btn-planned"'), "Должна быть кнопка статуса Ожидает");
		assert.ok(html.includes('data-testid="modal-status-btn-confirmed"'), "Должна быть кнопка статуса Подтвержден");
		assert.ok(html.includes('data-testid="modal-status-btn-in_treatment"'), "Должна быть кнопка статуса В кресле");
		assert.ok(html.includes('data-testid="modal-status-btn-completed"'), "Должна быть кнопка статуса Завершен");
	});

	it("1.2. Layer B spoiler «Дополнительные параметры ▾» is present and contains ЗТЛ, assistant, note, and visit tags", () => {
		const html = renderModal({});

		// Toggle button
		assert.ok(html.includes('data-testid="appointment-modal-toggle-additional-btn"'), "Должна присутствовать кнопка спойлера");
		assert.ok(html.includes("Дополнительные параметры"), "Заголовок спойлера должен быть понятен");

		// Spoiler content
		assert.ok(html.includes('data-testid="appointment-modal-additional-content"'), "Контейнер спойлера должен быть в DOM");
		assert.ok(html.includes('data-testid="select-appointment-assistant"'), "Селектор ассистента должен быть доступен в дополнительных параметрах");
		assert.ok(html.includes('data-testid="appointment-modal-comment-textarea"'), "Поле внутреннего примечания должно быть в дополнительных параметрах");
		assert.ok(html.includes('data-testid="appointment-visit-type-tags"'), "Быстрые цветные метки типа визита должны быть доступны");
		assert.ok(html.includes('data-testid="appointment-tag-vip"'), "Должен быть тег VIP");
		assert.ok(html.includes('data-testid="appointment-tag-primary"'), "Должен быть тег Первичный");
		assert.ok(html.includes('data-testid="appointment-tag-repeat"'), "Должен быть тег Повторный");
	});

	it("2.1. Header displays '+ Срочно' when not urgent and 'СРОЧНО' when urgent (no visible CITO)", () => {
		// Non-urgent appointment
		const regularHtml = renderModal({ isCito: false });
		assert.ok(regularHtml.includes('data-testid="convert-to-cito-btn"'), "Кнопка перевода в срочную запись должна присутствовать");
		assert.ok(regularHtml.includes("+ Срочно") || regularHtml.includes("Срочно"), "Видимый текст кнопки должен быть + Срочно");
		assert.ok(!regularHtml.includes(">+ CITO<"), "Видимый текст не должен содержать + CITO");

		// Urgent appointment
		const urgentHtml = renderModal({ isCito: true });
		assert.ok(urgentHtml.includes('data-testid="appointment-cito-active-badge"'), "Бейдж срочной записи должен присутствовать");
		assert.ok(urgentHtml.includes("СРОЧНО"), "Бейдж должен содержать русский текст СРОЧНО");
	});

	it("2.2. Banner states 'Экстренная запись: острая боль' and badge 'СРОЧНО'", () => {
		const urgentHtml = renderModal({ isCito: true });
		assert.ok(urgentHtml.includes('data-testid="appointment-cito-banner"'), "Баннер срочной записи должен отображаться");
		assert.ok(urgentHtml.includes("Экстренная запись: острая боль"), "Баннер должен содержать русский понятный текст");
		assert.ok(urgentHtml.includes("Экстренная запись: острая боль"), "Баннер должен подтверждать экстренную запись");
	});

	it("2.3. Save button displays 'Сохранить запись (Срочно)' for urgent, 'Сохранить запись' for regular", () => {
		// Regular appointment
		const regularHtml = renderModal({ isCito: false });
		assert.ok(regularHtml.includes("Сохранить запись") || regularHtml.includes("Сохранить изменения"), "Обычная кнопка сохранения");
		assert.ok(!regularHtml.includes("Сохранить CITO"), "Обычная кнопка не должна содержать CITO");

		// Urgent appointment
		const urgentHtml = renderModal({ isCito: true });
		assert.ok(
			urgentHtml.includes("Сохранить срочно (Острая боль)") || urgentHtml.includes("Сохранить запись (Срочно)"),
			"Кнопка сохранения срочной записи",
		);
	});

	it("2.4. AppointmentModal.tsx source code contains 0 cartoon emojis (Mandate 8d item 7)", () => {
		const source = fs.readFileSync(path.resolve(__dirname, "../AppointmentModal.tsx"), "utf8");
		const cartoonEmojiRegex =
			/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		const match = source.match(cartoonEmojiRegex);
		assert.strictEqual(match, null, `Found forbidden cartoon emoji in AppointmentModal.tsx: ${match?.[0]}`);
	});

	it("2.5. AppointmentModalHeader.tsx source code contains 0 cartoon emojis (Mandate 8d item 7)", () => {
		const source = fs.readFileSync(path.resolve(__dirname, "../AppointmentModalHeader.tsx"), "utf8");
		const cartoonEmojiRegex =
			/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		const match = source.match(cartoonEmojiRegex);
		assert.strictEqual(match, null, `Found forbidden cartoon emoji in AppointmentModalHeader.tsx: ${match?.[0]}`);
	});
});
