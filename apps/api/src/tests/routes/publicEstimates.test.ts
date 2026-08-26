import assert from "node:assert";
import { describe, test } from "node:test";
import { createDenteApiApp } from "../../server.js";
import { PublicEstimatesService } from "../../services/publicEstimatesService.js";

describe("Public 2FA Estimates & Signature Routes", async () => {
	const app = await createDenteApiApp({
		startTelegramWorker: false,
		startCommunicationWorker: false,
		startMigrationWorker: false,
	});

	const testToken = "demo-test-token-12345678";

	test("GET /api/public/estimates/:token/meta returns public metadata without sensitive PII", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/public/estimates/${testToken}/meta`,
		});

		assert.strictEqual(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.ok(body.data);
		assert.strictEqual(body.data.requires_verification, true);
		assert.strictEqual(body.data.method, "phone_last4");
		assert.strictEqual(body.data.patient_first_name, "Алексей");
		assert.ok(body.data.estimate_number);
		assert.strictEqual(body.data.locked, false);
		assert.strictEqual(body.data.expired, false);
	});

	test("POST /api/public/estimates/:token/verify handles invalid code and tracks attempts", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/public/estimates/${testToken}/verify`,
			payload: {
				method: "phone_last4",
				value: "0000",
			},
		});

		assert.strictEqual(res.statusCode, 401);
		const body = JSON.parse(res.body);
		assert.strictEqual(body.error, "VerificationFailed");
	});

	test("POST /api/public/estimates/:token/verify verifies valid factor and issues session token and cookie", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/public/estimates/${testToken}/verify`,
			payload: {
				method: "phone_last4",
				value: "4567",
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.strictEqual(body.success, true);
		assert.ok(body.sessionToken);

		// Verify Set-Cookie header
		const setCookie = res.headers["set-cookie"];
		assert.ok(setCookie);
		assert.ok(String(setCookie).includes(`bdg_session_${testToken}`));
	});

	test("GET /api/public/estimates/:token requires verification and returns 401 without auth", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/public/estimates/${testToken}`,
		});

		assert.strictEqual(res.statusCode, 401);
	});

	test("GET /api/public/estimates/:token returns itemized breakdown with valid session token", async () => {
		// First verify to get session token
		const verifyRes = await app.inject({
			method: "POST",
			url: `/api/public/estimates/${testToken}/verify`,
			payload: {
				method: "phone_last4",
				value: "4567",
			},
		});
		const { sessionToken } = JSON.parse(verifyRes.body);

		const res = await app.inject({
			method: "GET",
			url: `/api/public/estimates/${testToken}`,
			headers: {
				Authorization: `Bearer ${sessionToken}`,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.ok(body.data);
		assert.ok(Array.isArray(body.data.items));
		assert.strictEqual(body.data.items.length, 3);
		assert.ok(body.data.total_rub > 0);
		assert.ok(Array.isArray(body.data.tier_options));
		assert.strictEqual(body.data.tier_options.length, 3);
	});

	test("POST /api/public/estimates/:token/accept captures digital signature and hashes document", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/public/estimates/${testToken}/accept`,
			payload: {
				signerName: "Алексей Иванов",
				signatureMethod: "click_accept",
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.strictEqual(body.success, true);
		assert.strictEqual(body.status, "accepted");
		assert.ok(body.documentHash);
	});

	test("GET /api/public/estimates/:token/pdf/signed serves signed certificate HTML", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/public/estimates/${testToken}/pdf/signed`,
		});

		assert.strictEqual(res.statusCode, 200);
		assert.ok(res.headers["content-type"]?.includes("text/html"));
		assert.ok(res.body.includes("Утвержденный план лечения"));
		assert.ok(res.body.includes("Контрольный хеш целостности"));
	});
});
