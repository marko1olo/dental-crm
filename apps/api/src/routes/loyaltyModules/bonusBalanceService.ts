import { and, asc, eq, gt, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { bonusTransactions, patientBonusBalances, patients } from "../../db/schema.js";

export interface AccruePointsParams {
	readonly orgId: string;
	readonly patientId: string;
	readonly amountPoints: number;
	readonly description: string;
	readonly txType: string;
	readonly expiresInDays?: number | undefined;
	readonly expiresAt?: Date | undefined;
	readonly relatedPaymentId?: string | null | undefined;
	readonly relatedInvoiceId?: string | null | undefined;
	readonly clientMutationId?: string | null | undefined;
}

export async function executeBonusAccrual(params: AccruePointsParams) {
	const {
		orgId,
		patientId,
		amountPoints,
		description,
		txType,
		expiresInDays = 180,
		expiresAt: customExpiresAt,
		relatedPaymentId,
		relatedInvoiceId,
		clientMutationId,
	} = params;

	let expiresAt: Date;
	if (customExpiresAt) {
		expiresAt = customExpiresAt;
	} else {
		expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + expiresInDays);
	}

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
				.set({
					activePoints: String(newActive),
					lifetimeEarnedPoints: String(newLifetime),
					updatedAt: new Date(),
				})
				.where(and(eq(patientBonusBalances.organizationId, orgId), eq(patientBonusBalances.patientId, patientId)));
		} else {
			await tx.insert(patientBonusBalances).values({
				organizationId: orgId,
				patientId,
				activePoints: String(newActive),
				lifetimeEarnedPoints: String(newLifetime),
				lifetimeSpentPoints: "0.00",
				lifetimeExpiredPoints: "0.00",
			});
		}

		const [txRecord] = await tx
			.insert(bonusTransactions)
			.values({
				organizationId: orgId,
				patientId,
				amountPoints: String(amountPoints),
				balanceAfterPoints: String(newActive),
				type: txType,
				description,
				expiresAt,
				unspentPoints: String(amountPoints),
				relatedPaymentId: relatedPaymentId || null,
				relatedInvoiceId: relatedInvoiceId || null,
				clientMutationId: clientMutationId || null,
			})
			.returning();

		return {
			success: true as const,
			accruedPoints: amountPoints,
			activePoints: newActive,
			transaction: {
				id: txRecord?.id || "accrual",
				amountPoints,
				balanceAfterPoints: newActive,
				description,
				expiresAt: expiresAt.toISOString(),
			},
		};
	});
}

/**
 * Deduct unspent points in FIFO order (Earliest Expiring First)
 * to ensure that patients do not lose fresh points when redeeming bonuses.
 */
export async function deductUnspentPointsFifo(
	tx: any,
	params: {
		readonly orgId: string;
		readonly patientId: string;
		readonly pointsToDeduct: number;
	},
): Promise<{ readonly deductedPoints: number }> {
	const { orgId, patientId, pointsToDeduct } = params;
	if (pointsToDeduct <= 0) return { deductedPoints: 0 };

	const activeAccruals = await tx
		.select()
		.from(bonusTransactions)
		.where(
			and(
				eq(bonusTransactions.organizationId, orgId),
				eq(bonusTransactions.patientId, patientId),
				gt(sql`cast(${bonusTransactions.unspentPoints} as numeric)`, 0),
				gt(sql`cast(${bonusTransactions.amountPoints} as numeric)`, 0),
			),
		)
		.orderBy(asc(bonusTransactions.expiresAt), asc(bonusTransactions.createdAt))
		.for("update");

	let remainingToDeduct = pointsToDeduct;

	for (const accrual of activeAccruals) {
		if (remainingToDeduct <= 0) break;
		const unspent = Number(accrual.unspentPoints ?? 0);
		if (unspent <= 0) continue;

		if (unspent <= remainingToDeduct) {
			remainingToDeduct = Number((remainingToDeduct - unspent).toFixed(2));
			await tx
				.update(bonusTransactions)
				.set({ unspentPoints: "0.00" })
				.where(and(eq(bonusTransactions.organizationId, orgId), eq(bonusTransactions.id, accrual.id)));
		} else {
			const newUnspent = Number((unspent - remainingToDeduct).toFixed(2));
			remainingToDeduct = 0;
			await tx
				.update(bonusTransactions)
				.set({ unspentPoints: String(newUnspent) })
				.where(and(eq(bonusTransactions.organizationId, orgId), eq(bonusTransactions.id, accrual.id)));
		}
	}

	return { deductedPoints: Number((pointsToDeduct - remainingToDeduct).toFixed(2)) };
}

/**
 * Process expired bonuses for a single patient atomically.
 * Moves expired points from activePoints to lifetimeExpiredPoints and writes an audit ledger entry.
 */
export async function processPatientExpiredBonuses(
	tx: any,
	orgId: string,
	patientId: string,
	asOfDate: Date = new Date(),
): Promise<{
	readonly expiredPoints: number;
	readonly expiredTransactionsCount: number;
}> {
	const expiredAccruals = await tx
		.select()
		.from(bonusTransactions)
		.where(
			and(
				eq(bonusTransactions.organizationId, orgId),
				eq(bonusTransactions.patientId, patientId),
				isNotNull(bonusTransactions.expiresAt),
				lte(bonusTransactions.expiresAt, asOfDate),
				gt(sql`cast(${bonusTransactions.unspentPoints} as numeric)`, 0),
			),
		)
		.for("update");

	if (expiredAccruals.length === 0) {
		return { expiredPoints: 0, expiredTransactionsCount: 0 };
	}

	let totalUnspentExpired = 0;
	for (const row of expiredAccruals) {
		totalUnspentExpired += Number(row.unspentPoints ?? 0);
	}
	totalUnspentExpired = Number(totalUnspentExpired.toFixed(2));

	if (totalUnspentExpired <= 0) {
		return { expiredPoints: 0, expiredTransactionsCount: 0 };
	}

	const [balance] = await tx
		.select()
		.from(patientBonusBalances)
		.where(and(eq(patientBonusBalances.organizationId, orgId), eq(patientBonusBalances.patientId, patientId)))
		.limit(1)
		.for("update");

	const currentActive = Number(balance?.activePoints ?? 0);
	// Red Team Blind-Spot #2: activePoints must never go negative (greatest(0, activePoints - expired))
	const actualExpired = Math.min(currentActive, totalUnspentExpired);
	const newActive = Math.max(0, Number((currentActive - actualExpired).toFixed(2)));
	const currentExpired = Number(balance?.lifetimeExpiredPoints ?? 0);
	const newLifetimeExpired = Number((currentExpired + actualExpired).toFixed(2));

	if (balance) {
		await tx
			.update(patientBonusBalances)
			.set({
				activePoints: String(newActive),
				lifetimeExpiredPoints: String(newLifetimeExpired),
				updatedAt: asOfDate,
			})
			.where(and(eq(patientBonusBalances.organizationId, orgId), eq(patientBonusBalances.patientId, patientId)));
	}

	// Zero out unspentPoints on expired accruals
	for (const row of expiredAccruals) {
		await tx
			.update(bonusTransactions)
			.set({ unspentPoints: "0.00" })
			.where(and(eq(bonusTransactions.organizationId, orgId), eq(bonusTransactions.id, row.id)));
	}

	if (actualExpired > 0) {
		await tx.insert(bonusTransactions).values({
			organizationId: orgId,
			patientId,
			amountPoints: String(-actualExpired),
			balanceAfterPoints: String(newActive),
			type: "expired",
			description: `Истечение срока действия бонусов (${actualExpired} б.)`,
			createdAt: asOfDate,
		});
	}

	return {
		expiredPoints: actualExpired,
		expiredTransactionsCount: expiredAccruals.length,
	};
}

/**
 * Background / Cron service to process expired bonuses across the entire organization.
 */
export async function processExpiredBonuses(
	orgId: string,
	asOfDate: Date = new Date(),
): Promise<{
	readonly processedPatients: number;
	readonly totalExpiredPoints: number;
	readonly expiredTransactionsCount: number;
}> {
	// Find all distinct patientIds with expired unspent bonuses
	const expiredCandidates = await db
		.selectDistinct({ patientId: bonusTransactions.patientId })
		.from(bonusTransactions)
		.where(
			and(
				eq(bonusTransactions.organizationId, orgId),
				isNotNull(bonusTransactions.expiresAt),
				lte(bonusTransactions.expiresAt, asOfDate),
				gt(sql`cast(${bonusTransactions.unspentPoints} as numeric)`, 0),
			),
		);

	if (expiredCandidates.length === 0) {
		return { processedPatients: 0, totalExpiredPoints: 0, expiredTransactionsCount: 0 };
	}

	let totalExpiredPoints = 0;
	let totalExpiredCount = 0;
	let processedPatients = 0;

	for (const candidate of expiredCandidates) {
		const res = await db.transaction(async (tx) => {
			return processPatientExpiredBonuses(tx, orgId, candidate.patientId, asOfDate);
		});
		if (res.expiredPoints > 0 || res.expiredTransactionsCount > 0) {
			processedPatients += 1;
			totalExpiredPoints = Number((totalExpiredPoints + res.expiredPoints).toFixed(2));
			totalExpiredCount += res.expiredTransactionsCount;
		}
	}

	return {
		processedPatients,
		totalExpiredPoints,
		expiredTransactionsCount: totalExpiredCount,
	};
}

/**
 * Get patient bonus balance with JIT TTL evaluation.
 * Evaluates and burns expired points lazily on read so the balance is always strictly fresh.
 */
export async function getPatientBonusBalance(params: {
	readonly orgId: string;
	readonly patientId: string;
	readonly asOfDate?: Date | undefined;
}) {
	const { orgId, patientId, asOfDate = new Date() } = params;

	return db.transaction(async (tx) => {
		const [patient] = await tx
			.select({ id: patients.id, fullName: patients.fullName })
			.from(patients)
			.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
			.limit(1);

		if (!patient) return null;

		// 1. JIT TTL evaluation (expire overdue bonuses before reading)
		await processPatientExpiredBonuses(tx, orgId, patientId, asOfDate);

		// 2. Fetch fresh balance
		const [balance] = await tx
			.select()
			.from(patientBonusBalances)
			.where(and(eq(patientBonusBalances.organizationId, orgId), eq(patientBonusBalances.patientId, patientId)))
			.limit(1);

		// 3. Find nearest expiring accrual
		const [nearestExpiring] = await tx
			.select({
				expiresAt: bonusTransactions.expiresAt,
				unspentPoints: bonusTransactions.unspentPoints,
			})
			.from(bonusTransactions)
			.where(
				and(
					eq(bonusTransactions.organizationId, orgId),
					eq(bonusTransactions.patientId, patientId),
					isNotNull(bonusTransactions.expiresAt),
					gt(bonusTransactions.expiresAt, asOfDate),
					gt(sql`cast(${bonusTransactions.unspentPoints} as numeric)`, 0),
				),
			)
			.orderBy(asc(bonusTransactions.expiresAt))
			.limit(1);

		let nearestExpiringPoints = 0;
		let nearestExpirationDate: string | null = null;
		let daysUntilNearestExpiration: number | null = null;

		if (nearestExpiring?.expiresAt) {
			nearestExpiringPoints = Number(nearestExpiring.unspentPoints ?? 0);
			nearestExpirationDate = nearestExpiring.expiresAt.toISOString();
			const diffMs = nearestExpiring.expiresAt.getTime() - asOfDate.getTime();
			daysUntilNearestExpiration = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
		}

		return {
			patientId,
			patientName: patient.fullName,
			activePoints: Number(balance?.activePoints ?? 0),
			pendingPoints: Number(balance?.pendingPoints ?? 0),
			lifetimeEarnedPoints: Number(balance?.lifetimeEarnedPoints ?? 0),
			lifetimeSpentPoints: Number(balance?.lifetimeSpentPoints ?? 0),
			lifetimeExpiredPoints: Number(balance?.lifetimeExpiredPoints ?? 0),
			nearestExpiringPoints,
			nearestExpirationDate,
			daysUntilNearestExpiration,
			tier: "bronze",
			cashbackPercent: 3.0,
			maxInvoiceCoveragePercent: 30.0,
			pointRateRub: 1.0,
		};
	});
}
