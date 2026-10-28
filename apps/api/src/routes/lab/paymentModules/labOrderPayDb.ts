import { kopecksToRub, rubToKopecks } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import { cashBoxes, cashExpenseReasons, cashOperations, labOrders } from "../../../db/schema.js";
import { ensureOrganizationExpenseReasons } from "../../../db/seeds/seed_cash_and_reasons.js";
import { resolveAmountToPayKopecks, resolveTargetCashBox } from "./labOrderCashBoxFinder.js";

export interface LabOrderPayInput {
	readonly cashBoxId?: string;
	readonly amountRub?: number;
	readonly amountKopecks?: number | bigint;
	readonly notes?: string;
}

export type LabOrderPayResult =
	| { readonly kind: "order_not_found" }
	| { readonly kind: "already_paid" }
	| { readonly kind: "invalid_amount" }
	| { readonly kind: "no_cash_box" }
	| {
			readonly kind: "ok";
			readonly operation: typeof cashOperations.$inferSelect;
			readonly labOrder: typeof labOrders.$inferSelect;
			readonly amountKopecks: number;
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

		const amountToPayKopecks = resolveAmountToPayKopecks(input, order);
		if (amountToPayKopecks <= 0) return { kind: "invalid_amount" as const };

		const targetBox = await resolveTargetCashBox(tx, orgId, input.cashBoxId);
		if (!targetBox) return { kind: "no_cash_box" as const };

		await ensureOrganizationExpenseReasons(tx, orgId);
		const [reason11] = await tx
			.select()
			.from(cashExpenseReasons)
			.where(and(eq(cashExpenseReasons.organizationId, orgId), eq(cashExpenseReasons.code, 11)))
			.limit(1);

		const amountToPayRub = kopecksToRub(amountToPayKopecks);
		const balanceBeforeKop = rubToKopecks(targetBox.balanceRub);
		const balanceAfterKop = balanceBeforeKop - amountToPayKopecks;
		const balanceAfterRub = kopecksToRub(balanceAfterKop);

		await tx
			.update(cashBoxes)
			.set({ balanceRub: balanceAfterRub, updatedAt: new Date() })
			.where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, orgId)));

		const [operation] = await tx
			.insert(cashOperations)
			.values({
				organizationId: orgId,
				cashBoxId: targetBox.id,
				operationType: "expense",
				amountRub: amountToPayRub,
				balanceBeforeRub: targetBox.balanceRub,
				balanceAfterRub,
				reasonId: reason11?.id ?? null,
				reasonCode: 11,
				reasonText: `Оплата услуг зуботехнической лаборатории по заказу ЛО-${order.secureToken.slice(0, 8).toUpperCase()}${input.notes ? ` (${input.notes})` : ""}`,
				labOrderId: order.id,
				patientId: order.patientId,
			})
			.returning();

		const [updatedOrder] = await tx
			.update(labOrders)
			.set({ paidFromCashOperationId: operation!.id, updatedAt: new Date() })
			.where(and(eq(labOrders.id, order.id), eq(labOrders.organizationId, orgId)))
			.returning();

		return {
			kind: "ok" as const,
			operation: operation!,
			labOrder: updatedOrder!,
			amountKopecks: amountToPayKopecks,
		};
	});
}
