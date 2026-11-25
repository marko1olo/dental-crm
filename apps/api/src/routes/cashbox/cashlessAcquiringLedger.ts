/**
 * cashlessAcquiringLedger.ts — Shared SSOT Cashless & SBP Acquiring Ledger Helper (Mandates 8bm, 8bo).
 *
 * Synchronizes bank/POS/SBP settlements and refunds with:
 * - `cashBoxes` (cashless / sbp box balanceKopecks & balanceRub)
 * - `cashBoxShifts` (active open shift incomeTotalKopecks / expenseTotalKopecks)
 * - `cashOperations` (immutable income / expense audit entry with idempotency metadata)
 */

import { kopecksToRub, rublesToKopecks } from "@dental/shared";
import { and, eq, or, sql } from "drizzle-orm";
import type { TenantDb } from "../../db/rls.js";
import { cashBoxes, cashBoxShifts, cashOperations } from "../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../db/seeds/seed_cash_and_reasons.js";

function resolveSafeKopecks(
	kopecksVal: number | bigint | null | undefined,
	rubVal: number | string | null | undefined,
): number {
	const kop = kopecksVal !== null && kopecksVal !== undefined ? Number(kopecksVal) : 0;
	const rub = Number(rubVal || 0);
	return kop !== 0 || rub === 0 ? kop : rublesToKopecks(rub);
}

export interface AcquiringLedgerParams {
	organizationId: string;
	direction: "income" | "refund";
	amountKopecks: number | bigint;
	paymentMethod: "card" | "online";
	patientId: string;
	paymentId: string | null;
	invoiceId?: string | null | undefined;
	reasonText: string;
	sourceTag: string;
}

/**
 * Applies an acquiring income or refund movement to the clinic's cashless/SBP box,
 * open shift counters, and `cash_operations` ledger inside an active tenant transaction.
 * Idempotent on `(organizationId, sourceTag, direction)` to prevent double-counting on webhook retries.
 */
export async function applyAcquiringCashboxLedgerInTx(
	tx: TenantDb,
	params: AcquiringLedgerParams,
): Promise<{ cashBoxId: string; cashOperationId: string } | null> {
	const amtKop = Number(params.amountKopecks);
	if (!Number.isFinite(amtKop) || amtKop <= 0) {
		return null;
	}

	const sourceKey = `${params.sourceTag}:${params.direction}`;

	const [existingOp] = await tx
		.select({ id: cashOperations.id, cashBoxId: cashOperations.cashBoxId })
		.from(cashOperations)
		.where(
			and(
				eq(cashOperations.organizationId, params.organizationId),
				sql`${cashOperations.metadata}->>'acquiringSourceKey' = ${sourceKey}`,
			),
		)
		.limit(1);

	if (existingOp) {
		return { cashBoxId: existingOp.cashBoxId, cashOperationId: existingOp.id };
	}

	await ensureOrganizationCashBoxes(tx, params.organizationId);

	const preferredBoxes = await tx
		.select()
		.from(cashBoxes)
		.where(
			and(
				eq(cashBoxes.organizationId, params.organizationId),
				or(
					eq(cashBoxes.type, "cashless"),
					eq(cashBoxes.isCashless, true),
					eq(cashBoxes.type, "main"),
				),
			),
		)
		.for("update");

	const targetBox =
		(params.paymentMethod === "online"
			? preferredBoxes.find((b) => b.type === "sbp")
			: undefined) ??
		preferredBoxes.find((b) => b.type === "cashless") ??
		preferredBoxes.find((b) => b.isCashless === true) ??
		preferredBoxes.find((b) => b.type === "main");

	if (!targetBox) {
		return null;
	}

	const now = new Date();
	const beforeKop = resolveSafeKopecks(targetBox.balanceKopecks, targetBox.balanceRub);
	const afterKop = params.direction === "income" ? beforeKop + amtKop : beforeKop - amtKop;
	const amountRub = kopecksToRub(amtKop);
	const beforeRub = kopecksToRub(beforeKop);
	const afterRub = kopecksToRub(afterKop);

	await tx
		.update(cashBoxes)
		.set({
			balanceKopecks: afterKop,
			balanceRub: afterRub,
			updatedAt: now,
		})
		.where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, params.organizationId)));

	const [activeShift] = await tx
		.select()
		.from(cashBoxShifts)
		.where(
			and(
				eq(cashBoxShifts.organizationId, params.organizationId),
				eq(cashBoxShifts.cashBoxId, targetBox.id),
				eq(cashBoxShifts.status, "open"),
			),
		)
		.for("update")
		.limit(1);

	if (activeShift) {
		if (params.direction === "income") {
			const nextIncomeKop =
				resolveSafeKopecks(activeShift.incomeTotalKopecks, activeShift.incomeTotalRub) + amtKop;
			await tx
				.update(cashBoxShifts)
				.set({
					incomeTotalKopecks: nextIncomeKop,
					incomeTotalRub: kopecksToRub(nextIncomeKop),
					updatedAt: now,
				})
				.where(
					and(
						eq(cashBoxShifts.id, activeShift.id),
						eq(cashBoxShifts.organizationId, params.organizationId),
					),
				);
		} else {
			const nextExpenseKop =
				resolveSafeKopecks(activeShift.expenseTotalKopecks, activeShift.expenseTotalRub) + amtKop;
			await tx
				.update(cashBoxShifts)
				.set({
					expenseTotalKopecks: nextExpenseKop,
					expenseTotalRub: kopecksToRub(nextExpenseKop),
					updatedAt: now,
				})
				.where(
					and(
						eq(cashBoxShifts.id, activeShift.id),
						eq(cashBoxShifts.organizationId, params.organizationId),
					),
				);
		}
	}

	const [createdOp] = await tx
		.insert(cashOperations)
		.values({
			organizationId: params.organizationId,
			cashBoxId: targetBox.id,
			shiftId: activeShift?.id ?? null,
			operationType: params.direction === "income" ? "income" : "expense",
			amountRub,
			amountKopecks: amtKop,
			balanceBeforeRub: beforeRub,
			balanceBeforeKopecks: BigInt(beforeKop),
			balanceAfterRub: afterRub,
			balanceAfterKopecks: BigInt(afterKop),
			reasonText: params.reasonText,
			patientId: params.patientId,
			invoiceId: params.invoiceId ?? null,
			metadata: {
				acquiringSourceKey: sourceKey,
				sourceTag: params.sourceTag,
				paymentId: params.paymentId,
				method: params.paymentMethod,
				isDepositRefund: false,
			},
		})
		.returning({ id: cashOperations.id });

	return createdOp ? { cashBoxId: targetBox.id, cashOperationId: createdOp.id } : null;
}
