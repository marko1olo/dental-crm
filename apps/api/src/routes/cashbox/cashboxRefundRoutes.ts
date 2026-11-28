/**
 * cashboxRefundRoutes.ts — Layer 2 Facade: Cashbox Refund & Fiscal Return Rails.
 *
 * Delegates transactional lookup, over-refund guards, ledger accounting & 54-FZ queueing
 * to modular engines inside ./refundModules/. Preserves 100% export contracts.
 */

import { kopecksToNumericString, rublesToKopecks } from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { isValidUuid } from "../../utils/httpIdempotency.js";
import { cashRefundBodySchema } from "./cashboxSchemas.js";
import { executeCashRefundTransaction } from "./refundModules/index.js";

/**
 * 1. POST /api/cash/refund & POST /api/cashbox/refund
 * Возврат денежных средств из кассы клиники (54-ФЗ возврат прихода / выдача наличных / возврат на депозит).
 */
export async function handleCashRefund(request: FastifyRequest, reply: FastifyReply): Promise<void> {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"cash refund payout",
	);
	if (reply.sent) return reply;
	if (!orgId) return reply;

	const parsed = cashRefundBodySchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректная сумма или параметры возврата.",
			details: parsed.error.issues,
		});
	}

	const {
		cashBoxId,
		amountRub,
		method,
		reasonText,
		operatorId,
		invoiceId,
		paymentId,
		patientId,
		refundedItemIds,
		cashierFullName,
	} = parsed.data;
	const refundKop = rublesToKopecks(amountRub);

	const rawIdempHeader =
		request.headers["idempotency-key"] ??
		request.headers["x-idempotency-key"];
	const effectiveMutationId =
		typeof rawIdempHeader === "string" && rawIdempHeader.trim()
			? rawIdempHeader.trim()
			: typeof parsed.data.clientMutationId === "string" && parsed.data.clientMutationId.trim()
				? parsed.data.clientMutationId.trim()
				: typeof parsed.data.idempotencyKey === "string" && parsed.data.idempotencyKey.trim()
					? parsed.data.idempotencyKey.trim()
					: undefined;

	if (!effectiveMutationId) {
		return reply.code(400).send({
			error: "IdempotencyKeyRequired",
			message:
				"Для проведения возврата обязателен заголовок Idempotency-Key или поле clientMutationId.",
		});
	}

	if (!isValidUuid(effectiveMutationId)) {
		return reply.code(400).send({
			error: "ValidationError",
			message:
				"Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
		});
	}

	reply.header("Idempotency-Key", effectiveMutationId);
	reply.header("X-Idempotency-Key", effectiveMutationId);

	const result = await executeCashRefundTransaction(orgId, {
		cashBoxId,
		refundKop,
		amountRub,
		method,
		reasonText,
		operatorId,
		invoiceId,
		paymentId,
		patientId,
		refundedItemIds,
		cashierFullName,
		effectiveMutationId,
	});

	if (result.kind === "replay") {
		reply.header("idempotency-replayed", "true");
		reply.header("x-idempotency-replayed", "true");
		return reply.send({
			success: true,
			isReplay: true,
			message: "Операция возврата уже была выполнена ранее (повторный запрос).",
			operation: result.operation,
			cashBox: result.cashBox,
			invoiceId,
			paymentId,
			refundPaymentId: result.refundPaymentId,
			fiscalReceiptQueueId: result.queuedReceiptId,
			fiscalReceiptNumber: result.fiscalReceiptNumber,
		});
	}

	if (result.kind === "payment_not_found") {
		return reply.code(404).send({
			error: "PaymentNotFound",
			message: `Исходный платёж (${result.paymentId}) не найден.`,
		});
	}

	if (result.kind === "invoice_not_found") {
		return reply.code(404).send({
			error: "InvoiceNotFound",
			message: `Счёт для возврата (${result.invoiceId}) не найден.`,
		});
	}

	if (result.kind === "over_refund_forbidden") {
		return reply.code(400).send({
			error: "OverRefundForbidden",
			message: `Сумма возврата превышает фактически оплаченный остаток. Доступно к возврату: ${result.availableRub} ₽, запрошено: ${result.requestedRub} ₽.`,
			availableRub: result.availableRub,
			requestedRub: result.requestedRub,
		});
	}

	if (result.kind === "box_not_found") {
		return reply.code(404).send({
			error: "CashBoxNotFound",
			message: "Кассовый счет для возврата не найден.",
		});
	}

	if (result.kind === "insufficient_funds") {
		const availRub = kopecksToNumericString(result.balanceBeforeKop);
		const reqRub = kopecksToNumericString(result.requestedKop);
		return reply.code(400).send({
			error: "InsufficientFunds",
			message: `Недостаточно средств в кассе для возврата. Доступно: ${availRub} ₽, запрошено: ${reqRub} ₽.`,
		});
	}

	return reply.send({
		success: true,
		message: `Возврат ${kopecksToNumericString(refundKop)} ₽ успешно оформлен в кассе.`,
		operation: result.operation,
		cashBox: result.cashBox,
		invoiceId,
		paymentId,
		refundPaymentId: result.refundPaymentId,
		fiscalReceiptQueueId: result.queuedReceiptId,
		fiscalReceiptNumber: result.fiscalReceiptNumber,
	});
}

export async function registerCashboxRefundRoutes(app: FastifyInstance): Promise<void> {
	const cashRefundRouteSchema = {
		description:
			"Cashbox refund with mandatory RFC 9562 Idempotency-Key and organizationId isolation",
		headers: {
			type: "object",
			properties: {
				"idempotency-key": { type: "string" },
				"x-idempotency-key": { type: "string" },
			},
		},
	};

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/cash/refund",
		permission: "public",
		schema: cashRefundRouteSchema,
		handler: async ({ request, reply }) => handleCashRefund(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/cashbox/refund",
		permission: "public",
		schema: cashRefundRouteSchema,
		handler: async ({ request, reply }) => handleCashRefund(request, reply),
	});
}
