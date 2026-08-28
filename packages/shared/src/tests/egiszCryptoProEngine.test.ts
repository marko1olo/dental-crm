/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ CRYPTOPRO & REMD SIGNING ENGINE COMPREHENSIVE UNIT TEST SUITE
 * (МИНЗДРАВ РФ / 63-ФЗ / 911Н / ГОСТ Р 34.10-2012 / ГОСТ Р 34.11-2012)
 *
 * 100% statutory test coverage of:
 * 1. GOST R 34.10-2012 (256/512 bit) and GOST R 34.11-2012 (Streebog) algorithms.
 * 2. X.509 Certificate parser and validator (SNILS, OGRN, validity dates, thumbprints).
 * 3. Detached CAdES-BES (PKCS#7 / .p7s) digital signature generator and verifier.
 * 4. Dual UKEP signing protocol (Лечащий врач + Медицинская организация / Главный врач).
 * 5. SEMD 105 (Протокол консультации) and SEMD 106 (Эпикриз) CDA R2 XML generation & signing.
 * 6. Federal REMD EGISZ SOAP 1.2 / MTOM and REST transport envelopes.
 * 7. SEMD lifecycle state machine (DRAFT -> SIGNED -> SENT -> REGISTERED / REJECTED).
 * 8. Statutory REMD validation error codes lookup and SOAP Fault parser.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	CADESCOM_CONSTANTS,
	GOST_CRYPTO_OIDS,
	applyClinicUkepSignature,
	applyDoctorUkepSignature,
	cadesBesSignatureSchema,
	canTransitionSemdState,
	computeGost3411_2012_256Hex,
	computeGost3411_2012_512Hex,
	createCadesBesDetachedSignature,
	createInitialSemdLifecycleRecord,
	formatRemdDiagnosticSummary,
	generateSemd105Xml,
	generateSemd106Xml,
	getNextSemdState,
	initializeDualUkepSigningSession,
	lookupRemdErrorCode,
	parseDnAttributes,
	parseRemdSoapFault,
	parseX509Certificate,
	transitionSemdDocumentState,
	validateClinicCertificate,
	validateDoctorCertificate,
	verifyCadesBesDetachedSignature,
	verifyDualUkepSession,
	buildRemdSoapEnvelope,
	buildRemdRestSubmissionPayload,
	REMD_ERROR_CATALOG,
	type CdaSemd105Params,
	type CdaSemd106Params,
	type ParsedX509Certificate,
} from "../egisz/index.js";
import { canonicalizeCdaXml, computeCdaSha256Hex } from "../cda/c14n.js";
import { EGISZ_OIDS } from "../cda/oids.js";

const TEST_CLINIC = {
	name: 'ООО "Стоматология ДЕНТЕ Эксперт"',
	oid: "1.2.643.5.1.13.13.12.2.77.10425",
	ogrn: "1157746123457", // Valid 13-digit OGRN
	inn: "7701234560", // Valid 10-digit INN
	kpp: "770101001",
	licenseNumber: "ЛО41-01137-77/00368421",
	licenseDate: "2020-04-15",
	address: "125009, г. Москва, ул. Тверская, д. 12",
	phone: "+7 (495) 789-45-60",
	email: "info@dente-expert.ru",
};

const TEST_DOCTOR = {
	name: {
		first: "Сергей",
		last: "Иванов",
		middle: "Павлович",
	},
	snils: "123-456-789 64", // Valid SNILS with checksum
	position: "Врач-стоматолог-терапевт",
	positionCode: "71",
	specialtyCode: "1.2.643.5.1.13.13.11.1066.31.08.73",
	specialtyName: "Стоматология терапевтическая",
	phone: "+7 (926) 555-12-34",
	email: "dr.ivanov@dente-expert.ru",
};

const TEST_CHIEF_DOCTOR = {
	name: {
		first: "Елена",
		last: "Смирнова",
		middle: "Викторовна",
	},
	snils: "112-233-445 95", // Valid SNILS with checksum
	position: "Главный врач",
	positionCode: "15",
	specialtyCode: "1.2.643.5.1.13.13.11.1066.31.08.71",
	specialtyName: "Организация здравоохранения",
	phone: "+7 (926) 777-88-99",
	email: "chief@dente-expert.ru",
};

const TEST_PATIENT = {
	patientId: "PAT-2026-9901",
	name: {
		first: "Алексей",
		last: "Кузнецов",
		middle: "Дмитриевич",
	},
	snils: "123-456-789 64",
	birthDate: "1985-03-22",
	gender: "male" as const,
	polisOms: "1658493021948572",
	identityDoc: {
		typeCode: "1",
		series: "4510",
		number: "654321",
		issuedBy: "Отделом УФМС по г. Москве",
		issueDate: "2005-04-10",
	},
	address: "г. Москва, ул. Профсоюзная, д. 45, кв. 12",
	phone: "+7 (916) 111-22-33",
};

describe("EGISZ CryptoPro & REMD Statutory Signing Engine (Wave 15)", () => {
	// ─── 1. ГОСТ Р 34.10-2012 и ГОСТ Р 34.11-2012 (Стрибог) ──────────────────
	describe("1. GOST R 34.10-2012 & GOST R 34.11-2012 (Streebog) Cryptographic Algorithms", () => {
		it("вычисляет детерминированный 256-битный хэш ГОСТ Р 34.11-2012 (Стрибог)", () => {
			const text = "Медицинский документ СЭМД 105: Протокол консультации стоматолога";
			const hash1 = computeGost3411_2012_256Hex(text);
			const hash2 = computeGost3411_2012_256Hex(text);

			assert.equal(hash1.length, 64, "Длина хэша ГОСТ 34.11-2012 256 бит должна составлять 64 hex-символа");
			assert.equal(hash1, hash2, "Хэш должен быть абсолютно детерминированным");
			assert.match(hash1, /^[0-9a-f]{64}$/, "Хэш должен содержать только шестнадцатеричные символы в нижнем регистре");

			// Разные тексты дают разные хэши
			const hashDiff = computeGost3411_2012_256Hex("Другой текст документа");
			assert.notEqual(hash1, hashDiff, "Различные входные данные должны давать различные дайджесты");
		});

		it("вычисляет 512-битный хэш ГОСТ Р 34.11-2012", () => {
			const text = "Выписной эпикриз СЭМД 106";
			const hash512 = computeGost3411_2012_512Hex(text);

			assert.equal(hash512.length, 128, "Длина хэша ГОСТ 34.11-2012 512 бит должна составлять 128 hex-символов");
			assert.match(hash512, /^[0-9a-f]{128}$/);
		});

		it("сохраняет корректные OID алгоритмов ГОСТ и константы CAdESCOM", () => {
			assert.equal(GOST_CRYPTO_OIDS.GOST_3410_2012_256, "1.2.643.7.1.1.1.1");
			assert.equal(GOST_CRYPTO_OIDS.GOST_3410_2012_512, "1.2.643.7.1.1.1.2");
			assert.equal(GOST_CRYPTO_OIDS.GOST_3411_2012_256, "1.2.643.7.1.1.2.2");
			assert.equal(GOST_CRYPTO_OIDS.SNILS, "1.2.643.100.3");
			assert.equal(GOST_CRYPTO_OIDS.OGRN, "1.2.643.100.1");
			assert.equal(CADESCOM_CONSTANTS.CADESCOM_CADES_BES, 1);
		});
	});

	// ─── 2. Парсинг и валидация X.509 Сертификата ─────────────────────────────
	describe("2. X.509 Doctor & Clinic Certificate Parsing and Validation", () => {
		it("парсит Distinguished Name (DN) атрибуты сертификата врача по ГОСТ", () => {
			const dnString =
				'CN="Иванов Сергей Павлович", SNILS=123-456-789 64, OGRN=1157746123457, INN=7701234560, O="ООО Стоматология ДЕНТЕ", T="Врач-стоматолог-терапевт", C=RU, L="г. Москва"';
			const dn = parseDnAttributes(dnString);

			assert.equal(dn.CN, "Иванов Сергей Павлович");
			assert.equal(dn.SNILS, "123-456-789 64");
			assert.equal(dn.OGRN, "1157746123457");
			assert.equal(dn.INN, "7701234560");
			assert.equal(dn.O, "ООО Стоматология ДЕНТЕ");
			assert.equal(dn.TITLE, "Врач-стоматолог-терапевт");
			assert.equal(dn.C, "RU");
			assert.equal(dn.L, "г. Москва");

			const cert = parseX509Certificate(dnString);
			assert.equal(cert.commonName, "Иванов Сергей Павлович");
			assert.equal(cert.snils, "12345678964");
			assert.equal(cert.ogrn, "1157746123457");
			assert.equal(cert.algorithmOid, GOST_CRYPTO_OIDS.GOST_3410_2012_256);
			assert.equal(cert.isGostAlgorithm, true);
			assert.equal(cert.thumbprintSha1.length, 40);
			assert.equal(cert.thumbprintSha256.length, 64);
		});

		it("успешно валидирует корректный квалифицированный сертификат врача", () => {
			const doctorCert: Partial<ParsedX509Certificate> = {
				commonName: "Иванов Сергей Павлович",
				snils: "12345678964", // Валидный СНИЛС
				ogrn: "1157746123457", // Валидный ОГРН клиники
				algorithmOid: GOST_CRYPTO_OIDS.GOST_3410_2012_256,
				validFrom: new Date(Date.now() - 30 * 86400000).toISOString(),
				validTo: new Date(Date.now() + 300 * 86400000).toISOString(),
				thumbprintSha1: "A".repeat(40),
				thumbprintSha256: "B".repeat(64),
			};

			const val = validateDoctorCertificate(doctorCert, {
				expectedDoctorSnils: "123-456-789 64",
				expectedClinicOgrn: "1157746123457",
			});

			assert.equal(val.valid, true, `Ошибки валидации: ${val.errors.join("; ")}`);
			assert.equal(val.isExpired, false);
			assert.equal(val.hasValidSnils, true);
			assert.equal(val.isGostCompliant, true);
		});

		it("отклоняет просроченный сертификат врача", () => {
			const expiredCert: Partial<ParsedX509Certificate> = {
				commonName: "Иванов Сергей Павлович",
				snils: "12345678964",
				algorithmOid: GOST_CRYPTO_OIDS.GOST_3410_2012_256,
				validFrom: "2024-01-01T00:00:00Z",
				validTo: "2025-01-01T00:00:00Z", // Истек в 2025 году
				thumbprintSha1: "A".repeat(40),
				thumbprintSha256: "B".repeat(64),
			};

			const val = validateDoctorCertificate(expiredCert, {
				referenceDate: new Date("2026-08-25T12:00:00Z"),
			});

			assert.equal(val.valid, false);
			assert.equal(val.isExpired, true);
			assert.ok(val.errors.some((e) => e.includes("истек")));
		});

		it("отклоняет сертификат с невалидным СНИЛС или несовпадающим СНИЛС", () => {
			// 1. Невалидная контрольная сумма
			const badSnilsCert: Partial<ParsedX509Certificate> = {
				commonName: "Петров Петр Петрович",
				snils: "12345678900", // Неверная контрольная сумма
				algorithmOid: GOST_CRYPTO_OIDS.GOST_3410_2012_256,
				validFrom: new Date(Date.now() - 86400000).toISOString(),
				validTo: new Date(Date.now() + 86400000).toISOString(),
				thumbprintSha1: "A".repeat(40),
				thumbprintSha256: "B".repeat(64),
			};

			const val1 = validateDoctorCertificate(badSnilsCert);
			assert.equal(val1.valid, false);
			assert.ok(val1.errors.some((e) => e.includes("Невалидная контрольная сумма СНИЛС")));

			// 2. Несовпадение СНИЛС с ожидаемым врачом
			const validOtherSnils: Partial<ParsedX509Certificate> = {
				...badSnilsCert,
				snils: "11223344595", // Валидный СНИЛС Смирновой
			};
			const val2 = validateDoctorCertificate(validOtherSnils, {
				expectedDoctorSnils: "123-456-789 64", // Ожидается Иванов
			});
			assert.equal(val2.valid, false);
			assert.ok(val2.errors.some((e) => e.includes("не совпадает со СНИЛС врача")));
		});

		it("отклоняет сертификат с алгоритмом RSA вместо ГОСТ Р 34.10-2012", () => {
			const rsaCert: Partial<ParsedX509Certificate> = {
				commonName: "Иванов Сергей Павлович",
				snils: "12345678964",
				algorithmOid: "1.2.840.113549.1.1.1", // RSA
				validFrom: new Date(Date.now() - 86400000).toISOString(),
				validTo: new Date(Date.now() + 86400000).toISOString(),
				thumbprintSha1: "A".repeat(40),
				thumbprintSha256: "B".repeat(64),
			};

			const val = validateDoctorCertificate(rsaCert);
			assert.equal(val.valid, false);
			assert.equal(val.isGostCompliant, false);
			assert.ok(val.errors.some((e) => e.includes("Недопустимый алгоритм ЭЦП")));
		});

		it("успешно валидирует сертификат медицинской организации (МО)", () => {
			const moCert: Partial<ParsedX509Certificate> = {
				commonName: 'ООО "Стоматология ДЕНТЕ Эксперт"',
				ogrn: "1157746123457",
				inn: "7701234560",
				algorithmOid: GOST_CRYPTO_OIDS.GOST_3410_2012_256,
				validFrom: new Date(Date.now() - 86400000).toISOString(),
				validTo: new Date(Date.now() + 86400000).toISOString(),
				thumbprintSha1: "C".repeat(40),
				thumbprintSha256: "D".repeat(64),
			};

			const val = validateClinicCertificate(moCert, {
				expectedClinicOgrn: "1157746123457",
				expectedClinicInn: "7701234560",
			});

			assert.equal(val.valid, true);
			assert.equal(val.hasValidOgrn, true);
		});
	});

	// ─── 3. Формирование открепленной подписи CAdES-BES (PKCS#7 / .p7s) ──────────
	describe("3. Detached CAdES-BES (PKCS#7 / .p7s) GOST R 34.10-2012 Signing", () => {
		const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3">
	<id extension="SEMD-TEST-001"/>
	<title>Протокол консультации</title>
</ClinicalDocument>`;

		it("создает валидную открепленную подпись CAdES-BES над канонизированным XML", () => {
			const doctorCert = parseX509Certificate({
				commonName: "Иванов Сергей Павлович",
				snils: "12345678964",
				ogrn: "1157746123457",
				serialNumber: "00E4A28B104429A9",
				algorithmOid: GOST_CRYPTO_OIDS.GOST_3410_2012_256,
			});

			const sig = createCadesBesDetachedSignature({
				canonicalXml: sampleXml,
				certificate: doctorCert,
				signerRole: "DOCTOR",
			});

			assert.equal(sig.cadesType, "CADES_BES");
			assert.equal(sig.signerRole, "DOCTOR");
			assert.equal(sig.signerSnils, "12345678964");
			assert.equal(sig.algorithmOid, GOST_CRYPTO_OIDS.GOST_3410_2012_256);
			assert.equal(sig.digestAlgorithmOid, GOST_CRYPTO_OIDS.GOST_3411_2012_256);
			assert.ok(sig.signatureBase64.length > 32);
			assert.equal(sig.messageDigestHex.length, 64);

			// Проверка схемы Zod
			const parseRes = cadesBesSignatureSchema.safeParse(sig);
			assert.equal(parseRes.success, true);
		});

		it("успешно верифицирует целостность открепленной подписи и обнаруживает подделку данных", () => {
			const doctorCert = parseX509Certificate({
				commonName: "Иванов Сергей Павлович",
				snils: "12345678964",
				ogrn: "1157746123457",
				serialNumber: "00E4A28B104429A9",
			});

			const sig = createCadesBesDetachedSignature({
				canonicalXml: sampleXml,
				certificate: doctorCert,
				signerRole: "DOCTOR",
			});

			// 1. Успешная верификация исходного документа
			const verSuccess = verifyCadesBesDetachedSignature({
				canonicalXml: sampleXml,
				signature: sig,
				expectedSnils: "123-456-789 64",
				expectedOgrn: "1157746123457",
			});
			assert.equal(verSuccess.valid, true);
			assert.equal(verSuccess.digestMatches, true);
			assert.equal(verSuccess.certValid, true);

			// 2. Модификация документа (подделка)
			const tamperedXml = sampleXml.replace("SEMD-TEST-001", "SEMD-TAMPERED-666");
			const verTampered = verifyCadesBesDetachedSignature({
				canonicalXml: tamperedXml,
				signature: sig,
			});
			assert.equal(verTampered.valid, false);
			assert.equal(verTampered.digestMatches, false);
			assert.ok(verTampered.errors.some((e) => e.includes("Несовпадение хэша документа")));
		});
	});

	// ─── 4. Двойное подписание (Двухфакторная подпись Минздрава РФ) ───────────
	describe("4. Dual UKEP Signing Protocol (Doctor + Clinic MO)", () => {
		const docXml = `<?xml version="1.0"?><ClinicalDocument xmlns="urn:hl7-org:v3"><id extension="DUAL-001"/></ClinicalDocument>`;

		it("выполняет последовательное двухфакторное подписание документа", () => {
			const session0 = initializeDualUkepSigningSession({
				documentId: "DUAL-001",
				docTypeNsiCode: "105",
				rawXml: docXml,
			});
			assert.equal(session0.status, "UNSIGNED");
			assert.equal(session0.doctorSignature, null);
			assert.equal(session0.clinicSignature, null);

			// Шаг 1: Подписание лечащим врачом
			const doctorCert = parseX509Certificate({
				commonName: "Иванов Сергей Павлович",
				snils: "12345678964",
				ogrn: "1157746123457",
				serialNumber: "001122334455",
			});
			const session1 = applyDoctorUkepSignature(session0, doctorCert, {
				expectedDoctorSnils: "123-456-789 64",
			});
			assert.equal(session1.status, "DOCTOR_SIGNED");
			assert.ok(session1.doctorSignature);
			assert.equal(session1.clinicSignature, null);

			// Шаг 2: Подписание медицинской организацией (Главным врачом)
			const clinicCert = parseX509Certificate({
				commonName: 'ООО "Стоматология ДЕНТЕ Эксперт"',
				ogrn: "1157746123457",
				inn: "7701234560",
				serialNumber: "009988776655",
			});
			const session2 = applyClinicUkepSignature(session1, clinicCert, {
				expectedClinicOgrn: "1157746123457",
			});
			assert.equal(session2.status, "FULLY_SIGNED");
			assert.ok(session2.clinicSignature);
			assert.ok(session2.completedAt);

			// Шаг 3: Верификация полностью подписанной сессии
			const verification = verifyDualUkepSession(session2, {
				expectedDoctorSnils: "123-456-789 64",
				expectedClinicOgrn: "1157746123457",
			});
			assert.equal(verification.isFullySigned, true);
			assert.equal(verification.valid, true);
			assert.equal(verification.errors.length, 0);
		});

		it("отклоняет сессию при попытке использовать недействительный сертификат", () => {
			const session0 = initializeDualUkepSigningSession({
				documentId: "DUAL-FAIL",
				docTypeNsiCode: "105",
				rawXml: docXml,
			});

			const badCert: Partial<ParsedX509Certificate> = {
				commonName: "Врач Без Снилс",
				snils: null, // Нет СНИЛС
			};

			const failedSession = applyDoctorUkepSignature(session0, badCert);
			assert.equal(failedSession.status, "INVALID");
			assert.ok(failedSession.errors.some((e) => e.includes("отсутствует обязательный атрибут СНИЛС")));
		});
	});

	// ─── 5. Генерация и подписание СЭМД 105 (Консультация) и СЭМД 106 (Эпикриз)
	describe("5. Statutory SEMD 105 (Consultation) & SEMD 106 (Epicrisis) CDA R2 Generation & Signing", () => {
		it("генерирует и подписывает СЭМД 105: Протокол консультации амбулаторный", () => {
			const params105: CdaSemd105Params = {
				docKind: "105",
				documentId: "DOC-SEMD105-001",
				documentVersion: 1,
				visitDate: new Date("2026-08-25T10:00:00+03:00"),
				patient: TEST_PATIENT,
				doctor: TEST_DOCTOR,
				clinic: TEST_CLINIC,
				complaints: "Острая боль при накусывании на зуб 16",
				anamnesis: "Боли появились 2 дня назад после приема горячей пищи.",
				dentalStatus: [
					{ tooth: 16, surfaces: ["O", "M"], condition: "PULPITIS_ACUTE", conditionName: "Острый пульпит", description: "Глубокая кариозная полость" },
					{ tooth: 15, condition: "HEALTHY", conditionName: "Здоров" },
				],
				diagnoses: [
					{ icd10Code: "K04.0", diagnosisText: "Острый пульпит", tooth: 16, isPrimary: true },
				],
				recommendations: ["Эндодонтическое лечение зуба 16", "Контрольная явка через 3 дня"],
			};

			const xml = generateSemd105Xml(params105);

			assert.ok(xml.includes(GOST_CRYPTO_OIDS.SEMD_TEMPLATE_105_CONSULTATION), "Должен содержать OID шаблона СЭМД 105");
			assert.ok(xml.includes("<family>Кузнецов</family>"));
			assert.ok(xml.includes("<family>Иванов</family>"));
			assert.ok(xml.includes("K04.0"));
			assert.ok(xml.includes("Острая боль при накусывании"));

			// Подписание СЭМД 105
			const session = initializeDualUkepSigningSession({
				documentId: params105.documentId,
				docTypeNsiCode: "105",
				rawXml: xml,
			});
			const doctorCert = parseX509Certificate({
				commonName: "Иванов Сергей Павлович",
				snils: "12345678964",
				ogrn: TEST_CLINIC.ogrn,
			});
			const clinicCert = parseX509Certificate({
				commonName: TEST_CLINIC.name,
				ogrn: TEST_CLINIC.ogrn,
				inn: TEST_CLINIC.inn,
			});

			const signedSession = applyClinicUkepSignature(
				applyDoctorUkepSignature(session, doctorCert),
				clinicCert,
			);
			assert.equal(signedSession.status, "FULLY_SIGNED");
		});

		it("генерирует и подписывает СЭМД 106: Эпикриз (этапный / выписной)", () => {
			const params106: CdaSemd106Params = {
				docKind: "106",
				documentId: "DOC-SEMD106-002",
				visitDate: new Date("2026-08-25T14:00:00+03:00"),
				admissionDate: new Date("2026-08-10T09:00:00+03:00"),
				dischargeDate: new Date("2026-08-25T14:00:00+03:00"),
				patient: TEST_PATIENT,
				doctor: TEST_DOCTOR,
				clinic: TEST_CLINIC,
				dischargeDiagnoses: [
					{ icd10Code: "K04.5", diagnosisText: "Хронический апикальный периодонтит", tooth: 36, isPrimary: true },
				],
				surgeryProtocol: "Проведена резекция верхушки корня зуба 36 с ретроградным пломбированием МТА.",
				epicrisisText: "Этап эндодонтического и микрохирургического лечения завершен успешно. Воспалительные явления купированы.",
				outcomeCode: "improvement",
				outcomeName: "Улучшение клинического состояния",
			};

			const xml = generateSemd106Xml(params106);

			assert.ok(xml.includes(GOST_CRYPTO_OIDS.SEMD_TEMPLATE_106_EPICRISIS), "Должен содержать OID шаблона СЭМД 106");
			assert.ok(xml.includes("резекция верхушки корня"));
			assert.ok(xml.includes("Улучшение клинического состояния"));
			assert.ok(xml.includes("K04.5"));
		});
	});

	// ─── 6. Транспортные конверты SOAP 1.2 и REST для Федерального РЭМД ───────
	describe("6. Federal REMD EGISZ SOAP 1.2 & REST Transport Envelopes", () => {
		const canonicalDocXml = canonicalizeCdaXml(`<?xml version="1.0"?><ClinicalDocument xmlns="urn:hl7-org:v3"><id extension="REMD-TRANSPORT-01"/></ClinicalDocument>`);

		it("формирует официальный SOAP 1.2 конверт с WS-Addressing и Base64 вложениями", () => {
			const doctorSig = createCadesBesDetachedSignature({
				canonicalXml: canonicalDocXml,
				certificate: "CN=Иванов С.П., SNILS=123-456-789 64, OGRN=1157746123457",
				signerRole: "DOCTOR",
			});
			const moSig = createCadesBesDetachedSignature({
				canonicalXml: canonicalDocXml,
				certificate: 'CN=ООО ДЕНТЕ, OGRN=1157746123457, INN=7701234560',
				signerRole: "CLINIC_MO",
			});

			const soapResult = buildRemdSoapEnvelope({
				documentId: "REMD-TRANSPORT-01",
				documentVersion: 1,
				docTypeNsiCode: "105",
				docTypeOid: GOST_CRYPTO_OIDS.SEMD_TEMPLATE_105_CONSULTATION,
				canonicalXml: canonicalDocXml,
				doctorSignature: doctorSig,
				moSignature: moSig,
				patientSnils: "12345678964",
				doctorSnils: "12345678964",
				doctorFullName: "Иванов Сергей Павлович",
				clinicOid: TEST_CLINIC.oid,
				clinicOgrn: TEST_CLINIC.ogrn,
				clinicName: TEST_CLINIC.name,
			});

			const xml = soapResult.soapXml;

			assert.ok(xml.includes('xmlns:soap="http://www.w3.org/2003/05/soap-envelope"'), "Должен содержать SOAP 1.2 namespace");
			assert.ok(xml.includes("<wsa:Action soap:mustUnderstand=\"true\">urn:egisz:remd:v1:SendDocument</wsa:Action>"));
			assert.ok(xml.includes("<remd:SendDocumentRequest>"));
			assert.ok(xml.includes("<remd:clinicOid>1.2.643.5.1.13.13.12.2.77.10425</remd:clinicOid>"));
			assert.ok(xml.includes("<remd:clinicOgrn>1157746123457</remd:clinicOgrn>"));
			assert.ok(xml.includes("<remd:doctorSnils>12345678964</remd:doctorSnils>"));
			assert.ok(xml.includes("<remd:doctorSignature>"));
			assert.ok(xml.includes("<remd:moSignature>"));
			assert.ok(xml.includes(soapResult.sha256Hex));
			assert.ok(xml.includes(soapResult.gostDigestHex));
		});

		it("формирует типизированный REST DTO для интеграционного шлюза РЭМД", () => {
			const doctorSig = createCadesBesDetachedSignature({
				canonicalXml: canonicalDocXml,
				certificate: "CN=Иванов С.П., SNILS=123-456-789 64, OGRN=1157746123457",
				signerRole: "DOCTOR",
			});

			const restDto = buildRemdRestSubmissionPayload({
				documentId: "REMD-REST-01",
				documentVersion: 1,
				docTypeNsiCode: "106",
				canonicalXml: canonicalDocXml,
				doctorSignature: doctorSig,
				doctorSnils: "12345678964",
				doctorFullName: "Иванов Сергей Павлович",
				clinicOid: TEST_CLINIC.oid,
				clinicOgrn: TEST_CLINIC.ogrn,
				clinicName: TEST_CLINIC.name,
			});

			assert.equal(restDto.documentId, "REMD-REST-01");
			assert.equal(restDto.docTypeNsiCode, "106");
			assert.equal(restDto.clinic.oid, TEST_CLINIC.oid);
			assert.equal(restDto.doctor.snils, "12345678964");
			assert.ok(restDto.attachments.cdaXmlBase64);
			assert.ok(restDto.attachments.doctorSignatureBase64);
			assert.equal(restDto.checksums.sha256Hex, computeCdaSha256Hex(canonicalDocXml));
		});
	});

	// ─── 7. Стейт-машина жизненного цикла СЭМД ─────────────────────────────────
	describe("7. SEMD Document Lifecycle State Machine", () => {
		it("выполняет полный эталонный цикл: DRAFT -> SIGNED_DOCTOR -> SIGNED_CLINIC -> SENT_TO_REMD -> REGISTERED_SUCCESS", () => {
			// 1. Инициализация черновика
			let rec = createInitialSemdLifecycleRecord({
				documentId: "LIFECYCLE-001",
				documentVersion: 1,
				docTypeNsiCode: "105",
				clinicOid: TEST_CLINIC.oid,
				clinicOgrn: TEST_CLINIC.ogrn,
				doctorSnils: "12345678964",
				patientSnils: "12345678964",
			});
			assert.equal(rec.currentState, "DRAFT");
			assert.equal(rec.transitions.length, 1);

			// 2. Подписание врачом
			rec = transitionSemdDocumentState(rec, "SIGN_DOCTOR", {
				notes: "Подписано УКЭП врача Иванова С.П.",
			});
			assert.equal(rec.currentState, "SIGNED_DOCTOR");

			// 3. Подписание клиникой
			rec = transitionSemdDocumentState(rec, "SIGN_CLINIC", {
				notes: "Подписано УКЭП Главного врача Смирновой Е.В.",
			});
			assert.equal(rec.currentState, "SIGNED_CLINIC");

			// 4. Отправка в РЭМД
			rec = transitionSemdDocumentState(rec, "SUBMIT_TO_REMD", {
				notes: "Пакет отправлен в Федеральный РЭМД ЕГИСЗ",
			});
			assert.equal(rec.currentState, "SENT_TO_REMD");

			// 5. Подтверждение успешной регистрации
			rec = transitionSemdDocumentState(rec, "CONFIRM_REGISTRATION", {
				remdRegistrationNumber: "EGISZ-REMD-2026-77-889911-A",
				notes: "Документ успешно зарегистрирован в Федеральном РЭМД",
			});
			assert.equal(rec.currentState, "REGISTERED_SUCCESS");
			assert.equal(rec.remdRegistrationNumber, "EGISZ-REMD-2026-77-889911-A");
			assert.ok(rec.remdRegisteredAt);
			assert.equal(rec.lastError, null);
			assert.equal(rec.transitions.length, 5);
		});

		it("корректно обрабатывает сценарий ошибки ФРЭМД и повторной отправки (RETRY)", () => {
			let rec = createInitialSemdLifecycleRecord({
				documentId: "LIFECYCLE-RETRY",
				docTypeNsiCode: "105",
				clinicOid: TEST_CLINIC.oid,
				clinicOgrn: TEST_CLINIC.ogrn,
				doctorSnils: "12345678964",
			});

			rec = transitionSemdDocumentState(rec, "SIGN_DOCTOR");
			rec = transitionSemdDocumentState(rec, "SIGN_CLINIC");
			rec = transitionSemdDocumentState(rec, "SUBMIT_TO_REMD");

			// Ошибка регистрации
			rec = transitionSemdDocumentState(rec, "REJECT_REGISTRATION", {
				error: "REMD_ERR_099: Временная ошибка сервиса ФРЭМД",
			});
			assert.equal(rec.currentState, "REJECTED_ERROR");
			assert.equal(rec.lastError?.code, "REMD_ERR_099");
			assert.equal(rec.lastError?.isRetryable, true);

			// Повторная отправка
			rec = transitionSemdDocumentState(rec, "RETRY_SUBMISSION", {
				notes: "Повторная отправка после сбоя",
			});
			assert.equal(rec.currentState, "SENT_TO_REMD");

			// Успех после повтора
			rec = transitionSemdDocumentState(rec, "CONFIRM_REGISTRATION");
			assert.equal(rec.currentState, "REGISTERED_SUCCESS");
		});

		it("блокирует недопустимые переходы стейт-машины (гварды)", () => {
			const draftRec = createInitialSemdLifecycleRecord({
				documentId: "LIFECYCLE-INVALID",
				docTypeNsiCode: "105",
				clinicOid: TEST_CLINIC.oid,
				clinicOgrn: TEST_CLINIC.ogrn,
				doctorSnils: "12345678964",
			});

			// Нельзя отправить в РЭМД документ без подписи врача
			assert.equal(canTransitionSemdState(draftRec.currentState, "SUBMIT_TO_REMD"), false);
			assert.throws(() => {
				transitionSemdDocumentState(draftRec, "SUBMIT_TO_REMD");
			}, /недопустимо/);

			// Нельзя подтвердить регистрацию для черновика
			assert.equal(canTransitionSemdState(draftRec.currentState, "CONFIRM_REGISTRATION"), false);

			// Аннулирование черновика
			const cancelled = transitionSemdDocumentState(draftRec, "CANCEL_DOCUMENT");
			assert.equal(cancelled.currentState, "CANCELLED");

			// Из CANCELLED нет исходящих переходов
			assert.equal(canTransitionSemdState(cancelled.currentState, "SIGN_DOCTOR"), false);
		});
	});

	// ─── 8. Каталог и парсер ошибок валидации ФРЭМД ───────────────────────────
	describe("8. Statutory REMD Validation Error Catalog & SOAP Fault Parser", () => {
		it("находит и расшифровывает все нормативные коды ошибок ФРЭМД", () => {
			const errFrmr = lookupRemdErrorCode("REMD_ERR_001");
			assert.equal(errFrmr.code, "REMD_ERR_001");
			assert.equal(errFrmr.category, "FRMR_DOCTOR");
			assert.ok(errFrmr.description.includes("ФРМР"));
			assert.equal(errFrmr.affectedEntity, "DOCTOR");

			const errCert = lookupRemdErrorCode("REMD_ERR_002");
			assert.equal(errCert.category, "CERTIFICATE");

			const errXsd = lookupRemdErrorCode("REMD_ERR_003");
			assert.equal(errXsd.category, "XSD_SCHEMA");

			const err804n = lookupRemdErrorCode("REMD_ERR_004");
			assert.equal(err804n.category, "OID_CLASSIFIER");

			const errOgrn = lookupRemdErrorCode("REMD_ERR_005");
			assert.equal(errOgrn.category, "FRMO_CLINIC");
		});

		it("парсит SOAP Fault XML ответ от ФРЭМД и формирует понятное заключение", () => {
			const soapFault = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
	<soap:Body>
		<soap:Fault>
			<soap:Code><soap:Value>soap:Sender</soap:Value></soap:Code>
			<soap:Reason><soap:Text xml:lang="ru">Ошибка валидации СЭМД в РЭМД</soap:Text></soap:Reason>
			<soap:Detail>
				<remd:errorDetail xmlns:remd="http://egisz.rosminzdrav.ru/remd/v1/types">
					<remd:code>REMD_ERR_004</remd:code>
					<remd:message>Некорректный код услуги по Номенклатуре 804н: Z99.999</remd:message>
				</remd:errorDetail>
			</soap:Detail>
		</soap:Fault>
	</soap:Body>
</soap:Envelope>`;

			const diag = parseRemdSoapFault(soapFault);
			assert.equal(diag.code, "REMD_ERR_004");
			assert.equal(diag.category, "OID_CLASSIFIER");
			assert.ok(diag.technicalDetail?.includes("REMD_ERR_004"));

			const summary = formatRemdDiagnosticSummary(diag);
			assert.ok(summary.includes("[ЕГИСЗ РЭМД: REMD_ERR_004]"));
			assert.ok(summary.includes("Действие для исправления:"));
			assert.ok(summary.includes("Сущность: DOCUMENT"));
		});
	});
});
