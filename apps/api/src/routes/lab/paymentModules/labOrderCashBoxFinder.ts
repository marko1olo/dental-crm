import { rubToKopecks } from "@dental/shared";
import { and, asc, eq } from "drizzle-orm";
import { cashBoxes } from "../../../db/schema.js";
import { ensureOrganizationCashBoxes, type DbExecutor } from "../../../db/seeds/seed_cash_and_reasons.js";
import type { LabOrderPayInput } from "./labOrderPayDb.js";

export function resolveAmountToPayKopecks(
	input: LabOrderPayInput,
	order: {
		labCostRub?: number | null;
		priceRub?: number | null;
		labCostKopecks?: number | string | bigint | null;
		priceKopecks?: number | string | bigint | null;
	},
): number {
	if (input.amountKopecks !== undefined) return Number(input.amountKopecks);
	if (input.amountRub !== undefined) return rubToKopecks(input.amountRub);
	// Себестоимость работы техника ЗТЛ в копейках (Мандаты 8bm, 8e, 8n) — розница пациента priceKopecks/priceRub неприкосновенна!
	if (order.labCostKopecks != null && Number(order.labCostKopecks) > 0) {
		return Number(order.labCostKopecks);
	}
	if (order.labCostRub !== null && order.labCostRub !== undefined && Number(order.labCostRub) > 0) {
		return rubToKopecks(order.labCostRub);
	}
	return 0;
}

export async function resolveTargetCashBox(
	tx: DbExecutor,
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
		.orderBy(asc(cashBoxes.createdAt), asc(cashBoxes.id))
		.for("update")
		.limit(1);
	return fallbackBox;
}
