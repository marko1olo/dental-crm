import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppointmentModal } from "../AppointmentModal";
import {
	mockAppointment,
	mockDashboard,
	createModalProps,
} from "./appointmentModalTestFixtures";

describe("AppointmentModal Doctor Autonomy", () => {
	it("renders fast patient search input and supports solo doctor autonomy without assistant", () => {
		const soloAppointment = {
			...mockAppointment,
			id: "appt-solo-1",
			patientId: null as any,
			assistantUserId: null,
		};
		const html = renderToStaticMarkup(
			React.createElement(AppointmentModal, createModalProps(soloAppointment)),
		);
		assert.ok(html.includes('data-testid="appointment-patient-search-input"'));
		assert.ok(html.includes("Режим: соло-врач"));
		assert.ok(!html.includes('data-testid="select-appointment-assistant"'));
		assert.ok(html.includes('data-testid="appointment-modal-save-btn"'));
	});

	it("renders 1-click + CITO button and optional assistant in multi-staff clinic per Mandate 8e, 8n", () => {
		const multiStaffDashboard: any = {
			...mockDashboard,
			clinicSettings: {
				...mockDashboard.clinicSettings,
				profile: { mode: "standard", timezone: "Europe/Moscow" },
				staff: [
					{ id: "doc-1", fullName: "Д-р Смирнов", role: "doctor", active: true },
					{ id: "doc-2", fullName: "Д-р Кузнецов", role: "doctor", active: true },
					{ id: "ast-1", fullName: "Асс. Сидорова", role: "assistant", active: true },
				],
				chairs: [
					{ id: "chair-1", name: "Кабинет 1", active: true },
					{ id: "chair-2", name: "Кабинет 2", active: true },
				],
			},
		};
		const html = renderToStaticMarkup(
			React.createElement(AppointmentModal, createModalProps(mockAppointment, multiStaffDashboard)),
		);
		assert.ok(
			html.includes('data-testid="convert-to-cito-btn"') ||
				html.includes('data-testid="appointment-modal-cito-express-btn"'),
		);
		assert.ok(html.includes("+ Срочно") || html.includes("Срочно"));
		assert.ok(html.includes('data-testid="select-appointment-assistant"'));
		assert.ok(html.includes("-- Без ассистента (соло-приём) --"));
		assert.ok(html.includes("Ассистент: опционально"));
		assert.ok(html.includes('data-testid="appointment-modal-save-btn"'));
		assert.ok(!html.includes('data-testid="appointment-modal-save-btn" disabled'));
	});
});
