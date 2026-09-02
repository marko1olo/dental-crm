import assert from "node:assert";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
	buildGenuineGostCmsPkcs7Der,
	createDemonstrationGostCmsSignature,
	validateCertificateStatus,
	validateGostCmsPkcs7Signature,
	type GeneratedDocument,
} from "@dental/shared";
import {
	renderDocumentHtml,
	resolveDocumentDigitalSignatureStamp,
} from "../../documents/renderDocument.js";
import { resolveSignatureForStorage } from "../../services/clinical/DiarySigningCeremonyService.js";

describe("Document UKEP / UNEP & GOST Digital Signature Rigor", () => {
	it("resolves dynamic blue stamp only when electronically signed", () => {
		const unsignedDoc = {
			id: "doc-1111-2222-3333",
			title: "Информированное добровольное согласие",
			kind: "informed_consent",
			status: "issued",
			createdAt: "2026-09-02T10:00:00.000Z",
			signatureAttestation: {
				mode: "paper_signed",
				signedAt: "2026-09-02T10:00:00.000Z",
				recipientFullName: "Иванов И.И.",
				recipientRole: "Пациент",
				staffFullName: "Сидорова С.С.",
				staffRole: "Врач",
			},
		} as unknown as GeneratedDocument;

		// Для бумажного подписания штамп ЭП не должен генерироваться
		const stampUnsigned = resolveDocumentDigitalSignatureStamp(unsignedDoc);
		assert.strictEqual(stampUnsigned, null);

		const signedDoc = {
			...unsignedDoc,
			signatureAttestation: {
				mode: "qualified_electronic_signature",
				signedAt: "2026-09-02T10:00:00.000Z",
				recipientFullName: "Иванов И.И.",
				recipientRole: "Пациент",
				staffFullName: "Сидорова С.С.",
				staffRole: "Врач",
			},
			doctorCertSerial: "00E4A28B104429A9",
			doctorCertSubject: "Сидорова С.С.",
		} as unknown as GeneratedDocument;

		// Для УКЭП штамп формируется строго по ГОСТ Р 7.0.97-2016
		const stampSigned = resolveDocumentDigitalSignatureStamp(signedDoc);
		assert.ok(stampSigned !== null);
		assert.ok(stampSigned?.includes("ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ"));
		assert.ok(stampSigned?.includes("00E4A28B104429A9"));
		assert.ok(stampSigned?.includes("Сидорова С.С."));
	});

	it("renderDocumentHtml does NOT contain static mock 'Сертификат / Владелец / Дата в МИС ДЕНТЕ'", () => {
		const doc = {
			id: "doc-sample-123",
			title: "Информированное добровольное согласие",
			kind: "informed_consent",
			status: "draft",
			createdAt: "2026-09-02T10:00:00.000Z",
		} as unknown as GeneratedDocument;

		const patient = {
			id: "patient-1",
			fullName: "Иванов Иван Иванович",
			birthDate: "1990-01-01",
		} as any;

		const html = renderDocumentHtml(doc, patient, {});

		// Статический макет-заглушка выжжен под корень
		assert.strictEqual(
			html.includes("Сертификат / Владелец / Дата в МИС ДЕНТЕ"),
			false,
			"Статическая заглушка МИС ДЕНТЕ обнаружена в HTML!",
		);
		assert.strictEqual(
			html.includes("ukep-digital-box"),
			false,
			"Заглушечный класс ukep-digital-box обнаружен в HTML!",
		);
	});

	it("resolveSignatureForStorage strictly rejects doctor PEP (PIN code) under 63-FZ and Order 947n", async () => {
		const res = await resolveSignatureForStorage({
			pkcs7Signature: "PIN:1234",
			userId: "user-1",
			organizationId: "org-1",
		});

		assert.strictEqual(res.ok, false);
		if (!res.ok) {
			assert.strictEqual(res.code, "PepDoctorForbidden");
			assert.ok(res.message.includes("63-ФЗ"));
			assert.ok(res.message.includes("947н"));
		}
	});

	it("validates genuine GOST CMS PKCS#7 container and rejects arbitrary strings", () => {
		const genuineSig = createDemonstrationGostCmsSignature({
			documentId: "doc-1",
			documentKind: "informed_consent",
			documentHashHex: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
			doctorFullName: "Смирнова Анна Викторовна",
		});

		const validRes = validateGostCmsPkcs7Signature(genuineSig.signatureBase64);
		assert.strictEqual(validRes.valid, true);

		// Произвольные строки запрещены
		const fakeRes1 = validateGostCmsPkcs7Signature("some arbitrary string");
		assert.strictEqual(fakeRes1.valid, false);

		const fakeRes2 = validateGostCmsPkcs7Signature("MIIB-test-signature-blob");
		assert.strictEqual(fakeRes2.valid, false);
	});

	it("strictly rejects expired and CRL-revoked certificates under 63-FZ", () => {
		const now = new Date("2026-09-02T12:00:00Z");

		// Просроченный сертификат отклоняется
		const expired = validateCertificateStatus({
			validFrom: "2023-01-01T00:00:00Z",
			validTo: "2024-01-01T00:00:00Z",
			referenceDate: now,
		});
		assert.strictEqual(expired.valid, false);
		assert.strictEqual(expired.errorCode, "CertificateExpired");
		assert.ok(expired.error?.includes("истек"));

		// Отозванный сертификат по списку отзыва CRL отклоняется
		const revoked = validateCertificateStatus({
			certificateSerialNumber: "00REVOKED00000001",
			validFrom: "2026-01-01T00:00:00Z",
			validTo: "2027-01-01T00:00:00Z",
			referenceDate: now,
		});
		assert.strictEqual(revoked.valid, false);
		assert.strictEqual(revoked.errorCode, "CertificateRevoked");
		assert.ok(revoked.error?.includes("CRL"));

		// Будущая дата подписания отклоняется
		const future = validateCertificateStatus({
			validFrom: "2026-01-01T00:00:00Z",
			validTo: "2027-01-01T00:00:00Z",
			signedAt: "2026-09-02T13:00:00Z",
			referenceDate: now,
		});
		assert.strictEqual(future.valid, false);
		assert.strictEqual(future.errorCode, "InvalidSigningTime");
	});

	it("detects 1-byte modification in signed document (Tamper Resistance / TamperDetected)", () => {
		// 1. Создаем исходный документ с суммой 10 000 руб
		const originalDocumentPayload = "Счет № 4092. Пациент: Иванов И.И. Сумма к оплате: 10000 руб. Услуга: Лечение пульпита";
		const originalHashHex = createHash("sha256").update(originalDocumentPayload, "utf8").digest("hex");

		// 2. Формируем отсоединенную подпись CMS (PKCS#7) по ГОСТ Р 34.10-2012
		const genuineSig = createDemonstrationGostCmsSignature({
			documentId: "doc-invoice-10000",
			documentKind: "invoice",
			documentHashHex: originalHashHex,
			doctorFullName: "Смирнова Елена Сергеевна",
		});

		// 3. Проверяем подлинность подписи с оригинальным хэшем — валидация успешна
		const originalValidation = validateGostCmsPkcs7Signature(
			genuineSig.signatureBase64,
			originalHashHex,
		);
		assert.strictEqual(originalValidation.valid, true);
		assert.strictEqual(originalValidation.tamperDetected, undefined);

		// 4. АТАКА МОДИФИКАЦИИ: злоумышленник меняет 1 байт в документе (10000 -> 01000 руб)
		const tamperedDocumentPayload = "Счет № 4092. Пациент: Иванов И.И. Сумма к оплате: 01000 руб. Услуга: Лечение пульпита";
		const tamperedHashHex = createHash("sha256").update(tamperedDocumentPayload, "utf8").digest("hex");

		// 5. Попытка верификации модифицированного документа с той же подписью
		const tamperedValidation = validateGostCmsPkcs7Signature(
			genuineSig.signatureBase64,
			tamperedHashHex,
		);

		// 6. Валидатор обязан категорически отказать с кодом TamperDetected
		assert.strictEqual(tamperedValidation.valid, false);
		assert.strictEqual(tamperedValidation.errorCode, "TamperDetected");
		assert.strictEqual(tamperedValidation.tamperDetected, true);
		assert.ok(
			tamperedValidation.error?.includes(
				"Хэш документа не совпадает с хэшем в электронной подписи",
			),
		);
	});

	it("detects modification of patient name in signed PDF snapshot", () => {
		const originalPdfBuffer = Buffer.from("%PDF-1.4 ... /Title (Информированное согласие) /Patient (Петров Алексей) ... %%EOF");
		const originalPdfHashHex = createHash("sha256").update(originalPdfBuffer).digest("hex");

		const sig = createDemonstrationGostCmsSignature({
			documentId: "doc-consent-petrov",
			documentKind: "informed_consent",
			documentHashHex: originalPdfHashHex,
			doctorFullName: "Иванов Иван Иванович",
		});

		// Подделываем 1 байт в теле PDF (Петров -> Сидоров)
		const modifiedPdfBuffer = Buffer.from("%PDF-1.4 ... /Title (Информированное согласие) /Patient (Сидоров Алексей) ... %%EOF");
		const modifiedPdfHashHex = createHash("sha256").update(modifiedPdfBuffer).digest("hex");

		const check = validateGostCmsPkcs7Signature(sig.signatureBase64, modifiedPdfHashHex);
		assert.strictEqual(check.valid, false);
		assert.strictEqual(check.errorCode, "TamperDetected");
		assert.strictEqual(check.tamperDetected, true);
	});

	it("strictly prevents Signature Replay Attack between different documents of the same patient", () => {
		const patientId = "patient-uuid-1111";

		// Документ 1: Информированное добровольное согласие
		const doc1Text = `ИДС на анестезию. Пациент: ${patientId}. Дата: 2026-09-02`;
		const doc1Hash = createHash("sha256").update(doc1Text).digest("hex");
		const sigDoc1 = createDemonstrationGostCmsSignature({
			documentId: "doc-consent-1",
			documentKind: "informed_consent",
			documentHashHex: doc1Hash,
			doctorFullName: "Смирнова Елена Сергеевна",
		});

		// Документ 2: План лечения того же пациента
		const doc2Text = `План лечения ортодонтии на 250000 руб. Пациент: ${patientId}. Дата: 2026-09-02`;
		const doc2Hash = createHash("sha256").update(doc2Text).digest("hex");

		// Попытка применить подпись sigDoc1 к doc2 (Replay Attack)
		const replayCheck = validateGostCmsPkcs7Signature(sigDoc1.signatureBase64, doc2Hash);
		assert.strictEqual(replayCheck.valid, false);
		assert.strictEqual(replayCheck.errorCode, "TamperDetected");
		assert.strictEqual(replayCheck.tamperDetected, true);
	});

	it("strictly prevents Signature Replay Attack between different patients", () => {
		// Документ пациента 1 (Смирнов А.А.)
		const patient1Doc = "Акт осмотра. Пациент: Смирнов А.А., СНИЛС 111-222-333 44. Диагноз: K02.1";
		const patient1Hash = createHash("sha256").update(patient1Doc).digest("hex");
		const sigPatient1 = createDemonstrationGostCmsSignature({
			documentId: "doc-smirnov",
			documentKind: "act",
			documentHashHex: patient1Hash,
			doctorFullName: "Иванов И.И.",
		});

		// Документ пациента 2 (Кузнецова М.В.)
		const patient2Doc = "Акт осмотра. Пациент: Кузнецова М.В., СНИЛС 555-666-777 88. Диагноз: K05.1";
		const patient2Hash = createHash("sha256").update(patient2Doc).digest("hex");

		// Попытка применить подпись пациента 1 к документу пациента 2 (Cross-Patient Replay Attack)
		const crossPatientReplay = validateGostCmsPkcs7Signature(sigPatient1.signatureBase64, patient2Hash);
		assert.strictEqual(crossPatientReplay.valid, false);
		assert.strictEqual(crossPatientReplay.errorCode, "TamperDetected");
		assert.strictEqual(crossPatientReplay.tamperDetected, true);
	});
});
