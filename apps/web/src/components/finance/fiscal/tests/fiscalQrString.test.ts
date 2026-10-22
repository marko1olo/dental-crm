import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFnsFiscalReceiptQrString } from "../fiscal54fzEngine";

describe("Fiscal QR String Tests", () => {
	it("1.1 buildFnsFiscalReceiptQrString — Statutory FNS QR verification string construction", () => {
		const qrIncome = buildFnsFiscalReceiptQrString({
			issuedAtIso: "2026-08-25T14:30:00.000Z",
			totalRubFormatted: "12450.75",
			fnSerial: "9960440302145896",
			fiscalDocNumber: "48291",
			fiscalSign: "3920194821",
			operationType: "income",
		});
		assert.ok(qrIncome.includes("s=12450.75"));
		assert.ok(qrIncome.includes("fn=9960440302145896"));
		assert.ok(qrIncome.includes("i=48291"));
		assert.ok(qrIncome.includes("fp=3920194821"));
		assert.ok(qrIncome.endsWith("&n=1"));
	});
});
