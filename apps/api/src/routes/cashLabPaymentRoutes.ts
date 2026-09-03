/**
 * cashLabPaymentRoutes.ts — Dental Lab Order Cashbox Payment & Installed Lock Routes.
 *
 * Implements:
 * 1. POST /api/lab-orders/:id/pay — Payment from clinic cashbox under system reason 11 ("Оплата услуг лаборатории")
 * 2. POST /api/lab-orders/:id/mark-installed — Clinical milestone "installed" permanently locking the lab order
 */

import {
	kopecksToRubles,
	positiveMoneyRubSchema,
	rublesToKopecks,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../accessGuard.js";
import { withTenantCtx } from "../db/rls.js";
import {
	cashBoxes,
	cashExpenseReasons,
	cashOperations,
	labOrderEvents,
	labOrders,
} from "../db/schema.js";
import {
	ensureOrganizationCashBoxes,
	ensureOrganizationExpenseReasons,
} from "../db/seeds/seed_cash_and_reasons.js";
import { wsBroker } from "../services/websocketBroker.js";

export async function registerCashLabPaymentRoutes(app: FastifyInstance) {
	/**
	 * 1. POST /api/lab-orders/:id/pay
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
			const balanceAfter = kopecksToRubles(rublesToKopecks(balanceBefore) - rublesToKopecks(amountToPay));

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
	 * 2. POST /api/lab-orders/:id/mark-installed
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
}
