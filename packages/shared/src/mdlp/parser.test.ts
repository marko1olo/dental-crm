import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	DENTAL_ANESTHETICS_CATALOG,
	computeGtinCheckDigit,
	findAnestheticById,
	findAnestheticsByInn,
	formatDataMatrixForDisplay,
	isValidGtinChecksum,
	normalizeDataMatrixSeparators,
	parseMdlpDataMatrix,
	parseMdlpExpirationDate,
	recognizeDentalMedication,
} from "./index.js";

describe("MDLP / GS1 DataMatrix Checksum & Modulo 10 Algorithm", () => {
	test("computeGtinCheckDigit calculates accurate Modulo 10 check digit for 13-digit strings", () => {
		// 0001234567890 -> check digit 5 (00012345678905)
		assert.strictEqual(computeGtinCheckDigit("0001234567890"), 5);

		// 0460123456789 -> check digit 3 (04601234567893)
		assert.strictEqual(computeGtinCheckDigit("0460123456789"), 3);

		// 0366479800001 -> check digit 6 (Ultracain DS forte: 03664798000016)
		assert.strictEqual(computeGtinCheckDigit("0366479800001"), 6);

		// 0340093000003 -> check digit 8 (Scandonest: 03400930000038)
		assert.strictEqual(computeGtinCheckDigit("0340093000003"), 8);

		// 0404671900001 -> check digit 2 (Ubistesin: 04046719000012)
		assert.strictEqual(computeGtinCheckDigit("0404671900001"), 2);
	});

	test("computeGtinCheckDigit rejects invalid input lengths or non-numeric characters", () => {
		assert.throws(() => computeGtinCheckDigit("12345"), /13 цифр/);
		assert.throws(() => computeGtinCheckDigit("012345678901A"), /13 цифр/);
		assert.throws(() => computeGtinCheckDigit(""), /13 цифр/);
	});

	test("isValidGtinChecksum validates authentic 14-digit GTINs and rejects invalid checksums", () => {
		// Valid GTINs
		assert.strictEqual(isValidGtinChecksum("03664798000016"), true);
		assert.strictEqual(isValidGtinChecksum("03664798000023"), true);
		assert.strictEqual(isValidGtinChecksum("03400930000014"), true);
		assert.strictEqual(isValidGtinChecksum("03400930000038"), true);
		assert.strictEqual(isValidGtinChecksum("04046719000012"), true);
		assert.strictEqual(isValidGtinChecksum("04601234567893"), true);

		// Corrupted check digits
		assert.strictEqual(isValidGtinChecksum("03664798000019"), false);
		assert.strictEqual(isValidGtinChecksum("04601234567891"), false);
		assert.strictEqual(isValidGtinChecksum("04046719000019"), false);

		// Invalid lengths / types
		assert.strictEqual(isValidGtinChecksum("123"), false);
		assert.strictEqual(isValidGtinChecksum("036647980000181"), false);
		assert.strictEqual(isValidGtinChecksum("0366479800001A"), false);
		assert.strictEqual(isValidGtinChecksum(null as unknown as string), false);
		assert.strictEqual(isValidGtinChecksum(undefined as unknown as string), false);
	});

	test("normalizeDataMatrixSeparators normalizes scanner representations of GS character", () => {
		const rawWithLiteralGs = "0103664798000016211A2B3C4D5E6F7<GS>91ABCD<GS>92XYZ";
		assert.strictEqual(
			normalizeDataMatrixSeparators(rawWithLiteralGs),
			"0103664798000016211A2B3C4D5E6F7\x1d91ABCD\x1d92XYZ",
		);

		const rawWithBrackets = "0103664798000016211A2B3C4D5E6F7[GS]91ABCD[GS]92XYZ";
		assert.strictEqual(
			normalizeDataMatrixSeparators(rawWithBrackets),
			"0103664798000016211A2B3C4D5E6F7\x1d91ABCD\x1d92XYZ",
		);

		const rawWithCurly = "0103664798000016211A2B3C4D5E6F7{GS}91ABCD{GS}92XYZ";
		assert.strictEqual(
			normalizeDataMatrixSeparators(rawWithCurly),
			"0103664798000016211A2B3C4D5E6F7\x1d91ABCD\x1d92XYZ",
		);

		const rawWithPrefix = "]d20103664798000016211A2B3C4D5E6F7\x1d91ABCD\x1d92XYZ";
		assert.strictEqual(
			normalizeDataMatrixSeparators(rawWithPrefix),
			"0103664798000016211A2B3C4D5E6F7\x1d91ABCD\x1d92XYZ",
		);
	});
});

describe("MDLP Expiration Date Evaluation", () => {
	const fixedRef = new Date("2026-08-25T12:00:00Z");

	test("parses standard YYMMDD expiration date", () => {
		const res = parseMdlpExpirationDate("280531", fixedRef);
		assert.strictEqual(res.isoDate, "2028-05-31");
		assert.strictEqual(res.isExpired, false);
		assert.strictEqual(res.isExpiringSoon, false);
		assert(res.daysUntilExpiration !== null && res.daysUntilExpiration > 500);
	});

	test("handles day '00' by computing the last calendar day of the month", () => {
		// Non-leap Feb 2027
		const feb27 = parseMdlpExpirationDate("270200", fixedRef);
		assert.strictEqual(feb27.isoDate, "2027-02-28");

		// Leap year Feb 2028
		const feb28 = parseMdlpExpirationDate("280200", fixedRef);
		assert.strictEqual(feb28.isoDate, "2028-02-29");

		// April (30 days)
		const apr = parseMdlpExpirationDate("270400", fixedRef);
		assert.strictEqual(apr.isoDate, "2027-04-30");

		// December (31 days)
		const dec = parseMdlpExpirationDate("261200", fixedRef);
		assert.strictEqual(dec.isoDate, "2026-12-31");
	});

	test("detects expired and expiring-soon medications correctly", () => {
		const past = parseMdlpExpirationDate("250101", fixedRef);
		assert.strictEqual(past.isExpired, true);
		assert(past.daysUntilExpiration !== null && past.daysUntilExpiration < 0);

		// 2026-09-30 is ~36 days from 2026-08-25 (within 90 days)
		const soon = parseMdlpExpirationDate("260930", fixedRef);
		assert.strictEqual(soon.isExpired, false);
		assert.strictEqual(soon.isExpiringSoon, true);
	});
});

describe("Dental Anesthetics Catalog Recognition", () => {
	test("recognizes Ultracain D-S forte, Ultracain D-S, and Ultracain D", () => {
		const forte = recognizeDentalMedication("03664798000016");
		assert.notStrictEqual(forte, null);
		assert.strictEqual(forte?.id, "ultracain-ds-forte");
		assert.strictEqual(forte?.vasoconstrictor, "1:100000");

		const ds = recognizeDentalMedication("03664798000023");
		assert.notStrictEqual(ds, null);
		assert.strictEqual(ds?.id, "ultracain-ds");
		assert.strictEqual(ds?.vasoconstrictor, "1:200000");

		const d = recognizeDentalMedication("03664798000030");
		assert.notStrictEqual(d, null);
		assert.strictEqual(d?.id, "ultracain-d");
		assert.strictEqual(d?.vasoconstrictor, "none");
	});

	test("recognizes Septanest, Scandonest, Ubistesin, Binergia, Inibsa", () => {
		const septanest = recognizeDentalMedication("03400930000014");
		assert.strictEqual(septanest?.id, "septanest-1-100000");

		const scandonest = recognizeDentalMedication("03400930000038");
		assert.strictEqual(scandonest?.id, "scandonest-3-plain");
		assert.strictEqual(scandonest?.inn, "Мепивакаин");

		const ubistesin = recognizeDentalMedication("04046719000012");
		assert.strictEqual(ubistesin?.id, "ubistesin-1-200000");

		const binergia = recognizeDentalMedication("04607008360035");
		assert.strictEqual(binergia?.id, "articaine-binergia");

		const inibsa = recognizeDentalMedication("08470001234567");
		assert.strictEqual(inibsa?.id, "articaine-inibsa");
		assert.strictEqual(inibsa?.carpuleVolumeMl, 1.8);
	});

	test("findAnestheticsByInn finds all articaine and mepivacaine drugs", () => {
		const articaines = findAnestheticsByInn("Артикаин");
		assert(articaines.length >= 6);

		const mepivacaines = findAnestheticsByInn("Мепивакаин");
		assert(mepivacaines.length >= 2);
	});
});

describe("GS1 DataMatrix Full Barcode Parsing", () => {
	const fixedRef = new Date("2026-08-25T12:00:00Z");

	test("parses standard Russian pharma DataMatrix with \\x1d group separators", () => {
		const raw =
			"0103664798000016211A2B3C4D5E6F7\x1d91ABCD\x1d92aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789012345678";
		const res = parseMdlpDataMatrix(raw, fixedRef);

		assert.strictEqual(res.isValid, true);
		assert.strictEqual(res.gtin, "03664798000016");
		assert.strictEqual(res.serialNumber, "1A2B3C4D5E6F7");
		assert.strictEqual(res.cryptoKey, "ABCD");
		assert.strictEqual(res.sgtin, "036647980000161A2B3C4D5E6F7");
		assert.strictEqual(res.isValidGtinChecksum, true);
		assert.strictEqual(res.recognizedDrug?.id, "ultracain-ds-forte");
	});

	test("parses parentheses format with expiration (17) and batch (10)", () => {
		const raw =
			"(01)03664798000023(21)SER1234567890(91)KEY1(92)SIG1234567890abcdefghijklmnopqrstuvwxyz1234(17)280531(10)LOT789";
		const res = parseMdlpDataMatrix(raw, fixedRef);

		assert.strictEqual(res.isValid, true);
		assert.strictEqual(res.gtin, "03664798000023");
		assert.strictEqual(res.expirationDate, "2028-05-31");
		assert.strictEqual(res.series, "LOT789");
		assert.strictEqual(res.lot, "LOT789");
		assert.strictEqual(res.recognizedDrug?.id, "ultracain-ds");
	});

	test("parses 85-character fixed Russian pharma format", () => {
		const raw =
			"0104601234567893211234567890ABC91KEY2921234567890abcdefghijklmnopqrstuvwxyz12345678";
		const res = parseMdlpDataMatrix(raw, fixedRef);

		assert.strictEqual(res.isValid, true);
		assert.strictEqual(res.gtin, "04601234567893");
		assert.strictEqual(res.serialNumber, "1234567890ABC");
		assert.strictEqual(res.cryptoKey, "KEY2");
		assert.strictEqual(res.sgtin, "046012345678931234567890ABC");
	});

	test("formatDataMatrixForDisplay produces human-readable output", () => {
		const raw =
			"0103664798000016211A2B3C4D5E6F7\x1d91ABCD\x1d92aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789012345678";
		const display = formatDataMatrixForDisplay(raw);
		assert(display.includes("(01)03664798000016"));
		assert(display.includes("(21)1A2B3C4D5E6F7"));
	});
});
