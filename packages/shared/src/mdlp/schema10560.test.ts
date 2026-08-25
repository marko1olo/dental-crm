import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	generateMdlpSchema10560Payload,
	parseMdlpSchema10560Xml,
	validateMdlpSchema10560Params,
} from "./index.js";

describe("MDLP Schema 10560 (Medical Care Disposal) XML Generator & Parser", () => {
	test("generates valid Schema 10560 XML version 1.38 with union and sgtin elements", () => {
		const params = {
			subjectId: "00000000123456",
			operationDate: "2026-08-25T15:30:00.000Z",
			docNum: "AMB-2026-08912",
			docDate: "2026-08-25",
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
		assert.strictEqual(doc.docDate, "2026-08-25");
		assert.strictEqual(doc.items.length, 2);

		// Check XML structure
		assert(doc.xmlContent.includes('<withdrawal action_id="10560">'));
		assert(doc.xmlContent.includes("<subject_id>00000000123456</subject_id>"));
		assert(doc.xmlContent.includes("<withdrawal_type>13</withdrawal_type>"));
		assert(doc.xmlContent.includes("<doc_num>AMB-2026-08912</doc_num>"));
		assert(doc.xmlContent.includes("<sgtin>036647980000161A2B3C4D5E6F7</sgtin>"));
		assert(doc.xmlContent.includes("<sgtin>03400930000038SN1234567890A</sgtin>"));
		assert(doc.xmlContent.includes("<cost>450.00</cost>"));
		assert(doc.xmlContent.includes("<cost>380.50</cost>"));

		// Check JSON content
		assert.strictEqual(doc.jsonContent.action_id, 10560);
		assert.strictEqual(doc.jsonContent.withdrawal_type, 13);
		assert.strictEqual(doc.jsonContent.patient_id, "p-uuid-1234");
	});

	test("supports custom withdrawal type 6 when specified in options", () => {
		const doc = generateMdlpSchema10560Payload(
			{
				subjectId: "00000000123456",
				docNum: "MED-01",
				docDate: "2026-08-25",
				items: [
					{
						sgtin: "036647980000161A2B3C4D5E6F7",
						gtin: "03664798000016",
						serialNumber: "1A2B3C4D5E6F7",
					},
				],
			},
			{ defaultWithdrawalType: 6 },
		);

		assert(doc.xmlContent.includes("<withdrawal_type>6</withdrawal_type>"));
	});

	test("parseMdlpSchema10560Xml correctly parses generated XML back to structured parameters", () => {
		const original = {
			subjectId: "ORG1234567890",
			operationDate: "2026-08-25T12:00:00.000Z",
			docNum: "ACT-881",
			docDate: "2026-08-25",
			items: [
				{
					sgtin: "036647980000161A2B3C4D5E6F7",
					gtin: "03664798000016",
					serialNumber: "1A2B3C4D5E6F7",
					costRub: 420.0,
				},
			],
		};

		const doc = generateMdlpSchema10560Payload(original);
		const parsed = parseMdlpSchema10560Xml(doc.xmlContent);

		assert.strictEqual(parsed.subjectId, "ORG1234567890");
		assert.strictEqual(parsed.docNum, "ACT-881");
		assert.strictEqual(parsed.docDate, "2026-08-25");
		assert.strictEqual(parsed.items.length, 1);
		assert.strictEqual(parsed.items[0]?.sgtin, "036647980000161A2B3C4D5E6F7");
		assert.strictEqual(parsed.items[0]?.costRub, 420.0);
	});

	test("validateMdlpSchema10560Params flags missing or malformed inputs", () => {
		const invalid = validateMdlpSchema10560Params({
			subjectId: "",
			docNum: "",
			docDate: "",
			items: [],
		});

		assert.strictEqual(invalid.isValid, false);
		assert(invalid.errors.some((e) => e.includes("subjectId")));
		assert(invalid.errors.some((e) => e.includes("docNum")));
		assert(invalid.errors.some((e) => e.includes("docDate")));
		assert(invalid.errors.some((e) => e.includes("не может быть пустым")));
	});
});
