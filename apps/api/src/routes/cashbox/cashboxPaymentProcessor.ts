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
import { withTenantCtx } from "../../db/rls.js";
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
		// Стадия 1: Advisory Lock и проверка идемпотентного повтора
		const lockRes = await acquireLockAndResolvePatient(tx, ctx);
		if ("outcome" in lockRes) {
			logger?.info(
				{ orgId, effectiveMutationId: ctx.effectiveMutationId },
				"Idempotent payment replay detected",
			);
			return lockRes.outcome;
		}
		if ("failure" in lockRes) {
			return stageFailureToOutcome(lockRes.failure);
		}

		// Стадия 2: Гарантийное закрытие (100% скидка врача без чека 54-ФЗ)
		const warrantyRes = await processWarrantyStage(tx, ctx);
		if ("outcome" in warrantyRes) {
			logger?.info(
				{ orgId, invoiceId: ctx.body.invoiceId },
				"Warranty payment settled (100% doctor discount)",
			);
			return warrantyRes.outcome;
		}
		if ("failure" in warrantyRes) {
			return stageFailureToOutcome(warrantyRes.failure);
		}

		// Стадия 3: Авансы, депозиты и семейный кошелек
		const depRes = await processDepositAndFamilyStage(tx, ctx);
		if ("failure" in depRes) {
			return stageFailureToOutcome(depRes.failure);
		}

		// Стадия 4: Бонусы программы лояльности (FIFO)
		const bonusRes = await validateAndLockLoyaltyBonuses(tx, ctx);
		if ("failure" in bonusRes) {
			return stageFailureToOutcome(bonusRes.failure);
		}

		// Стадия 5: Подарочные сертификаты (Luhn-16)
		const certRes = await validateAndLockGiftCertificate(tx, ctx);
		if ("failure" in certRes) {
			return stageFailureToOutcome(certRes.failure);
		}

		// Стадия 6: Гарантийные письма ДМС (с Soft Overdraft для острой боли)
		const dmsRes = await validateAndLockDmsCoverage(tx, ctx);
		if ("failure" in dmsRes) {
			return stageFailureToOutcome(dmsRes.failure);
		}

		// Стадия 7: Разделение сплит-тендеров и создание проводок payments
		const splitRes = await processSplitAllocationStage(tx, ctx);
		if ("failure" in splitRes) {
			return stageFailureToOutcome(splitRes.failure);
		}

		// Стадия 8: Сеттлмент инвойса/визита, сдача-на-депозит и тихое списание BOM
		const settleRes = await processSettlementAndBomStage(tx, ctx);
		if ("failure" in settleRes) {
			return stageFailureToOutcome(settleRes.failure);
		}

		// Стадия 9: Кассовый леджер, проверка смены 24ч и балансы касс
		const ledgerRes = await processCashboxLedgerStage(tx, ctx);
		if ("failure" in ledgerRes) {
			return stageFailureToOutcome(ledgerRes.failure);
		}

		// Стадия 10: Формирование чека 54-ФЗ и spool в fiscalReceiptQueue
		const finalOutcome = await processFiscalQueueStage(tx, ctx);
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

	return outcome;
}
