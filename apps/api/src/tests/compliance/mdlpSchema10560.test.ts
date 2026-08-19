import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	computeGtinCheckDigit,
	generateMdlpSchema10560Payload,
	isValidGtinChecksum,
	normalizeDataMatrixSeparators,
	parseMdlpDataMatrix,
	parseMdlpExpirationDate,
	recognizeDentalMedication,
} from "@dental/shared";

describe("MDLP / Chestny Znak Anesthetic Depletion Scheme 10560 Suite", () => {
	it("1.1 Modulo 10 GTIN check digit computes and validates accurately", () => {
		// Valid GTIN-14 for Ultracain: 03664798000016
		// 13 digits: 0366479800001 -> check digit should be 6
		const checkDigit = computeGtinCheckDigit("0366479800001");
		assert.equal(checkDigit, 6);
		assert.equal(isValidGtinChecksum("03664798000016"), true);
		assert.equal(isValidGtinChecksum("03664798000017"), false); // Wrong check digit
	});

	it("1.2 Normalizes scanner group separator formats (\\x1d, <GS>, [GS], {GS}, ~d029)", () => {
		const rawWithTag = "010366479800001621ABC1234567890<GS>911234<GS>92abcdefghijklmnopqrstuvwxyz1234567890ABCDEF==";
		const normalized = normalizeDataMatrixSeparators(rawWithTag);
		assert.ok(normalized.includes("\x1d"));
		assert.ok(!normalized.includes("<GS>"));
	});

	it("1.3 Parses GS1 DataMatrix with AI (01), (21), (91), (92), (17), (10)", () => {
		const barcode = "0103664798000016217A8B9C0D1E2F3\x1d17281231\x1d10LOT456\x1d91ABCD\x1d92QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9w==";
		const parsed = parseMdlpDataMatrix(barcode);

		assert.equal(parsed.isValid, true);
		assert.equal(parsed.gtin, "03664798000016");
		assert.equal(parsed.serialNumber, "7A8B9C0D1E2F3");
		assert.equal(parsed.sgtin, "036647980000167A8B9C0D1E2F3");
		assert.equal(parsed.expirationDate, "2028-12-31");
		assert.equal(parsed.series, "LOT456");
		assert.equal(parsed.cryptoKey, "ABCD");
		assert.equal(parsed.cryptoSignature, "QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZn");
		assert.equal(parsed.isExpired, false);
		assert.ok(parsed.recognizedDrug);
		assert.equal(parsed.recognizedDrug?.tradeName, "Ультракаин® Д-С форте");
	});

	it("1.4 Parses parentheses format (01)...(21)...(91)...(92)...", () => {
		const barcode = "(01)03664798000023(21)SER1234567890(17)280630(91)1234(92)abcdefghijklmnopqrstuvwxyz1234567890ABCDEF==";
		const parsed = parseMdlpDataMatrix(barcode);

		assert.equal(parsed.isValid, true);
		assert.equal(parsed.gtin, "03664798000023");
		assert.equal(parsed.serialNumber, "SER1234567890");
		assert.equal(parsed.expirationDate, "2028-06-30");
		assert.equal(parsed.recognizedDrug?.tradeName, "Ультракаин® Д-С");
	});

	it("1.5 Handles day 00 in expiration date by setting to last day of the month", () => {
		const expiry = parseMdlpExpirationDate("280200"); // Feb 2028 -> 29 days (leap year)
		assert.equal(expiry.isoDate, "2028-02-29");
		assert.equal(expiry.isExpired, false);
	});

	it("1.6 Recognizes dental anesthetic medications in catalog by GTIN or hint", () => {
		const ultra = recognizeDentalMedication("03664798000016");
		assert.ok(ultra);
		assert.equal(ultra?.inn, "Артикаин + Эпинефрин");
		assert.equal(ultra?.vasoconstrictor, "1:100000");

		const septanest = recognizeDentalMedication("03400930000014");
		assert.ok(septanest);
		assert.equal(septanest?.manufacturer, "Septodont, Франция");

		const scandonest = recognizeDentalMedication("03400930000038");
		assert.ok(scandonest);
		assert.equal(scandonest?.vasoconstrictor, "none");

		// Fallback by search hint
		const byHint = recognizeDentalMedication("00000000000000", "Скандонест 3%");
		assert.ok(byHint);
		assert.equal(byHint?.inn, "Мепивакаин");
	});

	it("1.7 Generates official MDLP Schema 10560 XML Document for CRPT write-off", () => {
		const doc = generateMdlpSchema10560Payload({
			subjectId: "00000000-1111-2222-3333-444455556666",
			docNum: "VI-12345678",
			docDate: "2026-08-19",
			withdrawalType: 13, // Оказание медицинской помощи
			patientId: "pat-123",
			visitId: "vis-456",
			items: [
				{
					sgtin: "036647980000167A8B9C0D1E2F3",
					gtin: "03664798000016",
					serialNumber: "7A8B9C0D1E2F3",
					series: "LOT-99",
					costRub: 350.0,
				},
			],
		});

		assert.equal(doc.actionId, 10560);
		assert.equal(doc.withdrawalType, 13);
		assert.ok(doc.xmlContent.includes('action_id="10560"'));
		assert.ok(doc.xmlContent.includes("<withdrawal_type>13</withdrawal_type>"));
		assert.ok(doc.xmlContent.includes("<subject_id>00000000-1111-2222-3333-444455556666</subject_id>"));
		assert.ok(doc.xmlContent.includes("<sgtin>036647980000167A8B9C0D1E2F3</sgtin>"));
		assert.ok(doc.xmlContent.includes("<cost>350.00</cost>"));
	});

	it("1.8 Throws descriptive errors when required Schema 10560 parameters are missing", () => {
		assert.throws(
			() =>
				generateMdlpSchema10560Payload({
					subjectId: "",
					docNum: "123",
					docDate: "2026-08-19",
					items: [],
				}),
			/subjectId/i,
		);

		assert.throws(
			() =>
				generateMdlpSchema10560Payload({
					subjectId: "org-1",
					docNum: "123",
					docDate: "2026-08-19",
					items: [],
				}),
			/items/i,
		);
	});
});
