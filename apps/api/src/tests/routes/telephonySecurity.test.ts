import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, test } from "node:test";
import {
	authenticatePbxWebhook,
	isForbiddenPrivateIp,
	normalizePhoneNumber,
	validateSsrfSafeRecordingUrl,
} from "../../routes/telephony.js";
import { checkReplayTimestamp } from "../../routes/telephony/telephonyEngine.js";

describe("IP Telephony Phone Normalization & E.164 Standards", () => {
	test("normalizes standard Russian 11-digit mobile numbers with +7 and 8", () => {
		const res1 = normalizePhoneNumber("+7 (999) 123-45-67");
		assert.equal(res1.isValid, true);
		assert.equal(res1.e164, "+79991234567");
		assert.equal(res1.national10, "9991234567");

		const res2 = normalizePhoneNumber("8 (999) 123-45-67");
		assert.equal(res2.isValid, true);
		assert.equal(res2.e164, "+79991234567");
		assert.equal(res2.national10, "9991234567");
	});

	test("normalizes 10-digit national numbers to +7", () => {
		const res = normalizePhoneNumber("9991234567");
		assert.equal(res.isValid, true);
		assert.equal(res.e164, "+79991234567");
		assert.equal(res.national10, "9991234567");
	});

	test("handles short or invalid numbers gracefully without crash", () => {
		const res1 = normalizePhoneNumber("");
		assert.equal(res1.isValid, false);

		const res2 = normalizePhoneNumber("123");
		assert.equal(res2.isValid, false);

		const res3 = normalizePhoneNumber(null);
		assert.equal(res3.isValid, false);
	});
});

describe("Telephony Audio Recording SSRF Mitigation & Private IP Defense", () => {
	test("identifies and blocks private, loopback, link-local, and cloud metadata IPs", () => {
		assert.equal(isForbiddenPrivateIp("127.0.0.1"), true);
		assert.equal(isForbiddenPrivateIp("10.0.1.5"), true);
		assert.equal(isForbiddenPrivateIp("192.168.1.1"), true);
		assert.equal(isForbiddenPrivateIp("172.16.0.1"), true);
		assert.equal(isForbiddenPrivateIp("169.254.169.254"), true); // AWS IMDS
		assert.equal(isForbiddenPrivateIp("::1"), true);
		assert.equal(isForbiddenPrivateIp("fc00::1"), true);
	});

	test("allows legitimate public IP addresses", () => {
		assert.equal(isForbiddenPrivateIp("8.8.8.8"), false);
		assert.equal(isForbiddenPrivateIp("1.1.1.1"), false);
		assert.equal(isForbiddenPrivateIp("213.180.204.62"), false); // Yandex
	});

	test("validateSsrfSafeRecordingUrl rejects non-http protocols (file:, javascript:, data:)", async () => {
		const fileUrl = await validateSsrfSafeRecordingUrl("file:///etc/passwd");
		assert.equal(fileUrl.valid, false);

		const jsUrl = await validateSsrfSafeRecordingUrl("javascript:alert(1)");
		assert.equal(jsUrl.valid, false);

		const dataUrl = await validateSsrfSafeRecordingUrl("data:text/html,evil");
		assert.equal(dataUrl.valid, false);
	});
});

describe("Mango Office PBX Signature Verification", () => {
	test("verifies Mango HMAC-SHA256 signature calculated from vpbx_api_key + json + api_salt", async () => {
		const vpbxApiKey = "test-vpbx-api-key-12345";
		const apiSalt = "test-api-salt-secret-999";
		const jsonStr = JSON.stringify({ entry_id: "entry-001", call_id: "mango-call-123" });
		const sign = createHash("sha256").update(`${vpbxApiKey}${jsonStr}${apiSalt}`).digest("hex");

		const prevSalt = process.env.MANGO_API_SALT;
		process.env.MANGO_API_SALT = apiSalt;

		try {
			const mockReq = {
				headers: {},
				query: {},
				body: {
					vpbx_api_key: vpbxApiKey,
					sign,
					json: jsonStr,
				},
				log: { warn: () => {}, error: () => {} },
				ip: "127.0.0.1",
				url: "/telephony/webhook",
			} as unknown as Parameters<typeof authenticatePbxWebhook>[0];

			const mockReply = {
				status: () => mockReply,
				send: () => mockReply,
			} as unknown as Parameters<typeof authenticatePbxWebhook>[1];

			const payload = {
				vpbx_api_key: vpbxApiKey,
				sign,
			};

			const isValid = await authenticatePbxWebhook(mockReq, mockReply, "00000000-0000-0000-0000-000000000001", payload);
			assert.equal(isValid, true);
		} finally {
			if (prevSalt !== undefined) process.env.MANGO_API_SALT = prevSalt;
			else delete process.env.MANGO_API_SALT;
		}
	});

	test("verifies Mango signature when body is urlencoded string", async () => {
		const vpbxApiKey = "test-vpbx-api-key-12345";
		const apiSalt = "test-api-salt-secret-999";
		const jsonStr = JSON.stringify({ entry_id: "entry-002", call_id: "mango-call-456" });
		const sign = createHash("sha256").update(`${vpbxApiKey}${jsonStr}${apiSalt}`).digest("hex");

		const prevSalt = process.env.MANGO_API_SALT;
		process.env.MANGO_API_SALT = apiSalt;

		try {
			const bodyStr = `vpbx_api_key=${encodeURIComponent(vpbxApiKey)}&sign=${sign}&json=${encodeURIComponent(jsonStr)}`;

			const mockReq = {
				headers: {},
				query: {},
				body: bodyStr,
				log: { warn: () => {}, error: () => {} },
				ip: "127.0.0.1",
				url: "/telephony/webhook",
			} as unknown as Parameters<typeof authenticatePbxWebhook>[0];

			const mockReply = {
				status: () => mockReply,
				send: () => mockReply,
			} as unknown as Parameters<typeof authenticatePbxWebhook>[1];

			const payload = {
				vpbx_api_key: vpbxApiKey,
				sign,
			};

			const isValid = await authenticatePbxWebhook(mockReq, mockReply, "00000000-0000-0000-0000-000000000001", payload);
			assert.equal(isValid, true);
		} finally {
			if (prevSalt !== undefined) process.env.MANGO_API_SALT = prevSalt;
			else delete process.env.MANGO_API_SALT;
		}
	});

	test("rejects forged or tampered Mango signature", async () => {
		const vpbxApiKey = "test-vpbx-api-key-12345";
		const apiSalt = "test-api-salt-secret-999";
		const jsonStr = JSON.stringify({ entry_id: "entry-001", call_id: "mango-call-123" });
		const forgedSign = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

		const prevSalt = process.env.MANGO_API_SALT;
		process.env.MANGO_API_SALT = apiSalt;

		try {
			let statusSent = 0;
			const mockReq = {
				headers: {},
				query: {},
				body: {
					vpbx_api_key: vpbxApiKey,
					sign: forgedSign,
					json: jsonStr,
				},
				log: { warn: () => {}, error: () => {} },
				ip: "127.0.0.1",
				url: "/telephony/webhook",
			} as unknown as Parameters<typeof authenticatePbxWebhook>[0];

			const mockReply = {
				status: (code: number) => { statusSent = code; return mockReply; },
				send: () => mockReply,
			} as unknown as Parameters<typeof authenticatePbxWebhook>[1];

			const payload = {
				vpbx_api_key: vpbxApiKey,
				sign: forgedSign,
			};

			const isValid = await authenticatePbxWebhook(mockReq, mockReply, "00000000-0000-0000-0000-000000000001", payload);
			assert.equal(isValid, false);
			assert.equal(statusSent, 401);
		} finally {
			if (prevSalt !== undefined) process.env.MANGO_API_SALT = prevSalt;
			else delete process.env.MANGO_API_SALT;
		}
	});
});

describe("Telephony Webhook Replay Protection", () => {
	test("rejects timestamps older than 300 seconds for ringing/in-flight calls", () => {
		const oldTimestamp = Math.floor(Date.now() / 1000) - 350;
		const result = checkReplayTimestamp({ timestamp: oldTimestamp, event: "ringing" });
		assert.equal(result.valid, false);
		assert.match(result.reason || "", /drift window exceeded/i);
	});

	test("accepts timestamps within 300-second window", () => {
		const freshTimestamp = Math.floor(Date.now() / 1000) - 5;
		const result = checkReplayTimestamp({ timestamp: freshTimestamp });
		assert.equal(result.valid, true);
	});

	test("allows drift window up to 3600s for ended/CDR calls with long call duration (>300s)", () => {
		const pastTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
		const result = checkReplayTimestamp({
			timestamp: pastTimestamp,
			event: "ended",
			duration: 600,
		});
		assert.equal(result.valid, true);
	});

	test("rejects ended call timestamp older than 3600s (>1 hour)", () => {
		const ancientTimestamp = Math.floor(Date.now() / 1000) - 3700;
		const result = checkReplayTimestamp({
			timestamp: ancientTimestamp,
			event: "ended",
		});
		assert.equal(result.valid, false);
		assert.match(result.reason || "", /drift window exceeded/i);
	});
});
