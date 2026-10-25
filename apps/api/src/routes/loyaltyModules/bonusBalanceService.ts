import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { bonusTransactions, patientBonusBalances, patients } from "../../db/schema.js";

export interface AccruePointsParams {
	readonly orgId: string;
	readonly patientId: string;
	readonly amountPoints: number;
	readonly description: string;
	readonly txType: string;
	readonly expiresInDays: number;
	readonly relatedPaymentId?: string | null | undefined;
	readonly relatedInvoiceId?: string | null | undefined;
}

export async function executeBonusAccrual(params: AccruePointsParams) {
	const { orgId, patientId, amountPoints, description, txType, expiresInDays, relatedPaymentId, relatedInvoiceId } = params;
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + expiresInDays);

	return db.transaction(async (tx) => {
		const [patient] = await tx
			.select({ id: patients.id, fullName: patients.fullName })
			.from(patients)
			.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
			.limit(1)
			.for("update");

		if (!patient) return { notFound: true as const };

		const [existingBalance] = await tx
			.select()
			.from(patientBonusBalances)
			.where(and(eq(patientBonusBalances.organizationId, orgId), eq(patientBonusBalances.patientId, patientId)))
			.limit(1)
			.for("update");

		const currentActive = Number(existingBalance?.activePoints ?? 0);
		const currentLifetime = Number(existingBalance?.lifetimeEarnedPoints ?? 0);
		const newActive = Number((currentActive + amountPoints).toFixed(2));
		const newLifetime = Number((currentLifetime + amountPoints).toFixed(2));

		if (existingBalance) {
			await tx
				.update(patientBonusBalances)
				.set({ activePoints: String(newActive), lifetimeEarnedPoints: String(newLifetime), updatedAt: new Date() })
				.where(and(eq(patientBonusBalances.organizationId, orgId), eq(patientBonusBalances.patientId, patientId)));
		} else {
			await tx.insert(patientBonusBalances).values({
				organizationId: orgId, patientId, activePoints: String(newActive), lifetimeEarnedPoints: String(newLifetime),
			});
		}

		const [txRecord] = await tx
			.insert(bonusTransactions)
			.values({
				organizationId: orgId, patientId, amountPoints: String(amountPoints), balanceAfterPoints: String(newActive),
				type: txType, description, expiresAt, unspentPoints: String(amountPoints),
				relatedPaymentId: relatedPaymentId || null, relatedInvoiceId: relatedInvoiceId || null,
			})
			.returning();

		return {
			success: true as const,
			accruedPoints: amountPoints,
			activePoints: newActive,
			transaction: { id: txRecord?.id || "accrual", amountPoints, balanceAfterPoints: newActive, description },
		};
	});
}
