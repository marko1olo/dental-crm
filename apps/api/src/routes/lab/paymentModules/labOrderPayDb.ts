import { kopecksToRub, rubToKopecks } from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import { cashBoxes, cashExpenseReasons, cashOperations, labOrders } from "../../../db/schema.js";
import { ensureOrganizationExpenseReasons } from "../../../db/seeds/seed_cash_and_reasons.js";
import { resolveAmountToPayKopecks, resolveTargetCashBox } from "./labOrderCashBoxFinder.js";

export interface LabOrderPayInput {
	readonly cashBoxId?: string | undefined;
	readonly amountRub?: number | undefined;
	readonly amountKopecks?: number | bigint | undefined;
	readonly notes?: string | undefined;
	readonly idempotencyKey?: string | undefined;
}

export type LabOrderPayResult =
	| { readonly kind: "order_not_found" }
	| { readonly kind: "already_paid" }
	| { readonly kind: "invalid_amount" }
	| { readonly kind: "amount_exceeds_cost"; readonly maxAllowedKopecks: number }
	| { readonly kind: "no_cash_box" }
	| {
			readonly kind: "ok";
			readonly operation: typeof cashOperations.$inferSelect;
			readonly labOrder: typeof labOrders.$inferSelect;
			readonly amountKopecks: number;
			readonly isReplay?: boolean;
	  };

export async function executeLabOrderPayment(
	orgId: string,
	orderId: string,
	input: LabOrderPayInput,
): Promise<LabOrderPayResult> {
	return withTenantCtx(orgId, async (tx) => {
		const [order] = await tx
			.select()
			.from(labOrders)
			.where(and(eq(labOrders.id, orderId), eq(labOrders.organizationId, orgId)))
			.for("update")
			.limit(1);

		if (!order) return { kind: "order_not_found" as const };
		if (order.paidFromCashOperationId) return { kind: "already_paid" as const };

		if (input.idempotencyKey) {
			const [existingOp] = await tx
				.select()
				.from(cashOperations)
				.where(
					and(
						eq(cashOperations.organizationId, orgId),
						sql`${cashOperations.metadata}->>'idempotencyKey' = ${input.idempotencyKey}`,
					),
				)
				.limit(1);

			if (existingOp) {
				return {
					kind: "ok" as const,
					operation: existingOp,
					labOrder: order,
					amountKopecks: rubToKopecks(existingOp.amountRub),
					isReplay: true,
				};
			}
		}

		const amountToPayKopecks = resolveAmountToPayKopecks(input, order);
		if (amountToPayKopecks <= 0) return { kind: "invalid_amount" as const };

		// Защита розницы клиники (Мандат 8e / Кассовая безопасность):
		// Списание технику из кассы не может превышать себестоимость наряда ЗТЛ!
		if (order.labCostKopecks != null && Number(order.labCostKopecks) > 0) {
			const maxAllowedKopecks = Number(order.labCostKopecks);
			if (amountToPayKopecks > maxAllowedKopecks) {
				return { kind: "amount_exceeds_cost" as const, maxAllowedKopecks };
			}
		} else if (order.labCostRub != null && Number(order.labCostRub) > 0) {
			const maxAllowedKopecks = rubToKopecks(order.labCostRub);
			if (amountToPayKopecks > maxAllowedKopecks) {
				return { kind: "amount_exceeds_cost" as const, maxAllowedKopecks };
			}
		}

		const targetBox = await resolveTargetCashBox(tx, orgId, input.cashBoxId);
		if (!targetBox) return { kind: "no_cash_box" as const };

		await ensureOrganizationExpenseReasons(tx, orgId);
		const [reason11] = await tx
			.select()
			.from(cashExpenseReasons)
			.where(and(eq(cashExpenseReasons.organizationId, orgId), eq(cashExpenseReasons.code, 11)))
			.limit(1);

		const amountToPayRub = kopecksToRub(amountToPayKopecks);
		const currentBalanceKopecks = targetBox.balanceKopecks != null
			? Number(targetBox.balanceKopecks)
			: rubToKopecks(targetBox.balanceRub);
		const balanceAfterKopecks = currentBalanceKopecks - amountToPayKopecks;
		const balanceAfterRub = kopecksToRub(balanceAfterKopecks);

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: balanceAfterRub,
				balanceKopecks: balanceAfterKopecks,
				updatedAt: new Date(),
			})
			.where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, orgId)));

		const [operation] = await tx
			.insert(cashOperations)
			.values({
				organizationId: orgId,
				cashBoxId: targetBox.id,
				operationType: "expense",
				amountRub: amountToPayRub,
				amountKopecks: amountToPayKopecks,
				balanceBeforeRub: targetBox.balanceRub,
				balanceAfterRub,
				reasonId: reason11?.id ?? null,
				reasonCode: 11,
				reasonText: `Оплата услуг зуботехнической лаборатории по заказу ЛО-${order.secureToken.slice(0, 8).toUpperCase()}${input.notes ? ` (${input.notes})` : ""}`,
				labOrderId: order.id,
				patientId: order.patientId,
				metadata: input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : null,
			})
			.returning();

		if (!operation) {
			throw new Error("Не удалось создать кассовую операцию списания ЗТЛ");
		}

		const [updatedOrder] = await tx
			.update(labOrders)
			.set({ paidFromCashOperationId: operation.id, updatedAt: new Date() })
			.where(and(eq(labOrders.id, order.id), eq(labOrders.organizationId, orgId)))
			.returning();

		if (!updatedOrder) {
			throw new Error("Не удалось обновить статус оплаты наряда лаборатории");
		}

		return {
			kind: "ok" as const,
			operation,
			labOrder: updatedOrder,
			amountKopecks: amountToPayKopecks,
		};
	});
}
