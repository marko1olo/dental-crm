/**
 * apps/api/src/routes/cashbox/paymentStages/loyaltyBonusStage.ts
 *
 * Stage 4: Loyalty Bonus Balance Locking, Verification & FIFO Deduction.
 * Governed by Mandate 8e, 8bm, 8bo (Patient Loyalty & Integer Math).
 */

import { and, eq } from "drizzle-orm";
import { kopecksToNumericString, parseKopecks } from "@dental/shared";
import { bonusTransactions, patientBonusBalances } from "../../../db/schema.js";
import {
	deductUnspentPointsFifo,
	processPatientExpiredBonuses,
} from "../../loyaltyModules/bonusBalanceService.js";
import type { PaymentProcessingContext, StageStepResult, TenantTransaction } from "./types.js";

export async function validateAndLockLoyaltyBonuses(
	tx: TenantTransaction,
	ctx: PaymentProcessingContext,
): Promise<StageStepResult> {
	if (ctx.isWarrantyPayment || ctx.requiredBonusKopecks <= 0n) {
		return { success: true };
	}

	const { orgId, requiredBonusKopecks, resolvedPatientId } = ctx;

	if (!resolvedPatientId) {
		return { success: true };
	}

	await processPatientExpiredBonuses(tx, orgId, resolvedPatientId);

	const [bonusBalance] = await tx
		.select()
		.from(patientBonusBalances)
		.where(
			and(
				eq(patientBonusBalances.organizationId, orgId),
				eq(patientBonusBalances.patientId, resolvedPatientId),
			),
		)
		.for("update")
		.limit(1);

	const currentActiveKop = BigInt(parseKopecks(bonusBalance?.activePoints ?? "0.00"));

	if (currentActiveKop < requiredBonusKopecks) {
		const availableRub = kopecksToNumericString(currentActiveKop);
		const requiredRub = kopecksToNumericString(requiredBonusKopecks);
		return {
			failure: {
				kind: "insufficient_bonus",
				availableRub,
				requiredRub,
			},
		};
	}

	ctx.lockedBonusBalance = bonusBalance ?? null;
	ctx.pointsToDeductKop = requiredBonusKopecks;
	ctx.newActiveBonusKop =
		currentActiveKop >= requiredBonusKopecks
			? currentActiveKop - requiredBonusKopecks
			: 0n;

	return { success: true };
}

export async function finalizeLoyaltyBonusDeduction(
	tx: TenantTransaction,
	ctx: PaymentProcessingContext,
): Promise<void> {
	if (ctx.isWarrantyPayment || ctx.requiredBonusKopecks <= 0n || !ctx.lockedBonusBalance) {
		return;
	}

	const {
		orgId,
		resolvedPatientId,
		requiredBonusKopecks,
		lockedBonusBalance,
		newActiveBonusKop,
		pointsToDeductKop,
		effectiveMutationId,
		body,
		newPayment,
	} = ctx;

	const currentSpentKop = BigInt(
		parseKopecks(lockedBonusBalance.lifetimeSpentPoints ?? "0.00"),
	);
	const newLifetimeSpentKop = currentSpentKop + requiredBonusKopecks;
	const newActiveBonusStr = kopecksToNumericString(newActiveBonusKop);
	const newLifetimeSpentStr = kopecksToNumericString(newLifetimeSpentKop);
	const pointsToDeductStr = kopecksToNumericString(pointsToDeductKop);

	await tx
		.update(patientBonusBalances)
		.set({
			activePoints: newActiveBonusStr,
			lifetimeSpentPoints: newLifetimeSpentStr,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(patientBonusBalances.organizationId, orgId),
				eq(patientBonusBalances.patientId, resolvedPatientId),
			),
		);

	await tx.insert(bonusTransactions).values({
		organizationId: orgId,
		patientId: resolvedPatientId,
		amountPoints: `-${pointsToDeductStr}`,
		balanceAfterPoints: newActiveBonusStr,
		type: "redemption_payment",
		relatedPaymentId: newPayment?.id ?? null,
		relatedInvoiceId: body.invoiceId || null,
		clientMutationId: effectiveMutationId ? `${effectiveMutationId}:bonus` : null,
		description:
			body.note ||
			`Списание бонусов лояльности в кассе (${pointsToDeductStr} б.)`,
	});

	await deductUnspentPointsFifo(tx, {
		orgId,
		patientId: resolvedPatientId,
		pointsToDeduct: Number(pointsToDeductStr),
	});
}
