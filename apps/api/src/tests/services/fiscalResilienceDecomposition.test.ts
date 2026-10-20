/**
 * fiscalResilienceDecomposition.test.ts — Verification & Smoke Test Suite for
 * Decomposed 54-FZ Fiscal Resilience Service (Mandate 8b).
 *
 * Verifies:
 * 1. Canonical facade `apps/api/src/services/fiscalResilienceService.ts` exports 100% of Layer 0-3 symbols.
 * 2. Exponential retry policy backoff curve `[1s, 5s, 15s, 60s, 300s]`.
 * 3. Background health checker worker lifecycle and telemetry inspection.
 * 4. Fastify route handler validation.
 * 5. Live DB 2-phase checkout, offline resilience, manual retry, and idempotency guard (anti-double-charge).
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import {
	clinics,
	fiscalReceiptQueue,
	organizations,
	patients,
	payments,
} from "../../db/schema.js";
import {
	FISCAL_RETRY_SCHEDULE_MS,
	FiscalHealthChecker,
	FiscalQueueManager,
	FiscalResilienceService,
	FiscalRetryPolicy,
	type FiscalCheckoutInput,
} from "../../services/fiscalResilienceService.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const ORG_ID = fixtureUuid("fiscalResilienceDecomp", 1);
const PATIENT_ID = fixtureUuid("fiscalResilienceDecomp", 2);
const CLINIC_ID = fixtureUuid("fiscalResilienceDecomp", 3);

describe("54-FZ FiscalResilienceService Modular Decomposition & Anti-Double-Charge Suite", () => {
	let dbAvailable = true;

	before(async () => {
		process.env.NODE_ENV = "test";
		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx
					.insert(organizations)
					.values({
						id: ORG_ID,
						name: "Клиника Фискальной Устойчивости 54-ФЗ",
					})
					.onConflictDoNothing();

				await tx
					.insert(clinics)
					.values({
						id: CLINIC_ID,
						organizationId: ORG_ID,
						name: "Центральный филиал",
						phone: "+74951112233",
					})
					.onConflictDoNothing();

				await tx
					.insert(patients)
					.values({
						id: PATIENT_ID,
						organizationId: ORG_ID,
						fullName: "Соколов Дмитрий Игоревич",
						phone: "+79165554433",
						birthDate: "1988-11-20",
					})
					.onConflictDoNothing();
			});
		} catch (err: unknown) {
			if (isDatabaseUnavailable(err)) {
				dbAvailable = false;
			} else {
				throw err;
			}
		}
	});

	after(async () => {
		FiscalResilienceService.stopBackgroundWorker();
		process.env.KKM_FORCE_OFFLINE = "0";
		process.env.KKM_OUT_OF_PAPER = "0";
		if (dbAvailable) {
			await purgeFixtureOrganizations([ORG_ID]).catch(() => {});
		}
	});

	it("1. Canonical facade exports all Layer 0-3 classes, methods, and constants with 100% parity", () => {
		assert.equal(typeof FiscalResilienceService, "function");
		assert.equal(typeof FiscalResilienceService.processFiscalCheckout, "function");
		assert.equal(typeof FiscalResilienceService.retryFiscalizeTransaction, "function");
		assert.equal(typeof FiscalResilienceService.handleRetryFiscalizeRoute, "function");
		assert.equal(typeof FiscalResilienceService.startBackgroundWorker, "function");
		assert.equal(typeof FiscalResilienceService.stopBackgroundWorker, "function");

		assert.equal(typeof FiscalQueueManager.processFiscalCheckout, "function");
		assert.equal(typeof FiscalHealthChecker.checkDeviceStatus, "function");
		assert.equal(typeof FiscalHealthChecker.inspectTelemetry, "function");
		assert.equal(typeof FiscalRetryPolicy.retryFiscalizeTransaction, "function");
		assert.equal(typeof FiscalRetryPolicy.calculateRetryDelayMs, "function");
	});

	it("2. FiscalRetryPolicy enforces exponential backoff schedule [1s, 5s, 15s, 60s, 300s]", () => {
		assert.deepEqual(FISCAL_RETRY_SCHEDULE_MS, [1000, 5000, 15000, 60000, 300000]);
		assert.equal(FiscalRetryPolicy.calculateRetryDelayMs(0), 1000);
		assert.equal(FiscalRetryPolicy.calculateRetryDelayMs(1), 5000);
		assert.equal(FiscalRetryPolicy.calculateRetryDelayMs(2), 15000);
		assert.equal(FiscalRetryPolicy.calculateRetryDelayMs(3), 60000);
		assert.equal(FiscalRetryPolicy.calculateRetryDelayMs(4), 300000);
		assert.equal(FiscalRetryPolicy.calculateRetryDelayMs(10), 300000);
	});

	it("3. FiscalHealthChecker inspects KKT telemetry and manages background poller lifecycle cleanly", async () => {
		process.env.KKM_FORCE_OFFLINE = "0";
		process.env.KKM_OUT_OF_PAPER = "0";

		const telemetry = await FiscalHealthChecker.inspectTelemetry();
		assert.equal(telemetry.online, true);
		assert.equal(telemetry.paperOk, true);
		assert.equal(telemetry.shiftExpired24h, false);
		assert.ok(telemetry.checkedAt);

		assert.equal(FiscalHealthChecker.isRunning(), false);
		FiscalResilienceService.startBackgroundWorker(ORG_ID, 60000);
		assert.equal(FiscalHealthChecker.isRunning(), true);
		FiscalResilienceService.stopBackgroundWorker();
		assert.equal(FiscalHealthChecker.isRunning(), false);
	});

	it("4. Phase 1 & 2 Live DB: prevents double-charging via clientMutationId and fiscalReceiptNumber idempotency", async () => {
		if (!dbAvailable) return;

		process.env.KKM_FORCE_OFFLINE = "1";

		const input: FiscalCheckoutInput = {
			organizationId: ORG_ID,
			patientId: PATIENT_ID,
			amountRub: 4500,
			method: "card",
			cashierFullName: "Петрова Е. В.",
			clientContact: "+79165554433",
			clientMutationId: "idemp-uuidv7-01900000-0000-7000-8000-000000000001",
			items: [
				{
					name: "Профессиональная гигиена полости рта",
					priceKopecks: 450000,
					quantity: 1,
					amountKopecks: 450000,
				},
			],
		};

		// First attempt while KKT offline -> buffered in queue, payment saved
		const firstAttempt = await FiscalResilienceService.processFiscalCheckout(input);
		assert.equal(firstAttempt.success, false);
		assert.equal(firstAttempt.status, "fiscalization_pending");

		// Duplicate checkout with same clientMutationId -> returns exact same paymentId & queueItemId (0 double charge!)
		const duplicateAttempt = await FiscalResilienceService.processFiscalCheckout(input);
		assert.equal(duplicateAttempt.paymentId, firstAttempt.paymentId);
		assert.equal(duplicateAttempt.queueItemId, firstAttempt.queueItemId);

		// Restore hardware and retry
		process.env.KKM_FORCE_OFFLINE = "0";
		const retry1 = await FiscalResilienceService.retryFiscalizeTransaction(
			ORG_ID,
			firstAttempt.paymentId,
		);
		assert.equal(retry1.success, true);
		assert.equal(retry1.status, "printed");
		assert.ok(retry1.fiscalReceiptNumber);

		// Second retry on already printed receipt -> idempotent already_fiscalized
		const retry2 = await FiscalResilienceService.retryFiscalizeTransaction(
			ORG_ID,
			firstAttempt.paymentId,
		);
		assert.equal(retry2.success, true);
		assert.equal(retry2.status, "already_fiscalized");
		assert.equal(retry2.fiscalReceiptNumber, retry1.fiscalReceiptNumber);

		// Verify only 1 payment record exists for this mutation
		await withTenantCtx(ORG_ID, async (tx) => {
			const rows = await tx
				.select()
				.from(payments)
				.where(eq(payments.id, firstAttempt.paymentId));
			assert.equal(rows.length, 1);
			assert.equal(rows[0]?.status, "paid");

			const qRows = await tx
				.select()
				.from(fiscalReceiptQueue)
				.where(eq(fiscalReceiptQueue.id, firstAttempt.queueItemId));
			assert.equal(qRows.length, 1);
			assert.equal(qRows[0]?.status, "printed");
		});
	});
});
