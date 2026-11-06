/**
 * financialCorrectionAndLedger.test.ts
 *
 * Statutory 54-FZ Family Wallet, Hardware Offline Buffer & Fiscal Correction Suite:
 * 1. Family wallet concurrent payments and topups with atomic row locking;
 * 2. KKT hardware disconnection fallback to fiscal_receipt_queue (offline_pending / hardware_offline);
 * 3. Background auto-retry queue flush upon KKT recovery;
 * 4. 54-FZ Self-initiated correction receipt (Tag 1173 = 0, self_initiated);
 * 5. 54-FZ Tax authority prescription correction receipt (Tag 1173 = 1, by_instruction) with doc date/number enforcement.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

process.env.NODE_ENV = "test";
process.env.KKT_MODEL = "emulator";
import { and, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	buildFiscalReceiptPayloadSignature,
	createFiscalCompositeIdempotencyKey,
} from "@dental/shared";
import { db } from "../../db/client.js";
import {
	familyGroups,
	fiscalReceiptQueue,
	organizations,
	patients,
	payments,
	users,
} from "../../db/schema.js";
import { registerBillingRoutes } from "../../routes/billing.js";
import { registerFamilyFinanceRoutes } from "../../routes/finance_family.js";
import { registerFiscalReceiptRoutes } from "../../routes/fiscal/fiscalReceiptRoutes.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "finCorrLedger";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const PATIENT_ID = fixtureUuid(NAMESPACE, 10);
const USER_ID = fixtureUuid(NAMESPACE, 30);
const FAMILY_ID = fixtureUuid(NAMESPACE, 40);

describe("FINANCIAL CORRECTION, FAMILY WALLET & CASH LEDGER SUITE", { concurrency: false }, () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let staffToken: string;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

		app = createTenantTestApp();
		await registerBillingRoutes(app);
		await registerFiscalReceiptRoutes(app);
		await registerFamilyFinanceRoutes(app);
		await app.ready();

		clinicToken = signToken({ organizationId: ORG_ID }, authTokenSecret());
		staffToken = signToken(
			{ organizationId: ORG_ID, userId: USER_ID, role: "admin" },
			authTokenSecret(),
		);

		await purgeFixtureOrganizations([ORG_ID]);

		await withFixtureTenant(ORG_ID, async () => {
			await db.delete(fiscalReceiptQueue).where(eq(fiscalReceiptQueue.organizationId, ORG_ID));
			await db.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника Коррекции и Кассового Журнала",
				inn: "7701999882",
			}).onConflictDoNothing();
			await db.insert(users).values({
				id: USER_ID,
				organizationId: ORG_ID,
				fullName: "Главный Аудитор Кассы",
				role: "admin",
				isActive: true,
			}).onConflictDoNothing();
			await db
				.insert(familyGroups)
				.values({
					id: FAMILY_ID,
					organizationId: ORG_ID,
					name: "Семья Корректировых",
					balance: "50000.00",
					headPatientId: PATIENT_ID,
				})
				.onConflictDoUpdate({
					target: familyGroups.id,
					set: { balance: "50000.00", headPatientId: PATIENT_ID },
				});
			await db
				.insert(patients)
				.values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					familyGroupId: FAMILY_ID,
					fullName: "Корректиров Сергей Николаевич",
					phone: "+79998882233",
				})
				.onConflictDoNothing();
		});
	});

	after(async () => {
		delete process.env.KKM_FORCE_OFFLINE;
		delete process.env.KKM_HARDWARE_TIMEOUT;
		await purgeFixtureOrganizations([ORG_ID]);
		await app.close();
	});

	// =========================================================================
	// 1. FAMILY WALLET CONCURRENT PAYMENTS & TOPUPS
	// =========================================================================
	describe("1. Family Wallet Atomic Deductions & Concurrent Topups", () => {
		it("1.1 Concurrent family payments with identical mutation key deduct balance exactly once", async () => {
			const familyMutationId = fixtureUuid(NAMESPACE, 301);

			const payPayload = {
				patientId: PATIENT_ID,
				familyGroupId: FAMILY_ID,
				amountRub: 5000.00,
				clientMutationId: familyMutationId,
			};

			const requests = Array.from({ length: 5 }).map(() =>
				app.inject({
					method: "POST",
					url: "/api/finance/family/pay",
					headers: {
						"x-dente-clinic-token": clinicToken,
						"x-dente-staff-token": staffToken,
					},
					payload: payPayload,
				}),
			);

			const responses = await Promise.all(requests);

			for (const res of responses) {
				assert.equal(res.statusCode, 200);
				const json = res.json();
				assert.equal(Number(json.newBalance), 45000.00);
			}

			const familyPayments = await withFixtureTenant(ORG_ID, async () => {
				return await db
					.select()
					.from(payments)
					.where(and(eq(payments.organizationId, ORG_ID), eq(payments.clientMutationId, familyMutationId)));
			});

			assert.equal(familyPayments.length, 1);
		});

		it("1.2 Topup family wallet with Idempotency-Key credits balance exactly once", async () => {
			const topupMutationId = fixtureUuid(NAMESPACE, 302);

			const topupPayload = {
				familyGroupId: FAMILY_ID,
				patientId: PATIENT_ID,
				amountRub: 10000.00,
				method: "card" as const,
				clientMutationId: topupMutationId,
			};

			const requests = Array.from({ length: 4 }).map(() =>
				app.inject({
					method: "POST",
					url: "/api/finance/family/topup",
					headers: {
						"x-dente-clinic-token": clinicToken,
						"x-dente-staff-token": staffToken,
					},
					payload: topupPayload,
				}),
			);

			const responses = await Promise.all(requests);

			for (const res of responses) {
				assert.equal(res.statusCode, 200);
				const json = res.json();
				assert.equal(Number(json.newBalance), 55000.00);
			}
		});
	});

	// =========================================================================
	// 2. KKT HARDWARE DISCONNECTION & AUTO-RETRY RECOVERY
	// =========================================================================
	describe("2. KKT Hardware Offline State Machine & Auto-Dofiscalization", () => {
		before(async () => {
			await withFixtureTenant(ORG_ID, async () => {
				await db.delete(fiscalReceiptQueue).where(eq(fiscalReceiptQueue.organizationId, ORG_ID));
			});
		});

		it("2.1 Buffers receipts into offline_pending/hardware_offline on network drop without failing customer checkout", async () => {
			process.env.KKM_FORCE_OFFLINE = "1";

			const rawUuid = fixtureUuid(NAMESPACE, 401);
			const receiptPayload = {
				patientId: PATIENT_ID,
				operationType: "income" as const,
				customerContact: "+79998882233",
				cashierFullName: "Главный Аудитор Кассы",
				totalKopecks: 650000,
				electronicCardKopecks: 650000,
				cashKopecks: 0,
				prepaidKopecks: 0,
				taxationSystem: "usn_income" as const,
				items: [
					{
						name: "Профессиональная гигиена полости рта и AirFlow",
						priceKopecks: 650000,
						quantity: 1,
						amountKopecks: 650000,
						subject: "service" as const,
						method: "full_payment" as const,
						vatRate: "vat_none" as const,
						measure: "piece" as const,
					},
				],
			};

			const signature = buildFiscalReceiptPayloadSignature(receiptPayload);
			const clientMutationId = createFiscalCompositeIdempotencyKey(rawUuid, signature);

			const res = await app.inject({
				method: "POST",
				url: "/api/fiscal/receipts",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: {
					...receiptPayload,
					clientMutationId,
				},
			});

			assert.equal(res.statusCode, 201);
			const json = res.json();
			assert.equal(json.success, true);
			assert.ok(["hardware_offline", "offline_pending"].includes(json.status));
			assert.ok(json.queueId, "Queue ID must be generated");

			const [stored] = await withFixtureTenant(ORG_ID, async () => {
				return await db
					.select()
					.from(fiscalReceiptQueue)
					.where(and(eq(fiscalReceiptQueue.id, json.queueId), eq(fiscalReceiptQueue.organizationId, ORG_ID)));
			});

			assert.ok(stored);
			assert.ok(["hardware_offline", "offline_pending"].includes(stored.status));
			assert.equal(stored.retryCount, 1);
		});

		it("2.2 Background retry flushes queue and transitions offline receipts to printed when KKT is restored", async () => {
			delete process.env.KKM_FORCE_OFFLINE;
			delete process.env.KKM_HARDWARE_TIMEOUT;

			const flushRes = await app.inject({
				method: "POST",
				url: "/api/fiscal/queue/retry-all",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
			});

			assert.equal(flushRes.statusCode, 200);
			const flushJson = flushRes.json();
			assert.equal(flushJson.success, true);
			assert.ok(flushJson.printedCount >= 1, "All buffered offline items must be printed");
			assert.equal(flushJson.failedCount, 0);

			const remaining = await withFixtureTenant(ORG_ID, async () => {
				return await db
					.select()
					.from(fiscalReceiptQueue)
					.where(
						and(
							eq(fiscalReceiptQueue.organizationId, ORG_ID),
							inArray(fiscalReceiptQueue.status, ["pending_print", "hardware_offline", "offline_pending"]),
						),
					);
			});

			assert.equal(remaining.length, 0, "Zero offline items should remain after successful flush");
		});
	});

	// =========================================================================
	// 3. 54-FZ CORRECTION RECEIPTS: SELF-INITIATED & PRESCRIPTION
	// =========================================================================
	describe("3. 54-FZ Correction Receipts & Ledger Integrity", () => {
		it("3.1 Issues 54-FZ self-initiated correction receipt and records queue item", async () => {
			const correctionPayload = {
				patientId: PATIENT_ID,
				operationType: "income" as const,
				customerContact: "+79998882233",
				cashierFullName: "Главный Аудитор Кассы",
				totalKopecks: 300000,
				cashKopecks: 300000,
				electronicCardKopecks: 0,
				taxationSystem: "usn_income" as const,
				items: [
					{
						name: "Коррекция расчёта: терапевтическое лечение",
						priceKopecks: 300000,
						quantity: 1,
						amountKopecks: 300000,
						subject: "service" as const,
						method: "full_payment" as const,
						vatRate: "vat_none" as const,
						measure: "piece" as const,
					},
				],
			};

			const res = await app.inject({
				method: "POST",
				url: "/api/fiscal/correction/self-calculation",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: correctionPayload,
			});

			assert.equal(res.statusCode, 201);
			const json = res.json();
			assert.equal(json.success, true);
			assert.equal(json.totalRub, "3000.00");
			assert.equal(json.message, "Чек коррекции успешно сформирован");
			assert.ok(json.correctionQueueId);
		});

		it("3.2 Enforces mandatory tax authority prescription docNumber & docDate on prescription correction", async () => {
			const invalidPrescriptionPayload = {
				patientId: PATIENT_ID,
				operationType: "income" as const,
				customerContact: "+79998882233",
				cashierFullName: "Главный Аудитор Кассы",
				totalKopecks: 450000,
				electronicCardKopecks: 450000,
				taxationSystem: "usn_income" as const,
				correctionType: "by_instruction" as const,
				// Missing correctionDocNumber and correctionDocDate
				items: [
					{
						name: "Лечение по предписанию",
						priceKopecks: 450000,
						quantity: 1,
						amountKopecks: 450000,
						subject: "service" as const,
						method: "full_payment" as const,
						vatRate: "vat_none" as const,
						measure: "piece" as const,
					},
				],
			};

			const res = await app.inject({
				method: "POST",
				url: "/api/fiscal/correction/prescription",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: invalidPrescriptionPayload,
			});

			assert.equal(res.statusCode, 400);
			assert.match(res.json().message, /предписани/i);

			// Now provide valid prescription docNumber & docDate
			const validPrescriptionPayload = {
				...invalidPrescriptionPayload,
				correctionDocNumber: "ПРЕДП-2026/09-ФНС",
				correctionDocDate: "2026-09-15",
			};

			const resValid = await app.inject({
				method: "POST",
				url: "/api/fiscal/correction/prescription",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: validPrescriptionPayload,
			});

			assert.equal(resValid.statusCode, 201);
			const jsonValid = resValid.json();
			assert.equal(jsonValid.success, true);
			assert.equal(jsonValid.totalRub, "4500.00");
			assert.match(jsonValid.message, /предписанию/i);
		});
	});
});
