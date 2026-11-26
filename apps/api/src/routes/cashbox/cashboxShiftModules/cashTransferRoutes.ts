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

import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { kopecksToNumericString, kopecksToRub, rublesToKopecks } from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	cashBoxes,
	cashBoxShifts,
	cashOperations,
} from "../../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../../db/seeds/seed_cash_and_reasons.js";
import { isValidUuid } from "../../../plugins/idempotencyModules/idempotencyHeaderParser.js";
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

		const rawKey = request.headers["idempotency-key"] ?? request.headers["x-idempotency-key"];
		const idempotencyKey = typeof rawKey === "string" ? rawKey.trim() : Array.isArray(rawKey) ? rawKey[0]?.trim() : undefined;
		if (!idempotencyKey) {
			return reply.code(400).send({
				error: "IdempotencyKeyRequired",
				message: "Для проведения операции внесения обязателен заголовок Idempotency-Key (UUIDv7).",
			});
		}
		if (!isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
			});
		}

		reply.header("Idempotency-Key", idempotencyKey);
		reply.header("X-Idempotency-Key", idempotencyKey);

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
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':cash_transfer:' || ${idempotencyKey}))`,
			);

			await ensureOrganizationCashBoxes(tx, orgId);

			const [existingOp] = await tx
				.select()
				.from(cashOperations)
				.where(
					and(
						eq(cashOperations.organizationId, orgId),
						sql`${cashOperations.metadata}->>'idempotencyKey' = ${idempotencyKey}`,
					),
				)
				.limit(1);

			if (existingOp) {
				const [currentBox] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.id, existingOp.cashBoxId), eq(cashBoxes.organizationId, orgId)))
					.limit(1);

				return { kind: "ok" as const, operation: existingOp, cashBox: currentBox, isReplay: true };
			}

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

			const amountKopecks = rublesToKopecks(amountRub);
			const beforeKop =
				targetBox.balanceKopecks !== undefined &&
				targetBox.balanceKopecks !== null &&
				(targetBox.balanceKopecks !== 0 || Number(targetBox.balanceRub || 0) === 0)
					? Number(targetBox.balanceKopecks)
					: rublesToKopecks(targetBox.balanceRub);
			const afterKop = beforeKop + amountKopecks;
			const balanceBefore = kopecksToRub(beforeKop);
			const balanceAfter = kopecksToRub(afterKop);

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
					balanceKopecks: afterKop,
					updatedAt: new Date(),
				})
				.where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, orgId)))
				.returning();

			// Обновляем статистику смены (рубли и копейки)
			if (activeShift) {
				const prevIncomeKop =
					activeShift.incomeTotalKopecks > 0 || Number(activeShift.incomeTotalRub || 0) === 0
						? activeShift.incomeTotalKopecks
						: rublesToKopecks(activeShift.incomeTotalRub);
				const nextIncomeKop = prevIncomeKop + amountKopecks;
				await tx
					.update(cashBoxShifts)
					.set({
						incomeTotalRub: kopecksToRub(nextIncomeKop),
						incomeTotalKopecks: nextIncomeKop,
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
					amountKopecks,
					balanceBeforeRub: balanceBefore,
					balanceBeforeKopecks: BigInt(beforeKop),
					balanceAfterRub: balanceAfter,
					balanceAfterKopecks: BigInt(afterKop),
					reasonText,
					operatorId: operatorId ?? null,
					metadata: idempotencyKey ? { idempotencyKey } : null,
				})
				.returning();

			if (!operation || !updatedBox) {
				throw new Error("Не удалось зафиксировать операцию служебного внесения в кассу");
			}

			return { kind: "ok" as const, operation, cashBox: updatedBox, isReplay: false };
		});

		if (result.kind === "box_not_found" || !result.cashBox) {
			return reply.code(404).send({
				error: "CashBoxNotFound",
				message: "Кассовый счет для внесения не найден.",
			});
		}

		if (idempotencyKey) {
			reply.header("X-Idempotency-Key", idempotencyKey);
		}
		if (result.isReplay) {
			reply.header("idempotency-replayed", "true");
			reply.header("x-idempotency-replayed", "true");
		}

		const response: CashIntroductionResponseBody = {
			success: true,
			message: `Служебное внесение ${kopecksToNumericString(rublesToKopecks(amountRub))} ₽ успешно проведено.`,
			operation: result.operation,
			cashBox: result.cashBox,
		};

		return reply.send(response);
	};

	const cashTransferRouteOptions = {
		schema: {
			description:
				"Cash transfer with mandatory RFC 9562 Idempotency-Key and organizationId isolation",
			headers: {
				type: "object",
				properties: {
					"idempotency-key": { type: "string" },
					"x-idempotency-key": { type: "string" },
					organizationid: { type: "string" },
					"x-organization-id": { type: "string" },
				},
			},
		},
	};

	app.post("/api/cash/cash-introduction", cashTransferRouteOptions, handleCashIntroduction);
	app.post("/api/fiscal/cash-in", cashTransferRouteOptions, handleCashIntroduction);
	app.post("/api/finance/cash-in", cashTransferRouteOptions, handleCashIntroduction);
	app.post("/api/cashbox/operations/in", cashTransferRouteOptions, handleCashIntroduction);
	app.post("/api/billing/cash/in", cashTransferRouteOptions, handleCashIntroduction);

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

		const rawKey = request.headers["idempotency-key"] ?? request.headers["x-idempotency-key"];
		const idempotencyKey = typeof rawKey === "string" ? rawKey.trim() : Array.isArray(rawKey) ? rawKey[0]?.trim() : undefined;
		if (!idempotencyKey) {
			return reply.code(400).send({
				error: "IdempotencyKeyRequired",
				message: "Для проведения операции изъятия обязателен заголовок Idempotency-Key (UUIDv7).",
			});
		}
		if (!isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
			});
		}

		reply.header("Idempotency-Key", idempotencyKey);
		reply.header("X-Idempotency-Key", idempotencyKey);

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
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':cash_transfer:' || ${idempotencyKey}))`,
			);

			await ensureOrganizationCashBoxes(tx, orgId);

			const [existingOp] = await tx
				.select()
				.from(cashOperations)
				.where(
					and(
						eq(cashOperations.organizationId, orgId),
						sql`${cashOperations.metadata}->>'idempotencyKey' = ${idempotencyKey}`,
					),
				)
				.limit(1);

			if (existingOp) {
				const [currentBox] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.id, existingOp.cashBoxId), eq(cashBoxes.organizationId, orgId)))
					.limit(1);

				return { kind: "ok" as const, operation: existingOp, cashBox: currentBox, isReplay: true };
			}

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

			const amountKopecks = rublesToKopecks(amountRub);
			const beforeKop =
				targetBox.balanceKopecks !== undefined &&
				targetBox.balanceKopecks !== null &&
				(targetBox.balanceKopecks !== 0 || Number(targetBox.balanceRub || 0) === 0)
					? Number(targetBox.balanceKopecks)
					: rublesToKopecks(targetBox.balanceRub);
			const balanceBefore = kopecksToRub(beforeKop);
			if (beforeKop < amountKopecks) {
				return {
					kind: "insufficient_funds" as const,
					balanceBefore,
					requestedAmount: amountRub,
				};
			}

			const afterKop = Math.max(0, beforeKop - amountKopecks);
			const balanceAfter = kopecksToRub(afterKop);

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
					balanceKopecks: afterKop,
					updatedAt: new Date(),
				})
				.where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, orgId)))
				.returning();

			if (activeShift) {
				const prevExpenseKop =
					activeShift.expenseTotalKopecks > 0 || Number(activeShift.expenseTotalRub || 0) === 0
						? activeShift.expenseTotalKopecks
						: rublesToKopecks(activeShift.expenseTotalRub);
				const nextExpenseKop = prevExpenseKop + amountKopecks;
				await tx
					.update(cashBoxShifts)
					.set({
						expenseTotalRub: kopecksToRub(nextExpenseKop),
						expenseTotalKopecks: nextExpenseKop,
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
					amountKopecks,
					balanceBeforeRub: balanceBefore,
					balanceBeforeKopecks: BigInt(beforeKop),
					balanceAfterRub: balanceAfter,
					balanceAfterKopecks: BigInt(afterKop),
					reasonText,
					operatorId: operatorId ?? null,
					metadata: idempotencyKey ? { idempotencyKey } : null,
				})
				.returning();

			if (!operation || !updatedBox) {
				throw new Error("Не удалось зафиксировать операцию служебного изъятия из кассы");
			}

			return { kind: "ok" as const, operation, cashBox: updatedBox, isReplay: false };
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
				message: `Недостаточно средств в кассе для изъятия. Доступно: ${kopecksToNumericString(rublesToKopecks(result.balanceBefore))} ₽, запрошено: ${kopecksToNumericString(rublesToKopecks(result.requestedAmount))} ₽.`,
			});
		}

		if (!result.cashBox) {
			return reply.code(404).send({
				error: "CashBoxNotFound",
				message: "Кассовый счет не найден.",
			});
		}

		if (idempotencyKey) {
			reply.header("X-Idempotency-Key", idempotencyKey);
		}
		if (result.isReplay) {
			reply.header("idempotency-replayed", "true");
			reply.header("x-idempotency-replayed", "true");
		}

		const response: CashWithdrawalResponseBody = {
			success: true,
			message: `Инкассация ${kopecksToNumericString(rublesToKopecks(amountRub))} ₽ успешно завершена.`,
			operation: result.operation,
			cashBox: result.cashBox,
		};

		return reply.send(response);
	};

	app.post("/api/cash/cash-withdrawal", cashTransferRouteOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleCashWithdrawal(request, reply);
	});
	app.post("/api/fiscal/cash-out", cashTransferRouteOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleCashWithdrawal(request, reply);
	});
	app.post("/api/finance/cash-out", cashTransferRouteOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleCashWithdrawal(request, reply);
	});
	app.post("/api/cashbox/operations/out", cashTransferRouteOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleCashWithdrawal(request, reply);
	});
	app.post("/api/billing/cash/out", cashTransferRouteOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleCashWithdrawal(request, reply);
	});
}
