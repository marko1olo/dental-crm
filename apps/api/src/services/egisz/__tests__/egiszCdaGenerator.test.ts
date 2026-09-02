import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildEgiszRemdSubmissionPackage,
	canonicalizeCdaXml,
	detachedSignatureSchema,
	egiszRemdPackageSchema,
	generateDentalCdaXml,
	isValidSnils,
	validateCdaParams,
	validateFrmoOid,
	validateIcd10Code,
	validateInn,
	validateOgrn,
	validateOrder804nCode,
} from "../../cda/index.js";
import type { EgiszCdaParams } from "../../egiszCdaGenerator.js";

describe("EGISZ CDA R3 XML Generator & CryptoPro UKEP Validation (apps/api)", () => {
	const validPatientSnils = "112-233-445 95";
	const validDoctorSnils = "000-001-001 00"; // pre-2006 exempt SNILS

	const validFullCdaParams: EgiszCdaParams = {
		patientId: "pat-cda-9901",
		patientName: { first: "Алексей", last: "Смирнов", middle: "Владимирович" },
		patientSnils: validPatientSnils,
		patientBirthDate: "1990-05-15",
		patientGender: "male",
		patientAddress: "г. Москва, ул. Усачёва, д. 29, кв. 14",
		patientPhone: "+79165554321",
		patientEmail: "smirnov@example.ru",
		clinicOid: "1.2.643.5.1.13.13.12.2.77.1001",
		clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		clinicOgrn: "1027700132195",
		clinicInn: "7701123456",
		clinicAddress: "г. Москва, ул. Усачёва, д. 29",
		clinicPhone: "+74957892020",
		clinicEmail: "info@dente-clinic.ru",
		doctorName: { first: "Екатерина", last: "Волкова", middle: "Сергеевна" },
		doctorSnils: validDoctorSnils,
		doctorPosition: "Врач-стоматолог-терапевт",
		doctorPositionCode: "18",
		doctorPhone: "+74957892021",
		doctorEmail: "volkova@dente-clinic.ru",
		icd10Code: "K02.1",
		diagnosisText: "Кариес дентина зуба 1.6",
		diagnosisTooth: "16",
		anamnesis: "Жалобы на кратковременные боли от сладкого и холодного в зубе 1.6 в течение 2 недель.",
		objectiveStatus: "Слизистая бледно-розовая, прикус ортогнатический. Зуб 1.6: глубокая кариозная полость на окклюзионной поверхности.",
		dentalStatus: [
			{
				tooth: "16",
				surfaces: ["O", "D"],
				condition: "C",
				description: "Кариес дентина средней глубины",
			},
			{
				tooth: "15",
				surfaces: ["O"],
				condition: "Pl",
				description: "Световая пломба удовлетворительного состояния",
			},
			{
				tooth: "18",
				condition: "A",
				description: "Отсутствует (удален)",
			},
		],
		services: [
			{
				code: "A11.07.012",
				name: "Инфильтрационная анестезия",
				quantity: 1,
				tooth: "16",
			},
			{
				code: "A16.07.002.001",
				name: "Восстановление зуба пломбой с использованием композита светового отверждения",
				quantity: 1,
				tooth: "16",
			},
		],
		treatmentDescription: "Препарирование полости, медикаментозная обработка 2% хлоргексидином, бондинг OptiBond, пломбирование Ceram.X Duo, полировка.",
		recommendations: "Гигиена полости рта, замена зубной щетки, контрольный осмотр через 6 месяцев.",
		instrumentTrayBarcode: "KRAFT-2026-0819-01",
		visitDate: new Date("2026-08-20T10:30:00.000Z"),
		documentId: "urn:uuid:7c9e6679-7425-40de-944b-e07fc1f90ae7",
		documentVersion: 1,
	};

	it("1. Generates valid CDA R3/R2 XML with Minzdrav SEMD 108 header structure", () => {
		const result = generateDentalCdaXml(validFullCdaParams);
		assert.equal(result.success, true);
		if (!result.success) return;

		const xml = result.xml;

		// Root and Schema
		assert.ok(xml.includes("<ClinicalDocument"), "Root element must be ClinicalDocument");
		assert.ok(xml.includes('realmCode code="RU"'), "Must include Russian realmCode");
		assert.ok(xml.includes('code="108"'), "Document type must be SEMD 108");
		assert.ok(xml.includes('codeSystem="1.2.643.5.1.13.13.11.1522"'), "NSI 1522 doc type OID");

		// Record Target / Patient
		assert.ok(xml.includes(validPatientSnils), "Must contain patient SNILS");
		assert.ok(xml.includes("Смирнов"), "Must contain patient last name");
		assert.ok(xml.includes("Алексей"), "Must contain patient first name");

		// Author & Custodian
		assert.ok(xml.includes("Волкова"), "Must contain doctor last name");
		assert.ok(xml.includes("ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"), "Must contain clinic name");
		assert.ok(xml.includes('extension="1.2.643.5.1.13.13.12.2.77.1001"'), "Must contain clinic OID");
	});

	it("2. Verifies Clinical Sections (Anamnesis, Odontogram, Diagnoses, Order 804n Services)", () => {
		const result = generateDentalCdaXml(validFullCdaParams);
		assert.equal(result.success, true);
		if (!result.success) return;

		const xml = result.xml;

		// Section 1: Anamnesis (LOINC 10164-2)
		assert.ok(xml.includes('code="10164-2"'), "Must include Anamnesis section code");
		assert.ok(xml.includes("Жалобы на кратковременные боли"), "Must render anamnesis text");

		// Section 2: Dental Status / Odontogram (LOINC 29545-1)
		assert.ok(xml.includes('code="29545-1"'), "Must include Odontogram section code");
		assert.ok(xml.includes('code="16"'), "Must reference tooth 16 in targetSiteCode");

		// Section 3: Diagnosis (ICD-10 K02.1)
		assert.ok(xml.includes('code="K02.1"'), "Must include ICD-10 code K02.1");
		assert.ok(xml.includes("Кариес дентина зуба 1.6"), "Must include diagnosis text");

		// Section 4: Services (LOINC 47519-4 / Order 804n)
		assert.ok(xml.includes('code="47519-4"'), "Must include Services Rendered section code");
		assert.ok(xml.includes('code="A11.07.012"'), "Must include anesthesia procedure code");
		assert.ok(xml.includes('code="A16.07.002.001"'), "Must include restoration procedure code");

		// Section 5: Recommendations (LOINC 18776-5)
		assert.ok(xml.includes('code="18776-5"'), "Must include Recommendations section code");
		assert.ok(xml.includes("Гигиена полости рта"), "Must include recommendation text");
	});

	it("3. Validates C14N Canonicalization (BOM stripping, CRLF to LF, whitespace trimming)", () => {
		const rawXml = "\uFEFF<ClinicalDocument>\r\n  <title>Тест</title>\r\n</ClinicalDocument>   ";
		const canonical = canonicalizeCdaXml(rawXml);
		assert.ok(!canonical.startsWith("\uFEFF"), "Must strip UTF-8 BOM");
		assert.ok(!canonical.includes("\r\n"), "Must convert CRLF to LF");
		assert.ok(!canonical.endsWith(" "), "Must trim trailing whitespaces");
		assert.equal(canonical, "<ClinicalDocument>\n  <title>Тест</title>\n</ClinicalDocument>");
	});

	it("4. Validates CryptoPro UKEP CAdES-BES Detached Signature Package", () => {
		const doctorSig = {
			signatureBase64: "MIAGCSqGSIb3DQEHAqCAMIACAQExDzANBglghkgBZQMEAgEFADCABgkqhkiG9w0BBwEAAKCAMII...",
			certificateSerialNumber: "4A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D",
			certificateSubject: "Волкова Екатерина Сергеевна, Врач-стоматолог",
			signedAt: new Date().toISOString(),
			algorithmOid: "1.2.643.7.1.1.1.1",
		};

		const parsedSig = detachedSignatureSchema.safeParse(doctorSig);
		assert.equal(parsedSig.success, true);

		const pkg = buildEgiszRemdSubmissionPackage({
			documentId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
			documentVersion: 1,
			rawXml: "<ClinicalDocument><id extension=\"1\"/></ClinicalDocument>",
			doctorSignature: doctorSig,
			patientSnils: validPatientSnils,
			clinicOid: "1.2.643.5.1.13.13.12.2.77.1001",
			clinicOgrn: "1027700132195",
			docTypeNsiCode: "108",
		});

		assert.equal(pkg.documentId, "7c9e6679-7425-40de-944b-e07fc1f90ae7");
		assert.equal(pkg.doctorSignature.certificateSubject, "Волкова Екатерина Сергеевна, Врач-стоматолог");
		assert.equal(pkg.metadata.patientSnils, validPatientSnils);
		assert.equal(pkg.metadata.docTypeNsiCode, "108");
	});

	it("5. Statutory Requisites Validation (SNILS, OID, INN, OGRN, ICD-10, Order 804n)", () => {
		// SNILS validation
		assert.equal(isValidSnils(validPatientSnils), true);
		assert.equal(isValidSnils("000-000-000 00"), false); // Invalid checksum
		assert.equal(isValidSnils("12345"), false); // Malformed length

		// FRMO OID validation
		assert.equal(validateFrmoOid("1.2.643.5.1.13.13.12.2"), true);
		assert.equal(validateFrmoOid("1.2.643.5.1.13.13.12.2.77.1001"), true);
		assert.equal(validateFrmoOid("invalid-oid-string"), false);

		// OGRN checksum validation
		assert.equal(validateOgrn("1027700132195"), true);
		assert.equal(validateOgrn("1027700132190"), false); // wrong check digit
		assert.equal(validateOgrn("abc"), false);

		// INN checksum validation
		assert.equal(validateInn("123"), false); // Invalid length

		// ICD-10 & Order 804n
		assert.equal(validateIcd10Code("K02.1"), true);
		assert.equal(validateIcd10Code("INVALID"), false);
		assert.equal(validateOrder804nCode("A16.07.002.001"), true);
		assert.equal(validateOrder804nCode("Z999.0"), false);
	});

	it("6. Rejects Invalid CDA Payload Gracefully without Crashing", () => {
		const invalidParams = {
			// Missing required patientId, patientName, patientSnils, icd10Code, etc.
			patientId: "",
		};

		const result = generateDentalCdaXml(invalidParams);
		assert.equal(result.success, false);
		if (!result.success) {
			assert.ok(result.error, "Must return structured Zod error");
		}
	});
});
