/**
 * apps/web/src/components/schedule/__tests__/quickBookingSoloDoctor.test.tsx
 *
 * DENTE Dental CRM — Quick Booking, Solo Doctor Autonomy & Emergency Cito Tests.
 * Red Team Inquisition Suite for Fast-Booking (15-Second Flow) & Apple HIG Constraints.
 *
 * Mandates:
 * - Mandate 8e: Doctor Autonomy (No disabled buttons, 1-click presets, 15-second emergency intake)
 * - Mandate 8n: Solo Doctor Sovereignty (Assistant selection is strictly optional or hidden)
 * - Mandate 8am: Strict button hierarchy (Single Primary CTA, neutral secondaries)
 */

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createAppointmentSchema } from "@dental/shared";

if (typeof registerHooks === "function") {
	try {
		registerHooks({
			load(url, context, nextLoad) {
				if (url.endsWith(".css")) {
					return {
						format: "module",
						shortCircuit: true,
						source: "export default {};",
					};
				}
				return nextLoad(url, context);
			},
		});
	} catch {
		// Ignore if already registered
	}
}

import { QuickAssistantSelector } from "../quickBookingService/QuickAssistantSelector";
import { QuickResourceAllocationSection } from "../quickBookingService/QuickResourceAllocationSection";
import { QuickBookingDrawerHeader, QuickBookingDrawerFooter } from "../QuickBookingDrawer";
import { buildQuickBookingPayload } from "../quickBookingSubmitPayload";
import { QUICK_SERVICE_PRESETS } from "../quickBookingService/quickServicePresets";

describe("Schedule Fast Booking & Solo Doctor Invariants (Mandates 8e, 8n, 8am)", () => {
	describe("1. Solo Doctor & Assistant Autonomy (Mandate 8n)", () => {
		it("QuickAssistantSelector returns null when isSoloClinic is true", () => {
			const html = renderToStaticMarkup(
				React.createElement(QuickAssistantSelector, {
					isSoloClinic: true,
					assistantUserId: null,
					setAssistantUserId: () => {},
					assistants: [{ id: "asst-1", fullName: "Иванова А.И." }],
				}),
			);
			assert.equal(html, "", "Must return empty markup for solo clinic");
		});

		it("QuickAssistantSelector returns null when assistants list is empty", () => {
			const html = renderToStaticMarkup(
				React.createElement(QuickAssistantSelector, {
					isSoloClinic: false,
					assistantUserId: null,
					setAssistantUserId: () => {},
					assistants: [],
				}),
			);
			assert.equal(html, "", "Must return empty markup when no assistants exist in clinic");
		});

		it("QuickAssistantSelector offers '-- Без ассистента (соло-приём) --' as first optional item", () => {
			const html = renderToStaticMarkup(
				React.createElement(QuickAssistantSelector, {
					isSoloClinic: false,
					assistantUserId: null,
					setAssistantUserId: () => {},
					assistants: [{ id: "asst-1", fullName: "Иванова А.И." }],
				}),
			);
			assert.ok(html.includes("data-testid=\"select-booking-assistant\""), "Must render assistant select");
			assert.ok(html.includes("Без ассистента (соло-приём)"), "Default value must be solo doctor option");
			assert.ok(html.includes("Ассистент"), "Clean label without spec-dumping");
		});

		it("QuickResourceAllocationSection hides assistant completely when isSoloClinic is true", () => {
			const html = renderToStaticMarkup(
				React.createElement(QuickResourceAllocationSection, {
					isSoloClinic: true,
					assistantUserId: null,
					setAssistantUserId: () => {},
					assistants: [{ id: "asst-1", fullName: "Иванова А.И." }],
					chairId: "chair-1",
					setChairId: () => {},
					chairs: [{ id: "chair-1", name: "Кабинет 1" }],
					startsAtLocal: "2026-11-06T10:00",
					doctorUserId: "doc-1",
					setDoctorUserId: () => {},
					doctors: [{ id: "doc-1", fullName: "Д-р Тестов" }],
					dutyDoc: { id: "doc-1", fullName: "Д-р Тестов" },
					dutyDoctorHours: "09:00 - 15:00",
					currentChair: { id: "chair-1", name: "Кабинет 1" },
				}),
			);
			assert.equal(html.includes("select-booking-assistant"), false, "Assistant select must not exist for solo clinic");
		});

		it("createAppointmentSchema succeeds with null/undefined assistantUserId", () => {
			const input = {
				startsAt: "2026-11-06T10:00:00.000Z",
				endsAt: "2026-11-06T10:30:00.000Z",
				doctorUserId: "00000000-0000-0000-0000-000000000001",
				chairId: "00000000-0000-0000-0000-000000000002",
				patientId: "00000000-0000-0000-0000-000000000003",
				assistantUserId: null,
				status: "planned" as const,
			};
			const parsed = createAppointmentSchema.safeParse(input);
			assert.equal(parsed.success, true, "Zod schema must accept assistantUserId: null");
		});

		it("buildQuickBookingPayload ensures assistantUserId is null for solo clinics", () => {
			const payload = buildQuickBookingPayload({
				params: {
					patientSearch: {},
					appointmentType: "primary",
					doctorUserId: "doc-1",
					dutyDoctorId: null,
					doctors: [{ id: "doc-1" }],
					dutyDoc: null,
					chairId: "chair-1",
					chairs: [{ id: "chair-1" }],
					currentChair: null,
					assistantUserId: "asst-should-be-stripped",
					startsAtLocal: "2026-11-06T10:00",
					durationMinutes: 30,
					reason: "Осмотр",
					comment: "",
					status: "planned",
					isSoloClinic: true,
					collision: {},
					setSlotConflict: () => {},
					setSubmitError: () => {},
					initialSlot: null,
					isEditing: false,
					editingAppointmentId: null,
					onClose: () => {},
					fromLocal: (v) => v,
				},
				activePatientId: "pat-1",
				startsAtIso: "2026-11-06T10:00:00.000Z",
				endsAtIso: "2026-11-06T10:30:00.000Z",
				isEmergency: false,
			});

			assert.equal(payload.assistantUserId, null, "Payload for solo clinic must force assistantUserId to null");
		});
	});

	describe("2. Fast Booking & Emergency Acute Pain Intake (Mandate 8e)", () => {
		it("QUICK_SERVICE_PRESETS contains acute pain emergency preset with 30m standard duration", () => {
			const emergencyPreset = QUICK_SERVICE_PRESETS.find((p) => p.id === "emergency-pain");
			assert.ok(emergencyPreset, "Emergency acute pain preset must exist in catalog");
			assert.equal(emergencyPreset?.appointmentType, "emergency");
			assert.equal(emergencyPreset?.durationMinutes, 30);
			assert.ok(emergencyPreset?.title.includes("Острая боль"));
		});

		it("QuickBookingDrawerHeader highlights emergency mode with pulse badge and acute pain title", () => {
			const html = renderToStaticMarkup(
				React.createElement(QuickBookingDrawerHeader, {
					isEmergencyMode: true,
					isEditing: false,
					startsAtLocal: "2026-11-06T12:00",
					durationMinutes: 30,
					chairName: "Кресло 1",
					onClose: () => {},
				}),
			);
			assert.ok(html.includes("Срочная запись: острая боль"), "Header must show emergency title");
			assert.ok(html.includes("data-testid=\"cito-header-badge\""), "Must render CITO header badge");
			assert.ok(html.includes("Острая боль"), "Must display acute pain badge text");
		});

		it("buildQuickBookingPayload enables overbooking and emergency override for emergency mode", () => {
			const payload = buildQuickBookingPayload({
				params: {
					patientSearch: {},
					appointmentType: "emergency",
					doctorUserId: "doc-1",
					dutyDoctorId: null,
					doctors: [{ id: "doc-1" }],
					dutyDoc: null,
					chairId: "chair-1",
					chairs: [{ id: "chair-1" }],
					currentChair: null,
					assistantUserId: null,
					startsAtLocal: "2026-11-06T12:00",
					durationMinutes: 30,
					reason: "",
					comment: "",
					status: "planned",
					isSoloClinic: false,
					collision: {},
					setSlotConflict: () => {},
					setSubmitError: () => {},
					initialSlot: null,
					isEditing: false,
					editingAppointmentId: null,
					onClose: () => {},
					fromLocal: (v) => v,
				},
				activePatientId: "pat-emergency-1",
				startsAtIso: "2026-11-06T12:00:00.000Z",
				endsAtIso: "2026-11-06T12:30:00.000Z",
				isEmergency: true,
			});

			assert.equal(payload.isCito, true);
			assert.equal(payload.cito, true);
			assert.equal(payload.allowOverbooking, true, "Emergency appointment must allow soft overbooking");
			assert.equal(payload.allowEmergencyOverride, true, "Emergency override must be enabled");
			assert.equal(payload.reason, "Срочно! Острая боль", "Default reason must be acute pain");
		});
	});

	describe("3. Non-Blocking Ergonomics & Single Primary CTA (Mandates 8e, 8am)", () => {
		it("QuickBookingDrawerFooter save button is NEVER disabled and has min 44px touch height", () => {
			const html = renderToStaticMarkup(
				React.createElement(QuickBookingDrawerFooter, {
					isSubmitting: false,
					hasCollision: false,
					isDirty: false,
					onSubmit: () => {},
					onRequestClose: () => {},
					onDiscardDraft: () => {},
					onCopyConfirmation: () => {},
				}),
			);
			assert.ok(html.includes("data-testid=\"quick-drawer-save-btn\""), "Save CTA button must render");
			assert.equal(html.includes("disabled"), false, "Save button must NEVER have disabled attribute (Mandate 8e)");
			assert.ok(html.includes("min-h-[44px]"), "CTA must have minimum 44px touch height (Apple HIG)");
			assert.ok(html.includes("bg-[var(--teal)]"), "CTA must use canonical primary accent color");
		});
	});
});
