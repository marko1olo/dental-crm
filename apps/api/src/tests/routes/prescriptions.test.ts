import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	PRESCRIPTION_ADMINISTRATION_ROUTES_CATALOG,
	PRESCRIPTION_DOSAGE_FORMS_CATALOG,
	PRESCRIPTION_VALIDITY_RULES,
	calculatePrescriptionExpiration,
	renderPrescriptionUniversalHtml,
	verifyPrescriptionStatutoryValidity,
} from "@dental/shared";

describe("API Prescriptions Routes & Statutory Validity (Order 1094n)", () => {
	it("1. Exposes full reference catalog: forms, routes, categories and validity periods", () => {
		assert.ok(PRESCRIPTION_DOSAGE_FORMS_CATALOG.length >= 10);
		assert.ok(PRESCRIPTION_ADMINISTRATION_ROUTES_CATALOG.length >= 4);
		assert.ok(DENTAL_PRESCRIPTION_DRUG_CATALOG.length >= 15);
		assert.equal(PRESCRIPTION_VALIDITY_RULES["148-1u-88"].defaultValidityPeriod, "15");
		assert.equal(PRESCRIPTION_VALIDITY_RULES["107-1u"].defaultValidityPeriod, "60");
		assert.equal(PRESCRIPTION_VALIDITY_RULES["148-1u-04l"].defaultValidityPeriod, "30");
	});

	it("2. Validates Form 107-1/u standard prescription (60 days)", () => {
		const result = verifyPrescriptionStatutoryValidity({
			formType: "107-1u",
			prescriptionDate: "2026-08-23",
			validityDays: "60",
			items: [
				{ latinName: "Rp.: Nimesulidi 100 mg", tradeName: "Нимесил" },
				{ latinName: "Rp.: Amoxicillini 875 mg", tradeName: "Амоксиклав" },
			],
		}, "2026-08-23");

		assert.equal(result.isValid, true);
		assert.equal(result.status, "active");
		assert.equal(result.validityDays, 60);
		assert.equal(result.daysRemaining, 60);
		assert.equal(result.isExpired, false);
		assert.equal(result.errors.length, 0);
	});

	it("3. Validates Form 148-1/u-88 (ПКУ) strict 15-day expiration & single-item mandate", () => {
		const validPku = verifyPrescriptionStatutoryValidity({
			formType: "148-1u-88",
			prescriptionDate: "2026-08-23",
			validityDays: "15",
			patientAddress: "г. Москва, ул. Тверская, д. 12, кв. 34",
			items: [
				{ latinName: "Rp.: Tramadoli 50 mg", tradeName: "Трамадол" },
			],
		}, "2026-08-23");

		assert.equal(validPku.isValid, true);
		assert.equal(validPku.validityDays, 15);
		assert.equal(validPku.daysRemaining, 15);

		// Rejects 148-1/u-88 with 60 days
		const invalidPkuDays = verifyPrescriptionStatutoryValidity({
			formType: "148-1u-88",
			prescriptionDate: "2026-08-23",
			validityDays: "60",
			patientAddress: "г. Москва, ул. Тверская, д. 12, кв. 34",
			items: [{ latinName: "Rp.: Tramadoli 50 mg" }],
		});
		assert.equal(invalidPkuDays.isValid, false);
		assert.ok(invalidPkuDays.errors.some((e) => e.includes("15 дней")));

		// Rejects missing patient address
		const missingAddress = verifyPrescriptionStatutoryValidity({
			formType: "148-1u-88",
			prescriptionDate: "2026-08-23",
			validityDays: "15",
			patientAddress: "",
			items: [{ latinName: "Rp.: Tramadoli 50 mg" }],
		});
		assert.equal(missingAddress.isValid, false);
		assert.ok(missingAddress.errors.some((e) => e.includes("адреса")));
	});

	it("4. Validates Form 148-1/u-04(л) Preferential Prescription: SNILS & OMS Policy required", () => {
		const validPreferential = verifyPrescriptionStatutoryValidity({
			formType: "148-1u-04l",
			prescriptionDate: "2026-08-23",
			validityDays: "30",
			preferentialDetails: {
				patientSnils: "123-456-789 00",
				patientOmsPolicy: "1234567890123456",
			},
			items: [{ latinName: "Rp.: Tab. Metformini 1000 mg" }],
		}, "2026-08-23");

		assert.equal(validPreferential.isValid, true);
		assert.equal(validPreferential.validityDays, 30);

		// Missing SNILS
		const missingSnils = verifyPrescriptionStatutoryValidity({
			formType: "148-1u-04l",
			prescriptionDate: "2026-08-23",
			validityDays: "30",
			preferentialDetails: {
				patientSnils: "",
				patientOmsPolicy: "1234567890123456",
			},
			items: [{ latinName: "Rp.: Tab. Metformini 1000 mg" }],
		});
		assert.equal(missingSnils.isValid, false);
		assert.ok(missingSnils.errors.some((e) => e.includes("СНИЛС")));
	});

	it("5. Calculates expiration date and detects expired / expiring-soon prescriptions", () => {
		const expDate = calculatePrescriptionExpiration("2026-08-01", 60);
		assert.equal(expDate, "2026-09-30");

		// Expiring in 2 days (issued 13 days ago on 15-day validity)
		const expiringSoon = verifyPrescriptionStatutoryValidity({
			formType: "148-1u-88",
			prescriptionDate: "2026-08-10",
			validityDays: "15",
			patientAddress: "г. Москва, Ленинский пр-кт, 10",
			items: [{ latinName: "Rp.: Tramadoli 50 mg" }],
		}, "2026-08-23");

		assert.equal(expiringSoon.status, "expiring_soon");
		assert.equal(expiringSoon.daysRemaining, 2);
		assert.equal(expiringSoon.isExpired, false);
	});

	it("6. Generates high-fidelity printable HTML with clinic stamp & UKEP badge", () => {
		const html = renderPrescriptionUniversalHtml({
			formNumber: "107-1/у",
			clinicLegalName: "ООО «Денте Стоматология»",
			clinicAddress: "г. Москва, Клинический переулок, д. 7",
			clinicPhone: "+7 (495) 777-22-11",
			clinicOgrn: "1207700123456",
			clinicInn: "7701234567",
			prescriptionSeriesNumber: "РЕЦ-2026-8819",
			prescriptionDate: "2026-08-23",
			patientFullName: "Сидоров С.С.",
			patientBirthDate: "1992-03-10",
			medicalCardNumber: "043/у-99",
			doctorFullName: "Д-р Кузнецова Е.В.",
			doctorSpecialty: "Врач-стоматолог-терапевт",
			validityDays: "60",
			items: [
				{
					latinName: "Rp.: Nimesulidi 100 mg",
					tradeName: "Нимесил",
					form: "гранулы",
					dosage: "100 мг",
					quantity: "N. 10",
					dispenseLatin: "D.t.d. N 10 in gran.",
					signaRussian: "S. По 1 пакетику 2 раза в день.",
				},
			],
			ukepSignature: {
				doctorFullName: "Д-р Кузнецова Е.В.",
				certificateSerialNumber: "7700B891A40098F2104",
				cryptoSignaturePkcs7: "MIIEVwYJKoZIhvcNAQcCoIIE...",
			},
		});

		assert.ok(html.includes("Форма бланка № 107-1/у"));
		assert.ok(html.includes("ООО «Денте Стоматология»"));
		assert.ok(html.includes("ДОКУМЕНТ ПОДПИСАН УСИЛЕННОЙ КВАЛИФИЦИРОВАННОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (УКЭП)"));
		assert.ok(html.includes("7700B891A40098F2104"));
	});
});
