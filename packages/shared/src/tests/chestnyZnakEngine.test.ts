import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	calculateChestnyZnakSummary,
	computeGtinCheckDigit,
	createChestnyZnakScannedItem,
	generateMdlpSchema531Payload,
	generateMdlpSchema701Payload,
	isValidGtinChecksum,
	parseChestnyZnakBarcode,
	parseMdlpSchema531Xml,
	parseMdlpSchema701Xml,
	safeParseMdlpSchema531Xml,
	safeParseMdlpSchema701Xml,
	validateMdlpSchema531Params,
	validateMdlpSchema701Params,
} from "../mdlp/chestnyZnakEngine.js";

describe("Chestny ZNAK & MDLP Pharma Verification Engine (packages/shared/src/tests/chestnyZnakEngine.test.ts)", () => {
	// ─── 1. GTIN Modulo 10 Checksum Tests ───────────────────────────────────────
	describe("1. GTIN Modulo 10 Calculation and Verification", () => {
		test("computes correct Modulo 10 check digit for standard 13-digit prefixes", () => {
			assert.strictEqual(computeGtinCheckDigit("0366479800001"), 6);
			assert.strictEqual(computeGtinCheckDigit("0366479800002"), 3);
			assert.strictEqual(computeGtinCheckDigit("0340093000001"), 4);
			assert.strictEqual(computeGtinCheckDigit("0340093000003"), 8);
			assert.strictEqual(computeGtinCheckDigit("0404671900001"), 2);
		});

		test("validates 14-digit GTIN checksums correctly", () => {
			assert.strictEqual(isValidGtinChecksum("03664798000016"), true);
			assert.strictEqual(isValidGtinChecksum("03664798000023"), true);
			assert.strictEqual(isValidGtinChecksum("03400930000014"), true);
			assert.strictEqual(isValidGtinChecksum("03400930000038"), true);
			assert.strictEqual(isValidGtinChecksum("04046719000012"), true);

			// Invalid checksums
			assert.strictEqual(isValidGtinChecksum("03664798000019"), false);
			assert.strictEqual(isValidGtinChecksum("03664798000010"), false);
			assert.strictEqual(isValidGtinChecksum("00000000000000"), false);
			assert.strictEqual(isValidGtinChecksum("INVALID_GTIN_14"), false);
			assert.strictEqual(isValidGtinChecksum(""), false);
		});
	});

	// ─── 2. DataMatrix 2D Barcode Parser ────────────────────────────────────────
	describe("2. DataMatrix 2D Barcode Parser", () => {
		test("parses full pharma DataMatrix with GS separator (<GS> / \\x1d)", () => {
			const raw =
				"0103664798000016211A2B3C4D5E6F7\x1d17280531\x1d10LOT2026\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234";
			const refDate = new Date("2026-08-25T00:00:00.000Z");
			const parsed = parseChestnyZnakBarcode(raw, refDate);

			assert.strictEqual(parsed.gtin, "03664798000016");
			assert.strictEqual(parsed.serialNumber, "1A2B3C4D5E6F7");
			assert.strictEqual(parsed.sgtin, "036647980000161A2B3C4D5E6F7");
			assert.strictEqual(parsed.expirationDate, "2028-05-31");
			assert.strictEqual(parsed.series, "LOT2026");
			assert.strictEqual(parsed.cryptoKey, "ABCD");
			assert.strictEqual(
				parsed.cryptoSignature,
				"SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
			);
			assert.strictEqual(parsed.isValidGtinChecksum, true);
			assert.strictEqual(parsed.isExpired, false);
			assert.strictEqual(parsed.status, "verified");
			assert.strictEqual(
				parsed.recognizedDrug?.tradeName,
				"Ультракаин® Д-С форте",
			);
		});

		test("parses parenthesized GS1 format (01)...(21)...(17)...", () => {
			const raw =
				"(01)03400930000014(21)SN9876543210(17)271231(10)SER99(91)KEY1(92)SIG44CHARS1234567890123456789012345678901234";
			const refDate = new Date("2026-08-25T00:00:00.000Z");
			const parsed = parseChestnyZnakBarcode(raw, refDate);

			assert.strictEqual(parsed.gtin, "03400930000014");
			assert.strictEqual(parsed.serialNumber, "SN9876543210");
			assert.strictEqual(parsed.sgtin, "03400930000014SN9876543210");
			assert.strictEqual(parsed.expirationDate, "2027-12-31");
			assert.strictEqual(parsed.series, "SER99");
			assert.strictEqual(parsed.cryptoKey, "KEY1");
			assert.strictEqual(parsed.status, "verified");
			assert.strictEqual(
				parsed.recognizedDrug?.tradeName,
				"Септанест с адреналином 1:100 000",
			);
		});

		test("detects expired medication and assigns 'expired' status", () => {
			const raw =
				"010366479800001621SNEXPIRED123\x1d17240101\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234";
			const refDate = new Date("2026-08-25T00:00:00.000Z");
			const parsed = parseChestnyZnakBarcode(raw, refDate);

			assert.strictEqual(parsed.isExpired, true);
			assert.strictEqual(parsed.status, "expired");
			assert(parsed.statusReason.includes("Срок годности истек"));
		});

		test("detects medication expiring within 90 days and assigns 'warning' status", () => {
			const raw =
				"010366479800001621SNSOON123456\x1d17260930\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234";
			const refDate = new Date("2026-08-25T00:00:00.000Z");
			const parsed = parseChestnyZnakBarcode(raw, refDate);

			assert.strictEqual(parsed.isExpired, false);
			assert.strictEqual(parsed.isExpiringSoon, true);
			assert.strictEqual(parsed.status, "warning");
			assert(parsed.statusReason.includes("Срок годности истекает"));
		});

		test("detects missing crypto signature and assigns 'warning' status", () => {
			const raw =
				"010366479800001621SN12345678901\x1d17281231";
			const refDate = new Date("2026-08-25T00:00:00.000Z");
			const parsed = parseChestnyZnakBarcode(raw, refDate);

			assert.strictEqual(parsed.status, "warning");
			assert(parsed.statusReason.includes("криптохвост"));
		});

		test("flags invalid GTIN checksum as 'invalid_checksum'", () => {
			const raw =
				"010366479800001921SN12345678901\x1d91ABCD\x1d92SIG44CHARS1234567890123456789012345678901234";
			const parsed = parseChestnyZnakBarcode(raw);

			assert.strictEqual(parsed.isValidGtinChecksum, false);
			assert.strictEqual(parsed.status, "invalid_checksum");
		});

		test("flags empty or corrupt string as 'invalid_format'", () => {
			const parsedEmpty = parseChestnyZnakBarcode("");
			assert.strictEqual(parsedEmpty.status, "invalid_format");

			const parsedGarbage = parseChestnyZnakBarcode("JUST_RANDOM_TEXT");
			assert.strictEqual(parsedGarbage.status, "invalid_format");
		});

		test("creates full ChestnyZnakScannedItem with pricing and metadata", () => {
			const raw =
				"010404671900001221UBI1234567890\x1d17280331\x1d10LOT42\x1d91ABCD\x1d92SIG44CHARS1234567890123456789012345678901234";
			const item = createChestnyZnakScannedItem(raw, {
				costRub: 520.5,
				vatRate: 10,
			});

			assert.strictEqual(item.gtin, "04046719000012");
			assert.strictEqual(item.serialNumber, "UBI1234567890");
			assert.strictEqual(item.sgtin, "04046719000012UBI1234567890");
			assert.strictEqual(item.tradeName, "Убистезин");
			assert.strictEqual(item.inn, "Артикаин + Эпинефрин");
			assert.strictEqual(item.costRub, 520.5);
			assert.strictEqual(item.vatRate, 10);
			assert.strictEqual(item.series, "LOT42");
			assert.strictEqual(item.status, "verified");
			assert(item.id.startsWith("cz-"));
		});
	});

	// ─── 3. Schema 701 (Acceptance / Приемка по УПД) ────────────────────────────
	describe("3. MDLP Schema 701 (Acceptance by UPD)", () => {
		test("generates valid Schema 701 XML version 1.38", () => {
			const params = {
				subjectId: "00000000123456",
				shipperId: "00000000654321",
				operationDate: "2026-08-25T10:00:00.000Z",
				docNum: "UPD-2026-0089",
				docDate: "2026-08-25",
				receivingType: 1 as const,
				items: [
					{
						sgtin: "036647980000161A2B3C4D5E6F7",
						gtin: "03664798000016",
						serialNumber: "1A2B3C4D5E6F7",
						costRub: 450.0,
						vatValueRub: 45.0,
					},
					{
						sgtin: "03400930000014SN9876543210A",
						gtin: "03400930000014",
						serialNumber: "SN9876543210A",
						costRub: 390.0,
						vatValueRub: 39.0,
					},
				],
			};

			const doc = generateMdlpSchema701Payload(params);

			assert.strictEqual(doc.actionId, 701);
			assert.strictEqual(doc.subjectId, "00000000123456");
			assert.strictEqual(doc.shipperId, "00000000654321");
			assert.strictEqual(doc.docNum, "UPD-2026-0089");
			assert.strictEqual(doc.receivingType, 1);
			assert.strictEqual(doc.items.length, 2);

			// XML checks
			assert(doc.xmlContent.includes('<accept_goods action_id="701">'));
			assert(doc.xmlContent.includes("<subject_id>00000000123456</subject_id>"));
			assert(doc.xmlContent.includes("<shipper_id>00000000654321</shipper_id>"));
			assert(doc.xmlContent.includes("<receiving_type>1</receiving_type>"));
			assert(doc.xmlContent.includes("<sgtin>036647980000161A2B3C4D5E6F7</sgtin>"));
			assert(doc.xmlContent.includes("<cost>450.00</cost>"));
			assert(doc.xmlContent.includes("<vat_value>45.00</vat_value>"));
			assert(doc.xmlContent.includes("<sgtin>03400930000014SN9876543210A</sgtin>"));
			assert(doc.xmlContent.includes("<cost>390.00</cost>"));
			assert(doc.xmlContent.includes("<vat_value>39.00</vat_value>"));

			// JSON checks
			assert.strictEqual(doc.jsonContent.action_id, 701);
			assert.strictEqual(doc.jsonContent.subject_id, "00000000123456");
			assert.strictEqual(doc.jsonContent.shipper_id, "00000000654321");
		});

		test("parses Schema 701 XML document back into structured parameters", () => {
			const original = {
				subjectId: "SUBJ701REC",
				shipperId: "SHIP701SND",
				operationDate: "2026-08-25T11:00:00.000Z",
				docNum: "INV-7701",
				docDate: "2026-08-25",
				receivingType: 2 as const,
				items: [
					{
						sgtin: "036647980000161A2B3C4D5E6F7",
						costRub: 500.0,
						vatValueRub: 50.0,
					},
				],
			};

			const doc = generateMdlpSchema701Payload(original);
			const parsed = parseMdlpSchema701Xml(doc.xmlContent);

			assert.strictEqual(parsed.subjectId, "SUBJ701REC");
			assert.strictEqual(parsed.shipperId, "SHIP701SND");
			assert.strictEqual(parsed.docNum, "INV-7701");
			assert.strictEqual(parsed.docDate, "2026-08-25");
			assert.strictEqual(parsed.receivingType, 2);
			assert.strictEqual(parsed.items.length, 1);
			assert.strictEqual(parsed.items[0]?.sgtin, "036647980000161A2B3C4D5E6F7");
			assert.strictEqual(parsed.items[0]?.costRub, 500.0);
			assert.strictEqual(parsed.items[0]?.vatValueRub, 50.0);
		});

		test("safeParseMdlpSchema701Xml gracefully handles errors", () => {
			const resultInvalid = safeParseMdlpSchema701Xml("<invalid_xml></invalid_xml>");
			assert.strictEqual(resultInvalid.success, false);

			const resultNull = safeParseMdlpSchema701Xml(null);
			assert.strictEqual(resultNull.success, false);
		});

		test("validateMdlpSchema701Params flags missing required fields", () => {
			const validation = validateMdlpSchema701Params({
				subjectId: "",
				shipperId: "",
				docNum: "",
				docDate: "",
				items: [],
			});

			assert.strictEqual(validation.isValid, false);
			assert(validation.errors.some((e) => e.includes("subjectId")));
			assert(validation.errors.some((e) => e.includes("shipperId")));
			assert(validation.errors.some((e) => e.includes("docNum")));
			assert(validation.errors.some((e) => e.includes("docDate")));
			assert(validation.errors.some((e) => e.includes("не может быть пустым")));
		});
	});

	// ─── 4. Schema 531 (Disposal / Выбытие для мед. помощи) ──────────────────────
	describe("4. MDLP Schema 531 (Medical Care Disposal)", () => {
		test("generates valid Schema 531 XML version 1.38", () => {
			const params = {
				subjectId: "00000000123456",
				operationDate: "2026-08-25T14:30:00.000Z",
				docNum: "MED-531-0042",
				docDate: "2026-08-25",
				withdrawalType: 13,
				patientId: "pat-101",
				visitId: "vis-202",
				doctorId: "doc-303",
				items: [
					{
						sgtin: "036647980000161A2B3C4D5E6F7",
						gtin: "03664798000016",
						serialNumber: "1A2B3C4D5E6F7",
						costRub: 450.0,
						vatValueRub: 45.0,
					},
					{
						sgtin: "04046719000012UBI9988776655A",
						gtin: "04046719000012",
						serialNumber: "UBI9988776655A",
						costRub: 520.0,
						vatValueRub: 52.0,
					},
				],
			};

			const doc = generateMdlpSchema531Payload(params);

			assert.strictEqual(doc.actionId, 531);
			assert.strictEqual(doc.subjectId, "00000000123456");
			assert.strictEqual(doc.docNum, "MED-531-0042");
			assert.strictEqual(doc.withdrawalType, 13);
			assert.strictEqual(doc.items.length, 2);

			// XML checks
			assert(doc.xmlContent.includes('<withdrawal action_id="531">'));
			assert(doc.xmlContent.includes("<subject_id>00000000123456</subject_id>"));
			assert(doc.xmlContent.includes("<withdrawal_type>13</withdrawal_type>"));
			assert(doc.xmlContent.includes("<sgtin>036647980000161A2B3C4D5E6F7</sgtin>"));
			assert(doc.xmlContent.includes("<cost>450.00</cost>"));
			assert(doc.xmlContent.includes("<vat_value>45.00</vat_value>"));
			assert(doc.xmlContent.includes("<sgtin>04046719000012UBI9988776655A</sgtin>"));
			assert(doc.xmlContent.includes("<cost>520.00</cost>"));
			assert(doc.xmlContent.includes("<vat_value>52.00</vat_value>"));

			// JSON checks
			assert.strictEqual(doc.jsonContent.action_id, 531);
			assert.strictEqual(doc.jsonContent.withdrawal_type, 13);
			assert.strictEqual(doc.jsonContent.patient_id, "pat-101");
			assert.strictEqual(doc.jsonContent.doctor_id, "doc-303");
		});

		test("parses Schema 531 XML document back into structured parameters", () => {
			const original = {
				subjectId: "00000000999888",
				operationDate: "2026-08-25T16:00:00.000Z",
				docNum: "DISP-531-99",
				docDate: "2026-08-25",
				withdrawalType: 13,
				items: [
					{
						sgtin: "036647980000161A2B3C4D5E6F7",
						costRub: 480.0,
						vatValueRub: 48.0,
					},
				],
			};

			const doc = generateMdlpSchema531Payload(original);
			const parsed = parseMdlpSchema531Xml(doc.xmlContent);

			assert.strictEqual(parsed.subjectId, "00000000999888");
			assert.strictEqual(parsed.docNum, "DISP-531-99");
			assert.strictEqual(parsed.docDate, "2026-08-25");
			assert.strictEqual(parsed.withdrawalType, 13);
			assert.strictEqual(parsed.items.length, 1);
			assert.strictEqual(parsed.items[0]?.sgtin, "036647980000161A2B3C4D5E6F7");
			assert.strictEqual(parsed.items[0]?.costRub, 480.0);
			assert.strictEqual(parsed.items[0]?.vatValueRub, 48.0);
		});

		test("safeParseMdlpSchema531Xml gracefully handles errors", () => {
			const resultInvalid = safeParseMdlpSchema531Xml("<unknown_tag></unknown_tag>");
			assert.strictEqual(resultInvalid.success, false);

			const resultNull = safeParseMdlpSchema531Xml(null);
			assert.strictEqual(resultNull.success, false);
		});

		test("validateMdlpSchema531Params flags missing fields", () => {
			const validation = validateMdlpSchema531Params({
				subjectId: "",
				docNum: "",
				docDate: "",
				items: [],
			});

			assert.strictEqual(validation.isValid, false);
			assert(validation.errors.some((e) => e.includes("subjectId")));
			assert(validation.errors.some((e) => e.includes("docNum")));
			assert(validation.errors.some((e) => e.includes("docDate")));
			assert(validation.errors.some((e) => e.includes("не может быть пустым")));
		});
	});

	// ─── 5. Summary & Aggregation Metrics ───────────────────────────────────────
	describe("5. Scanning Aggregation & Metrics", () => {
		test("correctly calculates summary statistics from scanned items array", () => {
			const item1 = createChestnyZnakScannedItem(
				"010366479800001621SN1A2B3C4D5E6\x1d17280531\x1d10LOT1\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
				{ costRub: 450 },
			);
			const item2 = createChestnyZnakScannedItem(
				"010340093000001421SN2A2B3C4D5E6\x1d17281231\x1d10LOT2\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
				{ costRub: 390 },
			);
			const item3 = createChestnyZnakScannedItem(
				"010366479800001621SN3A2B3C4D5E6\x1d17240101\x1d10LOT1\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
				{ costRub: 450, referenceDate: new Date("2026-08-25") },
			);

			const summary = calculateChestnyZnakSummary([item1, item2, item3]);

			assert.strictEqual(summary.totalCount, 3);
			assert.strictEqual(summary.verifiedCount, 2);
			assert.strictEqual(summary.expiredCount, 1);
			assert.strictEqual(summary.totalCostRub, 1290);
			assert.strictEqual(summary.uniqueGtinCount, 2);
			assert.strictEqual(summary.uniqueSeriesCount, 2);
		});
	});
});
