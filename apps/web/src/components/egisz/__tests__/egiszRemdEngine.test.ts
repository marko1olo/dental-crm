/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD & FNS TAX DEDUCTION ENGINE UNIT TESTS — DENTE DENTAL CRM
 * Tests for HL7 CDA R2 XML, FNS КНД 1151156, OIDs, Preflights & GOST UKEP
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALL_FDI_TEETH,
	DEFAULT_EGISZ_CLINIC_PRESET,
	DEFAULT_EGISZ_DOCTOR_PRESET,
	DENTAL_SURFACES,
	DENTAL_TOOTH_STATUS_DICTIONARY,
	EGISZ_DENTAL_SEMD_TYPES,
	EGISZ_REMD_OIDS,
	FDI_ADULT_TEETH,
	FDI_CHILD_TEETH,
	FRMR_DOCTOR_POSITIONS,
	SAMPLE_043U_PATIENT_PRESET,
	SAMPLE_DENTAL_SEMD_105_PRESET,
	SAMPLE_FNS_TAX_1151156_PRESET,
	canonicalizeCdaXml,
	createMockGostSignature,
	createMockMoGostSignature,
	escapeXml,
	formatHl7DateTime,
	formatKopecksToRubles,
	formatRuDate,
	generateEgiszDentalCdaXml,
	generateEgiszXmlFilename,
	generateFnsTaxCertificatePrintHtml,
	generateFnsTaxCertificateXml,
	generateFnsTaxXmlFilename,
	generateForm043uPrintHtml,
	generateGostSignatureStampHtml,
	generateGostSignatureStampSvg,
	generateGostXmlSignatureBlock,
	parseRublesToKopecks,
	runEgisz043uPreflight,
	runFnsTaxCertificatePreflight,
	validateOidFormat,
	validateRussianInn,
	validateRussianOgrn,
	validateRussianSnils,
	validateXmlStructure,
} from "../egiszRemdEngine";

describe("1. Statutory Identifiers & Checksum Validators", () => {
	it("1.1 Validates Russian SNILS checksum for doctor and patient", () => {
		// Valid SNILS: 123-456-789 64
		const valid = validateRussianSnils("123-456-789 64");
		assert.equal(valid.isValid, true);
		assert.equal(valid.clean, "12345678964");
		assert.equal(valid.formatted, "123-456-789 64");

		// Invalid SNILS checksum
		const invalid = validateRussianSnils("123-456-789 00");
		assert.equal(invalid.isValid, false);
		assert.ok(invalid.error?.includes("Неверное контрольное число"));

		// Incomplete SNILS
		const incomplete = validateRussianSnils("12345");
		assert.equal(incomplete.isValid, false);
	});

	it("1.2 Validates Russian Legal Entity (13 digits) and IP (15 digits) OGRN checksums", () => {
		// Valid Legal OGRN: 1157746123457 (115774612345 % 11 = 7 % 10 = 7)
		assert.equal(validateRussianOgrn("1157746123457"), true);
		// Invalid Legal OGRN
		assert.equal(validateRussianOgrn("1157746123450"), false);

		// Valid IP OGRN (15 digits): 315774600123450 (31577460012345 % 13 = 0 % 10 = 0)
		assert.equal(validateRussianOgrn("315774600123450"), true);
		// Invalid IP OGRN
		assert.equal(validateRussianOgrn("315774600123459"), false);
	});

	it("1.3 Validates Russian INN for Legal Entity (10 digits) and Individual (12 digits)", () => {
		// Valid 10-digit legal INN: 7701234560
		assert.equal(validateRussianInn("7701234560"), true);
		// Invalid 10-digit legal INN
		assert.equal(validateRussianInn("7701234569"), false);

		// Valid 12-digit individual INN: 772412345636
		assert.equal(validateRussianInn("772412345636"), true);
		// Invalid 12-digit individual INN
		assert.equal(validateRussianInn("772412345670"), false);
	});

	it("1.4 Validates Federal OID dot notation syntax", () => {
		assert.equal(validateOidFormat("1.2.643.5.1.13.13.12.2.77.10425"), true);
		assert.equal(validateOidFormat("1.2.643.100.3"), true);
		assert.equal(validateOidFormat("2.16.840.1.113883.1.3"), true);

		// Invalid OIDs
		assert.equal(validateOidFormat(""), false);
		assert.equal(validateOidFormat("invalid.oid"), false);
		assert.equal(validateOidFormat("1.2.643.01.2"), false); // leading zero in component
	});
});

describe("2. Exact Financial Math & Kopeck Formatting", () => {
	it("2.1 Converts integer kopecks to rubles string with 2 decimal places", () => {
		assert.equal(formatKopecksToRubles(1250000), "12500.00");
		assert.equal(formatKopecksToRubles(8500050), "85000.50");
		assert.equal(formatKopecksToRubles(99), "0.99");
		assert.equal(formatKopecksToRubles(5), "0.05");
		assert.equal(formatKopecksToRubles(0), "0.00");
		assert.equal(formatKopecksToRubles(-500), "0.00");
	});

	it("2.2 Parses rubles string or number into integer kopecks", () => {
		assert.equal(parseRublesToKopecks("12500.00"), 1250000);
		assert.equal(parseRublesToKopecks("12500,50"), 1250050);
		assert.equal(parseRublesToKopecks("0.99"), 99);
		assert.equal(parseRublesToKopecks(85000.5), 8500050);
		assert.equal(parseRublesToKopecks(""), 0);
		assert.equal(parseRublesToKopecks("-100"), 0);
	});
});

describe("3. HL7 CDA R2 Dental SEMD XML Generation (Вид 105 / 302 / 303 / 043/у)", () => {
	it("3.1 Generates complete CDA R2 XML for SEMD 105 Consultation Protocol", () => {
		const xml = generateEgiszDentalCdaXml(SAMPLE_DENTAL_SEMD_105_PRESET);

		// Header & Identity tags
		assert.ok(xml.includes('<ClinicalDocument xmlns="urn:hl7-org:v3"'));
		assert.ok(xml.includes('<realmCode code="RU"/>'));
		assert.ok(xml.includes('<typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>'));
		assert.ok(xml.includes(`templateId root="${EGISZ_DENTAL_SEMD_TYPES["105"].templateRoot}"`));
		assert.ok(xml.includes('code code="105" codeSystem="1.2.643.5.1.13.13.11.1005"'));

		// Patient info
		assert.ok(xml.includes('<family>Соколова</family>'));
		assert.ok(xml.includes('<given>Анна</given>'));
		assert.ok(xml.includes('<identity:Patronymic>Владимировна</identity:Patronymic>'));
		assert.ok(xml.includes('administrativeGenderCode code="2"')); // Female

		// Doctor info
		assert.ok(xml.includes('<family>Иванов</family>'));
		assert.ok(xml.includes('<given>Сергей</given>'));
		assert.ok(xml.includes('<identity:Patronymic>Павлович</identity:Patronymic>'));
		assert.ok(xml.includes('code="71"')); // Dentist therapist code

		// Clinic info
		assert.ok(xml.includes(`id root="${EGISZ_REMD_OIDS.FRMO_MO_ROOT}"`));
		assert.ok(xml.includes(`id root="${EGISZ_REMD_OIDS.OGRN_LEGAL}"`));
		assert.ok(xml.includes(`id root="${EGISZ_REMD_OIDS.INN}"`));

		// 6 Clinical Sections (LOINC)
		assert.ok(xml.includes(`code="${EGISZ_REMD_OIDS.LOINC_COMPLAINTS}"`)); // Complaints
		assert.ok(xml.includes(`code="${EGISZ_REMD_OIDS.LOINC_ANAMNESIS}"`)); // Anamnesis
		assert.ok(xml.includes(`code="${EGISZ_REMD_OIDS.LOINC_DENTAL_ODONTOGRAM}"`)); // Odontogram
		assert.ok(xml.includes(`code="${EGISZ_REMD_OIDS.LOINC_DIAGNOSIS_SECTION}"`)); // Diagnoses
		assert.ok(xml.includes(`code="${EGISZ_REMD_OIDS.LOINC_SERVICES_RENDERED}"`)); // Services
		assert.ok(xml.includes(`code="${EGISZ_REMD_OIDS.LOINC_RECOMMENDATIONS}"`)); // Recommendations

		// Clinical Content: ICD-10 K02.1 & 804n B01.065.001
		assert.ok(xml.includes('code="K02.1"'));
		assert.ok(xml.includes('code="B01.065.001"'));
		assert.ok(xml.includes('targetSiteCode code="46"')); // Tooth 46
	});

	it("3.2 Escapes special XML characters properly", () => {
		const payload = {
			...SAMPLE_DENTAL_SEMD_105_PRESET,
			complaints: 'Боли & чувствительность при температуре < 10°C и > 40°C, "стреляющие" боли',
		};
		const xml = generateEgiszDentalCdaXml(payload);
		assert.ok(xml.includes("Боли &amp; чувствительность"));
		assert.ok(xml.includes("&lt; 10"));
		assert.ok(xml.includes("&gt; 40"));
		assert.ok(xml.includes("&quot;стреляющие&quot;"));
	});

	it("3.3 Generates complete CDA R2 XML for SEMD 106 Epicrisis and SEMD 303 Procedure Protocol", () => {
		// SEMD 106 Epicrisis
		const epicrisisPayload = {
			...SAMPLE_DENTAL_SEMD_105_PRESET,
			docTypeCode: "106" as const,
		};
		const xml106 = generateEgiszDentalCdaXml(epicrisisPayload);
		assert.ok(xml106.includes('code code="106"'));
		assert.ok(xml106.includes("Выписной эпикриз"));

		// SEMD 303 Dental Procedure Protocol
		const procPayload = {
			...SAMPLE_DENTAL_SEMD_105_PRESET,
			docTypeCode: "303" as const,
			treatmentProtocolDescription: "Проведено препарирование кариозной полости зуба 46, медикаментозная обработка 2% хлоргексидином, световая пломба Filtek Ultimate.",
		};
		const xml303 = generateEgiszDentalCdaXml(procPayload);
		assert.ok(xml303.includes('code code="76"'));
		assert.ok(xml303.includes("Протокол стоматологического лечения и вмешательства"));
		assert.ok(xml303.includes("Filtek Ultimate"));
	});

	it("3.4 Deterministic W3C C14N Canonicalization strips BOM and normalizes line breaks", () => {
		const uncanonicalXml = "\uFEFF<?xml version=\"1.0\" encoding=\"UTF-8\"?>\r\n<ClinicalDocument>\r\n\t<realmCode code=\"RU\"/>\r\n</ClinicalDocument>\r\n";
		const canon = canonicalizeCdaXml(uncanonicalXml);
		assert.equal(canon.startsWith("\uFEFF"), false);
		assert.equal(canon.includes("\r"), false);
		assert.ok(canon.includes("\n"));
		assert.equal(canon, '<?xml version="1.0" encoding="UTF-8"?>\n<ClinicalDocument>\n\t<realmCode code="RU"/>\n</ClinicalDocument>');
	});

	it("3.5 Validates NSI dictionaries: FDI adult/child teeth, FRMR positions and tooth statuses", () => {
		assert.equal(FDI_ADULT_TEETH.length, 32);
		assert.equal(FDI_CHILD_TEETH.length, 20);
		assert.equal(ALL_FDI_TEETH.length, 52);
		assert.ok(FRMR_DOCTOR_POSITIONS.some((p) => p.code === "71" && p.name.includes("терапевт")));
		assert.ok(FRMR_DOCTOR_POSITIONS.some((p) => p.code === "15" && p.name.includes("Главный врач")));
		assert.equal(DENTAL_SURFACES.length, 6);
		assert.ok(DENTAL_TOOTH_STATUS_DICTIONARY.Caries?.egiszCode === "1");
		assert.ok(DENTAL_TOOTH_STATUS_DICTIONARY.Pulpitis?.egiszCode === "2");
	});
});

describe("4. FNS Tax Deduction Certificate XML Generation (КНД 1151156 / ЕД-7-11/755@)", () => {
	it("4.1 Generates statutory FNS XML with exact kopeck amounts and codes 1 and 2", () => {
		const xml = generateFnsTaxCertificateXml(SAMPLE_FNS_TAX_1151156_PRESET);

		// Root and Metadata
		assert.ok(xml.includes('<Файл'));
		assert.ok(xml.includes('ВерсФорм="5.01"'));
		assert.ok(xml.includes('ВерсПрог="DenteCRM-EGISZ 1.0"'));
		assert.ok(xml.includes('<СвОрг'));
		assert.ok(xml.includes('ИННЮЛ="7701234560"'));
		assert.ok(xml.includes('ОГРН="1157746123457"'));

		// Document header
		assert.ok(xml.includes('КНД="1151156"'));
		assert.ok(xml.includes(`НомДок="${SAMPLE_FNS_TAX_1151156_PRESET.documentNumber}"`));
		assert.ok(xml.includes('НалогПериод="2026"'));

		// Taxpayer info
		assert.ok(xml.includes('<СвФЛ'));
		assert.ok(xml.includes('ИННФЛ="772412345678"'));
		assert.ok(xml.includes('Фамилия="Соколов"'));
		assert.ok(xml.includes('Имя="Владимир"'));
		assert.ok(xml.includes('Отчество="Николаевич"'));

		// Patient & Relationship info
		assert.ok(xml.includes('<Пациент'));
		assert.ok(xml.includes('РодствоКод="4"')); // Child
		assert.ok(xml.includes('Фамилия="Соколова"'));
		assert.ok(xml.includes('Имя="Анна"'));

		// Payments breakdown
		assert.ok(xml.includes('СуммаКод1="12500.00"')); // Standard care: 12 500.00
		assert.ok(xml.includes('СуммаКод2="85000.50"')); // Expensive care: 85 000.50
		assert.ok(xml.includes('ИтогоСумма="97500.50"')); // Total: 97 500.50

		// Signer info
		assert.ok(xml.includes('<Подписант ПрПодп="1"'));
		assert.ok(xml.includes('Фамилия="Смирнова"'));
	});
});

describe("5. XML Structure & Well-Formedness Validator", () => {
	it("5.1 Validates well-formed CDA R2 XML and detects tag balancing", () => {
		const xml = generateEgiszDentalCdaXml(SAMPLE_DENTAL_SEMD_105_PRESET);
		const result = validateXmlStructure(xml);

		assert.equal(result.isValid, true);
		assert.equal(result.errors.length, 0);
		assert.equal(result.docTypeDetected, "cda_r2");
		assert.ok(result.tagCount > 20);
	});

	it("5.2 Validates well-formed FNS Tax Certificate XML", () => {
		const xml = generateFnsTaxCertificateXml(SAMPLE_FNS_TAX_1151156_PRESET);
		const result = validateXmlStructure(xml);

		assert.equal(result.isValid, true);
		assert.equal(result.errors.length, 0);
		assert.equal(result.docTypeDetected, "fns_knd_1151156");
	});

	it("5.3 Detects unclosed XML tags and syntax errors", () => {
		const brokenXml = '<ClinicalDocument><realmCode code="RU"><author></ClinicalDocument>';
		const result = validateXmlStructure(brokenXml);

		assert.equal(result.isValid, false);
		assert.ok(result.errors.length > 0);
	});
});

describe("6. Preflight Validation Engines", () => {
	it("6.1 Runs Preflight for full valid Dental SEMD 105 payload", () => {
		const report = runEgisz043uPreflight(SAMPLE_DENTAL_SEMD_105_PRESET);

		assert.equal(report.isValid, true);
		assert.equal(report.failedCount, 0);
		assert.ok(report.scorePercent >= 80);
	});

	it("6.2 Detects failed checks on missing clinic OID, invalid SNILS, and missing diagnosis", () => {
		const brokenPayload = {
			...SAMPLE_DENTAL_SEMD_105_PRESET,
			clinic: { ...DEFAULT_EGISZ_CLINIC_PRESET, clinicOid: "" },
			doctor: { ...DEFAULT_EGISZ_DOCTOR_PRESET, doctorSnils: "111" },
			diagnoses: [],
		};
		const report = runEgisz043uPreflight(brokenPayload);

		assert.equal(report.isValid, false);
		assert.ok(report.failedCount >= 2);
		assert.ok(report.checks.some((c) => c.id === "mo_oid_missing" && c.status === "failed"));
		assert.ok(report.checks.some((c) => c.id === "doc_snils_invalid" && c.status === "failed"));
		assert.ok(report.checks.some((c) => c.id === "diag_missing" && c.status === "failed"));
	});

	it("6.3 Runs Preflight for full valid FNS Tax Certificate payload", () => {
		const report = runFnsTaxCertificatePreflight(SAMPLE_FNS_TAX_1151156_PRESET);

		assert.equal(report.isValid, true);
		assert.equal(report.failedCount, 0);
		assert.equal(report.scorePercent, 100);
	});

	it("6.4 Detects failed checks in FNS Tax Certificate on invalid taxpayer and empty payments", () => {
		const brokenFns = {
			...SAMPLE_FNS_TAX_1151156_PRESET,
			taxpayer: { fullName: "Иванов", inn: "", snils: "" },
			payments: [],
		};
		const report = runFnsTaxCertificatePreflight(brokenFns);

		assert.equal(report.isValid, false);
		assert.ok(report.checks.some((c) => c.id === "fns_tp_ident_missing" && c.status === "failed"));
		assert.ok(report.checks.some((c) => c.id === "fns_payments_empty" && c.status === "failed"));
	});
});

describe("7. UKEP Electronic Signatures & Visual Stamps (63-ФЗ / ГОСТ Р 7.0.97-2016)", () => {
	it("7.1 Creates mock GOST R 34.10-2012 signature containers for doctor and MO", () => {
		const docSig = createMockGostSignature("Иванов Сергей Павлович", "123-456-789 64", 'ООО "ДЕНТЕ"');
		assert.ok(docSig.signatureBase64.length > 20);
		assert.ok(docSig.certificateSerialNumber.startsWith("00E4A28B"));
		assert.equal(docSig.algorithmOid, EGISZ_REMD_OIDS.GOST_3410_2012_256);

		const moSig = createMockMoGostSignature('ООО "ДЕНТЕ"', "1157746123457");
		assert.ok(moSig.signatureBase64.length > 20);
		assert.ok(moSig.certificateSerialNumber.startsWith("00B17F9A"));
	});

	it("7.2 Generates XMLDSig signature block", () => {
		const docSig = createMockGostSignature("Иванов С.П.", "123-456-789 64", "Клиника");
		const xmlSig = generateGostXmlSignatureBlock(docSig, "DOC-123");

		assert.ok(xmlSig.includes('<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#"'));
		assert.ok(xmlSig.includes('<ds:SignatureMethod Algorithm="urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34102012-256"/>'));
		assert.ok(xmlSig.includes(`<ds:SignatureValue>${escapeXml(docSig.signatureBase64)}</ds:SignatureValue>`));
	});

	it("7.3 Generates GOST R 7.0.97-2016 visual signature stamp (HTML & SVG)", () => {
		const htmlStamp = generateGostSignatureStampHtml({
			signerName: "Иванов Сергей Павлович",
			certificateNumber: "00E4A28B12345678",
			validFrom: "2025-01-01T00:00:00Z",
			validTo: "2027-12-31T23:59:59Z",
			orgName: 'ООО "ДЕНТЕ"',
		});
		assert.ok(htmlStamp.includes("ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ"));
		assert.ok(htmlStamp.includes("00E4A28B12345678"));
		assert.ok(htmlStamp.includes("Иванов Сергей Павлович"));

		const svgStamp = generateGostSignatureStampSvg({
			signerName: "Иванов Сергей Павлович",
			certificateNumber: "00E4A28B12345678",
			validFrom: "2025-01-01T00:00:00Z",
			validTo: "2027-12-31T23:59:59Z",
			orgName: 'ООО "ДЕНТЕ"',
		});
		assert.ok(svgStamp.startsWith("<svg"));
		assert.ok(svgStamp.includes("ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ"));
	});
});

describe("8. Printable HTML Forms & Standard File Names", () => {
	it("8.1 Generates Form 043/u printable HTML containing odontogram", () => {
		const html = generateForm043uPrintHtml(SAMPLE_DENTAL_SEMD_105_PRESET);
		assert.ok(html.includes("МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (ФОРМА № 043/У)"));
		assert.ok(html.includes("ЗУБНАЯ ФОРМУЛА (FDI / ISO 3950)"));
		assert.ok(html.includes("K02.1"));
	});

	it("8.2 Generates FNS Tax Certificate (КНД 1151156) printable HTML", () => {
		const html = generateFnsTaxCertificatePrintHtml(SAMPLE_FNS_TAX_1151156_PRESET);
		assert.ok(html.includes("Форма по КНД 1151156"));
		assert.ok(html.includes("СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ"));
		assert.ok(html.includes("ИТОГО К ВЫЧЕТУ: 97500.50 руб."));
	});

	it("8.3 Generates standardized filenames for EGISZ and FNS files", () => {
		const cdaFilename = generateEgiszXmlFilename(SAMPLE_DENTAL_SEMD_105_PRESET);
		assert.ok(cdaFilename.startsWith("SEMD_105_"));
		assert.ok(cdaFilename.endsWith(".xml"));

		const fnsFilename = generateFnsTaxXmlFilename(SAMPLE_FNS_TAX_1151156_PRESET);
		assert.ok(fnsFilename.startsWith("UT_SPROPLMED_7701234560_"));
		assert.ok(fnsFilename.endsWith(".xml"));
	});
});
