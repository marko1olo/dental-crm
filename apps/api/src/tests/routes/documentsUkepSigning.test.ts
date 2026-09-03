import assert from "node:assert";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
	buildGenuineGostCmsPkcs7Der,
	createDemonstrationGostCmsSignature,
	injectVisualSignatureStampIntoHtml,
	renderDigitalSignatureStampHtml,
	renderForm043uHtml,
	renderInformedConsent1051nHtml,
	renderPaidServiceContract736Html,
	validateCertificateStatus,
	validateGostCmsPkcs7Signature,
	type GeneratedDocument,
} from "@dental/shared";
import {
	renderDocumentHtml,
	resolveDocumentDigitalSignatureStamp,
} from "../../documents/renderDocument.js";
import { applySignatureStampIfSigned } from "../../routes/documents/shared.js";
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

	it("detects dental arch state tampering in signed treatment plan (46 implant -> caries yields TamperDetected)", () => {
		const treatmentPlanDoc = {
			id: "doc-tp-46-test",
			title: "Клинический план стоматологического лечения",
			kind: "treatment_plan" as const,
			status: "issued" as const,
			payload: {
				treatmentPlan: {
					clinicalReason: "Разрушение зуба 46",
					diagnosisSummary: "К08.1 Потеря зубов (46)",
					teethOrArea: "Зуб 46",
					estimatedTotalRub: 185000,
					clinicalToothRows: [
						{
							toothOrArea: "46",
							surfaces: ["occlusal" as const],
							status: "implant" as const, // Исходно: имплантат
							diagnosisOrFinding: "К08.1 Адентия",
							indication: "Имплантация",
							plannedAction: "Dentium SuperLine",
							prognosis: "Благоприятный",
							periodontalStatus: "Норма",
							implantOrProstheticNotes: "4.5x10 мм",
							orthodonticNotes: "Норма",
						},
					],
					treatmentGoals: ["Имплантация 46"],
					plannedStages: [
						{
							stageName: "Хирургия",
							plannedServices: "Установка имплантата",
							plannedTiming: "1 визит",
							estimatedAmountRub: 65000,
						},
					],
					alternatives: [],
					risksAndLimitations: [],
				},
			},
		};

		const patient = {
			id: "p-volkov",
			fullName: "Волков Сергей Петрович",
			birthDate: "1985-05-15",
			phone: "+79169998877",
		};

		const context = {
			clinicProfile: {
				organizationId: "org-1",
				clinicName: "Клиника DENTE",
				legalName: "ООО ДЕНТЕ",
				inn: "7701234567",
				ogrn: "1027700132195",
				chiefDoctor: "Смирнова Елена Сергеевна",
			},
		};

		// 1. Формируем легитимный документ и хэш
		const originalHtml = renderDocumentHtml(treatmentPlanDoc as any, patient as any, context as any);
		const originalHash = createHash("sha256").update(originalHtml, "utf8").digest("hex");

		const genuineSig = createDemonstrationGostCmsSignature({
			documentId: treatmentPlanDoc.id,
			documentKind: "treatment_plan",
			documentHashHex: originalHash,
			doctorFullName: "Смирнова Елена Сергеевна",
		});

		// 2. С оригинальным хэшем подпись валидна
		const validRes = validateGostCmsPkcs7Signature(genuineSig.signatureBase64, originalHash);
		assert.strictEqual(validRes.valid, true);

		// 3. АТАКА НА ЗУБНУЮ ФОРМУЛУ: подмена статуса зуба 46 с "имплантат" на "кариес"
		const tamperedHtml = originalHtml.replace("имплантат", "кариес");
		assert.notStrictEqual(originalHtml, tamperedHtml, "Подмена в HTML должна состояться");

		const tamperedHash = createHash("sha256").update(tamperedHtml, "utf8").digest("hex");
		assert.notStrictEqual(originalHash, tamperedHash, "Хэши обязаны отличаться");

		// 4. Верификация модифицированного документа обязана зафиксировать TamperDetected
		const tamperCheck = validateGostCmsPkcs7Signature(genuineSig.signatureBase64, tamperedHash);
		assert.strictEqual(tamperCheck.valid, false);
		assert.strictEqual(tamperCheck.errorCode, "TamperDetected");
		assert.strictEqual(tamperCheck.tamperDetected, true);
		assert.ok(tamperCheck.error?.includes("Хэш документа не совпадает с хэшем в электронной подписи"));
	});

	it("applies GOST R 7.0.97-2016 visual blue signature stamp to Informed Consent (ИДС 1051н) without corrupting patient signature line", () => {
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
			diagnosisOrIndication: "Частичная вторичная адентия верхней челюсти (К08.1)",
			interventionName: "Дентальная имплантация в области зубов 1.4, 1.6",
			plannedAnesthesia: "Инфильтрационная и проводниковая анестезия (Артикаин 4%)",
			materialsAndSystems: "Имплантаты Straumann SLActive, остеопластический материал Bio-Oss",
			explainedRisks: ["Отек мягких тканей", "Гематома", "Послеоперационная болезненность"],
			alternatives: ["Съемное протезирование", "Мостовидный протез"],
			aftercareRequirements: ["Прием антибиотиков", "Холод локально", "Щадящая диета 7 дней"],
			confirmedVoluntary: true,
			questionsAnswered: true,
			consentDate: "2026-09-02",
		};

		const html = renderInformedConsent1051nHtml(consentPayload);
		assert.ok(html.includes("ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ"));
		assert.ok(html.includes("Лечащий врач: <strong>Иванов Иван Иванович</strong>"));
		assert.ok(html.includes("Пациент (Законный представитель): <strong>Сидоров Алексей Михайлович</strong>"));

		const stampHtml = renderDigitalSignatureStampHtml({
			certificateSerialNumber: "00E4A28B554433221100AA",
			certificateSubject: "Иванов Иван Иванович",
			certificateIssuer: "Головной УЦ Минцифры России (ГОСТ Р 34.10-2012)",
			validFrom: "2026-01-01",
			validTo: "2027-01-01",
			signedAt: "2026-09-02T14:00:00.000Z",
			signatureType: "ukep",
		});

		const stampedHtml = injectVisualSignatureStampIntoHtml(html, stampHtml);

		// Проверяем нанесение штампа по ГОСТ Р 7.0.97-2016
		assert.ok(stampedHtml.includes("BEGIN_GOST_SIGNATURE_STAMP"));
		assert.ok(stampedHtml.includes("ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ"));
		assert.ok(stampedHtml.includes("00E4A28B554433221100AA"));
		assert.ok(stampedHtml.includes("Иванов Иван Иванович"));

		// Проверяем, что строка подписи пациента осталась нетронутой
		assert.ok(stampedHtml.includes("Пациент (Законный представитель): <strong>Сидоров Алексей Михайлович</strong>"));
		assert.ok(stampedHtml.includes('<div class="sig-line"></div>'));
	});

	it("applies GOST R 7.0.97-2016 visual blue signature stamp to Paid Medical Services Contract (Договор ПП РФ № 736) on Executor block", () => {
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

		const html = renderPaidServiceContract736Html(contractPayload);
		assert.ok(html.includes("НА ОКАЗАНИЕ ПЛАТНЫХ МЕДИЦИНСКИХ УСЛУГ"));
		assert.ok(html.includes("ИСПОЛНИТЕЛЬ:"));
		assert.ok(html.includes("ЗАКАЗЧИК (ПАЦИЕНТ):"));

		const stampHtml = renderDigitalSignatureStampHtml({
			certificateSerialNumber: "00E4A28B998877665544",
			certificateSubject: 'ООО "ДЕНТЕ КЛИНИК" (Смирнов А.В.)',
			certificateIssuer: "Головной УЦ Минцифры России (ГОСТ Р 34.10-2012)",
			validFrom: "2026-01-01",
			validTo: "2027-01-01",
			signedAt: "2026-09-02T15:30:00.000Z",
			signatureType: "ukep",
		});

		const stampedHtml = injectVisualSignatureStampIntoHtml(html, stampHtml);

		// Проверяем штамп в реквизитах Исполнителя
		assert.ok(stampedHtml.includes("BEGIN_GOST_SIGNATURE_STAMP"));
		assert.ok(stampedHtml.includes("ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ"));
		assert.ok(stampedHtml.includes("00E4A28B998877665544"));
		assert.ok(stampedHtml.includes('ООО &quot;ДЕНТЕ КЛИНИК&quot; (Смирнов А.В.)'));

		// Подпись заказчика на бумаге сохранена
		assert.ok(stampedHtml.includes("ЗАКАЗЧИК (ПАЦИЕНТ):"));
		assert.ok(stampedHtml.includes("Подпись Заказчика:"));
	});

	it("applies GOST R 7.0.97-2016 visual blue signature stamp to Form 043/u (Медицинская карта стоматологического больного) replacing doctor signature line and verifies zero static fake mocks", () => {
		const form043uPayload = {
			clinicLegalName: 'ООО "ДЕНТЕ СТОМАТОЛОГИЯ"',
			medicalCardNumber: "СТ-2026/777",
			patientFullName: "Ковалев Игорь Николаевич",
			attendingDoctorFullName: "Васильева Ольга Николаевна",
			attendingDoctorSpecialty: "Врач-стоматолог-терапевт",
			chiefComplaint: "Кариозная полость в зубе 2.5",
			visitEntries: [
				{
					date: "2026-09-02",
					toothNumber: 25,
					diagnosisIcd10: "K02.1",
					diagnosisText: "Кариес дентина зуба 2.5",
					treatmentDiary: "Под инфильтрационной анестезией препарирована кариозная полость. Медикаментозная обработка. Постоянная пломба светового отверждения Filtek Ultimate.",
					doctorFullName: "Васильева Ольга Николаевна",
				},
			],
		};

		const html = renderForm043uHtml(form043uPayload);

		// ПРОВЕРКА 1: В неподписанном документе НЕТ статического мока сертификата
		assert.strictEqual(html.includes("00EB4A71C09F9882E41123456789ABCDEF"), false, "Статический мок сертификата найден в форме 043/у!");
		assert.strictEqual(html.includes('<div class="ukep-stamp">'), false, "Тег ukep-stamp найден в неподписанной форме 043/у!");

		// ПРОВЕРКА 2: Нанесение динамического штампа при наличии ЭЦП
		const stampHtml = renderDigitalSignatureStampHtml({
			certificateSerialNumber: "00E4A28B1122338877",
			certificateSubject: "Васильева Ольга Николаевна",
			certificateIssuer: "Головной УЦ Минцифры России (ГОСТ Р 34.10-2012)",
			validFrom: "2026-01-01",
			validTo: "2027-01-01",
			signedAt: "2026-09-02T16:00:00.000Z",
			signatureType: "ukep",
		});

		const stampedHtml = injectVisualSignatureStampIntoHtml(html, stampHtml);

		assert.ok(stampedHtml.includes("BEGIN_GOST_SIGNATURE_STAMP"));
		assert.ok(stampedHtml.includes("ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ"));
		assert.ok(stampedHtml.includes("00E4A28B1122338877"));
		assert.ok(stampedHtml.includes("Васильева Ольга Николаевна"));
		// Проверяем, что в блоке подписи врача строка для ручной подписи замещена штампом
		assert.ok(stampedHtml.includes("Пациент (Заказчик): Ковалев Игорь Николаевич"));
	});

	it("guarantees HTML and PDF signature stamp parity via applySignatureStampIfSigned", () => {
		const baseDoc = {
			id: "doc-unified-stamp-1234",
			kind: "dental_medical_card_043u",
			patientId: "pat-1",
			title: "Медицинская карта 043/у",
			totalAmountRub: 0,
			status: "issued" as const,
			issuedAt: "2026-09-02T12:00:00.000Z",
			doctorCertSerial: "00E4A28BCAFE998877",
			doctorCertSubject: "Смирнова Екатерина Павловна",
			signatureAttestation: {
				mode: "qualified_electronic_signature" as const,
				staffFullName: "Смирнова Екатерина Павловна",
				signedAt: "2026-09-02T12:00:00.000Z",
			},
		} as unknown as GeneratedDocument;

		const plainHtml = renderForm043uHtml({
			clinicLegalName: 'ООО "ДЕНТЕ"',
			medicalCardNumber: "СТ-101",
			patientFullName: "Петров Петр Петрович",
			attendingDoctorFullName: "Смирнова Екатерина Павловна",
			attendingDoctorSpecialty: "Врач-стоматолог",
			chiefComplaint: "Осмотр",
			visitEntries: [],
		});

		// 1. Для подписанного документа штамп инжектируется
		const stampedHtml = applySignatureStampIfSigned(baseDoc, plainHtml);
		assert.ok(stampedHtml.includes("BEGIN_GOST_SIGNATURE_STAMP"));
		assert.ok(stampedHtml.includes("00E4A28BCAFE998877"));
		assert.ok(stampedHtml.includes("Смирнова Екатерина Павловна"));

		// 2. Идемпотентность: повторный вызов не дублирует штамп
		const doubleStampedHtml = applySignatureStampIfSigned(baseDoc, stampedHtml);
		const stampCount = (doubleStampedHtml.match(/BEGIN_GOST_SIGNATURE_STAMP/g) || []).length;
		assert.strictEqual(stampCount, 1, "Штамп не должен дублироваться при повторном вызове");

		// 3. Для неподписанного документа HTML возвращается без изменений
		const unsignedDoc = {
			...baseDoc,
			signatureAttestation: null,
			doctorSignaturePkcs7: null,
			cryptoSignaturePkcs7: null,
		} as unknown as GeneratedDocument;
		const unstamped = applySignatureStampIfSigned(unsignedDoc, plainHtml);
		assert.strictEqual(unstamped.includes("BEGIN_GOST_SIGNATURE_STAMP"), false);
		assert.strictEqual(unstamped, plainHtml);
	});
});
