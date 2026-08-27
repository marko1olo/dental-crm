/**
 * @dental/api/tests/routes/idempotentFiscalBuffer.test.ts
 *
 * Comprehensive Stress & Resilience Test Suite for:
 * 1. Strict Financial Transaction Idempotency (54-FZ Cashier, SBP Dynamic QR, SberBank Acquiring):
 *    - Composite keys: `Idempotency-Key` = `<uuid>#<sha256(canonicalPayload)>`
 *    - Race condition resistance & parallel multi-click deduplication
 *    - Payload mismatch detection & 409 Conflict rejection
 *    - Network timeout simulation & replay protection (zero double-charging)
 * 2. 54-FZ Offline Fiscal Spooler (Буфер отложенной фискализации):
 *    - Hardware offline / out-of-paper buffering in `fiscal_receipt_queue`
 *    - Non-blocking cashier checkout
 *    - Strict FIFO chronological flushing upon device reconnect
 *    - Individual item retry & queue statistics
 * 3. Distributed Optimistic Locking on 043/у Outpatient Cards & Diaries:
 *    - Concurrent Doctor & Assistant edit conflict detection (Lost Update prevention)
 *    - Granular field-level conflict diffing (409 Conflict)
 *    - Terminal lease token acquisition, heartbeat renewal, and release
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
	buildFiscalPrintPayloadSignature,
	buildPaymentTransactionPayloadSignature,
	buildSberAcquiringPayloadSignature,
	buildSbpQrPayloadSignature,
	computePayloadHash,
	generateFinancialCompositeIdempotencyKey,
	createFiscalReceiptPayloadSchema,
	type CreateFiscalReceiptPayloadInput,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	fiscalReceiptQueue,
	organizations,
	patients,
	payments,
	users,
	visitDiaries,
	visits,
} from "../../db/schema.js";
import { registerBillingRoutes } from "../../routes/billing.js";
import { registerFiscalReceiptRoutes } from "../../routes/fiscal/fiscalReceiptRoutes.js";
import { authTokenSecret } from "../../security/authSecret.js";
import {
	ClinicalConcurrencyConflictError,
	ClinicalRecordLockService,
} from "../../services/clinical/ClinicalRecordLockService.js";
import {
	IdempotencyPayloadMismatchError,
	IdempotentTransactionService,
} from "../../services/finance/IdempotentTransactionService.js";
import { OfflineFiscalSpooler } from "../../services/finance/OfflineFiscalSpooler.js";
import {
	FiscalQueueRetryWorker,
	LanKktDriverService,
} from "../../services/kkt/lanKktDriverService.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "idempotentBufferTest";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const PATIENT_ID = fixtureUuid(NAMESPACE, 10);
const DOCTOR_USER_ID = fixtureUuid(NAMESPACE, 20);
const ASSISTANT_USER_ID = fixtureUuid(NAMESPACE, 21);
const VISIT_ID = fixtureUuid(NAMESPACE, 30);
const DIARY_ID = fixtureUuid(NAMESPACE, 40);

describe("IDEMPOTENT DISTRIBUTED LAN/CLOUD TRANSACTION & 54-FZ BUFFER SUITE", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let doctorToken: string;
	let assistantToken: string;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

		app = createTenantTestApp();
		await registerBillingRoutes(app);
		await registerFiscalReceiptRoutes(app);
		await app.ready();

		clinicToken = signToken({ organizationId: ORG_ID }, authTokenSecret());
		doctorToken = signToken(
			{
				organizationId: ORG_ID,
				userId: DOCTOR_USER_ID,
				role: "doctor",
				fullName: "Доктор Иванов И. И.",
			},
			authTokenSecret(),
		);
		assistantToken = signToken(
			{
				organizationId: ORG_ID,
				userId: ASSISTANT_USER_ID,
				role: "assistant",
				fullName: "Ассистент Петрова А. С.",
			},
			authTokenSecret(),
		);

		await purgeFixtureOrganizations([ORG_ID]);

		// Seed initial organization, users, patient, and visit
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(organizations).values({
				id: ORG_ID,
				name: "Стоматология ДЕНТЕ Идемпотентность",
				inn: "7701555444",
			});

			await db.insert(users).values([
				{
					id: DOCTOR_USER_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Иванов И. И.",
					role: "doctor",
					isActive: true,
				},
				{
					id: ASSISTANT_USER_ID,
					organizationId: ORG_ID,
					fullName: "Ассистент Петрова А. С.",
					role: "assistant",
					isActive: true,
				},
			]);

			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Соколов Дмитрий Андреевич",
				phone: "+79031112233",
			});

			await db.insert(visits).values({
				id: VISIT_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				status: "draft",
			});

			await db.insert(visitDiaries).values({
				id: DIARY_ID,
				organizationId: ORG_ID,
				visitId: VISIT_ID,
				patientId: PATIENT_ID,
				doctorId: DOCTOR_USER_ID,
				anamnesis: "Пациент жалуется на ноющие боли в области зуба 2.6.",
				statusLocalis: "Глубокая кариозная полость на жевательной поверхности 2.6.",
				diagnosisIcd10: "K04.0",
				diagnosisTooth: "26",
				treatmentDescription: "Анестезия Ультракаин Д-С 1.7 мл, препарирование.",
				version: 1,
				isLocked: false,
			});
		});
	});

	after(async () => {
		delete process.env.KKM_FORCE_OFFLINE;
		delete process.env.KKM_HARDWARE_TIMEOUT;
		delete process.env.KKM_OUT_OF_PAPER;
		FiscalQueueRetryWorker.stopAutoRetryLoop();
		OfflineFiscalSpooler.stopSpoolerDaemon();
		await purgeFixtureOrganizations([ORG_ID]);
		await app.close();
	});

	// =========================================================================
	// 1. FINANCIAL TRANSACTION IDEMPOTENCY & RACE CONDITIONS
	// =========================================================================

	it("1.1 Concurrent parallel payment requests with identical composite key result in exactly 1 payment and replay responses", async () => {
		const mutationUuid = fixtureUuid(NAMESPACE, 101);
		const paymentPayload = {
			patientId: PATIENT_ID,
			amountRub: 7500,
			method: "card" as const,
			note: "Лечение пульпита зуба 2.6",
		};

		const signature = buildPaymentTransactionPayloadSignature({
			patientId: PATIENT_ID,
			totalKopecks: 750000,
			cardKopecks: 750000,
			paymentMethod: "card",
		});
		const compositeKey = generateFinancialCompositeIdempotencyKey(mutationUuid, signature);

		// Fire 4 parallel requests with the identical composite key
		const parallelPromises = Array.from({ length: 4 }).map(() =>
			withFixtureTenant(ORG_ID, async () => {
				return IdempotentTransactionService.executeIdempotentTransaction({
					organizationId: ORG_ID,
					idempotencyKey: compositeKey,
					entityKind: "payment",
					action: "create_payment",
					payload: signature,
					handler: async () => {
						// Real payment creation
						const [newPayment] = await db
							.insert(payments)
							.values({
								organizationId: ORG_ID,
								patientId: PATIENT_ID,
								visitId: VISIT_ID,
								amountRub: 7500,
								method: "card",
								clientMutationId: mutationUuid,
							})
							.returning();

						return {
							responseStatus: 201,
							responseJson: {
								success: true,
								paymentId: newPayment!.id,
								amountRub: 7500,
								method: "card",
							},
							entityId: newPayment!.id,
						};
					},
				});
			}),
		);

		const results = await Promise.all(parallelPromises);

		// Assertions: All 4 requests succeed
		for (const res of results) {
			assert.equal(res.success, true);
			assert.ok(res.responseJson.paymentId);
			assert.equal(res.responseJson.amountRub, 7500);
		}

		// Verify that exactly 1 executed the handler and the other 3 were replays
		const firstPaymentId = results[0]!.responseJson.paymentId;
		for (const res of results) {
			assert.equal(res.responseJson.paymentId, firstPaymentId);
		}

		// Verify in Database: exactly 1 payment record exists for this mutation
		const dbPayments = await withFixtureTenant(ORG_ID, async () => {
			return await db
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.clientMutationId, mutationUuid),
					),
				);
		});
		assert.equal(dbPayments.length, 1);
	});

	it("1.2 Mismatched payload with identical UUID key is rejected with IdempotencyPayloadMismatchError (HTTP 409)", async () => {
		const mutationUuid = fixtureUuid(NAMESPACE, 102);
		const initialPayload = {
			patientId: PATIENT_ID,
			totalKopecks: 500000,
		};
		const initialSignature = buildPaymentTransactionPayloadSignature(initialPayload);
		const initialKey = generateFinancialCompositeIdempotencyKey(mutationUuid, initialSignature);

		// 1. Record initial transaction
		await IdempotentTransactionService.executeIdempotentTransaction({
			organizationId: ORG_ID,
			idempotencyKey: initialKey,
			entityKind: "payment",
			action: "create_payment",
			payload: initialSignature,
			handler: async () => ({
				responseStatus: 201,
				responseJson: { success: true, amountKopecks: 500000 },
			}),
		});

		// 2. Submit second request with SAME UUID but DIFFERENT amount (10 000 ₽ instead of 5 000 ₽)
		const alteredPayload = {
			patientId: PATIENT_ID,
			totalKopecks: 1000000,
		};
		const alteredSignature = buildPaymentTransactionPayloadSignature(alteredPayload);

		await assert.rejects(
			async () => {
				await IdempotentTransactionService.executeIdempotentTransaction({
					organizationId: ORG_ID,
					idempotencyKey: mutationUuid, // same UUID
					entityKind: "payment",
					action: "create_payment",
					payload: alteredSignature, // different payload
					handler: async () => ({
						responseStatus: 201,
						responseJson: { success: true, amountKopecks: 1000000 },
					}),
				});
			},
			(err: Error) => {
				assert.ok(err instanceof IdempotencyPayloadMismatchError);
				assert.equal((err as IdempotencyPayloadMismatchError).statusCode, 409);
				assert.match(err.message, /Ключ идемпотентности.*уже использован с другим набором параметров/i);
				return true;
			},
		);
	});

	it("1.3 Network timeout & connection drop simulation returns cached receipt without double-punching", async () => {
		const timeoutMutationId = fixtureUuid(NAMESPACE, 103);
		const receiptPayload = createFiscalReceiptPayloadSchema.parse({
			patientId: PATIENT_ID,
			operationType: "income",
			customerContact: "+79031112233",
			cashierFullName: "Кассир-администратор",
			totalKopecks: 320000,
			electronicCardKopecks: 320000,
			items: [
				{
					name: "Ультразвуковое снятие зубных отложений",
					medicalServiceCode804n: "A16.07.020",
					measure: "piece",
					taxDeductionCode: "code_1_standard",
					priceKopecks: 320000,
					quantity: 1,
					amountKopecks: 320000,
					subject: "service",
					method: "full_payment",
					vatRate: "vat_none",
				},
			],
		});

		const signature = buildFiscalPrintPayloadSignature({
			patientId: PATIENT_ID,
			cashierFullName: receiptPayload.cashierFullName,
			customerContact: receiptPayload.customerContact,
			operationType: "income",
			totalKopecks: 320000,
			electronicCardKopecks: 320000,
			items: receiptPayload.items,
		});

		const compositeKey = generateFinancialCompositeIdempotencyKey(timeoutMutationId, signature);

		// Step 1: Initial call completes on server (even if client dropped connection right after)
		const firstAttempt = await withFixtureTenant(ORG_ID, async () => {
			return IdempotentTransactionService.executeIdempotentTransaction({
				organizationId: ORG_ID,
				idempotencyKey: compositeKey,
				entityKind: "payment",
				action: "print_receipt",
				payload: signature,
				handler: async () => {
					const spoolerResult = await OfflineFiscalSpooler.enqueueFiscalReceipt({
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						receiptType: "income",
						payload: receiptPayload,
						clientMutationId: timeoutMutationId,
					});

					return {
						responseStatus: 200,
						responseJson: {
							success: true,
							queueId: spoolerResult.queueId,
							status: spoolerResult.status,
							fiscalDetails: spoolerResult.fiscalDetails,
						},
						entityId: spoolerResult.queueId,
					};
				},
			});
		});

		assert.equal(firstAttempt.isReplay, false);
		assert.equal(firstAttempt.success, true);

		// Step 2: Client retries 5 seconds later due to network timeout
		const retryAttempt = await withFixtureTenant(ORG_ID, async () => {
			return IdempotentTransactionService.executeIdempotentTransaction({
				organizationId: ORG_ID,
				idempotencyKey: compositeKey,
				entityKind: "payment",
				action: "print_receipt",
				payload: signature,
				handler: async () => {
					throw new Error("Handler should not be called on replay!");
				},
			});
		});

		assert.equal(retryAttempt.isReplay, true);
		assert.equal(retryAttempt.success, true);
		assert.equal(retryAttempt.responseJson.queueId, firstAttempt.responseJson.queueId);
	});

	it("1.4 SBP Dynamic QR and Sberbank Acquiring transaction signatures are deterministic and idempotency-safe", async () => {
		// SBP QR signature
		const sbpSig1 = buildSbpQrPayloadSignature({
			patientId: PATIENT_ID,
			amountKopecks: 450000,
			orderId: "ORDER-SBP-98712",
			sbpMemberBankId: "100000000111",
		});
		const sbpSig2 = buildSbpQrPayloadSignature({
			patientId: PATIENT_ID,
			amountKopecks: 450000,
			orderId: "ORDER-SBP-98712",
			sbpMemberBankId: "100000000111",
		});
		assert.equal(computePayloadHash(sbpSig1), computePayloadHash(sbpSig2));

		// Sberbank Acquiring signature
		const sberSig1 = buildSberAcquiringPayloadSignature({
			terminalId: "SBER-POS-01",
			patientId: PATIENT_ID,
			amountKopecks: 1200000,
			rrn: "123456789012",
			authCode: "A78B99",
		});
		const sberSig2 = buildSberAcquiringPayloadSignature({
			terminalId: "SBER-POS-01",
			patientId: PATIENT_ID,
			amountKopecks: 1200000,
			rrn: "123456789012",
			authCode: "A78B99",
		});
		assert.equal(computePayloadHash(sberSig1), computePayloadHash(sberSig2));
	});

	// =========================================================================
	// 2. OFFLINE FISCAL SPOOLER (БУФЕР ОТЛОЖЕННОЙ ФИСКАЛИЗАЦИИ)
	// =========================================================================

	it("2.1 Offline Fiscal Spooler buffers receipts non-blockingly when KKT is offline or out of paper", async () => {
		process.env.KKM_FORCE_OFFLINE = "1";
		process.env.KKM_OUT_OF_PAPER = "1";

		const receiptPayload = createFiscalReceiptPayloadSchema.parse({
			patientId: PATIENT_ID,
			operationType: "income",
			customerContact: "+79031112233",
			cashierFullName: "Кассир Иванова",
			totalKopecks: 180000,
			cashKopecks: 180000,
			items: [
				{
					name: "Прицельная внутриротовая контактная рентгенография",
					medicalServiceCode804n: "A06.07.001",
					measure: "piece",
					taxDeductionCode: "code_1_standard",
					priceKopecks: 180000,
					quantity: 1,
					amountKopecks: 180000,
					subject: "service",
					method: "full_payment",
					vatRate: "vat_none",
				},
			],
		});

		const enqueueResult = await withFixtureTenant(ORG_ID, async () => {
			return OfflineFiscalSpooler.enqueueFiscalReceipt({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				receiptType: "income",
				payload: receiptPayload,
			});
		});

		assert.equal(enqueueResult.success, true);
		assert.equal(enqueueResult.status, "hardware_offline");
		assert.equal(enqueueResult.isOfflineBuffered, true);
		assert.ok(enqueueResult.hardwareWarning);
		assert.ok(enqueueResult.queueId);

		// Check queue stats
		const stats = await withFixtureTenant(ORG_ID, async () => {
			return OfflineFiscalSpooler.getQueueStatistics(ORG_ID);
		});
		assert.ok(stats.totalHardwareOffline >= 1);
	});

	it("2.2 FIFO Chronological Flush flushes queued receipts when KKT returns online", async () => {
		// Restore KKT hardware
		delete process.env.KKM_FORCE_OFFLINE;
		delete process.env.KKM_OUT_OF_PAPER;

		const flushResult = await withFixtureTenant(ORG_ID, async () => {
			return OfflineFiscalSpooler.flushOrganizationQueue(ORG_ID);
		});

		assert.equal(flushResult.isDeviceOnline, true);
		assert.equal(flushResult.isPaperPresent, true);
		assert.ok(flushResult.printedCount >= 1);
		assert.equal(flushResult.failedCount, 0);

		// Verify that the queue item is now printed
		const statsAfter = await withFixtureTenant(ORG_ID, async () => {
			return OfflineFiscalSpooler.getQueueStatistics(ORG_ID);
		});
		assert.equal(statsAfter.totalHardwareOffline, 0);
		assert.ok(statsAfter.totalPrinted >= 1);
	});

	it("2.3 Single item retry explicitly transitions offline receipt to printed", async () => {
		// Force offline to create 1 offline item
		process.env.KKM_FORCE_OFFLINE = "1";

		const offlinePayload = createFiscalReceiptPayloadSchema.parse({
			patientId: PATIENT_ID,
			operationType: "income",
			customerContact: "+79031112233",
			cashierFullName: "Кассир",
			totalKopecks: 95000,
			cashKopecks: 95000,
			items: [
				{
					name: "Анестезия инфильтрационная",
					medicalServiceCode804n: "A11.07.012",
					measure: "piece",
					taxDeductionCode: "code_1_standard",
					priceKopecks: 95000,
					quantity: 1,
					amountKopecks: 95000,
					subject: "service",
					method: "full_payment",
					vatRate: "vat_none",
				},
			],
		});

		const enq = await withFixtureTenant(ORG_ID, async () => {
			return OfflineFiscalSpooler.enqueueFiscalReceipt({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				receiptType: "income",
				payload: offlinePayload,
			});
		});

		assert.equal(enq.status, "hardware_offline");

		// Restore hardware and retry item directly
		delete process.env.KKM_FORCE_OFFLINE;

		const retryRes = await withFixtureTenant(ORG_ID, async () => {
			return OfflineFiscalSpooler.retryQueuedReceipt(ORG_ID, enq.queueId);
		});
		assert.equal(retryRes.success, true);
		assert.equal(retryRes.status, "printed");
		assert.ok(retryRes.item?.printedAt);
	});

	// =========================================================================
	// 3. DISTRIBUTED OPTIMISTIC LOCKING ON 043/У CLINICAL RECORDS
	// =========================================================================

	it("3.1 Collaborative Doctor & Assistant edit conflict detection prevents Lost Updates", async () => {
		// 1. Assistant reads diary at version 1 and saves update
		const assistantSave = await withFixtureTenant(ORG_ID, async () => {
			return ClinicalRecordLockService.saveDiaryOptimistic({
				organizationId: ORG_ID,
				diaryId: DIARY_ID,
				userId: ASSISTANT_USER_ID,
				userRole: "assistant",
				expectedVersion: 1,
				fields: {
					anamnesis: "Пациент жалуется на ноющие боли в зубе 2.6. Аллергоанамнез не отягощен.",
					instrumentTrayBarcode: "TRAY-STERIL-0091",
				},
			});
		});

		assert.equal(assistantSave.success, true);
		assert.equal(assistantSave.previousVersion, 1);
		assert.equal(assistantSave.newVersion, 2);
		assert.equal(assistantSave.diary.version, 2);

		// 2. Doctor (who opened the tab simultaneously at version 1) attempts to save with stale expectedVersion: 1
		await assert.rejects(
			async () => {
				await withFixtureTenant(ORG_ID, async () => {
					return ClinicalRecordLockService.saveDiaryOptimistic({
						organizationId: ORG_ID,
						diaryId: DIARY_ID,
						userId: DOCTOR_USER_ID,
						userRole: "doctor",
						expectedVersion: 1, // Stale version!
						fields: {
							treatmentDescription: "Эндодонтическая обработка каналов 2.6 файлами ProTaper.",
						},
					});
				});
			},
			(err: Error) => {
				assert.ok(err instanceof ClinicalConcurrencyConflictError);
				const conflict = err as ClinicalConcurrencyConflictError;
				assert.equal(conflict.statusCode, 409);
				assert.equal(conflict.clientVersion, 1);
				assert.equal(conflict.serverVersion, 2);
				assert.ok(conflict.conflictingFields.length >= 1);
				assert.match(conflict.message, /Конфликт версий карты 043\/у/i);
				return true;
			},
		);

		// 3. Doctor resolves conflict by fetching v2 and saving with expectedVersion: 2
		const doctorSave = await withFixtureTenant(ORG_ID, async () => {
			return ClinicalRecordLockService.saveDiaryOptimistic({
				organizationId: ORG_ID,
				diaryId: DIARY_ID,
				userId: DOCTOR_USER_ID,
				userRole: "doctor",
				expectedVersion: 2, // Up to date!
				fields: {
					treatmentDescription: "Эндодонтическая обработка каналов 2.6 файлами ProTaper.",
				},
			});
		});

		assert.equal(doctorSave.success, true);
		assert.equal(doctorSave.previousVersion, 2);
		assert.equal(doctorSave.newVersion, 3);
		assert.equal(doctorSave.diary.version, 3);
	});

	it("3.2 Active editing lease / terminal session lock prevents uncoordinated overwrite", async () => {
		// Doctor acquires lease
		const docLease = ClinicalRecordLockService.acquireEditLock({
			organizationId: ORG_ID,
			diaryId: DIARY_ID,
			userId: DOCTOR_USER_ID,
			userRole: "doctor",
			userName: "Доктор Иванов И. И.",
			ttlSeconds: 30,
		});

		assert.equal(docLease.success, true);
		assert.equal(docLease.isAlreadyLockedByOther, false);
		assert.ok(docLease.lease.lockToken);

		// Assistant tries to acquire lock on same diary -> blocked
		const assistantLease = ClinicalRecordLockService.acquireEditLock({
			organizationId: ORG_ID,
			diaryId: DIARY_ID,
			userId: ASSISTANT_USER_ID,
			userRole: "assistant",
			userName: "Ассистент Петрова А. С.",
		});

		assert.equal(assistantLease.success, false);
		assert.equal(assistantLease.isAlreadyLockedByOther, true);
		assert.equal(assistantLease.currentHolder?.userId, DOCTOR_USER_ID);

		// Doctor renews heartbeat
		const renewed = ClinicalRecordLockService.renewHeartbeat({
			organizationId: ORG_ID,
			diaryId: DIARY_ID,
			lockToken: docLease.lease.lockToken,
			ttlSeconds: 60,
		});
		assert.equal(renewed, true);

		// Doctor releases lease
		const released = ClinicalRecordLockService.releaseEditLock({
			organizationId: ORG_ID,
			diaryId: DIARY_ID,
			lockToken: docLease.lease.lockToken,
		});
		assert.equal(released, true);

		// Now assistant can acquire lease
		const assistantLeaseAfter = ClinicalRecordLockService.acquireEditLock({
			organizationId: ORG_ID,
			diaryId: DIARY_ID,
			userId: ASSISTANT_USER_ID,
			userRole: "assistant",
		});
		assert.equal(assistantLeaseAfter.success, true);
		assert.equal(assistantLeaseAfter.isAlreadyLockedByOther, false);
	});
});
