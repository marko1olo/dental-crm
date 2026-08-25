import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	DENTAL_ANESTHETICS_CATALOG,
	buildDisposalParamsFromQueue,
	calculateQueueStats,
	computeGtinCheckDigit,
	createCarpuleQueueItem,
	formatSeniorNurseDisposalActData,
	generateMdlpSchema10560Payload,
	generateSeniorNurseDisposalActHtml,
	isValidGtinChecksum,
	normalizeDataMatrixSeparators,
	parseMdlpDataMatrix,
	parseMdlpExpirationDate,
	recognizeDentalMedication,
	sortQueueByFefo,
} from "../mdlp/index.js";

describe("MDLP / Chestny Znak Suite (packages/shared/src/tests/mdlp.test.ts)", () => {
	test("1.1 GTIN Modulo 10 checksum verification", () => {
		assert.strictEqual(isValidGtinChecksum("03664798000016"), true);
		assert.strictEqual(isValidGtinChecksum("03664798000023"), true);
		assert.strictEqual(isValidGtinChecksum("03400930000014"), true);
		assert.strictEqual(isValidGtinChecksum("03400930000038"), true);
		assert.strictEqual(isValidGtinChecksum("04046719000012"), true);
		assert.strictEqual(isValidGtinChecksum("03664798000019"), false);
	});

	test("1.2 Dental Anesthetics Catalog recognition", () => {
		assert.strictEqual(
			recognizeDentalMedication("03664798000016")?.tradeName,
			"Ультракаин® Д-С форте",
		);
		assert.strictEqual(
			recognizeDentalMedication("03400930000014")?.tradeName,
			"Септанест с адреналином 1:100 000",
		);
		assert.strictEqual(
			recognizeDentalMedication("03400930000038")?.tradeName,
			"Скандонест 3% без вазоконстриктора",
		);
		assert.strictEqual(
			recognizeDentalMedication("04046719000012")?.tradeName,
			"Убистезин",
		);
		assert.strictEqual(
			recognizeDentalMedication("04607008360035")?.tradeName,
			"Артикаин Бинергия с адреналином",
		);
		assert.strictEqual(
			recognizeDentalMedication("08470001234567")?.tradeName,
			"Артикаин ИНИБСА (Артикаин 4% с эпинефрином)",
		);
	});

	test("1.3 GS1 DataMatrix parser with \\x1d and <GS> separators", () => {
		const raw =
			"0103664798000016211A2B3C4D5E6F7<GS>17280531<GS>10LOT2026<GS>91ABCD<GS>92SIG1234567890abcdefghijklmnopqrstuvwxyz1234";
		const parsed = parseMdlpDataMatrix(raw);

		assert.strictEqual(parsed.isValid, true);
		assert.strictEqual(parsed.gtin, "03664798000016");
		assert.strictEqual(parsed.serialNumber, "1A2B3C4D5E6F7");
		assert.strictEqual(parsed.expirationDate, "2028-05-31");
		assert.strictEqual(parsed.series, "LOT2026");
		assert.strictEqual(parsed.recognizedDrug?.id, "ultracain-ds-forte");
	});

	test("1.4 Schema 10560 XML Document Generation", () => {
		const doc = generateMdlpSchema10560Payload({
			subjectId: "00000000123456",
			docNum: "DOC-804N",
			docDate: "2026-08-25",
			items: [
				{
					sgtin: "036647980000161A2B3C4D5E6F7",
					gtin: "03664798000016",
					serialNumber: "1A2B3C4D5E6F7",
					costRub: 450,
				},
			],
		});

		assert.strictEqual(doc.actionId, 10560);
		assert(doc.xmlContent.includes('<withdrawal action_id="10560">'));
		assert(doc.xmlContent.includes("<sgtin>036647980000161A2B3C4D5E6F7</sgtin>"));
		assert(doc.xmlContent.includes("<cost>450.00</cost>"));
	});

	test("1.5 Carpule Queue and FEFO Sort", () => {
		const item1 = createCarpuleQueueItem(
			"010366479800001621SN1\x1d17281231\x1d91ABCD\x1d92SIG1",
		);
		const item2 = createCarpuleQueueItem(
			"010366479800001621SN2\x1d17260930\x1d91ABCD\x1d92SIG2",
		);

		const sorted = sortQueueByFefo([item1, item2]);
		assert.strictEqual(sorted[0]?.expirationDate, "2026-09-30");
	});

	test("1.6 Senior Nurse Disposal Act HTML Output", () => {
		const item = createCarpuleQueueItem(
			"010366479800001621SN1\x1d17280531\x1d91ABCD\x1d92SIG1",
			{ costRub: 450 },
		);
		const actData = formatSeniorNurseDisposalActData({ items: [item] });
		const html = generateSeniorNurseDisposalActHtml(actData);

		assert(html.includes("АКТ СПИСАНИЯ ЛЕКАРСТВЕННЫХ ПРЕПАРАТОВ"));
		assert(html.includes("Ультракаин® Д-С форте"));
	});
});
