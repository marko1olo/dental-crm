/**
 * PiiAnonymizationVault.test.ts — Модульные тесты сервиса маскирования,
 * хеширования и криптографического удаления ПДн (152-ФЗ / 54-ФЗ / 402-ФЗ).
 *
 * Feature #96 (FEATURES_REGISTRY.md): «Обезличивание персональных данных (152-ФЗ),
 * маскирование ПДн при экспорте и криптографическое удаление по заявлению субъекта».
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	PiiAnonymizationVault,
	cryptoShredPatientData,
	generatePatientPseudonym,
	hashPassport,
	hashPiiField,
	hashSnils,
	maskEmail,
	maskFullName,
	maskFullNameInitials,
	maskFullNameRedacted,
	maskPassport,
	maskPhoneNumber,
	maskSnils,
	piiAnonymizationVault,
	sanitizeDatasetForExport,
	sanitizePatientForExport,
	verifyShreddingCertificate,
	type PatientRecordForShredding,
	type PaymentRecordForShredding,
} from "./PiiAnonymizationVault.js";

const TEST_CLINIC_SALT_A = "dente_clinic_salt_test_alpha_secret_9988";
const TEST_CLINIC_SALT_B = "dente_clinic_salt_test_beta_secret_1122";

describe("PiiAnonymizationVault — Full Name (ФИО) Masking", () => {
	it("masks Russian full name to initials: 'Иванов Иван Иванович' -> 'Иванов И. И.'", () => {
		const result = maskFullName("Иванов Иван Иванович", { style: "initials" });
		assert.equal(result, "Иванов И. И.");
		assert.equal(maskFullNameInitials("Иванов Иван Иванович"), "Иванов И. И.");
	});

	it("masks Russian full name with strong redaction: 'Иванов Иван Иванович' -> 'И****в И. И.' / 'И*****в И. И.'", () => {
		const result = maskFullName("Иванов Иван Иванович", { style: "redacted" });
		assert.equal(result, "И****в И. И.");
		assert.equal(maskFullNameRedacted("Иванов Иван Иванович"), "И****в И. И.");

		// С поддержкой фиксированной длины маски (5 звездочек)
		const resultFixed5 = maskFullName("Иванов Иван Иванович", { style: "redacted", fixedMaskLength: 5 });
		assert.equal(resultFixed5, "И*****в И. И.");
		assert.equal(maskFullNameRedacted("Иванов Иван Иванович", "*", 5), "И*****в И. И.");
	});

	it("handles two-word names: 'Петров Петр' -> 'Петров П.' and 'П****в П.'", () => {
		assert.equal(maskFullName("Петров Петр", { style: "initials" }), "Петров П.");
		assert.equal(maskFullName("Петров Петр", { style: "redacted" }), "П****в П.");
	});

	it("handles single-word surnames: 'Сидоров' -> 'Сидоров' (initials) and 'С*****в' (redacted)", () => {
		assert.equal(maskFullName("Сидоров", { style: "initials" }), "Сидоров");
		assert.equal(maskFullName("Сидоров", { style: "redacted" }), "С*****в");
		assert.equal(maskFullName("Сидоров", { style: "asterisks" }), "С*****в");
	});

	it("handles hyphenated surnames: 'Мамин-Сибиряк Дмитрий Наркисович' -> 'Мамин-Сибиряк Д. Н.' and 'М***н-С*****к Д. Н.'", () => {
		const initials = maskFullName("Мамин-Сибиряк Дмитрий Наркисович", { style: "initials" });
		assert.equal(initials, "Мамин-Сибиряк Д. Н.");

		const redacted = maskFullName("Мамин-Сибиряк Дмитрий Наркисович", { style: "redacted" });
		assert.equal(redacted, "М***н-С*****к Д. Н.");
	});

	it("handles short names (1 and 2 characters)", () => {
		assert.equal(maskFullName("Ли Ян", { style: "redacted" }), "Л* Я.");
		assert.equal(maskFullName("А Б", { style: "redacted" }), "* Б.");
	});

	it("normalizes irregular whitespaces and trims strings", () => {
		assert.equal(
			maskFullName("   Смирнова   Анна    Владимировна   ", { style: "initials" }),
			"Смирнова А. В.",
		);
	});

	it("handles null, undefined and empty strings safely", () => {
		assert.equal(maskFullName(null), "");
		assert.equal(maskFullName(undefined), "");
		assert.equal(maskFullName("   "), "");
	});

	it("supports custom masking characters and initials_only style", () => {
		assert.equal(
			maskFullName("Иванов Иван Иванович", { style: "redacted", maskChar: "#" }),
			"И####в И. И.",
		);
		assert.equal(
			maskFullName("Иванов Иван Иванович", { style: "initials_only" }),
			"И. И.",
		);
	});
});

describe("PiiAnonymizationVault — Phone Number Masking", () => {
	it("masks standard Russian phone: '+7 (999) 123-45-67' -> '+7 (999) ***-**-67'", () => {
		const masked = maskPhoneNumber("+7 (999) 123-45-67");
		assert.equal(masked, "+7 (999) ***-**-67");
	});

	it("masks raw 11-digit phone starting with 8: '89991234567' -> '+7 (999) ***-**-67'", () => {
		assert.equal(maskPhoneNumber("89991234567"), "+7 (999) ***-**-67");
	});

	it("masks raw 11-digit phone starting with 7: '79991234567' -> '+7 (999) ***-**-67'", () => {
		assert.equal(maskPhoneNumber("79991234567"), "+7 (999) ***-**-67");
	});

	it("masks 10-digit phone without country code: '9991234567' -> '+7 (999) ***-**-67'", () => {
		assert.equal(maskPhoneNumber("9991234567"), "+7 (999) ***-**-67");
	});

	it("masks international phones preserving prefix and last 2 digits", () => {
		const intl = maskPhoneNumber("+375 29 1234567");
		assert.ok(intl.startsWith("+375"));
		assert.ok(intl.endsWith("67"));
		assert.ok(intl.includes("*"));
	});

	it("handles null, undefined and empty strings safely", () => {
		assert.equal(maskPhoneNumber(null), "");
		assert.equal(maskPhoneNumber(undefined), "");
		assert.equal(maskPhoneNumber(""), "");
	});
});

describe("PiiAnonymizationVault — SNILS Hashing & Masking", () => {
	const validSnilsFormatted = "123-456-789 01";
	const validSnilsRaw = "12345678901";

	it("masks SNILS showing check digits: '123-456-789 01' -> '***-***-*** 01'", () => {
		assert.equal(maskSnils(validSnilsFormatted), "***-***-*** 01");
		assert.equal(maskSnils(validSnilsRaw), "***-***-*** 01");
	});

	it("hashes SNILS deterministically with clinic salt using HMAC-SHA256", () => {
		const hash1 = hashSnils(validSnilsFormatted, TEST_CLINIC_SALT_A);
		const hash2 = hashSnils(validSnilsRaw, TEST_CLINIC_SALT_A);

		assert.ok(hash1.startsWith("snils_hmac_"));
		assert.equal(hash1.length, "snils_hmac_".length + 64);
		assert.equal(hash1, hash2, "Нормализованный СНИЛС обязан давать идентичный хеш");
	});

	it("produces completely different hashes for different clinic salts (tenant isolation)", () => {
		const hashA = hashSnils(validSnilsFormatted, TEST_CLINIC_SALT_A);
		const hashB = hashSnils(validSnilsFormatted, TEST_CLINIC_SALT_B);
		assert.notEqual(hashA, hashB, "Разные соли клиник обязаны изолировать HMAC-пространства");
	});

	it("rejects invalid SNILS format (not 11 digits)", () => {
		assert.throws(() => {
			hashSnils("123-45", TEST_CLINIC_SALT_A);
		}, /Invalid SNILS format/);
	});

	it("rejects short or empty clinic salt", () => {
		assert.throws(() => {
			hashSnils(validSnilsFormatted, "short");
		}, /Valid clinicSalt/);
	});
});

describe("PiiAnonymizationVault — Passport Hashing & Masking", () => {
	const passportStr = "45 15 123456";
	const passportObj = { series: "4515", number: "123456" };

	it("masks passport series and number: '45 15 123456' -> '** ** ***456'", () => {
		assert.equal(maskPassport(passportStr), "** ** ***456");
		assert.equal(maskPassport(passportObj), "** ** ***456");
	});

	it("supports region code display when showRegionCode is enabled", () => {
		assert.equal(
			maskPassport(passportStr, { showRegionCode: true }),
			"45 ** ***456",
		);
	});

	it("hashes passport data deterministically with HMAC-SHA256", () => {
		const hash1 = hashPassport(passportStr, TEST_CLINIC_SALT_A);
		const hash2 = hashPassport(passportObj, TEST_CLINIC_SALT_A);

		assert.ok(hash1.startsWith("passport_hmac_"));
		assert.equal(hash1.length, "passport_hmac_".length + 64);
		assert.equal(hash1, hash2);
	});

	it("rejects invalid passport length", () => {
		assert.throws(() => {
			hashPassport("123", TEST_CLINIC_SALT_A);
		}, /Invalid Russian passport format/);
	});
});

describe("PiiAnonymizationVault — Email & Generic PII Utilities", () => {
	it("masks email addresses protecting mailbox name: 'ivanov.doctor@clinic.ru' -> 'i***********r@clinic.ru'", () => {
		assert.equal(maskEmail("ivanov.doctor@clinic.ru"), "i***********r@clinic.ru");
		assert.equal(maskEmail("doc@dente.ru"), "d*c@dente.ru");
		assert.equal(maskEmail(null), "");
	});

	it("hashes arbitrary PII fields deterministically", () => {
		const h1 = hashPiiField("patient@domain.com", TEST_CLINIC_SALT_A, "email");
		const h2 = hashPiiField(" PATIENT@DOMAIN.COM ", TEST_CLINIC_SALT_A, "email");
		assert.ok(h1.startsWith("email_hmac_"));
		assert.equal(h1, h2, "Case and whitespace normalization must yield identical hashes");
	});

	it("generates deterministic patient pseudonyms: ANON-152FZ-<16 HEX>", () => {
		const p1 = generatePatientPseudonym("patient-uuid-1001", TEST_CLINIC_SALT_A);
		const p2 = generatePatientPseudonym("patient-uuid-1001", TEST_CLINIC_SALT_A);
		const p3 = generatePatientPseudonym("patient-uuid-1001", TEST_CLINIC_SALT_B);

		assert.ok(/^ANON-152FZ-[0-9A-F]{16}$/.test(p1));
		assert.equal(p1, p2);
		assert.notEqual(p1, p3);
	});
});

describe("PiiAnonymizationVault — Crypto-Shredding Procedure (152-ФЗ & 54-ФЗ Compliance)", () => {
	const mockPatient: PatientRecordForShredding = {
		id: "018f4a12-8877-7000-8000-000000000001",
		organizationId: "018f4a12-8877-7000-8000-000000000099",
		fullName: "Иванов Иван Иванович",
		birthDate: "1988-05-14",
		phone: "+7 (999) 111-22-33",
		email: "ivanov.patient@mail.ru",
		notes: "Аллергия на лидокаин, имплантация Astra Tech",
		administrativeProfile: {
			discountPercentage: 10,
			vipStatus: true,
			passport: "45 15 987654",
		},
		familyGroupId: "018f4a12-8877-7000-8000-000000000088",
		snils: "123-456-789 01",
		passportSeries: "4515",
		passportNumber: "987654",
		address: "г. Москва, ул. Ленина, д. 24, кв. 10",
		status: "active",
		version: 3,
	};

	const mockPayments: readonly PaymentRecordForShredding[] = [
		{
			id: "pay-uuid-001",
			organizationId: "018f4a12-8877-7000-8000-000000000099",
			patientId: "018f4a12-8877-7000-8000-000000000001",
			visitId: "visit-uuid-001",
			amountRub: 15400.5,
			method: "card",
			status: "paid",
			paidAt: new Date("2026-03-10T14:30:00Z"),
			fiscalReceiptNumber: "ФЧ-00045892",
			fiscalReceiptIssuedAt: "2026-03-10T14:30:15Z",
			fiscalReceiptUrl: "https://ofd.ru/check/00045892",
			fiscalReceipt: {
				fiscalDriveNumber: "9999078900012345",
				fiscalDocumentNumber: "45892",
				fiscalSign: "3892019482",
				kktRegNumber: "0000123456049281",
				vatAmountRub: 0,
			},
			payerFullName: "Иванов Иван Иванович",
			payerInn: "770102030405",
			payerBirthDate: "1988-05-14",
			payerIdentityDocument: "Паспорт РФ 45 15 987654",
			taxDeductionCode: "1",
			note: "Оплата за установку циркониевой коронки",
		},
		{
			id: "pay-uuid-002",
			organizationId: "018f4a12-8877-7000-8000-000000000099",
			patientId: "018f4a12-8877-7000-8000-000000000001",
			visitId: "visit-uuid-002",
			amountRub: 3500.0,
			method: "sbp",
			status: "paid",
			paidAt: "2026-04-12T11:00:00Z",
			fiscalReceiptNumber: "ФЧ-00048102",
			fiscalReceipt: {
				fiscalDriveNumber: "9999078900012345",
				fiscalDocumentNumber: "48102",
				fiscalSign: "9182374619",
			},
			payerFullName: "Иванов Иван Иванович",
			note: "Профессиональная гигиена полости рта",
		},
	];

	it("executes crypto-shredding: irreversibly wipes patient PII while keeping referential UUID", () => {
		const result = cryptoShredPatientData({
			patient: mockPatient,
			payments: mockPayments,
			clinicSalt: TEST_CLINIC_SALT_A,
			reason: "Заявление пациента Иванова И.И. от 16.08.2026",
			operatorUserId: "sec-officer-01",
			operatorFullName: "Офицер ИБ Сидоров А.П.",
			retainEpidemiologicalYear: true,
		});

		const { anonymizedPatient, anonymizedPayments, certificate } = result;

		// 1. Проверка карточки пациента
		assert.equal(anonymizedPatient.id, mockPatient.id);
		assert.equal(anonymizedPatient.organizationId, mockPatient.organizationId);
		assert.equal(anonymizedPatient.fullName, PiiAnonymizationVault.ANONYMIZED_FULL_NAME_MARKER);
		assert.equal(anonymizedPatient.phone, null);
		assert.equal(anonymizedPatient.email, null);
		assert.equal(anonymizedPatient.notes, null);
		assert.equal(anonymizedPatient.administrativeProfile, null);
		assert.equal(anonymizedPatient.familyGroupId, null);
		assert.equal(anonymizedPatient.snils, null);
		assert.equal(anonymizedPatient.passportSeries, null);
		assert.equal(anonymizedPatient.passportNumber, null);
		assert.equal(anonymizedPatient.address, null);
		assert.equal(anonymizedPatient.status, "archived");
		assert.equal(anonymizedPatient.isAnonymized, true);
		assert.equal(anonymizedPatient.birthDate, "1988-01-01", "Эпидемиологический год сохранен");
		assert.equal(anonymizedPatient.version, 4);
		assert.ok(anonymizedPatient.pseudonym.startsWith("ANON-152FZ-"));

		// 2. Проверка бухгалтерских записей (54-ФЗ комплаенс)
		assert.equal(anonymizedPayments.length, 2);

		const pay1 = anonymizedPayments[0];
		assert.ok(pay1);
		assert.equal(pay1.id, "pay-uuid-001");
		assert.equal(pay1.amountRub, 15400.5, "Точная сумма оплаты обязана быть сохранена");
		assert.equal(pay1.method, "card");
		assert.equal(pay1.status, "paid");
		assert.equal(pay1.fiscalReceiptNumber, "ФЧ-00045892", "Номер фискального чека сохранен");
		assert.equal(pay1.taxDeductionCode, "1");
		assert.ok(pay1.fiscalReceipt, "Фискальные данные ФНС сохранены");

		// ПДн плательщика затерты
		assert.equal(pay1.payerFullName, PiiAnonymizationVault.ANONYMIZED_PAYER_NAME_MARKER);
		assert.equal(pay1.payerInn, null);
		assert.equal(pay1.payerBirthDate, null);
		assert.equal(pay1.payerIdentityDocument, null);
		assert.equal(pay1.note, null);
		assert.equal(pay1.isAnonymized, true);

		// 3. Проверка криптографического сертификата уничтожения
		assert.ok(certificate.certificateId);
		assert.equal(certificate.patientId, mockPatient.id);
		assert.equal(certificate.organizationId, mockPatient.organizationId);
		assert.equal(certificate.retained54FzRecordCount, 2);
		assert.equal(certificate.operatorUserId, "sec-officer-01");
		assert.ok(certificate.cryptographicProofSignature.length >= 64);
		assert.ok(certificate.complianceStandards.includes("152-FZ"));
		assert.ok(certificate.complianceStandards.includes("54-FZ"));
	});

	it("verifies authenticity of valid Cryptographic Shredding Certificate", () => {
		const result = cryptoShredPatientData({
			patient: mockPatient,
			payments: mockPayments,
			clinicSalt: TEST_CLINIC_SALT_A,
		});

		const isValid = verifyShreddingCertificate(result.certificate, TEST_CLINIC_SALT_A);
		assert.equal(isValid, true, "Подлинный сертификат обязан успешно проходить верификацию");
	});

	it("detects tampering and rejects forged or modified certificates", () => {
		const result = cryptoShredPatientData({
			patient: mockPatient,
			payments: mockPayments,
			clinicSalt: TEST_CLINIC_SALT_A,
		});

		// 1. Попытка верификации с чужой солью клиники
		assert.equal(
			verifyShreddingCertificate(result.certificate, TEST_CLINIC_SALT_B),
			false,
			"Чужая соль клиники должна быть отвергнута",
		);

		// 2. Попытка подделки числа фискальных записей
		const forgedCert = {
			...result.certificate,
			retained54FzRecordCount: 999,
		};
		assert.equal(
			verifyShreddingCertificate(forgedCert, TEST_CLINIC_SALT_A),
			false,
			"Модифицированное поле обязано ломать HMAC подпись",
		);
	});
});

describe("PiiAnonymizationVault — Export Sanitizer & Batch Processing", () => {
	const sampleExportPatient = {
		id: "patient-101",
		fullName: "Кузнецов Алексей Михайлович",
		phone: "+7 (903) 987-65-43",
		email: "kuznetsov@example.com",
		snils: "987-654-321 00",
		passportSeries: "4612",
		passportNumber: "654321",
		diagnosis: "К02.1 Кариес дентина",
	};

	it("sanitizes patient record under 'standard_mask' profile", () => {
		const exported = sanitizePatientForExport(sampleExportPatient, {
			profile: "standard_mask",
		});

		assert.equal(exported.fullName, "Кузнецов А. М.");
		assert.equal(exported.phone, "+7 (903) ***-**-43");
		assert.equal(exported.email, "k*******v@example.com");
		assert.equal(exported.snils, "***-***-*** 00");
		assert.equal(exported.passportNumber, "***321");
		assert.equal(exported.diagnosis, "К02.1 Кариес дентина", "Клинический диагноз сохраняется");
	});

	it("sanitizes patient record under 'strong_redaction' profile", () => {
		const exported = sanitizePatientForExport(sampleExportPatient, {
			profile: "strong_redaction",
		});

		assert.equal(exported.fullName, "К******в А. М.");
		assert.equal(exported.phone, "+7 (903) ***-**-43");
		assert.equal(exported.passportNumber, "******");
	});

	it("sanitizes patient record under 'statistical_anonymization' profile", () => {
		const exported = sanitizePatientForExport(sampleExportPatient, {
			profile: "statistical_anonymization",
		});

		assert.equal(exported.fullName, PiiAnonymizationVault.ANONYMIZED_FULL_NAME_MARKER);
		assert.equal(exported.phone, null);
		assert.equal(exported.email, null);
		assert.equal(exported.snils, null);
		assert.equal(exported.diagnosis, "К02.1 Кариес дентина");
	});

	it("batch sanitizes datasets for table exports", () => {
		const dataset = [sampleExportPatient, { ...sampleExportPatient, id: "patient-102" }];
		const sanitizedList = sanitizeDatasetForExport(dataset, { profile: "standard_mask" });

		assert.equal(sanitizedList.length, 2);
		assert.ok(sanitizedList[0]);
		assert.ok(sanitizedList[1]);
		assert.equal(sanitizedList[0].fullName, "Кузнецов А. М.");
		assert.equal(sanitizedList[1].fullName, "Кузнецов А. М.");
	});
});
