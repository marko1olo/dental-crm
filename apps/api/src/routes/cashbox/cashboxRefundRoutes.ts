/**
 * cashboxRefundRoutes.ts — Layer 2: Cashbox Refund & Fiscal Correction Operations.
 * 
 * 54-FZ Return of Income (Возврат прихода), Cash Payout, and Receipt Correction Rails.
 */

import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	cashBoxes,
	cashBoxShifts,
	cashOperations,
} from "../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../db/seeds/seed_cash_and_reasons.js";
import {
	calculateBalanceAdd,
	calculateBalanceSubtract,
} from "./cashboxHelpers.js";
import { cashRefundBodySchema } from "./cashboxSchemas.js";

export async function registerCashboxRefundRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * 1. POST /api/cash/refund & POST /api/cashbox/refund
	 * Возврат денежных средств из кассы клиники (54-ФЗ возврат прихода / выдача наличных).
	 */
	const handleCashRefund = async (request: FastifyRequest, reply: FastifyReply) => {
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
				message: "Некорректная сумма возврата (должна быть больше нуля с точностью до копейки).",
				details: parsed.error.issues,
			});
		}

		const { cashBoxId, amountRub, reasonText, operatorId, invoiceId, paymentId } = parsed.data;

		const result = await withTenantCtx(orgId, async (tx) => {
			await ensureOrganizationCashBoxes(tx, orgId);

			let targetBox: typeof cashBoxes.$inferSelect | undefined;
			if (cashBoxId) {
				const [box] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.id, cashBoxId), eq(cashBoxes.organizationId, orgId)))
					.for("update")
					.limit(1);
				targetBox = box;
			} else {
				const [box] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.organizationId, orgId), eq(cashBoxes.type, "main")))
					.for("update")
					.limit(1);
				targetBox = box;
			}

			if (!targetBox) {
				return { kind: "box_not_found" as const };
			}

			const balanceBefore = targetBox.balanceRub;
			if (balanceBefore < amountRub) {
				return {
					kind: "insufficient_funds" as const,
					balanceBefore,
					requestedAmount: amountRub,
				};
			}

			const balanceAfter = calculateBalanceSubtract(balanceBefore, amountRub);

			// Находим активную кассовую смену
			const [activeShift] = await tx
				.select()
				.from(cashBoxShifts)
				.where(
					and(
						eq(cashBoxShifts.organizationId, orgId),
						eq(cashBoxShifts.cashBoxId, targetBox.id),
						eq(cashBoxShifts.status, "open"),
					),
				)
				.for("update")
				.limit(1);

			// Обновляем баланс кассы
			const [updatedBox] = await tx
				.update(cashBoxes)
				.set({
					balanceRub: balanceAfter,
					updatedAt: new Date(),
				})
				.where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, orgId)))
				.returning();

			// Обновляем расход активной смены
			if (activeShift) {
				const updatedExpense = calculateBalanceAdd(activeShift.expenseTotalRub, amountRub);
				await tx
					.update(cashBoxShifts)
					.set({
						expenseTotalRub: updatedExpense,
						updatedAt: new Date(),
					})
					.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, orgId)));
			}

			// Регистрируем кассовую проводку возврата
			const [operation] = await tx
				.insert(cashOperations)
				.values({
					organizationId: orgId,
					cashBoxId: targetBox.id,
					shiftId: activeShift?.id ?? null,
					operationType: "withdrawal",
					amountRub,
					balanceBeforeRub: balanceBefore,
					balanceAfterRub: balanceAfter,
					reasonText: reasonText || "Возврат денежных средств покупателю (54-ФЗ)",
					operatorId: operatorId ?? null,
				})
				.returning();

			return { kind: "ok" as const, operation: operation!, cashBox: updatedBox! };
		});

		if (result.kind === "box_not_found") {
			return reply.code(404).send({
				error: "CashBoxNotFound",
				message: "Кассовый счет для возврата не найден.",
			});
		}

		if (result.kind === "insufficient_funds") {
			return reply.code(400).send({
				error: "InsufficientFunds",
				message: `Недостаточно средств в кассе для возврата. Доступно: ${result.balanceBefore.toFixed(2)} ₽, запрошено: ${result.requestedAmount.toFixed(2)} ₽.`,
			});
		}

		return reply.send({
			success: true,
			message: `Возврат ${amountRub.toFixed(2)} ₽ успешно оформлен в кассе.`,
			operation: result.operation,
			cashBox: result.cashBox,
			invoiceId,
			paymentId,
		});
	};

	app.post("/api/cash/refund", handleCashRefund);
	app.post("/api/cashbox/refund", handleCashRefund);
}
