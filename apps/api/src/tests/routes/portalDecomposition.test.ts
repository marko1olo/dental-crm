import assert from "node:assert/strict";
import { describe, test } from "node:test";
import Fastify from "fastify";
import { requireAuthTokenSecret } from "../../accessGuard.js";
import type { TenantDb } from "../../db/rls.js";
import {
	OTP_EXPIRY_SECONDS,
	OTP_MAX_REQUESTS_PER_IP,
	OTP_MAX_REQUESTS_PER_PHONE,
	OTP_RATE_LIMIT_WINDOW_MS,
	PORTAL_CONSENT_REGISTRY,
	PORTAL_ROLES,
	PORTAL_TOKEN_KIND,
	PORTAL_TOKEN_TTL_SECONDS,
	extractPortalPatient,
	otpIpRequestCounts,
	otpPhoneRequestCounts,
	portalRevokedBeforeByPatient,
	portalRoutes,
	resetPortalOtpRateLimitsForTesting,
	resetPortalRevokedTokensForTesting,
	revokedPortalTokens,
} from "../../routes/portal/index.js";
import {
	generateDeterministicQrSvg,
	generateNumericCode,
	generateSha256Hex,
	readBoundedInt,
	renderOtpMessage,
} from "../../routes/portal/portalUtils.js";
import type { PortalOtpPolicy } from "../../routes/portal/types.js";
import { registerTelegramReferralLoyaltyRoutes } from "../../routes/telegramBotLoyalty/index.js";
import { signToken } from "../../utils/cryptoHelper.js";

describe("Patient Portal Decomposition & Regression Suite (Mandate 8b, P0-P2)", () => {
	test("portalUtils: pure helper functions preserve exact specifications", () => {
		const code6 = generateNumericCode(6);
		assert.strictEqual(code6.length, 6);
		assert.match(code6, /^\d{6}$/);

		const code8 = generateNumericCode(8);
		assert.strictEqual(code8.length, 8);
		assert.match(code8, /^\d{8}$/);

		const mockPolicy: PortalOtpPolicy = {
			codeLength: 6,
			ttlSeconds: 300,
			maxAttempts: 5,
			resendCooldownSeconds: 60,
			maxPerWindow: 3,
			windowSeconds: 600,
			retentionSeconds: 86400,
			smsTemplate: "Код {code}, действует {minutes} мин.",
		};
		const rendered = renderOtpMessage(mockPolicy, "123456");
		assert.strictEqual(rendered, "Код 123456, действует 5 мин.");

		const hash = generateSha256Hex("dente_clinical_test");
		assert.strictEqual(hash.length, 64);
		assert.match(hash, /^[0-9a-f]{64}$/);

		const qrSvg = generateDeterministicQrSvg("https://qr.nspk.ru/test", 180);
		assert.ok(qrSvg.startsWith("<svg"));
		assert.ok(qrSvg.includes('viewBox="0 0 180 180"'));
		assert.ok(qrSvg.endsWith("</svg>"));

		assert.strictEqual(readBoundedInt("NON_EXISTENT_VAR", 42, 10, 100), 42);
	});

	test("portalAuthStore: stores and test resets work cleanly", () => {
		revokedPortalTokens.add("token1");
		portalRevokedBeforeByPatient.set("patient1", 123456);
		assert.strictEqual(revokedPortalTokens.size, 1);
		assert.strictEqual(portalRevokedBeforeByPatient.size, 1);

		resetPortalRevokedTokensForTesting();
		assert.strictEqual(revokedPortalTokens.size, 0);
		assert.strictEqual(portalRevokedBeforeByPatient.size, 0);

		otpIpRequestCounts.set("127.0.0.1", { count: 3, resetAt: Date.now() + 1000 });
		otpPhoneRequestCounts.set("9137704199", { count: 2, resetAt: Date.now() + 1000 });
		assert.strictEqual(otpIpRequestCounts.size, 1);
		assert.strictEqual(otpPhoneRequestCounts.size, 1);

		resetPortalOtpRateLimitsForTesting();
		assert.strictEqual(otpIpRequestCounts.size, 0);
		assert.strictEqual(otpPhoneRequestCounts.size, 0);
	});

	test("Regression: extractPortalPatient queries DB revocation store when in-memory cache is cold", async () => {
		const prevPersistence = process.env.DENTAL_STATE_PERSISTENCE;
		const prevSecret = process.env.DENTE_AUTH_TOKEN_SECRET;
		process.env.DENTAL_STATE_PERSISTENCE = "on";
		process.env.DENTE_AUTH_TOKEN_SECRET =
			process.env.DENTE_AUTH_TOKEN_SECRET || "portal-test-secret-32-characters-long-key!";

		try {
			resetPortalRevokedTokensForTesting();
			const token = signToken(
				{
					sub: "00000000-0000-4000-8000-000000000011",
					organizationId: "00000000-0000-4000-8000-000000000022",
					kind: PORTAL_TOKEN_KIND,
				},
				requireAuthTokenSecret(),
				3600,
			);

			const createMockExecutor = (rows: Array<{ tokenHash: string }>) =>
				({
					select: () => ({
						from: () => ({
							where: () => ({
								limit: async () => rows,
							}),
						}),
					}),
				}) as unknown as TenantDb;

			const req = {
				headers: { authorization: `Bearer ${token}` },
			} as unknown as Parameters<typeof extractPortalPatient>[0];

			// 1. Not revoked in DB -> authorized
			const allowed = await extractPortalPatient(req, createMockExecutor([]));
			assert.deepStrictEqual(allowed, {
				patientId: "00000000-0000-4000-8000-000000000011",
				organizationId: "00000000-0000-4000-8000-000000000022",
			});

			// 2. Revoked in DB while in-memory Set is empty -> rejected
			resetPortalRevokedTokensForTesting();
			const revoked = await extractPortalPatient(
				req,
				createMockExecutor([{ tokenHash: generateSha256Hex(token) }]),
			);
			assert.strictEqual(revoked, null, "Must reject token revoked in DB on cold in-memory cache");
		} finally {
			resetPortalRevokedTokensForTesting();
			process.env.DENTAL_STATE_PERSISTENCE = prevPersistence;
			process.env.DENTE_AUTH_TOKEN_SECRET = prevSecret;
		}
	});

	test("portalRoutes: registers canonical patient portal endpoints and enforces confirm-sbp Idempotency-Key", async () => {
		const prevPersistence = process.env.DENTAL_STATE_PERSISTENCE;
		const prevSecret = process.env.DENTE_AUTH_TOKEN_SECRET;
		process.env.DENTAL_STATE_PERSISTENCE = "off";
		process.env.DENTE_AUTH_TOKEN_SECRET =
			process.env.DENTE_AUTH_TOKEN_SECRET || "portal-test-secret-32-characters-long-key!";

		const app = Fastify({ logger: false });
		await app.register(portalRoutes, { prefix: "/api/portal" });
		await app.ready();

		try {
			const sendOtpRes = await app.inject({
				method: "POST",
				url: "/api/portal/auth/send-otp",
				payload: {},
			});
			assert.strictEqual(sendOtpRes.statusCode, 400);
			assert.deepStrictEqual(JSON.parse(sendOtpRes.body), {
				error: "PhoneRequired",
				message: "Укажите номер телефона.",
			});

			const verifyOtpRes = await app.inject({
				method: "POST",
				url: "/api/portal/auth/verify-otp",
				payload: {},
			});
			assert.strictEqual(verifyOtpRes.statusCode, 400);

			for (const [method, url] of [
				["POST", "/api/portal/auth/logout"],
				["GET", "/api/portal/me"],
				["GET", "/api/portal/profile"],
				["GET", "/api/portal/consents"],
				["POST", "/api/portal/consents/ids_treatment/sign"],
				["GET", "/api/portal/documents/doc-123/html"],
				["GET", "/api/portal/health-questionnaire"],
				["POST", "/api/portal/health-questionnaire"],
				["GET", "/api/portal/treatment-plans"],
				["POST", "/api/portal/treatment-plans/plan-123/select-tier"],
				["POST", "/api/portal/payments/create-sbp-qr"],
				["POST", "/api/portal/payments/confirm-sbp"],
				["GET", "/api/portal/payments/status?invoiceNumber=123"],
				["GET", "/api/portal/imaging"],
				["GET", "/api/portal/appointments"],
				["POST", "/api/portal/appointments"],
				["PATCH", "/api/portal/appointments/appt-123/cancel"],
				["GET", "/api/portal/doctors"],
			] as const) {
				const res = await app.inject({
					method,
					url,
					...(method === "GET" ? {} : { payload: {} }),
				});
				assert.strictEqual(res.statusCode, 401, `${method} ${url} must require portal auth`);
			}

			// Regression: authenticated confirm-sbp without UUID Idempotency-Key returns 400
			const validToken = signToken(
				{
					sub: "00000000-0000-4000-8000-000000000031",
					organizationId: "00000000-0000-4000-8000-000000000032",
					kind: PORTAL_TOKEN_KIND,
				},
				requireAuthTokenSecret(),
				3600,
			);
			const missingKeyRes = await app.inject({
				method: "POST",
				url: "/api/portal/payments/confirm-sbp",
				headers: { authorization: `Bearer ${validToken}` },
				payload: { invoiceId: "00000000-0000-4000-8000-000000000033" },
			});
			assert.strictEqual(missingKeyRes.statusCode, 400);
			assert.strictEqual(JSON.parse(missingKeyRes.body).error, "IdempotencyKeyRequired");
		} finally {
			process.env.DENTAL_STATE_PERSISTENCE = prevPersistence;
			process.env.DENTE_AUTH_TOKEN_SECRET = prevSecret;
			await app.close();
		}
	});

	test("Regression: Telegram family/confirm enforces auth and validates payload schema", async () => {
		const app = Fastify({ logger: false });
		await app.register(registerTelegramReferralLoyaltyRoutes);
		await app.ready();

		try {
			const invalidPayloadRes = await app.inject({
				method: "POST",
				url: "/api/telegram/webapp/family/confirm",
				payload: { organizationId: "not-a-uuid" },
			});
			assert.strictEqual(invalidPayloadRes.statusCode, 400);

			const unauthRes = await app.inject({
				method: "POST",
				url: "/api/telegram/webapp/family/confirm",
				payload: {
					organizationId: "00000000-0000-4000-8000-000000000041",
					parentPatientId: "00000000-0000-4000-8000-000000000042",
					appointmentId: "00000000-0000-4000-8000-000000000043",
				},
			});
			assert.strictEqual(unauthRes.statusCode, 401);
		} finally {
			await app.close();
		}
	});

	test("Constants exports backwards compatibility", () => {
		assert.strictEqual(PORTAL_TOKEN_TTL_SECONDS, 2592000);
		assert.strictEqual(PORTAL_TOKEN_KIND, "portal");
		assert.strictEqual(OTP_RATE_LIMIT_WINDOW_MS, 600000);
		assert.strictEqual(OTP_MAX_REQUESTS_PER_IP, 5);
		assert.strictEqual(OTP_MAX_REQUESTS_PER_PHONE, 3);
		assert.strictEqual(OTP_EXPIRY_SECONDS, 300);
		assert.deepStrictEqual(Array.from(PORTAL_ROLES), ["patient"]);
		assert.ok(Array.isArray(PORTAL_CONSENT_REGISTRY));
		assert.strictEqual(PORTAL_CONSENT_REGISTRY.length, 3);
		assert.strictEqual(PORTAL_CONSENT_REGISTRY[0]?.id, "ids_treatment");
		assert.strictEqual(PORTAL_CONSENT_REGISTRY[1]?.id, "ids_anesthesia");
		assert.strictEqual(PORTAL_CONSENT_REGISTRY[2]?.id, "pd_152");
	});
});
