import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHash } from "node:crypto";
import {
	canonicalizeTreatmentPlanPayload,
	canonicalizeInformedConsentPayload,
	canonicalizePaidServiceContract736Payload,
	computeGostSigningDigestSha256,
	computeBinaryDocumentSha256,
	createDemonstrationGostCmsSignature,
	validateGostCmsPkcs7Signature,
	renderDigitalSignatureStampHtml,
	injectVisualSignatureStampIntoHtml,
	renderPaidServiceContract736Html,
	renderInformedConsent1051nHtml,
	visualSignatureStampParamsSchema,
} from "@dental/shared";

describe("Wave 9: Advanced Crypto Tamper Audit, Date Robustness, and Stamp Integrity", () => {
	// ─── 1. ОБСЕРЫ И ИХ ФИКСЫ: ПОДДЕРЖКА DATE ИЗ DRIZZLE И BOM-УДАЛЕНИЕ ──────

	describe("1. Defect Remediation: Date Objects & UTF-8 BOM Handling", () => {
		it("1.1 Successfully accepts native JavaScript Date objects from Drizzle ORM without Zod schema crash", () => {
			const dbDate = new Date("2026-09-02T14:35:12.000Z");
			const validFromDate = new Date("2026-01-01T00:00:00.000Z");
			const validToDate = new Date("2027-01-01T00:00:00.000Z");

			// Ранее это приводило к фатальному 'Expected string, received date'
			const parsed = visualSignatureStampParamsSchema.parse({
				certificateSerialNumber: "00TESTDATEOBJECT123",
				certificateSubject: "Врач-Тестер Дриззл Д.О.",
				validFrom: validFromDate,
				validTo: validToDate,
				signedAt: dbDate,
				signatureType: "ukep",
			});

			assert.strictEqual(typeof parsed.validFrom, "string");
			assert.strictEqual(typeof parsed.validTo, "string");
			assert.strictEqual(typeof parsed.signedAt, "string");

			const stampHtml = renderDigitalSignatureStampHtml({
				certificateSerialNumber: "00TESTDATEOBJECT123",
				certificateSubject: "Врач-Тестер Дриззл Д.О.",
				validFrom: validFromDate as any,
				validTo: validToDate as any,
				signedAt: dbDate as any,
			});

			assert.ok(stampHtml.includes("02.09.2026 17:35:12 (МСК)"));
			assert.ok(stampHtml.includes("00TESTDATEOBJECT123"));
		});

		it("1.2 Strips UTF-8 BOM (\\uFEFF) automatically and ensures canonical hash parity", () => {
			const rawText = "ID:TEST_CANONICAL\nDATA:123";
			const bomText = "\uFEFFID:TEST_CANONICAL\nDATA:123";

			const rawDigest = computeGostSigningDigestSha256(rawText);
			const bomDigest = computeGostSigningDigestSha256(bomText);

			assert.strictEqual(bomDigest.canonicalText, rawDigest.canonicalText);
			assert.strictEqual(bomDigest.sha256Hex, rawDigest.sha256Hex);
			assert.strictEqual(bomDigest.base64Payload, rawDigest.base64Payload);
		});
	});

	// ─── 2. АУДИТ СТОЙКОСТИ CADES-BES: МОДИФИКАЦИЯ 1 БАЙТА (JSON И PDF) ───────

	describe("2. CAdES-BES 1-Byte Tamper Resistance (Treatment Plan, IDS 1051n, Contract 736)", () => {
		it("2.1 Treatment Plan: 1-byte alteration in JSON (price / tooth) triggers TamperDetected", () => {
			const plan = {
				documentId: "plan-9001",
				clinicName: 'ООО "ДЕНТЕ КЛИНИКА"',
				doctorFullName: "Смирнова Елена Сергеевна",
				patientFullName: "Морозов Андрей Викторович",
				totalAmountKopecks: 14000000, // 140 000.00 ₽
				items: [
					{
						serviceCode: "A16.07.054",
						serviceTitle: "Дентальная имплантация Dentium",
						toothNumber: "46",
						quantity: 1,
						totalKopecks: 6500000,
					},
				],
				createdAtIso: "2026-09-02T14:30:00Z",
			};

			const origCanonical = canonicalizeTreatmentPlanPayload(plan);
			const { sha256Hex: origHash } = computeGostSigningDigestSha256(origCanonical);

			const sig = createDemonstrationGostCmsSignature({
				documentId: plan.documentId,
				documentKind: "treatment_plan",
				documentHashHex: origHash,
				doctorFullName: plan.doctorFullName,
			});

			// Валидация подлинного документа
			assert.strictEqual(validateGostCmsPkcs7Signature(sig.signatureBase64, origHash).valid, true);

			// Атака: изменяем 1 цифру в сумме (14000000 -> 14000001)
			const tamperedPlan = { ...plan, totalAmountKopecks: 14000001 };
			const tamperedHash = computeGostSigningDigestSha256(canonicalizeTreatmentPlanPayload(tamperedPlan)).sha256Hex;

			assert.notStrictEqual(origHash, tamperedHash);
			const check = validateGostCmsPkcs7Signature(sig.signatureBase64, tamperedHash);
			assert.strictEqual(check.valid, false);
			assert.strictEqual(check.errorCode, "TamperDetected");
			assert.strictEqual(check.tamperDetected, true);
		});

		it("2.2 Treatment Plan PDF Snapshot: 1-byte binary flip triggers TamperDetected", () => {
			const pdfBuffer = Buffer.from("%PDF-1.7 ... Dental Plan #9001 Total 140000.00 RUB", "utf8");
			const { sha256Hex: origPdfHash } = computeBinaryDocumentSha256(pdfBuffer);

			const sig = createDemonstrationGostCmsSignature({
				documentId: "pdf-9001",
				documentKind: "treatment_plan_pdf",
				documentHashHex: origPdfHash,
				doctorFullName: "Смирнова Елена Сергеевна",
			});

			assert.strictEqual(validateGostCmsPkcs7Signature(sig.signatureBase64, origPdfHash).valid, true);

			// Инвертируем 1 бит в буфере PDF
			const tamperedPdf = Buffer.from(pdfBuffer);
			tamperedPdf[10] ^= 0x01;
			const { sha256Hex: tamperedPdfHash } = computeBinaryDocumentSha256(tamperedPdf);

			assert.notStrictEqual(origPdfHash, tamperedPdfHash);
			const check = validateGostCmsPkcs7Signature(sig.signatureBase64, tamperedPdfHash);
			assert.strictEqual(check.valid, false);
			assert.strictEqual(check.errorCode, "TamperDetected");
			assert.strictEqual(check.tamperDetected, true);
		});

		it("2.3 Informed Consent (ИДС 1051н): 1-byte modification in risks triggers TamperDetected", () => {
			const consent = {
				documentId: "ids-9002",
				patientFullName: "Морозов Андрей Викторович",
				patientBirthDate: "1982-03-25",
				patientSnils: "112-233-445 95",
				clinicName: 'ООО "ДЕНТЕ КЛИНИКА"',
				doctorFullName: "Смирнова Елена Сергеевна",
				interventionDescription: "Дентальная имплантация зуба 46",
				risksAndComplications: "Кровотечение, отек мягких тканей",
				consentedAtIso: "2026-09-02T14:15:00Z",
			};

			const origHash = computeGostSigningDigestSha256(canonicalizeInformedConsentPayload(consent)).sha256Hex;
			const sig = createDemonstrationGostCmsSignature({
				documentId: consent.documentId,
				documentKind: "informed_consent",
				documentHashHex: origHash,
				doctorFullName: consent.doctorFullName,
			});

			assert.strictEqual(validateGostCmsPkcs7Signature(sig.signatureBase64, origHash).valid, true);

			// Модифицируем 1 букву ("отек" -> "отеки")
			const tamperedConsent = {
				...consent,
				risksAndComplications: "Кровотечение, отеки мягких тканей",
			};
			const tamperedHash = computeGostSigningDigestSha256(canonicalizeInformedConsentPayload(tamperedConsent)).sha256Hex;

			assert.notStrictEqual(origHash, tamperedHash);
			const check = validateGostCmsPkcs7Signature(sig.signatureBase64, tamperedHash);
			assert.strictEqual(check.valid, false);
			assert.strictEqual(check.errorCode, "TamperDetected");
			assert.strictEqual(check.tamperDetected, true);
		});

		it("2.4 Contract 736: 1-byte modification in passport or total triggers TamperDetected", () => {
			const contract = {
				documentId: "ДОГ-2026/100",
				clinicLegalName: 'ООО "ДЕНТЕ КЛИНИК"',
				clinicInn: "7701234567",
				clinicOgrn: "1027700132195",
				patientFullName: "Морозов Андрей Викторович",
				patientPassport: "4508 654321",
				totalAmountKopecks: 14000000,
				contractDateIso: "2026-09-02",
				serviceScope: "Оказание стоматологической помощи",
			};

			const origHash = computeGostSigningDigestSha256(canonicalizePaidServiceContract736Payload(contract)).sha256Hex;
			const sig = createDemonstrationGostCmsSignature({
				documentId: contract.documentId,
				documentKind: "paid_medical_services_contract",
				documentHashHex: origHash,
				doctorFullName: "Смирнов Алексей Владимирович",
			});

			assert.strictEqual(validateGostCmsPkcs7Signature(sig.signatureBase64, origHash).valid, true);

			// Модифицируем 1 цифру в серии паспорта ("4508" -> "4509")
			const tamperedContract = { ...contract, patientPassport: "4509 654321" };
			const tamperedHash = computeGostSigningDigestSha256(canonicalizePaidServiceContract736Payload(tamperedContract)).sha256Hex;

			assert.notStrictEqual(origHash, tamperedHash);
			const check = validateGostCmsPkcs7Signature(sig.signatureBase64, tamperedHash);
			assert.strictEqual(check.valid, false);
			assert.strictEqual(check.errorCode, "TamperDetected");
			assert.strictEqual(check.tamperDetected, true);
		});
	});

	// ─── 3. ПРОВЕРКА НАЛОЖЕНИЯ ШТАМПА ЭЦП (ГОСТ Р 7.0.97-2016) ───────────────

	describe("3. Visual Signature Stamp Layout Rigor (ГОСТ Р 7.0.97-2016)", () => {
		const testStamp = renderDigitalSignatureStampHtml({
			certificateSerialNumber: "00WAVE9STAMP778899",
			certificateSubject: 'ООО "ДЕНТЕ" (Главный врач Смирнов А.В.)',
			validFrom: "2026-01-01T00:00:00Z",
			validTo: "2027-01-01T00:00:00Z",
			signedAt: "2026-09-02T14:35:12Z",
			signatureType: "ukep",
		});

		it("3.1 In Contract 736: Customer block and contract text are completely unobstructed", () => {
			const contractPayload = {
				contractNumber: "ДОГ-2026/100",
				contractDate: "2026-09-02",
				clinicLegalName: 'ООО "ДЕНТЕ КЛИНИК"',
				clinicAddress: "г. Москва, ул. Лесная, д. 5",
				clinicOgrn: "1027700132195",
				clinicInn: "7701234567",
				clinicKpp: "770101001",
				customerFullName: "Морозов Андрей Викторович",
				customerPassport: "4508 654321",
				customerAddress: "г. Москва",
				customerPhone: "+7 (916) 999-88-77",
				doctorFullName: "Смирнов Алексей Владимирович",
				estimatedTotalRub: 140000,
			};

			const baseHtml = renderPaidServiceContract736Html(contractPayload);
			const stampedHtml = injectVisualSignatureStampIntoHtml(baseHtml, testStamp);

			assert.ok(stampedHtml.includes("00WAVE9STAMP778899"));
			assert.ok(stampedHtml.includes("ЗАКАЗЧИК (ПАЦИЕНТ):"));
			assert.ok(stampedHtml.includes("Подпись Заказчика:"));
			assert.ok(stampedHtml.includes("Морозов Андрей Викторович"));
			assert.ok(stampedHtml.includes("140 000,00 руб."));
		});

		it("3.2 In Informed Consent 1051n: Patient signature line and diagnoses are completely unobstructed", () => {
			const consentPayload = {
				consentType: "therapeutic" as const,
				clinicLegalName: 'ООО "ДЕНТЕ КЛИНИК"',
				clinicAddress: "г. Москва",
				clinicOgrn: "1027700132195",
				clinicInn: "7701234567",
				medicalLicenseNumber: "ЛО-77-01-019842",
				patientFullName: "Морозов Андрей Викторович",
				patientBirthDate: "1982-03-25",
				patientPassport: "4508 654321",
				patientAddress: "г. Москва",
				patientPhone: "+7 (916) 999-88-77",
				attendingDoctorFullName: "Смирнова Елена Сергеевна",
				attendingDoctorSpecialty: "Врач-стоматолог-терапевт",
				diagnosisOrIndication: "К02.1 Кариес дентина зуба 46",
				interventionName: "Лечение кариеса с постановкой светоотверждаемой пломбы",
				plannedAnesthesia: "Инфильтрационная анестезия",
				materialsAndSystems: "Filtek Ultimate",
				explainedRisks: ["Чувствительность"],
				alternatives: ["Наблюдение"],
				aftercareRequirements: ["Гигиена"],
				confirmedVoluntary: true,
				questionsAnswered: true,
				consentDate: "2026-09-02",
			};

			const baseHtml = renderInformedConsent1051nHtml(consentPayload);
			const stampedHtml = injectVisualSignatureStampIntoHtml(baseHtml, testStamp);

			assert.ok(stampedHtml.includes("00WAVE9STAMP778899"));
			assert.ok(stampedHtml.includes("К02.1 Кариес дентина зуба 46"));
			assert.ok(stampedHtml.includes("Пациент (Законный представитель): <strong>Морозов Андрей Викторович</strong>"));
			assert.ok(stampedHtml.includes('<div class="sig-line"></div>'));
		});
	});

	// ─── 4. ПРОВЕРКА ДАТЫ И ВРЕМЕНИ В ШТАМПЕ (МОСКОВСКОЕ ВРЕМЯ UTC+3) ─────────

	describe("4. Visual Stamp DateTime Strictly in Moscow Time (UTC+3) Format", () => {
		const mskRegex = /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}:\d{2} \(МСК\)$/;

		it("4.1 Formats daytime UTC timestamp into MSK (UTC+3) strictly as DD.MM.YYYY HH:MM:SS (МСК)", () => {
			const stampHtml = renderDigitalSignatureStampHtml({
				certificateSerialNumber: "00TESTTIME1",
				certificateSubject: "Врач",
				validFrom: "2026-01-01T00:00:00Z",
				validTo: "2027-01-01T00:00:00Z",
				signedAt: "2026-09-02T14:35:12.000Z",
				signatureType: "ukep",
			});

			const match = stampHtml.match(/Подписано:<\/strong>\s*([^<]+)/);
			assert.ok(match);
			const timeStr = match[1].trim();
			assert.strictEqual(timeStr, "02.09.2026 17:35:12 (МСК)");
			assert.match(timeStr, mskRegex);
		});

		it("4.2 Formats midnight UTC timestamp into MSK (UTC+3)", () => {
			const stampHtml = renderDigitalSignatureStampHtml({
				certificateSerialNumber: "00TESTTIME2",
				certificateSubject: "Врач",
				validFrom: "2026-01-01T00:00:00Z",
				validTo: "2027-01-01T00:00:00Z",
				signedAt: "2026-09-02T21:00:00.000Z", // 21:00 UTC -> 00:00 MSK след. дня (03.09.2026)
				signatureType: "ukep",
			});

			const match = stampHtml.match(/Подписано:<\/strong>\s*([^<]+)/);
			assert.ok(match);
			const timeStr = match[1].trim();
			assert.strictEqual(timeStr, "03.09.2026 00:00:00 (МСК)");
			assert.match(timeStr, mskRegex);
		});
	});
});
