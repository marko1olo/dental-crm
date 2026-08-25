/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ CDA R3 / REMD STATUTORY FORMATTER & UKEP GOST 34.10 PROTOCOL ENGINE
 * (МИНЗДРАВ РФ / ПРИКАЗ 911Н / 804Н / 834Н / ГОСТ Р 34.10-2012 / CAdES-BES)
 * Comprehensive statutory verification of Form 043/u (Dental Consultation),
 * SEMD 101, 104, 130, OID classifiers, foreign citizen fallback,
 * C14N canonicalization, SHA-256 / GOST digests, and detached UKEP signatures.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	EGISZ_OIDS,
	IDENTITY_DOCUMENT_TYPES,
	buildEgiszRemdPackage,
	buildEgiszRemdSubmissionPackage,
	canonicalizeCdaXml,
	computeCdaDocumentFingerprint,
	computeCdaSha256Hex,
	createDemonstrationGostSignature,
	generateCdaXml,
	generateSemd043uXml,
	generateSemd101Xml,
	generateSemd104Xml,
	generateSemd130Xml,
	isValidSnils,
	normalizeSnils,
	prepareUkepSigningPayload,
	validateCdaParams,
	validateDetachedSignature,
	validateFdiToothNumber,
	validateFrmoOid,
	validateIcd10Code,
	validateInn,
	validateOgrn,
	validateOid,
	validateOrder804nCode,
	type CdaSemd043uParams,
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
	snils: "123-456-789 64", // Valid SNILS with checksum
	position: "Врач-стоматолог-терапевт",
	positionCode: "71", // NSI 1.2.643.5.1.13.13.11.1002
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
	polisDms: "DMS-INSR-99412",
	identityDoc: {
		typeCode: "1", // Паспорт гражданина РФ
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
	snils: null, // Иностранный гражданин без СНИЛС
	isForeignCitizen: true,
	birthDate: "1992-11-03",
	gender: "male" as const,
	identityDoc: {
		typeCode: "10", // Паспорт иностранного гражданина
		number: "GB98451234",
		issuedBy: "UK Passport Office",
		issueDate: "2021-03-10",
	},
	address: "г. Москва, ул. Арбат, гостиница",
	phone: "+7 (999) 000-11-22",
};

describe("EGISZ CDA R3 / REMD Statutory Formatter & UKEP GOST 34.10 Engine", () => {
	// ─── 1. OID Классификаторы и Валидаторы Минздрава РФ ──────────────────────
	describe("1. Statutory OID Classifiers & Registry Validations", () => {
		it("валидирует OID в синтаксисе ITU-T X.660 / ISO 8824", () => {
			assert.equal(validateOid("1.2.643.5.1.13.13.12.2"), true);
			assert.equal(validateOid("1.2.643.100.3"), true);
			assert.equal(validateOid("2.16.840.1.113883.1.3"), true);
			assert.equal(validateOid(""), false);
			assert.equal(validateOid("1.2.643.abc"), false);
			assert.equal(validateOid(".1.2.3"), false);
		});

		it("валидирует OID медицинской организации в реестре ФРМО ЕГИСЗ", () => {
			assert.equal(validateFrmoOid("1.2.643.5.1.13.13.12.2.77.10425"), true);
			assert.equal(validateFrmoOid("1.2.643.5.1.13.13.12.2"), true);
			assert.equal(validateFrmoOid("1.2.643.100.3"), false);
			assert.equal(validateFrmoOid("2.16.840.1.113883.1.3"), false);
		});

		it("валидирует контрольную сумму СНИЛС по алгоритму ПФР № 192п с граничными случаями", () => {
			// Валидные СНИЛС
			assert.equal(isValidSnils("123-456-789 64"), true);
			assert.equal(isValidSnils("12345678964"), true);
			assert.equal(isValidSnils("112-233-445 95"), true);
			assert.equal(isValidSnils(12345678964), true);

			// Невалидные контрольные суммы и форматы
			assert.equal(isValidSnils("12345678900"), false);
			assert.equal(isValidSnils("00000000000"), false);
			assert.equal(isValidSnils("11111111111"), false);
			assert.equal(isValidSnils("12345"), false);
			assert.equal(isValidSnils(null), false);
			assert.equal(isValidSnils(undefined), false);

			// Нормализация
			assert.equal(normalizeSnils(" 123-456-789 64 "), "12345678964");
		});

		it("валидирует форматы и контрольные числа ОГРН и ИНН", () => {
			assert.equal(validateOgrn("1157746123457"), true); // 13 цифр ЮЛ
			assert.equal(validateOgrn("315774600000000"), false); // Неверный ИП
			assert.equal(validateOgrn("12345"), false);

			assert.equal(validateInn("7701234560"), true); // 10 цифр ЮЛ
			assert.equal(validateInn("1234567890"), false); // Неверный ЮЛ
			assert.equal(validateInn("500100732259"), true); // 12 цифр ФЛ/ИП
			assert.equal(validateInn("500100732250"), false); // Неверный ФЛ
		});

		it("валидирует коды услуг по Номенклатуре 804н, МКБ-10 и формулу зубов FDI ISO 3950", () => {
			assert.equal(validateOrder804nCode("A16.07.002.001"), true);
			assert.equal(validateOrder804nCode("B01.065.001"), true);
			assert.equal(validateOrder804nCode("A16.07.030"), true);
			assert.equal(validateOrder804nCode("C99.123"), false);

			assert.equal(validateIcd10Code("K02.1"), true);
			assert.equal(validateIcd10Code("K04.0"), true);
			assert.equal(validateIcd10Code("K05.31"), true);
			assert.equal(validateIcd10Code("Z01.2"), true);
			assert.equal(validateIcd10Code("123.45"), false);

			// Взрослые квадранты 1..4 (11..48)
			assert.equal(validateFdiToothNumber(16), true);
			assert.equal(validateFdiToothNumber("21"), true);
			assert.equal(validateFdiToothNumber(48), true);
			// Молочные квадранты 5..8 (51..85)
			assert.equal(validateFdiToothNumber(55), true);
			assert.equal(validateFdiToothNumber(85), true);
			// Невалидные
			assert.equal(validateFdiToothNumber(19), false);
			assert.equal(validateFdiToothNumber(99), false);
		});
	});

	// ─── 2. Форматирование СЭМД 043/у (Протокол консультации стоматолога) ────
	describe("2. Statutory Form 043/u (Dental Consultation) CDA R3/R2 Formatter", () => {
		it("генерирует валидный HL7 CDA XML СЭМД 043/у со структурированным телом", () => {
			const params: CdaSemd043uParams = {
				docKind: "043u",
				documentId: "DOC-043U-2026-881",
				documentVersion: 1,
				documentTime: new Date("2026-08-25T11:30:00+03:00"),
				visitDate: new Date("2026-08-25T11:00:00+03:00"),
				encounterId: "ENC-2026-881",
				patient: SAMPLE_PATIENT_RU,
				doctor: SAMPLE_DOCTOR,
				clinic: SAMPLE_CLINIC,
				legalAuthenticator: {
					name: { first: "Елена", last: "Смирнова", middle: "Викторовна" },
					snils: "123-456-789 64",
					position: "Главный врач",
					positionCode: "15",
				},
				complaints: "Жалобы на боли в области зуба 26 при накусывании",
				anamnesis: "Зуб 26 ранее лечен эндодонтически более 5 лет назад.",
				anamnesisVitae: "Аллергологический анамнез не отягощен. Хронические заболевания отрицает.",
				dentalStatus: [
					{ tooth: 26, surfaces: ["O", "M", "D"], condition: "PERIODONTITIS_CHRONIC", conditionName: "Хронический периодонтит", description: "Глубокая кариозная полость, перкуссия слабо болезненна" },
					{ tooth: 25, condition: "HEALTHY", conditionName: "Здоров" },
					{ tooth: 27, condition: "FILLING", conditionName: "Пломба" },
				],
				objectiveStatus: "Слизистая оболочка полости рта бледно-розовая, без патологических изменений.",
				diagnoses: [
					{ icd10Code: "K04.5", diagnosisText: "Хронический апикальный периодонтит", tooth: 26, isPrimary: true },
					{ icd10Code: "K02.1", diagnosisText: "Кариес дентина", tooth: 27, isPrimary: false },
				],
				services: [
					{ code: "B01.065.001", name: "Прием врача-стоматолога-терапевта первичный", quantity: 1 },
					{ code: "A16.07.030.001", name: "Инструментальная и медикаментозная обработка корневого канала", tooth: 26, quantity: 3 },
					{ code: "A16.07.008.002", name: "Пломбирование корневого канала зуба гуттаперчей", tooth: 26, quantity: 3 },
				],
				treatmentDescription: "Проведена ревизия корневых каналов зуба 26, механическая и ультразвуковая ирригация гипохлоритом натрия 3%, временная обтурация гидроксидом кальция.",
				recommendations: [
					"Повторный визит для постоянного пломбирования через 14 дней",
					"При болях — НПВП (Ибупрофен 400 мг по требованию)",
					"Щадящий режим жевания на левой стороне",
				],
				instrumentTrayBarcode: "CSO-ENDO-99214",
				complications: "Без осложнений во время приема.",
			};

			const validation = validateCdaParams(params);
			assert.equal(validation.valid, true, `Validation errors: ${validation.errors.join("; ")}`);

			const result = generateCdaXml(params);
			assert.equal(result.success, true);
			if (!result.success) return;

			const xml = result.xml;

			// 1. Проверка HL7 CDA заголовка
			assert.ok(xml.includes('xmlns="urn:hl7-org:v3"'), "Должен содержать корневой namespace HL7 v3");
			assert.ok(xml.includes('<realmCode code="RU"/>'), "Должен содержать код юрисдикции RU");
			assert.ok(xml.includes(`root="${EGISZ_OIDS.HL7_CDA_R3_TYPE_ROOT}"`), "Должен содержать root TypeId HL7 CDA");
			assert.ok(xml.includes("POCD_HD000040"), "Должен содержать extension POCD_HD000040");
			assert.ok(xml.includes(EGISZ_OIDS.SEMD_TEMPLATE_101), "Должен содержать OID шаблона СЭМД 101/043у");
			assert.ok(xml.includes(EGISZ_OIDS.DOC_TYPE_NSI), "Должен содержать справочник видов мед. документации 1522");

			// 2. Проверка идентификаторов пациента и клиники
			assert.ok(xml.includes("<family>Соколова</family>"));
			assert.ok(xml.includes("<given>Анна</given>"));
			assert.ok(xml.includes("<given>Владимировна</given>"));
			assert.ok(xml.includes(`root="${EGISZ_OIDS.SNILS}"`));
			assert.ok(xml.includes(`extension="${normalizeSnils(SAMPLE_PATIENT_RU.snils)}"`));
			assert.ok(xml.includes(`root="${EGISZ_OIDS.FRMO_MO_ROOT}"`));
			assert.ok(xml.includes(`extension="${SAMPLE_CLINIC.oid}"`));
			assert.ok(xml.includes(SAMPLE_CLINIC.ogrn));
			assert.ok(xml.includes(SAMPLE_CLINIC.inn));

			// 3. Проверка врача и главного врача (LegalAuthenticator)
			assert.ok(xml.includes("<family>Иванов</family>"));
			assert.ok(xml.includes(`code="71"`));
			assert.ok(xml.includes("<family>Смирнова</family>"));
			assert.ok(xml.includes('<signatureCode code="S"/>'));

			// 4. Проверка клинических секций LOINC
			assert.ok(xml.includes(EGISZ_OIDS.LOINC_ANAMNESIS), "Секция 1: Анамнез");
			assert.ok(xml.includes(EGISZ_OIDS.LOINC_DENTAL_STATUS), "Секция 2: Стоматологический статус");
			assert.ok(xml.includes(EGISZ_OIDS.LOINC_DIAGNOSIS_SECTION), "Секция 3: Диагнозы");
			assert.ok(xml.includes(EGISZ_OIDS.LOINC_SERVICES_RENDERED), "Секция 4: Услуги 804н");
			assert.ok(xml.includes(EGISZ_OIDS.LOINC_RECOMMENDATIONS), "Секция 5: Рекомендации");
			assert.ok(xml.includes("CSO-ENDO-99214"), "Штрихкод лотка ЦСО");

			// 5. Проверка клинических кодов МКБ-10 и Номенклатуры 804н
			assert.ok(xml.includes('code="K04.5"'));
			assert.ok(xml.includes('code="K02.1"'));
			assert.ok(xml.includes('code="A16.07.030.001"'));
			assert.ok(xml.includes('code="26"'));
		});

		it("поддерживает вызов через специализированную функцию generateSemd043uXml", () => {
			const params: CdaSemd043uParams = {
				docKind: "043u",
				documentId: "DOC-043U-DIRECT",
				visitDate: new Date("2026-08-25T12:00:00+03:00"),
				patient: SAMPLE_PATIENT_RU,
				doctor: SAMPLE_DOCTOR,
				clinic: SAMPLE_CLINIC,
				diagnoses: [
					{ icd10Code: "Z01.2", diagnosisText: "Стоматологический профилактический осмотр", isPrimary: true },
				],
				recommendations: "Профосмотр 1 раз в 6 месяцев.",
			};

			const directXml = generateSemd043uXml(params);
			assert.ok(directXml.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"));
			assert.ok(directXml.includes("Стоматологический профилактический осмотр"));
			assert.ok(directXml.includes("</ClinicalDocument>"));
		});

		it("корректно обрабатывает иностранного гражданина без СНИЛС с паспортом", () => {
			const foreignParams: CdaSemd043uParams = {
				docKind: "043u",
				documentId: "DOC-FOREIGN-882",
				visitDate: new Date("2026-08-25T14:00:00+03:00"),
				patient: SAMPLE_PATIENT_FOREIGN,
				doctor: SAMPLE_DOCTOR,
				clinic: SAMPLE_CLINIC,
				diagnoses: [
					{ icd10Code: "K02.1", diagnosisText: "Кариес дентина", tooth: 14, isPrimary: true },
				],
			};

			const val = validateCdaParams(foreignParams);
			assert.equal(val.valid, true);
			assert.ok(val.warnings.some((w) => w.includes("иностранный гражданин")));

			const gen = generateCdaXml(foreignParams);
			assert.equal(gen.success, true);
			if (!gen.success) return;

			assert.ok(gen.xml.includes("<family>Смит</family>"));
			assert.ok(gen.xml.includes("GB98451234"));
			assert.ok(gen.xml.includes(IDENTITY_DOCUMENT_TYPES["10"]!.nameRu));
		});
	});

	// ─── 3. СЭМД 104 (Эпикриз) и СЭМД 130 (Налоговая справка) ─────────────────
	describe("3. SEMD 104 (Epicrisis) & SEMD 130 (Tax Certificate KND 1151156)", () => {
		it("генерирует стоматологический эпикриз СЭМД 104 с хирургическим протоколом", () => {
			const params: CdaSemd104Params = {
				docKind: "104",
				documentId: "DOC-SEMD104-TEST",
				visitDate: new Date("2026-08-25T16:00:00+03:00"),
				admissionDate: new Date("2026-08-01T10:00:00+03:00"),
				dischargeDate: new Date("2026-08-25T16:00:00+03:00"),
				patient: SAMPLE_PATIENT_RU,
				doctor: SAMPLE_DOCTOR,
				clinic: SAMPLE_CLINIC,
				dischargeDiagnoses: [
					{ icd10Code: "K05.3", diagnosisText: "Хронический генерализованный пародонтит", isPrimary: true },
				],
				surgeryProtocol: "Проведен открытый кюретаж пародонтальных карманов в области 33-43 с костной пластикой.",
				servicesRendered: [
					{ code: "A16.07.039", name: "Кюретаж пародонтальных карманов в области зуба", quantity: 6 },
				],
				epicrisisText: "Курс комплексной пародонтальной терапии завершен. Глубина карманов снизилась до 2-3 мм.",
				outcomeCode: "improvement",
				recommendations: ["Диспансерный осмотр через 3 месяца"],
			};

			const res = generateCdaXml(params);
			assert.equal(res.success, true);
			if (!res.success) return;

			assert.ok(res.xml.includes(EGISZ_OIDS.SEMD_TEMPLATE_104));
			assert.ok(res.xml.includes("Хирургический протокол:"));
			assert.ok(res.xml.includes("Улучшение клинического состояния"));
		});

		it("генерирует копеечно-точную налоговую справку СЭМД 130 и отклоняет арифметический дисбаланс", () => {
			const valid130: CdaSemd130Params = {
				docKind: "130",
				documentId: "DOC-SEMD130-VALID",
				certificateNumber: "130-2026/001",
				taxYear: 2026,
				issueDate: new Date("2026-08-25"),
				patient: SAMPLE_PATIENT_RU,
				taxpayer: {
					fullName: "Соколов Владимир Иванович",
					relationToPatient: "3", // Родитель
					inn: "500100732259",
					snils: "112-233-445 95",
				},
				doctor: SAMPLE_DOCTOR,
				clinic: SAMPLE_CLINIC,
				contractNumber: "ДОГ-8812",
				contractDate: "2026-01-20",
				paymentRecords: [
					{ fiscalReceiptNumber: "Ч-1", fiscalReceiptDate: "2026-03-10", paymentAmountKopecks: 200050, serviceCategoryCode: "1" },
					{ fiscalReceiptNumber: "Ч-2", fiscalReceiptDate: "2026-06-15", paymentAmountKopecks: 800000, serviceCategoryCode: "2" },
				],
				totalOrdinaryTreatmentKopecks: 200050,
				totalExpensiveTreatmentKopecks: 800000,
				totalSumKopecks: 1000050, // 10 000.50 руб.
			};

			const validRes = generateCdaXml(valid130);
			assert.equal(validRes.success, true);
			if (!validRes.success) return;
			assert.ok(validRes.xml.includes("10000.50"));

			// Дисбаланс сумм
			const invalid130: CdaSemd130Params = {
				...valid130,
				totalSumKopecks: 1000000, // 10 000.00 руб. (расхождение на 50 копеек!)
			};

			const invalidVal = validateCdaParams(invalid130);
			assert.equal(invalidVal.valid, false);
			assert.ok(invalidVal.errors.some((e) => e.includes("Не сходится сумма в копейках")));
		});
	});

	// ─── 4. Канонизация C14N и Отпечаток Документа (SHA-256 / ГОСТ 34.11-2012) ─
	describe("4. XML Canonicalization (C14N) & Cryptographic Digest Preparation", () => {
		it("выполняет детерминированную канонизацию C14N с удалением BOM и нормализацией строк", () => {
			const dirtyXml = "\uFEFF<?xml version=\"1.0\" encoding=\"UTF-8\"?>  \r\n<ClinicalDocument> \r\n\t<id extension=\"TEST\"/>  \r\n</ClinicalDocument>  \r\n";
			const canonical = canonicalizeCdaXml(dirtyXml);

			assert.ok(!canonical.startsWith("\uFEFF"), "BOM должен быть удален");
			assert.ok(!canonical.includes("\r"), "CRLF должны быть нормализованы в LF");
			assert.ok(canonical.endsWith("</ClinicalDocument>"), "Концевые пробелы должны быть очищены");

			const fingerprint = computeCdaDocumentFingerprint(dirtyXml);
			assert.equal(fingerprint.sha256Hex.length, 64);
			assert.equal(fingerprint.byteLength, Buffer.byteLength(canonical, "utf8"));
			assert.equal(fingerprint.canonicalXml, canonical);
		});

		it("подготавливает пакет для подписания УКЭП через КриптоПро ЭЦП Browser plug-in", () => {
			const xml = `<?xml version="1.0"?><ClinicalDocument xmlns="urn:hl7-org:v3"><id extension="UK-001"/></ClinicalDocument>`;
			const payload = prepareUkepSigningPayload(xml);

			assert.ok(payload.canonicalXml.length > 0);
			assert.equal(payload.sha256Hex.length, 64);
			assert.ok(payload.base64Content.length > 0);

			// Декодирование Base64 должно давать в точности канонизированный XML
			const decoded = Buffer.from(payload.base64Content, "base64").toString("utf8");
			assert.equal(decoded, payload.canonicalXml);
		});
	});

	// ─── 5. Протокол УКЭП (ГОСТ Р 34.10-2012 / CAdES-BES) и Пакет РЭМД ────────
	describe("5. UKEP GOST R 34.10-2012 Protocol & REMD Submission Packaging", () => {
		it("создает и валидирует отсоединенную подпись УКЭП врача и клиники", () => {
			const doctorSig = createDemonstrationGostSignature({
				doctorName: "Иванов Сергей Павлович",
				doctorSnils: "123-456-789 64",
				clinicName: SAMPLE_CLINIC.name,
				isMoSignature: false,
			});

			assert.equal(doctorSig.algorithmOid, EGISZ_OIDS.GOST_3410_2012_256);
			assert.equal(doctorSig.digestAlgorithmOid, EGISZ_OIDS.GOST_3411_2012_256);
			assert.ok(doctorSig.signatureBase64.length > 32);
			assert.ok(doctorSig.certificateSubject.includes("SNILS=123-456-789 64"));

			const docVal = validateDetachedSignature(doctorSig);
			assert.equal(docVal.valid, true);

			// Поврежденная подпись
			const brokenSig = { ...doctorSig, signatureBase64: "" };
			const brokenVal = validateDetachedSignature(brokenSig);
			assert.equal(brokenVal.valid, false);
		});

		it("формирует полный валидный пакет РЭМД ЕГИСЗ с метаданными", () => {
			const rawXml = `<?xml version="1.0"?><ClinicalDocument xmlns="urn:hl7-org:v3"><id extension="REMD-001"/></ClinicalDocument>`;
			const doctorSig = createDemonstrationGostSignature({
				doctorName: "Иванов Сергей Павлович",
				doctorSnils: "123-456-789 64",
				clinicName: SAMPLE_CLINIC.name,
			});
			const moSig = createDemonstrationGostSignature({
				doctorName: "Смирнова Елена Викторовна",
				doctorSnils: "123-456-789 64",
				clinicName: SAMPLE_CLINIC.name,
				isMoSignature: true,
			});

			const pkg = buildEgiszRemdSubmissionPackage({
				documentId: "REMD-001",
				documentVersion: 1,
				docTypeNsiCode: "101",
				rawXml,
				doctorSignature: doctorSig,
				moSignature: moSig,
				patientSnils: "12345678964",
				clinicOid: SAMPLE_CLINIC.oid,
				clinicOgrn: SAMPLE_CLINIC.ogrn,
			});

			assert.equal(pkg.documentId, "REMD-001");
			assert.equal(pkg.docTypeNsiCode, "101");
			assert.equal(pkg.metadata.clinicOid, SAMPLE_CLINIC.oid);
			assert.equal(pkg.metadata.patientSnils, "12345678964");
			assert.ok(pkg.doctorSignature.signatureBase64);
			assert.ok(pkg.moSignature?.signatureBase64);
			assert.equal(pkg.xmlCanonicalPayload, canonicalizeCdaXml(rawXml));
		});
	});
});
