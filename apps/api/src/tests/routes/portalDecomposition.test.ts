import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import Fastify from "fastify";
import {
	OTP_EXPIRY_SECONDS,
	OTP_MAX_REQUESTS_PER_IP,
	OTP_MAX_REQUESTS_PER_PHONE,
	OTP_RATE_LIMIT_WINDOW_MS,
	PORTAL_CONSENT_REGISTRY,
	PORTAL_ROLES,
	PORTAL_TOKEN_KIND,
	PORTAL_TOKEN_TTL_SECONDS,
	otpIpRequestCounts,
	otpPhoneRequestCounts,
	portalRevokedBeforeByPatient,
	portalRoutes,
	resetPortalOtpRateLimitsForTesting,
	resetPortalRevokedTokensForTesting,
	revokedPortalTokens,
} from "../../routes/portal.js";
import {
	generateDeterministicQrSvg,
	generateNumericCode,
	generateSha256Hex,
	readBoundedInt,
	renderOtpMessage,
} from "../../routes/portal/portalUtils.js";
import type { PortalOtpPolicy } from "../../routes/portal/types.js";

describe("Patient Portal Decomposition & Architecture Verification (Mandate 8b)", () => {
	const portalDir = path.resolve(process.cwd(), "apps/api/src/routes/portal");
	const portalFacadePath = path.resolve(process.cwd(), "apps/api/src/routes/portal.ts");

	test("Mandate 8b: All decomposed files in apps/api/src/routes/portal/ are strictly < 800 lines", () => {
		assert.ok(fs.existsSync(portalFacadePath), "portal.ts facade must exist");
		const facadeLines = fs.readFileSync(portalFacadePath, "utf-8").split("\n").length;
		assert.ok(
			facadeLines <= 200,
			`portal.ts facade must be <= 200 lines (actual: ${facadeLines} lines)`,
		);

		assert.ok(fs.existsSync(portalDir), "portal directory must exist");
		const files = fs.readdirSync(portalDir).filter((f) => f.endsWith(".ts"));
		assert.ok(files.length >= 7, `Expected at least 7 modules, found ${files.length}`);

		for (const file of files) {
			const fullPath = path.join(portalDir, file);
			const lineCount = fs.readFileSync(fullPath, "utf-8").split("\n").length;
			assert.ok(
				lineCount < 800,
				`File ${file} has ${lineCount} lines, exceeding the Mandate 8b limit of 800 lines`,
			);
		}
	});

	test("portalUtils: pure helper functions preserve exact specifications", () => {
		// 1. generateNumericCode
		const code6 = generateNumericCode(6);
		assert.strictEqual(code6.length, 6);
		assert.match(code6, /^\d{6}$/);

		const code8 = generateNumericCode(8);
		assert.strictEqual(code8.length, 8);
		assert.match(code8, /^\d{8}$/);

		// 2. renderOtpMessage
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

		// 3. generateSha256Hex
		const hash = generateSha256Hex("dente_clinical_test");
		assert.strictEqual(hash.length, 64);
		assert.match(hash, /^[0-9a-f]{64}$/);

		// 4. generateDeterministicQrSvg
		const qrSvg = generateDeterministicQrSvg("https://qr.nspk.ru/test", 180);
		assert.ok(qrSvg.startsWith("<svg"));
		assert.ok(qrSvg.includes('viewBox="0 0 180 180"'));
		assert.ok(qrSvg.endsWith("</svg>"));

		// 5. readBoundedInt
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

	test("portalRoutes: registers all 19 canonical patient portal endpoints on Fastify", async () => {
		const app = Fastify({ logger: false });
		await app.register(portalRoutes, { prefix: "/api/portal" });
		await app.ready();

		// Check Auth endpoints
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
		assert.deepStrictEqual(JSON.parse(verifyOtpRes.body), {
			error: "PhoneAndCodeRequired",
			message: "Укажите номер телефона и код из SMS.",
		});

		const logoutRes = await app.inject({
			method: "POST",
			url: "/api/portal/auth/logout",
		});
		assert.strictEqual(logoutRes.statusCode, 401);

		// Check Profile endpoints
		const meRes = await app.inject({
			method: "GET",
			url: "/api/portal/me",
		});
		assert.strictEqual(meRes.statusCode, 401);

		const profileRes = await app.inject({
			method: "GET",
			url: "/api/portal/profile",
		});
		assert.strictEqual(profileRes.statusCode, 401);

		// Check Consents and Documents
		const consentsRes = await app.inject({
			method: "GET",
			url: "/api/portal/consents",
		});
		assert.strictEqual(consentsRes.statusCode, 401);

		const signConsentRes = await app.inject({
			method: "POST",
			url: "/api/portal/consents/ids_treatment/sign",
			payload: {},
		});
		assert.strictEqual(signConsentRes.statusCode, 401);

		const docHtmlRes = await app.inject({
			method: "GET",
			url: "/api/portal/documents/doc-123/html",
		});
		assert.strictEqual(docHtmlRes.statusCode, 401);

		// Check Health Questionnaire
		const getHealthRes = await app.inject({
			method: "GET",
			url: "/api/portal/health-questionnaire",
		});
		assert.strictEqual(getHealthRes.statusCode, 401);

		const postHealthRes = await app.inject({
			method: "POST",
			url: "/api/portal/health-questionnaire",
			payload: {},
		});
		assert.strictEqual(postHealthRes.statusCode, 401);

		// Check Treatment Plans
		const plansRes = await app.inject({
			method: "GET",
			url: "/api/portal/treatment-plans",
		});
		assert.strictEqual(plansRes.statusCode, 401);

		const selectTierRes = await app.inject({
			method: "POST",
			url: "/api/portal/treatment-plans/plan-123/select-tier",
			payload: { tierId: "standard" },
		});
		assert.strictEqual(selectTierRes.statusCode, 401);

		// Check Payments
		const createSbpRes = await app.inject({
			method: "POST",
			url: "/api/portal/payments/create-sbp-qr",
			payload: {},
		});
		assert.strictEqual(createSbpRes.statusCode, 401);

		const confirmSbpRes = await app.inject({
			method: "POST",
			url: "/api/portal/payments/confirm-sbp",
			payload: {},
		});
		assert.strictEqual(confirmSbpRes.statusCode, 401);

		const paymentStatusRes = await app.inject({
			method: "GET",
			url: "/api/portal/payments/status?invoiceNumber=123",
		});
		assert.strictEqual(paymentStatusRes.statusCode, 401);

		// Check Imaging
		const imagingRes = await app.inject({
			method: "GET",
			url: "/api/portal/imaging",
		});
		assert.strictEqual(imagingRes.statusCode, 401);

		// Check Appointments and Doctors
		const appointmentsRes = await app.inject({
			method: "GET",
			url: "/api/portal/appointments",
		});
		assert.strictEqual(appointmentsRes.statusCode, 401);

		const bookApptRes = await app.inject({
			method: "POST",
			url: "/api/portal/appointments",
			payload: {},
		});
		assert.strictEqual(bookApptRes.statusCode, 401);

		const cancelApptRes = await app.inject({
			method: "PATCH",
			url: "/api/portal/appointments/appt-123/cancel",
			payload: {},
		});
		assert.strictEqual(cancelApptRes.statusCode, 401);

		const doctorsRes = await app.inject({
			method: "GET",
			url: "/api/portal/doctors",
		});
		assert.strictEqual(doctorsRes.statusCode, 401);

		await app.close();
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
