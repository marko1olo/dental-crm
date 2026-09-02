import assert from "node:assert";
import { describe, it } from "node:test";
import {
	parseCryptoProError,
	withTimeout,
} from "../utils/cryptoPro";

describe("CryptoPro CSP Error Handling & Timeout Rigor", () => {
	it("correctly identifies and parses user cancellation (0x8010006E and 0x800704C7)", () => {
		const err1 = new Error("The operation was canceled by the user. (0x8010006E)");
		const parsed1 = parseCryptoProError(err1);
		assert.strictEqual(parsed1.isCancellation, true);
		assert.strictEqual(parsed1.code, "USER_CANCELLED");
		assert.ok(parsed1.userMessage.includes("отменена"));
		assert.ok(parsed1.userMessage.includes("PIN-кода"));

		const err2 = { message: "Action failed with 0x800704C7: Cancelled by user" };
		const parsed2 = parseCryptoProError(err2);
		assert.strictEqual(parsed2.isCancellation, true);
		assert.strictEqual(parsed2.code, "USER_CANCELLED");

		const err3 = "Пользователь нажал 'Отмена' в окне ввода PIN";
		const parsed3 = parseCryptoProError(err3);
		assert.strictEqual(parsed3.isCancellation, true);
	});

	it("translates missing hardware token error (0x80090016 / 0x8010000C)", () => {
		const err = new Error("Keyset does not exist (0x80090016)");
		const parsed = parseCryptoProError(err);
		assert.strictEqual(parsed.isCancellation, false);
		assert.strictEqual(parsed.code, "TOKEN_NOT_FOUND");
		assert.ok(parsed.userMessage.includes("Рутокен"));
		assert.ok(parsed.userMessage.includes("USB-порт"));
	});

	it("translates invalid PIN or token blocked error (0x8009001A)", () => {
		const err = new Error("Failed to sign: Invalid PIN entered (0x8009001A)");
		const parsed = parseCryptoProError(err);
		assert.strictEqual(parsed.isCancellation, false);
		assert.strictEqual(parsed.code, "INVALID_PIN");
		assert.ok(parsed.userMessage.includes("PIN-код"));
	});

	it("translates non-GOST algorithm mismatch error (0x80090008)", () => {
		const err = new Error("Bad algorithm specified (0x80090008)");
		const parsed = parseCryptoProError(err);
		assert.strictEqual(parsed.isCancellation, false);
		assert.strictEqual(parsed.code, "INVALID_ALGORITHM");
		assert.ok(parsed.userMessage.includes("ГОСТ Р 34.10-2012"));
		assert.ok(parsed.userMessage.includes("63-ФЗ"));
	});

	it("translates RPC / service unavailable error (0x800706BA)", () => {
		const err = new Error("The RPC server is unavailable. (0x800706BA)");
		const parsed = parseCryptoProError(err);
		assert.strictEqual(parsed.isCancellation, false);
		assert.strictEqual(parsed.code, "RPC_UNAVAILABLE");
		assert.ok(parsed.userMessage.includes("Служба КриптоПро CSP"));
	});

	it("withTimeout resolves quickly when promise completes before timeout", async () => {
		const fastPromise = new Promise<string>((resolve) => {
			setTimeout(() => resolve("success-token"), 50);
		});

		const result = await withTimeout(fastPromise, 500, "Таймаут");
		assert.strictEqual(result, "success-token");
	});

	it("withTimeout rejects with custom error when promise exceeds timeout limit", async () => {
		const slowPromise = new Promise<string>((resolve) => {
			setTimeout(() => resolve("too-late"), 500);
		});

		await assert.rejects(
			async () => {
				await withTimeout(slowPromise, 50, "Превышено время ожидания ввода PIN-кода (таймаут)");
			},
			{
				name: "Error",
				message: "Превышено время ожидания ввода PIN-кода (таймаут)",
			},
		);
	});
});
