import { and, eq } from "drizzle-orm";
import { kopecksToRubles, parseKopecks } from "@dental/shared";
import { cashBoxShifts } from "../../db/schema.js";
import type { TenantDb } from "../../db/rls.js";

/**
 * Синхронно обновляет итоговые суммы открытой кассовой смены (в копейках и рублях).
 */
export async function addCashBoxShiftDelta(params: {
	tx: TenantDb;
	organizationId: string;
	cashBoxId: string;
	kind: "income" | "expense";
	deltaKopecks: number;
}): Promise<string | null> {
	const { tx, organizationId, cashBoxId, kind, deltaKopecks } = params;
	if (!Number.isFinite(deltaKopecks) || deltaKopecks === 0) return null;

	const [openShift] = await tx
		.select({
			id: cashBoxShifts.id,
			incomeTotalKopecks: cashBoxShifts.incomeTotalKopecks,
			incomeTotalRub: cashBoxShifts.incomeTotalRub,
			expenseTotalKopecks: cashBoxShifts.expenseTotalKopecks,
			expenseTotalRub: cashBoxShifts.expenseTotalRub,
		})
		.from(cashBoxShifts)
		.where(
			and(
				eq(cashBoxShifts.organizationId, organizationId),
				eq(cashBoxShifts.cashBoxId, cashBoxId),
				eq(cashBoxShifts.status, "open"),
			),
		)
		.limit(1)
		.for("update");

	if (!openShift) return null;

	if (kind === "income") {
		const curKop =
			openShift.incomeTotalKopecks != null && openShift.incomeTotalKopecks !== 0
				? Number(openShift.incomeTotalKopecks)
				: parseKopecks(openShift.incomeTotalRub ?? 0);
		const newKop = curKop + Math.trunc(deltaKopecks);
		await tx
			.update(cashBoxShifts)
			.set({
				incomeTotalKopecks: newKop,
				incomeTotalRub: kopecksToRubles(newKop),
			})
			.where(
				and(
					eq(cashBoxShifts.id, openShift.id),
					eq(cashBoxShifts.organizationId, organizationId),
				),
			);
		return openShift.id;
	}

	const curExpKop =
		openShift.expenseTotalKopecks != null && openShift.expenseTotalKopecks !== 0
			? Number(openShift.expenseTotalKopecks)
			: parseKopecks(openShift.expenseTotalRub ?? 0);
	const newExpKop = curExpKop + Math.trunc(deltaKopecks);
	await tx
		.update(cashBoxShifts)
		.set({
			expenseTotalKopecks: newExpKop,
			expenseTotalRub: kopecksToRubles(newExpKop),
		})
		.where(
			and(
				eq(cashBoxShifts.id, openShift.id),
				eq(cashBoxShifts.organizationId, organizationId),
			),
		);
	return openShift.id;
}
