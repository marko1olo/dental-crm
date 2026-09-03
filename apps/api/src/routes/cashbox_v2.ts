/**
 * cashbox_v2.ts — High-Precision 6-Account Cash Box, Installments, 12 Expense Reasons & Dental Lab Payments API.
 * 
 * Compliant with 54-FZ, StomX Reverse Engineering Bible (Sections 6, 8, 9), Order 804n, and Form T-51.
 */

import {
	kopecksToRubles,
	nonNegativeMoneyRubSchema,
	positiveMoneyRubSchema,
	rublesToKopecks,
} from "@dental/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { withTenantCtx } from "../db/rls.js";
import {
	cashBoxes,
	cashBoxShifts,
	cashExpenseReasons,
	cashOperations,
} from "../db/schema.js";
import { registerCashInstallmentsRoutes } from "./cashInstallmentsRoutes.js";
import { registerCashLabPaymentRoutes } from "./cashLabPaymentRoutes.js";
import {
	ensureOrganizationCashBoxes,
	ensureOrganizationExpenseReasons,
} from "../db/seeds/seed_cash_and_reasons.js";
import { getRequestIdentity } from "../security/identity.js";

export async function registerCashboxV2Routes(app: FastifyInstance) {
	/**
	 * 1. GET /api/cash/cash-box
	 * Список 6 кассовых счетов клиники с балансами.
	 */
	app.get("/api/cash/cash-box", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "cash boxes read");
		if (!orgId) return;

		const result = await withTenantCtx(orgId, async (tx) => {
			// Гарантируем, что 6 кассовых счетов инициализированы
			await ensureOrganizationCashBoxes(tx, orgId);

			const boxes = await tx
				.select()
				.from(cashBoxes)
				.where(eq(cashBoxes.organizationId, orgId))
				.orderBy(cashBoxes.displayOrder);

			return boxes;
		});

		return reply.send({ data: result, total: result.length });
	});

	/**
	 * 2. POST /api/cash/cash-box-all-open
	 * Групповое утреннее открытие смен по всем кассовым счетам клиники.
	 */
	app.post("/api/cash/cash-box-all-open", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"cash boxes open shift",
		);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const currentUserId = identity.userId;

		const bodySchema = z.object({
			openedByUserId: z.string().uuid().optional(),
		});
		const parsed = bodySchema.safeParse(request.body || {});
		const effectiveUserId = parsed.success && parsed.data.openedByUserId ? parsed.data.openedByUserId : currentUserId;

		if (!effectiveUserId) {
			return reply.code(400).send({
				error: "UserRequired",
				message: "Для открытия кассовой смены требуется идентификатор сотрудника (кассира/администратора).",
			});
		}

		const openedShifts = await withTenantCtx(orgId, async (tx) => {
			await ensureOrganizationCashBoxes(tx, orgId);

			const boxes = await tx
				.select()
				.from(cashBoxes)
				.where(eq(cashBoxes.organizationId, orgId));

			const shifts: (typeof cashBoxShifts.$inferSelect)[] = [];
			const now = new Date();

			for (const box of boxes) {
				// Проверяем, нет ли уже открытой смены
				const [existingOpenShift] = await tx
					.select()
					.from(cashBoxShifts)
					.where(
						and(
							eq(cashBoxShifts.organizationId, orgId),
							eq(cashBoxShifts.cashBoxId, box.id),
							eq(cashBoxShifts.status, "open"),
						),
					)
					.limit(1);

				if (!existingOpenShift) {
					// Вычисляем следующий номер смены
					const [lastShift] = await tx
						.select({ shiftNumber: cashBoxShifts.shiftNumber })
						.from(cashBoxShifts)
						.where(
							and(
								eq(cashBoxShifts.organizationId, orgId),
								eq(cashBoxShifts.cashBoxId, box.id),
							),
						)
						.orderBy(desc(cashBoxShifts.shiftNumber))
						.limit(1);

					const nextShiftNumber = (lastShift?.shiftNumber ?? 0) + 1;

					const [newShift] = await tx
						.insert(cashBoxShifts)
						.values({
							organizationId: orgId,
							cashBoxId: box.id,
							shiftNumber: nextShiftNumber,
							status: "open",
							openedAt: now,
							openedByUserId: effectiveUserId,
							startBalanceRub: box.balanceRub,
							incomeTotalRub: 0,
							expenseTotalRub: 0,
						})
						.returning();

					if (newShift) {
						shifts.push(newShift);
					}
				} else {
					shifts.push(existingOpenShift);
				}
			}

			return shifts;
		});

		return reply.send({
			success: true,
			message: `Кассовые смены успешно открыты (${openedShifts.length} счетов).`,
			openedShiftsCount: openedShifts.length,
			shifts: openedShifts,
		});
	});

	/**
	 * 3. POST /api/cash/cash-box-all-closing
	 * Закрытие всех смен со снятием Z-отчета (54-ФЗ).
	 */
	app.post("/api/cash/cash-box-all-closing", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"cash boxes close shift",
		);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const currentUserId = identity.userId;

		const bodySchema = z.object({
			closedByUserId: z.string().uuid().optional(),
			zReportNumber: z.string().trim().optional(),
		});
		const parsed = bodySchema.safeParse(request.body || {});
		const effectiveUserId = parsed.success && parsed.data.closedByUserId ? parsed.data.closedByUserId : currentUserId;

		const closedShifts = await withTenantCtx(orgId, async (tx) => {
			const openShifts = await tx
				.select()
				.from(cashBoxShifts)
				.where(
					and(
						eq(cashBoxShifts.organizationId, orgId),
						eq(cashBoxShifts.status, "open"),
					),
				);

			const closed: (typeof cashBoxShifts.$inferSelect)[] = [];
			const now = new Date();

			for (const shift of openShifts) {
				const [box] = await tx
					.select()
					.from(cashBoxes)
					.where(eq(cashBoxes.id, shift.cashBoxId))
					.limit(1);

				const finalBalance = box?.balanceRub ?? 0;
				const zNumber = parsed.success && parsed.data.zReportNumber
					? `${parsed.data.zReportNumber}-${shift.shiftNumber}`
					: `Z-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${shift.shiftNumber}`;

				const [updatedShift] = await tx
					.update(cashBoxShifts)
					.set({
						status: "closed",
						closedAt: now,
						closedByUserId: effectiveUserId ?? null,
						closingBalanceRub: finalBalance,
						zReportNumber: zNumber,
						zReportData: {
							closedAtIso: now.toISOString(),
							startingBalanceRub: shift.startBalanceRub,
							finalBalanceRub: finalBalance,
							incomeTotalRub: shift.incomeTotalRub,
							expenseTotalRub: shift.expenseTotalRub,
						},
						updatedAt: now,
					})
					.where(eq(cashBoxShifts.id, shift.id))
					.returning();

				if (updatedShift) {
					closed.push(updatedShift);
				}
			}

			return closed;
		});

		return reply.send({
			success: true,
			message: `Все открытые кассовые смены успешно закрыты со снятием Z-отчетов (${closedShifts.length}).`,
			closedShiftsCount: closedShifts.length,
			shifts: closedShifts,
		});
	});

	/**
	 * 4. POST /api/cash/cash-introduction
	 * Служебное внесение наличных/разменной монеты в кассу.
	 */
	app.post("/api/cash/cash-introduction", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"cash introduction",
		);
		if (!orgId) return;

		const bodySchema = z.object({
			cashBoxId: z.string().uuid().optional(),
			amountRub: positiveMoneyRubSchema,
			reasonText: z.string().trim().max(500).optional().default("Служебное внесение разменного фонда"),
			operatorId: z.string().uuid().optional(),
		});

		const parsed = bodySchema.safeParse(request.body);
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
					.limit(1);
				targetBox = box;
			} else {
				const [box] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.organizationId, orgId), eq(cashBoxes.type, "main")))
					.limit(1);
				targetBox = box;
			}

			if (!targetBox) {
				return { kind: "box_not_found" as const };
			}

			const balanceBefore = targetBox.balanceRub;
			const balanceAfter = kopecksToRubles(rublesToKopecks(balanceBefore) + rublesToKopecks(amountRub));

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
				.limit(1);

			// Обновляем баланс кассы
			const [updatedBox] = await tx
				.update(cashBoxes)
				.set({
					balanceRub: balanceAfter,
					updatedAt: new Date(),
				})
				.where(eq(cashBoxes.id, targetBox.id))
				.returning();

			// Обновляем статистику смены
			if (activeShift) {
				const updatedIncome = Math.round((activeShift.incomeTotalRub + amountRub) * 100) / 100;
				await tx
					.update(cashBoxShifts)
					.set({
						incomeTotalRub: updatedIncome,
						updatedAt: new Date(),
					})
					.where(eq(cashBoxShifts.id, activeShift.id));
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

		return reply.send({
			success: true,
			message: `Служебное внесение ${amountRub.toFixed(2)} ₽ успешно проведено.`,
			operation: result.operation,
			cashBox: result.cashBox,
		});
	});

	/**
	 * 5. POST /api/cash/cash-withdrawal
	 * Служебное изъятие / инкассация наличных из кассы.
	 */
	app.post("/api/cash/cash-withdrawal", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"cash withdrawal",
		);
		if (!orgId) return;

		const bodySchema = z.object({
			cashBoxId: z.string().uuid().optional(),
			amountRub: positiveMoneyRubSchema,
			reasonText: z.string().trim().max(500).optional().default("Инкассация наличных средств в банк"),
			operatorId: z.string().uuid().optional(),
		});

		const parsed = bodySchema.safeParse(request.body);
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
					.limit(1);
				targetBox = box;
			} else {
				const [box] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.organizationId, orgId), eq(cashBoxes.type, "main")))
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

			const balanceAfter = kopecksToRubles(rublesToKopecks(balanceBefore) - rublesToKopecks(amountRub));

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
				.limit(1);

			const [updatedBox] = await tx
				.update(cashBoxes)
				.set({
					balanceRub: balanceAfter,
					updatedAt: new Date(),
				})
				.where(eq(cashBoxes.id, targetBox.id))
				.returning();

			if (activeShift) {
				const updatedExpense = Math.round((activeShift.expenseTotalRub + amountRub) * 100) / 100;
				await tx
					.update(cashBoxShifts)
					.set({
						expenseTotalRub: updatedExpense,
						updatedAt: new Date(),
					})
					.where(eq(cashBoxShifts.id, activeShift.id));
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

		return reply.send({
			success: true,
			message: `Инкассация ${amountRub.toFixed(2)} ₽ успешно завершена.`,
			operation: result.operation,
			cashBox: result.cashBox,
		});
	});

	/**
	 * 6. GET /api/cash/expense-reasons & GET /api/cash/expense-reason
	 * 12 регламентированных статей расхода клиники.
	 */
	const handleGetExpenseReasons = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "expense reasons read");
		if (!orgId) return;

		const reasons = await withTenantCtx(orgId, async (tx) => {
			await ensureOrganizationExpenseReasons(tx, orgId);

			return await tx
				.select()
				.from(cashExpenseReasons)
				.where(eq(cashExpenseReasons.organizationId, orgId))
				.orderBy(cashExpenseReasons.code);
		});

		return reply.send({ data: reasons, total: reasons.length });
	};

	app.get("/api/cash/expense-reasons", handleGetExpenseReasons);
	app.get("/api/cash/expense-reason", handleGetExpenseReasons);

	// 7-8. Регистрация модульных маршрутов ЗТЛ: оплата наряда и фиксация installed (Feature #36)
	await registerCashLabPaymentRoutes(app);

	// 9-12. Регистрация модульных маршрутов рассрочки и траншей (Feature #37)
	await registerCashInstallmentsRoutes(app);


	/**
	 * 13. GET /api/cash/operation-list
	 * Журнал кассовых ордеров и проводок (StomX Bible раздел 6).
	 */
	app.get("/api/cash/operation-list", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "cash operations read");
		if (!orgId) return;

		const querySchema = z.object({
			cashBoxId: z.string().uuid().optional(),
			operationType: z.string().optional(),
			dateFrom: z.string().optional(),
			dateTo: z.string().optional(),
		});

		const parsed = querySchema.safeParse(request.query || {});
		const filters = parsed.success ? parsed.data : {};

		const ops = await withTenantCtx(orgId, async (tx) => {
			const conditions = [eq(cashOperations.organizationId, orgId)];

			if (filters.cashBoxId) {
				conditions.push(eq(cashOperations.cashBoxId, filters.cashBoxId));
			}
			if (filters.operationType) {
				conditions.push(eq(cashOperations.operationType, filters.operationType));
			}
			if (filters.dateFrom) {
				conditions.push(sql`${cashOperations.createdAt} >= ${filters.dateFrom}`);
			}
			if (filters.dateTo) {
				conditions.push(sql`${cashOperations.createdAt} <= ${filters.dateTo}`);
			}

			return await tx
				.select()
				.from(cashOperations)
				.where(and(...conditions))
				.orderBy(desc(cashOperations.createdAt))
				.limit(100);
		});

		return reply.send({ data: ops, total: ops.length });
	});
}
