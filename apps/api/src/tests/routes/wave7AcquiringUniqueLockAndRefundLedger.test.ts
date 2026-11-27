import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db, tenantAlsStorage } from "../../db/client.js";
import {
	cashOperations,
	fiscalReceiptQueue,
	generatedDocuments,
	organizations,
	patientInvoices,
	patients,
	payments,
	sberbankTransactions,
	treatmentItems,
	users,
	visits,
} from "../../db/schema.js";
import { registerSberPosWebhookRoutes } from "../../routes/payments/sberWebhook/index.js";
import { registerSberbankRoutes } from "../../routes/sberbankRoutes/index.js";
import { registerSbpRoutes } from "../../routes/sbp/sbpRouteHandlers.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createIdempotentTenantTestApp } from "../support/tenantTestApp.js";

const TEST_NS = "wave7AcquiringUniqueLockAndRefundLedger";
const ORG_A_ID = fixtureUuid(TEST_NS, 1);
const ORG_B_ID = fixtureUuid(TEST_NS, 2);
const USER_A_ID = fixtureUuid(TEST_NS, 3);
const PATIENT_A_ID = fixtureUuid(TEST_NS, 4);
const PATIENT_B_ID = fixtureUuid(TEST_NS, 5);
const VISIT_POS_ID = fixtureUuid(TEST_NS, 10);
const VISIT_SBER_ID = fixtureUuid(TEST_NS, 11);
const VISIT_SBP_ID = fixtureUuid(TEST_NS, 12);
const ITEM_POS_ID = fixtureUuid(TEST_NS, 20);
const ITEM_SBER_ID = fixtureUuid(TEST_NS, 21);
const ITEM_SBP_ID = fixtureUuid(TEST_NS, 22);
const INVOICE_SBP_DOC_ID = fixtureUuid(TEST_NS, 30);
const GEN_DOC_SBP_ID = fixtureUuid(TEST_NS, 31);

const ENV_POS_SECRET = "wave7-global-pos-secret";
const ENV_SBER_SECRET = "wave7-global-sber-secret";
const ENV_SBP_SECRET = "wave7-global-sbp-secret";

function signSberParams(params: Record<string, string>, secret: string): string {
	const keys = Object.keys(params).sort();
	const raw = `${keys.map((k) => `${k};${params[k]}`).join(";")};`;
	return crypto.createHmac("sha256", secret).update(raw).digest("hex").toUpperCase();
}

function signSbpParams(params: Record<string, string>, secret: string): string {
	const keys = Object.keys(params).sort();
	const raw = keys.map((k) => `${k}=${params[k]}`).join(";");
	return crypto.createHmac("sha256", secret).update(raw).digest("hex").toUpperCase();
}

describe("Wave 7 Acquiring: UNIQUE(org_id, order_id), Advisory Locks, Refund Short-Circuit, Visit Treatment Rollback & Per-Clinic Secrets", () => {
	let app: FastifyInstance;
	let staffTokenA = "";
	let registerCalls = 0;
	let txHeldDuringGatewayCall = false;
	const sharedGatewayOrderId = `sber-pay-race-${TEST_NS}`;

	const origEnv = {
		pos: process.env.SBERBANK_POS_WEBHOOK_SECRET,
		sber: process.env.SBERBANK_WEBHOOK_SECRET,
		sbp: process.env.SBP_WEBHOOK_SECRET,
		dente: process.env.DENTE_WEBHOOK_SECRET,
		sberKey: process.env.SBERBANK_SECRET_KEY,
		nodeEnv: process.env.NODE_ENV,
		appUrl: process.env.APP_URL,
	};

	before(async () => {
		process.env.SBERBANK_POS_WEBHOOK_SECRET = ENV_POS_SECRET;
		process.env.SBERBANK_WEBHOOK_SECRET = ENV_SBER_SECRET;
		process.env.SBP_WEBHOOK_SECRET = ENV_SBP_SECRET;
		delete process.env.DENTE_WEBHOOK_SECRET;
		delete process.env.SBERBANK_SECRET_KEY;
		process.env.APP_URL = "https://clinic.example.test";

		app = await createIdempotentTenantTestApp();
		await registerSberPosWebhookRoutes(app);
		await registerSbpRoutes(app);
		await registerSberbankRoutes(app, {
			createClient: () => ({
				registerOrder: async (_orderNumber, _amountKopecks, _returnUrl) => {
					registerCalls += 1;
					// Verify no PG tenant transaction is held open across external HTTP gateway call
					if (tenantAlsStorage.getStore() !== undefined) {
						txHeldDuringGatewayCall = true;
					}
					return {
						orderId: sharedGatewayOrderId,
						formUrl: `https://securepayments.sberbank.ru/payment/${sharedGatewayOrderId}`,
					};
				},
			}),
		});
		await app.ready();

		staffTokenA = signToken(
			{ organizationId: ORG_A_ID, userId: USER_A_ID, role: "owner" },
			authTokenSecret(),
		);

		await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);

		await withFixtureTenant(ORG_A_ID, async () => {
			await db.delete(fiscalReceiptQueue).where(eq(fiscalReceiptQueue.organizationId, ORG_A_ID));
			await db.delete(cashOperations).where(eq(cashOperations.organizationId, ORG_A_ID));
			await db.delete(payments).where(eq(payments.organizationId, ORG_A_ID));
			await db.delete(sberbankTransactions).where(eq(sberbankTransactions.organizationId, ORG_A_ID));
			await db
				.insert(organizations)
				.values({
					id: ORG_A_ID,
					name: "Wave7 Acquiring Clinic A",
				})
				.onConflictDoNothing();
			await db
				.update(organizations)
				.set({
					sberbankWebhookSecret: null,
					sbpWebhookSecret: null,
					sberPosWebhookSecret: null,
				})
				.where(eq(organizations.id, ORG_A_ID));
			await db
				.insert(users)
				.values({
					id: USER_A_ID,
					organizationId: ORG_A_ID,
					fullName: "Врач Эквайринг А",
					role: "owner",
				})
				.onConflictDoNothing();
			await db
				.insert(patients)
				.values({
					id: PATIENT_A_ID,
					organizationId: ORG_A_ID,
					fullName: "Пациент Эквайринг А",
					phone: "+79991112233",
				})
				.onConflictDoNothing();
			await db
				.insert(visits)
				.values([
					{ id: VISIT_POS_ID, organizationId: ORG_A_ID, patientId: PATIENT_A_ID, status: "signed" },
					{ id: VISIT_SBER_ID, organizationId: ORG_A_ID, patientId: PATIENT_A_ID, status: "signed" },
					{ id: VISIT_SBP_ID, organizationId: ORG_A_ID, patientId: PATIENT_A_ID, status: "signed" },
				])
				.onConflictDoNothing();
			await db
				.insert(treatmentItems)
				.values([
					{
						id: ITEM_POS_ID,
						organizationId: ORG_A_ID,
						patientId: PATIENT_A_ID,
						visitId: VISIT_POS_ID,
						title: "Лечение кариеса (POS)",
						priceRub: 4500,
						unitPriceRub: 4500,
						priceKopecks: 450000n,
						unitPriceKopecks: 450000n,
						status: "completed",
					},
					{
						id: ITEM_SBER_ID,
						organizationId: ORG_A_ID,
						patientId: PATIENT_A_ID,
						visitId: VISIT_SBER_ID,
						title: "Эндодонтия (Sberbank)",
						priceRub: 7000,
						unitPriceRub: 7000,
						priceKopecks: 700000n,
						unitPriceKopecks: 700000n,
						status: "completed",
					},
					{
						id: ITEM_SBP_ID,
						organizationId: ORG_A_ID,
						patientId: PATIENT_A_ID,
						visitId: VISIT_SBP_ID,
						title: "Гигиена (SBP)",
						priceRub: 3200,
						unitPriceRub: 3200,
						priceKopecks: 320000n,
						unitPriceKopecks: 320000n,
						status: "completed",
					},
				])
				.onConflictDoUpdate({
					target: treatmentItems.id,
					set: { status: "completed" },
				});
			await db
				.insert(patientInvoices)
				.values({
					id: INVOICE_SBP_DOC_ID,
					organizationId: ORG_A_ID,
					patientId: PATIENT_A_ID,
					status: "draft",
					totalRub: "1800.00",
					totalAmountRub: 1800,
					totalPriceKopecks: 180000n,
				})
				.onConflictDoUpdate({
					target: patientInvoices.id,
					set: { status: "draft", paidAt: null },
				});
			await db
				.insert(generatedDocuments)
				.values({
					id: GEN_DOC_SBP_ID,
					organizationId: ORG_A_ID,
					patientId: PATIENT_A_ID,
					kind: "completed_works_act",
					status: "draft",
					title: "Акт СБП без счёта",
				})
				.onConflictDoUpdate({
					target: generatedDocuments.id,
					set: { status: "draft" },
				});
		});

		await withFixtureTenant(ORG_B_ID, async () => {
			await db.delete(sberbankTransactions).where(eq(sberbankTransactions.organizationId, ORG_B_ID));
			await db
				.insert(organizations)
				.values({
					id: ORG_B_ID,
					name: "Wave7 Acquiring Clinic B",
				})
				.onConflictDoNothing();
			await db
				.insert(patients)
				.values({
					id: PATIENT_B_ID,
					organizationId: ORG_B_ID,
					fullName: "Пациент Эквайринг Б",
				})
				.onConflictDoNothing();
		});
	});

	after(async () => {
		if (origEnv.pos !== undefined) process.env.SBERBANK_POS_WEBHOOK_SECRET = origEnv.pos;
		else delete process.env.SBERBANK_POS_WEBHOOK_SECRET;
		if (origEnv.sber !== undefined) process.env.SBERBANK_WEBHOOK_SECRET = origEnv.sber;
		else delete process.env.SBERBANK_WEBHOOK_SECRET;
		if (origEnv.sbp !== undefined) process.env.SBP_WEBHOOK_SECRET = origEnv.sbp;
		else delete process.env.SBP_WEBHOOK_SECRET;
		if (origEnv.dente !== undefined) process.env.DENTE_WEBHOOK_SECRET = origEnv.dente;
		else delete process.env.DENTE_WEBHOOK_SECRET;
		if (origEnv.sberKey !== undefined) process.env.SBERBANK_SECRET_KEY = origEnv.sberKey;
		else delete process.env.SBERBANK_SECRET_KEY;
		if (origEnv.nodeEnv !== undefined) process.env.NODE_ENV = origEnv.nodeEnv;
		else delete process.env.NODE_ENV;
		if (origEnv.appUrl !== undefined) process.env.APP_URL = origEnv.appUrl;
		else delete process.env.APP_URL;

		await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);
		await app.close();
	});

	test("[BUG-02] DB UNIQUE(organization_id, order_id) rejects duplicate within org but isolates across orgs", async () => {
		const crossOrgOrderId = "shared-order-id-across-orgs";
		await withFixtureTenant(ORG_A_ID, async () => {
			await db.insert(sberbankTransactions).values({
				organizationId: ORG_A_ID,
				patientId: PATIENT_A_ID,
				orderId: crossOrgOrderId,
				amountKopecks: 100000n,
				status: "pending",
			});
			await assert.rejects(
				db.insert(sberbankTransactions).values({
					organizationId: ORG_A_ID,
					patientId: PATIENT_A_ID,
					orderId: crossOrgOrderId,
					amountKopecks: 100000n,
					status: "pending",
				}),
			);
		});

		await withFixtureTenant(ORG_B_ID, async () => {
			await db.insert(sberbankTransactions).values({
				organizationId: ORG_B_ID,
				patientId: PATIENT_B_ID,
				orderId: crossOrgOrderId,
				amountKopecks: 200000n,
				status: "pending",
			});
		});
	});

	test("[BUG-02] Concurrent SberPOS transaction race serializes under advisory lock with zero 409 AmbiguousOrderId", async () => {
		const orderId = `POS-RACE-${crypto.randomUUID().slice(0, 12)}`;
		const payload = {
			orderId,
			patientId: PATIENT_A_ID,
			amountKopecks: 210000,
			operation: "sale",
			originalRrn: "123456789012",
			originalAuthCode: "654321",
		};

		const [res1, res2] = await Promise.all([
			app.inject({
				method: "POST",
				url: "/api/payments/sberbank/pos/transaction",
				headers: {
					"x-dente-staff-token": staffTokenA,
					"idempotency-key": crypto.randomUUID(),
				},
				payload,
			}),
			app.inject({
				method: "POST",
				url: "/api/payments/sberbank/pos/transaction",
				headers: {
					"x-dente-staff-token": staffTokenA,
					"idempotency-key": crypto.randomUUID(),
				},
				payload,
			}),
		]);

		assert.equal(res1.statusCode, 200, res1.body);
		assert.equal(res2.statusCode, 200, res2.body);

		const txRows = await withFixtureTenant(ORG_A_ID, async () =>
			db
				.select()
				.from(sberbankTransactions)
				.where(
					and(
						eq(sberbankTransactions.organizationId, ORG_A_ID),
						eq(sberbankTransactions.orderId, orderId),
					),
				),
		);
		assert.equal(txRows.length, 1);

		const paymentRows = await withFixtureTenant(ORG_A_ID, async () =>
			db
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_A_ID),
						eq(payments.clientMutationId, `sberpos:${orderId}`),
					),
				),
		);
		assert.equal(paymentRows.length, 1);
	});

	test("[BUG-02] POST /api/sberbank/pay requires Idempotency-Key, runs HTTP outside TX, and deduplicates concurrent orderId", async () => {
		const missingKeyRes = await app.inject({
			method: "POST",
			url: "/api/sberbank/pay",
			headers: { "x-dente-staff-token": staffTokenA },
			payload: { patientId: PATIENT_A_ID, amount: 1500 },
		});
		assert.equal(missingKeyRes.statusCode, 400);
		assert.equal(missingKeyRes.json().error, "IdempotencyKeyRequired");

		const [r1, r2] = await Promise.all([
			app.inject({
				method: "POST",
				url: "/api/sberbank/pay",
				headers: {
					"x-dente-staff-token": staffTokenA,
					"idempotency-key": crypto.randomUUID(),
				},
				payload: { patientId: PATIENT_A_ID, amount: 1500 },
			}),
			app.inject({
				method: "POST",
				url: "/api/sberbank/pay",
				headers: {
					"x-dente-staff-token": staffTokenA,
					"idempotency-key": crypto.randomUUID(),
				},
				payload: { patientId: PATIENT_A_ID, amount: 1500 },
			}),
		]);

		assert.equal(r1.statusCode, 200, r1.body);
		assert.equal(r2.statusCode, 200, r2.body);
		assert.equal(registerCalls, 2);
		assert.equal(txHeldDuringGatewayCall, false, "PG TX must NOT be held open during client.registerOrder");

		const txRows = await withFixtureTenant(ORG_A_ID, async () =>
			db
				.select()
				.from(sberbankTransactions)
				.where(
					and(
						eq(sberbankTransactions.organizationId, ORG_A_ID),
						eq(sberbankTransactions.orderId, sharedGatewayOrderId),
					),
				),
		);
		assert.equal(txRows.length, 1);
	});

	test("[BUG-02] POST /api/billing/sbp/generate-qr inserts unique sberbankTransactions and replays idempotently", async () => {
		const key1 = crypto.randomUUID();
		const key2 = crypto.randomUUID();
		const sbpOperationId = `SBPQR-${key1.slice(0, 12)}`;
		const [res1, res2] = await Promise.all([
			app.inject({
				method: "POST",
				url: "/api/billing/sbp/generate-qr",
				headers: {
					"x-dente-staff-token": staffTokenA,
					"idempotency-key": key1,
				},
				payload: {
					operationId: sbpOperationId,
					patientId: PATIENT_A_ID,
					invoiceId: INVOICE_SBP_DOC_ID,
					amountKopecks: 180000,
				},
			}),
			app.inject({
				method: "POST",
				url: "/api/billing/sbp/generate-qr",
				headers: {
					"x-dente-staff-token": staffTokenA,
					"idempotency-key": key2,
				},
				payload: {
					operationId: sbpOperationId,
					patientId: PATIENT_A_ID,
					invoiceId: INVOICE_SBP_DOC_ID,
					amountKopecks: 180000,
				},
			}),
		]);

		assert.equal(res1.statusCode, 201, res1.body);
		assert.equal(res2.statusCode, 201, res2.body);
		const opId = res1.json().operationId as string;
		assert.equal(res2.json().operationId, opId);

		// Sequential idempotency replay with same key also returns 201
		const replayRes = await app.inject({
			method: "POST",
			url: "/api/billing/sbp/generate-qr",
			headers: {
				"x-dente-staff-token": staffTokenA,
				"idempotency-key": key1,
			},
			payload: {
				operationId: sbpOperationId,
				patientId: PATIENT_A_ID,
				invoiceId: INVOICE_SBP_DOC_ID,
				amountKopecks: 180000,
			},
		});
		assert.equal(replayRes.statusCode, 201, replayRes.body);

		const txRows = await withFixtureTenant(ORG_A_ID, async () =>
			db
				.select()
				.from(sberbankTransactions)
				.where(
					and(
						eq(sberbankTransactions.organizationId, ORG_A_ID),
						eq(sberbankTransactions.orderId, opId),
					),
				),
		);
		assert.equal(txRows.length, 1);
	});

	test("[BUG-03] SberPOS transaction(refund) + webhook(REFUNDED) short-circuit repeats & revert visit treatment_items without invoiceId", async () => {
		const orderId = `POS-REFUND-VISIT-${crypto.randomUUID().slice(0, 8)}`;
		await withFixtureTenant(ORG_A_ID, async () => {
			await db.insert(sberbankTransactions).values({
				organizationId: ORG_A_ID,
				patientId: PATIENT_A_ID,
				visitId: VISIT_POS_ID,
				invoiceId: null,
				orderId,
				amountKopecks: 450000n,
				status: "pending",
			});
		});

		const settleParams = { orderId, status: "SETTLED", amount: "450000" };
		const settleRes = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/webhook",
			payload: { ...settleParams, checksum: signSberParams(settleParams, ENV_POS_SECRET) },
		});
		assert.equal(settleRes.statusCode, 200, settleRes.body);

		const refundParams = { orderId, status: "REFUNDED", amount: "450000" };
		const refundSig = signSberParams(refundParams, ENV_POS_SECRET);

		const refundRes1 = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/webhook",
			payload: { ...refundParams, checksum: refundSig },
		});
		assert.equal(refundRes1.statusCode, 200, refundRes1.body);
		assert.equal(refundRes1.json().processed, true);

		const refundRes2 = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/webhook",
			payload: { ...refundParams, checksum: refundSig },
		});
		assert.equal(refundRes2.statusCode, 200, refundRes2.body);
		assert.equal(refundRes2.json().processed, false);
		assert.equal(refundRes2.json().reason, "already_refunded");

		// Also verify sberPosTransactionHandler op="refund" short-circuits
		const directRefundRepeat = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/transaction",
			headers: {
				"x-dente-staff-token": staffTokenA,
				"idempotency-key": crypto.randomUUID(),
			},
			payload: {
				orderId,
				patientId: PATIENT_A_ID,
				visitId: VISIT_POS_ID,
				amountKopecks: 450000,
				operation: "refund",
				originalRrn: "123456789012",
				originalAuthCode: "654321",
			},
		});
		assert.equal(directRefundRepeat.statusCode, 200, directRefundRepeat.body);
		assert.equal(directRefundRepeat.json().processed, false);
		assert.equal(directRefundRepeat.json().reason, "already_refunded");

		// Verify treatment_items reverted to approved even with invoiceId = null
		const [itemAfter] = await withFixtureTenant(ORG_A_ID, async () =>
			db
				.select()
				.from(treatmentItems)
				.where(and(eq(treatmentItems.organizationId, ORG_A_ID), eq(treatmentItems.id, ITEM_POS_ID))),
		);
		assert.equal(itemAfter?.status, "approved");

		// Verify only 1 cashOperations expense entry & 1 income_return receipt for this payment
		const [paymentRow] = await withFixtureTenant(ORG_A_ID, async () =>
			db
				.select()
				.from(payments)
				.where(and(eq(payments.organizationId, ORG_A_ID), eq(payments.clientMutationId, `sberpos:${orderId}`))),
		);
		assert.ok(paymentRow);
		const ledgerRefunds = await withFixtureTenant(ORG_A_ID, async () =>
			db
				.select()
				.from(cashOperations)
				.where(
					and(
						eq(cashOperations.organizationId, ORG_A_ID),
						eq(cashOperations.patientId, PATIENT_A_ID),
						eq(cashOperations.operationType, "expense"),
					),
				),
		);
		assert.equal(ledgerRefunds.length, 1);

		const posReturnReceipts = await withFixtureTenant(ORG_A_ID, async () =>
			db
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.organizationId, ORG_A_ID),
						eq(fiscalReceiptQueue.paymentId, paymentRow.id),
						eq(fiscalReceiptQueue.receiptType, "income_return"),
					),
				),
		);
		assert.equal(posReturnReceipts.length, 1);
	});

	test("[BUG-03] Sberbank webhook refund short-circuits repeats & reverts visit treatment_items without invoiceId", async () => {
		const orderId = `SBER-REFUND-VISIT-${crypto.randomUUID().slice(0, 8)}`;
		await withFixtureTenant(ORG_A_ID, async () => {
			await db.insert(sberbankTransactions).values({
				organizationId: ORG_A_ID,
				patientId: PATIENT_A_ID,
				visitId: VISIT_SBER_ID,
				invoiceId: null,
				orderId,
				amountKopecks: 700000n,
				status: "pending",
			});
		});

		const settleParams = { orderId, status: "success" };
		const settleRes = await app.inject({
			method: "POST",
			url: "/api/sberbank/webhook",
			payload: { ...settleParams, checksum: signSberParams(settleParams, ENV_SBER_SECRET) },
		});
		assert.equal(settleRes.statusCode, 200, settleRes.body);

		const refundParams = { orderId, status: "refunded" };
		const refundSig = signSberParams(refundParams, ENV_SBER_SECRET);
		const r1 = await app.inject({
			method: "POST",
			url: "/api/sberbank/webhook",
			payload: { ...refundParams, checksum: refundSig },
		});
		assert.equal(r1.statusCode, 200, r1.body);
		assert.equal(r1.json().processed, true);

		const r2 = await app.inject({
			method: "POST",
			url: "/api/sberbank/webhook",
			payload: { ...refundParams, checksum: refundSig },
		});
		assert.equal(r2.statusCode, 200, r2.body);
		assert.equal(r2.json().processed, false);
		assert.equal(r2.json().reason, "already_refunded");

		const [itemAfter] = await withFixtureTenant(ORG_A_ID, async () =>
			db
				.select()
				.from(treatmentItems)
				.where(and(eq(treatmentItems.organizationId, ORG_A_ID), eq(treatmentItems.id, ITEM_SBER_ID))),
		);
		assert.equal(itemAfter?.status, "approved");

		const returnReceipts = await withFixtureTenant(ORG_A_ID, async () =>
			db
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.organizationId, ORG_A_ID),
						eq(fiscalReceiptQueue.visitId, VISIT_SBER_ID),
						eq(fiscalReceiptQueue.receiptType, "income_return"),
					),
				),
		);
		assert.equal(returnReceipts.length, 1);
	});

	test("[BUG-03] SBP webhook refund short-circuits repeats, reverts visit treatment_items without invoiceId, & resolves payments.documentId", async () => {
		const opIdVisit = `SBP-REFUND-VISIT-${crypto.randomUUID().slice(0, 8)}`;
		await withFixtureTenant(ORG_A_ID, async () => {
			await db.insert(sberbankTransactions).values({
				organizationId: ORG_A_ID,
				patientId: PATIENT_A_ID,
				visitId: VISIT_SBP_ID,
				invoiceId: null,
				orderId: opIdVisit,
				amountKopecks: 320000n,
				status: "pending",
			});
		});

		const payParams = { operationId: opIdVisit, status: "PAID", amountKopecks: "320000" };
		const payRes = await app.inject({
			method: "POST",
			url: "/api/billing/sbp/webhook",
			payload: { ...payParams, signature: signSbpParams(payParams, ENV_SBP_SECRET) },
		});
		assert.equal(payRes.statusCode, 200, payRes.body);

		const refParams = { operationId: opIdVisit, status: "REFUNDED", amountKopecks: "320000" };
		const refSig = signSbpParams(refParams, ENV_SBP_SECRET);
		const refRes1 = await app.inject({
			method: "POST",
			url: "/api/billing/sbp/webhook",
			payload: { ...refParams, signature: refSig },
		});
		assert.equal(refRes1.statusCode, 200, refRes1.body);
		assert.equal(refRes1.json().processed, true);

		const refRes2 = await app.inject({
			method: "POST",
			url: "/api/billing/sbp/webhook",
			payload: { ...refParams, signature: refSig },
		});
		assert.equal(refRes2.statusCode, 200, refRes2.body);
		assert.equal(refRes2.json().processed, false);
		assert.equal(refRes2.json().reason, "already_refunded");

		const [itemAfter] = await withFixtureTenant(ORG_A_ID, async () =>
			db
				.select()
				.from(treatmentItems)
				.where(and(eq(treatmentItems.organizationId, ORG_A_ID), eq(treatmentItems.id, ITEM_SBP_ID))),
		);
		assert.equal(itemAfter?.status, "approved");

		// Now verify sbpWebhookContext & sbpWebhookSuccess handle payments.documentId:
		// (1) documentId points to patientInvoices -> reconciles invoice to "paid"
		const opIdInvDoc = `SBP-DOC-INV-${crypto.randomUUID().slice(0, 8)}`;
		const opIdGenDoc = `SBP-DOC-GEN-${crypto.randomUUID().slice(0, 8)}`;
		await withFixtureTenant(ORG_A_ID, async () => {
			await db.insert(payments).values([
				{
					organizationId: ORG_A_ID,
					patientId: PATIENT_A_ID,
					documentId: INVOICE_SBP_DOC_ID,
					amountRub: 1800,
					amountKopecks: 180000n,
					method: "online",
					status: "planned",
					clientMutationId: `sbp:${opIdInvDoc}`,
				},
				{
					organizationId: ORG_A_ID,
					patientId: PATIENT_A_ID,
					documentId: GEN_DOC_SBP_ID,
					amountRub: 900,
					amountKopecks: 90000n,
					method: "online",
					status: "planned",
					clientMutationId: `sbp:${opIdGenDoc}`,
				},
			]);
		});

		const settleInvParams = { operationId: opIdInvDoc, status: "PAID", amountKopecks: "180000" };
		const settleInvRes = await app.inject({
			method: "POST",
			url: "/api/billing/sbp/webhook",
			payload: { ...settleInvParams, signature: signSbpParams(settleInvParams, ENV_SBP_SECRET) },
		});
		assert.equal(settleInvRes.statusCode, 200, settleInvRes.body);
		const [invAfter] = await withFixtureTenant(ORG_A_ID, async () =>
			db
				.select()
				.from(patientInvoices)
				.where(and(eq(patientInvoices.organizationId, ORG_A_ID), eq(patientInvoices.id, INVOICE_SBP_DOC_ID))),
		);
		assert.equal(invAfter?.status, "paid");

		// (2) documentId points to generatedDocuments -> settles with 200 (must NOT throw 403 ForbiddenInvoice)
		const settleGenParams = { operationId: opIdGenDoc, status: "PAID", amountKopecks: "90000" };
		const settleGenRes = await app.inject({
			method: "POST",
			url: "/api/billing/sbp/webhook",
			payload: { ...settleGenParams, signature: signSbpParams(settleGenParams, ENV_SBP_SECRET) },
		});
		assert.equal(settleGenRes.statusCode, 200, settleGenRes.body);
		assert.equal(settleGenRes.json().status, "PAID");
	});

	test("[BUG-03] Per-clinic secret isolates tenant webhooks, rejects query+body tampering, and fails closed 503 in prod without secrets", async () => {
		const orderId = `SBER-PER-CLINIC-${crypto.randomUUID().slice(0, 8)}`;
		const clinicSecret = "clinic-a-exclusive-webhook-secret-999";

		await withFixtureTenant(ORG_A_ID, async () => {
			await db
				.update(organizations)
				.set({ sberbankWebhookSecret: clinicSecret })
				.where(eq(organizations.id, ORG_A_ID));
			await db.insert(sberbankTransactions).values({
				organizationId: ORG_A_ID,
				patientId: PATIENT_A_ID,
				orderId,
				amountKopecks: 120000n,
				status: "pending",
			});
		});

		try {
			// 1. Conflicting query + body values must be rejected with 400 AmbiguousWebhookPayload
			const tamperParams = { orderId, status: "refunded" };
			const tamperRes = await app.inject({
				method: "POST",
				url: `/api/sberbank/webhook?orderId=${orderId}&status=success`,
				payload: {
					...tamperParams,
					checksum: signSberParams(tamperParams, clinicSecret),
				},
			});
			assert.equal(tamperRes.statusCode, 400, tamperRes.body);
			assert.equal(tamperRes.json().error, "AmbiguousWebhookPayload");

			// 2. Global env secret MUST be rejected when clinic has its own secret configured
			const validParams = { orderId, status: "success" };
			const globalSignedRes = await app.inject({
				method: "POST",
				url: "/api/sberbank/webhook",
				payload: {
					...validParams,
					checksum: signSberParams(validParams, ENV_SBER_SECRET),
				},
			});
			assert.equal(globalSignedRes.statusCode, 401, globalSignedRes.body);
			assert.equal(globalSignedRes.json().error, "InvalidChecksum");

			// 3. Clinic's own secret succeeds
			const clinicSignedRes = await app.inject({
				method: "POST",
				url: "/api/sberbank/webhook",
				payload: {
					...validParams,
					checksum: signSberParams(validParams, clinicSecret),
				},
			});
			assert.equal(clinicSignedRes.statusCode, 200, clinicSignedRes.body);
			assert.equal(clinicSignedRes.json().status, "success");

			// 4. Fail-closed 503 in production when neither clinic secret nor env secret is configured
			await withFixtureTenant(ORG_A_ID, async () => {
				await db
					.update(organizations)
					.set({ sberbankWebhookSecret: null })
					.where(eq(organizations.id, ORG_A_ID));
			});
			delete process.env.SBERBANK_WEBHOOK_SECRET;
			process.env.NODE_ENV = "production";

			const prodNoSecretRes = await app.inject({
				method: "POST",
				url: "/api/sberbank/webhook",
				payload: {
					...validParams,
					checksum: signSberParams(validParams, "dev-sberbank-secret"),
				},
			});
			assert.equal(prodNoSecretRes.statusCode, 503, prodNoSecretRes.body);
			assert.equal(prodNoSecretRes.json().error, "WebhookSecretNotConfigured");
		} finally {
			process.env.NODE_ENV = "test";
			process.env.SBERBANK_WEBHOOK_SECRET = ENV_SBER_SECRET;
		}
	});
});
