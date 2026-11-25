/**
 * wave9FiscalSbpSberAndFamilyIntegrity.test.ts
 *
 * Red Team End-to-End Verification Suite for Wave 9 (DEF-01..DEF-16):
 * 1. DEF-01: Unified FFD 1.2 payload SSOT & backward-compatible parseFfd12Payload adapter + ATOL JSON framing.
 * 2. DEF-02: SBP webhook BOLA protection (cross-tenant/cross-patient rejection + NODE_ENV=production payload ban).
 * 3. DEF-04 & DEF-05 & DEF-07: REFUNDED -> SETTLED state inversion block (zero ghost receipts),
 *    cashless shift ledger sync (`cashBoxes`, `cashBoxShifts`, `cashOperations`), and strict invoice isolation.
 * 4. DEF-06: POS terminal offline refuses to fabricate RRN/authCode/PAN/MIR (`503 TERMINAL_OFFLINE`).
 * 5. DEF-08: Family refund negative sign in `payments` & netting in FNS 1151156 tax certificates.
 * 6. DEF-10: Installment contract with `downPaymentRub: 0` does NOT mark invoice `"paid"`.
 * 7. DEF-11: SSRF guard on `POST /api/fiscal/devices/test-connection` (metadata & DB ports blocked).
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	familyGroups,
	fiscalReceiptQueue,
	organizations,
	patientInvoices,
	patients,
	payments,
	sberbankTransactions,
	users,
	visits,
} from "../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../db/seeds/seed_cash_and_reasons.js";
import { registerInstallmentContractsRoutes } from "../../routes/cashbox/installmentModules/installmentContractsRoutes.js";
import { registerFiscalReceiptRoutes } from "../../routes/fiscal/fiscalReceiptRoutes.js";
import { registerSberPosWebhookRoutes } from "../../routes/payments/sberWebhook/index.js";
import { reconcileInvoiceBalanceInDb } from "../../routes/payments/sberWebhook/paymentStateTransition.js";
import { registerSbpRoutes } from "../../routes/sbp/index.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { generateFnsTaxCertificatesForFamilyLogic } from "../../services/familyWallet/familyFnsTaxService.js";
import { processFamilyRefund } from "../../services/familyWallet/modules/familyRefundOperation.js";
import { formatAtolJsonTask } from "../../services/hardware/kktModules/kktProtocolFraming.js";
import { parseFfd12Payload } from "../../services/hardware/queueModules/queuePayloadUtils.js";
import { FiscalReceiptFactory } from "../../services/kkt/FiscalReceiptFactory.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createIdempotentTenantTestApp } from "../support/tenantTestApp.js";

const TEST_NS = `wave9FiscalSbpSberFamily:${crypto.randomUUID()}`;
const ORG_A_ID = fixtureUuid(TEST_NS, 1);
const ORG_B_ID = fixtureUuid(TEST_NS, 2);
const STAFF_A_ID = fixtureUuid(TEST_NS, 3);
const PATIENT_A1_ID = fixtureUuid(TEST_NS, 4);
const PATIENT_A2_ID = fixtureUuid(TEST_NS, 5);
const PATIENT_B1_ID = fixtureUuid(TEST_NS, 6);
const VISIT_SHARED_ID = fixtureUuid(TEST_NS, 7);
const INVOICE_A1_ID = fixtureUuid(TEST_NS, 8);
const INVOICE_A2_ID = fixtureUuid(TEST_NS, 9);
const INVOICE_INST_ID = fixtureUuid(TEST_NS, 10);
const INVOICE_B1_ID = fixtureUuid(TEST_NS, 11);
const FAMILY_A_ID = fixtureUuid(TEST_NS, 12);

// gitleaks:allow
const TEST_POS_SECRET = "wave9-pos-webhook-secret";
// gitleaks:allow
const TEST_SBP_SECRET = "wave9-sbp-webhook-secret";

function signParams(params: Record<string, string>, secret: string, sep: "=" | ";" = "="): string {
	const keys = Object.keys(params).sort();
	const raw =
		sep === ";"
			? `${keys.map((k) => `${k};${params[k]}`).join(";")};`
			: keys.map((k) => `${k}=${params[k]}`).join(";");
	return crypto.createHmac("sha256", secret).update(raw).digest("hex");
}

function isDbErr(err: unknown): boolean {
	if (!err) return false;
	const msg = err instanceof Error ? err.message : String(err);
	const causeMsg =
		typeof err === "object" && err !== null && "cause" in err && err.cause instanceof Error
			? err.cause.message
			: "";
	return /ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|getaddrinfo|Connection terminated|password authentication failed|database "[^"]*" does not exist|role "[^"]*" does not exist/i.test(
		`${msg} ${causeMsg}`,
	);
}

describe("Wave 9 Red Team Integrity: Fiscal SSOT, SBP BOLA, Sber State Machine, Shift Ledger & Family Tax", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	let staffTokenA = "";
	let clinicTokenA = "";
	const prevPosSecret = process.env.SBERBANK_POS_WEBHOOK_SECRET;
	const prevSbpSecret = process.env.SBP_WEBHOOK_SECRET;
	const prevNodeEnv = process.env.NODE_ENV;

	before(async () => {
		process.env.SBERBANK_POS_WEBHOOK_SECRET = TEST_POS_SECRET;
		process.env.SBP_WEBHOOK_SECRET = TEST_SBP_SECRET;
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

		app = await createIdempotentTenantTestApp();
		await registerSberPosWebhookRoutes(app);
		await registerSbpRoutes(app);
		await registerInstallmentContractsRoutes(app);
		await registerFiscalReceiptRoutes(app);
		await app.ready();

		const secret = authTokenSecret();
		staffTokenA = signToken(
			{ organizationId: ORG_A_ID, userId: STAFF_A_ID, role: "owner" },
			secret,
		);
		clinicTokenA = signToken({ organizationId: ORG_A_ID }, secret);

		try {
			await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);

			await withFixtureTenant(ORG_A_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_A_ID,
					name: "Wave 9 Clinic A LLC",
					inn: "7701234567",
					kpp: "770101001",
					ogrn: "1234567890123",
				});
				await tx.insert(users).values({
					id: STAFF_A_ID,
					organizationId: ORG_A_ID,
					fullName: "Владелец Клиники А",
					role: "owner",
				});
				await tx.insert(patients).values([
					{
						id: PATIENT_A1_ID,
						organizationId: ORG_A_ID,
						fullName: "Пациент Первый А",
					},
					{
						id: PATIENT_A2_ID,
						organizationId: ORG_A_ID,
						fullName: "Пациент Второй А",
					},
				]);
				await tx.insert(visits).values({
					id: VISIT_SHARED_ID,
					organizationId: ORG_A_ID,
					patientId: PATIENT_A1_ID,
					status: "signed",
				});
				await tx.insert(patientInvoices).values([
					{
						id: INVOICE_A1_ID,
						organizationId: ORG_A_ID,
						patientId: PATIENT_A1_ID,
						visitId: VISIT_SHARED_ID,
						status: "draft",
						totalRub: "3000.00",
						totalAmountRub: 3000,
						totalPriceKopecks: 300000n,
					},
					{
						id: INVOICE_A2_ID,
						organizationId: ORG_A_ID,
						patientId: PATIENT_A1_ID,
						visitId: VISIT_SHARED_ID,
						status: "draft",
						totalRub: "5000.00",
						totalAmountRub: 5000,
						totalPriceKopecks: 500000n,
					},
					{
						id: INVOICE_INST_ID,
						organizationId: ORG_A_ID,
						patientId: PATIENT_A1_ID,
						status: "draft",
						totalRub: "24000.00",
						totalAmountRub: 24000,
						totalPriceKopecks: 2400000n,
					},
				]);

				await ensureOrganizationCashBoxes(tx, ORG_A_ID);
				const boxes = await tx
					.select()
					.from(cashBoxes)
					.where(eq(cashBoxes.organizationId, ORG_A_ID));
				const cashlessBox = boxes.find((b) => b.type === "cashless" || b.isCashless);
				if (cashlessBox) {
					await tx.insert(cashBoxShifts).values({
						organizationId: ORG_A_ID,
						cashBoxId: cashlessBox.id,
						shiftNumber: 1,
						status: "open",
						openedByUserId: STAFF_A_ID,
						startBalanceRub: 0,
						startBalanceKopecks: 0,
						incomeTotalRub: 0,
						incomeTotalKopecks: 0,
						expenseTotalRub: 0,
						expenseTotalKopecks: 0,
					});
				}

				await tx.insert(familyGroups).values({
					id: FAMILY_A_ID,
					organizationId: ORG_A_ID,
					name: "Семья Тест Девять",
					headPatientId: PATIENT_A1_ID,
					balance: "10000.00",
					balanceKopecks: 1000000,
				});
				await tx
					.update(patients)
					.set({ familyGroupId: FAMILY_A_ID })
					.where(and(eq(patients.id, PATIENT_A1_ID), eq(patients.organizationId, ORG_A_ID)));
			});

			await withFixtureTenant(ORG_B_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_B_ID,
					name: "Wave 9 Clinic B LLC",
				});
				await tx.insert(patients).values({
					id: PATIENT_B1_ID,
					organizationId: ORG_B_ID,
					fullName: "Чужой Пациент Б",
				});
				await tx.insert(patientInvoices).values({
					id: INVOICE_B1_ID,
					organizationId: ORG_B_ID,
					patientId: PATIENT_B1_ID,
					status: "draft",
					totalRub: "7000.00",
					totalAmountRub: 7000,
					totalPriceKopecks: 700000n,
				});
			});
		} catch (err) {
			if (!isDbErr(err)) throw err;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (prevPosSecret === undefined) delete process.env.SBERBANK_POS_WEBHOOK_SECRET;
		else process.env.SBERBANK_POS_WEBHOOK_SECRET = prevPosSecret;

		if (prevSbpSecret === undefined) delete process.env.SBP_WEBHOOK_SECRET;
		else process.env.SBP_WEBHOOK_SECRET = prevSbpSecret;

		if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
		else process.env.NODE_ENV = prevNodeEnv;

		if (databaseAvailable) {
			try {
				await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);
			} catch (err) {
				if (!isDbErr(err)) throw err;
			}
		}
		await app.close();
	});

	test("DEF-01: parseFfd12Payload normalizes both canonical FFD 1.2 and legacy flat queue payloads for ATOL driver", () => {
		const canonical = FiscalReceiptFactory.buildFfd12Receipt({
			patientId: PATIENT_A1_ID,
			operationType: "income",
			totalKopecks: 350000,
			sbpKopecks: 350000,
			items: [
				{
					name: "Консультация",
					priceKopecks: 350000,
					quantity: 1,
					amountKopecks: 350000,
					subject: "service",
					method: "full_payment",
					vatRate: "vat_none",
					measure: "piece",
				},
			],
		});
		const parsedCanonical = parseFfd12Payload(canonical);
		const atolTaskCanonical = formatAtolJsonTask(parsedCanonical);
		assert.equal(atolTaskCanonical.total, 3500);
		assert.ok(Array.isArray(atolTaskCanonical.payments));
		assert.equal(atolTaskCanonical.payments.length, 1);

		// Legacy flat payload + Fiscal54FzService legacy tag1020_totalKopecks shape
		const legacyFlat = {
			amountKopecks: 250000,
			cashKopecks: 100000,
			electronicCardKopecks: 100000,
			advanceOffsetKopecks: 50000,
			note: "Старый плоский чек",
		};
		const parsedFlat = parseFfd12Payload(legacyFlat);
		assert.equal(parsedFlat.totalKopecks, 250000);
		assert.equal(parsedFlat.payments.cashKopecks, 100000);
		assert.equal(parsedFlat.payments.electronicCardKopecks, 100000);
		assert.equal(parsedFlat.payments.prepaidKopecks, 50000);
		assert.equal(parsedFlat.items.length, 1);
		const atolTaskFlat = formatAtolJsonTask(parsedFlat);
		assert.equal(atolTaskFlat.total, 2500);
	});

	test("DEF-02: SBP webhook rejects cross-tenant BOLA, mismatched invoice patient, and production payload fallback", async (t) => {
		if (!databaseAvailable) return t.skip("Database unavailable");

		// 1. Cross-tenant: ORG_A + PATIENT_B1 (belongs to ORG_B)
		const paramsCrossTenant = {
			operationId: "sbp-bola-cross-tenant-1",
			organizationId: ORG_A_ID,
			patientId: PATIENT_B1_ID,
			amountKopecks: "150000",
			status: "PAID",
		};
		const resCrossTenant = await app.inject({
			method: "POST",
			url: "/api/billing/sbp/webhook",
			payload: {
				...paramsCrossTenant,
				signature: signParams(paramsCrossTenant, TEST_SBP_SECRET, "="),
			},
		});
		assert.equal(resCrossTenant.statusCode, 404);

		// 2. Cross-patient mismatch within same org: PATIENT_A2 trying to settle INVOICE_A1 (belongs to PATIENT_A1)
		const paramsMismatch = {
			operationId: "sbp-bola-inv-mismatch-2",
			organizationId: ORG_A_ID,
			patientId: PATIENT_A2_ID,
			invoiceId: INVOICE_A1_ID,
			amountKopecks: "300000",
			status: "PAID",
		};
		const resMismatch = await app.inject({
			method: "POST",
			url: "/api/billing/sbp/webhook",
			payload: {
				...paramsMismatch,
				signature: signParams(paramsMismatch, TEST_SBP_SECRET, "="),
			},
		});
		assert.equal(resMismatch.statusCode, 404);

		// 3. In production, unregistered source === "payload" is completely blocked
		process.env.NODE_ENV = "production";
		try {
			const paramsProd = {
				operationId: "sbp-prod-unregistered-3",
				organizationId: ORG_A_ID,
				patientId: PATIENT_A1_ID,
				invoiceId: INVOICE_A1_ID,
				amountKopecks: "300000",
				status: "PAID",
			};
			const resProd = await app.inject({
				method: "POST",
				url: "/api/billing/sbp/webhook",
				payload: {
					...paramsProd,
					signature: signParams(paramsProd, TEST_SBP_SECRET, "="),
				},
			});
			assert.equal(resProd.statusCode, 404);
		} finally {
			process.env.NODE_ENV = "test";
		}
	});

	test("DEF-04 & DEF-05 & DEF-07: SberPOS enforces REFUNDED->SETTLED guard, cashless shift sync, and strict invoice isolation", async (t) => {
		if (!databaseAvailable) return t.skip("Database unavailable");

		const orderId = "pos-wave9-order-001";
		await withFixtureTenant(ORG_A_ID, async (tx) => {
			await tx.insert(sberbankTransactions).values({
				organizationId: ORG_A_ID,
				patientId: PATIENT_A1_ID,
				visitId: VISIT_SHARED_ID,
				invoiceId: INVOICE_A1_ID,
				orderId,
				amountKopecks: 300000n,
				status: "pending",
			});
		});

		const settleParams = { orderId, status: "SETTLED", amount: "300000" };
		const settleRes = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/webhook",
			payload: { ...settleParams, checksum: signParams(settleParams, TEST_POS_SECRET, ";") },
		});
		assert.equal(settleRes.statusCode, 200);
		assert.equal(settleRes.json().status, "SETTLED");

		// DEF-07: INVOICE_A1 is paid, while sibling INVOICE_A2 on the same visit remains draft/unpaid!
		await withFixtureTenant(ORG_A_ID, async (tx) => {
			const inv2Rec = await reconcileInvoiceBalanceInDb(tx, ORG_A_ID, INVOICE_A2_ID);
			assert.equal(inv2Rec.paidKopecks, 0);
			assert.equal(inv2Rec.isFullyPaid, false);

			// DEF-05: Cashless shift & box updated on settlement
			const [box] = await tx
				.select()
				.from(cashBoxes)
				.where(and(eq(cashBoxes.organizationId, ORG_A_ID), eq(cashBoxes.type, "cashless")));
			assert.ok(box);
			assert.equal(box.balanceKopecks, 300000);

			const [shift] = await tx
				.select()
				.from(cashBoxShifts)
				.where(and(eq(cashBoxShifts.organizationId, ORG_A_ID), eq(cashBoxShifts.cashBoxId, box.id)));
			assert.ok(shift);
			assert.equal(shift.incomeTotalKopecks, 300000);
		});

		// Refund transaction
		const refundParams = { orderId, status: "REFUNDED" };
		const refundRes = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/webhook",
			payload: { ...refundParams, checksum: signParams(refundParams, TEST_POS_SECRET, ";") },
		});
		assert.equal(refundRes.statusCode, 200);
		assert.equal(refundRes.json().status, "REFUNDED");

		// DEF-04: Replay SETTLED after REFUNDED MUST NOT revert to SETTLED or enqueue ghost income receipt!
		const replaySettleRes = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/webhook",
			payload: { ...settleParams, checksum: signParams(settleParams, TEST_POS_SECRET, ";") },
		});
		assert.equal(replaySettleRes.statusCode, 200);
		assert.equal(replaySettleRes.json().processed, false);
		assert.equal(replaySettleRes.json().reason, "already_refunded");

		await withFixtureTenant(ORG_A_ID, async (tx) => {
			const [txRow] = await tx
				.select()
				.from(sberbankTransactions)
				.where(and(eq(sberbankTransactions.organizationId, ORG_A_ID), eq(sberbankTransactions.orderId, orderId)));
			assert.equal(txRow?.status, "REFUNDED");

			const [payRow] = await tx
				.select()
				.from(payments)
				.where(and(eq(payments.organizationId, ORG_A_ID), eq(payments.clientMutationId, `sberpos:${orderId}`)));
			assert.equal(payRow?.status, "refunded");

			const receipts = await tx
				.select()
				.from(fiscalReceiptQueue)
				.where(and(eq(fiscalReceiptQueue.organizationId, ORG_A_ID), eq(fiscalReceiptQueue.paymentId, payRow?.id ?? "")));
			assert.equal(receipts.filter((r) => r.receiptType === "income").length, 1);
			assert.equal(receipts.filter((r) => r.receiptType === "income_return").length, 1);

			const [box] = await tx
				.select()
				.from(cashBoxes)
				.where(and(eq(cashBoxes.organizationId, ORG_A_ID), eq(cashBoxes.type, "cashless")));
			assert.equal(box?.balanceKopecks, 0);

			const ops = await tx
				.select()
				.from(cashOperations)
				.where(and(eq(cashOperations.organizationId, ORG_A_ID), eq(cashOperations.cashBoxId, box?.id ?? "")));
			assert.equal(ops.filter((o) => o.operationType === "income").length, 1);
			assert.equal(ops.filter((o) => o.operationType === "expense").length, 1);
		});
	});

	test("DEF-06: POS proxy refuses fake slip approval without terminal confirmation (503 TERMINAL_OFFLINE)", async (t) => {
		if (!databaseAvailable) return t.skip("Database unavailable");

		const res = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/transaction",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
				"idempotency-key": crypto.randomUUID(),
			},
			payload: {
				patientId: PATIENT_A1_ID,
				operation: "sale",
				amountKopecks: 250000,
			},
		});
		assert.equal(res.statusCode, 503);
		assert.equal(res.json().error, "TERMINAL_OFFLINE");
	});

	test("DEF-08: Family refund writes negative amountKopecks and reduces FNS 1151156 tax deduction sum", async (t) => {
		if (!databaseAvailable) return t.skip("Database unavailable");

		await withFixtureTenant(ORG_A_ID, async (tx) => {
			await tx.insert(payments).values({
				organizationId: ORG_A_ID,
				patientId: PATIENT_A1_ID,
				method: "family_wallet",
				status: "paid",
				amountRub: 6000,
				amountKopecks: 600000n,
				taxDeductionCode: "1",
				paidAt: new Date(),
				clientMutationId: crypto.randomUUID(),
				note: "Лечение кариеса",
			});
		});

		const refundRes = await processFamilyRefund({
			organizationId: ORG_A_ID,
			familyGroupId: FAMILY_A_ID,
			patientId: PATIENT_A1_ID,
			amountRub: 2000,
			amountKopecks: 200000,
			method: "card",
			clientMutationId: `fam-refund-${crypto.randomUUID()}`,
			reasonText: "Возврат переплаты",
		});
		assert.equal(refundRes.payment.amountRub, -2000);
		assert.equal(refundRes.payment.amountKopecks, -200000n);

		// Also insert a refunded treatment payment (status = "refunded") to verify FNS netting
		await withFixtureTenant(ORG_A_ID, async (tx) => {
			await tx.insert(payments).values({
				organizationId: ORG_A_ID,
				patientId: PATIENT_A1_ID,
				method: "family_wallet",
				status: "refunded",
				amountRub: -2000,
				amountKopecks: -200000n,
				taxDeductionCode: "1",
				paidAt: new Date(),
				clientMutationId: crypto.randomUUID(),
				note: "Возврат лечения кариеса",
			});
		});

		const certs = await generateFnsTaxCertificatesForFamilyLogic({
			organizationId: ORG_A_ID,
			familyGroupId: FAMILY_A_ID,
			taxYear: String(new Date().getFullYear()),
			clinic: {
				name: "Wave 9 Clinic A LLC",
				inn: "7701234567",
				kpp: "770101001",
				ogrn: "1234567890123",
			},
			signatory: {
				signatoryRole: "1" as const,
				fullName: { family: "Иванов", given: "Иван", patronymic: "Иванович" },
			},
		});
		const cert = certs.find((c) => c.patientId === PATIENT_A1_ID);
		assert.ok(cert);
		assert.equal(cert.code01AmountRub, 4000);
		assert.equal(cert.grandTotalRub, 4000);
	});

	test("DEF-10: Installment contract with downPaymentRub=0 does not falsely mark invoice paid", async (t) => {
		if (!databaseAvailable) return t.skip("Database unavailable");

		const res = await app.inject({
			method: "POST",
			url: "/api/installments",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
				"idempotency-key": crypto.randomUUID(),
			},
			payload: {
				patientId: PATIENT_A1_ID,
				invoiceId: INVOICE_INST_ID,
				totalAmountRub: 24000,
				downPaymentRub: 0,
				monthsCount: 6,
				notes: "Рассрочка без аванса",
			},
		});
		assert.equal(res.statusCode, 201, res.body);

		await withFixtureTenant(ORG_A_ID, async (tx) => {
			const [inv] = await tx
				.select()
				.from(patientInvoices)
				.where(and(eq(patientInvoices.id, INVOICE_INST_ID), eq(patientInvoices.organizationId, ORG_A_ID)));
			assert.notEqual(inv?.status, "paid");
		});
	});

	test("DEF-11: POST /api/fiscal/devices/test-connection blocks SSRF metadata & DB ports", async () => {
		const metaRes = await app.inject({
			method: "POST",
			url: "/api/fiscal/devices/test-connection",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
				"idempotency-key": crypto.randomUUID(),
			},
			payload: { host: "169.254.169.254", port: 80, timeoutMs: 500 },
		});
		assert.equal(metaRes.statusCode, 400);
		assert.equal(metaRes.json().error, "InvalidKktTarget");

		const pgPortRes = await app.inject({
			method: "POST",
			url: "/api/fiscal/devices/test-connection",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
				"idempotency-key": crypto.randomUUID(),
			},
			payload: { host: "127.0.0.1", port: 5432, timeoutMs: 500 },
		});
		assert.equal(pgPortRes.statusCode, 400);
		assert.equal(pgPortRes.json().error, "InvalidKktTarget");
	});
});
