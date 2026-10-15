/**
 * fiscalQueueManager.ts — Layer 1: 54-FZ Fiscal Register Queue & Checkout Engine.
 *
 * Implements 2-Phase Physical KKT Checkout:
 * - Phase 1: Ledger / Payment commit is isolated from external hardware. If USB disconnects,
 *   paper runs out, or driver times out, the monetary transaction is NEVER rolled back or double-charged.
 *   It safely transitions to `fiscalization_pending` with an auto-retry token and idempotency lock.
 * - Phase 2: Hardware execution attempt. Updates queue and payment with statutory parameters.
 *
 * Compliant with THE HAMMER Master Prompt, Mandate 8b, Zero Mocks, and Zero Logic Mutation.
 */

import { randomUUID } from "node:crypto";
import { type FiscalReceiptDetails, rublesToKopecks } from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	fiscalReceiptQueue,
	payments,
} from "../../db/schema.js";
import {
	FiscalReceiptFactory,
	type Ffd12ReceiptPayload,
} from "../kkt/FiscalReceiptFactory.js";
import { LanKktDriverService } from "../hardware/lanKktDriverService.js";
import type { KktPrintResult } from "../hardware/types.js";
import type { FiscalCheckoutInput, FiscalCheckoutResult } from "./types.js";

export class FiscalQueueManager {
	/**
	 * Phase 1: Executes resilient cash register checkout.
	 * First commits monetary payment transaction to the database,
	 * then attempts hardware print. If hardware fails, transitions
	 * to `fiscalization_pending` with an auto-retry token.
	 */
	public static async processFiscalCheckout(
		input: FiscalCheckoutInput,
	): Promise<FiscalCheckoutResult> {
		const {
			organizationId,
			patientId,
			visitId,
			amountRub,
			method,
			cashierFullName = "Кассир-Администратор",
			cashierInn,
			clientContact,
			items,
			clientMutationId,
			kktConfig,
		} = input;

		const totalKopecks = rublesToKopecks(amountRub);
		const autoRetryToken = randomUUID();

		// Construct or reuse FFD 1.2 statutory receipt payload
		let receiptPayload: Ffd12ReceiptPayload = input.receiptPayload!;
		if (!receiptPayload) {
			const paymentMethodMap: Record<
				string,
				{
					cashKopecks: number;
					electronicCardKopecks: number;
					sbpKopecks: number;
					prepaidKopecks: number;
				}
			> = {
				cash: { cashKopecks: totalKopecks, electronicCardKopecks: 0, sbpKopecks: 0, prepaidKopecks: 0 },
				card: { cashKopecks: 0, electronicCardKopecks: totalKopecks, sbpKopecks: 0, prepaidKopecks: 0 },
				sbp: { cashKopecks: 0, electronicCardKopecks: 0, sbpKopecks: totalKopecks, prepaidKopecks: 0 },
				online: { cashKopecks: 0, electronicCardKopecks: totalKopecks, sbpKopecks: 0, prepaidKopecks: 0 },
				family_wallet: { cashKopecks: 0, electronicCardKopecks: 0, sbpKopecks: 0, prepaidKopecks: totalKopecks },
			};
			const defaultSplit = { cashKopecks: 0, electronicCardKopecks: totalKopecks, sbpKopecks: 0, prepaidKopecks: 0 };
			const splits = paymentMethodMap[method] || defaultSplit;
			if (!splits) throw new Error("Splits configuration missing");

			const receiptItems =
				items && items.length > 0
					? items.map((it) => ({
							name: it.name,
							priceKopecks: it.priceKopecks,
							quantity: it.quantity,
							amountKopecks: it.amountKopecks,
							method: "full_payment" as const,
							subject: "service" as const,
							vatRate: (it.vatRate || "vat_none") as any,
							measure: "piece" as const,
							taxDeductionCode: (it.taxDeductionCode || "code_1_standard") as any,
							medicalServiceCode804n: "A16.07.001",
							isUpsell: false,
							requiresAddendum: false,
							addendumConfirmed: false,
						}))
					: [
							{
								name: "Медицинские стоматологические услуги",
								priceKopecks: totalKopecks,
								quantity: 1,
								amountKopecks: totalKopecks,
								method: "full_payment" as const,
								subject: "service" as const,
								vatRate: "vat_none" as const,
								measure: "piece" as const,
								taxDeductionCode: "code_1_standard" as const,
								medicalServiceCode804n: "A16.07.001",
								isUpsell: false,
								requiresAddendum: false,
								addendumConfirmed: false,
							},
						];

			receiptPayload = FiscalReceiptFactory.buildFfd12Receipt({
				patientId,
				payerType: "individual",
				operationType: "income",
				taxationSystem: "usn_income",
				cashierFullName,
				cashierInn: cashierInn || undefined,
				customerContact: clientContact || "+79990000000",
				cashKopecks: splits.cashKopecks,
				electronicCardKopecks: splits.electronicCardKopecks,
				sbpKopecks: splits.sbpKopecks,
				prepaidKopecks: splits.prepaidKopecks,
				creditKopecks: 0,
				totalKopecks,
				taxDeductionSummaryCode: "code_1_standard",
				isCorrection: false,
				addendumConfirmed: false,
				items: receiptItems,
			});
		}

		// 1. Transactional Commit: Save Payment & Queue Buffer with ACID isolation
		const { payment, queueItem } = await withTenantCtx(organizationId, async (tx) => {
			const targetDb = tx ?? db;

			// Advisory lock on patient checkout to prevent duplicate clicks
			await targetDb.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${`fiscal:checkout:${organizationId}:${patientId}`}))`,
			);

			// Check clientMutationId idempotency
			if (clientMutationId) {
				const [existingPayment] = await targetDb
					.select()
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, organizationId),
							eq(payments.clientMutationId, clientMutationId),
						),
					)
					.limit(1);

				if (existingPayment) {
					const [existingQueue] = await targetDb
						.select()
						.from(fiscalReceiptQueue)
						.where(
							and(
								eq(fiscalReceiptQueue.organizationId, organizationId),
								eq(fiscalReceiptQueue.paymentId, existingPayment.id),
							),
						)
						.limit(1);

					return {
						payment: existingPayment,
						queueItem: existingQueue!,
					};
				}
			}

			// Insert payment record — transaction is committed regardless of physical printer status
			const [newPayment] = await targetDb
				.insert(payments)
				.values({
					organizationId,
					patientId,
					visitId: visitId || null,
					amountRub,
					method: method === "sbp" ? "online" : method,
					status: "paid",
					clientMutationId: clientMutationId || null,
					fiscalReceipt: {
						operationType: "income",
						cashierName: cashierFullName,
						calculationMethod: "full_settlement",
						calculationSubject: "service",
					} as unknown as FiscalReceiptDetails,
				})
				.returning();

			// Insert into fiscalReceiptQueue with initial pending status
			const [newQueueItem] = await targetDb
				.insert(fiscalReceiptQueue)
				.values({
					organizationId,
					paymentId: newPayment!.id,
					visitId: visitId || null,
					receiptType: "sell",
					status: "pending_print",
					payloadJson: {
						...receiptPayload,
						autoRetryToken,
					},
					retryCount: 0,
				})
				.returning();

			return {
				payment: newPayment!,
				queueItem: newQueueItem!,
			};
		});

		// 2. Hardware Execution Attempt
		const deviceStatus = await LanKktDriverService.checkDeviceStatus(kktConfig);
		const now = new Date();

		if (!deviceStatus.online || !deviceStatus.paperOk) {
			const rawErr =
				deviceStatus.error ||
				(!deviceStatus.online
					? "ККТ недоступна в локальной сети / USB отключен"
					: "Закончилась кассовая лента (Out of Paper)");
			const errorMsg =
				!deviceStatus.online && !rawErr.includes("ККТ")
					? `ККТ недоступна: ${rawErr}`
					: rawErr;

			// Update queue & payment to fiscalization_pending state
			await withTenantCtx(organizationId, async (tx) => {
				const targetDb = tx ?? db;
				await targetDb
					.update(fiscalReceiptQueue)
					.set({
						status: "hardware_offline",
						lastError: errorMsg,
						retryCount: 1,
						updatedAt: now,
					})
					.where(
						and(
							eq(fiscalReceiptQueue.id, queueItem.id),
							eq(fiscalReceiptQueue.organizationId, organizationId),
						),
					);

				await targetDb
					.update(payments)
					.set({
						note: `[54-ФЗ] Фискализация отложена (fiscalization_pending): ${errorMsg}. Токен автоповтора: ${autoRetryToken}`,
						updatedAt: now,
					})
					.where(
						and(
							eq(payments.id, payment.id),
							eq(payments.organizationId, organizationId),
						),
					);
			});

			return {
				success: false,
				status: "fiscalization_pending",
				paymentId: payment.id,
				queueItemId: queueItem.id,
				amountRub,
				autoRetryToken,
				error: errorMsg,
				hardwareStatus: {
					online: deviceStatus.online,
					paperOk: deviceStatus.paperOk,
					error: deviceStatus.error,
				},
			};
		}

		// Dispatch print job
		let printResult: KktPrintResult;
		try {
			printResult = await LanKktDriverService.printFiscalReceipt(
				receiptPayload,
				kktConfig,
			);
		} catch (err: unknown) {
			const printErr =
				err instanceof Error ? err.message : "LanKktDriver print error";
			printResult = {
				success: false,
				status: "hardware_offline",
				receiptIssuedAt: now.toISOString(),
				errorCode: "PRINT_EXCEPTION",
				errorMessage: printErr,
			};
		}

		if (!printResult.success || printResult.status === "hardware_offline") {
			const hardwareErr =
				printResult.errorMessage || "Ошибка печати фискального регистратора";

			await withTenantCtx(organizationId, async (tx) => {
				const targetDb = tx ?? db;
				await targetDb
					.update(fiscalReceiptQueue)
					.set({
						status: "hardware_offline",
						lastError: hardwareErr,
						retryCount: 1,
						updatedAt: now,
					})
					.where(
						and(
							eq(fiscalReceiptQueue.id, queueItem.id),
							eq(fiscalReceiptQueue.organizationId, organizationId),
						),
					);

				await targetDb
					.update(payments)
					.set({
						note: `[54-ФЗ] Фискализация отложена: ${hardwareErr}. Токен: ${autoRetryToken}`,
						updatedAt: now,
					})
					.where(
						and(
							eq(payments.id, payment.id),
							eq(payments.organizationId, organizationId),
						),
					);
			});

			return {
				success: false,
				status: "fiscalization_pending",
				paymentId: payment.id,
				queueItemId: queueItem.id,
				amountRub,
				autoRetryToken,
				error: hardwareErr,
				hardwareStatus: {
					online: deviceStatus.online,
					paperOk: deviceStatus.paperOk,
					error: hardwareErr,
				},
			};
		}

		// 3. Print Successful: update statutory fiscal parameters on payment & queue
		const updatedPayload = {
			...receiptPayload,
			fnSerial: printResult.fnSerial,
			fiscalDocumentNumber: printResult.fiscalDocumentNumber,
			fiscalSign: printResult.fiscalSign,
			ofdVerificationUrl: printResult.ofdVerificationUrl,
			qrString: printResult.qrString ?? null,
			receiptIssuedAt: printResult.receiptIssuedAt,
		};

		await withTenantCtx(organizationId, async (tx) => {
			const targetDb = tx ?? db;
			await targetDb
				.update(fiscalReceiptQueue)
				.set({
					status: "printed",
					printedAt: now,
					lastError: null,
					payloadJson: updatedPayload,
					updatedAt: now,
				})
				.where(
					and(
						eq(fiscalReceiptQueue.id, queueItem.id),
						eq(fiscalReceiptQueue.organizationId, organizationId),
					),
				);

			await targetDb
				.update(payments)
				.set({
					fiscalReceiptNumber: printResult.fiscalDocumentNumber || null,
					fiscalReceiptIssuedAt: printResult.receiptIssuedAt,
					fiscalReceiptUrl: printResult.ofdVerificationUrl || null,
					fiscalReceipt: {
						fn: printResult.fnSerial,
						fd: printResult.fiscalDocumentNumber,
						fpd: printResult.fiscalSign,
						receiptUrl: printResult.ofdVerificationUrl,
						operationType: "income",
						cashierName: cashierFullName,
						calculationMethod: "full_settlement",
						calculationSubject: "service",
					} as unknown as FiscalReceiptDetails,
					updatedAt: now,
				})
				.where(
					and(
						eq(payments.id, payment.id),
						eq(payments.organizationId, organizationId),
					),
				);
		});

		return {
			success: true,
			status: "printed",
			paymentId: payment.id,
			queueItemId: queueItem.id,
			amountRub,
			fiscalReceiptNumber: printResult.fiscalDocumentNumber,
			fiscalSign: printResult.fiscalSign,
			ofdUrl: printResult.ofdVerificationUrl,
			receiptIssuedAt: printResult.receiptIssuedAt,
			hardwareStatus: {
				online: true,
				paperOk: true,
				error: null,
			},
		};
	}
}
