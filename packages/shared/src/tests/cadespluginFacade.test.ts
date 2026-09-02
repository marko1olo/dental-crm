import assert from "node:assert";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
	buildGenuineGostCmsPkcs7Der,
	canonicalizeDiary043uPayload,
	canonicalizeInformedConsentPayload,
	canonicalizeTreatmentPlanPayload,
	computeGostSigningDigestSha256,
	createDemonstrationGostCmsSignature,
	DOCTOR_PEP_FORBIDDEN_MESSAGE,
	GOST_CRYPTO_OIDS,
	injectVisualSignatureStampIntoHtml,
	renderDigitalSignatureStampHtml,
	validateCertificateStatus,
	validateDoctorSignatureStatutoryMode,
	validateGostCmsPkcs7Signature,
} from "../crypto/index.js";

describe("cadesplugin Architecture Facade & GOST R 34.10-2012 CMS PKCS#7", () => {
	it("rejects doctor PEP (PIN/SMS) under 63-FZ and Minzdrav Order 947n", () => {
		const resSimple = validateDoctorSignatureStatutoryMode("simple_electronic_signature");
		assert.strictEqual(resSimple.valid, false);
		assert.strictEqual(resSimple.error, DOCTOR_PEP_FORBIDDEN_MESSAGE);

		const resPep = validateDoctorSignatureStatutoryMode("pep");
		assert.strictEqual(resPep.valid, false);
		assert.strictEqual(resPep.error, DOCTOR_PEP_FORBIDDEN_MESSAGE);

		const resPin = validateDoctorSignatureStatutoryMode("pin:1234");
		assert.strictEqual(resPin.valid, false);

		// УНЭП и УКЭП разрешены
		const resUkep = validateDoctorSignatureStatutoryMode("qualified_electronic_signature");
		assert.strictEqual(resUkep.valid, true);

		const resUnep = validateDoctorSignatureStatutoryMode(
			"enhanced_non_qualified_electronic_signature",
		);
		assert.strictEqual(resUnep.valid, true);
	});

	it("computes deterministic canonical text and SHA-256 digest for informed consent", () => {
		const canonical = canonicalizeInformedConsentPayload({
			documentId: "doc-101",
			patientFullName: "Иванов Иван Иванович",
			patientBirthDate: "1985-05-12",
			patientSnils: "123-456-789 00",
			clinicName: "ООО ДЕНТЕ",
			doctorFullName: "Смирнова Анна Викторовна",
			interventionDescription: "Удаление зуба 38 по неотложным показаниям",
			risksAndComplications: "Альвеолит, парестезия нижнелуночкового нерва",
			consentedAtIso: "2026-09-02T10:00:00.000Z",
		});

		assert.ok(canonical.includes("ID:1051N_INFORMED_CONSENT"));
		assert.ok(canonical.includes("DOC_ID:doc-101"));

		const digest = computeGostSigningDigestSha256(canonical);
		assert.strictEqual(digest.sha256Hex.length, 64);
		assert.ok(digest.base64Payload.length > 20);
	});

	it("computes deterministic canonical text for treatment plans and diaries 043/u", () => {
		const planText = canonicalizeTreatmentPlanPayload({
			documentId: "plan-500",
			patientFullName: "Петров Петр Петрович",
			clinicName: "ООО ДЕНТЕ",
			doctorFullName: "Врач Тестовый",
			totalAmountKopecks: 1500000,
			items: [
				{
					serviceCode: "A16.07.002",
					serviceTitle: "Восстановление зуба пломбой",
					toothNumber: "16",
					quantity: 1,
					totalKopecks: 1500000,
				},
			],
			createdAtIso: "2026-09-02T12:00:00.000Z",
		});
		assert.ok(planText.includes("ID:TREATMENT_PLAN_CANONICAL_V1"));
		assert.ok(planText.includes("A16.07.002|Восстановление зуба пломбой|16|1|1500000"));

		const diaryText = canonicalizeDiary043uPayload({
			visitId: "visit-1",
			patientId: "patient-1",
			anamnesis: "Жалобы на боли в 26",
			statusLocalis: "Кариозная полость МОД",
			treatmentDescription: "Препарирование, пломбирование",
			diagnosisIcd10: "K02.1",
			diagnosisTooth: "26",
		});
		assert.strictEqual(
			diaryText,
			"visit-1|patient-1|Жалобы на боли в 26|Кариозная полость МОД|Препарирование, пломбирование|K02.1|26|||",
		);
	});

	it("builds genuine ASN.1 DER CMS PKCS#7 container and validates it", () => {
		const docHash = "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0";
		const der = buildGenuineGostCmsPkcs7Der({
			documentHashSha256Hex: docHash,
			doctorFullName: "Смирнова Анна Викторовна",
			certificateSerialNumber: "00E4A28B104429A9",
			validFromIso: "2026-01-01",
			validToIso: "2027-01-01",
		});

		assert.ok(der.length >= 64);
		assert.strictEqual(der[0], 0x30); // SEQUENCE tag

		const base64Sig = der.toString("base64");
		const validation = validateGostCmsPkcs7Signature(base64Sig);
		assert.strictEqual(validation.valid, true);
		assert.strictEqual(validation.details?.format, "CMS_PKCS7_DETACHED_CADES_BES");
		assert.strictEqual(validation.details?.hasSignedDataOid, true);
		assert.strictEqual(validation.details?.hasGostOid, true);
	});

	it("rejects arbitrary strings, plain text and malformed signatures", () => {
		// Произвольная строка
		const res1 = validateGostCmsPkcs7Signature("plain string signature");
		assert.strictEqual(res1.valid, false);
		assert.ok(res1.error && res1.error.length > 0);

		// Произвольный Base64
		const fakeBase64 = Buffer.from("arbitrary data that is not asn1 sequence").toString("base64");
		const res2 = validateGostCmsPkcs7Signature(fakeBase64);
		assert.strictEqual(res2.valid, false);

		// Пустая строка
		const res3 = validateGostCmsPkcs7Signature("");
		assert.strictEqual(res3.valid, false);
	});

	it("renders GOST R 7.0.97-2016 visual blue signature stamp and injects it into HTML", () => {
		const stampHtml = renderDigitalSignatureStampHtml({
			certificateSerialNumber: "00E4A28B104429A9",
			certificateSubject: "Смирнова Анна Викторовна",
			certificateIssuer: "Головной УЦ Минцифры России",
			validFrom: "2026-01-01T00:00:00Z",
			validTo: "2027-01-01T00:00:00Z",
			signatureType: "ukep",
		});

		assert.ok(stampHtml.includes("ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ"));
		assert.ok(stampHtml.includes("00E4A28B104429A9"));
		assert.ok(stampHtml.includes("Смирнова Анна Викторовна"));
		assert.ok(stampHtml.includes("#003399"));

		const sampleDocHtml = `
      <div class="document">
        <h1>Договор об оказании платных медицинских услуг</h1>
        <div class="signatures">
          <section class="signature-column signature-left">
            <p>Пациент</p>
            <p class="signature-line">Подпись: _______</p>
          </section>
          <section class="signature-column signature-right">
            <p class="signature-role"><strong>Врач</strong></p>
            <p class="signature-line">Подпись: _______</p>
            <p class="signature-stamps"><span class="stamp-seal-circle">М.П.</span></p>
          </section>
        </div>
      </div>
    `;

		const injected = injectVisualSignatureStampIntoHtml(sampleDocHtml, stampHtml);
		assert.ok(injected.includes("gost-digital-stamp"));
		assert.ok(injected.includes("00E4A28B104429A9"));
		assert.ok(!injected.includes("stamp-seal-circle")); // Бумажная печать М.П. замещена официальным синим штампом
	});

	it("validates certificate status: rejects expired certificates, future signing dates, and revoked CRL serials", () => {
		const now = new Date("2026-09-02T12:00:00Z");

		// 1. Просроченный сертификат
		const expRes = validateCertificateStatus({
			validFrom: "2024-01-01T00:00:00Z",
			validTo: "2025-01-01T00:00:00Z",
			referenceDate: now,
		});
		assert.strictEqual(expRes.valid, false);
		assert.strictEqual(expRes.errorCode, "CertificateExpired");
		assert.ok(expRes.error?.includes("истек"));

		// 2. Сертификат еще не вступил в силу
		const notYetRes = validateCertificateStatus({
			validFrom: "2027-01-01T00:00:00Z",
			validTo: "2028-01-01T00:00:00Z",
			referenceDate: now,
		});
		assert.strictEqual(notYetRes.valid, false);
		assert.strictEqual(notYetRes.errorCode, "CertificateNotYetValid");

		// 3. Дата подписания в будущем
		const futureRes = validateCertificateStatus({
			validFrom: "2026-01-01T00:00:00Z",
			validTo: "2027-01-01T00:00:00Z",
			signedAt: "2026-09-02T12:15:00Z", // +15 минут
			referenceDate: now,
		});
		assert.strictEqual(futureRes.valid, false);
		assert.strictEqual(futureRes.errorCode, "InvalidSigningTime");

		// 4. Отозванный сертификат по списку отзыва (CRL)
		const crlRes = validateCertificateStatus({
			certificateSerialNumber: "00REVOKED00000001",
			validFrom: "2026-01-01T00:00:00Z",
			validTo: "2027-01-01T00:00:00Z",
			referenceDate: now,
		});
		assert.strictEqual(crlRes.valid, false);
		assert.strictEqual(crlRes.errorCode, "CertificateRevoked");
		assert.ok(crlRes.error?.includes("CRL"));

		// 5. Валидный сертификат
		const validRes = validateCertificateStatus({
			certificateSerialNumber: "00E4A28B104429A9",
			validFrom: "2026-01-01T00:00:00Z",
			validTo: "2027-01-01T00:00:00Z",
			signedAt: "2026-09-02T12:00:00Z",
			referenceDate: now,
		});
		assert.strictEqual(validRes.valid, true);
	});

	it("strictly detects document modification (Tamper Resistance) via validateGostCmsPkcs7Signature", () => {
		const originalText = "Акт выполненных стоматологических работ № 789. Установка имплантата Straumann. Стоимость: 85000 руб.";
		const originalHash = createHash("sha256").update(originalText, "utf8").digest("hex");

		const sigContainer = createDemonstrationGostCmsSignature({
			documentId: "doc-act-789",
			documentKind: "completion_act",
			documentHashHex: originalHash,
			doctorFullName: "Ковалев Дмитрий Игоревич",
		});

		// 1. С оригинальным хэшем подпись валидна
		const validCheck = validateGostCmsPkcs7Signature(sigContainer.signatureBase64, originalHash);
		assert.strictEqual(validCheck.valid, true);

		// 2. Модификация 1 символа (85000 -> 35000 руб)
		const modifiedText = "Акт выполненных стоматологических работ № 789. Установка имплантата Straumann. Стоимость: 35000 руб.";
		const modifiedHash = createHash("sha256").update(modifiedText, "utf8").digest("hex");

		const tamperedCheck = validateGostCmsPkcs7Signature(sigContainer.signatureBase64, modifiedHash);
		assert.strictEqual(tamperedCheck.valid, false);
		assert.strictEqual(tamperedCheck.errorCode, "TamperDetected");
		assert.strictEqual(tamperedCheck.tamperDetected, true);
		assert.ok(tamperedCheck.error?.includes("Хэш документа не совпадает с хэшем в электронной подписи"));
	});
});
