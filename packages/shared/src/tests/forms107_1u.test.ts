import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CONTROLLED_DRUG_PRESETS,
	DENTAL_DRUG_DOSAGE_LIMITS,
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	PREFERENTIAL_BENEFIT_CATEGORIES,
	PREFERENTIAL_DRUG_PRESETS,
	PRESCRIPTION_ADMINISTRATION_ROUTES_CATALOG,
	PRESCRIPTION_DOSAGE_FORMS_CATALOG,
	evaluatePrescriptionPharmacologicalSafety,
	form107_1uPayloadSchema,
	form148_1u88PayloadSchema,
	form148_1u04lPayloadSchema,
	generateForm148_1u88Payload,
	generatePrescriptionPayloadFromSoap,
	renderForm107_1uHtml,
	renderForm148_1u04lHtml,
	renderForm148_1u88Html,
	renderPrescriptionUniversalHtml,
	verifyPrescriptionStatutoryValidity,
} from "../documents/index.js";

describe("Prescription Statutory Engine — Order 1094n (Формы 107-1/у, 148-1/у-88, 148-1/у-04(л))", () => {
	const clinic = {
		fullName: 'ООО "Денте Клиник"',
		address: "г. Москва, ул. Стоматологов, д. 10",
		phone: "+7 (495) 123-45-67",
		ogrn: "1234567890123",
		inn: "7701234567",
		medicalLicenseNumber: "ЛО-77-01-019845",
	};

	const patient = {
		fullName: "Иванов Иван Иванович",
		birthDate: "1988-05-14",
		medicalCardNumber: "СТ-2026/043",
		address: "г. Москва, Ломоносовский пр-кт, д. 18, кв. 45",
	};

	const doctor = {
		fullName: "Смирнова Анна Сергеевна",
		specialty: "Врач-стоматолог-терапевт",
		snils: "123-456-789 00",
	};

	const ukepSignature = {
		doctorFullName: "Смирнова Анна Сергеевна",
		doctorSpecialty: "Врач-стоматолог-терапевт",
		doctorSnils: "123-456-789 00",
		certificateSerialNumber: "7700B891A40098F2104",
		certificateThumbprint: "A1B2C3D4E5F67890ABCDEF1234567890ABCDEF12",
		certificateIssuer: "ФКУ 'Налог-Сервис' ФНС России (УЦ Минцифры)",
		certificateValidFrom: "2026-01-10",
		certificateValidTo: "2027-01-10",
		signedAt: "2026-08-23T10:00:00.000Z",
		cryptoSignaturePkcs7: "MIIEVwYJKoZIhvcNAQcCoIIESDCCBEQCAQExDzANBglghkgBZQMEAgEFAD...",
		signatureAlgorithm: "ГОСТ Р 34.10-2012 (256 бит)",
		egiszDocumentId: "EGISZ-RX-2026-98124",
	};

	it("1. Reference Catalogs: dosage forms, routes, categories and presets integrity", () => {
		// Dosage forms
		assert.ok(PRESCRIPTION_DOSAGE_FORMS_CATALOG.length >= 10);
		const formCodes = PRESCRIPTION_DOSAGE_FORMS_CATALOG.map((f) => f.code);
		assert.ok(formCodes.includes("tablets"));
		assert.ok(formCodes.includes("capsules"));
		assert.ok(formCodes.includes("granules_suspension"));
		assert.ok(formCodes.includes("solution_injection"));
		assert.ok(formCodes.includes("dental_gel"));

		// Administration routes
		assert.ok(PRESCRIPTION_ADMINISTRATION_ROUTES_CATALOG.length >= 4);
		const routeCodes = PRESCRIPTION_ADMINISTRATION_ROUTES_CATALOG.map((r) => r.code);
		assert.ok(routeCodes.includes("per_os"));
		assert.ok(routeCodes.includes("in_cavum_oris"));
		assert.ok(routeCodes.includes("sublingual"));

		// Preferential benefit categories
		assert.ok(PREFERENTIAL_BENEFIT_CATEGORIES.length >= 8);
		assert.ok(PREFERENTIAL_BENEFIT_CATEGORIES.some((c) => c.code === "081" && c.discountPercent === 100));
		assert.ok(PREFERENTIAL_BENEFIT_CATEGORIES.some((c) => c.code === "083" && c.discountPercent === 50));

		// Full drug catalog
		assert.ok(DENTAL_PRESCRIPTION_DRUG_CATALOG.length >= 15);
		assert.ok(CONTROLLED_DRUG_PRESETS.length >= 3);
		assert.ok(PREFERENTIAL_DRUG_PRESETS.length >= 3);
	});

	it("2. Form 107-1/u Statutory Prescription: Soap Auto-Generation & Validation", () => {
		const payload = generatePrescriptionPayloadFromSoap({
			clinic,
			patient,
			doctor,
			diagnosisIcd10: "K04.0",
			validityDays: "60",
			ukepSignature,
		});

		const validated = form107_1uPayloadSchema.parse(payload);
		assert.equal(validated.formNumber, "107-1/у");
		assert.equal(validated.clinicLegalName, 'ООО "Денте Клиник"');
		assert.equal(validated.patientFullName, "Иванов Иван Иванович");
		assert.equal(validated.validityDays, "60");
		assert.ok(validated.items.length >= 1 && validated.items.length <= 3);
		assert.equal(validated.ukepSignature?.certificateSerialNumber, "7700B891A40098F2104");

		// Test validity check
		const validity = verifyPrescriptionStatutoryValidity(validated, "2026-08-23");
		assert.equal(validity.isValid, true);
		assert.equal(validity.status, "active");
		assert.equal(validity.validityDays, 60);
		assert.equal(validity.isExpired, false);
	});

	it("3. Form 148-1/u-88 (ПКУ / Сильнодействующие): Rules & Strict 15-day Validity Enforcement", () => {
		const payload = generateForm148_1u88Payload({
			clinic,
			patient,
			doctor,
			headOfDepartmentFullName: "Петров П.П.",
			diagnosisIcd10: "K08.1",
			explicitDrugId: "tramadol_50",
			ukepSignature,
		});

		const validated = form148_1u88PayloadSchema.parse(payload);
		assert.equal(validated.formNumber, "148-1/у-88");
		assert.equal(validated.validityDays, "15");
		assert.equal(validated.items.length, 1);
		assert.ok(validated.items[0]?.latinName.includes("Tramadoli"));
		assert.ok(validated.patientAddress.includes("Ломоносовский"));

		const validity = verifyPrescriptionStatutoryValidity(validated, "2026-08-23");
		assert.equal(validity.isValid, true);
		assert.equal(validity.validityDays, 15);
		assert.equal(validity.errors.length, 0);

		// Rule rejection: 148-1/u-88 cannot have more than 1 item
		const invalidMultiItem = {
			...validated,
			items: [validated.items[0]!, validated.items[0]!],
		};
		const multiCheck = verifyPrescriptionStatutoryValidity(invalidMultiItem as any);
		assert.equal(multiCheck.isValid, false);
		assert.ok(multiCheck.errors.some((e) => e.includes("максимум 1")));
	});

	it("4. Form 148-1/u-04(л) Preferential Prescription: Benefit codes, SNILS & OMS Policy", () => {
		const prefPayload = {
			formNumber: "148-1/у-04(л)" as const,
			clinicLegalName: clinic.fullName,
			clinicAddress: clinic.address,
			clinicPhone: clinic.phone,
			clinicOgrn: clinic.ogrn,
			clinicInn: clinic.inn,
			prescriptionSeriesNumber: "ЛЬГ-2026-001234",
			prescriptionDate: "2026-08-23",
			patientFullName: patient.fullName,
			patientBirthDate: patient.birthDate,
			medicalCardNumber: patient.medicalCardNumber,
			preferentialDetails: {
				preferentialBenefitCode: "081",
				preferentialBenefitNameRu: "Инвалиды I группы",
				preferentialDiscountPercent: 100,
				patientSnils: "123-456-789 00",
				patientOmsPolicy: "1234567890123456",
				fundingSource: "federal" as const,
				medicalCardNumber: patient.medicalCardNumber,
			},
			doctorFullName: doctor.fullName,
			doctorSpecialty: doctor.specialty,
			validityDays: "30" as const,
			isChronicSpecialCare: false,
			items: [
				{
					id: "pref-1",
					latinName: "Rp.: Tab. Metformini 1000 mg",
					tradeName: "Метформин",
					form: "таблетки",
					dosage: "1000 мг",
					quantity: "N. 60",
					dispenseLatin: "D.t.d. N 60 in tab.",
					signaRussian: "S. Внутрь по 1 таб. 2 раза в день.",
					category: "preferential_somatic" as const,
				},
			],
			ukepSignature,
		};

		const validated = form148_1u04lPayloadSchema.parse(prefPayload);
		assert.equal(validated.preferentialDetails.preferentialBenefitCode, "081");
		assert.equal(validated.preferentialDetails.preferentialDiscountPercent, 100);

		const validity = verifyPrescriptionStatutoryValidity(validated, "2026-08-23");
		assert.equal(validity.isValid, true);
		assert.equal(validity.validityDays, 30);
	});

	it("5. Validity Period Verification: Expiration calculations and chronic special care (1 year)", () => {
		// Expired prescription (issued 70 days ago with 60-day validity)
		const pastDate = "2026-05-01";
		const expiredPrescription = {
			formNumber: "107-1/у",
			prescriptionDate: pastDate,
			validityDays: "60",
			items: [{ latinName: "Rp.: Ibuprofeni 400 mg", tradeName: "Ибупрофен" }],
		};

		const checkExpired = verifyPrescriptionStatutoryValidity(expiredPrescription, "2026-08-23");
		assert.equal(checkExpired.isExpired, true);
		assert.equal(checkExpired.status, "expired");
		assert.ok(checkExpired.daysRemaining < 0);

		// 1 Year Chronic prescription requires chronic special care flag
		const chronicMissingFlag = {
			formNumber: "107-1/у",
			prescriptionDate: "2026-08-23",
			validityDays: "365",
			isChronicSpecialCare: false,
			items: [{ latinName: "Rp.: Tab. Metformini 1000 mg" }],
		};
		const checkChronic = verifyPrescriptionStatutoryValidity(chronicMissingFlag);
		assert.equal(checkChronic.isValid, false);
		assert.ok(checkChronic.errors.some((e) => e.includes("По специальному назначению")));
	});

	it("6. High-Fidelity HTML Renderers: 107-1/у, 148-1/у-88, 148-1/у-04(л) and UKEP Stamp", () => {
		const payload107 = generatePrescriptionPayloadFromSoap({
			clinic,
			patient,
			doctor,
			diagnosisIcd10: "K04.5",
			explicitDrugIds: ["nimesulide_100", "amoxiclav_875_125"],
			ukepSignature,
		});

		const html107 = renderForm107_1uHtml(payload107);
		assert.ok(html107.includes("Форма бланка № 107-1/у"));
		assert.ok(html107.includes("1094н"));
		assert.ok(html107.includes("РЕЦЕПТ"));
		assert.ok(html107.includes("Печать медицинской организации"));
		assert.ok(html107.includes("ДОКУМЕНТ ПОДПИСАН УСИЛЕННОЙ КВАЛИФИЦИРОВАННОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (УКЭП)"));
		assert.ok(html107.includes("7700B891A40098F2104"));

		const payload148 = generateForm148_1u88Payload({
			clinic,
			patient,
			doctor,
			diagnosisIcd10: "K08.1",
			explicitDrugId: "tramadol_50",
			ukepSignature,
		});

		const html148 = renderForm148_1u88Html(payload148);
		assert.ok(html148.includes("Форма бланка № 148-1/у-88"));
		assert.ok(html148.includes("РЕЦЕПТ (ПКУ)"));
		assert.ok(html148.includes("15 дней"));
		assert.ok(html148.includes("СПЕЦ."));

		const universal107 = renderPrescriptionUniversalHtml(payload107);
		assert.ok(universal107.includes("Форма бланка № 107-1/у"));

		const universal148 = renderPrescriptionUniversalHtml(payload148);
		assert.ok(universal148.includes("Форма бланка № 148-1/у-88"));
	});

	it("7. Pharmacological Safety Engine: Dosage Limits (ВРД / ВСД) & Pediatric age restrictions", () => {
		// Test Nimesulide limits
		const nimesulide = DENTAL_DRUG_DOSAGE_LIMITS.nimesulide_100;
		assert.ok(nimesulide);
		assert.equal(nimesulide.maxSingleDoseMg, 100);
		assert.equal(nimesulide.maxDailyDoseMg, 200);
		assert.equal(nimesulide.pediatricMinAgeYears, 12);

		// Test Ketorolac limits
		const ketorolac = DENTAL_DRUG_DOSAGE_LIMITS.ketorolac_10;
		assert.ok(ketorolac);
		assert.equal(ketorolac.maxSingleDoseMg, 10);
		assert.equal(ketorolac.maxDailyDoseMg, 40);
		assert.equal(ketorolac.maxCourseDays, 5);

		// Pediatric age violation (Nimesulide for a 7-year-old)
		const childEval = evaluatePrescriptionPharmacologicalSafety({
			drugIds: ["nimesulide_100"],
			patientAgeYears: 7,
		});
		assert.equal(childEval.isSafe, false);
		assert.equal(childEval.hasContraindications, true);
		assert.ok(childEval.ageContraindications.some((c) => c.includes("до 12 лет")));

		// Adult safety pass
		const adultEval = evaluatePrescriptionPharmacologicalSafety({
			drugIds: ["nimesulide_100", "amoxiclav_875_125"],
			patientAgeYears: 30,
		});
		assert.equal(adultEval.isSafe, true);
		assert.equal(adultEval.hasContraindications, false);
	});

	it("8. Drug-Drug Interaction (DDI) Matrix: NSAID duplication and Opioid-Benzodiazepine Black Box Warning", () => {
		// Duplicate NSAIDs: Nimesulide + Ibuprofen
		const duplicateNsaids = evaluatePrescriptionPharmacologicalSafety({
			drugIds: ["nimesulide_100", "ibuprofen_400"],
			patientAgeYears: 25,
		});
		assert.equal(duplicateNsaids.isSafe, false);
		assert.ok(duplicateNsaids.duplicateCategories.some((d) => d.includes("дублирование НПВП")));
		assert.ok(duplicateNsaids.interactions.some((i) => i.titleRu.includes("Дублирование НПВП")));

		// Black Box Contraindication: Tramadol + Diazepam
		const opioidBenzo = evaluatePrescriptionPharmacologicalSafety({
			drugIds: ["tramadol_50", "diazepam_5"],
			patientAgeYears: 40,
		});
		assert.equal(opioidBenzo.isSafe, false);
		assert.equal(opioidBenzo.hasContraindications, true);
		assert.ok(opioidBenzo.interactions.some((i) => i.severity === "contraindicated"));
		assert.ok(opioidBenzo.interactions.some((i) => i.titleRu.includes("Black Box Warning")));

		// Quinolone + NSAID interaction: Ciprofloxacin + Ketorolac
		const ciproNsaid = evaluatePrescriptionPharmacologicalSafety({
			drugIds: ["ciprofloxacin_500", "ketorolac_10"],
			patientAgeYears: 35,
		});
		assert.equal(ciproNsaid.isSafe, false);
		assert.ok(ciproNsaid.interactions.some((i) => i.titleRu.includes("Фторхинолон + НПВП")));
	});

	it("9. Latin INN Formulations, Form 107-1/u Periods (15d / 60d / 1y) & QR Verification", () => {
		// Verify Amoxicillin Latin formatting
		const amox = DENTAL_PRESCRIPTION_DRUG_CATALOG.find((d) => d.id === "amoxicillin_500");
		assert.ok(amox);
		assert.equal(amox.latinRp, "Rp.: Amoxicillini 500 mg");
		assert.equal(amox.dispenseLatin, "D.t.d. N 20 in caps.");
		assert.ok(amox.signaRu.includes("500 мг"));

		// 15 days validity
		const p15 = generatePrescriptionPayloadFromSoap({
			clinic,
			patient,
			doctor,
			explicitDrugIds: ["amoxicillin_500"],
			validityDays: "15",
			ukepSignature: {
				...ukepSignature,
				qrVerificationUrl: "https://egisz.rosminzdrav.ru/verify?rx=REC-2026-999",
			},
		});
		const v15 = verifyPrescriptionStatutoryValidity(p15, "2026-08-23");
		assert.equal(v15.isValid, true);
		assert.equal(v15.validityDays, 15);
		const html15 = renderForm107_1uHtml(p15);
		assert.ok(html15.includes("Rp.: Amoxicillini 500 mg"));
		assert.ok(html15.includes("D.t.d. N 20 in caps."));
		assert.ok(html15.includes("15 дней"));
		assert.ok(html15.includes("ЕГИСЗ QR"));

		// 60 days validity (Standard)
		const p60 = generatePrescriptionPayloadFromSoap({
			clinic,
			patient,
			doctor,
			explicitDrugIds: ["amoxicillin_500", "nimesulide_100"],
			validityDays: "60",
			ukepSignature,
		});
		const v60 = verifyPrescriptionStatutoryValidity(p60, "2026-08-23");
		assert.equal(v60.isValid, true);
		assert.equal(v60.validityDays, 60);

		// 1 year validity (Chronic special care)
		const p365 = generatePrescriptionPayloadFromSoap({
			clinic,
			patient,
			doctor,
			explicitDrugIds: ["amoxicillin_500"],
			validityDays: "365",
			isChronicSpecialCare: true,
			chronicPeriodicity: "ежемесячно",
			ukepSignature,
		});
		const v365 = verifyPrescriptionStatutoryValidity(p365, "2026-08-23");
		assert.equal(v365.isValid, true);
		assert.equal(v365.validityDays, 365);
		const html365 = renderForm107_1uHtml(p365);
		assert.ok(html365.includes("По специальному назначению"));
	});
});

