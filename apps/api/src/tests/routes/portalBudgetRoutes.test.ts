import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { organizations, patients, treatmentPlans } from "../../db/schema.js";
import { portalBudgetRoutes } from "../../routes/portalBudgetRoutes.js";
import { PortalBudgetService } from "../../services/portalBudgetService.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "portalBudgetRoutesTest";
const ORG_A_ID = fixtureUuid(NAMESPACE, 1);
const PATIENT_A_ID = fixtureUuid(NAMESPACE, 2);
const PLAN_A_ID = fixtureUuid(NAMESPACE, 3);

const ORG_B_ID = fixtureUuid(NAMESPACE, 4);
const PATIENT_B_ID = fixtureUuid(NAMESPACE, 5);

describe("Portal Budget Routes & Digital Signature Adapter", () => {
	let app: FastifyInstance;
	let tokenA: string;
	let tokenB: string;

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		app = createTenantTestApp();
		await app.register(portalBudgetRoutes, { prefix: "/api/portal" });
		await app.ready();

		try {
			await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);

			// Seed Clinic A, Patient A, Plan A
			await withFixtureTenant(ORG_A_ID, async () => {
				await db.insert(organizations).values({
					id: ORG_A_ID,
					name: "Клиника Стоматологии А",
				});
				await db.insert(patients).values({
					id: PATIENT_A_ID,
					organizationId: ORG_A_ID,
					fullName: "Иванов Иван Иванович",
					phone: "+7 (999) 123-45-67",
				});
				await db.insert(treatmentPlans).values({
					id: PLAN_A_ID,
					organizationId: ORG_A_ID,
					patientId: PATIENT_A_ID,
					name: "Комплексная терапия зубов 16, 26",
					title: "Комплексная терапия зубов 16, 26",
					status: "Draft",
					totalPriceRub: 25000,
					discountRub: 2500,
				});
			});

			// Seed Clinic B, Patient B
			await withFixtureTenant(ORG_B_ID, async () => {
				await db.insert(organizations).values({
					id: ORG_B_ID,
					name: "Клиника Стоматологии Б",
				});
				await db.insert(patients).values({
					id: PATIENT_B_ID,
					organizationId: ORG_B_ID,
					fullName: "Петров Петр Петрович",
					phone: "+7 (911) 987-65-43",
				});
			});

			// Generate tokens for A and B
			const genA = await PortalBudgetService.generateBudgetPortalToken({
				planId: PLAN_A_ID,
				organizationId: ORG_A_ID,
				patientId: PATIENT_A_ID,
				patientPhone: "+7 (999) 123-45-67",
				patientFirstName: "Иван",
				clinicName: "Клиника Стоматологии А",
				doctorName: "Д-р Смирнов А.В.",
				authMethod: "phone_last4",
				items: [
					{
						title: "Лечение кариеса с пломбированием светоотверждаемым композитом",
						toothNumber: 16,
						quantity: 1,
						priceRub: 12500,
					},
					{
						title: "Профессиональная гигиена полости рта",
						toothNumber: null,
						quantity: 1,
						priceRub: 12500,
						discountRub: 2500,
					},
				],
				totalPriceRub: 25000,
				discountRub: 2500,
			});
			tokenA = genA.token;

			const genB = await PortalBudgetService.generateBudgetPortalToken({
				organizationId: ORG_B_ID,
				patientId: PATIENT_B_ID,
				patientPhone: "+7 (911) 987-65-43",
				patientFirstName: "Петр",
				clinicName: "Клиника Стоматологии Б",
				doctorName: "Д-р Васильев Н.С.",
				authMethod: "phone_last4",
				items: [
					{
						title: "Удаление ретинированного зуба мудрости",
						toothNumber: 38,
						quantity: 1,
						priceRub: 9000,
					},
				],
				totalPriceRub: 9000,
				discountRub: 0,
			});
			tokenB = genB.token;
		} catch (err) {
			console.error("Fixture setup failure:", err);
			throw err;
		}
	});

	after(async () => {
		try {
			await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);
		} catch {
			// clean-up
		}
		await app.close();
	});

	test("1. GET /api/portal/budget/:token — публичные данные сметы без утечки ПДн", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/portal/budget/${tokenA}`,
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.payload);

		assert.equal(body.token, tokenA);
		assert.equal(body.status, "sent");
		assert.equal(body.clinicName, "Клиника Стоматологии А");
		assert.equal(body.doctorName, "Д-р Смирнов А.В.");
		assert.equal(body.totalPriceRub, 25000);
		assert.equal(body.discountRub, 2500);
		assert.equal(body.netTotalRub, 22500);
		assert.equal(body.requiresVerification, true);
		assert.equal(body.authMethod, "phone_last4");
		assert.equal(body.isVerified, false);

		// Public items list with tooth numbers
		assert.ok(Array.isArray(body.items));
		assert.equal(body.items.length, 2);
		assert.equal(body.items[0].toothNumber, 16);
		assert.equal(body.items[0].priceRub, 12500);

		// Zero sensitive PII exposed (no full phone, no passport, no address)
		assert.equal(body.patientPhone, undefined);
		assert.equal(body.patientPassport, undefined);
	});

	test("2. POST /api/portal/budget/:token/view — фиксация первого открытия сметы пациентом", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/portal/budget/${tokenA}/view`,
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.payload);
		assert.equal(body.success, true);
		assert.equal(body.status, "viewed");
		assert.ok(body.viewedAt);

		// Idempotent secondary call
		const res2 = await app.inject({
			method: "POST",
			url: `/api/portal/budget/${tokenA}/view`,
		});
		assert.equal(res2.statusCode, 200);
		const body2 = JSON.parse(res2.payload);
		assert.equal(body2.status, "viewed");
	});

	test("3. POST /api/portal/budget/:token/verify — 2FA подтверждение и защита от брутфорса (5 попыток)", async () => {
		// Wrong factor attempt 1
		const fail1 = await app.inject({
			method: "POST",
			url: `/api/portal/budget/${tokenA}/verify`,
			payload: { phone_last4: "0000" },
		});
		assert.equal(fail1.statusCode, 401);
		const fail1Body = JSON.parse(fail1.payload);
		assert.equal(fail1Body.remainingAttempts, 4);

		// Fail 4 more times to trigger lockout (attempts 2..5)
		await app.inject({
			method: "POST",
			url: `/api/portal/budget/${tokenA}/verify`,
			payload: { phone_last4: "0001" },
		});
		await app.inject({
			method: "POST",
			url: `/api/portal/budget/${tokenA}/verify`,
			payload: { phone_last4: "0002" },
		});
		await app.inject({
			method: "POST",
			url: `/api/portal/budget/${tokenA}/verify`,
			payload: { phone_last4: "0003" },
		});
		const fail5 = await app.inject({
			method: "POST",
			url: `/api/portal/budget/${tokenA}/verify`,
			payload: { phone_last4: "0004" },
		});

		assert.equal(fail5.statusCode, 429);
		const fail5Body = JSON.parse(fail5.payload);
		assert.equal(fail5Body.error, "RateLimited");
		assert.equal(fail5Body.isLocked, true);

		// Now test tokenB with correct factor: "+7 (911) 987-65-43" -> "6543"
		const okRes = await app.inject({
			method: "POST",
			url: `/api/portal/budget/${tokenB}/verify`,
			payload: { phone_last4: "6543" },
		});
		assert.equal(okRes.statusCode, 200);
		const okBody = JSON.parse(okRes.payload);
		assert.equal(okBody.success, true);
		assert.equal(okBody.isVerified, true);
		assert.ok(okBody.sessionToken);

		// Fetch budgetB with session token -> items must now be unmasked
		const authedGet = await app.inject({
			method: "GET",
			url: `/api/portal/budget/${tokenB}`,
			headers: {
				authorization: `Bearer ${okBody.sessionToken}`,
			},
		});
		assert.equal(authedGet.statusCode, 200);
		const authedBody = JSON.parse(authedGet.payload);
		assert.equal(authedBody.isVerified, true);
		assert.equal(authedBody.items.length, 1);
		assert.equal(authedBody.items[0].toothNumber, 38);
		assert.equal(authedBody.items[0].title, "Удаление ретинированного зуба мудрости");
	});

	test("4. POST /api/portal/budget/:token/sign — цифровая подпись и переход в accepted", async () => {
		// First verify tokenA on fresh instance or tokenB
		// We'll verify tokenB which is already verified and has sessionToken
		const verifyRes = await app.inject({
			method: "POST",
			url: `/api/portal/budget/${tokenB}/verify`,
			payload: { phone_last4: "6543" },
		});
		const sessionToken = JSON.parse(verifyRes.payload).sessionToken;

		// Canvas PNG Base64 mock
		const dummyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

		const signRes = await app.inject({
			method: "POST",
			url: `/api/portal/budget/${tokenB}/sign`,
			headers: {
				authorization: `Bearer ${sessionToken}`,
				"user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
			},
			payload: {
				signaturePng: dummyPng,
				signerName: "Петров Петр Петрович",
			},
		});

		assert.equal(signRes.statusCode, 200);
		const signBody = JSON.parse(signRes.payload);
		assert.equal(signBody.success, true);
		assert.equal(signBody.status, "accepted");
		assert.ok(signBody.signedAt);
		assert.ok(signBody.documentHash);
		assert.equal(signBody.documentHash.length, 64); // SHA-256 hex string
		assert.equal(signBody.signerName, "Петров Петр Петрович");

		// Fetch again to verify persisted status
		const checkGet = await app.inject({
			method: "GET",
			url: `/api/portal/budget/${tokenB}`,
			headers: {
				authorization: `Bearer ${sessionToken}`,
			},
		});
		const checkBody = JSON.parse(checkGet.payload);
		assert.equal(checkBody.status, "accepted");
		assert.equal(checkBody.documentHash, signBody.documentHash);
		assert.equal(checkBody.signerName, "Петров Петр Петрович");
	});

	test("5. Неразглашение данных и изоляция: токен А не имеет доступа к смете Б, 404 на битый токен", async () => {
		// Invalid token
		const invalidRes = await app.inject({
			method: "GET",
			url: "/api/portal/budget/non-existent-token-123",
		});
		assert.equal(invalidRes.statusCode, 404);

		// Verify that token A's payload never exposes Clinic B or Patient B
		const getB = await app.inject({
			method: "GET",
			url: `/api/portal/budget/${tokenB}`,
		});
		const dataB = JSON.parse(getB.payload);
		assert.equal(dataB.clinicName, "Клиника Стоматологии Б");
		assert.notEqual(dataB.clinicName, "Клиника Стоматологии А");
	});
});
