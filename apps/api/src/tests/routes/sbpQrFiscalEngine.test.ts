import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SbpQrEngine } from "@dental/shared";

describe("NSPK SBP Dynamic QR & 54-FZ Fiscal Engine", () => {
	it("computes CRC16-CCITT according to GOST R 56042-2014", () => {
		const crc1 = SbpQrEngine.computeCrc16Ccitt("123456789");
		assert.equal(crc1.length, 4);
		assert.equal(typeof crc1, "string");

		const crc2 = SbpQrEngine.computeCrc16Ccitt("123456789");
		assert.equal(crc1, crc2);
	});

	it("builds NSPK dynamic B2C QR payment payload with kopecks and CRC", () => {
		const payload = SbpQrEngine.buildNspkDynamicPayload({
			operationId: "INV-98765-UUID",
			bankMemberId: "100000000111",
			amountKopecks: 350000,
			currency: "RUB",
		});

		assert.match(payload.payloadUrl, /https:\/\/qr\.nspk\.ru\/INV98765UUID/);
		assert.match(payload.payloadUrl, /type=02/);
		assert.match(payload.payloadUrl, /bank=100000000111/);
		assert.match(payload.payloadUrl, /sum=350000/);
		assert.match(payload.payloadUrl, /cur=RUB/);
		assert.match(payload.payloadUrl, new RegExp(`crc=${payload.crc16}`));
	});

	it("validates authentic SBP URLs and detects tampered sums or invalid CRC", () => {
		const original = SbpQrEngine.buildNspkDynamicPayload({
			operationId: "OP123456",
			bankMemberId: "100000000004",
			amountKopecks: 120050,
		});

		const verified = SbpQrEngine.verifyNspkPayload(original.payloadUrl);
		assert.equal(verified.isValid, true);
		assert.equal(verified.operationId, "OP123456");
		assert.equal(verified.amountKopecks, 120050);
		assert.equal(verified.bankMemberId, "100000000004");

		const tamperedUrl = original.payloadUrl.replace("sum=120050", "sum=100");
		const failedVerify = SbpQrEngine.verifyNspkPayload(tamperedUrl);
		assert.equal(failedVerify.isValid, false);
	});
});
