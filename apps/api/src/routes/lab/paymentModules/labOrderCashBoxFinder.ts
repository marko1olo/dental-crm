import { rubToKopecks } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { cashBoxes } from "../../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../../db/seeds/seed_cash_and_reasons.js";
import type { LabOrderPayInput } from "./labOrderPayDb.js";

export function resolveAmountToPayKopecks(
	input: LabOrderPayInput,
	order: { labCostRub?: number | null; priceRub?: number | null },
): number {
	if (input.amountKopecks !== undefined) return Number(input.amountKopecks);
	if (input.amountRub !== undefined) return rubToKopecks(input.amountRub);
	if (order.labCostRub !== null && order.labCostRub !== undefined) return rubToKopecks(order.labCostRub);
	if (order.priceRub !== null && order.priceRub !== undefined) return rubToKopecks(order.priceRub);
	return 0;
}

export async function resolveTargetCashBox(
	tx: any,
	orgId: string,
	cashBoxId?: string,
): Promise<typeof cashBoxes.$inferSelect | undefined> {
	await ensureOrganizationCashBoxes(tx, orgId);

	if (cashBoxId) {
		const [b] = await tx
			.select()
			.from(cashBoxes)
			.where(and(eq(cashBoxes.id, cashBoxId), eq(cashBoxes.organizationId, orgId)))
			.for("update")
			.limit(1);
		if (b) return b;
	}

	const [accountBox] = await tx
		.select()
		.from(cashBoxes)
		.where(and(eq(cashBoxes.organizationId, orgId), eq(cashBoxes.type, "account")))
		.for("update")
		.limit(1);
	if (accountBox) return accountBox;

	const [fallbackBox] = await tx
		.select()
		.from(cashBoxes)
		.where(eq(cashBoxes.organizationId, orgId))
		.for("update")
		.limit(1);
	return fallbackBox;
}
