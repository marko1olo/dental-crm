/**
 * apps/api/src/routes/cashbox/cashboxPaymentProcessor.ts
 *
 * Declarative Orchestrator for 54-FZ Cashbox Payment Transactions.
 *
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (100% warranty discounts, no hard blocks).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No forced citizen INN).
 * - Integer Kopeck Math: Strict integer kopecks (amountKopecks: bigint).
 * - Idempotency & Financial Resilience: clientMutationId & idempotencyKey.
 * - Standard /decomposer: Pipeline pattern with stage failure isolation.
 */

import type { FastifyBaseLogger } from "fastify";
import { withSavepoint, withTenantCtx } from "../../db/rls.js";
import {
	acquireLockAndResolvePatient,
	processCashboxLedgerStage,
	processDepositAndFamilyStage,
	processFiscalQueueStage,
	processSettlementAndBomStage,
	processSplitAllocationStage,
	processWarrantyStage,
	stageFailureToOutcome,
	validateAndLockDmsCoverage,
	validateAndLockGiftCertificate,
	validateAndLockLoyaltyBonuses,
	validatePaymentInput,
	type CashboxPaymentOutcome,
} from "./paymentStages/index.js";

export type { CashboxPaymentOutcome } from "./paymentStages/index.js";

class CashboxStageRollbackError extends Error {
	constructor(public readonly outcome: CashboxPaymentOutcome) {
		super("Cashbox stage rollback");
	}
}

/**
 * processCashboxPayment — Главный оркестратор транзакции кассового платежа.
 * Декомпозирован на 10 изолированных стадий по стандарту /decomposer.
 */
export async function processCashboxPayment(
	orgId: string,
	rawBody: unknown,
	headerIdemp?: string,
	logger?: FastifyBaseLogger,
): Promise<CashboxPaymentOutcome> {
	// 1. Валидация входных данных, парсинг тендеров и сумм
	const validation = validatePaymentInput(orgId, rawBody, headerIdemp, logger);
	if ("outcome" in validation) {
		return validation.outcome;
	}

	const ctx = validation.context;
	logger?.info(
		{
			orgId,
			effectiveMutationId: ctx.effectiveMutationId,
			amountKopecks: Number(ctx.totalKopecks),
			method: ctx.body.method,
		},
		"Starting cashbox payment transaction pipeline",
	);

	// 2. Исполнение транзакции в контексте тенанта (ACID)
	const outcome = await withTenantCtx(orgId, async (tx) => {
		try {
			return await withSavepoint(tx, async (spTx) => {
				// Стадия 1: Advisory Lock и проверка идемпотентного повтора
				const lockRes = await acquireLockAndResolvePatient(spTx, ctx);
				if ("outcome" in lockRes) {
					logger?.info(
						{ orgId, effectiveMutationId: ctx.effectiveMutationId },
						"Idempotent payment replay detected",
					);
					return lockRes.outcome;
				}
				if ("failure" in lockRes) {
					throw new CashboxStageRollbackError(stageFailureToOutcome(lockRes.failure));
				}

				// Стадия 2: Гарантийное закрытие (100% скидка врача без чека 54-ФЗ)
				const warrantyRes = await processWarrantyStage(spTx, ctx);
				if ("outcome" in warrantyRes) {
					logger?.info(
						{ orgId, invoiceId: ctx.body.invoiceId },
						"Warranty payment settled (100% doctor discount)",
					);
					return warrantyRes.outcome;
				}
				if ("failure" in warrantyRes) {
					throw new CashboxStageRollbackError(stageFailureToOutcome(warrantyRes.failure));
				}

				// Стадия 3: Авансы, депозиты и семейный кошелек
				const depRes = await processDepositAndFamilyStage(spTx, ctx);
				if ("failure" in depRes) {
					throw new CashboxStageRollbackError(stageFailureToOutcome(depRes.failure));
				}

				// Стадия 4: Бонусы программы лояльности (FIFO)
				const bonusRes = await validateAndLockLoyaltyBonuses(spTx, ctx);
				if ("failure" in bonusRes) {
					throw new CashboxStageRollbackError(stageFailureToOutcome(bonusRes.failure));
				}

				// Стадия 5: Подарочные сертификаты (Luhn-16)
				const certRes = await validateAndLockGiftCertificate(spTx, ctx);
				if ("failure" in certRes) {
					throw new CashboxStageRollbackError(stageFailureToOutcome(certRes.failure));
				}

				// Стадия 6: Гарантийные письма ДМС (с Soft Overdraft для острой боли)
				const dmsRes = await validateAndLockDmsCoverage(spTx, ctx);
				if ("failure" in dmsRes) {
					throw new CashboxStageRollbackError(stageFailureToOutcome(dmsRes.failure));
				}

				// Стадия 7: Разделение сплит-тендеров и создание проводок payments
				const splitRes = await processSplitAllocationStage(spTx, ctx);
				if ("failure" in splitRes) {
					throw new CashboxStageRollbackError(stageFailureToOutcome(splitRes.failure));
				}

				// Стадия 8: Сеттлмент инвойса/визита, сдача-на-депозит и тихое списание BOM
				const settleRes = await processSettlementAndBomStage(spTx, ctx);
				if ("failure" in settleRes) {
					throw new CashboxStageRollbackError(stageFailureToOutcome(settleRes.failure));
				}

				// Стадия 9: Кассовый леджер, проверка смены 24ч и балансы касс
				const ledgerRes = await processCashboxLedgerStage(spTx, ctx);
				if ("failure" in ledgerRes) {
					throw new CashboxStageRollbackError(stageFailureToOutcome(ledgerRes.failure));
				}

				// Стадия 10: Формирование чека 54-ФЗ и spool в fiscalReceiptQueue
				const finalOutcome = await processFiscalQueueStage(spTx, ctx);
				logger?.info(
					{
						orgId,
						paymentId: ctx.newPayment?.id,
						receiptQueueId: ctx.enqueuedReceiptId,
					},
					"Cashbox payment transaction completed successfully",
				);

				return finalOutcome;
			});
		} catch (err) {
			if (err instanceof CashboxStageRollbackError) {
				return err.outcome;
			}
			throw err;
		}
	});

	return outcome;
}
