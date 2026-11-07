import { calculateMaxRedeemablePoints } from "@dental/shared";
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
	readonly allowFullCoverage: boolean;
	readonly clientMutationId?: string | undefined;
	readonly description: string;
}

export async function executeBonusRedeem(p: ExecuteRedeemParams) {
	return db.transaction(async (tx) => {
		const [patient] = await tx.select({ id: patients.id }).from(patients).where(and(eq(patients.organizationId, p.orgId), eq(patients.id, p.patientId))).limit(1).for("update");
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

		const activePoints = Number(balance?.activePoints ?? 0);
		const maxCoverage = p.allowFullCoverage !== false ? 100 : 30;
		const coverage = calculateMaxRedeemablePoints(effectiveInvoiceAmountRub, activePoints, maxCoverage);

		if (p.pointsToRedeem > coverage.maxAllowedPoints) return { limitExceeded: true as const, maxAllowedPoints: coverage.maxAllowedPoints };
		if (p.pointsToRedeem > activePoints) return { insufficientPoints: true as const, activePoints };

		const currentLifetimeSpent = Number(balance?.lifetimeSpentPoints ?? 0);
		const newActivePoints = Number((activePoints - p.pointsToRedeem).toFixed(2));
		const newLifetimeSpent = Number((currentLifetimeSpent + p.pointsToRedeem).toFixed(2));

		await tx.update(patientBonusBalances).set({ activePoints: String(newActivePoints), lifetimeSpentPoints: String(newLifetimeSpent), updatedAt: new Date() }).where(and(eq(patientBonusBalances.organizationId, p.orgId), eq(patientBonusBalances.patientId, p.patientId)));

		// FIFO: Deduct from earliest expiring accrual batches first
		await deductUnspentPointsFifo(tx, { orgId: p.orgId, patientId: p.patientId, pointsToDeduct: p.pointsToRedeem });


		let paymentId: string | null = null;
		let invoiceStatusUpdated = false;

		if (p.invoiceId) {
			const [payment] = await tx.insert(payments).values({ organizationId: p.orgId, patientId: p.patientId, documentId: p.invoiceId, amountRub: p.pointsToRedeem, method: "other", status: "paid", paidAt: new Date(), note: `Оплата баллами (${p.pointsToRedeem} б.)` }).returning({ id: payments.id });
			paymentId = payment?.id ?? null;

			const existingPayments = await tx.select({ amountRub: payments.amountRub }).from(payments).where(and(eq(payments.organizationId, p.orgId), eq(payments.documentId, p.invoiceId), eq(payments.status, "paid")));
			const totalPaidRub = existingPayments.reduce((acc, pay) => acc + Number(pay.amountRub), 0);
			if (totalPaidRub >= effectiveInvoiceAmountRub) {
				await tx.update(patientInvoices).set({ status: "paid", paidAt: new Date() }).where(and(eq(patientInvoices.organizationId, p.orgId), eq(patientInvoices.id, p.invoiceId)));
				invoiceStatusUpdated = true;
			}
		}

		const [txRecord] = await tx.insert(bonusTransactions).values({ organizationId: p.orgId, patientId: p.patientId, amountPoints: String(-p.pointsToRedeem), balanceAfterPoints: String(newActivePoints), type: "redemption_payment", relatedPaymentId: paymentId || null, relatedInvoiceId: p.invoiceId || null, clientMutationId: p.clientMutationId || null, description: p.description }).returning();

		return {
			success: true as const, redeemedPoints: p.pointsToRedeem, discountRub: p.pointsToRedeem, remainingInvoicePaymentRub: Number(Math.max(0, effectiveInvoiceAmountRub - p.pointsToRedeem).toFixed(2)), newActivePoints, paymentId, invoiceStatusUpdated, transactionId: txRecord?.id || "redemption",
		};
	});
}

export interface ExecuteHoldParams {
	readonly orgId: string;
	readonly patientId: string;
	readonly invoiceId?: string | null | undefined;
	readonly invoiceAmountRub: number;
	readonly pointsToHold: number;
	readonly allowFullCoverage: boolean;
	readonly clientMutationId?: string | undefined;
	readonly description: string;
}

export async function executeBonusHold(p: ExecuteHoldParams) {
	return db.transaction(async (tx) => {
		const [patient] = await tx.select({ id: patients.id }).from(patients).where(and(eq(patients.organizationId, p.orgId), eq(patients.id, p.patientId))).limit(1).for("update");
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

		const activePoints = Number(balance?.activePoints ?? 0);
		const pendingPoints = Number(balance?.pendingPoints ?? 0);
		const maxCoverage = p.allowFullCoverage !== false ? 100 : 30;
		const coverage = calculateMaxRedeemablePoints(effectiveInvoiceAmountRub, activePoints, maxCoverage);

		if (p.pointsToHold > coverage.maxAllowedPoints) return { limitExceeded: true as const, maxAllowedPoints: coverage.maxAllowedPoints };
		if (p.pointsToHold > activePoints) return { insufficientPoints: true as const, activePoints };

		const newActivePoints = Number((activePoints - p.pointsToHold).toFixed(2));
		const newPendingPoints = Number((pendingPoints + p.pointsToHold).toFixed(2));

		await tx.update(patientBonusBalances).set({
			activePoints: String(newActivePoints),
			pendingPoints: String(newPendingPoints),
			updatedAt: new Date(),
		}).where(and(eq(patientBonusBalances.organizationId, p.orgId), eq(patientBonusBalances.patientId, p.patientId)));

		const [txRecord] = await tx.insert(bonusTransactions).values({
			organizationId: p.orgId,
			patientId: p.patientId,
			amountPoints: String(-p.pointsToHold),
			balanceAfterPoints: String(newActivePoints),
			type: "hold_payment",
			relatedInvoiceId: p.invoiceId || null,
			clientMutationId: p.clientMutationId || null,
			description: p.description,
		}).returning();

		return {
			success: true as const,
			holdId: txRecord.id,
			heldPoints: p.pointsToHold,
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

		const pendingPoints = Number(balance?.pendingPoints ?? 0);
		const lifetimeSpent = Number(balance?.lifetimeSpentPoints ?? 0);
		const newPending = Math.max(0, Number((pendingPoints - heldPoints).toFixed(2)));
		const newSpent = Number((lifetimeSpent + heldPoints).toFixed(2));

		await tx.update(patientBonusBalances).set({
			pendingPoints: String(newPending),
			lifetimeSpentPoints: String(newSpent),
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

		const activePoints = Number(balance?.activePoints ?? 0);
		const pendingPoints = Number(balance?.pendingPoints ?? 0);
		const newActive = Number((activePoints + heldPoints).toFixed(2));
		const newPending = Math.max(0, Number((pendingPoints - heldPoints).toFixed(2)));

		await tx.update(patientBonusBalances).set({
			activePoints: String(newActive),
			pendingPoints: String(newPending),
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
