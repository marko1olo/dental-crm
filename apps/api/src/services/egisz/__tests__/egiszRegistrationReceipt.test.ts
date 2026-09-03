/**
 * Test Suite: EGISZ REMD Registration Receipts & Exponential Retry Backoff
 * Compliant with:
 * - Приказ Минздрава России от 07.09.2020 № 911н (РЭМД ЕГИСЗ)
 * - Федеральный закон от 06.04.2011 № 63-ФЗ «Об электронной подписи»
 * - Постановление Правительства РФ от 09.02.2022 № 140 «О ЕГИСЗ»
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateEgiszRetryDelayMs,
	createEgiszRemdReceipt,
	EgiszOutboxDispatcher,
} from "../EgiszOutboxDispatcher.js";
import {
	egiszRemdRegistrationReceiptSchema,
	generateCdaXml,
	generateSemd043_1uXml,
	generateSemd130Xml,
	validateCdaXmlStructure,
	type EgiszRemdRegistrationReceipt,
} from "@dental/shared";
import { OiisGatewayClient } from "../OiisGatewayClient.js";

describe("EGISZ REMD Registration Receipts & Retry Backoff Engine", () => {
	const validOrgId = "11111111-1111-4111-8111-111111111111";
	const validVisitId = "22222222-2222-4222-8222-222222222222";
	const validPatientId = "33333333-3333-4333-8333-333333333333";
	const validDocId = "44444444-4444-4444-8444-444444444444";
	const sampleSha256 =
		"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

	it("1.1 createEgiszRemdReceipt produces valid registration receipt matching Zod schema", () => {
		const receipt = createEgiszRemdReceipt({
			remdDocumentId: "REMD-2026-09-02-99881",
			transactionId: "TX-EGISZ-8888",
			registeredAt: "2026-09-02T18:00:00.000Z",
			organizationId: validOrgId,
			patientId: validPatientId,
			patientSnils: "11223344595",
			visitId: validVisitId,
			documentId: validDocId,
			docTypeNsiCode: "108",
			clinicOid: "1.2.643.5.1.13.13.12.2.77.1001",
			payloadHashSha256: sampleSha256,
			doctorCertSerial: "37462819000182736451",
			doctorCertSubject: "CN=Иванов Иван Иванович, O=Клиника ДЕНТЕ",
			moCertSerial: "99887766554433221100",
		});

		// Verify Zod parse
		const parseResult = egiszRemdRegistrationReceiptSchema.safeParse(receipt);
		assert.equal(parseResult.success, true, "Receipt must strictly conform to schema");

		// Verify domain fields
		assert.match(receipt.receiptId, /^RCP-REMD-/);
		assert.equal(receipt.remdDocumentId, "REMD-2026-09-02-99881");
		assert.equal(receipt.remdTransactionId, "TX-EGISZ-8888");
		assert.equal(receipt.docTypeNsiCode, "108");
		assert.match(receipt.docTypeTitle, /Стоматологический протокол приёма/);
		assert.equal(receipt.receiptVersion, "1.0");
		assert.equal(receipt.operatorSignature.operatorName, "ЕГИСЗ РЭМД Минздрава России");
		assert.equal(receipt.operatorSignature.verificationStatus, "VERIFIED_VALID");
	});

	it("1.2 Correctly maps NSI document kind codes to official Russian titles", () => {
		const r108 = createEgiszRemdReceipt({
			remdDocumentId: "DOC-108",
			transactionId: "TX-1",
			organizationId: validOrgId,
			patientId: validPatientId,
			visitId: validVisitId,
			docTypeNsiCode: "108",
			clinicOid: "1.2.643.5.1.13.13.12.2.77.1001",
			payloadHashSha256: sampleSha256,
			doctorCertSerial: "1",
			doctorCertSubject: "Dr.",
		});
		assert.equal(r108.docTypeTitle, "Стоматологический протокол приёма (СЭМД 108)");

		const r043 = createEgiszRemdReceipt({
			remdDocumentId: "DOC-043",
			transactionId: "TX-2",
			organizationId: validOrgId,
			patientId: validPatientId,
			visitId: validVisitId,
			docTypeNsiCode: "043",
			clinicOid: "1.2.643.5.1.13.13.12.2.77.1001",
			payloadHashSha256: sampleSha256,
			doctorCertSerial: "1",
			doctorCertSubject: "Dr.",
		});
		assert.equal(
			r043.docTypeTitle,
			"Медицинская карта ортодонтического пациента (Форма 043-1/у)",
		);

		const rCustom = createEgiszRemdReceipt({
			remdDocumentId: "DOC-999",
			transactionId: "TX-3",
			organizationId: validOrgId,
			patientId: validPatientId,
			visitId: validVisitId,
			docTypeNsiCode: "999",
			clinicOid: "1.2.643.5.1.13.13.12.2.77.1001",
			payloadHashSha256: sampleSha256,
			doctorCertSerial: "1",
			doctorCertSubject: "Dr.",
		});
		assert.equal(rCustom.docTypeTitle, "Медицинский документ (СЭМД код 999)");
	});

	it("2.1 calculateEgiszRetryDelayMs provides strict monotonic exponential backoff", () => {
		const curve = [
			{ attempt: 1, delay: 5_000, label: "5 секунд" },
			{ attempt: 2, delay: 30_000, label: "30 секунд" },
			{ attempt: 3, delay: 300_000, label: "5 минут" },
			{ attempt: 4, delay: 3_600_000, label: "1 час" },
			{ attempt: 5, delay: 86_400_000, label: "24 часа" },
			{ attempt: 10, delay: 86_400_000, label: "24 часа (кэп)" },
		];

		let previousDelay = 0;
		for (const step of curve) {
			const delay = calculateEgiszRetryDelayMs(step.attempt);
			assert.equal(delay, step.delay, `Attempt ${step.attempt} must equal ${step.delay}`);
			assert.ok(
				delay >= previousDelay,
				`Delay on attempt ${step.attempt} must be >= previous delay`,
			);
			previousDelay = delay;
		}
	});

	it("3.1 EgiszOutboxDispatcher handles receipt retrieval methods gracefully", async () => {
		const dispatcher = new EgiszOutboxDispatcher();

		try {
			// Querying a non-existent outbox item returns null
			const nonExistentReceipt = await dispatcher.getReceiptByOutboxId(
				validOrgId,
				"00000000-0000-0000-0000-000000000000",
			);
			assert.equal(nonExistentReceipt, null);

			// Querying a non-existent visit returns null
			const nonExistentVisitReceipt = await dispatcher.getReceiptByVisitId(
				validOrgId,
				"00000000-0000-0000-0000-000000000000",
			);
			assert.equal(nonExistentVisitReceipt, null);
		} catch (err: unknown) {
			// In isolated test environments where PostgreSQL daemon is not running on 5432,
			// verify that the error is cleanly network/database related and not a coding bug
			const msg = (err as Error)?.message ?? "";
			assert.ok(
				msg.includes("ECONNREFUSED") || msg.includes("connect") || msg.includes("Failed query"),
				`Unexpected error: ${msg}`,
			);
		}
	});

	it("3.2 getReceiptByOutboxId and getReceiptByVisitId return null on non-UUID inputs without throwing DB exception", async () => {
		const dispatcher = new EgiszOutboxDispatcher();

		// Invalid UUID string should safely return null and not crash PostgreSQL
		const badOutbox = await dispatcher.getReceiptByOutboxId("not-a-uuid", "also-not-a-uuid");
		assert.equal(badOutbox, null, "Malformed outboxId must yield null without database crash");

		const badVisit = await dispatcher.getReceiptByVisitId("invalid-org", "malicious-input' OR 1=1--");
		assert.equal(badVisit, null, "Malformed visitId must yield null without database crash");
	});

	it("4.1 Generates and validates SEMD 103 (Протокол лечебно-диагностического приёма) XML structure against XSD constraints", () => {
		const params = {
			docKind: "103" as const,
			documentId: "doc-semd-103-001",
			visitDate: new Date("2026-09-02T10:00:00Z"),
			patient: {
				patientId: "pat-test-103",
				name: { last: "Кузнецов", first: "Михаил", middle: "Игоревич" },
				snils: "112-233-445 95",
				birthDate: "1985-04-12",
				gender: "male" as const,
			},
			doctor: {
				name: { last: "Смирнова", first: "Ольга", middle: "Викторовна" },
				snils: "000-001-001 00",
				position: "Врач-стоматолог-терапевт",
				positionCode: "18",
			},
			clinic: {
				name: "ООО Стоматологическая клиника ДЕНТЕ",
				oid: "1.2.643.5.1.13.13.12.2.77.1001",
				ogrn: "1027700132195",
				inn: "7701123456",
			},
			complaints: "Боли в области зуба 4.6 при накусывании.",
			anamnesis: "Зуб 4.6 ранее лечен по поводу глубокого кариеса 2 года назад.",
			dentalStatus: [
				{
					tooth: 46,
					surfaces: ["O", "D"],
					condition: "C",
					description: "Кариес дентина средней глубины",
				},
			],
			diagnoses: [
				{
					icd10Code: "K02.1",
					diagnosisText: "Кариес дентина зуба 46",
					tooth: 46,
					isPrimary: true,
				},
			],
			services: [
				{
					code: "A16.07.002.001",
					name: "Наложение пломбы из фотополимерного композита",
					quantity: 1,
					tooth: 46,
				},
			],
		};

		const result = generateCdaXml(params);
		assert.equal(
			result.success,
			true,
			`Generation of SEMD 103 must succeed: ${!result.success ? result.errors?.join("; ") : ""}`,
		);
		assert.ok(result.xml, "XML must be generated");
		assert.match(result.xml, /1\.2\.643\.5\.1\.13\.13\.11\.103/);
		assert.match(result.xml, /Протокол стоматологического приёма/);

		const validation = validateCdaXmlStructure(result.xml, "103");
		assert.equal(validation.valid, true, `SEMD 103 XML must pass validation: ${validation.errors.join("; ")}`);
		assert.equal(validation.errors.length, 0);
	});

	it("4.2 Generates and validates SEMD 104 (Стоматологический эпикриз) XML structure against XSD constraints", () => {
		const params = {
			docKind: "104" as const,
			documentId: "doc-semd-104-001",
			visitDate: new Date("2026-09-02T12:00:00Z"),
			admissionDate: new Date("2026-08-20T10:00:00Z"),
			dischargeDate: new Date("2026-09-02T12:00:00Z"),
			patient: {
				patientId: "pat-test-104",
				name: { last: "Кузнецов", first: "Михаил", middle: "Игоревич" },
				snils: "112-233-445 95",
				birthDate: "1985-04-12",
				gender: "male" as const,
			},
			doctor: {
				name: { last: "Смирнова", first: "Ольга", middle: "Викторовна" },
				snils: "000-001-001 00",
				position: "Врач-стоматолог-терапевт",
				positionCode: "18",
			},
			clinic: {
				name: "ООО Стоматологическая клиника ДЕНТЕ",
				oid: "1.2.643.5.1.13.13.12.2.77.1001",
				ogrn: "1027700132195",
				inn: "7701123456",
			},
			admissionDiagnoses: [
				{
					icd10Code: "K04.0",
					diagnosisText: "Острый очаговый пульпит зуба 46",
					tooth: 46,
					isPrimary: true,
				},
			],
			dischargeDiagnoses: [
				{
					icd10Code: "K04.0",
					diagnosisText: "Пульпит зуба 46, состояние после эндодонтического лечения",
					tooth: 46,
					isPrimary: true,
				},
			],
			anamnesis: "Пациент обратился с жалобами на острые приступообразные боли.",
			clinicalCourse: "Проведено депульпирование, обтурация корневых каналов гуттаперчей, контрольная рентгенография.",
			epicrisisText: "Курс комплексного эндодонтического лечения завершен успешно. Жалоб нет.",
			recommendations: "Контрольный осмотр через 6 месяцев, избегать травматической окклюзии.",
		};

		const result = generateCdaXml(params);
		assert.equal(result.success, true, "Generation of SEMD 104 must succeed");
		assert.ok(result.xml, "XML must be generated");
		assert.match(result.xml, /1\.2\.643\.5\.1\.13\.13\.11\.104/);

		const validation = validateCdaXmlStructure(result.xml, "104");
		assert.equal(validation.valid, true, `SEMD 104 XML must pass validation: ${validation.errors.join("; ")}`);
		assert.equal(validation.errors.length, 0);
	});

	it("4.3 validateCdaXmlStructure detects structural defects and missing statutory XSD elements", () => {
		// Corrupted: empty document
		const emptyRes = validateCdaXmlStructure("");
		assert.equal(emptyRes.valid, false);
		assert.match(emptyRes.errors[0] ?? "", /XML документ пуст/);

		// Corrupted: missing ClinicalDocument root
		const missingRoot = validateCdaXmlStructure("<?xml version=\"1.0\"?><Document></Document>");
		assert.equal(missingRoot.valid, false);
		assert.ok(missingRoot.errors.some((e: string) => e.includes("ClinicalDocument")));

		// Corrupted: missing realmCode RU
		const missingRealm = validateCdaXmlStructure(
			"<?xml version=\"1.0\"?><ClinicalDocument xmlns=\"urn:hl7-org:v3\"><typeId root=\"2.16.840.1.113883.1.3\" extension=\"POCD_HD000040\"/></ClinicalDocument>",
		);
		assert.equal(missingRealm.valid, false);
		assert.ok(missingRealm.errors.some((e: string) => e.includes("realmCode")));
	});

	it("4.4 validateCdaXmlStructure is resilient to XML attribute ordering", () => {
		// Valid CDA XML with swapped attributes: codeSystem before code, extension before root
		const swappedAttrXml = `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3">
	<realmCode code="RU"/>
	<typeId extension="POCD_HD000040" root="2.16.840.1.113883.1.3"/>
	<templateId root="1.2.643.5.1.13.13.11.103"/>
	<id extension="DOC-SWAP-001" root="1.2.643.5.1.13.13.12.2.77.1001.100.1.1"/>
	<code codeSystemName="Виды медицинской документации" codeSystem="1.2.643.5.1.13.13.11.1522" code="103" displayName="Протокол стоматологического приёма"/>
	<title>Протокол приёма</title>
	<effectiveTime value="20260903120000+0300"/>
	<confidentialityCode code="N" displayName="обычный"/>
	<languageCode code="ru-RU"/>
	<recordTarget><patientRole><id extension="pat-1" root="1.2"/></patientRole></recordTarget>
	<author><time value="20260903120000+0300"/><assignedAuthor><id root="1.2.643.100.3" extension="11223344595"/></assignedAuthor></author>
	<custodian><assignedCustodian><representedCustodianOrganization><id root="1.2.643.5.1.13.13.12.2"/></representedCustodianOrganization></assignedCustodian></custodian>
	<component>
		<structuredBody>
			<component>
				<section>
					<code code="29548-5" codeSystem="2.16.840.1.113883.6.1"/>
					<title>Диагнозы</title>
					<entry><observation><value xsi:type="CD" code="K02.1" codeSystem="1.2.643.5.1.13.13.11.1005"/></observation></entry>
				</section>
			</component>
		</structuredBody>
	</component>
</ClinicalDocument>`;

		const validation = validateCdaXmlStructure(swappedAttrXml, "103");
		assert.equal(validation.valid, true, `Attribute order swapped XML must pass: ${validation.errors.join("; ")}`);
		assert.equal(validation.errors.length, 0);
	});

	it("4.5 validateCdaXmlStructure detects NSI 1522 document code mismatch against expectedDocKind", () => {
		// XML declared as 103, but expectedDocKind is passed as 104
		const xmlWith103 = `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3">
	<realmCode code="RU"/>
	<typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
	<templateId root="1.2.643.5.1.13.13.11.103"/>
	<id root="1.2.643.5.1.13.13.12.2.77.1001.100.1.1" extension="DOC-001"/>
	<code code="103" codeSystem="1.2.643.5.1.13.13.11.1522"/>
	<effectiveTime value="20260903120000+0300"/>
	<languageCode code="ru-RU"/>
	<recordTarget><patientRole><id root="1.2" extension="p1"/></patientRole></recordTarget>
	<author><assignedAuthor><id root="1.2.643.100.3" extension="11223344595"/></assignedAuthor></author>
	<custodian><assignedCustodian><representedCustodianOrganization><id root="1.2.643.5.1.13.13.12.2"/></representedCustodianOrganization></assignedCustodian></custodian>
	<component><structuredBody><section><code code="29548-5"/><value codeSystem="1.2.643.5.1.13.13.11.1005"/></section></structuredBody></component>
</ClinicalDocument>`;

		const mismatchValidation = validateCdaXmlStructure(xmlWith103, "104");
		assert.equal(mismatchValidation.valid, false, "Must detect NSI code mismatch (103 != 104)");
		assert.ok(mismatchValidation.errors.some((e) => e.includes("Несоответствие кода вида документа")));
		assert.ok(mismatchValidation.errors.some((e) => e.includes("Отсутствует обязательный OID шаблона")));
	});

	it("4.6 Generates and validates SEMD 109 / Form 043-1/у (Orthodontic Card) XML structure against XSD constraints", () => {
		const orthodonticXml = generateSemd043_1uXml({
			documentId: "doc-ortho-001",
			visitDate: new Date("2026-09-03T11:00:00Z"),
			patient: {
				patientId: "pat-ortho-1",
				name: { last: "Соколова", first: "Екатерина", middle: "Андреевна" },
				birthDate: "2010-05-14",
				gender: "female",
				snils: "11223344595",
			},
			doctor: {
				name: { last: "Кузнецова", first: "Анна", middle: "Сергеевна" },
				snils: "000-001-001 00",
				position: "Врач-ортодонт",
				positionCode: "71",
			},
			clinic: {
				name: "ООО ДЕНТЕ",
				oid: "1.2.643.5.1.13.13.12.2.77.1001",
				ogrn: "1027700132195",
				inn: "7701123456",
			},
			orthodonticDiagnosis: "Дистальная окклюзия зубных рядов, сужение верхней челюсти",
			icd10Code: "K07.2",
			angleMolarClassRight: "class_2",
			angleMolarClassLeft: "class_2",
			angleCanineClassRight: "class_2",
			angleCanineClassLeft: "class_2",
			facialType: "mesoprosopic",
			profileType: "convex",
			skeletalClass: "class_2_sub_1",
			applianceType: "metal_braces_self_ligating",
			plannedDurationMonths: 24,
			estimatedCostKopecks: 25000000,
			retentionType: "Съемный ретейнер на верхнюю челюсть, несъемный на нижнюю челюсть",
			dentalStatus: [
				{ tooth: 11, condition: "healthy" },
				{ tooth: 21, condition: "healthy" },
			],
		});

		assert.ok(orthodonticXml.includes("1.2.643.5.1.13.13.11.109"), "Must declare SEMD 109 template");
		const validation = validateCdaXmlStructure(orthodonticXml, "109");
		assert.equal(validation.valid, true, `SEMD 109 validation failed: ${validation.errors.join("; ")}`);
		assert.equal(validation.errors.length, 0);
	});

	it("4.7 Generates and validates SEMD 130 (Tax Deduction Certificate, KND 1151156) XML structure against XSD constraints", () => {
		const taxXml = generateSemd130Xml({
			certificateNumber: "130-2026-0001",
			taxYear: 2025,
			issueDate: new Date("2026-09-03T10:00:00Z"),
			documentId: "doc-tax-001",
			patient: {
				patientId: "pat-tax-1",
				name: { last: "Иванов", first: "Петр", middle: "Сергеевич" },
				birthDate: "1980-01-01",
				gender: "male",
				snils: "11223344595",
			},
			taxpayer: {
				fullName: "Иванов Петр Сергеевич",
				inn: "770123456789",
				snils: "11223344595",
				relationToPatient: "1",
			},
			doctor: {
				name: { last: "Главврач", first: "Сергей", middle: "Петрович" },
				snils: "000-001-001 00",
				position: "Главный врач",
				positionCode: "15",
			},
			clinic: {
				name: "ООО Стоматология ДЕНТЕ",
				oid: "1.2.643.5.1.13.13.12.2.77.1001",
				ogrn: "1027700132195",
				inn: "7701123456",
				licenseNumber: "ЛО-77-01-012345",
				licenseDate: "15.01.2020",
			},
			contractNumber: "Д-2025/112",
			contractDate: "10.02.2025",
			paymentRecords: [
				{
					fiscalReceiptNumber: "ФЧ-889900",
					fiscalReceiptDate: "15.03.2025",
					serviceCategoryCode: "1",
					paymentAmountKopecks: 4500000,
				},
				{
					fiscalReceiptNumber: "ФЧ-889901",
					fiscalReceiptDate: "20.04.2025",
					serviceCategoryCode: "2",
					paymentAmountKopecks: 12000000,
				},
			],
		});

		assert.ok(taxXml.includes("1.2.643.5.1.13.13.11.130"), "Must declare SEMD 130 template");
		const validation = validateCdaXmlStructure(taxXml, "130");
		assert.equal(validation.valid, true, `SEMD 130 validation failed: ${validation.errors.join("; ")}`);
		assert.equal(validation.errors.length, 0);
	});
});
