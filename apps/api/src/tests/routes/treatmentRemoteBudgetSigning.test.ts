/**
 * DENTE CRM — Treatment Remote Budget Signing Test Suite
 *
 * Mandate 8b / 8zi Sweet-Spot Module.
 * Verifies:
 * 1. GET /api/v1/public/budgets/:token — ZERO data leaks prior to phone 4-digits verification.
 * 2. POST /api/v1/public/budgets/:token/verify — 3 attempts brute-force lockout protection.
 * 3. POST /api/v1/public/budgets/:token/sign — remote digital signature approves treatment plan with legal audit trail.
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	organizations,
	patients,
	portalBudgetTokens,
	treatmentPlans,
} from "../../db/schema.js";
import { publicBudgetRoutes } from "../../routes/publicBudgetRoutes.js";
import { treatmentPlanRoutes } from "../../routes/treatmentPlanRoutes.js";
import { PortalBudgetService } from "../../services/portalBudgetService.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "remoteBudgetSigningTest";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const PATIENT_ID = fixtureUuid(NAMESPACE, 2);
const PLAN_1_ID = fixtureUuid(NAMESPACE, 3);

describe("Treatment Remote Budget Signing & Verification Security", () => {
	let app: FastifyInstance;
	let budgetToken: string;

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		app = createTenantTestApp();
		await app.register(publicBudgetRoutes);
		await app.register(treatmentPlanRoutes);
		await app.ready();

		try {
			await db.delete(portalBudgetTokens).where(eq(portalBudgetTokens.organizationId, ORG_ID));
			await purgeFixtureOrganizations([ORG_ID]);

			await withFixtureTenant(ORG_ID, async () => {
				await db
					.insert(organizations)
					.values({
						id: ORG_ID,
						name: "Клиника ДЕНТЕ Тест",
					})
					.onConflictDoNothing();
				await db
					.insert(patients)
					.values({
						id: PATIENT_ID,
						organizationId: ORG_ID,
						fullName: "Соколов Дмитрий Сергеевич",
						phone: "+7 (999) 456-78-90",
					})
					.onConflictDoNothing();

				await db.insert(treatmentPlans).values({
					id: PLAN_1_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					name: "План терапевтического лечения",
					title: "План терапевтического лечения",
					status: "Draft",
					totalPriceRub: "15000",
					planDiscountRub: 1500,
				});
			});

			// Generate public budget token for Plan 1
			const gen = await PortalBudgetService.generateBudgetPortalToken({
				planId: PLAN_1_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				patientPhone: "+7 (999) 456-78-90",
				patientFirstName: "Дмитрий",
				clinicName: "Клиника ДЕНТЕ Тест",
				doctorName: "Д-р Кузнецов",
				authMethod: "phone_last4",
				items: [
					{
						title: "Лечение глубокого кариеса",
						toothNumber: 46,
						priceRub: 7500,
					},
					{
						title: "Художественная реставрация",
						toothNumber: 46,
						priceRub: 7500,
						discountRub: 1500,
					},
				],
				totalPriceRub: 15000,
				discountRub: 1500,
			});
			budgetToken = gen.token;
		} catch (err) {
			console.error("Fixture setup failure:", err);
			throw err;
		}
	});

	after(async () => {
		try {
			await db.delete(portalBudgetTokens).where(eq(portalBudgetTokens.organizationId, ORG_ID));
			await purgeFixtureOrganizations([ORG_ID]);
		} catch {
			// clean-up
		}
		await app.close();
	});

	test("1. GET /api/v1/public/budgets/:token — ZERO data leaks prior to phone 4-digits verification", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/v1/public/budgets/${budgetToken}`,
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.payload);

		// Verified metadata must be present
		assert.equal(body.token, budgetToken);
		assert.equal(body.clinicName, "Клиника ДЕНТЕ Тест");
		assert.equal(body.requiresVerification, true);
		assert.equal(body.isVerified, false);
		assert.equal(body.maskedPhone, "+7 *** *** 78-90");

		// ZERO LEAKS: items, prices, doctor name, patient name MUST NOT be exposed!
		assert.equal(body.items, undefined, "items must not be exposed prior to verification");
		assert.equal(body.totalPriceRub, undefined, "totalPriceRub must not be exposed");
		assert.equal(body.netTotalRub, undefined, "netTotalRub must not be exposed");
		assert.equal(body.doctorName, undefined, "doctorName must not be exposed");
		assert.equal(body.patientFirstName, undefined, "patientFirstName must not be exposed");
	});

	test("2. POST /api/v1/public/budgets/:token/verify — 3 attempts brute-force lockout protection", async () => {
		// Attempt 1: wrong phone digits (401)
		const fail1 = await app.inject({
			method: "POST",
			url: `/api/v1/public/budgets/${budgetToken}/verify`,
			payload: { phoneDigits: "0000" },
		});
		assert.equal(fail1.statusCode, 401);
		const b1 = JSON.parse(fail1.payload);
		assert.equal(b1.remainingAttempts, 2);

		// Attempt 2: wrong phone digits (401)
		const fail2 = await app.inject({
			method: "POST",
			url: `/api/v1/public/budgets/${budgetToken}/verify`,
			payload: { phoneDigits: "1111" },
		});
		assert.equal(fail2.statusCode, 401);
		const b2 = JSON.parse(fail2.payload);
		assert.equal(b2.remainingAttempts, 1);

		// Attempt 3: wrong phone digits -> triggers 429 lockout!
		const fail3 = await app.inject({
			method: "POST",
			url: `/api/v1/public/budgets/${budgetToken}/verify`,
			payload: { phoneDigits: "2222" },
		});
		assert.equal(fail3.statusCode, 429);
		const b3 = JSON.parse(fail3.payload);
		assert.equal(b3.isLocked, true);
		assert.equal(b3.remainingAttempts, 0);

		// Subsequent attempt while locked -> 429
		const fail4 = await app.inject({
			method: "POST",
			url: `/api/v1/public/budgets/${budgetToken}/verify`,
			payload: { phoneDigits: "7890" },
		});
		assert.equal(fail4.statusCode, 429);

		// Manually reset lockout in DB to simulate lockout expiry and test successful verification
		await db
			.update(portalBudgetTokens)
			.set({ failedAttempts: 0, isLocked: false, lockedUntil: null })
			.where(eq(portalBudgetTokens.token, budgetToken));

		// Correct verification with 7890 -> 200 + sessionToken
		const success = await app.inject({
			method: "POST",
			url: `/api/v1/public/budgets/${budgetToken}/verify`,
			payload: { phoneDigits: "7890" },
		});
		assert.equal(success.statusCode, 200);
		const bSuccess = JSON.parse(success.payload);
		assert.equal(bSuccess.success, true);
		assert.equal(bSuccess.isVerified, true);
		assert.ok(bSuccess.sessionToken);

		// Now GET with sessionToken reveals full items and pricing breakdown
		const verifiedGet = await app.inject({
			method: "GET",
			url: `/api/v1/public/budgets/${budgetToken}`,
			headers: { authorization: `Bearer ${bSuccess.sessionToken}` },
		});
		assert.equal(verifiedGet.statusCode, 200);
		const vBody = JSON.parse(verifiedGet.payload);
		assert.equal(vBody.isVerified, true);
		assert.equal(vBody.patientFirstName, "Дмитрий");
		assert.equal(vBody.totalPriceRub, 15000);
		assert.equal(vBody.discountRub, 1500);
		assert.equal(vBody.netTotalRub, 13500);
		assert.ok(Array.isArray(vBody.items));
		assert.equal(vBody.items.length, 2);
	});

	test("3. POST /api/v1/public/budgets/:token/sign — remote digital signature approves treatment plan", async () => {
		// First verify to get session
		const verifyRes = await app.inject({
			method: "POST",
			url: `/api/v1/public/budgets/${budgetToken}/verify`,
			payload: { phoneDigits: "7890" },
		});
		const sessionToken = JSON.parse(verifyRes.payload).sessionToken;

		const fakeSignature =
			"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

		const signRes = await app.inject({
			method: "POST",
			url: `/api/v1/public/budgets/${budgetToken}/sign`,
			headers: { authorization: `Bearer ${sessionToken}` },
			payload: {
				signaturePng: fakeSignature,
				signerName: "Соколов Д.С.",
			},
		});

		assert.equal(signRes.statusCode, 200);
		const signBody = JSON.parse(signRes.payload);
		assert.equal(signBody.success, true);
		assert.equal(signBody.status, "accepted");
		assert.ok(signBody.signedAt);
		assert.ok(signBody.documentHash);
		assert.equal(signBody.signerName, "Соколов Д.С.");

		// Verify linked treatment_plans was updated to 'Approved'
		const [updatedPlan] = await db
			.select({ status: treatmentPlans.status, approvedAt: treatmentPlans.approvedAt })
			.from(treatmentPlans)
			.where(eq(treatmentPlans.id, PLAN_1_ID));

		assert.equal(updatedPlan?.status, "Approved");
		assert.ok(updatedPlan?.approvedAt);
	});
});
