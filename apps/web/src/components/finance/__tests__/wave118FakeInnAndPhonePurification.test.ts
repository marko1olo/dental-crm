import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CashRegisterStudioModal } from "../../cashbox/CashRegisterStudioModal";
import { EmergencyRescueModal } from "../../emergency/EmergencyRescueModal";
import { Billing1CExportModal } from "../Billing1CExportModal";
import { OneCExportButton } from "../OneCExportButton";
import { DentalLabStudioModal, buildLabOrderMessengerSummary } from "../../lab/DentalLabStudioModal";
import { OrthodonticsStudioModal, formatOrthodonticPatientMemo } from "../../orthodontics/OrthodonticsStudioModal";
import { PrescriptionModal } from "../../visit/PrescriptionModal";
import { CashShiftClosingModal } from "../../shift/CashShiftClosingModal";

describe("Wave 118: Eradication of Synthetic INNs and Phone Fallbacks (Live 6G SUT)", () => {
	const FAKE_INN = "7701234567";
	const FAKE_PHONE = "+7 (495) 123-45-67";

	describe("1. Live Finance Modals & Export Controls — Zero Synthetic INN ('7701234567')", () => {
		it("Billing1CExportModal and OneCExportButton omit synthetic INN 7701234567 when clinicInn is empty", () => {
			const modalHtml = renderToStaticMarkup(
				React.createElement(Billing1CExportModal, {
					isOpen: true,
					onClose: () => {},
					actNumber: "АКТ-118",
					items: [{ name: "Консультация", priceRub: 1500, quantity: 1 }],
					totalRub: 1500,
					clinicInn: "",
				}),
			);
			assert.equal(modalHtml.includes(FAKE_INN), false);
			assert.equal(modalHtml.includes(FAKE_PHONE), false);

			const btnHtml = renderToStaticMarkup(
				React.createElement(OneCExportButton, {
					actNumber: "АКТ-118",
					items: [{ name: "Консультация", priceRub: 1500, quantity: 1 }],
					totalRub: 1500,
					clinicInn: "",
				}),
			);
			assert.equal(btnHtml.includes(FAKE_INN), false);
			assert.equal(btnHtml.includes(FAKE_PHONE), false);
		});

		it("CashShiftClosingModal and CashRegisterStudioModal omit synthetic INN 7701234567", () => {
			const prevDoc = (globalThis as { document?: unknown }).document;
			(globalThis as { document?: unknown }).document = undefined;
			try {
				const shiftHtml = renderToStaticMarkup(
					React.createElement(CashShiftClosingModal, {
						isOpen: true,
						onClose: () => {},
						shiftNumber: 12,
						cashierFullName: "Кассир Клиники",
					}),
				);
				assert.ok(shiftHtml.includes("Кассир Клиники"));
				assert.equal(shiftHtml.includes(FAKE_INN), false);

				const registerHtml = renderToStaticMarkup(
					React.createElement(CashRegisterStudioModal, {
						isOpen: true,
						onClose: () => {},
						shiftNumber: 12,
						cashierFullName: "Кассир Клиники",
					}),
				);
				assert.ok(registerHtml.length > 0);
				assert.equal(registerHtml.includes(FAKE_INN), false);
			} finally {
				(globalThis as { document?: unknown }).document = prevDoc;
			}
		});
	});

	describe("2. Live Clinical & Specialty Modals — Zero Synthetic Phone ('+7 (495) 123-45-67')", () => {
		it("PrescriptionModal, EmergencyRescueModal, DentalLabStudioModal, and OrthodonticsStudioModal omit fake clinic phone", () => {
			const prevDoc = (globalThis as { document?: unknown }).document;
			(globalThis as { document?: unknown }).document = undefined;
			try {
				const rxHtml = renderToStaticMarkup(
					React.createElement(PrescriptionModal, {
						isOpen: true,
						onClose: () => {},
						patientName: "Пациент Тест",
					}),
				);
				assert.equal(rxHtml.includes(FAKE_PHONE), false);

				const emergencyHtml = renderToStaticMarkup(
					React.createElement(EmergencyRescueModal, {
						isOpen: true,
						onClose: () => {},
						initialPatientName: "Пациент Тест",
					}),
				);
				assert.equal(emergencyHtml.includes(FAKE_PHONE), false);

				const labHtml = renderToStaticMarkup(
					React.createElement(DentalLabStudioModal, {
						isOpen: true,
						onClose: () => {},
						patientName: "Пациент Тест",
					}),
				);
				assert.equal(labHtml.includes(FAKE_PHONE), false);

				const orthoHtml = renderToStaticMarkup(
					React.createElement(OrthodonticsStudioModal, {
						isOpen: true,
						onClose: () => {},
						patientName: "Пациент Тест",
					}),
				);
				assert.equal(orthoHtml.includes(FAKE_PHONE), false);
			} finally {
				(globalThis as { document?: unknown }).document = prevDoc;
			}
		});
	});

	describe("3. Runtime Behavior — formatOrthodonticPatientMemo phone fallback autonomy", () => {
		it("omitted clinicPhone does NOT produce fake phone and formats cleanly", () => {
			const memo = formatOrthodonticPatientMemo({
				clinicName: "DENTE Test",
				doctorName: "Д-р Ортодонт",
				patientName: "Пациент Тест",
				bracketSystem: "damon_q2",
			});

			assert.strictEqual(memo.includes(FAKE_PHONE), false, "Must NOT include fake phone number");
			assert.ok(
				memo.includes("немедленно свяжитесь с клиникой."),
				"Outputs clean contact prompt without trailing colon or empty string",
			);
		});

		it("provided clinicPhone is correctly included", () => {
			const memo = formatOrthodonticPatientMemo({
				clinicName: "DENTE Test",
				clinicPhone: "+7 (999) 555-44-33",
				doctorName: "Д-р Ортодонт",
				patientName: "Пациент Тест",
				bracketSystem: "damon_q2",
			});

			assert.ok(
				memo.includes("немедленно свяжитесь с клиникой: +7 (999) 555-44-33."),
				"Must include provided clinic phone",
			);
		});
	});

	describe("4. Runtime Behavior — buildLabOrderMessengerSummary phone fallback autonomy", () => {
		it("omitted clinicPhone outputs 'не указан' and zero fake phone", () => {
			const summary = buildLabOrderMessengerSummary({
				clinicName: "Денте Лаб",
				gostOrderNumber: "ЗТЛ-118",
				patientName: "Пациент Тест",
				doctorName: "Врач Тест",
				teethOrJaw: "16",
				constructionTypeTitle: "Коронка",
				materialTitle: "Цирконий",
				shade: "A2",
				dueDate: "20.09.2026",
			});

			assert.strictEqual(summary.includes(FAKE_PHONE), false, "Must NOT include fake phone number");
			assert.ok(
				summary.includes("Связь с клиникой: не указан."),
				"Outputs 'не указан' when phone is omitted",
			);
		});

		it("provided clinicPhone is correctly included", () => {
			const summary = buildLabOrderMessengerSummary({
				clinicName: "Денте Лаб",
				clinicPhone: "+7 (812) 333-22-11",
				gostOrderNumber: "ЗТЛ-118",
				patientName: "Пациент Тест",
				doctorName: "Врач Тест",
				teethOrJaw: "16",
				constructionTypeTitle: "Коронка",
				materialTitle: "Цирконий",
				shade: "A2",
				dueDate: "20.09.2026",
			});

			assert.ok(
				summary.includes("Связь с клиникой: +7 (812) 333-22-11."),
				"Must include provided clinic phone",
			);
		});
	});
});
