/**
 * Patient Online Booking Autonomy & Solo Doctor Invariants Unit Tests
 * (CONSTITUTION: THE HAMMER, MANDATE 8e DOCTOR AUTONOMY, MANDATE 8n SOLO DOCTOR SOVEREIGNTY, MANDATE 8s SSOT)
 *
 * Verifies:
 * 1. Solo doctor scenario helper (resolveBookingStep1Selection) locks in doctor selection.
 * 2. Slot resolution helper (resolveBookingStep2Selection) auto-selects available slots.
 * 3. PatientOnlineBookingModal mounts canonical PublicOnlineBookingWidget (SSOT) cleanly.
 * 4. Close button, modal overlay, and actionRef programmatic control work as expected.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	PatientOnlineBookingModal,
	resolveBookingStep1Selection,
	resolveBookingStep2Selection,
} from "../PatientOnlineBookingModal";
import type {
	BookingBranch,
	BookingDoctor,
	BookingService,
	BookingTimeSlot,
} from "../patientPortalTypes";

const TEST_BRANCH: BookingBranch = {
	id: "branch-main",
	nameRu: "Центральное отделение ДЕНТЕ",
	addressRu: "г. Москва, ул. Большая Полянка, д. 42",
	phone: "+7 (495) 100-20-30",
	metroStationRu: "м. Полянка",
	metroLineColor: "#999999",
	workHoursRu: "09:00 - 21:00",
};

const SOLO_DOCTOR: BookingDoctor = {
	id: "doc-solo-01",
	fullName: "Барабаш Сергей Васильевич",
	specialtyRu: "Главный врач, стоматолог-терапевт, ортопед",
	specialtyCategory: "therapy",
	priceFromRub: 3500,
	rating: 5.0,
	reviewsCount: 128,
	experienceYears: 18,
	nextSlotTextRu: "Сегодня",
	branchIds: ["branch-main"],
};

const MULTI_DOCTORS: BookingDoctor[] = [
	{
		id: "doc-01",
		fullName: "Смирнова Екатерина Алексеевна",
		specialtyRu: "Стоматолог-терапевт, эндодонтист",
		specialtyCategory: "therapy",
		priceFromRub: 2500,
		rating: 4.9,
		reviewsCount: 94,
		experienceYears: 12,
		nextSlotTextRu: "Сегодня",
		branchIds: ["branch-main"],
	},
	{
		id: "doc-02",
		fullName: "Волков Дмитрий Сергеевич",
		specialtyRu: "Стоматолог-хирург, имплантолог",
		specialtyCategory: "surgery",
		priceFromRub: 4500,
		rating: 5.0,
		reviewsCount: 112,
		experienceYears: 15,
		nextSlotTextRu: "Завтра",
		branchIds: ["branch-main"],
	},
];

const TEST_SERVICES: BookingService[] = [
	{
		id: "srv-01",
		titleRu: "Первичная консультация и диагностика (КЛКТ/ОПТГ)",
		descriptionRu: "Полный осмотр полости рта, составление плана лечения",
		durationMinutes: 30,
		priceRub: 0,
		specialtyCategory: "therapy",
		isFreeConsultation: true,
		badgeRu: "Бесплатно",
	},
	{
		id: "srv-02",
		titleRu: "Лечение кариеса с анатомической реставрацией",
		descriptionRu: "Изоляция коффердамом, световая пломба Estelite",
		durationMinutes: 60,
		priceRub: 5500,
		specialtyCategory: "therapy",
		isFreeConsultation: false,
	},
];

describe("PatientOnlineBookingModal — Solo Doctor & Autonomy (Mandates 8e, 8n, 8s)", () => {
	describe("1. Solo Doctor & Step 1 Selection Resolution", () => {
		it("pure helper resolveBookingStep1Selection locks in solo doctor and selects service", () => {
			const result = resolveBookingStep1Selection(
				[SOLO_DOCTOR],
				TEST_SERVICES,
				"", // initial empty selection
				"",
			);

			assert.strictEqual(result.isSoloDoctor, true);
			assert.strictEqual(result.soloDoctorName, "Барабаш Сергей Васильевич");
			assert.strictEqual(result.effectiveDoctorId, SOLO_DOCTOR.id);
			assert.strictEqual(result.effectiveServiceId, TEST_SERVICES[0]?.id);
			assert.strictEqual(result.canProceed, true);
		});

		it("pure helper resolveBookingStep1Selection falls back to first doctor when none selected", () => {
			const result = resolveBookingStep1Selection(
				MULTI_DOCTORS,
				TEST_SERVICES,
				"",
				"",
			);

			assert.strictEqual(result.isSoloDoctor, false);
			assert.strictEqual(result.soloDoctorName, null);
			assert.strictEqual(result.effectiveDoctorId, MULTI_DOCTORS[0]?.id);
			assert.strictEqual(result.effectiveServiceId, TEST_SERVICES[0]?.id);
			assert.strictEqual(result.canProceed, true);
		});

		it("pure helper resolveBookingStep1Selection preserves explicit doctor and service selections", () => {
			const result = resolveBookingStep1Selection(
				MULTI_DOCTORS,
				TEST_SERVICES,
				MULTI_DOCTORS[1]?.id,
				TEST_SERVICES[1]?.id,
			);

			assert.strictEqual(result.effectiveDoctorId, MULTI_DOCTORS[1]?.id);
			assert.strictEqual(result.effectiveServiceId, TEST_SERVICES[1]?.id);
			assert.strictEqual(result.canProceed, true);
		});

		it("resolveBookingStep1Selection reports canProceed=false when catalogs are empty", () => {
			const resNoDocs = resolveBookingStep1Selection([], TEST_SERVICES);
			assert.strictEqual(resNoDocs.canProceed, false);

			const resNoSrvs = resolveBookingStep1Selection(MULTI_DOCTORS, []);
			assert.strictEqual(resNoSrvs.canProceed, false);
		});
	});

	describe("2. Step 2 Slot Resolution Autonomy", () => {
		it("resolveBookingStep2Selection auto-selects first available slot when none is selected", () => {
			const mockSlots: BookingTimeSlot[] = [
				{ id: "slot-01", timeRu: "09:00", isOccupied: true, timePeriod: "morning", doctorId: "doc-1", branchId: "b-1", dateIso: "2026-04-10" },
				{ id: "slot-02", timeRu: "09:30", isOccupied: false, timePeriod: "morning", doctorId: "doc-1", branchId: "b-1", dateIso: "2026-04-10" },
				{ id: "slot-03", timeRu: "10:00", isOccupied: false, timePeriod: "morning", doctorId: "doc-1", branchId: "b-1", dateIso: "2026-04-10" },
			];

			const res = resolveBookingStep2Selection(mockSlots, "", "");
			assert.strictEqual(res.canProceed, true, "Must be able to proceed when slots exist");
			assert.strictEqual(res.effectiveSlotId, "slot-02", "Must fallback to first un-occupied slot");
			assert.strictEqual(res.effectiveTimeRu, "09:30");

			const resChosen = resolveBookingStep2Selection(mockSlots, "slot-03", "10:00");
			assert.strictEqual(resChosen.canProceed, true);
			assert.strictEqual(resChosen.effectiveSlotId, "slot-03");
			assert.strictEqual(resChosen.effectiveTimeRu, "10:00");
		});

		it("resolveBookingStep2Selection reports canProceed=false when slot list is empty", () => {
			const resEmpty = resolveBookingStep2Selection([], "", "");
			assert.strictEqual(resEmpty.canProceed, false);
			assert.strictEqual(resEmpty.effectiveSlotId, "");
		});
	});

	describe("3. Modal Shell & Canonical PublicOnlineBookingWidget Integration (Mandate 8s)", () => {
		it("renders null when isOpen is false", () => {
			const html = renderToStaticMarkup(
				createElement(PatientOnlineBookingModal, {
					isOpen: false,
					onClose: () => {},
				}),
			);
			assert.strictEqual(html, "");
		});

		it("renders modal window, overlay, and canonical booking widget container when isOpen is true", () => {
			const html = renderToStaticMarkup(
				createElement(PatientOnlineBookingModal, {
					isOpen: true,
					onClose: () => {},
					doctors: MULTI_DOCTORS,
					services: TEST_SERVICES,
					branches: [TEST_BRANCH],
				}),
			);

			assert.ok(
				html.includes('data-testid="patient-online-booking-modal"'),
				"Must render overlay container",
			);
			assert.ok(
				html.includes('data-testid="booking-modal-window"'),
				"Must render modal window container",
			);
			assert.ok(
				html.includes('data-testid="close-online-booking-btn"'),
				"Must render close button",
			);
			assert.ok(
				html.includes("dente-booking-widget"),
				"Must embed canonical PublicOnlineBookingWidget root container",
			);
		});

		it("populates actionRef with programmatic navigation handlers", () => {
			let stepChangedTo: number | null = null;
			const actionRef = { current: null as any };

			renderToStaticMarkup(
				createElement(PatientOnlineBookingModal, {
					isOpen: true,
					onClose: () => {},
					doctors: MULTI_DOCTORS,
					services: TEST_SERVICES,
					branches: [TEST_BRANCH],
					actionRef,
					onStepChange: (step) => {
						stepChangedTo = step;
					},
				}),
			);

			assert.ok(actionRef.current, "Action ref must be populated by modal");
			assert.strictEqual(actionRef.current.getCurrentStep(), 1);
			assert.strictEqual(
				actionRef.current.getSelectedDoctorId(),
				MULTI_DOCTORS[0]?.id,
			);
			assert.strictEqual(
				actionRef.current.getSelectedServiceId(),
				TEST_SERVICES[0]?.id,
			);

			// Test proceeding to step 2 programmatically
			actionRef.current.proceedToStep2();
			assert.strictEqual(stepChangedTo, 2);

			// Test proceeding to step 3 programmatically
			actionRef.current.proceedToStep3();
			assert.strictEqual(stepChangedTo, 3);
		});
	});
});
