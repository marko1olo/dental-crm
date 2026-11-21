import { calculateMaxRedeemablePoints, getLoyaltyTierDefinition, type LoyaltyTierId, kopecksToNumericString, parseKopecks, sumKopecks } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { bonusTransactions, patientBonusBalances, patientInvoices, patients, payments } from "../../db/schema.js";
import { deductUnspentPointsFifo, processPatientExpiredBonuses } from "./bonusBalanceService.js";

export interface ExecuteRedeemParams {
	readonly orgId: string;
	readonly patientId: string;
	readonly invoiceId?: string | null | undefined;
	readonly invoiceAmountRub: number;
	readonly pointsToRedeem: number;
	readonly allowFullCoverage?: boolean | undefined;
	readonly clientMutationId?: string | undefined;
	readonly description: string;
}

export async function executeBonusRedeem(p: ExecuteRedeemParams) {
	return db.transaction(async (tx) => {
		if (p.clientMutationId) {
			const [existingTx] = await tx
				.select()
				.from(bonusTransactions)
				.where(
					and(
						eq(bonusTransactions.organizationId, p.orgId),
						eq(bonusTransactions.clientMutationId, p.clientMutationId),
					),
				)
				.limit(1)
				.for("update");

			if (existingTx) {
				const redeemedPts = Math.abs(Number(existingTx.amountPoints));
				return {
					success: true as const,
					replayed: true as const,
					redeemedPoints: redeemedPts,
					discountRub: redeemedPts,
					remainingInvoicePaymentRub: 0,
					newActivePoints: Number(existingTx.balanceAfterPoints),
					paymentId: existingTx.relatedPaymentId,
					invoiceStatusUpdated: false,
					transactionId: existingTx.id,
				};
			}
		}

		const [patient] = await tx.select({ id: patients.id, familyGroupId: patients.familyGroupId }).from(patients).where(and(eq(patients.organizationId, p.orgId), eq(patients.id, p.patientId))).limit(1).for("update");
		if (!patient) return { notFound: true as const };

		// JIT TTL: expire any overdue bonuses before evaluating redeemable balance
		await processPatientExpiredBonuses(tx, p.orgId, p.patientId);

		const [balance] = await tx.select().from(patientBonusBalances).where(and(eq(patientBonusBalances.organizationId, p.orgId), eq(patientBonusBalances.patientId, p.patientId))).limit(1).for("update");

		let effectiveInvoiceAmountRub = p.invoiceAmountRub;
		if (p.invoiceId) {
			const [invoice] = await tx.select().from(patientInvoices).where(and(eq(patientInvoices.id, p.invoiceId), eq(patientInvoices.organizationId, p.orgId))).for("update").limit(1);
			if (!invoice || invoice.patientId !== p.patientId) return { invalidInvoice: true as const, message: "Счёт не найден или чужой", code: 404 };
			if (invoice.status === "paid" || invoice.status === "refunded") return { invalidInvoice: true as const, message: "Счёт уже оплачен или аннулирован", code: 409 };
			effectiveInvoiceAmountRub = Number(invoice.totalRub);
		}

		let patientTierId: LoyaltyTierId = "silver";
		if (patient.familyGroupId) {
			patientTierId = "family";
		}
		const lifetimeSpentKop = parseKopecks(balance?.lifetimeSpentPoints ?? 0);
		const lifetimeEarnedKop = parseKopecks(balance?.lifetimeEarnedPoints ?? 0);
		if (lifetimeSpentKop >= 40000000 || lifetimeEarnedKop >= 4000000) {
			patientTierId = "platinum";
		} else if (lifetimeSpentKop >= 15000000 || lifetimeEarnedKop >= 1500000) {
			if (patientTierId !== "family") {
				patientTierId = "gold";
			}
		}
		const tierDef = getLoyaltyTierDefinition(patientTierId);
		const maxCoverage = p.allowFullCoverage ? 100 : tierDef.maxInvoiceCoveragePercent;

		const activePoints = Number(balance?.activePoints ?? 0);
		const coverage = calculateMaxRedeemablePoints(effectiveInvoiceAmountRub, activePoints, maxCoverage);

		if (p.pointsToRedeem > coverage.maxAllowedPoints) return { limitExceeded: true as const, maxAllowedPoints: coverage.maxAllowedPoints };
		if (p.pointsToRedeem > activePoints) return { insufficientPoints: true as const, activePoints };

		const activePointsKop = parseKopecks(balance?.activePoints ?? 0);
		const pointsToRedeemKop = parseKopecks(p.pointsToRedeem);
		const currentLifetimeSpentKop = parseKopecks(balance?.lifetimeSpentPoints ?? 0);

		const newActivePointsKop = Math.max(0, activePointsKop - pointsToRedeemKop);
		const newLifetimeSpentKop = sumKopecks([currentLifetimeSpentKop, pointsToRedeemKop]);
		const newActivePointsStr = kopecksToNumericString(newActivePointsKop);
		const newLifetimeSpentStr = kopecksToNumericString(newLifetimeSpentKop);
		const newActivePoints = Number(newActivePointsStr);
		const redeemedAmountRubExact = Number(kopecksToNumericString(pointsToRedeemKop));

		await tx.update(patientBonusBalances).set({ activePoints: newActivePointsStr, lifetimeSpentPoints: newLifetimeSpentStr, updatedAt: new Date() }).where(and(eq(patientBonusBalances.organizationId, p.orgId), eq(patientBonusBalances.patientId, p.patientId)));

		// FIFO: Deduct from earliest expiring accrual batches first
		await deductUnspentPointsFifo(tx, { orgId: p.orgId, patientId: p.patientId, pointsToDeduct: p.pointsToRedeem });

		let paymentId: string | null = null;
		let invoiceStatusUpdated = false;

		if (p.invoiceId) {
			const [payment] = await tx.insert(payments).values({
				organizationId: p.orgId,
				patientId: p.patientId,
				documentId: p.invoiceId,
				amountRub: redeemedAmountRubExact,
				method: "other",
				status: "paid",
				paidAt: new Date(),
				note: `Оплата баллами (${redeemedAmountRubExact} б.)`,
				clientMutationId: p.clientMutationId || null,
			}).returning({ id: payments.id });
			paymentId = payment?.id ?? null;

			const existingPayments = await tx.select({ amountRub: payments.amountRub }).from(payments).where(and(eq(payments.organizationId, p.orgId), eq(payments.documentId, p.invoiceId), eq(payments.status, "paid")));
			const totalPaidKop = sumKopecks(existingPayments.map((pay) => parseKopecks(pay.amountRub)));
			const invoiceTargetKop = parseKopecks(effectiveInvoiceAmountRub);
			if (totalPaidKop >= invoiceTargetKop) {
				await tx.update(patientInvoices).set({ status: "paid", paidAt: new Date() }).where(and(eq(patientInvoices.organizationId, p.orgId), eq(patientInvoices.id, p.invoiceId)));
				invoiceStatusUpdated = true;
			}
		}

		const [txRecord] = await tx.insert(bonusTransactions).values({
			organizationId: p.orgId,
			patientId: p.patientId,
			amountPoints: kopecksToNumericString(-pointsToRedeemKop),
			balanceAfterPoints: newActivePointsStr,
			type: "redemption_payment",
			relatedPaymentId: paymentId || null,
			relatedInvoiceId: p.invoiceId || null,
			clientMutationId: p.clientMutationId || null,
			description: p.description,
		}).returning();

		const effectiveInvoiceKop = parseKopecks(effectiveInvoiceAmountRub);
		const remainingInvoicePaymentKop = Math.max(0, effectiveInvoiceKop - pointsToRedeemKop);
		const remainingInvoicePaymentRub = Number(kopecksToNumericString(remainingInvoicePaymentKop));

		return {
			success: true as const, redeemedPoints: redeemedAmountRubExact, discountRub: redeemedAmountRubExact, remainingInvoicePaymentRub, newActivePoints, paymentId, invoiceStatusUpdated, transactionId: txRecord?.id || "redemption",
		};
	});
}

export interface ExecuteHoldParams {
	readonly orgId: string;
	readonly patientId: string;
	readonly invoiceId?: string | null | undefined;
	readonly invoiceAmountRub: number;
	readonly pointsToHold: number;
	readonly allowFullCoverage?: boolean | undefined;
	readonly clientMutationId?: string | undefined;
	readonly description: string;
}

export async function executeBonusHold(p: ExecuteHoldParams) {
	return db.transaction(async (tx) => {
		if (p.clientMutationId) {
			const [existingHold] = await tx
				.select()
				.from(bonusTransactions)
				.where(
					and(
						eq(bonusTransactions.organizationId, p.orgId),
						eq(bonusTransactions.clientMutationId, p.clientMutationId),
						eq(bonusTransactions.type, "hold_payment"),
					),
				)
				.limit(1)
				.for("update");

			if (existingHold) {
				const [currBal] = await tx
					.select()
					.from(patientBonusBalances)
					.where(and(eq(patientBonusBalances.organizationId, p.orgId), eq(patientBonusBalances.patientId, p.patientId)))
					.limit(1);
				return {
					success: true as const,
					replayed: true as const,
					holdId: existingHold.id,
					heldPoints: Math.abs(Number(existingHold.amountPoints)),
					newActivePoints: Number(existingHold.balanceAfterPoints),
					newPendingPoints: Number(currBal?.pendingPoints ?? 0),
				};
			}
		}

		const [patient] = await tx.select({ id: patients.id, familyGroupId: patients.familyGroupId }).from(patients).where(and(eq(patients.organizationId, p.orgId), eq(patients.id, p.patientId))).limit(1).for("update");
		if (!patient) return { notFound: true as const };

		// JIT TTL: expire any overdue bonuses before evaluating holdable points
		await processPatientExpiredBonuses(tx, p.orgId, p.patientId);

		const [balance] = await tx.select().from(patientBonusBalances).where(and(eq(patientBonusBalances.organizationId, p.orgId), eq(patientBonusBalances.patientId, p.patientId))).limit(1).for("update");

		let effectiveInvoiceAmountRub = p.invoiceAmountRub;
		if (p.invoiceId) {
			const [invoice] = await tx.select().from(patientInvoices).where(and(eq(patientInvoices.id, p.invoiceId), eq(patientInvoices.organizationId, p.orgId))).for("update").limit(1);
			if (!invoice || invoice.patientId !== p.patientId) return { invalidInvoice: true as const, message: "Счёт не найден или чужой", code: 404 };
			if (invoice.status === "paid" || invoice.status === "refunded") return { invalidInvoice: true as const, message: "Счёт уже оплачен или аннулирован", code: 409 };
			effectiveInvoiceAmountRub = Number(invoice.totalRub);
		}

		let patientTierId: LoyaltyTierId = "silver";
		if (patient.familyGroupId) {
			patientTierId = "family";
		}
		const lifetimeSpentKop = parseKopecks(balance?.lifetimeSpentPoints ?? 0);
		const lifetimeEarnedKop = parseKopecks(balance?.lifetimeEarnedPoints ?? 0);
		if (lifetimeSpentKop >= 40000000 || lifetimeEarnedKop >= 4000000) {
			patientTierId = "platinum";
		} else if (lifetimeSpentKop >= 15000000 || lifetimeEarnedKop >= 1500000) {
			if (patientTierId !== "family") {
				patientTierId = "gold";
			}
		}
		const tierDef = getLoyaltyTierDefinition(patientTierId);
		const maxCoverage = p.allowFullCoverage ? 100 : tierDef.maxInvoiceCoveragePercent;

		const activePoints = Number(balance?.activePoints ?? 0);
		const coverage = calculateMaxRedeemablePoints(effectiveInvoiceAmountRub, activePoints, maxCoverage);

		if (p.pointsToHold > coverage.maxAllowedPoints) return { limitExceeded: true as const, maxAllowedPoints: coverage.maxAllowedPoints };
		if (p.pointsToHold > activePoints) return { insufficientPoints: true as const, activePoints };

		const activePointsKop = parseKopecks(balance?.activePoints ?? 0);
		const pendingPointsKop = parseKopecks(balance?.pendingPoints ?? 0);
		const pointsToHoldKop = parseKopecks(p.pointsToHold);

		const newActivePointsKop = Math.max(0, activePointsKop - pointsToHoldKop);
		const newPendingPointsKop = sumKopecks([pendingPointsKop, pointsToHoldKop]);
		const newActivePointsStr = kopecksToNumericString(newActivePointsKop);
		const newPendingPointsStr = kopecksToNumericString(newPendingPointsKop);
		const newActivePoints = Number(newActivePointsStr);
		const newPendingPoints = Number(newPendingPointsStr);
		const heldPointsExact = Number(kopecksToNumericString(pointsToHoldKop));

		await tx.update(patientBonusBalances).set({
			activePoints: newActivePointsStr,
			pendingPoints: newPendingPointsStr,
			updatedAt: new Date(),
		}).where(and(eq(patientBonusBalances.organizationId, p.orgId), eq(patientBonusBalances.patientId, p.patientId)));

		const [txRecord] = await tx.insert(bonusTransactions).values({
			organizationId: p.orgId,
			patientId: p.patientId,
			amountPoints: kopecksToNumericString(-pointsToHoldKop),
			balanceAfterPoints: newActivePointsStr,
			type: "hold_payment",
			relatedInvoiceId: p.invoiceId || null,
			clientMutationId: p.clientMutationId || null,
			description: p.description,
		}).returning();

		if (!txRecord) {
			throw new Error("Не удалось создать запись холда бонусных баллов");
		}

		return {
			success: true as const,
			holdId: txRecord.id,
			heldPoints: heldPointsExact,
			newActivePoints,
			newPendingPoints,
		};
	});
}

export interface ExecuteConfirmHoldParams {
	readonly orgId: string;
	readonly holdId: string;
	readonly paymentId?: string | null | undefined;
	readonly clientMutationId?: string | undefined;
}

export async function executeBonusConfirm(p: ExecuteConfirmHoldParams) {
	return db.transaction(async (tx) => {
		const [holdTx] = await tx.select().from(bonusTransactions).where(
			and(
				eq(bonusTransactions.organizationId, p.orgId),
				eq(bonusTransactions.id, p.holdId),
				eq(bonusTransactions.type, "hold_payment"),
			),
		).limit(1).for("update");

		if (!holdTx) return { holdNotFound: true as const, message: "Активный холд бонусов не найден" };

		const heldPoints = Math.abs(Number(holdTx.amountPoints));
		const [balance] = await tx.select().from(patientBonusBalances).where(
			and(
				eq(patientBonusBalances.organizationId, p.orgId),
				eq(patientBonusBalances.patientId, holdTx.patientId),
			),
		).limit(1).for("update");

		const heldPointsKop = parseKopecks(heldPoints);
		const pendingPointsKop = parseKopecks(balance?.pendingPoints ?? 0);
		const lifetimeSpentKop = parseKopecks(balance?.lifetimeSpentPoints ?? 0);
		const newPendingKop = Math.max(0, pendingPointsKop - heldPointsKop);
		const newSpentKop = sumKopecks([lifetimeSpentKop, heldPointsKop]);
		const newPendingStr = kopecksToNumericString(newPendingKop);
		const newSpentStr = kopecksToNumericString(newSpentKop);
		const newPending = Number(newPendingStr);

		await tx.update(patientBonusBalances).set({
			pendingPoints: newPendingStr,
			lifetimeSpentPoints: newSpentStr,
			updatedAt: new Date(),
		}).where(
			and(
				eq(patientBonusBalances.organizationId, p.orgId),
				eq(patientBonusBalances.patientId, holdTx.patientId),
			),
		);

		// FIFO: Deduct from earliest expiring accrual batches upon confirm
		await deductUnspentPointsFifo(tx, { orgId: p.orgId, patientId: holdTx.patientId, pointsToDeduct: heldPoints });

		await tx.update(bonusTransactions).set({
			type: "redemption_payment",
			relatedPaymentId: p.paymentId || null,
			description: `${holdTx.description} (подтверждено)`,
		}).where(
			and(
				eq(bonusTransactions.organizationId, p.orgId),
				eq(bonusTransactions.id, p.holdId),
			),
		);

		return {
			success: true as const,
			holdId: p.holdId,
			confirmedPoints: heldPoints,
			newPendingPoints: newPending,
			status: "confirmed" as const,
		};
	});
}

export interface ExecuteReleaseHoldParams {
	readonly orgId: string;
	readonly holdId: string;
	readonly reason: string;
}

export async function executeBonusRelease(p: ExecuteReleaseHoldParams) {
	return db.transaction(async (tx) => {
		const [holdTx] = await tx.select().from(bonusTransactions).where(
			and(
				eq(bonusTransactions.organizationId, p.orgId),
				eq(bonusTransactions.id, p.holdId),
				eq(bonusTransactions.type, "hold_payment"),
			),
		).limit(1).for("update");

		if (!holdTx) return { holdNotFound: true as const, message: "Активный холд бонусов не найден" };

		const heldPoints = Math.abs(Number(holdTx.amountPoints));
		const [balance] = await tx.select().from(patientBonusBalances).where(
			and(
				eq(patientBonusBalances.organizationId, p.orgId),
				eq(patientBonusBalances.patientId, holdTx.patientId),
			),
		).limit(1).for("update");

		const heldPointsKop = parseKopecks(heldPoints);
		const activePointsKop = parseKopecks(balance?.activePoints ?? 0);
		const pendingPointsKop = parseKopecks(balance?.pendingPoints ?? 0);
		const newActiveKop = sumKopecks([activePointsKop, heldPointsKop]);
		const newPendingKop = Math.max(0, pendingPointsKop - heldPointsKop);
		const newActiveStr = kopecksToNumericString(newActiveKop);
		const newPendingStr = kopecksToNumericString(newPendingKop);
		const newActive = Number(newActiveStr);
		const newPending = Number(newPendingStr);

		await tx.update(patientBonusBalances).set({
			activePoints: newActiveStr,
			pendingPoints: newPendingStr,
			updatedAt: new Date(),
		}).where(
			and(
				eq(patientBonusBalances.organizationId, p.orgId),
				eq(patientBonusBalances.patientId, holdTx.patientId),
			),
		);

		await tx.update(bonusTransactions).set({
			type: "hold_released",
			description: `${holdTx.description} (снят: ${p.reason})`,
		}).where(
			and(
				eq(bonusTransactions.organizationId, p.orgId),
				eq(bonusTransactions.id, p.holdId),
			),
		);

		return {
			success: true as const,
			holdId: p.holdId,
			releasedPoints: heldPoints,
			newActivePoints: newActive,
			newPendingPoints: newPending,
			status: "released" as const,
		};
	});
}
