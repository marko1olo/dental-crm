/**
 * DENTE Dental CRM — Solo Doctor Schedule & Assistant Autonomy Regression Tests
 * Mandates: 8e (Doctor Autonomy), 8n (Solo Doctor on Chair Rental / Small Clinic 1-3 Chairs)
 *
 * Verifies that assistant selection is strictly optional in AppointmentModal and NewAppointmentForm:
 * - assistantUserId is optional (nullable/undefined)
 * - Missing assistant never triggers validation errors
 * - Save button is never disabled due to absent assistant
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { appointmentScheduleMissingFields } from "../../../AppHelpers";
import { AssistantChairFields } from "../appointmentDoctorChair/AssistantChairFields";
import { DoctorChairTimeStep } from "../newAppointment/DoctorChairTimeStep";
import type { Dashboard, AppointmentScheduleDraft } from "@dental/shared";

describe("Solo Doctor Schedule & Assistant Autonomy (Mandates 8e, 8n)", () => {
	it("1. appointmentScheduleMissingFields never requires assistantUserId for solo doctor or clinic", () => {
		const draftWithoutAssistant: AppointmentScheduleDraft = {
			patientId: "pat-1",
			doctorUserId: "doc-1",
			chairId: "chair-1",
			startsAt: "2026-10-21T10:00:00.000Z",
			endsAt: "2026-10-21T10:30:00.000Z",
			assistantUserId: null,
		};

		const staff = [
			{
				id: "doc-1",
				fullName: "Д-р Иванов Иван Иванович",
				role: "doctor" as const,
				active: true,
			},
		];

		const resources = {
			chairs: [{ id: "chair-1", name: "Кресло 1", active: true }],
			patients: [{ id: "pat-1", fullName: "Пациент П.П." }],
		};

		// Test for solo_doctor mode
		const missingSolo = appointmentScheduleMissingFields(
			draftWithoutAssistant,
			"solo_doctor",
			staff,
			resources,
		);
		assert.deepEqual(missingSolo, [], "Must have 0 missing fields without assistant in solo_doctor mode");

		// Test for one_chair mode
		const missingOneChair = appointmentScheduleMissingFields(
			draftWithoutAssistant,
			"one_chair",
			staff,
			resources,
		);
		assert.deepEqual(missingOneChair, [], "Must have 0 missing fields without assistant in one_chair mode");

		// Test for small_clinic mode
		const missingSmallClinic = appointmentScheduleMissingFields(
			draftWithoutAssistant,
			"small_clinic",
			staff,
			resources,
		);
		assert.deepEqual(missingSmallClinic, [], "Must have 0 missing fields without assistant in small_clinic mode");
	});

	it("2. AssistantChairFields renders assistant as strictly optional with '-- Без ассистента (соло-приём) --'", () => {
		const html = renderToStaticMarkup(
			React.createElement(AssistantChairFields, {
				hideAssistant: false,
				isSoloDoctor: false,
				assistantUserId: null,
				setAssistantUserId: () => {},
				assistants: [
					{ id: "asst-1", fullName: "Медсестра Смирнова А.И." },
				],
				chairId: "chair-1",
				setChairId: () => {},
				chairs: [{ id: "chair-1", name: "Кресло 1" }],
				startsAtLocal: "2026-10-21T10:00",
				doctorUserId: "doc-1",
				dutyDoctorId: "doc-1",
				setDoctorUserId: () => {},
			}),
		);

		assert.ok(html.includes("Опционально"), "Label must show 'Опционально'");
		assert.ok(html.includes("Без ассистента (соло-приём)"), "Default option must be 'Без ассистента (соло-приём)'");
		assert.ok(html.includes('data-testid="select-appointment-assistant"'), "Must render assistant select");
	});

	it("3. AssistantChairFields hides assistant selector completely for solo doctor", () => {
		const html = renderToStaticMarkup(
			React.createElement(AssistantChairFields, {
				hideAssistant: false,
				isSoloDoctor: true,
				assistantUserId: null,
				setAssistantUserId: () => {},
				assistants: [],
				chairId: "chair-1",
				setChairId: () => {},
				chairs: [{ id: "chair-1", name: "Кресло 1" }],
				startsAtLocal: "2026-10-21T10:00",
				doctorUserId: "doc-1",
				dutyDoctorId: "doc-1",
				setDoctorUserId: () => {},
			}),
		);

		assert.equal(html.includes("select-appointment-assistant"), false, "Must NOT render assistant select for solo doctor");
	});

	it("4. DoctorChairTimeStep in NewAppointmentForm shows 'Без ассистента (соло-приём)' active by default", () => {
		const mockDashboard = {
			clinicSettings: {
				profile: { mode: "small_clinic" },
				staff: [
					{ id: "doc-1", fullName: "Д-р Иванов И.И.", role: "doctor", active: true },
					{ id: "asst-1", fullName: "Ассистент Петрова", role: "assistant", active: true },
				],
				chairs: [{ id: "chair-1", name: "Кресло 1", active: true }],
			},
			appointments: [],
			patients: [],
		} as unknown as Dashboard;

		const html = renderToStaticMarkup(
			React.createElement(DoctorChairTimeStep, {
				dashboard: mockDashboard,
				appointmentLabels: { planned: "Запланирован", completed: "Завершён" } as any,
				newAppointmentDraft: {
					startsAt: "2026-10-21T10:00:00.000Z",
					endsAt: "2026-10-21T10:30:00.000Z",
					doctorUserId: "doc-1",
					assistantUserId: "",
					chairId: "chair-1",
					status: "planned",
				},
				updateNewAppointmentDraft: () => {},
				toDateTimeLocalValue: (val) => val || "",
				fromDateTimeLocalValue: (val) => val || "",
				clinicTimezone: "Europe/Moscow",
				useManualSelects: false,
				activeLabOrders: [],
				currentDurationMinutes: 30,
				applyDuration: () => {},
			}),
		);

		assert.ok(html.includes("Ассистент (опционально)"), "Title must state 'Ассистент (опционально)'");
		assert.ok(html.includes("Без ассистента (соло-приём)"), "Chip must offer 'Без ассистента (соло-приём)'");
		assert.ok(html.includes("quick-chip active"), "Chip must be active when assistantUserId is empty");
	});
});
