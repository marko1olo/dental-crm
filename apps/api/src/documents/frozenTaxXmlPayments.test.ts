import assert from "node:assert";
import { describe, test } from "node:test";
import { frozenTaxXmlPayments } from "../routes/documents.js";

describe("frozenTaxXmlPayments", () => {
	test("returns payments from taxXmlSourceSnapshot if present", () => {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const document: any = {
			taxXmlSourceSnapshot: {
				payments: [{ id: "payment-1" }, { id: "payment-2" }],
			},
		};
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const fallbackPayments: any[] = [{ id: "fallback-payment" }];
		const result = frozenTaxXmlPayments(document, fallbackPayments);
		assert.deepStrictEqual(result, [{ id: "payment-1" }, { id: "payment-2" }]);
	});

	test("returns fallbackPayments if taxXmlSourceSnapshot is missing", () => {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const document: any = {};
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const fallbackPayments: any[] = [{ id: "fallback-payment" }];
		const result = frozenTaxXmlPayments(document, fallbackPayments);
		assert.deepStrictEqual(result, [{ id: "fallback-payment" }]);
	});

	test("returns fallbackPayments if payments is undefined in taxXmlSourceSnapshot", () => {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const document: any = {
			taxXmlSourceSnapshot: {},
		};
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const fallbackPayments: any[] = [{ id: "fallback-payment" }];
		const result = frozenTaxXmlPayments(document, fallbackPayments);
		assert.deepStrictEqual(result, [{ id: "fallback-payment" }]);
	});

	test("returns empty array from taxXmlSourceSnapshot if it is empty", () => {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const document: any = {
			taxXmlSourceSnapshot: {
				payments: [],
			},
		};
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const fallbackPayments: any[] = [{ id: "fallback-payment" }];
		const result = frozenTaxXmlPayments(document, fallbackPayments);
		assert.deepStrictEqual(result, []);
	});
});
