/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD CDA R2 OUTPATIENT CARD 043/U TEST SUITE — DENTE DENTAL CRM
 * Tests for XML Generation, OIDs, FDI Odontogram, 804n, ICD-10 & UKEP (63-ФЗ)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALL_FDI_TEETH,
	DEFAULT_EGISZ_CLINIC_PRESET,
	DEFAULT_EGISZ_DOCTOR_PRESET,
	EGISZ_DENTAL_SEMD_TYPES,
	EGISZ_REMD_OIDS,
	FDI_ADULT_TEETH,
	FDI_CHILD_TEETH,
	SAMPLE_043U_PATIENT_PRESET,
	validateOidFormat,
	validateRussianInn,
	validateRussianOgrn,
	validateRussianSnils,
} from "../components/egisz/remdXml/egiszRemdPresets";
import {
	canonicalizeCdaXml,
	createMockGostSignature,
	type Egisz043uPayload,
	escapeXml,
	formatHl7DateTime,
	formatRuDate,
	generateEgisz043uCdaXml,
	generateEgiszXmlFilename,
	generateForm043uPrintHtml,
	generateGostXmlSignatureBlock,
	runEgisz043uPreflight,
} from "../components/egisz/remdXml/egiszRemdEngine";
import { EgiszRemdXmlModal } from "../components/egisz/remdXml/EgiszRemdXmlModal";

describe("1. EGISZ Statutory Identifiers & Checksum Validators", () => {
	it("1.1 Validates Russian SNILS checksum for doctors and patients", () => {
		// Valid SNILS: 123-456-789 64
		const valid = validateRussianSnils("123-456-789 64");
		assert.equal(valid.isValid, true);
		assert.equal(valid.clean, "12345678964");
		assert.equal(valid.formatted, "123-456-789 64");

		// Invalid SNILS
		const invalid = validateRussianSnils("123-456-789 00");
		assert.equal(invalid.isValid, false);
		assert.ok(invalid.error?.includes("Неверное контрольное число"));

		// Incomplete SNILS
		const incomplete = validateRussianSnils("12345");
		assert.equal(incomplete.isValid, false);
	});

	it("1.2 Validates Russian Legal Entity and IP OGRN checksums", () => {
		// Valid legal entity OGRN (13 digits): 1157746123457 -> 115774612345 % 11 = 7 % 10 = 7
		assert.equal(validateRussianOgrn("1157746123457"), true);
		// Invalid OGRN
		assert.equal(validateRussianOgrn("1157746123458"), false);
		assert.equal(validateRussianOgrn("123"), false);
	});

	it("1.3 Validates Russian INN (10-digit legal & 12-digit individual)", () => {
		assert.equal(validateRussianInn("7701234560"), true);
		assert.equal(validateRussianInn("7701234561"), false);
		assert.equal(validateRussianInn("770112345695"), true);
		assert.equal(validateRussianInn("770112345699"), false);
	});

	it("1.4 Validates FRMO / EGISZ OID dot-notation formatting", () => {
		assert.equal(validateOidFormat("1.2.643.5.1.13.13.12.2.77.10425"), true);
		assert.equal(validateOidFormat("1.2.643.100.3"), true);
		assert.equal(validateOidFormat("invalid.oid"), false);
		assert.equal(validateOidFormat(""), false);
	});
});

describe("2. HL7 CDA R2 XML Generation for Form 043/u (СЭМД 303 / 302 / 105)", () => {
	const samplePayload: Egisz043uPayload = {
		docTypeCode: "303",
		documentUuid: "UUID-TEST-043-9876",
		documentVersion: 1,
		encounterDate: new Date("2026-08-20T14:30:00Z"),
		clinic: DEFAULT_EGISZ_CLINIC_PRESET,
		doctor: DEFAULT_EGISZ_DOCTOR_PRESET,
		patient: SAMPLE_043U_PATIENT_PRESET,
		complaints: "Боли в зубе 46 при приеме холодной пищи",
		anamnesisMorbi: "Боли беспокоят около недели",
		anamnesisVitae: "Соматически здоров, аллергий нет",
		toothStates: {
			46: "Caries",
			36: "Filling",
			16: "Crown",
			48: "Retained",
			38: "Extracted",
		},
		toothSurfaces: {
			46: ["O", "D"],
			36: ["O"],
		},
		diagnoses: [
			{
				icd10Code: "K02.1",
				icd10Name: "Кариес дентина",
				isPrimary: true,
				tooth: 46,
				surfaces: ["O", "D"],
			},
			{
				icd10Code: "K00.6",
				icd10Name: "Ретенция зуба",
				isPrimary: false,
				tooth: 48,
			},
		],
		procedures: [
			{
				code: "B01.065.001",
				name: "Прием врача-стоматолога-терапевта первичный",
			},
			{
				code: "A16.07.002.001",
				name: "Восстановление зуба пломбой I класс по Блэку",
				tooth: 46,
			},
		],
		treatmentProtocolDescription: "Проведено препарирование кариозной полости зуба 46, фотополимерная реставрация.",
		recommendations: "Контрольный осмотр через 6 месяцев, гигиена полости рта.",
		nextVisitDate: new Date("2026-09-01"),
	};

	it("2.1 Generates valid HL7 CDA R2 document envelope and statutory headers", () => {
		const xml = generateEgisz043uCdaXml(samplePayload);

		// Root and namespaces
		assert.ok(xml.includes('xmlns="urn:hl7-org:v3"'));
		assert.ok(xml.includes('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'));
		assert.ok(xml.includes('<realmCode code="RU"/>'));
		assert.ok(xml.includes('<typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>'));
		assert.ok(xml.includes(`<templateId root="${EGISZ_REMD_OIDS.SEMD_TEMPLATE_DENTAL_043U}"/>`));

		// Document code and title
		assert.ok(xml.includes(`code="${EGISZ_DENTAL_SEMD_TYPES["303"].nsiCode}"`));
		assert.ok(xml.includes(`codeSystem="${EGISZ_REMD_OIDS.NSI_SEMD_DOC_TYPES}"`));
		assert.ok(xml.includes("Форма 043/у"));

		// Language and confidentiality
		assert.ok(xml.includes('<languageCode code="ru-RU"/>'));
		assert.ok(xml.includes('<confidentialityCode code="N"'));
	});

	it("2.2 Correctly serializes Patient, Doctor, Clinic and Encompassing Encounter", () => {
		const xml = generateEgisz043uCdaXml(samplePayload);

		// Patient recordTarget
		assert.ok(xml.includes("<recordTarget>"));
		assert.ok(xml.includes(`<family>Соколова</family>`));
		assert.ok(xml.includes(`<given>Анна</given>`));
		assert.ok(xml.includes(`<identity:Patronymic>Владимировна</identity:Patronymic>`));
		assert.ok(xml.includes(`<administrativeGenderCode code="2"`)); // Female
		assert.ok(xml.includes(`<birthTime value="19880614"/>`));
		assert.ok(xml.includes(`extension="12345678964"`)); // Clean SNILS

		// Author (Doctor)
		assert.ok(xml.includes("<author>"));
		assert.ok(xml.includes(`<family>Иванов</family>`));
		assert.ok(xml.includes(`<given>Сергей</given>`));
		assert.ok(xml.includes(`code="71"`)); // Врач-стоматолог-терапевт

		// Custodian (Clinic)
		assert.ok(xml.includes("<custodian>"));
		assert.ok(xml.includes(`<name>ООО &quot;Стоматологический Центр ДЕНТЕ Премиум&quot;</name>`));
		assert.ok(xml.includes(`extension="${DEFAULT_EGISZ_CLINIC_PRESET.clinicOid}"`));
		assert.ok(xml.includes(`extension="${DEFAULT_EGISZ_CLINIC_PRESET.clinicOgrn}"`));

		// Legal Authenticator
		assert.ok(xml.includes("<legalAuthenticator>"));
		assert.ok(xml.includes('<signatureCode code="S"/>'));

		// ComponentOf (Encounter)
		assert.ok(xml.includes("<componentOf>"));
		assert.ok(xml.includes("<encompassingEncounter>"));
		assert.ok(xml.includes(`code="1"`));
	});

	it("2.3 Serializes all 6 statutory clinical sections with LOINC & FDI observations", () => {
		const xml = generateEgisz043uCdaXml(samplePayload);

		// Section 1: Complaints
		assert.ok(xml.includes(`code="${EGISZ_REMD_OIDS.LOINC_COMPLAINTS}"`));
		assert.ok(xml.includes("Боли в зубе 46 при приеме холодной пищи"));

		// Section 2: Anamnesis
		assert.ok(xml.includes(`code="${EGISZ_REMD_OIDS.LOINC_ANAMNESIS}"`));
		assert.ok(xml.includes("Боли беспокоят около недели"));

		// Section 3: Odontogram Formula (FDI)
		assert.ok(xml.includes(`code="${EGISZ_REMD_OIDS.LOINC_DENTAL_ODONTOGRAM}"`));
		assert.ok(xml.includes('displayName="Зуб 46"'));
		assert.ok(xml.includes('displayName="Зуб 36"'));
		assert.ok(xml.includes('displayName="Зуб 16"'));
		assert.ok(xml.includes('displayName="Зуб 48"'));
		assert.ok(xml.includes('displayName="Зуб 38"'));
		assert.ok(xml.includes('surfaces="O,D"'));

		// Section 4: Diagnoses (ICD-10)
		assert.ok(xml.includes(`code="${EGISZ_REMD_OIDS.LOINC_DIAGNOSIS_SECTION}"`));
		assert.ok(xml.includes('code="K02.1"'));
		assert.ok(xml.includes('code="K00.6"'));

		// Section 5: Procedures (804n)
		assert.ok(xml.includes(`code="${EGISZ_REMD_OIDS.LOINC_SERVICES_RENDERED}"`));
		assert.ok(xml.includes('code="B01.065.001"'));
		assert.ok(xml.includes('code="A16.07.002.001"'));

		// Section 6: Recommendations
		assert.ok(xml.includes(`code="${EGISZ_REMD_OIDS.LOINC_RECOMMENDATIONS}"`));
		assert.ok(xml.includes("Контрольный осмотр через 6 месяцев"));
	});
});

describe("3. Preflight EGISZ REMD Gate Validator", () => {
	it("3.1 Returns 100% valid report for fully compliant 043/u payload with UKEP", () => {
		const sig = createMockGostSignature(
			DEFAULT_EGISZ_DOCTOR_PRESET.doctorFullName,
			DEFAULT_EGISZ_DOCTOR_PRESET.doctorSnils,
			DEFAULT_EGISZ_CLINIC_PRESET.clinicName
		);

		const validPayload: Egisz043uPayload = {
			docTypeCode: "303",
			clinic: DEFAULT_EGISZ_CLINIC_PRESET,
			doctor: DEFAULT_EGISZ_DOCTOR_PRESET,
			patient: SAMPLE_043U_PATIENT_PRESET,
			complaints: "Жалобы на дефект пломбы",
			anamnesisMorbi: "Без особенностей",
			anamnesisVitae: "Без соматических отягощений",
			toothStates: { 11: "Caries", 21: "Healthy" },
			diagnoses: [{ icd10Code: "K02.1", icd10Name: "Кариес дентина", isPrimary: true, tooth: 11 }],
			procedures: [{ code: "A16.07.002.001", name: "Пломбирование зуба", tooth: 11 }],
			recommendations: "Гигиена полости рта",
			doctorSignature: sig,
		};

		const report = runEgisz043uPreflight(validPayload);
		assert.equal(report.isValid, true);
		assert.equal(report.canSendToRemd, true);
		assert.equal(report.failedCount, 0);
		assert.ok(report.scorePercent >= 90);
	});

	it("3.2 Detects missing Clinic OID and invalid Doctor SNILS as blocking failures", () => {
		const brokenPayload: Egisz043uPayload = {
			docTypeCode: "303",
			clinic: { ...DEFAULT_EGISZ_CLINIC_PRESET, clinicOid: "" }, // Missing OID
			doctor: { ...DEFAULT_EGISZ_DOCTOR_PRESET, doctorSnils: "123-456-789 00" }, // Bad SNILS
			patient: { ...SAMPLE_043U_PATIENT_PRESET, patientSnils: "", patientPassport: "", patientPolisOms: "" }, // No identity
			complaints: "",
			anamnesisMorbi: "",
			anamnesisVitae: "",
			toothStates: {},
			diagnoses: [], // Missing diagnoses
			procedures: [], // Missing procedures
			recommendations: "",
		};

		const report = runEgisz043uPreflight(brokenPayload);
		assert.equal(report.isValid, false);
		assert.equal(report.canSendToRemd, false);
		assert.ok(report.failedCount >= 4);

		// Check specific failed checks
		const failedIds = report.checks.filter((c) => c.status === "failed").map((c) => c.id);
		assert.ok(failedIds.includes("mo_oid_missing"));
		assert.ok(failedIds.includes("doc_snils_invalid"));
		assert.ok(failedIds.includes("pat_ident_missing"));
		assert.ok(failedIds.includes("diag_missing"));
	});
});

describe("4. XMLDSig (63-ФЗ) GOST Signature & Canonicalization", () => {
	it("4.1 Generates structured XMLDSig detached signature block for GOST R 34.10-2012", () => {
		const mockSig = createMockGostSignature(
			"Петров Иван Васильевич",
			"123-456-789 64",
			'ООО "Денте"'
		);

		const sigBlock = generateGostXmlSignatureBlock(mockSig, "#DOC-043-1");
		assert.ok(sigBlock.includes('<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">'));
		assert.ok(sigBlock.includes('Algorithm="urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34102012-256"'));
		assert.ok(sigBlock.includes('Algorithm="urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34112012-256"'));
		assert.ok(sigBlock.includes(`<ds:X509SerialNumber>${mockSig.certificateSerialNumber}</ds:X509SerialNumber>`));
		assert.ok(sigBlock.includes(`<ds:SignatureValue>${mockSig.signatureBase64}</ds:SignatureValue>`));
	});

	it("4.2 Canonicalizes CDA XML removing BOM and normalizing newlines", () => {
		const dirtyXml = "\uFEFF<root>\r\n\t<child attr=\"1\" />\r\n</root>  \r\n";
		const cleaned = canonicalizeCdaXml(dirtyXml);
		assert.ok(!cleaned.startsWith("\uFEFF"));
		assert.ok(!cleaned.includes("\r"));
		assert.equal(cleaned.endsWith("</root>"), true);
	});

	it("4.3 Generates statutory EGISZ filename format", () => {
		const payload: Egisz043uPayload = {
			docTypeCode: "303",
			clinic: DEFAULT_EGISZ_CLINIC_PRESET,
			doctor: DEFAULT_EGISZ_DOCTOR_PRESET,
			patient: SAMPLE_043U_PATIENT_PRESET,
			complaints: "",
			anamnesisMorbi: "",
			anamnesisVitae: "",
			toothStates: {},
			diagnoses: [],
			procedures: [],
			recommendations: "",
		};

		const filename = generateEgiszXmlFilename(payload);
		assert.ok(filename.startsWith("SEMD_303_1.2.643.5.1.13.13.12.2.77.10425_"));
		assert.ok(filename.endsWith(".xml"));
	});
});

describe("5. Printable Form 043/u HTML & Odontogram System", () => {
	it("5.1 Generates statutory Form 043/u printable document", () => {
		const payload: Egisz043uPayload = {
			docTypeCode: "303",
			clinic: DEFAULT_EGISZ_CLINIC_PRESET,
			doctor: DEFAULT_EGISZ_DOCTOR_PRESET,
			patient: SAMPLE_043U_PATIENT_PRESET,
			complaints: "Дефект пломбы",
			anamnesisMorbi: "Без особенностей",
			anamnesisVitae: "Без соматических отягощений",
			toothStates: { 11: "Caries", 46: "Filling" },
			toothSurfaces: { 11: ["V"], 46: ["O"] },
			diagnoses: [{ icd10Code: "K02.1", icd10Name: "Кариес дентина", isPrimary: true, tooth: 11 }],
			procedures: [{ code: "A16.07.002.001", name: "Пломбирование зуба", tooth: 11 }],
			recommendations: "Гигиена полости рта",
		};

		const html = generateForm043uPrintHtml(payload);
		assert.ok(html.includes("<!DOCTYPE html>"));
		assert.ok(html.includes("МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (ФОРМА № 043/У)"));
		assert.ok(html.includes("Соколова Анна Владимировна"));
		assert.ok(html.includes("ООО &quot;Стоматологический Центр ДЕНТЕ Премиум&quot;"));
		assert.ok(html.includes("K02.1"));
	});

	it("5.2 FDI Tooth Nomenclature lists all 32 adult and 20 child teeth correctly", () => {
		assert.equal(FDI_ADULT_TEETH.length, 32);
		assert.equal(FDI_CHILD_TEETH.length, 20);
		assert.equal(ALL_FDI_TEETH.length, 52);
		assert.ok(FDI_ADULT_TEETH.includes(11));
		assert.ok(FDI_ADULT_TEETH.includes(48));
		assert.ok(FDI_CHILD_TEETH.includes(55));
		assert.ok(FDI_CHILD_TEETH.includes(85));
	});

	it("5.3 Modal component is exported and callable", () => {
		assert.equal(typeof EgiszRemdXmlModal, "function");
	});
});
