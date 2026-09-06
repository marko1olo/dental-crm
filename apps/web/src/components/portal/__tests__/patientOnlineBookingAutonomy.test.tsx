/**
 * Patient Online Booking Autonomy & Solo Doctor Invariants Unit Tests
 * (CONSTITUTION: THE HAMMER, MANDATE 8e DOCTOR AUTONOMY, MANDATE 8n SOLO DOCTOR SOVEREIGNTY)
 *
 * Verifies:
 * 1. Solo doctor scenario (doctors.length === 1) automatically selects the doctor,
 *    displays the helpful badge «Приём ведёт: [Doctor Name]», and locks in the selection.
 * 2. Clicking «Выбрать дату и время» with initial empty selection auto-selects fallback
 *    doctor (doctors[0]) and fallback service (services[0]), and advances to Step 2
 *    without being disabled.
 * 3. Step 1 Next button is never disabled when doctors and services exist.
 */

import assert from "node:assert/strict";
import { describe, it } from "vitest";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	PatientOnlineBookingModal,
	resolveBookingStep1Selection,
} from "../PatientOnlineBookingModal";
import type {
	BookingBranch,
	BookingDoctor,
	BookingService,
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

describe("PatientOnlineBookingModal — Solo Doctor & Step 1 Autonomy (Mandates 8e & 8n)", () => {
	describe("1. Solo Doctor Scenario (doctors.length === 1)", () => {
		it("automatically displays the helpful badge «Приём ведёт: [Doctor Name]»", () => {
			const html = renderToStaticMarkup(
				createElement(PatientOnlineBookingModal, {
					isOpen: true,
					onClose: () => {},
					doctors: [SOLO_DOCTOR],
					services: TEST_SERVICES,
					branches: [TEST_BRANCH],
				}),
			);

			// Assert badge presence and text
			assert.ok(
				html.includes('data-testid="solo-doctor-badge"'),
				"Must render solo doctor badge with data-testid='solo-doctor-badge'",
			);
			assert.ok(
				html.includes("Приём ведёт:"),
				"Badge must include text 'Приём ведёт:'",
			);
			assert.ok(
				html.includes("Барабаш Сергей Васильевич"),
				"Badge must display solo doctor's full name",
			);
		});

		it("automatically selects and locks in the solo doctor card", () => {
			const html = renderToStaticMarkup(
				createElement(PatientOnlineBookingModal, {
					isOpen: true,
					onClose: () => {},
					doctors: [SOLO_DOCTOR],
					services: TEST_SERVICES,
					branches: [TEST_BRANCH],
					initialDoctorId: "",
				}),
			);

			// Assert card selection
			assert.ok(
				html.includes(`data-testid="doctor-card-${SOLO_DOCTOR.id}"`),
				"Must render solo doctor card",
			);
			assert.ok(
				html.includes("booking-doctor-card selected"),
				"Solo doctor card must have 'selected' class automatically",
			);
		});

		it("pure helper resolveBookingStep1Selection marks solo doctor as locked", () => {
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
	});

	describe("2. Step 1 Button Autonomy & Fallback Progression", () => {
		it("button «Выбрать дату и время» is NOT disabled when doctors and services exist, even with initial empty selection", () => {
			const html = renderToStaticMarkup(
				createElement(PatientOnlineBookingModal, {
					isOpen: true,
					onClose: () => {},
					doctors: MULTI_DOCTORS,
					services: TEST_SERVICES,
					branches: [TEST_BRANCH],
					initialDoctorId: "",
					initialServiceId: "",
				}),
			);

			// Find button HTML
			const btnMatch = html.match(/<button[^>]*data-testid="booking-next-to-step-2-btn"[^>]*>/);
			assert.ok(btnMatch, "Must find booking-next-to-step-2-btn in rendered HTML");

			const btnTag = btnMatch[0];
			assert.ok(
				!btnTag.includes('disabled=""'),
				`Button must NOT be disabled when doctors and services exist. Found: ${btnTag}`,
			);
			assert.ok(
				html.includes("Выбрать дату и время"),
				"Button must display text 'Выбрать дату и время'",
			);
		});

		it("clicking «Выбрать дату и время» with initial empty selection auto-selects fallback doctor/service and proceeds to Step 2", () => {
			let stepChangedTo: number | null = null;
			let selectedDocAfterStep: string | null = null;
			let selectedSrvAfterStep: string | null = null;

			const actionRef = { current: null as any };

			renderToStaticMarkup(
				createElement(PatientOnlineBookingModal, {
					isOpen: true,
					onClose: () => {},
					doctors: MULTI_DOCTORS,
					services: TEST_SERVICES,
					branches: [TEST_BRANCH],
					initialDoctorId: "",
					initialServiceId: "",
					actionRef,
					onStepChange: (step, docId, srvId) => {
						stepChangedTo = step;
						selectedDocAfterStep = docId;
						selectedSrvAfterStep = srvId;
					},
				}),
			);

			assert.ok(actionRef.current, "Action ref must be populated by modal");

			// Initial state verification before click
			assert.strictEqual(actionRef.current.getCurrentStep(), 1);
			assert.strictEqual(actionRef.current.getSelectedDoctorId(), MULTI_DOCTORS[0]?.id);
			assert.strictEqual(actionRef.current.getSelectedServiceId(), TEST_SERVICES[0]?.id);

			// Simulate patient clicking «Выбрать дату и время» without picking explicitly
			actionRef.current.proceedToStep2();

			// Verify fallback auto-selection and step advance
			assert.strictEqual(stepChangedTo, 2, "Must advance to step 2 seamlessly");
			assert.strictEqual(
				selectedDocAfterStep,
				MULTI_DOCTORS[0]?.id,
				"Must auto-select first available doctor as fallback",
			);
			assert.strictEqual(
				selectedSrvAfterStep,
				TEST_SERVICES[0]?.id,
				"Must auto-select first available service as fallback",
			);
		});

		it("renders Step 2 summary ribbon with auto-selected doctor and service", () => {
			const html = renderToStaticMarkup(
				createElement(PatientOnlineBookingModal, {
					isOpen: true,
					onClose: () => {},
					doctors: MULTI_DOCTORS,
					services: TEST_SERVICES,
					branches: [TEST_BRANCH],
					initialStep: 2,
					initialDoctorId: "",
					initialServiceId: "",
				}),
			);

			// Assert Step 2 is rendered
			assert.ok(
				html.includes('data-testid="booking-step-2-content"'),
				"Must render step 2 date/time selection content",
			);
			assert.ok(
				html.includes("Смирнова Екатерина Алексеевна"),
				"Step 2 summary ribbon must show fallback doctor name",
			);
			assert.ok(
				html.includes("Первичная консультация и диагностика (КЛКТ/ОПТГ)"),
				"Step 2 summary ribbon must show fallback service title",
			);
		});

		it("disables button «Выбрать дату и время» only when doctors or services catalog is completely empty", () => {
			const htmlNoDoctors = renderToStaticMarkup(
				createElement(PatientOnlineBookingModal, {
					isOpen: true,
					onClose: () => {},
					doctors: [],
					services: TEST_SERVICES,
					branches: [TEST_BRANCH],
				}),
			);

			const btnMatchNoDocs = htmlNoDoctors.match(/<button[^>]*data-testid="booking-next-to-step-2-btn"[^>]*>/);
			assert.ok(btnMatchNoDocs, "Must find button");
			assert.ok(
				btnMatchNoDocs[0].includes('disabled=""'),
				"Button must be disabled when doctors array is empty",
			);

			const htmlNoServices = renderToStaticMarkup(
				createElement(PatientOnlineBookingModal, {
					isOpen: true,
					onClose: () => {},
					doctors: MULTI_DOCTORS,
					services: [],
					branches: [TEST_BRANCH],
				}),
			);

			const btnMatchNoSrvs = htmlNoServices.match(/<button[^>]*data-testid="booking-next-to-step-2-btn"[^>]*>/);
			assert.ok(btnMatchNoSrvs, "Must find button");
			assert.ok(
				btnMatchNoSrvs[0].includes('disabled=""'),
				"Button must be disabled when services array is empty",
			);
		});
	});
});
