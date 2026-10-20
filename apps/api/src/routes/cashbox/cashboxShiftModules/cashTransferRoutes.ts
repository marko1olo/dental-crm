/**
 * cashTransferRoutes.ts — Cash Introduction & Cash Withdrawal Endpoints.
 *
 * Implements:
 * - POST /api/cash/cash-introduction & POST /api/fiscal/cash-in
 * - POST /api/cash/cash-withdrawal & POST /api/fiscal/cash-out
 *
 * Strict compliance with:
 * - Order 804n / 54-FZ cash transfer accounting
 * - Mandate 8i: Integer kopeck exact arithmetic (calculateBalanceAdd / calculateBalanceSubtract)
 * - Safe pessimistic locking for cash drawer concurrency
 */

import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	cashBoxes,
	cashBoxShifts,
	cashOperations,
} from "../../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../../db/seeds/seed_cash_and_reasons.js";
import {
	calculateBalanceAdd,
	calculateBalanceSubtract,
} from "../cashboxHelpers.js";
import {
	cashIntroductionBodySchema,
	cashWithdrawalBodySchema,
} from "../cashboxSchemas.js";
import type {
	CashIntroductionResponseBody,
	CashWithdrawalResponseBody,
} from "../types.js";

export function registerCashTransferRoutes(app: FastifyInstance): void {
	/**
	 * 1. POST /api/cash/cash-introduction & POST /api/fiscal/cash-in
	 * Служебное внесение наличных/разменной монеты в кассу.
	 */
	const handleCashIntroduction = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"cash introduction",
		);
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const parsed = cashIntroductionBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректная сумма внесения (должна быть больше нуля с точностью до копейки).",
				details: parsed.error.issues,
			});
		}

		const { cashBoxId, amountRub, reasonText, operatorId } = parsed.data;

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
			const balanceAfter = calculateBalanceAdd(balanceBefore, amountRub);

			// Находим активную смену
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

			// Обновляем статистику смены
			if (activeShift) {
				const updatedIncome = calculateBalanceAdd(activeShift.incomeTotalRub, amountRub);
				await tx
					.update(cashBoxShifts)
					.set({
						incomeTotalRub: updatedIncome,
						updatedAt: new Date(),
					})
					.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, orgId)));
			}

			// Регистрируем кассовую проводку
			const [operation] = await tx
				.insert(cashOperations)
				.values({
					organizationId: orgId,
					cashBoxId: targetBox.id,
					shiftId: activeShift?.id ?? null,
					operationType: "introduction",
					amountRub,
					balanceBeforeRub: balanceBefore,
					balanceAfterRub: balanceAfter,
					reasonText,
					operatorId: operatorId ?? null,
				})
				.returning();

			return { kind: "ok" as const, operation: operation!, cashBox: updatedBox! };
		});

		if (result.kind === "box_not_found") {
			return reply.code(404).send({
				error: "CashBoxNotFound",
				message: "Кассовый счет для внесения не найден.",
			});
		}

		const response: CashIntroductionResponseBody = {
			success: true,
			message: `Служебное внесение ${amountRub.toFixed(2)} ₽ успешно проведено.`,
			operation: result.operation,
			cashBox: result.cashBox,
		};

		return reply.send(response);
	};

	app.post("/api/cash/cash-introduction", handleCashIntroduction);
	app.post("/api/fiscal/cash-in", handleCashIntroduction);
	app.post("/api/finance/cash-in", handleCashIntroduction);
	app.post("/api/cashbox/operations/in", handleCashIntroduction);
	app.post("/api/billing/cash/in", handleCashIntroduction);

	/**
	 * 2. POST /api/cash/cash-withdrawal & POST /api/fiscal/cash-out
	 * Служебное изъятие / инкассация наличных из кассы.
	 */
	const handleCashWithdrawal = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"cash withdrawal",
		);
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const parsed = cashWithdrawalBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректная сумма изъятия (должна быть больше нуля с точностью до копейки).",
				details: parsed.error.issues,
			});
		}

		const { cashBoxId, amountRub, reasonText, operatorId } = parsed.data;

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

			const [updatedBox] = await tx
				.update(cashBoxes)
				.set({
					balanceRub: balanceAfter,
					updatedAt: new Date(),
				})
				.where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, orgId)))
				.returning();

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
					reasonText,
					operatorId: operatorId ?? null,
				})
				.returning();

			return { kind: "ok" as const, operation: operation!, cashBox: updatedBox! };
		});

		if (result.kind === "box_not_found") {
			return reply.code(404).send({
				error: "CashBoxNotFound",
				message: "Кассовый счет не найден.",
			});
		}

		if (result.kind === "insufficient_funds") {
			return reply.code(400).send({
				error: "InsufficientFunds",
				message: `Недостаточно средств в кассе для изъятия. Доступно: ${result.balanceBefore.toFixed(2)} ₽, запрошено: ${result.requestedAmount.toFixed(2)} ₽.`,
			});
		}

		const response: CashWithdrawalResponseBody = {
			success: true,
			message: `Инкассация ${amountRub.toFixed(2)} ₽ успешно завершена.`,
			operation: result.operation,
			cashBox: result.cashBox,
		};

		return reply.send(response);
	};

	app.post("/api/cash/cash-withdrawal", handleCashWithdrawal);
	app.post("/api/fiscal/cash-out", handleCashWithdrawal);
	app.post("/api/finance/cash-out", handleCashWithdrawal);
	app.post("/api/cashbox/operations/out", handleCashWithdrawal);
	app.post("/api/billing/cash/out", handleCashWithdrawal);
}
