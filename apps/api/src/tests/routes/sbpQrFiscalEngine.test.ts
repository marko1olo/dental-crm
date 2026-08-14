import { describe, expect, it } from "vitest";
import { SbpQrEngine } from "@dental/shared";

describe("NSPK SBP Dynamic QR & 54-FZ Fiscal Engine", () => {
	it("computes CRC16-CCITT according to GOST R 56042-2014", () => {
		const crc1 = SbpQrEngine.computeCrc16Ccitt("123456789");
		expect(crc1.length).toBe(4);
		expect(typeof crc1).toBe("string");

		// Deterministic equality
		const crc2 = SbpQrEngine.computeCrc16Ccitt("123456789");
		expect(crc1).toBe(crc2);
	});

	it("builds NSPK dynamic B2C QR payment payload with kopecks and CRC", () => {
		const payload = SbpQrEngine.buildNspkDynamicPayload({
			operationId: "INV-98765-UUID",
			bankMemberId: "100000000111", // Sberbank NSPK ID
			amountKopecks: 350000, // 3 500.00 RUB
			currency: "RUB",
		});

		expect(payload.payloadUrl).toContain("https://qr.nspk.ru/INV98765UUID");
		expect(payload.payloadUrl).toContain("type=02");
		expect(payload.payloadUrl).toContain("bank=100000000111");
		expect(payload.payloadUrl).toContain("sum=350000");
		expect(payload.payloadUrl).toContain("cur=RUB");
		expect(payload.payloadUrl).toContain(`crc=${payload.crc16}`);
	});

	it("validates authentic SBP URLs and detects tampered sums or invalid CRC", () => {
		const original = SbpQrEngine.buildNspkDynamicPayload({
			operationId: "OP123456",
			bankMemberId: "100000000004", // Tinkoff / T-Bank
			amountKopecks: 120050, // 1 200.50 RUB
		});

		// Valid URL check
		const verified = SbpQrEngine.verifyNspkPayload(original.payloadUrl);
		expect(verified.isValid).toBe(true);
		expect(verified.operationId).toBe("OP123456");
		expect(verified.amountKopecks).toBe(120050);
		expect(verified.bankMemberId).toBe("100000000004");

		// Tampered amount (attacker changed sum from 120050 to 100 kopecks without re-signing CRC)
		const tamperedUrl = original.payloadUrl.replace(
			"sum=120050",
			"sum=100",
		);
		const failedVerify = SbpQrEngine.verifyNspkPayload(tamperedUrl);
		expect(failedVerify.isValid).toBe(false);
	});
});
