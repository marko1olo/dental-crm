/**
 * cashboxHelpers.ts — Layer 1: Pure Domain Helpers for Cashbox Subsystem.
 * 
 * Precision financial calculations, shift number generation, and Mandate 8e/8n Solo Doctor resolution.
 */

import { kopecksToRub, rubToKopecks } from "@dental/shared";
import { eq } from "drizzle-orm";
import type { TenantDb } from "../../db/rls.js";
import { users } from "../../db/schema.js";
import type { ZReportDataPayload } from "./types.js";

/**
 * Resolves effective user ID for shift opening/closing.
 * Mandate 8e & 8n: Solo Doctor Autonomy — auto-resolves to primary user of clinic
 * if no cashier/operator UUID is passed.
 */
export async function resolveEffectiveCashierUserId(
	tx: TenantDb,
	orgId: string,
	requestedUserId?: string | null,
	currentUserId?: string | null,
): Promise<string | null> {
	if (requestedUserId) {
		return requestedUserId;
	}
	if (currentUserId) {
		return currentUserId;
	}

	const [firstUser] = await tx
		.select({ id: users.id })
		.from(users)
		.where(eq(users.organizationId, orgId))
		.limit(1);

	return firstUser?.id ?? null;
}

/**
 * Formats canonical 54-FZ Z-Report identifier.
 */
export function formatZReportNumber(
	customNumber: string | undefined | null,
	shiftNumber: number,
	now: Date = new Date(),
): string {
	if (customNumber && customNumber.trim().length > 0) {
		return `${customNumber.trim()}-${shiftNumber}`;
	}
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `Z-${year}${month}${day}-${shiftNumber}`;
}

/**
 * Safe kopeck-precise money addition.
 */
export function calculateBalanceAdd(balanceBeforeRub: number, amountRub: number): number {
	return kopecksToRub(rubToKopecks(balanceBeforeRub) + rubToKopecks(amountRub));
}

/**
 * Safe kopeck-precise money subtraction.
 */
export function calculateBalanceSubtract(balanceBeforeRub: number, amountRub: number): number {
	return kopecksToRub(rubToKopecks(balanceBeforeRub) - rubToKopecks(amountRub));
}

/**
 * Constructs structured Z-Report audit metadata (54-FZ).
 */
export function buildZReportDataPayload(params: {
	now: Date;
	cashierFullName: string | null;
	startingBalanceRub: number;
	finalBalanceRub: number;
	incomeTotalRub: number;
	expenseTotalRub: number;
	countedCashRub?: number | undefined;
	incomeCashRub?: number | null | undefined;
	incomeElectronicRub?: number | null | undefined;
	incomeSbpRub?: number | null | undefined;
	advanceOffsetRub?: number | null | undefined;
	netRevenueRub?: number | null | undefined;
	differenceRub?: number | undefined;
	isBalanced?: boolean | undefined;
	reconciliation?: Record<string, unknown> | null | undefined;
}): ZReportDataPayload {
	return {
		closedAtIso: params.now.toISOString(),
		cashierFullName: params.cashierFullName,
		startingBalanceRub: params.startingBalanceRub,
		finalBalanceRub: params.finalBalanceRub,
		incomeTotalRub: params.incomeTotalRub,
		expenseTotalRub: params.expenseTotalRub,
		countedCashRub:
			params.countedCashRub !== undefined ? params.countedCashRub : params.finalBalanceRub,
		incomeCashRub: params.incomeCashRub ?? null,
		incomeElectronicRub: params.incomeElectronicRub ?? null,
		incomeSbpRub: params.incomeSbpRub ?? null,
		advanceOffsetRub: params.advanceOffsetRub ?? null,
		netRevenueRub: params.netRevenueRub ?? null,
		differenceRub: params.differenceRub !== undefined ? params.differenceRub : 0,
		isBalanced: params.isBalanced !== undefined ? params.isBalanced : true,
		reconciliation: params.reconciliation ?? null,
	};
}
