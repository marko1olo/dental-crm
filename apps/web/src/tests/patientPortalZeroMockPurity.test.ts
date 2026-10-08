/**
 * patientPortalZeroMockPurity.test.ts
 *
 * Бескомпромиссная Ред-тим проверка нулевых моков в Портале Пациента и Онлайн-записи
 * (Patient Portal & Online Booking Zero-Mock Purity & Production Quarantine Inquisitor).
 *
 * ВЫСШАЯ КОНСТИТУЦИЯ (THE HAMMER), МАНДАТЫ 8c (ZERO-MOCKS), 8f (REAL PERSISTENCE), 8y (STRICT DUAL-MODE).
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	isDemoShowcaseMode,
	setRuntimeDemoMode,
} from "../utils/demoModeEngine.js";

import {
	getSafePortalProfile,
	getSafeVisitProtocols,
	getSafePortalTreatmentPlan,
	getSafePortalInvoices,
	getSafePortalDocuments,
	getSafeRadiologyScans,
	getSafeBookingBranches,
	getSafeBookingDoctors,
	getSafeBookingServices,
	getSafeUpcomingVisit,
	SAMPLE_PORTAL_PROFILE,
	SAMPLE_PORTAL_TREATMENT_PLAN,
	SAMPLE_PORTAL_INVOICES,
	SAMPLE_PORTAL_DOCUMENTS,
	SAMPLE_RADIOLOGY_SCANS,
	SAMPLE_BOOKING_BRANCHES,
	SAMPLE_BOOKING_DOCTORS,
	SAMPLE_BOOKING_SERVICES,
	SAMPLE_UPCOMING_VISIT,
} from "../components/portal/patientPortalPresets.js";

import { createDefaultHealthyAdultTeeth } from "../components/portal/patientFriendlyOdontogramEngine.js";
import { PatientPlanView } from "../components/portal/PatientPlanView.js";
import { TelegramPatientPortalCabinet } from "../components/portal/telegramMiniApp/TelegramPatientPortalCabinet.js";
import { TelegramMiniAppBooking } from "../components/portal/telegramMiniApp/TelegramMiniAppBooking.js";

describe("Patient Portal & Booking Zero-Mock Production Purity (Mandates 8c, 8f, 8y)", () => {
	beforeEach(() => {
		setRuntimeDemoMode(null);
	});

	afterEach(() => {
		setRuntimeDemoMode(null);
	});

	it("Gate 1: Strict Isolation in patientPortalPresets getters (Prod returns null/[], Demo returns showcase)", () => {
		// --- 1. Боевой режим (Production: isDemoShowcaseMode === false) ---
		setRuntimeDemoMode(false);
		assert.equal(isDemoShowcaseMode(), false, "Production mode must have isDemoShowcaseMode() === false");

		assert.equal(getSafePortalProfile(), null, "Production profile must be null without live API data");
		assert.deepEqual(getSafeVisitProtocols(), [], "Production visit protocols must be empty array");
		assert.equal(getSafePortalTreatmentPlan(), null, "Production treatment plan must be null");
		assert.deepEqual(getSafePortalInvoices(), [], "Production invoices must be empty array");
		assert.deepEqual(getSafePortalDocuments(), [], "Production documents must be empty array");
		assert.deepEqual(getSafeRadiologyScans(), [], "Production radiology scans must be empty array");
		assert.deepEqual(getSafeBookingBranches(), [], "Production booking branches must be empty array");
		assert.deepEqual(getSafeBookingDoctors(), [], "Production booking doctors must be empty array");
		assert.deepEqual(getSafeBookingServices(), [], "Production booking services must be empty array");
		assert.equal(getSafeUpcomingVisit(), null, "Production upcoming visit must be null");

		// --- 2. Витринный демо-режим (Demo Showcase: isDemoShowcaseMode === true) ---
		setRuntimeDemoMode(true);
		assert.equal(isDemoShowcaseMode(), true, "Demo mode must have isDemoShowcaseMode() === true");

		assert.deepEqual(getSafePortalProfile(), SAMPLE_PORTAL_PROFILE, "Demo mode must return showcase profile");
		assert.equal(getSafeVisitProtocols().length, 3, "Demo mode must return showcase visit protocols");
		assert.deepEqual(getSafePortalTreatmentPlan(), SAMPLE_PORTAL_TREATMENT_PLAN, "Demo mode must return showcase treatment plan");
		assert.deepEqual(getSafePortalInvoices(), SAMPLE_PORTAL_INVOICES, "Demo mode must return showcase invoices");
		assert.deepEqual(getSafePortalDocuments(), SAMPLE_PORTAL_DOCUMENTS, "Demo mode must return showcase documents");
		assert.deepEqual(getSafeRadiologyScans(), SAMPLE_RADIOLOGY_SCANS, "Demo mode must return showcase radiology scans");
		assert.deepEqual(getSafeBookingBranches(), SAMPLE_BOOKING_BRANCHES, "Demo mode must return showcase booking branches");
		assert.deepEqual(getSafeBookingDoctors(), SAMPLE_BOOKING_DOCTORS, "Demo mode must return showcase booking doctors");
		assert.deepEqual(getSafeBookingServices(), SAMPLE_BOOKING_SERVICES, "Demo mode must return showcase booking services");
		assert.deepEqual(getSafeUpcomingVisit(), SAMPLE_UPCOMING_VISIT, "Demo mode must return showcase upcoming visit");
	});

	it("Gate 2: Odontogram default engine generates 32 healthy adult teeth without pathology mocks", () => {
		const teeth = createDefaultHealthyAdultTeeth();
		assert.equal(teeth.length, 32, "Must contain all 32 adult teeth");

		const uniqueCodes = new Set(teeth.map((t) => t.fdiCode));
		assert.equal(uniqueCodes.size, 32, "All 32 tooth FDI codes must be unique");

		for (const tooth of teeth) {
			assert.equal(tooth.status, "healthy", `Tooth #${tooth.fdiCode} must default to healthy in clinical base`);
			assert.equal(tooth.clinicalStateRu, "Здоров", `Tooth #${tooth.fdiCode} must show healthy clinical state`);
		}
	});

	it("Gate 3: PatientPlanView renders zero synthetic mocks in production mode", () => {
		setRuntimeDemoMode(false);

		const html = renderToStaticMarkup(React.createElement(PatientPlanView, {}));

		// В боевом режиме не должно быть следов хардкодной демо-персоны Воронова
		assert.equal(html.includes("Воронов Алексей Владимирович"), false, "Must not leak demo persona 'Воронов' in production");
		assert.equal(html.includes("043-8842"), false, "Must not leak demo card number '043-8842'");
		assert.equal(html.includes("+7 (999) 123-45-67"), false, "Must not leak demo phone '+7 (999) 123-45-67'");
		assert.equal(html.includes("10 000 бонусов"), false, "Must not leak demo 10 000 bonus balance");
		assert.equal(html.includes("15 000 ₽ кэшбэк"), false, "Must not leak demo 15 000 cashback");
		assert.equal(html.includes("default_adult_dente_16_cbct"), false, "Must not leak demo CT study ID in production");
	});

	it("Gate 4: TelegramPatientPortalCabinet renders honest empty state and zero balance in production mode", () => {
		setRuntimeDemoMode(false);

		const html = renderToStaticMarkup(React.createElement(TelegramPatientPortalCabinet, {}));

		// Финансы в проде стартуют с нуля
		assert.equal(html.includes("0 ₽"), true, "Production cabinet must start with 0 ₽ balance");
		assert.equal(html.includes((2750).toLocaleString("ru-RU")), false, "Production cabinet must not show fake 2 750 ₽ bonus");
		assert.equal(html.includes((148500).toLocaleString("ru-RU")), false, "Production cabinet must not show fake 148 500 ₽ expense");

		// Записи: честный пустой стейт
		assert.equal(html.includes("Нет запланированных визитов"), true, "Must render honest empty appointments state");
		assert.equal(html.includes("Д-р Смирнов Алексей Васильевич"), false, "Must not show demo doctor in production appointments");

		// В демо-режиме витрина восстанавливается
		setRuntimeDemoMode(true);
		const demoHtml = renderToStaticMarkup(React.createElement(TelegramPatientPortalCabinet, {}));
		assert.equal(demoHtml.includes((2750).toLocaleString("ru-RU")), true, "Demo cabinet must show demo bonus");
		assert.equal(demoHtml.includes("app-upcoming-1") || demoHtml.includes("Д-р Смирнов"), true, "Demo cabinet must show demo appointment");
	});

	it("Gate 5: TelegramMiniAppBooking renders zero pre-filled inputs and empty slots in production mode", () => {
		setRuntimeDemoMode(false);

		const html = renderToStaticMarkup(
			React.createElement(TelegramMiniAppBooking, {
				attachedComplaints: [],
			}),
		);

		// Не предзаполняет чужие имена и телефоны
		assert.equal(html.includes('value="Александр"'), false, "Must not pre-fill demo name in production");
		assert.equal(html.includes('value="+7 (999) 000-11-22"'), false, "Must not pre-fill demo phone in production");

		// Честные пустые состояния специалистов и окон
		assert.equal(html.includes("Нет доступных специалистов в данной категории"), true, "Must show empty specialists state in production");
		assert.equal(html.includes("На выбранную дату нет свободных слотов для записи"), true, "Must show empty slots state in production");

		// Кнопка записи заблокирована, пока не выбраны живые врач и слот
		assert.equal(html.includes("disabled"), true, "CTA button must be disabled when doctor/slot not selected");
	});

	it("Gate 6: TelegramPatientPortalCabinet imaging tab renders honest EmptyState when scans empty", () => {
		setRuntimeDemoMode(false);

		const html = renderToStaticMarkup(
			React.createElement(TelegramPatientPortalCabinet, {
				initialTab: "imaging",
			}),
		);

		assert.equal(html.includes("Снимки отсутствуют"), true, "Imaging tab must show 'Снимки отсутствуют' empty card");
		assert.equal(html.includes("После проведения радиовизиографии или КТ"), true, "Must explain to patient that scans will appear after diagnostics");
		assert.equal(html.includes("scan-rvg-16"), false, "Must not leak demo RVG scan in production");
	});
});
