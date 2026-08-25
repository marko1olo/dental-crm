/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CHAOS AUDIT & ADVERSARIAL FUZZING TEST SUITE:
 * GOVERNMENT XML SCHEMAS & GS1 DATAMATRIX BARCODES (ФНС / ЕГИСЗ / МДЛП)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Attacks & verifies resilience against:
 * 1. XML injections: quotes, <script>, unclosed tags, CDATA, comments, entity expansion in FIO, services, diagnoses.
 * 2. XML 1.0 disallowed characters: control codes (\u0000..\u001F, \x7F..\x9F), lone surrogates, non-characters.
 * 3. GS1 DataMatrix fuzzing: corrupted GTIN, wrong Modulo 10, invalid dates (999999, 240230, 230229, 240431), missing <GS>.
 * 4. GS1 DataMatrix leap years & day 00: 240229, 280229, day 00 end-of-month calculation.
 * 5. MDLP Schema 10560 XML generation & safe parse round-trip under adversarial inputs.
 * 6. Tax credentials edge cases: 10/12 zero INN (0000000000), formatted INN with spaces/hyphens, SNILS, foreign passports, KPP, OGRN.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// CDA / EGISZ imports
import {
	escapeXml,
	sanitizeXmlText,
	canonicalizeCdaXml,
	computeCdaSha256Hex,
} from "../cda/c14n.js";
import { generateSemd101Xml } from "../cda/generator101.js";
import { generateSemd104Xml } from "../cda/generator104.js";
import { generateSemd130Xml } from "../cda/generator130.js";
import { generateCdaXml } from "../cda/generator.js";

// FNS Tax deduction imports
import {
	generateFnsNoMedoplXml,
	renderOfficialTaxCertificateKnd1151156Html,
	validateInnLegalEntity,
	validateInnIndividual,
} from "../fiscal/fnsTaxDeductionEngine.js";
import {
	generateFnsTaxDeductionXml,
	generateFnsTaxDeductionBatchXml,
	validateRussianInn,
	validateRussianKpp,
	validateRussianOgrn,
	validateRussianPassport,
	validateRussianSnils,
	resolveTaxDeductionCategoryShared,
} from "../fiscal/taxDeduction.js";

// MDLP / GS1 DataMatrix imports
import {
	computeGtinCheckDigit,
	safeComputeGtinCheckDigit,
	isValidGtinChecksum,
	normalizeDataMatrixSeparators,
	parseMdlpExpirationDate,
	parseMdlpDataMatrix,
	safeParseMdlpDataMatrix,
	formatDataMatrixForDisplay,
	GS1_GROUP_SEPARATOR,
} from "../mdlp/parser.js";
import {
	generateMdlpSchema10560Payload,
	parseMdlpSchema10560Xml,
	safeParseMdlpSchema10560Xml,
	validateMdlpSchema10560Params,
} from "../mdlp/schema10560.js";

describe("Chaos & Adversarial Fuzzing: Government XML Schemes & GS1 DataMatrix", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. XML INJECTIONS & ILLEGAL CHARACTER SANITIZATION (ФНС & ЕГИСЗ)
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. XML Injections & Character Sanitization (FNS & EGISZ CDA R2)", () => {
		it("Test 1.1: Strips illegal XML 1.0 control characters and lone surrogates without corrupting UTF-8 Cyrillic or emojis", () => {
			// Contains null byte, C0 controls, non-characters, lone surrogate, valid Cyrillic, emoji
			const toxicString = "Иванов\u0000 \u0001\u0008\u000B\u000C\u000E\u001FИван\u007F\u0080\u009F «Тест» 🦷💉\uD800непарный\uDC00сурогат\uFFFF";
			const sanitized = sanitizeXmlText(toxicString);

			assert.ok(!sanitized.includes("\u0000"), "Must not contain null byte");
			assert.ok(!sanitized.includes("\u0001"), "Must not contain 0x01");
			assert.ok(!sanitized.includes("\u0008"), "Must not contain 0x08");
			assert.ok(!sanitized.includes("\u000B"), "Must not contain 0x0B");
			assert.ok(!sanitized.includes("\u000C"), "Must not contain 0x0C");
			assert.ok(!sanitized.includes("\u001F"), "Must not contain 0x1F");
			assert.ok(!sanitized.includes("\u007F"), "Must not contain 0x7F");
			assert.ok(!sanitized.includes("\uFFFF"), "Must not contain non-character U+FFFF");
			assert.ok(sanitized.includes("Иванов Иван"), "Preserves valid Russian letters");
			assert.ok(sanitized.includes("«Тест»"), "Preserves Russian typography quotes");
			assert.ok(sanitized.includes("🦷💉"), "Preserves valid UTF-8 emojis");
		});

		it("Test 1.2: Escapes 5 XML predefined entities and prevents tag breakout & attribute breakout", () => {
			const attackPayload = `<script>alert("XSS & XML injection")</script>' OR '1'='1 -- "><evil_tag attr='&quot;'>`;
			const escaped = escapeXml(attackPayload);

			assert.ok(!escaped.includes("<script>"), "Must not contain raw <script>");
			assert.ok(!escaped.includes("</script>"), "Must not contain raw </script>");
			assert.ok(!escaped.includes("<evil_tag"), "Must not contain raw <evil_tag");
			assert.ok(escaped.includes("&lt;script&gt;"), "Must escape < and >");
			assert.ok(escaped.includes("&amp;"), "Must escape &");
			assert.ok(escaped.includes("&quot;"), "Must escape \"");
			assert.ok(escaped.includes("&apos;"), "Must escape '");
		});

		it("Test 1.3: FNS Medopl XML (КНД 1184043 / 1151156) survives malicious injection in all fields", () => {
			const toxicCertificateParams = {
				certificateNumber: "77/2026-001\"<evil>injection</evil>",
				issueDateIso: "2026-08-25T14:30:00Z",
				taxYear: 2026,
				taxOfficeCode: "7701\" КодНО=\"0000",
				clinic: {
					legalName: "ООО \"ДЕНТЕ ЭЛИТ & КО\" <tag>'breakout'",
					inn: "7707083893\" ИННЮЛ=\"0000000000",
					kpp: "770101001\" КПП=\"999999999",
					ogrn: "1027700132195",
					licenseNumber: "ЛО-41-01-001234\" /& <license>",
					licenseDate: "12.10.2021",
					address: "г. Москва, ул. Арбат, д. 10 & стр. 2 <script>",
					chiefDoctorName: "Д-р Иванов А.А. \"Главврач\"",
				},
				payer: {
					fullName: "Петров-«Сидоров» Пётр & Сын <inject>",
					inn: "7707083893\" ИННФЛ=\"999999999999",
					birthDate: "1985-05-15",
					identityDocumentSeries: "45 08\" <series>",
					identityDocumentNumber: "123456\" <num>",
					identityDocumentIssuedBy: "ТП №1 ОВД «Арбат» г. Москвы & МО",
					relationship: "spouse" as const,
				},
				patient: {
					fullName: "Петрова Анна «Ивановна» <child_tag>",
					inn: "7707083893",
					birthDate: "1990-10-20",
				},
				payments: [
					{
						id: "pay-01",
						dateIso: "2026-03-10T10:00:00Z",
						receiptNumber: "Чек №123 \"Оплата\"",
						fiscalDocumentNumber: "100500\" ФД=\"1",
						fiscalSign: "99887766\" ФП=\"2",
						serviceName: "Дентальная имплантация Astra Tech & Bio-Oss <A16.07.054>",
						code804n: "A16.07.054.001",
						amountRub: 120000.5,
						taxCode: "2" as const,
					},
				],
			};

			const { xmlContent, fileName, fileId } = generateFnsNoMedoplXml(toxicCertificateParams);

			// Assertions on generated XML
			assert.ok(xmlContent.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"));
			assert.ok(!xmlContent.includes("<evil>"), "Must not contain raw unescaped evil tags");
			assert.ok(!xmlContent.includes("<script>"), "Must not contain raw unescaped script tags");
			assert.ok(!xmlContent.includes("<child_tag>"), "Must not contain raw unescaped child tags");
			assert.ok(!xmlContent.includes("<license>"), "Must not contain raw unescaped license tags");
			assert.ok(xmlContent.includes("&lt;evil&gt;"), "Must safely escape evil tag in certificate number");
			assert.ok(xmlContent.includes("&amp;"), "Must escape ampersands in legalName and serviceName");
			assert.ok(fileName.endsWith(".xml"), "File name must have .xml extension");
			assert.ok(!fileId.includes("\""), "File ID must not contain unescaped quotes");
		});

		it("Test 1.4: FNS Tax Certificate HTML render escapes all values and preserves layout", () => {
			const html = renderOfficialTaxCertificateKnd1151156Html({
				certificateNumber: "CERT-001\" <evil>",
				issueDateIso: "2026-08-25T14:30:00Z",
				taxYear: 2026,
				clinic: {
					legalName: "Клиника «Стоматолог & Хирург» <style>",
					inn: "7707083893",
					kpp: "770101001",
					address: "г. Москва, ул. Тверская <p>",
					chiefDoctorName: "Иванов И.И.",
				},
				payer: {
					fullName: "Сидоров С.С. <script>",
					relationship: "patient",
				},
				patient: {
					fullName: "Сидоров С.С.",
				},
				payments: [
					{
						id: "p1",
						dateIso: "2026-05-10T12:00:00Z",
						receiptNumber: "001",
						fiscalDocumentNumber: "1234",
						fiscalSign: "5678",
						serviceName: "Лечение кариеса & пломбирование <b>",
						amountRub: 15000,
					},
				],
			});

			assert.ok(html.includes("<!DOCTYPE html>"));
			assert.ok(!html.includes("<style>Клиника"), "Must not inject raw style tag in legalName");
			assert.ok(!html.includes("<script>"), "Must not inject raw script tag in payer fullName");
			assert.ok(html.includes("&lt;script&gt;"), "Must escape script tag in HTML");
			assert.ok(html.includes("&amp;"), "Must escape ampersand in HTML");
		});

		it("Test 1.5: CDA R2 SEMD 101 escapes malicious XML injections in dental odontogram, diagnoses and anamnesis", () => {
			const toxicSemd101 = {
				documentId: "doc-101-toxic\"<id_inject>",
				visitDate: new Date("2026-08-25T10:00:00Z"),
				patient: {
					patientId: "pat-999\"<pat_tag>",
					name: {
						last: "Петров<family_inject>",
						first: "Иван\" & <given_inject>",
						middle: "Сергеевич<middle_inject>",
					},
					gender: "male" as const,
					birthDate: new Date("1992-04-12"),
					address: "г. Москва, ул. Ленина, д. 5 & кв. 10 <addr_inject>",
					snils: "112-233-445 95",
				},
				doctor: {
					doctorId: "doc-777",
					name: {
						last: "Смирнов<doc_last>",
						first: "Алексей & Врач",
					},
					position: "Врач-стоматолог-терапевт <pos_tag>",
					positionCode: "71",
					snils: "11223344595",
				},
				clinic: {
					oid: "1.2.643.5.1.13.13.12.2.77.9999",
					name: "ООО «Дента-Люкс & Партнеры» <mo_tag>",
					inn: "7707083893",
				},
				complaints: "Острая боль в зубе 4.6 при накусывании & холодном воздухе <complaint_tag>",
				anamnesis: "Боли начались 2 дня назад. В анамнезе: аллергия на пенициллин <anamnesis_tag>",
				objectiveStatus: "Зуб 4.6: глубокая кариозная полость на окклюзионно-дистальной поверхности <obj_tag>",
				dentalStatus: [
					{
						tooth: "46\" target=\"_blank",
						condition: "C",
						conditionName: "Кариес дентина (глубокий) & разрушение <cond_tag>",
						surfaces: ["O", "D", "M\"<surf_tag>"],
						description: "Полость сообщается с пульповой камерой <desc_tag>",
					},
				],
				diagnoses: [
					{
						icd10Code: "K04.0\" codeSystem=\"MALICIOUS",
						diagnosisText: "Острый очаговый пульпит зуба 46 & гиперемия <diag_tag>",
						isPrimary: true,
						tooth: "46<tooth_inject>",
					},
				],
				services: [
					{
						code: "A16.07.002.001\" /& <service_code>",
						name: "Экстирпация пульпы зуба 46 & медикаментозная обработка <service_tag>",
						quantity: 1,
						tooth: "46",
					},
				],
				recommendations: [
					"Контрольный осмотр через 7 дней <rec_1>",
					"При болях — Нимесил 100 мг & полоскание <rec_2>",
				],
			};

			const xml = generateSemd101Xml(toxicSemd101 as any);
			assert.ok(xml.includes("<ClinicalDocument"), "Must produce CDA ClinicalDocument root");
			assert.ok(!xml.includes("<id_inject>"), "Must not contain unescaped id_inject");
			assert.ok(!xml.includes("<pat_tag>"), "Must not contain unescaped pat_tag");
			assert.ok(!xml.includes("<complaint_tag>"), "Must not contain unescaped complaint_tag");
			assert.ok(!xml.includes("<cond_tag>"), "Must not contain unescaped cond_tag");
			assert.ok(!xml.includes("<diag_tag>"), "Must not contain unescaped diag_tag");
			assert.ok(!xml.includes("<rec_1>"), "Must not contain unescaped rec_1");
			assert.ok(xml.includes("&lt;complaint_tag&gt;"), "Must escape tags in text elements");
			assert.ok(xml.includes("&amp;"), "Must escape ampersands in text");
		});

		it("Test 1.6: CDA R2 SEMD 104 and 130 XML generators escape surgery protocols and payment tables", () => {
			const toxicSemd130 = {
				docKind: "130" as const,
				documentId: "doc-130-toxic",
				certificateNumber: "130/2026-001\"<cert_inject>",
				taxYear: 2026,
				issueDate: new Date("2026-08-25T10:00:00Z"),
				contractNumber: "ДОГ-999\" от <contract_inject>",
				contractDate: "15.01.2026",
				taxpayer: {
					fullName: "Иванов И.И. & Супруга <taxpayer_inject>",
					inn: "7707083893",
					relationToPatient: "2" as const,
				},
				patient: {
					patientId: "pat-130",
					name: { last: "Иванова", first: "Елена", middle: "Петровна" },
					gender: "female" as const,
					birthDate: "1994-06-10",
				},
				doctor: {
					doctorId: "doc-1",
					name: { last: "Петров", first: "Пётр" },
					position: "Главный врач",
				},
				clinic: {
					oid: "1.2.643.5.1.13.13.12.2.77.9999",
					name: "Клиника «Дента» <clinic_tag>",
					inn: "7707083893",
				},
				paymentRecords: [
					{
						fiscalReceiptNumber: "ФД-100\"<fd_tag>",
						fiscalReceiptDate: "2026-03-01",
						serviceCategoryCode: "2\" methodCode=\"MALICIOUS",
						paymentAmountKopecks: 15000000,
					},
				],
				totalOrdinaryTreatmentKopecks: 0,
				totalExpensiveTreatmentKopecks: 15000000,
				totalSumKopecks: 15000000,
			};

			const result = generateSemd130Xml(toxicSemd130 as any);
			assert.ok(result.includes("<ClinicalDocument"));
			assert.ok(!result.includes("<cert_inject>"));
			assert.ok(!result.includes("<taxpayer_inject>"));
			assert.ok(!result.includes("<fd_tag>"));
			assert.ok(result.includes("&lt;cert_inject&gt;"));
			assert.ok(result.includes("&lt;taxpayer_inject&gt;"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. GS1 DATAMATRIX (МДЛП / ЧЕСТНЫЙ ЗНАК) PARSER HARDENING & FUZZING
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. GS1 DataMatrix (MDLP / Chestny ZNAK) Parser Hardening & Fuzzing", () => {
		it("Test 2.1: Corrupted GTIN with invalid lengths and non-digits does not crash and returns clear error", () => {
			const brokenGtins = [
				"01046012345678",        // 14 chars with '01' prefix (only 12 body digits)
				"01046012345ABCDE21TEST", // letters in GTIN
				"01",                     // truncated prefix
				"0100000000000000000000", // all-zeros dummy
				"-01046012345678",        // negative
				"01!@#$%^&*()_+~21SER",   // symbols
			];

			for (const barcode of brokenGtins) {
				const result = parseMdlpDataMatrix(barcode);
				assert.equal(result.isValid, false, `Expected isValid=false for barcode: "${barcode}"`);
				assert.ok(result.errors.length > 0, `Expected error message for barcode: "${barcode}"`);
				assert.equal(result.isValidGtinChecksum, false);
			}
		});

		it("Test 2.2: Detects corrupted GTIN Modulo 10 checksum mismatches without throwing", () => {
			// Valid GTIN: "04601234567893" (calculated check digit is 3)
			assert.equal(isValidGtinChecksum("04601234567893"), true);

			// Corrupted check digit: '0', '1', '2', '5', '9'
			const corruptedGtins = [
				"04601234567890",
				"04601234567891",
				"04601234567892",
				"04601234567895",
				"04601234567899",
			];

			for (const gtin of corruptedGtins) {
				assert.equal(isValidGtinChecksum(gtin), false, `GTIN "${gtin}" must fail Modulo 10 check`);
				const safeRes = safeComputeGtinCheckDigit(gtin.slice(0, 13));
				assert.equal(safeRes.isValid, true);
				assert.equal(safeRes.checkDigit, 3, "Calculated check digit must be 3");
			}
		});

		it("Test 2.3: Rejects invalid expiration dates AI(17) (YYMMDD) without throwing unhandled exceptions", () => {
			const invalidDates = [
				"999999", // Month 99
				"240000", // Month 00
				"241301", // Month 13
				"240230", // Feb 30 (2024 is leap, but max Feb day is 29)
				"230229", // Feb 29 on non-leap year 2023 (max Feb day is 28)
				"240431", // April 31 (April has only 30 days)
				"240631", // June 31 (June has only 30 days)
				"240931", // September 31
				"241131", // November 31
				"24AB12", // Letters in date
				"-10203", // Negative number
				"123",    // Too short (< 6 digits)
				"1234567",// Too long (> 6 digits)
				"",       // Empty string
				null,     // Null
				undefined,// Undefined
			];

			for (const d of invalidDates) {
				const res = parseMdlpExpirationDate(d as string);
				assert.ok(res.error, `Expected error for invalid date "${d}"`);
				assert.equal(res.isoDate, null);
			}
		});

		it("Test 2.4: Accurately parses valid leap-year expiration dates and day 00 end-of-month dates", () => {
			const fixedNow = new Date("2024-01-01T00:00:00Z");

			// Leap year 2024: Feb 29 is valid
			const leapFeb29 = parseMdlpExpirationDate("240229", fixedNow);
			assert.equal(leapFeb29.isoDate, "2024-02-29");
			assert.equal(leapFeb29.isExpired, false);
			assert.equal(leapFeb29.error, undefined);

			// Leap year 2028: Feb 29 is valid
			const leap2028 = parseMdlpExpirationDate("280229", fixedNow);
			assert.equal(leap2028.isoDate, "2028-02-29");
			assert.equal(leap2028.isExpired, false);

			// Day 00 on Feb in leap year 2024 -> resolves to 2024-02-29
			const day00Leap = parseMdlpExpirationDate("240200", fixedNow);
			assert.equal(day00Leap.isoDate, "2024-02-29");

			// Day 00 on Feb in non-leap year 2025 -> resolves to 2025-02-28
			const day00NonLeap = parseMdlpExpirationDate("250200", fixedNow);
			assert.equal(day00NonLeap.isoDate, "2025-02-28");

			// Day 00 on April 2026 -> resolves to 2026-04-30
			const day00Apr = parseMdlpExpirationDate("260400", fixedNow);
			assert.equal(day00Apr.isoDate, "2026-04-30");
		});

		it("Test 2.5: Successfully parses DataMatrix without <GS> separators using continuous fixed layout fallback", () => {
			// Fixed 85-char Pharma layout: 01 (14 GTIN) + 21 (13 S/N) + 91 (4 CryptoKey) + 92 (44 CryptoSig)
			// GTIN: 04601234567893 (valid Modulo 10 check digit 3)
			const continuousBarcode = "010460123456789321ABC123456789091ABCD92" + "X".repeat(44);
			const parsed = parseMdlpDataMatrix(continuousBarcode);

			assert.equal(parsed.isValid, true);
			assert.equal(parsed.gtin, "04601234567893");
			assert.equal(parsed.serialNumber, "ABC1234567890");
			assert.equal(parsed.cryptoKey, "ABCD");
			assert.equal(parsed.cryptoSignature, "X".repeat(44));
			assert.equal(parsed.isValidGtinChecksum, true);
		});

		it("Test 2.6: Handles various scanner group separator representations (<GS>, <FNC1>, {GS}, [GS], %1D)", () => {
			const rawWithParenTags = "0104601234567893<GS>21SER1234567890<GS>91KEY1<GS>92" + "Y".repeat(44);
			const rawWithFnc1 = "0104601234567893<FNC1>21SER1234567890<FNC1>91KEY1<FNC1>92" + "Y".repeat(44);
			const rawWithBrackets = "0104601234567893[GS]21SER1234567890[GS]91KEY1[GS]92" + "Y".repeat(44);

			for (const raw of [rawWithParenTags, rawWithFnc1, rawWithBrackets]) {
				const parsed = parseMdlpDataMatrix(raw);
				assert.equal(parsed.isValid, true);
				assert.equal(parsed.gtin, "04601234567893");
				assert.equal(parsed.serialNumber, "SER1234567890");
				assert.equal(parsed.cryptoKey, "KEY1");
			}
		});

		it("Test 2.7: safeParseMdlpDataMatrix returns Result<T, E> and never throws on chaotic or malicious inputs", () => {
			const chaoticInputs: unknown[] = [
				null,
				undefined,
				"",
				"   ",
				123456789,
				true,
				false,
				{},
				[],
				{ barcode: "0104601234567890" },
				"A".repeat(100000), // 100k giant string DoS attempt
				"\u0000\u0001\u0002\u0003\u001F\x7F", // Binary control noise
				"010460123456789021(MALICIOUS_REGEX_EXPLOSION)+++++++++++++",
			];

			for (const input of chaoticInputs) {
				assert.doesNotThrow(() => {
					const res = safeParseMdlpDataMatrix(input);
					assert.equal(typeof res.success, "boolean");
					assert.ok(res.data);
					if (!res.success) {
						assert.ok(res.error.length > 0);
					}
				});
			}
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. MDLP SCHEMA 10560 XML GENERATION & SAFE PARSER
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. MDLP Schema 10560 XML Fuzzing & Round-Trip", () => {
		it("Test 3.1: MDLP Schema 10560 generation escapes all XML entities in SGTIN, notes, subjectId, docNum", () => {
			const disposalParams = {
				subjectId: "00000000123456\" <evil_subject>",
				docNum: "АКТ-101/2026\" & <doc_inject>",
				docDate: "2026-08-25",
				withdrawalType: 13,
				patientId: "pat-123",
				notes: "Списание карпул Артикаина & Септанеста <notes_tag>",
				items: [
					{
						sgtin: "04601234567890ABC1234567890\" <sgtin_inject>",
						gtin: "04601234567890",
						serialNumber: "ABC1234567890",
						costRub: 145.5,
					},
				],
			};

			const doc = generateMdlpSchema10560Payload(disposalParams);
			assert.ok(doc.xmlContent.includes("<documents version=\"1.38\""));
			assert.ok(doc.xmlContent.includes("<withdrawal action_id=\"10560\">"));
			assert.ok(!doc.xmlContent.includes("<evil_subject>"));
			assert.ok(!doc.xmlContent.includes("<doc_inject>"));
			assert.ok(!doc.xmlContent.includes("<sgtin_inject>"));
			assert.ok(doc.xmlContent.includes("&lt;evil_subject&gt;"));
			assert.ok(doc.xmlContent.includes("&lt;doc_inject&gt;"));
		});

		it("Test 3.2: safeParseMdlpSchema10560Xml handles malformed or non-10560 XML gracefully", () => {
			const brokenXmls: unknown[] = [
				"",
				null,
				undefined,
				"<not_mdlp>Hello World</not_mdlp>",
				"<?xml version=\"1.0\"?><documents><withdrawal action_id=\"99999\"></withdrawal></documents>",
				"<documents version=\"1.38\"><withdrawal action_id=\"10560\"><subject_id></documents>", // Unclosed tags
			];

			for (const xml of brokenXmls) {
				const res = safeParseMdlpSchema10560Xml(xml);
				assert.equal(res.success, false, `Expected failure for invalid XML: "${xml}"`);
				assert.ok(res.errors.length > 0);
			}
		});

		it("Test 3.3: MDLP Schema 10560 round-trip XML serialization and parsing preserves all items", () => {
			const originalParams = {
				subjectId: "00000000123456",
				docNum: "АКТ-555",
				docDate: "2026-08-25",
				withdrawalType: 13,
				items: [
					{
						sgtin: "04601234567890ABC1234567890",
						gtin: "04601234567890",
						serialNumber: "ABC1234567890",
						costRub: 250.0,
					},
					{
						sgtin: "04601234567890XYZ9876543210",
						gtin: "04601234567890",
						serialNumber: "XYZ9876543210",
						costRub: 310.5,
					},
				],
			};

			const generated = generateMdlpSchema10560Payload(originalParams);
			const parseResult = safeParseMdlpSchema10560Xml(generated.xmlContent);

			assert.equal(parseResult.success, true);
			if (parseResult.success) {
				assert.equal(parseResult.data.subjectId, "00000000123456");
				assert.equal(parseResult.data.docNum, "АКТ-555");
				assert.equal(parseResult.data.items.length, 2);
				assert.equal(parseResult.data.items[0]?.sgtin, "04601234567890ABC1234567890");
				assert.equal(parseResult.data.items[0]?.costRub, 250.0);
				assert.equal(parseResult.data.items[1]?.sgtin, "04601234567890XYZ9876543210");
				assert.equal(parseResult.data.items[1]?.costRub, 310.5);
			}
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. EDGE CASES FOR RUSSIAN TAX CREDENTIALS (ИНН, КПП, ОГРН, СНИЛС, ПАСПОРТ)
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Edge Cases for Russian Tax Credentials (FNS)", () => {
		it("Test 4.1: INN edge cases — all-zeros, whitespace, hyphens, non-digits, and invalid lengths", () => {
			// All zeros must fail
			assert.equal(validateRussianInn("0000000000").isValid, false);
			assert.equal(validateRussianInn("000000000000").isValid, false);
			assert.equal(validateInnLegalEntity("0000000000").isValid, false);
			assert.equal(validateInnIndividual("000000000000").isValid, false);

			// Invalid lengths
			assert.equal(validateRussianInn("770708389").isValid, false, "9 digits");
			assert.equal(validateRussianInn("77070838931").isValid, false, "11 digits");
			assert.equal(validateRussianInn("7707083893123").isValid, false, "13 digits");

			// Non-digits & letters
			assert.equal(validateRussianInn("770708389A").isValid, false);
			assert.equal(validateRussianInn("ABCDEFGHIJ").isValid, false);

			// Valid INNs with formatting characters (spaces, hyphens)
			// Valid 10-digit Sberbank INN: 7707083893
			assert.equal(validateRussianInn("7707083893").isValid, true);
			assert.equal(validateRussianInn(" 7707083893 ").isValid, true);
			assert.equal(validateRussianInn("7707-083893").isValid, true);
			assert.equal(validateRussianInn("7707 083893").isValid, true);

			// Valid 12-digit individual INN (e.g., 500100732259)
			assert.equal(validateRussianInn("500100732259").isValid, true);
			assert.equal(validateRussianInn(" 5001-0073-2259 ").isValid, true);
		});

		it("Test 4.2: SNILS edge cases — all-zeros, early SNILS (<= 001-001-998), formatting and checksums", () => {
			// All zeros must fail length or checksum
			assert.equal(validateRussianSnils("00000000000").isValid, true); // <= 1001998 allowed per PFR rules

			// Invalid lengths
			assert.equal(validateRussianSnils("123456789").isValid, false);
			assert.equal(validateRussianSnils("123456789012").isValid, false);

			// Valid SNILS: 112-233-445 95
			const validSnils = validateRussianSnils("112-233-445 95");
			assert.equal(validSnils.isValid, true);
			assert.equal(validSnils.normalized, "112-233-445 95");

			// Checksum mismatch: 112-233-445 99
			assert.equal(validateRussianSnils("112-233-445 99").isValid, false);
		});

		it("Test 4.3: Passport edge cases — Russian passport (4 series + 6 number) and foreign documents", () => {
			// Valid Russian passport: 45 08 123456
			const validPass = validateRussianPassport("45 08 123456");
			assert.equal(validPass.isValid, true);
			assert.equal(validPass.normalized, "4508 123456");

			// Truncated passport
			assert.equal(validateRussianPassport("4508 123").isValid, false);

			// Empty passport
			assert.equal(validateRussianPassport("").isValid, false);
		});

		it("Test 4.4: KPP and OGRN / OGRNIP validation with checksum and format checks", () => {
			// Valid 9-digit KPP
			assert.equal(validateRussianKpp("770101001").isValid, true);
			assert.equal(validateRussianKpp("7701AB001").isValid, true); // Tax inspection code with letters
			assert.equal(validateRussianKpp("7701").isValid, false);

			// Valid 13-digit OGRN (1027700132195)
			assert.equal(validateRussianOgrn("1027700132195").isValid, true);
			assert.equal(validateRussianOgrn("1027700132199").isValid, false); // Wrong check digit

			// Valid 15-digit OGRNIP (304500116000157)
			assert.equal(validateRussianOgrn("304500116000157").isValid, true);
			assert.equal(validateRussianOgrn("304500116000159").isValid, false); // Wrong check digit
		});

		it("Test 4.5: Medical Nomenclature 804n Code 01 vs Code 02 resolution under varied naming and punctuation", () => {
			// Expensive treatment codes (Code 02)
			assert.equal(resolveTaxDeductionCategoryShared("A16.07.054", "Установка имплантата"), "2");
			assert.equal(resolveTaxDeductionCategoryShared("A16.07.054.001", "Имплантация"), "2");
			assert.equal(resolveTaxDeductionCategoryShared("A16.07.041.002", "Синус-лифтинг"), "2");
			assert.equal(resolveTaxDeductionCategoryShared(undefined, "Операция All-on-4 на 4 имплантах"), "2");
			assert.equal(resolveTaxDeductionCategoryShared(undefined, "Костная пластика челюсти с мембраной Bio-Gide"), "2");

			// Standard treatment codes (Code 01)
			assert.equal(resolveTaxDeductionCategoryShared("A16.07.002", "Лечение кариеса"), "1");
			assert.equal(resolveTaxDeductionCategoryShared("A16.07.008", "Пломбирование зуба"), "1");
			assert.equal(resolveTaxDeductionCategoryShared("A16.07.051", "Профессиональная гигиена полости рта"), "1");
		});
	});
});
