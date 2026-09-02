/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD CDA R2 & UKEP UNIT TESTS (МИНЗДРАВ РФ / 911Н / ГОСТ 34.10-2012)
 * Comprehensive testing of SEMD 101, 104, 130 generators, regulatory
 * validators, foreign citizen fallback, C14N canonicalization, and UKEP.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	EGISZ_OIDS,
	IDENTITY_DOCUMENT_TYPES,
	ALLOWED_CDA_SIGNATURE_PROFILES,
	FORBIDDEN_CDA_SIGNATURE_PROFILES,
	EnvelopedSignatureSecurityError,
	assertDetachedCadesBesOnly,
	assertNoEnvelopedXmlSignature,
	buildEgiszRemdPackage,
	canonicalizeCdaXml,
	computeCdaSha256Hex,
	createDemonstrationGostSignature,
	detectEnvelopedXmlSignature,
	generateCdaXml,
	generateSemd101Xml,
	generateSemd104Xml,
	generateSemd130Xml,
	isValidSnils,
	normalizeSnils,
	validateCdaParams,
	validateCdaSignatureProfile,
	validateDetachedSignature,
	validateFdiToothNumber,
	validateFrmoOid,
	validateIcd10Code,
	validateInn,
	validateOgrn,
	validateOrder804nCode,
	type CdaSemd101Params,
	type CdaSemd104Params,
	type CdaSemd130Params,
} from "../cda/index.js";

const SAMPLE_CLINIC = {
	name: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
	oid: "1.2.643.5.1.13.13.12.2.77.10425",
	ogrn: "1157746123457",
	inn: "7701234560",
	kpp: "770101001",
	licenseNumber: "ЛО41-01137-77/00368421",
	licenseDate: "2020-04-15",
	address: "125009, г. Москва, ул. Тверская, д. 12, стр. 2",
	phone: "+7 (495) 789-45-60",
	email: "info@dente-clinic.ru",
};

const SAMPLE_DOCTOR = {
	name: {
		first: "Сергей",
		last: "Иванов",
		middle: "Павлович",
	},
	snils: "123-456-789 64", // Valid SNILS
	position: "Врач-стоматолог-терапевт",
	positionCode: "71",
	specialtyCode: "1.2.643.5.1.13.13.11.1066.31.08.73",
	specialtyName: "Стоматология терапевтическая",
	phone: "+7 (926) 555-12-34",
	email: "dr.ivanov@dente-clinic.ru",
};

const SAMPLE_PATIENT_RU = {
	patientId: "PAT-RU-10042",
	name: {
		first: "Анна",
		last: "Соколова",
		middle: "Владимировна",
	},
	snils: "123-456-789 64",
	birthDate: "1988-06-14",
	gender: "female" as const,
	polisOms: "1658493021948572",
	identityDoc: {
		typeCode: "1",
		series: "4512",
		number: "894512",
		issuedBy: "ГУ МВД по г. Москве",
		issueDate: "2010-07-20",
	},
	address: "119049, г. Москва, Ленинский проспект, д. 24, кв. 86",
	phone: "+7 (903) 123-45-67",
	email: "anna.sokolova@example.com",
};

const SAMPLE_PATIENT_FOREIGN = {
	patientId: "PAT-FOREIGN-9921",
	name: {
		first: "Джон",
		last: "Смит",
	},
	snils: null, // Foreign citizen without Russian SNILS
	isForeignCitizen: true,
	birthDate: "1992-11-03",
	gender: "male" as const,
	identityDoc: {
		typeCode: "10", // Foreign passport
		number: "GB98451234",
		issuedBy: "UK Passport Office",
		issueDate: "2021-03-10",
	},
	address: "г. Москва, ул. Арбат, гостиница",
	phone: "+7 (999) 000-11-22",
};

describe("EGISZ REMD CDA R2 & UKEP Suite", () => {
	// ─── 1. Валидация идентификаторов и реестров НСИ Минздрава РФ ────────────
	describe("1. OID Classifiers & Regulatory Field Validators", () => {
		it("валидирует контрольную сумму СНИЛС по алгоритму ПФР № 192п", () => {
			assert.equal(isValidSnils("123-456-789 64"), true);
			assert.equal(isValidSnils("12345678964"), true);
			assert.equal(isValidSnils("112-233-445 95"), true);
			// Неверные СНИЛС
			assert.equal(isValidSnils("12345678900"), false);
			assert.equal(isValidSnils("00000000000"), false);
			assert.equal(isValidSnils("11111111111"), false);
			assert.equal(isValidSnils("12345"), false);
		});

		it("валидирует формат и контрольные числа ОГРН и ИНН", () => {
			assert.equal(validateOgrn("1157746123457"), true); // 13 digits legal
			assert.equal(validateOgrn("315774600000000"), false); // Invalid 15 digits check
			assert.equal(validateOgrn("12345"), false);

			assert.equal(validateInn("7701234560"), true); // 10 digits legal
			assert.equal(validateInn("1234567890"), false); // Invalid legal
			assert.equal(validateInn("500100732259"), true); // 12 digits individual
		});

		it("валидирует OID ФРМО и классификаторы МКБ-10, 804н и зубы FDI", () => {
			assert.equal(validateFrmoOid("1.2.643.5.1.13.13.12.2.77.10425"), true);
			assert.equal(validateFrmoOid("1.2.643.5.1.13.13.12.2"), true);
			assert.equal(validateFrmoOid("2.16.840.1.113883.1.3"), false);

			assert.equal(validateIcd10Code("K02.1"), true);
			assert.equal(validateIcd10Code("K04.02"), true);
			assert.equal(validateIcd10Code("Z01.2"), true);
			assert.equal(validateIcd10Code("INVALID"), false);

			assert.equal(validateOrder804nCode("A16.07.002.001"), true);
			assert.equal(validateOrder804nCode("B01.065.001"), true);
			assert.equal(validateOrder804nCode("999.001"), false);

			assert.equal(validateFdiToothNumber(16), true);
			assert.equal(validateFdiToothNumber("21"), true);
			assert.equal(validateFdiToothNumber(55), true); // child
			assert.equal(validateFdiToothNumber(99), false); // invalid FDI
		});
	});

	// ─── 2. Генерация СЭМД 101: Протокол консультации стоматолога ─────────────
	describe("2. SEMD 101: Dental Consultation Protocol Generation", () => {
		it("формирует валидный XML CDA R2 для СЭМД 101 со всеми 5 секциями", () => {
			const params: CdaSemd101Params = {
				docKind: "101",
				documentId: "DOC-SEMD101-2026-001",
				documentVersion: 1,
				visitDate: new Date("2026-08-25T10:30:00+03:00"),
				patient: SAMPLE_PATIENT_RU,
				doctor: SAMPLE_DOCTOR,
				clinic: SAMPLE_CLINIC,
				complaints: "Кратковременные боли от сладкого и холодного в области зуба 16",
				anamnesis: "Зуб 16 ранее лечен по поводу кариеса 3 года назад.",
				dentalStatus: [
					{ tooth: 16, surfaces: ["O", "M"], condition: "CARIES_MEDIA", conditionName: "Кариес дентина", description: "Полость средней глубины" },
					{ tooth: 15, condition: "INTACT", conditionName: "Интактный" },
					{ tooth: 14, condition: "FILLING", conditionName: "Пломба" },
					{ tooth: 17, condition: "HEALTHY", conditionName: "Здоров" },
				],
				diagnoses: [
					{ icd10Code: "K02.1", diagnosisText: "Кариес дентина (средний кариес)", tooth: 16, isPrimary: true },
				],
				services: [
					{ code: "B01.065.001", name: "Прием врача-стоматолога-терапевта первичный", quantity: 1 },
					{ code: "A16.07.002.001", name: "Восстановление зуба пломбой II класс по Блэку", tooth: 16, quantity: 1 },
				],
				recommendations: [
					"Контрольный осмотр через 6 месяцев",
					"Индивидуальная гигиена полости рта (щетка средней жесткости, зубная нить)",
				],
				instrumentTrayBarcode: "CSO-TRAY-88412",
			};

			const result = generateCdaXml(params);
			assert.equal(result.success, true);
			if (!result.success) return;

			const xml = result.xml;
			// 1. Root & Namespaces
			assert.ok(xml.includes('xmlns="urn:hl7-org:v3"'));
			assert.ok(xml.includes('<realmCode code="RU"/>'));
			assert.ok(xml.includes('POCD_HD000040'));
			assert.ok(xml.includes(EGISZ_OIDS.SEMD_TEMPLATE_101));
			assert.ok(xml.includes('<code code="101"'));

			// 2. Patient & Doctor
			assert.ok(xml.includes("<family>Соколова</family>"));
			assert.ok(xml.includes("<given>Анна</given>"));
			assert.ok(xml.includes(`extension="${normalizeSnils(SAMPLE_PATIENT_RU.snils)}"`));
			assert.ok(xml.includes("<family>Иванов</family>"));
			assert.ok(xml.includes("Стоматологический Центр ДЕНТЕ Премиум"));

			// 3. Structured Body Sections
			assert.ok(xml.includes(EGISZ_OIDS.LOINC_ANAMNESIS));
			assert.ok(xml.includes(EGISZ_OIDS.LOINC_DENTAL_STATUS));
			assert.ok(xml.includes(EGISZ_OIDS.LOINC_DIAGNOSIS_SECTION));
			assert.ok(xml.includes(EGISZ_OIDS.LOINC_SERVICES_RENDERED));
			assert.ok(xml.includes(EGISZ_OIDS.LOINC_RECOMMENDATIONS));

			// 4. Clinical observations
			assert.ok(xml.includes('code="K02.1"'));
			assert.ok(xml.includes('code="A16.07.002.001"'));
			assert.ok(xml.includes('code="16"'));
			assert.ok(xml.includes("CSO-TRAY-88412"));
		});

		it("корректно обрабатывает иностранных граждан без СНИЛС с паспортом", () => {
			const params: CdaSemd101Params = {
				docKind: "101",
				documentId: "DOC-FOREIGN-001",
				visitDate: new Date("2026-08-25T11:00:00+03:00"),
				patient: SAMPLE_PATIENT_FOREIGN,
				doctor: SAMPLE_DOCTOR,
				clinic: SAMPLE_CLINIC,
				diagnoses: [
					{ icd10Code: "Z01.2", diagnosisText: "Стоматологическое обследование", isPrimary: true },
				],
				recommendations: "Профессиональная гигиена",
			};

			const validation = validateCdaParams(params);
			assert.equal(validation.valid, true);
			assert.ok(validation.warnings.some((w) => w.includes("иностранный гражданин")));

			const genRes = generateCdaXml(params);
			assert.equal(genRes.success, true);
			if (!genRes.success) return;

			assert.ok(genRes.xml.includes("<family>Смит</family>"));
			assert.ok(genRes.xml.includes("GB98451234"));
			assert.ok(genRes.xml.includes(IDENTITY_DOCUMENT_TYPES["10"]!.nameRu));
		});
	});

	// ─── 3. Генерация СЭМД 104: Эпикриз стоматологический ─────────────────────
	describe("3. SEMD 104: Dental Epicrisis Generation", () => {
		it("формирует валидный XML CDA R2 для СЭМД 104 с клинической динамикой", () => {
			const params: CdaSemd104Params = {
				docKind: "104",
				documentId: "DOC-SEMD104-2026-042",
				documentVersion: 1,
				visitDate: new Date("2026-08-25T12:00:00+03:00"),
				admissionDate: new Date("2026-08-10T10:00:00+03:00"),
				dischargeDate: new Date("2026-08-25T12:00:00+03:00"),
				patient: SAMPLE_PATIENT_RU,
				doctor: SAMPLE_DOCTOR,
				clinic: SAMPLE_CLINIC,
				admissionDiagnoses: [
					{ icd10Code: "K04.0", diagnosisText: "Пульпит острый очаговый", tooth: 24 },
				],
				dischargeDiagnoses: [
					{ icd10Code: "K04.0", diagnosisText: "Пульпит острый очаговый (пролечен)", tooth: 24, isPrimary: true },
				],
				clinicalCourse: "Лечение проведено в 2 посещения: девитализация, механическая обработка каналов, пломбирование гуттаперчей, эстетическая реставрация коронки.",
				servicesRendered: [
					{ code: "A16.07.030.001", name: "Инструментальная обработка корневого канала", tooth: 24, quantity: 2 },
					{ code: "A16.07.008.002", name: "Пломбирование корневого канала зуба", tooth: 24, quantity: 2 },
					{ code: "A16.07.002.001", name: "Восстановление зуба пломбой", tooth: 24, quantity: 1 },
				],
				radiologyStudiesSummary: "Контрольная радиовизиография: корневые каналы зуба 24 обтурированы до физиологического апекса плотно, гомогенно.",
				epicrisisText: "Пациентка прошла курс эндодонтического лечения зуба 24. Жалоб нет, перкуссия безболезненна, прикус в норме.",
				outcomeCode: "recovery",
				outcomeName: "Выздоровление",
				recommendations: [
					"Контрольная прицельная рентгенография через 6 месяцев",
					"Рассмотреть покрытие зуба 24 керамической коронкой",
				],
				nextFollowupDate: "2027-02-25",
			};

			const result = generateCdaXml(params);
			assert.equal(result.success, true);
			if (!result.success) return;

			const xml = result.xml;
			assert.ok(xml.includes(EGISZ_OIDS.SEMD_TEMPLATE_104));
			assert.ok(xml.includes('<code code="104"'));
			assert.ok(xml.includes("Выписной эпикриз"));
			assert.ok(xml.includes("Контрольная радиовизиография"));
			assert.ok(xml.includes("Выздоровление"));
			assert.ok(xml.includes("2027"));
		});
	});

	// ─── 4. Генерация СЭМД 130: Справка об оплате медицинских услуг ───────────
	describe("4. SEMD 130: Tax Payment Certificate Generation (КНД 1151156)", () => {
		it("формирует копеечно-точный XML CDA R2 для СЭМД 130", () => {
			const params: CdaSemd130Params = {
				docKind: "130",
				documentId: "DOC-SEMD130-2026-991",
				certificateNumber: "130-2026/514",
				taxYear: 2026,
				issueDate: new Date("2026-08-25T14:00:00+03:00"),
				patient: SAMPLE_PATIENT_RU,
				taxpayer: {
					fullName: "Соколов Владимир Иванович",
					snils: "112-233-445 95",
					inn: "500100732259",
					relationToPatient: "3", // Родитель
				},
				doctor: SAMPLE_DOCTOR,
				clinic: SAMPLE_CLINIC,
				contractNumber: "ДОГ-2026/891",
				contractDate: "2026-01-15",
				paymentRecords: [
					{
						fiscalReceiptNumber: "ФЧ-89104",
						fiscalReceiptDate: "2026-02-10",
						paymentAmountKopecks: 1540050, // 15 400.50 руб.
						serviceCategoryCode: "1", // Обычное
					},
					{
						fiscalReceiptNumber: "ФЧ-99412",
						fiscalReceiptDate: "2026-05-18",
						paymentAmountKopecks: 4500000, // 45 000.00 руб.
						serviceCategoryCode: "2", // Дорогостоящее (имплантация)
					},
				],
				totalOrdinaryTreatmentKopecks: 1540050,
				totalExpensiveTreatmentKopecks: 4500000,
				totalSumKopecks: 6040050, // 60 400.50 руб.
			};

			const result = generateCdaXml(params);
			assert.equal(result.success, true);
			if (!result.success) return;

			const xml = result.xml;
			assert.ok(xml.includes(EGISZ_OIDS.SEMD_TEMPLATE_130));
			assert.ok(xml.includes('<code code="130"'));
			assert.ok(xml.includes("Соколов Владимир Иванович"));
			assert.ok(xml.includes("500100732259")); // Taxpayer INN
			assert.ok(xml.includes("Родитель"));
			assert.ok(xml.includes("ФЧ-89104"));
			assert.ok(xml.includes("15400.50"));
			assert.ok(xml.includes("45000.00"));
			assert.ok(xml.includes("60400.50"));
		});

		it("отклоняет СЭМД 130 при арифметическом несовпадении сумм в копейках", () => {
			const badParams: CdaSemd130Params = {
				docKind: "130",
				documentId: "DOC-SEMD130-BAD",
				certificateNumber: "130-BAD",
				taxYear: 2026,
				issueDate: new Date(),
				patient: SAMPLE_PATIENT_RU,
				taxpayer: {
					fullName: "Соколов Владимир Иванович",
					relationToPatient: "1",
				},
				doctor: SAMPLE_DOCTOR,
				clinic: SAMPLE_CLINIC,
				contractNumber: "ДОГ-1",
				contractDate: "2026-01-01",
				paymentRecords: [
					{ fiscalReceiptNumber: "1", fiscalReceiptDate: "2026-01-01", paymentAmountKopecks: 100000, serviceCategoryCode: "1" },
				],
				totalOrdinaryTreatmentKopecks: 100000,
				totalExpensiveTreatmentKopecks: 0,
				totalSumKopecks: 99999, // MISMATCH!
			};

			const validation = validateCdaParams(badParams);
			assert.equal(validation.valid, false);
			assert.ok(validation.errors.some((e) => e.includes("Не сходится сумма в копейках")));
		});
	});

	// ─── 5. Канонизация XML и УКЭП (ГОСТ Р 34.10-2012 / CAdES-BES) ────────────
	describe("5. XML Canonicalization (C14N) & UKEP GOST R 34.10-2012 Packaging", () => {
		it("выполняет детерминированную канонизацию C14N (удаление BOM, нормализация CRLF)", () => {
			const dirtyXml = "\uFEFF<?xml version=\"1.0\"?>  \r\n<root> \r\n  <tag>Test</tag>  \r\n</root>  \r\n";
			const cleanXml = canonicalizeCdaXml(dirtyXml);

			assert.ok(!cleanXml.startsWith("\uFEFF"));
			assert.ok(!cleanXml.includes("\r"));
			assert.equal(cleanXml.endsWith("</root>"), true);

			const hash1 = computeCdaSha256Hex(dirtyXml);
			const hash2 = computeCdaSha256Hex(cleanXml);
			assert.equal(hash1, hash2);
			assert.equal(hash1.length, 64);
		});

		it("формирует и валидирует подписанный пакет СЭМД РЭМД с УКЭП врача и клиники", () => {
			const docSig = createDemonstrationGostSignature({
				doctorName: "Иванов Сергей Павлович",
				doctorSnils: "123-456-789 64",
				clinicName: SAMPLE_CLINIC.name,
				isMoSignature: false,
			});

			const moSig = createDemonstrationGostSignature({
				doctorName: "Смирнова Елена Викторовна",
				doctorSnils: "123-456-789 64",
				clinicName: SAMPLE_CLINIC.name,
				isMoSignature: true,
			});

			const sigVal = validateDetachedSignature(docSig);
			assert.equal(sigVal.valid, true);

			const rawXml = `<?xml version="1.0"?><ClinicalDocument xmlns="urn:hl7-org:v3"><id extension="TEST-1"/></ClinicalDocument>`;
			const pkg = buildEgiszRemdPackage({
				documentId: "TEST-1",
				documentVersion: 1,
				docTypeNsiCode: "101",
				rawXml,
				doctorSignature: docSig,
				moSignature: moSig,
				patientSnils: "12345678964",
				clinicOid: SAMPLE_CLINIC.oid,
				clinicOgrn: SAMPLE_CLINIC.ogrn,
			});

			assert.equal(pkg.documentId, "TEST-1");
			assert.equal(pkg.docTypeNsiCode, "101");
			assert.equal(pkg.doctorSignature.algorithmOid, EGISZ_OIDS.GOST_3410_2012_256);
			assert.ok(pkg.moSignature);
			assert.equal(pkg.moSignature?.certificateSubject.includes(SAMPLE_CLINIC.name), true);
		});

		it("запрещает enveloped XML-DSig без полноценного W3C C14N каноникализатора", () => {
			// 1. Валидация профилей подписи
			const validBes = validateCdaSignatureProfile("CADES_BES");
			assert.equal(validBes.valid, true);
			assert.equal(validBes.profile, "CADES_BES");

			const validCms = validateCdaSignatureProfile("DETACHED_CMS");
			assert.equal(validCms.valid, true);

			// Enveloped XML-DSig запрещен
			const badXmlDsig = validateCdaSignatureProfile("XMLDSIG_ENVELOPED");
			assert.equal(badXmlDsig.valid, false);
			assert.ok(badXmlDsig.error?.includes("Запрещено использование enveloped XML-DSig"));

			const badXades = validateCdaSignatureProfile("XADES_ENVELOPED");
			assert.equal(badXades.valid, false);

			// 2. assertDetachedCadesBesOnly
			assert.doesNotThrow(() => assertDetachedCadesBesOnly("CADES_BES"));
			assert.doesNotThrow(() => assertDetachedCadesBesOnly("DETACHED_CMS"));
			assert.throws(
				() => assertDetachedCadesBesOnly("XMLDSIG_ENVELOPED"),
				EnvelopedSignatureSecurityError,
			);
			assert.throws(
				() => assertDetachedCadesBesOnly("ENVELOPED"),
				(err: any) => err instanceof EnvelopedSignatureSecurityError && err.code === "FORBIDDEN_ENVELOPED_SIGNATURE",
			);

			// 3. Обнаружение <ds:Signature> в теле XML документа
			const xmlWithEnvelopedSig = `<?xml version="1.0"?>
<ClinicalDocument xmlns="urn:hl7-org:v3">
  <id extension="DOC-123"/>
  <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
    <ds:SignedInfo>
      <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
    </ds:SignedInfo>
  </ds:Signature>
</ClinicalDocument>`;

			const detected = detectEnvelopedXmlSignature(xmlWithEnvelopedSig);
			assert.equal(detected.hasEnvelopedSignature, true);
			assert.ok(detected.reason?.includes("Enveloped XML-DSig"));

			assert.throws(
				() => assertNoEnvelopedXmlSignature(xmlWithEnvelopedSig),
				EnvelopedSignatureSecurityError,
			);

			// 4. canonicalizeCdaXml отклоняет enveloped XML по умолчанию
			assert.throws(
				() => canonicalizeCdaXml(xmlWithEnvelopedSig),
				EnvelopedSignatureSecurityError,
			);

			// 5. Чистый XML проходит канонизацию без ошибок
			const cleanXml = `<?xml version="1.0"?><ClinicalDocument xmlns="urn:hl7-org:v3"><id extension="CLEAN"/></ClinicalDocument>`;
			assert.doesNotThrow(() => canonicalizeCdaXml(cleanXml));
		});
	});
});
