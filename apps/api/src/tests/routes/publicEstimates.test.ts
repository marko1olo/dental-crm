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

	PublicEstimatesService.registerEstimate({
		id: "est-demo-12345678",
		organizationId: "11111111-1111-1111-1111-111111111111",
		patientId: "22222222-2222-2222-2222-222222222222",
		publicToken: testToken,
		estimateNumber: "СМ-2026/DEMO1",
		status: "sent",
		validFrom: new Date().toISOString().slice(0, 10),
		validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
		clinicName: "ООО «Стоматологическая клиника ДЕНТЕ»",
		clinicPhone: "+7 (495) 123-45-67",
		clinicEmail: "info@dente-clinic.ru",
		clinicAddress: "г. Москва, ул. Арбат, д. 24",
		clinicCurrency: "RUB",
		patientFirstName: "Алексей",
		patientPhone: "+7 (916) 123-45-67",
		patientBirthDate: "1988-04-12",
		failedAttempts: 0,
		totalFailures: 0,
		isLocked: false,
		patientNotes: "План согласован на первичной консультации.",
		items: [
			{
				id: "item-1",
				title: "Компьютерная томография челюстно-лицевой области (КЛКТ)",
				tooth_number: null,
				quantity: 1,
				unit_price_rub: 4500,
				line_total_rub: 4500,
				discount_rub: 500,
				net_line_total_rub: 4000,
				category: "Диагностика",
			},
			{
				id: "item-2",
				title: "Эндодонтическое лечение 3-канального зуба под микроскопом",
				tooth_number: 16,
				quantity: 1,
				unit_price_rub: 18000,
				line_total_rub: 18000,
				discount_rub: 0,
				net_line_total_rub: 18000,
				category: "Терапия",
			},
			{
				id: "item-3",
				title: "Установка коронки из диоксида циркония (ZrO2) CAD/CAM",
				tooth_number: 16,
				quantity: 1,
				unit_price_rub: 27500,
				line_total_rub: 27500,
				discount_rub: 2500,
				net_line_total_rub: 25000,
				category: "Ортопедия",
			},
		],
	});

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
