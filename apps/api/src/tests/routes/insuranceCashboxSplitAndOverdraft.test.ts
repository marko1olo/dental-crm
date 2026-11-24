/**
 * insuranceCashboxSplitAndOverdraft.test.ts
 *
 * Verifies SEV-1/SEV-2 fixes for Insurance (ДМС / ОМС), Cashbox Split & Soft Overdraft:
 * 1. DMS Split payment with mixed tenders (Card + DMS) resolves without SplitTenderSumMismatch
 * 2. Soft Overdraft: Exceeding guarantee letter coverage with isUrgentCare/allowOverdraft succeeds with status 'exhausted'
 * 3. Cashbox routing: DMS cashless operations route to 'dms' box (not cashDeskBox)
 * 4. Emergency acute pain alias ('emergency', 'acute-pain') bypasses 404 without prior letter
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { registerCashboxPaymentRoutes } from "../../routes/cashbox/cashboxPaymentRoutes.js";
import { registerInsuranceRoutes } from "../../routes/insurance.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { fixtureUuid, withFixtureTenant } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";
import {
	cashBoxes,
	cashOperations,
	dmsGuaranteeLetters,
	organizations,
	patients,
	payments,
	users,
} from "../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../db/seeds/seed_cash_and_reasons.js";

const NAMESPACE = "dmsSplitOverdraft";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const STAFF_ID = fixtureUuid(NAMESPACE, 2);
const PATIENT_ID = fixtureUuid(NAMESPACE, 3);
const LETTER_ID = fixtureUuid(NAMESPACE, 5);

describe("DMS Cashbox Split, Soft Overdraft & Box Routing Invariants", () => {
	let app: FastifyInstance;
	let staffToken = "";

	before(async () => {
		process.env.NODE_ENV = "test";
		app = createTenantTestApp();
		await app.register(registerInsuranceRoutes);
		await app.register(registerCashboxPaymentRoutes);
		await app.ready();

		staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: STAFF_ID,
				role: "admin",
			},
			authTokenSecret(),
		);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_ID,
				name: `Клиника ДМС Тест-${Date.now()}`,
			}).onConflictDoNothing();

			await tx.insert(users).values({
				id: STAFF_ID,
				organizationId: ORG_ID,
				fullName: "Администратор Кассы",
				role: "admin",
				email: `admin-${Date.now()}@dental.ru`,
			}).onConflictDoNothing();

			await ensureOrganizationCashBoxes(tx, ORG_ID);

			// Seed patient
			await tx.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Тестовый Пациент ДМС",
			}).onConflictDoNothing();

			// Seed guarantee letter with 5 000 ₽ limit (reset state for test idempotency)
			await tx.insert(dmsGuaranteeLetters).values({
				id: LETTER_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				patientFullName: "Тестовый Пациент ДМС",
				policyNumber: "POL-123456",
				insurerKey: "sogaz",
				insurerName: "СОГАЗ Мед",
				letterNumber: "ГП-2026-TEST",
				issueDate: "2026-01-01",
				validFrom: "2026-01-01",
				validUntil: "2027-12-31",
				maxCoverageKopecks: 500000n,
				maxCoverageRub: 5000,
				usedAmountKopecks: 0n,
				usedAmountRub: 0,
				status: "active",
			}).onConflictDoUpdate({
				target: dmsGuaranteeLetters.id,
				set: {
					usedAmountKopecks: 0n,
					usedAmountRub: 0,
					status: "active",
					maxCoverageKopecks: 500000n,
					maxCoverageRub: 5000,
				},
			});
		});
	});

	after(async () => {
		await app?.close();
	});

	test("1. DMS Split payment (Card + Insurance) matches total sum without SplitTenderSumMismatch", async () => {
		const clientMutationId = randomUUID();
		const res = await app.inject({
			method: "POST",
			url: "/api/cashbox/payments",
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"idempotency-key": clientMutationId,
			},
			payload: {
				patientId: PATIENT_ID,
				amountKopecks: 1000000, // 10 000 ₽ total
				amountRub: 10000,
				method: "split",
				guaranteeLetterId: LETTER_ID,
				dmsAmountKopecks: 400000, // 4 000 ₽ DMS
				dmsAmountRub: 4000,
				electronicAmountKopecks: 600000, // 6 000 ₽ Card
				electronicAmountRub: 6000,
				splitTenders: [
					{ method: "card", amountKopecks: 600000, amountRub: 6000 },
					{ method: "insurance", amountKopecks: 400000, amountRub: 4000, guaranteeLetterId: LETTER_ID },
				],
				clientMutationId,
				cashierFullName: "Кассир",
			},
		});

		assert.equal(res.statusCode, 200, `Expected 200 OK, got ${res.statusCode}: ${res.body}`);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);
		assert.equal(json.data.amountKopecks, 1000000);
		assert.equal(json.data.dmsAmountKopecks, 400000);

		// Verify letter coverage updated
		await withFixtureTenant(ORG_ID, async (tx) => {
			const [updatedLetter] = await tx
				.select()
				.from(dmsGuaranteeLetters)
				.where(and(eq(dmsGuaranteeLetters.id, LETTER_ID), eq(dmsGuaranteeLetters.organizationId, ORG_ID)));
			assert.ok(updatedLetter);
			assert.equal(Number(updatedLetter.usedAmountRub), 4000);
			assert.equal(updatedLetter.status, "active");
		});
	});

	test("2. Soft Overdraft: Exceeding guarantee letter coverage with isUrgentCare succeeds with status 'exhausted'", async () => {
		const clientMutationId = randomUUID();
		// Letter already has 4000 used out of 5000 max. We request 3000 more (total used becomes 7000 > 5000)
		const res = await app.inject({
			method: "POST",
			url: "/api/cashbox/payments",
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"idempotency-key": clientMutationId,
			},
			payload: {
				patientId: PATIENT_ID,
				amountKopecks: 300000,
				amountRub: 3000,
				method: "insurance",
				guaranteeLetterId: LETTER_ID,
				dmsAmountKopecks: 300000,
				dmsAmountRub: 3000,
				isUrgentCare: true,
				allowOverdraft: true,
				clientMutationId,
				cashierFullName: "Кассир",
				note: "Острая боль: экстренное лечение пульпита",
			},
		});

		assert.equal(res.statusCode, 200, `Expected 200 OK with Soft Overdraft, got ${res.statusCode}: ${res.body}`);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);

		// Verify letter is now exhausted but tracked soft overdraft
		await withFixtureTenant(ORG_ID, async (tx) => {
			const [updatedLetter] = await tx
				.select()
				.from(dmsGuaranteeLetters)
				.where(and(eq(dmsGuaranteeLetters.id, LETTER_ID), eq(dmsGuaranteeLetters.organizationId, ORG_ID)));
			assert.ok(updatedLetter);
			assert.equal(Number(updatedLetter.usedAmountRub), 7000);
			assert.equal(updatedLetter.status, "exhausted");
		});
	});

	test("3. Cashbox routing: DMS cashless operations route to 'dms' box (not cashDeskBox)", async () => {
		await withFixtureTenant(ORG_ID, async (tx) => {
			const boxes = await tx.select().from(cashBoxes).where(eq(cashBoxes.organizationId, ORG_ID));
			const dmsBox = boxes.find((b) => b.type === "dms");
			const mainCashDeskBox = boxes.find((b) => b.type === "main");

			assert.ok(dmsBox, "DMS cash box must exist in organization");
			assert.ok(mainCashDeskBox, "Main cash desk box must exist");

			// Query operations in dms box
			const dmsOps = await tx
				.select()
				.from(cashOperations)
				.where(
					and(
						eq(cashOperations.organizationId, ORG_ID),
						eq(cashOperations.cashBoxId, dmsBox.id),
					),
				);

			assert.ok(dmsOps.length >= 1, "DMS operation must be recorded in dmsBox");

			// Query operations in main cash desk box: ensure no reasonText containing "гарантийному письму ДМС"
			const cashDeskOps = await tx
				.select()
				.from(cashOperations)
				.where(
					and(
						eq(cashOperations.organizationId, ORG_ID),
						eq(cashOperations.cashBoxId, mainCashDeskBox.id),
					),
				);

			for (const op of cashDeskOps) {
				assert.ok(
					!op.reasonText?.includes("гарантийному письму ДМС"),
					`Cash desk box must not contain DMS insurance operations: ${op.reasonText}`,
				);
			}
		});
	});

	test("4. Emergency acute pain alias ('emergency') succeeds without prior letter", async () => {
		const clientMutationId = randomUUID();
		const res = await app.inject({
			method: "POST",
			url: "/api/cashbox/payments",
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"idempotency-key": clientMutationId,
			},
			payload: {
				patientId: PATIENT_ID,
				amountKopecks: 250000,
				amountRub: 2500,
				method: "insurance",
				guaranteeLetterId: "emergency",
				dmsAmountKopecks: 250000,
				dmsAmountRub: 2500,
				isEmergency: true,
				hasAcutePain: true,
				clientMutationId,
				cashierFullName: "Кассир",
				note: "Острая боль без ГП — экстренный приём",
			},
		});

		assert.equal(res.statusCode, 200, `Expected 200 OK for emergency alias, got ${res.statusCode}: ${res.body}`);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);
		assert.equal(json.data.amountKopecks, 250000);
	});
});
