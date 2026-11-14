import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { describe, it, beforeEach, afterEach } from "node:test";
import { TelephonyGatewayService } from "../telephonyGatewayService.js";

describe("TelephonyGatewayService: Real Provider Adapters & Outbound Call", () => {
	const originalEnv = { ...process.env };
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = { ...originalEnv };
		globalThis.fetch = originalFetch;
	});

	it("1. Honest PBX check: initiateOutboundCall returns dispatched: false when keys are not set", async () => {
		delete process.env.MANGO_API_KEY;
		delete process.env.MANGO_VPBX_API_KEY;
		delete process.env.ZADARMA_API_KEY;
		delete process.env.ASTERISK_AMI_SECRET;

		const warnLogs: string[] = [];
		const originalWarn = console.warn;
		console.warn = (...args: unknown[]) => {
			warnLogs.push(args.map(String).join(" "));
		};

		try {
			const result = await TelephonyGatewayService.initiateOutboundCall({
				organizationId: "00000000-0000-0000-0000-000000000001",
				callerPhone: { e164: "+79991234567", national10: "9991234567" },
				patientName: "Тестовый Пациент",
			});

			assert.equal(result.dispatched, false);
			assert.equal(result.error, "АТС телефонии не подключена в клинике");
			assert.ok(result.callId.startsWith("outbound-"));
		} finally {
			console.warn = originalWarn;
		}
	});

	it("2. Mango Office Adapter: dispatchMangoCallback sends correctly signed SHA-256 payload", async () => {
		const testApiKey = "test-mango-api-key-12345";
		const testApiSalt = "test-mango-salt-67890";
		const testPhone = "+79161112233";
		const testCallId = "outbound-mango-unit-test";
		const testExtension = "105";

		let capturedUrl = "";
		let capturedMethod = "";
		let capturedHeaders: Record<string, string> = {};
		let capturedBody = "";

		globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
			capturedUrl = String(url);
			capturedMethod = init?.method || "";
			capturedHeaders = (init?.headers || {}) as Record<string, string>;
			capturedBody = String(init?.body || "");

			return {
				ok: true,
				status: 200,
				json: async () => ({ result: 1000, message: "Success" }),
				text: async () => '{"result": 1000}',
			} as Response;
		}) as typeof fetch;

		const result = await TelephonyGatewayService.dispatchMangoCallback({
			callId: testCallId,
			apiKey: testApiKey,
			apiSalt: testApiSalt,
			phone: testPhone,
			extension: testExtension,
		});

		assert.equal(result.success, true);
		assert.equal(capturedUrl, "https://app.mango-office.ru/vpbx/commands/callback");
		assert.equal(capturedMethod, "POST");
		assert.equal(capturedHeaders["Content-Type"], "application/x-www-form-urlencoded");

		const parsedParams = new URLSearchParams(capturedBody);
		assert.equal(parsedParams.get("vpbx_api_key"), testApiKey);

		const jsonStr = parsedParams.get("json");
		assert.ok(jsonStr, "json parameter must be present");
		const parsedJson = JSON.parse(jsonStr);
		assert.equal(parsedJson.command_id, testCallId);
		assert.equal(parsedJson.to_number, testPhone);
		assert.equal(parsedJson.from.extension, testExtension);

		// Verify SHA-256 signature formula: sha256(api_key + json + api_salt)
		const expectedSign = createHash("sha256")
			.update(`${testApiKey}${jsonStr}${testApiSalt}`)
			.digest("hex");
		assert.equal(parsedParams.get("sign"), expectedSign);
	});

	it("3. Zadarma Adapter: dispatchZadarmaCallback sends HMAC-SHA1 Authorization header", async () => {
		const testApiKey = "test-zadarma-key-abc";
		const testApiSecret = "test-zadarma-secret-xyz";
		const testPhone = "+79169998877";
		const testCallId = "outbound-zadarma-unit-test";
		const testExtension = "102";

		let capturedUrl = "";
		let capturedMethod = "";
		let capturedHeaders: Record<string, string> = {};
		let capturedBody = "";

		globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
			capturedUrl = String(url);
			capturedMethod = init?.method || "";
			capturedHeaders = (init?.headers || {}) as Record<string, string>;
			capturedBody = String(init?.body || "");

			return {
				ok: true,
				status: 200,
				json: async () => ({ status: "success", call_id: "zd-12345" }),
				text: async () => '{"status":"success"}',
			} as Response;
		}) as typeof fetch;

		const result = await TelephonyGatewayService.dispatchZadarmaCallback({
			callId: testCallId,
			apiKey: testApiKey,
			apiSecret: testApiSecret,
			phone: testPhone,
			extension: testExtension,
		});

		assert.equal(result.success, true);
		assert.equal(capturedUrl, "https://api.zadarma.com/v1/request/callback/");
		assert.equal(capturedMethod, "POST");
		assert.equal(capturedHeaders["Content-Type"], "application/x-www-form-urlencoded");

		// Verify HMAC-SHA1 signature
		const paramsStr = `from=${encodeURIComponent(testExtension)}&to=${encodeURIComponent(testPhone)}`;
		assert.equal(capturedBody, paramsStr);

		const md5Str = createHash("md5").update(paramsStr).digest("hex");
		const dataToSign = `/v1/request/callback/${paramsStr}${md5Str}`;
		const expectedSignature = createHmac("sha1", testApiSecret).update(dataToSign).digest("base64");
		assert.equal(capturedHeaders.Authorization, `${testApiKey}:${expectedSignature}`);
	});

	it("4. Mango callback error propagation: handles HTTP error response gracefully", async () => {
		globalThis.fetch = (async () => {
			return {
				ok: false,
				status: 403,
				statusText: "Forbidden",
				text: async () => "Invalid VPBX key or signature",
			} as Response;
		}) as typeof fetch;

		await assert.rejects(
			async () => {
				await TelephonyGatewayService.dispatchMangoCallback({
					callId: "call-err-1",
					apiKey: "bad-key",
					apiSalt: "bad-salt",
					phone: "+79990001122",
					extension: "101",
				});
			},
			{
				message: /Mango HTTP 403/,
			},
		);
	});
});
