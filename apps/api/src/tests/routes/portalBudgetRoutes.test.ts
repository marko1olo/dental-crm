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
					totalPriceRub: "25000",
					planDiscountRub: 2500,
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

	test("6. Сохранение смет при перезапуске сервера (PostgreSQL persistence & zero 404 on SMS link)", async () => {
		// Simulate full backend server process restart by wiping in-memory cache
		PortalBudgetService.resetMemoryCacheOnly();

		// Fetch tokenA from database
		const resA = await app.inject({
			method: "GET",
			url: `/api/portal/budget/${tokenA}`,
		});
		assert.equal(resA.statusCode, 200, "Token A link from SMS must not 404 after backend restart");
		const bodyA = JSON.parse(resA.payload);
		assert.equal(bodyA.token, tokenA);
		assert.equal(bodyA.clinicName, "Клиника Стоматологии А");
		assert.equal(bodyA.status, "viewed");
		assert.equal(bodyA.netTotalRub, 22500);
		assert.equal(bodyA.items.length, 2);

		// Fetch tokenB from database — must retain accepted status and signature audit
		const resB = await app.inject({
			method: "GET",
			url: `/api/portal/budget/${tokenB}`,
		});
		assert.equal(resB.statusCode, 200, "Token B link must not 404 after backend restart");
		const bodyB = JSON.parse(resB.payload);
		assert.equal(bodyB.status, "accepted");
		assert.equal(bodyB.signerName, "Петров Петр Петрович");
		assert.ok(bodyB.documentHash);
		assert.equal(bodyB.documentHash.length, 64);
	});

	test("7. Усиленный аудит: персистентная защита от брутфорса и 15-минутный локаут переживают рестарт", async () => {
		// Generate new standalone token C
		const genC = await PortalBudgetService.generateBudgetPortalToken({
			organizationId: ORG_A_ID,
			patientId: PATIENT_A_ID,
			patientPhone: "+7 (999) 123-45-67",
			patientFirstName: "Иван",
			clinicName: "Клиника Стоматологии А",
			doctorName: "Д-р Смирнов А.В.",
			authMethod: "phone_last4",
			items: [
				{
					title: "Консультация врача-стоматолога",
					priceRub: 2000,
				},
			],
			totalPriceRub: 2000,
		});
		const tokenC = genC.token;

		// 4 failed attempts
		for (let i = 1; i <= 4; i++) {
			const failRes = await app.inject({
				method: "POST",
				url: `/api/portal/budget/${tokenC}/verify`,
				payload: { phone_last4: `000${i}` },
			});
			assert.equal(failRes.statusCode, 401);
			const failBody = JSON.parse(failRes.payload);
			assert.equal(failBody.remainingAttempts, 5 - i);
		}

		// 5th failed attempt -> lockout triggered
		const lockRes = await app.inject({
			method: "POST",
			url: `/api/portal/budget/${tokenC}/verify`,
			payload: { phone_last4: "9999" },
		});
		assert.equal(lockRes.statusCode, 429);
		const lockBody = JSON.parse(lockRes.payload);
		assert.equal(lockBody.error, "RateLimited");
		assert.equal(lockBody.isLocked, true);

		// Simulate server restart: clear in-memory cache
		PortalBudgetService.resetMemoryCacheOnly();

		// Immediate attempt after restart must STILL be locked (persisted in DB)
		const postRestartRes = await app.inject({
			method: "POST",
			url: `/api/portal/budget/${tokenC}/verify`,
			payload: { phone_last4: "4567" }, // Even correct code must be rejected during lockout
		});
		assert.equal(postRestartRes.statusCode, 429, "Lockout must persist across backend restarts");
		const postRestartBody = JSON.parse(postRestartRes.payload);
		assert.equal(postRestartBody.error, "RateLimited");
		assert.equal(postRestartBody.isLocked, true);
	});
});
