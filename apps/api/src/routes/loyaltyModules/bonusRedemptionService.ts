import { calculateMaxRedeemablePoints } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { bonusTransactions, patientBonusBalances, patientInvoices, patients, payments } from "../../db/schema.js";

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
