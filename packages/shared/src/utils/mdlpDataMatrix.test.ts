import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	DENTAL_ANESTHETICS_CATALOG,
	computeGtinCheckDigit,
	generateMdlpSchema10560Payload,
	isValidGtinChecksum,
	normalizeDataMatrixSeparators,
	parseMdlpDataMatrix,
	parseMdlpExpirationDate,
	recognizeDentalMedication,
} from "./mdlpDataMatrix.js";

describe("MDLP / GS1 DataMatrix Checksum & Utility Tests", () => {
	test("computeGtinCheckDigit calculates correct Modulo 10 check digit", () => {
		// 0001234567890 -> check digit is 5 (GTIN: 00012345678905)
		assert.strictEqual(computeGtinCheckDigit("0001234567890"), 5);

		// 0460123456789 -> check digit is 3 (GTIN: 04601234567893)
		assert.strictEqual(computeGtinCheckDigit("0460123456789"), 3);

		// 0366479800001 -> check digit is 6 (Ultracain DS forte: 03664798000016)
		assert.strictEqual(computeGtinCheckDigit("0366479800001"), 6);

		// 0340093000003 -> check digit is 8 (Scandonest: 03400930000038)
		assert.strictEqual(computeGtinCheckDigit("0340093000003"), 8);
	});

	test("computeGtinCheckDigit throws on invalid 13-digit inputs", () => {
		assert.throws(() => computeGtinCheckDigit("12345"), /13 цифр/);
		assert.throws(() => computeGtinCheckDigit("012345678901A"), /13 цифр/);
		assert.throws(() => computeGtinCheckDigit(""), /13 цифр/);
	});

	test("isValidGtinChecksum correctly validates 14-digit GTIN strings", () => {
		assert.strictEqual(isValidGtinChecksum("03664798000016"), true);
		assert.strictEqual(isValidGtinChecksum("03664798000023"), true);
		assert.strictEqual(isValidGtinChecksum("03400930000014"), true);
		assert.strictEqual(isValidGtinChecksum("03400930000038"), true);
		assert.strictEqual(isValidGtinChecksum("04601234567893"), true);

		// Corrupted check digit
		assert.strictEqual(isValidGtinChecksum("03664798000019"), false);
		assert.strictEqual(isValidGtinChecksum("04601234567891"), false);

		// Invalid lengths / format
		assert.strictEqual(isValidGtinChecksum("123"), false);
		assert.strictEqual(isValidGtinChecksum("036647980000181"), false);
		assert.strictEqual(isValidGtinChecksum("0366479800001A"), false);
		assert.strictEqual(isValidGtinChecksum(null), false);
		assert.strictEqual(isValidGtinChecksum(undefined), false);
	});

	test("normalizeDataMatrixSeparators normalizes various scanner representations of GS", () => {
		const rawWithEscapes =
			"0103664798000016211A2B3C4D5E6F7<GS>91ABCD<GS>92XYZ";
		const normalized = normalizeDataMatrixSeparators(rawWithEscapes);
		assert.strictEqual(
			normalized,
			"0103664798000016211A2B3C4D5E6F7\x1d91ABCD\x1d92XYZ",
		);

		const rawWithBrackets =
			"0103664798000016211A2B3C4D5E6F7[GS]91ABCD[GS]92XYZ";
		assert.strictEqual(
			normalizeDataMatrixSeparators(rawWithBrackets),
			"0103664798000016211A2B3C4D5E6F7\x1d91ABCD\x1d92XYZ",
		);

		const rawWithPrefix =
			"]d20103664798000016211A2B3C4D5E6F7\x1d91ABCD\x1d92XYZ";
		assert.strictEqual(
			normalizeDataMatrixSeparators(rawWithPrefix),
			"0103664798000016211A2B3C4D5E6F7\x1d91ABCD\x1d92XYZ",
		);
	});
});

describe("MDLP Expiration Date Parsing", () => {
	const fixedReference = new Date("2026-08-17T12:00:00Z");

	test("parses standard YYMMDD format", () => {
		const res = parseMdlpExpirationDate("280531", fixedReference);
		assert.strictEqual(res.isoDate, "2028-05-31");
		assert.strictEqual(res.isExpired, false);
		assert.strictEqual(res.isExpiringSoon, false);
		assert(res.daysUntilExpiration !== null && res.daysUntilExpiration > 500);
	});

	test("handles day '00' by calculating the last day of the month", () => {
		// Non-leap year Feb 2027
		const feb27 = parseMdlpExpirationDate("270200", fixedReference);
		assert.strictEqual(feb27.isoDate, "2027-02-28");

		// Leap year Feb 2028
		const feb28 = parseMdlpExpirationDate("280200", fixedReference);
		assert.strictEqual(feb28.isoDate, "2028-02-29");

		// April (30 days)
		const apr = parseMdlpExpirationDate("270400", fixedReference);
		assert.strictEqual(apr.isoDate, "2027-04-30");

		// December (31 days)
		const dec = parseMdlpExpirationDate("261200", fixedReference);
		assert.strictEqual(dec.isoDate, "2026-12-31");
	});

	test("flags expired medications correctly", () => {
		const past = parseMdlpExpirationDate("250101", fixedReference);
		assert.strictEqual(past.isoDate, "2025-01-01");
		assert.strictEqual(past.isExpired, true);
		assert(past.daysUntilExpiration !== null && past.daysUntilExpiration < 0);
	});

	test("flags medications expiring soon (within 90 days)", () => {
		// Reference is 2026-08-17. Date 2026-09-30 is ~44 days away.
		const soon = parseMdlpExpirationDate("260930", fixedReference);
		assert.strictEqual(soon.isoDate, "2026-09-30");
		assert.strictEqual(soon.isExpired, false);
		assert.strictEqual(soon.isExpiringSoon, true);
	});

	test("returns error for invalid date strings", () => {
		const invalidMonth = parseMdlpExpirationDate("271301", fixedReference);
		assert.strictEqual(invalidMonth.isoDate, null);
		assert(invalidMonth.error?.includes("Некорректный месяц"));

		const invalidDay = parseMdlpExpirationDate("270231", fixedReference);
		assert.strictEqual(invalidDay.isoDate, null);
		assert(invalidDay.error?.includes("Некорректный день"));

		const invalidLen = parseMdlpExpirationDate("20260817", fixedReference);
		assert.strictEqual(invalidLen.isoDate, null);
		assert(invalidLen.error?.includes("Неверный формат"));
	});
});

describe("Dental Anesthetics Recognition Catalog", () => {
	test("recognizes Ultracain D-S forte by GTIN", () => {
		const drug = recognizeDentalMedication("03664798000016");
		assert.notStrictEqual(drug, null);
		assert.strictEqual(drug?.id, "ultracain-ds-forte");
		assert.strictEqual(drug?.tradeName, "Ультракаин® Д-С форте");
		assert.strictEqual(drug?.concentrationPct, 4.0);
		assert.strictEqual(drug?.vasoconstrictor, "1:100000");
		assert.strictEqual(drug?.carpuleVolumeMl, 1.7);
	});

	test("recognizes Ultracain D-S by GTIN", () => {
		const drug = recognizeDentalMedication("03664798000023");
		assert.notStrictEqual(drug, null);
		assert.strictEqual(drug?.id, "ultracain-ds");
		assert.strictEqual(drug?.vasoconstrictor, "1:200000");
	});

	test("recognizes Septanest with Adrenaline 1:100,000 by GTIN", () => {
		const drug = recognizeDentalMedication("03400930000014");
		assert.notStrictEqual(drug, null);
		assert.strictEqual(drug?.id, "septanest-1-100000");
		assert.strictEqual(drug?.manufacturer, "Septodont, Франция");
	});

	test("recognizes Scandonest 3% plain by GTIN", () => {
		const drug = recognizeDentalMedication("03400930000038");
		assert.notStrictEqual(drug, null);
		assert.strictEqual(drug?.id, "scandonest-3-plain");
		assert.strictEqual(drug?.inn, "Мепивакаин");
		assert.strictEqual(drug?.vasoconstrictor, "none");
		assert.strictEqual(drug?.concentrationPct, 3.0);
	});

	test("recognizes Ubistesin by GTIN", () => {
		const drug = recognizeDentalMedication("04046719000012");
		assert.notStrictEqual(drug, null);
		assert.strictEqual(drug?.id, "ubistesin-1-200000");
	});

	test("recognizes Articaine generic by GTIN", () => {
		const drug = recognizeDentalMedication("04602509000015");
		assert.notStrictEqual(drug, null);
		assert.strictEqual(drug?.id, "articaine-generic");
	});

	test("falls back to search hint when GTIN is not in catalog", () => {
		const drug = recognizeDentalMedication(
			"00000000000000",
			"Ультракаин форте",
		);
		assert.notStrictEqual(drug, null);
		assert.strictEqual(drug?.id, "ultracain-ds-forte");
	});

	test("returns null for unknown GTIN and hint", () => {
		const drug = recognizeDentalMedication(
			"00000000000000",
			"Неизвестный порошок",
		);
		assert.strictEqual(drug, null);
	});
});

describe("parseMdlpDataMatrix Barcode Parsing", () => {
	const fixedRef = new Date("2026-08-17T12:00:00Z");

	test("parses standard GS1 DataMatrix with \\x1d group separators", () => {
		const raw =
			"0103664798000016211A2B3C4D5E6F7\x1d91ABCD\x1d92aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789012345678";
		const res = parseMdlpDataMatrix(raw, fixedRef);

		assert.strictEqual(res.isValid, true);
		assert.strictEqual(res.gtin, "03664798000016");
		assert.strictEqual(res.serialNumber, "1A2B3C4D5E6F7");
		assert.strictEqual(res.cryptoKey, "ABCD");
		assert.strictEqual(
			res.cryptoSignature,
			"aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789012345678",
		);
		assert.strictEqual(res.sgtin, "036647980000161A2B3C4D5E6F7");
		assert.strictEqual(res.isValidGtinChecksum, true);
		assert.strictEqual(res.recognizedDrug?.id, "ultracain-ds-forte");
		assert.strictEqual(res.errors.length, 0);
	});

	test("parses DataMatrix with literal <GS> tag from scanner", () => {
		const raw =
			"010340093000003821SN1234567890A<GS>91KKEY<GS>92SIG1234567890abcdefghijklmnopqrstuvwxyz1234";
		const res = parseMdlpDataMatrix(raw, fixedRef);

		assert.strictEqual(res.isValid, true);
		assert.strictEqual(res.gtin, "03400930000038");
		assert.strictEqual(res.serialNumber, "SN1234567890A");
		assert.strictEqual(res.cryptoKey, "KKEY");
		assert.strictEqual(res.recognizedDrug?.id, "scandonest-3-plain");
		assert.strictEqual(res.recognizedDrug?.inn, "Мепивакаин");
	});

	test("parses DataMatrix in parentheses format with expiration (17) and lot (10)", () => {
		const raw =
			"(01)03664798000023(21)SER1234567890(91)KEY1(92)SIG1234567890abcdefghijklmnopqrstuvwxyz1234(17)280531(10)LOT789";
		const res = parseMdlpDataMatrix(raw, fixedRef);

		assert.strictEqual(res.isValid, true);
		assert.strictEqual(res.gtin, "03664798000023");
		assert.strictEqual(res.serialNumber, "SER1234567890");
		assert.strictEqual(res.cryptoKey, "KEY1");
		assert.strictEqual(res.expirationDate, "2028-05-31");
		assert.strictEqual(res.series, "LOT789");
		assert.strictEqual(res.lot, "LOT789");
		assert.strictEqual(res.isExpired, false);
		assert.strictEqual(res.recognizedDrug?.id, "ultracain-ds");
	});

	test("parses plain concatenated 85-char string (Fixed Pharma Layout)", () => {
		// 01 + 04601234567893 (14) + 21 + 1234567890ABC (13) + 91 + KEY2 (4) + 92 + 1234567890abcdefghijklmnopqrstuvwxyz12345678 (44) = 85 chars
		const raw =
			"0104601234567893211234567890ABC91KEY2921234567890abcdefghijklmnopqrstuvwxyz12345678";
		const res = parseMdlpDataMatrix(raw, fixedRef);

		assert.strictEqual(res.isValid, true);
		assert.strictEqual(res.gtin, "04601234567893");
		assert.strictEqual(res.serialNumber, "1234567890ABC");
		assert.strictEqual(res.cryptoKey, "KEY2");
		assert.strictEqual(
			res.cryptoSignature,
			"1234567890abcdefghijklmnopqrstuvwxyz12345678",
		);
		assert.strictEqual(res.sgtin, "046012345678931234567890ABC");
		assert.strictEqual(res.isValidGtinChecksum, true);
	});

	test("handles symbology identifier prefix like ]d2", () => {
		const raw =
			"]d20103664798000016211A2B3C4D5E6F7\x1d91ABCD\x1d92aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789012345678";
		const res = parseMdlpDataMatrix(raw, fixedRef);

		assert.strictEqual(res.isValid, true);
		assert.strictEqual(res.gtin, "03664798000016");
		assert.strictEqual(res.serialNumber, "1A2B3C4D5E6F7");
	});

	test("flags invalid GTIN checksum with clear error message", () => {
		// Check digit changed from 6 to 9
		const raw =
			"0103664798000019211A2B3C4D5E6F7\x1d91ABCD\x1d92aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789012345678";
		const res = parseMdlpDataMatrix(raw, fixedRef);

		assert.strictEqual(res.isValid, false);
		assert.strictEqual(res.isValidGtinChecksum, false);
		assert(res.errors.some((e) => e.includes("Modulo 10 checksum mismatch")));
	});

	test("handles empty or blank string gracefully", () => {
		const res = parseMdlpDataMatrix("");
		assert.strictEqual(res.isValid, false);
		assert.strictEqual(res.gtin, "");
		assert(res.errors.length > 0);
	});
});

describe("MDLP Schema 10560 (Medical Care Disposal) Generator", () => {
	test("generates valid Schema 10560 XML and JSON document", () => {
		const params = {
			subjectId: "00000000123456",
			operationDate: "2026-08-17T15:30:00.000Z",
			docNum: "AMB-2026-08912",
			docDate: "2026-08-17",
			patientId: "p-uuid-1234",
			visitId: "v-uuid-5678",
			doctorId: "d-uuid-9999",
			items: [
				{
					sgtin: "036647980000161A2B3C4D5E6F7",
					gtin: "03664798000016",
					serialNumber: "1A2B3C4D5E6F7",
					series: "2026A",
					lot: "2026A",
					expirationDate: "2028-05-31",
					costRub: 450.0,
				},
				{
					sgtin: "03400930000038SN1234567890A",
					gtin: "03400930000038",
					serialNumber: "SN1234567890A",
					series: "SCAN99",
					lot: "SCAN99",
					expirationDate: "2027-02-28",
					costRub: 380.5,
				},
			],
		};

		const doc = generateMdlpSchema10560Payload(params);

		assert.strictEqual(doc.actionId, 10560);
		assert.strictEqual(doc.subjectId, "00000000123456");
		assert.strictEqual(doc.withdrawalType, 13);
		assert.strictEqual(doc.docNum, "AMB-2026-08912");
		assert.strictEqual(doc.docDate, "2026-08-17");
		assert.strictEqual(doc.items.length, 2);

		// Verify XML Content
		assert(doc.xmlContent.includes('<withdrawal action_id="10560">'));
		assert(doc.xmlContent.includes("<subject_id>00000000123456</subject_id>"));
		assert(doc.xmlContent.includes("<withdrawal_type>13</withdrawal_type>"));
		assert(doc.xmlContent.includes("<doc_num>AMB-2026-08912</doc_num>"));
		assert(
			doc.xmlContent.includes("<sgtin>036647980000161A2B3C4D5E6F7</sgtin>"),
		);
		assert(
			doc.xmlContent.includes("<sgtin>03400930000038SN1234567890A</sgtin>"),
		);
		assert(doc.xmlContent.includes("<cost>450.00</cost>"));
		assert(doc.xmlContent.includes("<cost>380.50</cost>"));

		// Verify JSON Content
		assert.strictEqual(doc.jsonContent.action_id, 10560);
		assert.strictEqual(doc.jsonContent.withdrawal_type, 13);
		assert.strictEqual(doc.jsonContent.patient_id, "p-uuid-1234");
	});

	test("throws on missing required parameters", () => {
		assert.throws(
			() =>
				generateMdlpSchema10560Payload({
					subjectId: "",
					docNum: "123",
					docDate: "2026-08-17",
					items: [],
				}),
			/subjectId/,
		);

		assert.throws(
			() =>
				generateMdlpSchema10560Payload({
					subjectId: "00000000123456",
					docNum: "",
					docDate: "2026-08-17",
					items: [],
				}),
			/docNum/,
		);

		assert.throws(
			() =>
				generateMdlpSchema10560Payload({
					subjectId: "00000000123456",
					docNum: "123",
					docDate: "2026-08-17",
					items: [],
				}),
			/items/,
		);
	});
});
