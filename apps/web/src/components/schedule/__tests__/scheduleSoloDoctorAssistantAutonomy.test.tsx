/**
 * DENTE Dental CRM — Solo Doctor Schedule & Assistant Autonomy Regression Tests
 * Mandates: 8e (Doctor Autonomy), 8n (Solo Doctor on Chair Rental / Small Clinic 1-3 Chairs)
 *
 * Verifies that assistant selection is strictly optional in QuickBooking:
 * - assistantUserId is optional (nullable/undefined)
 * - Missing assistant never triggers validation errors
 * - Save button is never disabled due to absent assistant
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { appointmentScheduleMissingFields, type AppointmentScheduleDraft } from "../../../AppHelpers";
import { QuickAssistantSelector } from "../quickBookingService/QuickAssistantSelector";

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
			staff as any,
			resources as any,
		);
		assert.deepEqual(missingSolo, [], "Must have 0 missing fields without assistant in solo_doctor mode");

		// Test for one_chair mode
		const missingOneChair = appointmentScheduleMissingFields(
			draftWithoutAssistant,
			"one_chair",
			staff as any,
			resources as any,
		);
		assert.deepEqual(missingOneChair, [], "Must have 0 missing fields without assistant in one_chair mode");

		// Test for small_clinic mode
		const missingSmallClinic = appointmentScheduleMissingFields(
			draftWithoutAssistant,
			"small_clinic",
			staff as any,
			resources as any,
		);
		assert.deepEqual(missingSmallClinic, [], "Must have 0 missing fields without assistant in small_clinic mode");
	});

	it("2. QuickAssistantSelector renders assistant as strictly optional with '-- Без ассистента (соло-приём) --'", () => {
		const html = renderToStaticMarkup(
			React.createElement(QuickAssistantSelector, {
				isSoloClinic: false,
				assistantUserId: null,
				setAssistantUserId: () => {},
				assistants: [
					{ id: "asst-1", fullName: "Медсестра Смирнова А.И." },
				],
			}),
		);

		assert.ok(html.includes("Без ассистента (соло-приём)"), "Default option must be 'Без ассистента (соло-приём)'");
		assert.ok(html.includes('data-testid="select-booking-assistant"'), "Must render assistant select");
	});

	it("3. QuickAssistantSelector hides assistant selector completely for solo doctor", () => {
		const html = renderToStaticMarkup(
			React.createElement(QuickAssistantSelector, {
				isSoloClinic: true,
				assistantUserId: null,
				setAssistantUserId: () => {},
				assistants: [{ id: "asst-1", fullName: "Медсестра Смирнова А.И." }],
			}),
		);

		assert.equal(html, "", "Must NOT render assistant select for solo doctor");
	});

	it("4. QuickAssistantSelector returns null when assistants list is empty", () => {
		const html = renderToStaticMarkup(
			React.createElement(QuickAssistantSelector, {
				isSoloClinic: false,
				assistantUserId: null,
				setAssistantUserId: () => {},
				assistants: [],
			}),
		);

		assert.equal(html, "", "Must return empty string when assistants list is empty");
	});
});
