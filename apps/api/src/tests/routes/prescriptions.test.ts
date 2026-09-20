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
import { FORBIDDEN_NARCOTIC_INN_PATTERNS } from "../../routes/prescriptions.js";

describe("API Prescriptions Routes & Statutory Validity (Order 1094n)", () => {
	it("1. Exposes full reference catalog: forms, routes, categories and validity periods", () => {
		assert.ok(PRESCRIPTION_DOSAGE_FORMS_CATALOG.length >= 10);
		assert.ok(PRESCRIPTION_ADMINISTRATION_ROUTES_CATALOG.length >= 4);
		assert.ok(DENTAL_PRESCRIPTION_DRUG_CATALOG.length >= 15);
		assert.equal(PRESCRIPTION_VALIDITY_RULES["148-1u-88"].defaultValidityPeriod, "15");
		assert.equal(PRESCRIPTION_VALIDITY_RULES["107-1u"].defaultValidityPeriod, "60");
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
				{ latinName: "Rp.: Tab. Ketorolaci 10 mg", tradeName: "Кеторолак" },
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
			items: [{ latinName: "Rp.: Tab. Ketorolaci 10 mg" }],
		});
		assert.equal(invalidPkuDays.isValid, false);
		assert.ok(invalidPkuDays.errors.some((e) => e.includes("15 дней")));

		// Rejects missing patient address
		const missingAddress = verifyPrescriptionStatutoryValidity({
			formType: "148-1u-88",
			prescriptionDate: "2026-08-23",
			validityDays: "15",
			patientAddress: "",
			items: [{ latinName: "Rp.: Tab. Ketorolaci 10 mg" }],
		});
		assert.equal(missingAddress.isValid, false);
		assert.ok(missingAddress.errors.some((e) => e.includes("адреса")));
	});

	it("4. Validates Form 107-1/u Chronic Prescription: Special care flag required for 365 days", () => {
		const validChronic = verifyPrescriptionStatutoryValidity({
			formType: "107-1u",
			prescriptionDate: "2026-08-23",
			validityDays: "365",
			isChronicSpecialCare: true,
			chronicPeriodicity: "ежемесячно (1 раз в 30 дней)",
			items: [{ latinName: "Rp.: Nimesulidi 100 mg" }],
		}, "2026-08-23");

		assert.equal(validChronic.isValid, true);
		assert.equal(validChronic.validityDays, 365);

		// Missing isChronicSpecialCare when 365 days requested
		const missingSpecialCare = verifyPrescriptionStatutoryValidity({
			formType: "107-1u",
			prescriptionDate: "2026-08-23",
			validityDays: "365",
			isChronicSpecialCare: false,
			items: [{ latinName: "Rp.: Nimesulidi 100 mg" }],
		});
		assert.equal(missingSpecialCare.isValid, false);
		assert.ok(missingSpecialCare.errors.some((e) => e.includes("специальному назначению")));

		// Missing chronicPeriodicity generates warning
		const missingPeriodicity = verifyPrescriptionStatutoryValidity({
			formType: "107-1u",
			prescriptionDate: "2026-08-23",
			validityDays: "365",
			isChronicSpecialCare: true,
			chronicPeriodicity: "",
			items: [{ latinName: "Rp.: Nimesulidi 100 mg" }],
		});
		assert.equal(missingPeriodicity.isValid, true);
		assert.ok(missingPeriodicity.warnings.some((w) => w.includes("периодичность")));
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
			items: [{ latinName: "Rp.: Tab. Ketorolaci 10 mg" }],
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

	it("7. Mandate 8i & 8s: Enforces outpatient dental bounded context by detecting and rejecting Schedule II/III narcotics", () => {
		const narcoticSamples = [
			"Rp.: Sol. Morphini hydrochloridi 1%",
			"Rp.: Tab. Promedoli 25 mg",
			"Rp.: Trimeperidini 20 mg",
			"Rp.: Fentanyli 50 mcg/h",
			"Rp.: Tab. Buprenorphini 0.2 mg",
			"Rp.: Omnoponi 10 mg",
			"Морфин",
			"Промедол",
		];

		for (const narcotic of narcoticSamples) {
			const isDetected = FORBIDDEN_NARCOTIC_INN_PATTERNS.some((p) => p.test(narcotic));
			assert.equal(
				isDetected,
				true,
				`Ожидалось обнаружение наркотического вещества: ${narcotic}`,
			);
		}

		// Dental non-narcotic NSAIDs and antibiotics MUST NOT be blocked
		const dentalAllowedDrugs = [
			"Rp.: Nimesulidi 100 mg",
			"Rp.: Tab. Ketorolaci 10 mg",
			"Rp.: Sol. Dexketoprofeni 50 mg",
			"Rp.: Amoxicillini + Clavulanati 875/125 mg",
			"Rp.: Tab. Ciprofloxacini 500 mg",
			"Rp.: Sol. Chlorhexidini 0.05%",
		];

		for (const drug of dentalAllowedDrugs) {
			const isBlocked = FORBIDDEN_NARCOTIC_INN_PATTERNS.some((p) => p.test(drug));
			assert.equal(
				isBlocked,
				false,
				`Стоматологический препарат не должен блокироваться: ${drug}`,
			);
		}
	});

	it("8. Mandate 8e item 4: Outpatient dental prescriptions require only treating doctor authority (no consiliums/commissions)", () => {
		// Treating dentist prescribes independently Form 107-1/u or 148-1/u-88 without inpatient consilium gates
		const standardPrescription = verifyPrescriptionStatutoryValidity({
			formType: "107-1u",
			prescriptionDate: "2026-08-23",
			validityDays: "60",
			items: [
				{ latinName: "Rp.: Nimesulidi 100 mg", tradeName: "Нимесил" },
			],
		}, "2026-08-23");

		assert.equal(standardPrescription.isValid, true);
		assert.equal(standardPrescription.errors.length, 0);
	});
});
