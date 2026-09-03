import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHash } from "node:crypto";
import {
	canonicalizeTreatmentPlanPayload,
	canonicalizeInformedConsentPayload,
	canonicalizePaidServiceContract736Payload,
	computeGostSigningDigestSha256,
	createDemonstrationGostCmsSignature,
	validateGostCmsPkcs7Signature,
	renderDigitalSignatureStampHtml,
	injectVisualSignatureStampIntoHtml,
	renderPaidServiceContract736Html,
	renderInformedConsent1051nHtml,
} from "@dental/shared";

describe("Wave 8: Crypto Tamper Audit, CAdES-BES Invariants, and Stamp Layout Integrity", () => {
	// ─── 1. ТЕСТИРОВАНИЕ АУДИТА СТОЙКОСТИ CADES-BES: МОДИФИКАЦИЯ 1 БАЙТА ──────

	describe("1. CAdES-BES 1-Byte Tamper Resistance (Treatment Plan, IDS 1051n, Contract 736)", () => {
		it("1.1 Treatment Plan: 1-byte modification in JSON payload immediately triggers TamperDetected", () => {
			const originalPlan = {
				documentId: "plan-8001",
				clinicName: 'ООО "Стоматологическая клиника ДЕНТЕ"',
				doctorFullName: "Смирнова Елена Сергеевна",
				patientFullName: "Морозов Андрей Викторович",
				totalAmountKopecks: 14000000, // 140 000.00 ₽
				items: [
					{
						serviceCode: "A16.07.054",
						serviceTitle: "Дентальная имплантация Dentium SuperLine",
						toothNumber: "46",
						quantity: 1,
						totalKopecks: 6500000,
					},
					{
						serviceCode: "A16.07.023",
						serviceTitle: "Коронка из диоксида циркония на титановом абатменте",
						toothNumber: "46",
						quantity: 1,
						totalKopecks: 7500000,
					},
				],
				createdAtIso: "2026-09-02T14:30:00Z",
			};

			const originalCanonical = canonicalizeTreatmentPlanPayload(originalPlan);
			const { sha256Hex: origHash } = computeGostSigningDigestSha256(originalCanonical);

			const doctorSig = createDemonstrationGostCmsSignature({
				documentId: originalPlan.documentId,
				documentKind: "treatment_plan",
				documentHashHex: origHash,
				doctorFullName: originalPlan.doctorFullName,
			});

			// Исходный документ валиден
			const initialCheck = validateGostCmsPkcs7Signature(doctorSig.signatureBase64, origHash);
			assert.strictEqual(initialCheck.valid, true, "Исходный план лечения обязан проходить валидацию");

			// АТАКА 1 БАЙТ: изменяем 1 цифру в сумме (14000000 -> 14000001 коп)
			const tamperedPlan = {
				...originalPlan,
				totalAmountKopecks: 14000001,
			};
			const tamperedCanonical = canonicalizeTreatmentPlanPayload(tamperedPlan);
			const { sha256Hex: tamperedHash } = computeGostSigningDigestSha256(tamperedCanonical);

			assert.notStrictEqual(origHash, tamperedHash, "Хэши обязаны различаться при изменении 1 байта");

			const attackResult = validateGostCmsPkcs7Signature(doctorSig.signatureBase64, tamperedHash);
			assert.strictEqual(attackResult.valid, false);
			assert.strictEqual(attackResult.errorCode, "TamperDetected");
			assert.strictEqual(attackResult.tamperDetected, true);
		});

		it("1.2 Treatment Plan: 1-byte modification in rendered PDF/HTML snapshot triggers TamperDetected", () => {
			const fakePdfBuffer = Buffer.from("%PDF-1.7 ... Dental Treatment Plan Doc #8001 Total: 140000.00 RUB", "utf8");
			const origHash = createHash("sha256").update(fakePdfBuffer).digest("hex");

			const doctorSig = createDemonstrationGostCmsSignature({
				documentId: "pdf-plan-8001",
				documentKind: "treatment_plan_pdf",
				documentHashHex: origHash,
				doctorFullName: "Смирнова Елена Сергеевна",
			});

			// Исходный PDF валиден
			assert.strictEqual(validateGostCmsPkcs7Signature(doctorSig.signatureBase64, origHash).valid, true);

			// АТАКА 1 БАЙТ НА БИНАРНЫЙ PDF: инвертируем один бит в байте
			const tamperedPdfBuffer = Buffer.from(fakePdfBuffer);
			tamperedPdfBuffer[15] ^= 0x01; // переворачиваем 1 бит

			const tamperedHash = createHash("sha256").update(tamperedPdfBuffer).digest("hex");
			assert.notStrictEqual(origHash, tamperedHash);

			const attackResult = validateGostCmsPkcs7Signature(doctorSig.signatureBase64, tamperedHash);
			assert.strictEqual(attackResult.valid, false);
			assert.strictEqual(attackResult.errorCode, "TamperDetected");
			assert.strictEqual(attackResult.tamperDetected, true);
		});

		it("1.3 Informed Consent (ИДС 1051н): 1-byte modification in clinical risks triggers TamperDetected", () => {
			const originalConsent = {
				documentId: "ids-8002",
				patientFullName: "Морозов Андрей Викторович",
				patientBirthDate: "1982-03-25",
				patientSnils: "112-233-445 95",
				clinicName: 'ООО "Стоматологическая клиника ДЕНТЕ"',
				doctorFullName: "Смирнова Елена Сергеевна",
				interventionDescription: "Дентальная имплантация в области отсутствующего зуба 46.",
				risksAndComplications: "Кровотечение, отек мягких тканей, временная парестезия нижнеальвеолярного нерва.",
				consentedAtIso: "2026-09-02T14:15:00Z",
			};

			const origCanonical = canonicalizeInformedConsentPayload(originalConsent);
			const { sha256Hex: origHash } = computeGostSigningDigestSha256(origCanonical);

			const doctorSig = createDemonstrationGostCmsSignature({
				documentId: originalConsent.documentId,
				documentKind: "informed_consent",
				documentHashHex: origHash,
				doctorFullName: originalConsent.doctorFullName,
			});

			// Валидация оригинального ИДС
			assert.strictEqual(validateGostCmsPkcs7Signature(doctorSig.signatureBase64, origHash).valid, true);

			// АТАКА 1 БАЙТ: заменяем точку на восклицательный знак в рисках
			const tamperedConsent = {
				...originalConsent,
				risksAndComplications: originalConsent.risksAndComplications.slice(0, -1) + "!",
			};
			const tamperedCanonical = canonicalizeInformedConsentPayload(tamperedConsent);
			const { sha256Hex: tamperedHash } = computeGostSigningDigestSha256(tamperedCanonical);

			assert.notStrictEqual(origHash, tamperedHash);

			const attackResult = validateGostCmsPkcs7Signature(doctorSig.signatureBase64, tamperedHash);
			assert.strictEqual(attackResult.valid, false);
			assert.strictEqual(attackResult.errorCode, "TamperDetected");
			assert.strictEqual(attackResult.tamperDetected, true);
		});

		it("1.4 Paid Medical Services Contract (Договор 736): 1-byte modification in total or passport triggers TamperDetected", () => {
			const originalContract = {
				documentId: "ДОГ-2026/099",
				clinicLegalName: 'ООО "ДЕНТЕ КЛИНИК"',
				clinicInn: "7701234567",
				clinicOgrn: "1027700132195",
				patientFullName: "Петров Петр Петрович",
				patientPassport: "4508 123456",
				totalAmountKopecks: 15000000, // 150 000.00 ₽
				contractDateIso: "2026-09-02",
				serviceScope: "Оказание специализированной стоматологической помощи",
			};

			const origCanonical = canonicalizePaidServiceContract736Payload(originalContract);
			const { sha256Hex: origHash } = computeGostSigningDigestSha256(origCanonical);

			const directorSig = createDemonstrationGostCmsSignature({
				documentId: originalContract.documentId,
				documentKind: "paid_medical_services_contract",
				documentHashHex: origHash,
				doctorFullName: "Смирнов Алексей Владимирович",
			});

			assert.strictEqual(validateGostCmsPkcs7Signature(directorSig.signatureBase64, origHash).valid, true);

			// АТАКА 1 БАЙТ: изменение 1 цифры в номере паспорта ("4508 123456" -> "4508 123457")
			const tamperedContract = {
				...originalContract,
				patientPassport: "4508 123457",
			};
			const tamperedCanonical = canonicalizePaidServiceContract736Payload(tamperedContract);
			const { sha256Hex: tamperedHash } = computeGostSigningDigestSha256(tamperedCanonical);

			assert.notStrictEqual(origHash, tamperedHash);

			const attackResult = validateGostCmsPkcs7Signature(directorSig.signatureBase64, tamperedHash);
			assert.strictEqual(attackResult.valid, false);
			assert.strictEqual(attackResult.errorCode, "TamperDetected");
			assert.strictEqual(attackResult.tamperDetected, true);
		});
	});

	// ─── 2. ТЕСТИРОВАНИЕ НАЛОЖЕНИЯ ШТАМПА ЭЦП (БЕЗ ПЕРЕКРЫТИЯ ДАННЫХ) ─────────

	describe("2. Visual Signature Stamp Layout Rigor (ГОСТ Р 7.0.97-2016)", () => {
		const mockStamp = renderDigitalSignatureStampHtml({
			certificateSerialNumber: "00E4A28B10277001321958240001",
			certificateSubject: 'ООО "Стоматологическая клиника ДЕНТЕ" (Врач Смирнова Е.С.)',
			certificateIssuer: "Головной УЦ Минцифры России (ГОСТ Р 34.10-2012)",
			validFrom: "2026-01-15T00:00:00Z",
			validTo: "2027-04-15T00:00:00Z",
			signedAt: "2026-09-02T14:35:12Z",
			signatureType: "ukep",
		});

		it("2.1 Stamp does NOT overlap or corrupt Patient Signature line in Informed Consent (ИДС 1051н)", () => {
			const consentPayload = {
				consentType: "implantation_bone_graft" as const,
				clinicLegalName: 'ООО "ДЕНТЕ КЛИНИКА"',
				clinicAddress: "г. Москва, ул. Лесная, д. 5",
				clinicOgrn: "1127746000000",
				clinicInn: "7701000000",
				medicalLicenseNumber: "ЛО41-01137-77/00368421",
				patientFullName: "Сидоров Алексей Михайлович",
				patientBirthDate: "1992-03-21",
				patientPassport: "4512 889900",
				patientAddress: "г. Москва",
				patientPhone: "+7 (999) 111-22-33",
				attendingDoctorFullName: "Иванов Иван Иванович",
				attendingDoctorSpecialty: "Врач-стоматолог-хирург-имплантолог",
				diagnosisOrIndication: "Частичная вторичная адентия верхней челюсти (К08.1, зубы 1.4, 1.6)",
				interventionName: "Дентальная имплантация в области зубов 1.4, 1.6",
				plannedAnesthesia: "Инфильтрационная анестезия (Артикаин 4%)",
				materialsAndSystems: "Имплантаты Straumann SLActive, остеопластический материал Bio-Oss",
				explainedRisks: ["Отек мягких тканей", "Гематома", "Послеоперационная болезненность"],
				alternatives: ["Съемное протезирование", "Мостовидный протез"],
				aftercareRequirements: ["Прием антибиотиков", "Холод локально", "Щадящая диета 7 дней"],
				confirmedVoluntary: true,
				questionsAnswered: true,
				consentDate: "2026-09-02",
			};

			const baseHtml = renderInformedConsent1051nHtml(consentPayload);
			const stampedHtml = injectVisualSignatureStampIntoHtml(baseHtml, mockStamp);

			// 1. Штамп нанесен
			assert.ok(stampedHtml.includes("BEGIN_GOST_SIGNATURE_STAMP"));
			assert.ok(stampedHtml.includes("00E4A28B10277001321958240001"));

			// 2. Строка подписи пациента НЕ затерта и присутствует в неизменном виде
			assert.ok(stampedHtml.includes("Пациент (Законный представитель): <strong>Сидоров Алексей Михайлович</strong>"));
			assert.ok(stampedHtml.includes('<div class="sig-line"></div>'));

			// 3. Диагноз и номера зубов НЕ повреждены
			assert.ok(stampedHtml.includes("К08.1, зубы 1.4, 1.6"));
			assert.ok(stampedHtml.includes("Дентальная имплантация в области зубов 1.4, 1.6"));
		});

		it("2.2 Stamp does NOT overlap customer block or contract terms in Contract 736", () => {
			const contractPayload = {
				contractNumber: "ДОГ-2026/099",
				contractDate: "2026-09-02",
				clinicLegalName: 'ООО "ДЕНТЕ КЛИНИК"',
				clinicAddress: "г. Москва, ул. Арбат, д. 20",
				clinicOgrn: "1027700132195",
				clinicInn: "7701234567",
				clinicKpp: "770101001",
				customerFullName: "Петров Петр Петрович",
				customerPassport: "4508 123456",
				customerAddress: "г. Москва",
				customerPhone: "+7 (999) 777-88-99",
				doctorFullName: "Смирнов Алексей Владимирович",
				estimatedTotalAmountRub: 150000,
			};

			const baseHtml = renderPaidServiceContract736Html(contractPayload);
			const stampedHtml = injectVisualSignatureStampIntoHtml(baseHtml, mockStamp);

			// 1. Штамп нанесен
			assert.ok(stampedHtml.includes("BEGIN_GOST_SIGNATURE_STAMP"));

			// 2. Блок Заказчика (Пациента) не затерт
			assert.ok(stampedHtml.includes("ЗАКАЗЧИК (ПАЦИЕНТ):"));
			assert.ok(stampedHtml.includes("Петров Петр Петрович"));
			assert.ok(stampedHtml.includes("Подпись Заказчика:"));

			// 3. Стоимость договора сохранена
			assert.ok(stampedHtml.includes("150 000,00 руб."));
		});
	});

	// ─── 3. ТЕСТИРОВАНИЕ ДАТЫ И ВРЕМЕНИ В ШТАМПЕ (МОСКОВСКОЕ ВРЕМЯ UTC+3) ─────

	describe("3. Visual Stamp Date and Time Strictly in Moscow Time (UTC+3) Format", () => {
		const mskRegex = /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}:\d{2} \(МСК\)$/;

		it("3.1 Formats daytime UTC timestamp correctly into MSK (UTC+3) without comma", () => {
			const stampHtml = renderDigitalSignatureStampHtml({
				certificateSerialNumber: "00TEST11223344",
				certificateSubject: "Тестовый Врач",
				validFrom: "2026-01-01T00:00:00Z",
				validTo: "2027-01-01T00:00:00Z",
				signedAt: "2026-09-02T14:35:12.000Z", // 14:35:12 UTC -> 17:35:12 MSK
				signatureType: "ukep",
			});

			assert.ok(stampHtml.includes("02.09.2026 17:35:12 (МСК)"));
			assert.strictEqual(stampHtml.includes("02.09.2026, 17:35:12"), false, "Запятая между датой и временем недопустима");

			// Извлекаем строку времени из HTML
			const match = stampHtml.match(/Подписано:<\/strong>\s*([^<]+)/);
			assert.ok(match, "Блок 'Подписано' обязан присутствовать в штампе");
			const timeStr = match[1].trim();
			assert.strictEqual(timeStr, "02.09.2026 17:35:12 (МСК)");
			assert.match(timeStr, mskRegex);
		});

		it("3.2 Correctly handles New Year date rollover across UTC and MSK boundary (21:00 UTC -> 00:00 MSK)", () => {
			const stampHtml = renderDigitalSignatureStampHtml({
				certificateSerialNumber: "00TEST99887766",
				certificateSubject: "Тестовый Врач Нового Года",
				validFrom: "2026-01-01T00:00:00Z",
				validTo: "2027-12-31T23:59:59Z",
				signedAt: "2026-12-31T21:15:30.000Z", // 31 декабря 21:15 UTC -> 1 января 00:15 MSK!
				signatureType: "ukep",
			});

			assert.ok(stampHtml.includes("01.01.2027 00:15:30 (МСК)"));
			const match = stampHtml.match(/Подписано:<\/strong>\s*([^<]+)/);
			assert.ok(match);
			const timeStr = match[1].trim();
			assert.strictEqual(timeStr, "01.01.2027 00:15:30 (МСК)");
			assert.match(timeStr, mskRegex);
		});

		it("3.3 Zero-pads single-digit hours, minutes, seconds and days", () => {
			const stampHtml = renderDigitalSignatureStampHtml({
				certificateSerialNumber: "00TEST55443322",
				certificateSubject: "Тестовый Врач Паддинга",
				validFrom: "2026-01-01T00:00:00Z",
				validTo: "2027-01-01T00:00:00Z",
				signedAt: "2026-06-05T06:07:08.000Z", // 06:07:08 UTC -> 09:07:08 MSK
				signatureType: "ukep",
			});

			assert.ok(stampHtml.includes("05.06.2026 09:07:08 (МСК)"));
			const match = stampHtml.match(/Подписано:<\/strong>\s*([^<]+)/);
			assert.ok(match);
			const timeStr = match[1].trim();
			assert.strictEqual(timeStr, "05.06.2026 09:07:08 (МСК)");
			assert.match(timeStr, mskRegex);
		});
	});
});
