import assert from "node:assert";
import { describe, test } from "node:test";
import { frozenTaxXmlPayments } from "../routes/documents.js";
import {
	createTestGeneratedDocument,
	createTestPayment,
	createTestTaxXmlSourceSnapshot,
} from "./testDocumentFixtures.js";

describe("frozenTaxXmlPayments", () => {
	const p1 = createTestPayment({ id: "00000000-0000-0000-0000-000000000001" });
	const p2 = createTestPayment({ id: "00000000-0000-0000-0000-000000000002" });
	const fallbackPayments = [createTestPayment({ id: "00000000-0000-0000-0000-000000000099" })];

	test("returns payments from taxXmlSourceSnapshot if present", () => {
		const document = createTestGeneratedDocument({
			taxXmlSourceSnapshot: createTestTaxXmlSourceSnapshot({
				payments: [p1, p2],
			}),
		});
		const result = frozenTaxXmlPayments(document, fallbackPayments);
		assert.deepStrictEqual(result, [p1, p2]);
	});

	test("returns fallbackPayments if taxXmlSourceSnapshot is missing", () => {
		const document = createTestGeneratedDocument({
			taxXmlSourceSnapshot: null,
		});
		const result = frozenTaxXmlPayments(document, fallbackPayments);
		assert.deepStrictEqual(result, fallbackPayments);
	});

	test("returns fallbackPayments if payments is undefined in taxXmlSourceSnapshot", () => {
		const document = createTestGeneratedDocument({
			taxXmlSourceSnapshot: null,
		});
		const result = frozenTaxXmlPayments(document, fallbackPayments);
		assert.deepStrictEqual(result, fallbackPayments);
	});

	test("returns empty array from taxXmlSourceSnapshot if it is empty", () => {
		const document = createTestGeneratedDocument({
			taxXmlSourceSnapshot: createTestTaxXmlSourceSnapshot({
				payments: [],
			}),
		});
		const result = frozenTaxXmlPayments(document, fallbackPayments);
		assert.deepStrictEqual(result, []);
	});
});
