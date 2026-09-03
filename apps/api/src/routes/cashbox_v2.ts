/**
 * cashbox_v2.ts — High-Precision 6-Account Cash Box, Installments, 12 Expense Reasons & Dental Lab Payments API.
 * 
 * Compliant with 54-FZ, StomX Reverse Engineering Bible (Sections 6, 8, 9), Order 804n, and Form T-51.
 */

import {
	generate0PercentInstallmentSchedule,
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
	installmentContracts,
	installmentTranches,
	labOrderEvents,
	labOrders,
	patients,
} from "../db/schema.js";
import {
	ensureOrganizationCashBoxes,
	ensureOrganizationExpenseReasons,
} from "../db/seeds/seed_cash_and_reasons.js";
import { getRequestIdentity } from "../security/identity.js";
import { wsBroker } from "../services/websocketBroker.js";

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
			const balanceAfter = Math.round((balanceBefore + amountRub) * 100) / 100;

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

			const balanceAfter = Math.round((balanceBefore - amountRub) * 100) / 100;

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

	/**
	 * 7. POST /api/lab-orders/:id/pay
	 * Оплата наряда ЗТЛ из кассы по системной статье 11 («Оплата услуг лаборатории»).
	 */
	app.post("/api/lab-orders/:id/pay", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"lab order pay from cashbox",
		);
		if (!orgId) return;

		const { id } = request.params;

		const bodySchema = z.object({
			cashBoxId: z.string().uuid().optional(),
			amountRub: positiveMoneyRubSchema.optional(),
			notes: z.string().trim().max(500).optional(),
		});

		const parsed = bodySchema.safeParse(request.body || {});
		const payData = parsed.success ? parsed.data : {};

		const result = await withTenantCtx(orgId, async (tx) => {
			const [order] = await tx
				.select()
				.from(labOrders)
				.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
				.limit(1);

			if (!order) {
				return { kind: "order_not_found" as const };
			}

			const amountToPay = payData.amountRub ?? order.priceRub ?? 0;
			if (amountToPay <= 0) {
				return { kind: "invalid_amount" as const };
			}

			// Ищем кассу для оплаты: либо переданную, либо "account" (безнал) / "main" / "expenses"
			await ensureOrganizationCashBoxes(tx, orgId);
			let targetBox: typeof cashBoxes.$inferSelect | undefined;
			if (payData.cashBoxId) {
				const [b] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.id, payData.cashBoxId), eq(cashBoxes.organizationId, orgId)))
					.limit(1);
				targetBox = b;
			} else {
				// Приоритет для оплаты ЗТЛ: расчетный счет -> расходы -> основная
				const [b] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.organizationId, orgId), eq(cashBoxes.type, "account")))
					.limit(1);
				targetBox = b;
			}

			if (!targetBox) {
				const [fallbackBox] = await tx
					.select()
					.from(cashBoxes)
					.where(eq(cashBoxes.organizationId, orgId))
					.limit(1);
				targetBox = fallbackBox;
			}

			if (!targetBox) {
				return { kind: "no_cash_box" as const };
			}

			// Статья 11 («Оплата услуг лаборатории»)
			await ensureOrganizationExpenseReasons(tx, orgId);
			const [reason11] = await tx
				.select()
				.from(cashExpenseReasons)
				.where(and(eq(cashExpenseReasons.organizationId, orgId), eq(cashExpenseReasons.code, 11)))
				.limit(1);

			const balanceBefore = targetBox.balanceRub;
			const balanceAfter = Math.round((balanceBefore - amountToPay) * 100) / 100;

			// Списываем средства
			await tx
				.update(cashBoxes)
				.set({
					balanceRub: balanceAfter,
					updatedAt: new Date(),
				})
				.where(eq(cashBoxes.id, targetBox.id));

			// Проводка расхода
			const [operation] = await tx
				.insert(cashOperations)
				.values({
					organizationId: orgId,
					cashBoxId: targetBox.id,
					operationType: "expense",
					amountRub: amountToPay,
					balanceBeforeRub: balanceBefore,
					balanceAfterRub: balanceAfter,
					reasonId: reason11?.id ?? null,
					reasonCode: 11,
					reasonText: `Оплата услуг зуботехнической лаборатории по заказу ЛО-${order.secureToken.slice(0, 8).toUpperCase()}${payData.notes ? ` (${payData.notes})` : ""}`,
					labOrderId: order.id,
					patientId: order.patientId,
				})
				.returning();

			// Обновляем наряд ЗТЛ
			const [updatedOrder] = await tx
				.update(labOrders)
				.set({
					paidFromCashOperationId: operation!.id,
					updatedAt: new Date(),
				})
				.where(eq(labOrders.id, order.id))
				.returning();

			return { kind: "ok" as const, operation: operation!, labOrder: updatedOrder! };
		});

		if (result.kind === "order_not_found") {
			return reply.code(404).send({
				error: "LabOrderNotFound",
				message: "Заказ-наряд ЗТЛ не найден.",
			});
		}
		if (result.kind === "invalid_amount") {
			return reply.code(400).send({
				error: "InvalidAmount",
				message: "Сумма оплаты заказ-наряда ЗТЛ должна быть больше нуля.",
			});
		}
		if (result.kind === "no_cash_box") {
			return reply.code(400).send({
				error: "NoCashBox",
				message: "Кассовые счета организации не найдены.",
			});
		}

		return reply.send({
			success: true,
			message: `Оплата наряда ЗТЛ на сумму ${result.operation.amountRub} ₽ успешно проведена по статье 11.`,
			cashOperation: result.operation,
			labOrder: result.labOrder,
		});
	});

	/**
	 * 8. POST /api/lab-orders/:id/mark-installed
	 * Сдача конструкции пациенту и НАМЕРТВО блокировка наряда (installed).
	 */
	app.post("/api/lab-orders/:id/mark-installed", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"lab order mark installed",
		);
		if (!orgId) return;

		const { id } = request.params;

		const bodySchema = z.object({
			clinicalNotes: z.string().trim().max(1000).optional(),
			doctorId: z.string().uuid().optional(),
		});
		const parsed = bodySchema.safeParse(request.body || {});
		const data = parsed.success ? parsed.data : {};

		const result = await withTenantCtx(orgId, async (tx) => {
			const [order] = await tx
				.select()
				.from(labOrders)
				.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
				.limit(1);

			if (!order) {
				return { kind: "order_not_found" as const };
			}

			if (order.isLockedInstalled) {
				return { kind: "already_locked" as const };
			}

			const now = new Date();
			const appendNote = `[${now.toLocaleDateString("ru-RU")} INSTALLED]: Конструкция припасована и зафиксирована в полости рта.${data.clinicalNotes ? ` ${data.clinicalNotes}` : ""}`;
			const finalNotes = order.clinicalNotes ? `${order.clinicalNotes}\n${appendNote}` : appendNote;

			const [updated] = await tx
				.update(labOrders)
				.set({
					status: "completed",
					isLockedInstalled: true,
					installedAt: now,
					completedAt: order.completedAt ?? now,
					clinicalNotes: finalNotes,
					updatedAt: now,
				})
				.where(eq(labOrders.id, order.id))
				.returning();

			// Событие аудита в жизненный цикл ЗТЛ
			await tx.insert(labOrderEvents).values({
				organizationId: orgId,
				labOrderId: order.id,
				milestone: "installed",
				actorType: "clinic_doctor",
				actorName: "Врач-ортопед",
				notes: "Ортопедическая конструкция успешно установлена и сдана пациенту. Наряд намертво заблокирован от редактирования.",
			});

			return { kind: "ok" as const, labOrder: updated! };
		});

		if (result.kind === "order_not_found") {
			return reply.code(404).send({
				error: "LabOrderNotFound",
				message: "Заказ-наряд ЗТЛ не найден.",
			});
		}

		if (result.kind === "already_locked") {
			return reply.code(409).send({
				error: "LabOrderLocked",
				message: "Заказ-наряд ЗТЛ уже зафиксирован в статусе installed и намертво заблокирован от любых изменений.",
			});
		}

		wsBroker.broadcastToOrganization(orgId, {
			type: "LAB_ORDER_UPDATED",
			payload: {
				orderId: result.labOrder.id,
				status: "completed",
				isLockedInstalled: true,
			},
		});

		return reply.send({
			success: true,
			message: "Заказ-наряд ЗТЛ успешно сдан пациенту и намертво заблокирован от изменений.",
			labOrder: result.labOrder,
		});
	});

	/**
	 * 9. POST /api/installments
	 * Создание договора внутренней рассрочки клиники (0% переплат) с расчетом траншей.
	 */
	app.post("/api/installments", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"create installment contract",
		);
		if (!orgId) return;

		const bodySchema = z.object({
			patientId: z.string().uuid(),
			treatmentPlanId: z.string().uuid().optional().nullable(),
			totalAmountRub: positiveMoneyRubSchema,
			downPaymentRub: nonNegativeMoneyRubSchema.default(0),
			monthsCount: z.union([z.literal(3), z.literal(6), z.literal(12), z.literal(24)]).default(6),
			notes: z.string().trim().max(1000).optional().nullable(),
			startDateIso: z.string().optional(),
		});

		const parsed = bodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры договора рассрочки.",
				details: parsed.error.issues,
			});
		}

		const { patientId, treatmentPlanId, totalAmountRub, downPaymentRub, monthsCount, notes, startDateIso } = parsed.data;

		if (downPaymentRub >= totalAmountRub) {
			return reply.code(400).send({
				error: "InvalidDownPayment",
				message: "Первоначальный взнос не может быть равен или превышать полную стоимость рассрочки.",
			});
		}

		const remainingRub = Math.round((totalAmountRub - downPaymentRub) * 100) / 100;
		const remainingKop = rublesToKopecks(remainingRub);

		// Расчет графика траншей без потери ни одной копейки
		const schedule = generate0PercentInstallmentSchedule(
			remainingKop,
			monthsCount,
			startDateIso ?? new Date().toISOString(),
		);

		const result = await withTenantCtx(orgId, async (tx) => {
			// Проверяем пациента
			const [patient] = await tx
				.select()
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.limit(1);

			if (!patient) {
				return { kind: "patient_not_found" as const };
			}

			const now = new Date();
			const contractNumber = `РАСС-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

			// Создаем договор
			const [contract] = await tx
				.insert(installmentContracts)
				.values({
					organizationId: orgId,
					patientId,
					treatmentPlanId: treatmentPlanId ?? null,
					contractNumber,
					totalAmountRub,
					downPaymentRub,
					monthsCount,
					paidAmountRub: 0,
					remainingAmountRub: totalAmountRub,
					status: "active",
					signedAt: now,
					notes: notes ?? null,
				})
				.returning();

			// Создаем записи траншей
			const tranchesToInsert = schedule.map((item) => ({
				contractId: contract!.id,
				organizationId: orgId,
				trancheNumber: item.monthIndex,
				amountRub: Math.round(item.amountKopecks) / 100,
				dueDate: new Date(item.paymentDateIso),
				isPaid: false,
				status: "pending",
			}));

			const createdTranches = await tx
				.insert(installmentTranches)
				.values(tranchesToInsert)
				.returning();

			return { kind: "ok" as const, contract: contract!, tranches: createdTranches };
		});

		if (result.kind === "patient_not_found") {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент для оформления рассрочки не найден.",
			});
		}

		return reply.code(201).send({
			success: true,
			message: `Договор рассрочки ${result.contract.contractNumber} на ${monthsCount} мес. успешно оформлен.`,
			contract: result.contract,
			tranches: result.tranches,
		});
	});

	/**
	 * 10. POST /api/installments/tranches/:id/pay & POST /api/installment-payments/:id/pay
	 * Проведение оплаты транша рассрочки через кассу.
	 */
	const handlePayTranche = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"pay installment tranche",
		);
		if (!orgId) return;

		const { id } = request.params;

		const bodySchema = z.object({
			cashBoxId: z.string().uuid().optional(),
			operatorId: z.string().uuid().optional(),
		});
		const parsed = bodySchema.safeParse(request.body || {});
		const payData = parsed.success ? parsed.data : {};

		const result = await withTenantCtx(orgId, async (tx) => {
			const [tranche] = await tx
				.select()
				.from(installmentTranches)
				.where(and(eq(installmentTranches.id, id), eq(installmentTranches.organizationId, orgId)))
				.limit(1);

			if (!tranche) {
				return { kind: "tranche_not_found" as const };
			}

			if (tranche.isPaid) {
				return { kind: "already_paid" as const };
			}

			const [contract] = await tx
				.select()
				.from(installmentContracts)
				.where(eq(installmentContracts.id, tranche.contractId))
				.limit(1);

			if (!contract) {
				return { kind: "contract_not_found" as const };
			}

			// Находим кассу (по умолчанию безналичная "cashless" или "main")
			await ensureOrganizationCashBoxes(tx, orgId);
			let targetBox: typeof cashBoxes.$inferSelect | undefined;
			if (payData.cashBoxId) {
				const [b] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.id, payData.cashBoxId), eq(cashBoxes.organizationId, orgId)))
					.limit(1);
				targetBox = b;
			} else {
				const [b] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.organizationId, orgId), eq(cashBoxes.type, "cashless")))
					.limit(1);
				targetBox = b;
			}

			if (!targetBox) {
				const [fallback] = await tx
					.select()
					.from(cashBoxes)
					.where(eq(cashBoxes.organizationId, orgId))
					.limit(1);
				targetBox = fallback;
			}

			if (!targetBox) {
				return { kind: "no_cash_box" as const };
			}

			const balanceBefore = targetBox.balanceRub;
			const balanceAfter = Math.round((balanceBefore + tranche.amountRub) * 100) / 100;

			// Обновляем кассу
			await tx
				.update(cashBoxes)
				.set({
					balanceRub: balanceAfter,
					updatedAt: new Date(),
				})
				.where(eq(cashBoxes.id, targetBox.id));

			// Проводим кассовую операцию прихода
			const [operation] = await tx
				.insert(cashOperations)
				.values({
					organizationId: orgId,
					cashBoxId: targetBox.id,
					operationType: "income",
					amountRub: tranche.amountRub,
					balanceBeforeRub: balanceBefore,
					balanceAfterRub: balanceAfter,
					reasonText: `Оплата взноса №${tranche.trancheNumber} по договору рассрочки ${contract.contractNumber}`,
					patientId: contract.patientId,
					installmentTrancheId: tranche.id,
					operatorId: payData.operatorId ?? null,
				})
				.returning();

			const now = new Date();

			// Обновляем транш
			const [updatedTranche] = await tx
				.update(installmentTranches)
				.set({
					isPaid: true,
					paidAt: now,
					status: "paid",
					cashOperationId: operation!.id,
				})
				.where(eq(installmentTranches.id, tranche.id))
				.returning();

			// Обновляем баланс договора рассрочки
			const newPaidAmount = Math.round((contract.paidAmountRub + tranche.amountRub) * 100) / 100;
			const newRemaining = Math.max(0, Math.round((contract.remainingAmountRub - tranche.amountRub) * 100) / 100);
			const isFullyPaid = newRemaining <= 0;

			const [updatedContract] = await tx
				.update(installmentContracts)
				.set({
					paidAmountRub: newPaidAmount,
					remainingAmountRub: newRemaining,
					status: isFullyPaid ? "completed" : contract.status,
					completedAt: isFullyPaid ? now : null,
					updatedAt: now,
				})
				.where(eq(installmentContracts.id, contract.id))
				.returning();

			return {
				kind: "ok" as const,
				tranche: updatedTranche!,
				contract: updatedContract!,
				cashOperation: operation!,
			};
		});

		if (result.kind === "tranche_not_found") {
			return reply.code(404).send({
				error: "TrancheNotFound",
				message: "Транш рассрочки не найден.",
			});
		}
		if (result.kind === "already_paid") {
			return reply.code(400).send({
				error: "AlreadyPaid",
				message: "Данный взнос рассрочки уже оплачен.",
			});
		}
		if (result.kind === "contract_not_found") {
			return reply.code(404).send({
				error: "ContractNotFound",
				message: "Договор рассрочки не найден.",
			});
		}
		if (result.kind === "no_cash_box") {
			return reply.code(400).send({
				error: "NoCashBox",
				message: "Кассовые счета организации не найдены.",
			});
		}

		return reply.send({
			success: true,
			message: `Платеж по рассрочке на сумму ${result.tranche.amountRub} ₽ успешно проведен.`,
			tranche: result.tranche,
			contract: result.contract,
			cashOperation: result.cashOperation,
		});
	};

	app.post("/api/installments/tranches/:id/pay", handlePayTranche);
	app.post("/api/installment-payments/:id/pay", handlePayTranche);

	/**
	 * 11. GET /api/installments
	 * Реестр договоров рассрочки.
	 */
	app.get("/api/installments", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "installments list");
		if (!orgId) return;

		const querySchema = z.object({
			patientId: z.string().uuid().optional(),
			status: z.string().optional(),
		});
		const parsed = querySchema.safeParse(request.query || {});
		const filter = parsed.success ? parsed.data : {};

		const contractsList = await withTenantCtx(orgId, async (tx) => {
			const conditions = [eq(installmentContracts.organizationId, orgId)];
			if (filter.patientId) {
				conditions.push(eq(installmentContracts.patientId, filter.patientId));
			}
			if (filter.status) {
				conditions.push(eq(installmentContracts.status, filter.status));
			}

			const list = await tx
				.select({
					contract: installmentContracts,
					patientName: patients.fullName,
					patientPhone: patients.phone,
				})
				.from(installmentContracts)
				.innerJoin(patients, eq(patients.id, installmentContracts.patientId))
				.where(and(...conditions))
				.orderBy(desc(installmentContracts.createdAt));

			return list;
		});

		return reply.send({ data: contractsList, total: contractsList.length });
	});

	/**
	 * 12. GET /api/installments/:id
	 * Детальная карточка договора рассрочки с графиком траншей.
	 */
	app.get("/api/installments/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "installment contract read");
		if (!orgId) return;

		const { id } = request.params;

		const result = await withTenantCtx(orgId, async (tx) => {
			const [contract] = await tx
				.select({
					contract: installmentContracts,
					patientName: patients.fullName,
					patientPhone: patients.phone,
				})
				.from(installmentContracts)
				.innerJoin(patients, eq(patients.id, installmentContracts.patientId))
				.where(and(eq(installmentContracts.id, id), eq(installmentContracts.organizationId, orgId)))
				.limit(1);

			if (!contract) return null;

			const tranches = await tx
				.select()
				.from(installmentTranches)
				.where(eq(installmentTranches.contractId, contract.contract.id))
				.orderBy(installmentTranches.trancheNumber);

			return {
				...contract,
				tranches,
			};
		});

		if (!result) {
			return reply.code(404).send({
				error: "InstallmentNotFound",
				message: "Договор рассрочки не найден.",
			});
		}

		return reply.send({ data: result });
	});

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
