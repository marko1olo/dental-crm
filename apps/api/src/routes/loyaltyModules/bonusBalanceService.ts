import { and, asc, desc, eq, gt, isNotNull, lte, sql } from "drizzle-orm";
import { getLoyaltyTierDefinition, type LoyaltyTierId, kopecksToNumericString, parseKopecks, sumKopecks } from "@dental/shared";
import { withTenantCtx, type TenantDb } from "../../db/rls.js";
import { bonusTransactions, patientBonusBalances, patients } from "../../db/schema.js";

type DatabaseTransaction = TenantDb;

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

export async function executeBonusAccrual(params: AccruePointsParams, txClient?: DatabaseTransaction) {
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

	const execute = async (tx: DatabaseTransaction) => {
		if (clientMutationId) {
			const [existingByMutation] = await tx
				.select({
					id: bonusTransactions.id,
					amountPoints: bonusTransactions.amountPoints,
					balanceAfterPoints: bonusTransactions.balanceAfterPoints,
					description: bonusTransactions.description,
					expiresAt: bonusTransactions.expiresAt,
				})
				.from(bonusTransactions)
				.where(
					and(
						eq(bonusTransactions.organizationId, orgId),
						eq(bonusTransactions.clientMutationId, clientMutationId),
					),
				)
				.limit(1)
				.for("update");

			if (existingByMutation) {
				const existingPoints = Math.abs(Number(existingByMutation.amountPoints || 0));
				const currentActive = Number(existingByMutation.balanceAfterPoints || 0);
				return {
					success: true as const,
					duplicate: true as const,
					replayed: true as const,
					existingTransactionId: existingByMutation.id,
					accruedPoints: existingPoints,
					activePoints: currentActive,
					transaction: {
						id: existingByMutation.id,
						amountPoints: existingPoints,
						balanceAfterPoints: currentActive,
						description: existingByMutation.description,
						expiresAt: existingByMutation.expiresAt?.toISOString() || expiresAt.toISOString(),
					},
				};
			}
		}

		if (relatedPaymentId) {
			const [existingAccrual] = await tx
				.select({
					id: bonusTransactions.id,
					amountPoints: bonusTransactions.amountPoints,
					balanceAfterPoints: bonusTransactions.balanceAfterPoints,
				})
				.from(bonusTransactions)
				.where(
					and(
						eq(bonusTransactions.organizationId, orgId),
						eq(bonusTransactions.relatedPaymentId, relatedPaymentId),
						eq(bonusTransactions.type, txType),
					),
				)
				.limit(1)
				.for("update");

			if (existingAccrual) {
				const activeKop = Number(existingAccrual.balanceAfterPoints || 0);
				return {
					success: true as const,
					duplicate: true as const,
					replayed: true as const,
					existingTransactionId: existingAccrual.id,
					accruedPoints: Math.abs(Number(existingAccrual.amountPoints || 0)),
					activePoints: activeKop,
				};
			}
		}

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

		const currentActiveKop = parseKopecks(existingBalance?.activePoints ?? 0);
		const currentLifetimeKop = parseKopecks(existingBalance?.lifetimeEarnedPoints ?? 0);
		const amountPointsKop = parseKopecks(amountPoints);

		const newActiveKop = sumKopecks([currentActiveKop, amountPointsKop]);
		const newLifetimeKop = sumKopecks([currentLifetimeKop, amountPointsKop]);

		const newActiveStr = kopecksToNumericString(newActiveKop);
		const newLifetimeStr = kopecksToNumericString(newLifetimeKop);
		const newActive = Number(newActiveStr);

		if (existingBalance) {
			await tx
				.update(patientBonusBalances)
				.set({
					activePoints: newActiveStr,
					lifetimeEarnedPoints: newLifetimeStr,
					updatedAt: new Date(),
				})
				.where(and(eq(patientBonusBalances.organizationId, orgId), eq(patientBonusBalances.patientId, patientId)));
		} else {
			await tx.insert(patientBonusBalances).values({
				organizationId: orgId,
				patientId,
				activePoints: newActiveStr,
				lifetimeEarnedPoints: newLifetimeStr,
				lifetimeSpentPoints: "0.00",
				lifetimeExpiredPoints: "0.00",
			});
		}

		const [txRecord] = await tx
			.insert(bonusTransactions)
			.values({
				organizationId: orgId,
				patientId,
				amountPoints: kopecksToNumericString(amountPointsKop),
				balanceAfterPoints: newActiveStr,
				type: txType,
				description,
				expiresAt,
				unspentPoints: kopecksToNumericString(amountPointsKop),
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
	};

	if (txClient) {
		return await execute(txClient);
	}
	return withTenantCtx(orgId, execute);
}

/**
 * Deduct unspent points in FIFO order (Earliest Expiring First)
 * to ensure that patients do not lose fresh points when redeeming bonuses.
 */
export async function deductUnspentPointsFifo(
	tx: DatabaseTransaction,
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

	let remainingToDeductKop = parseKopecks(pointsToDeduct);

	for (const accrual of activeAccruals) {
		if (remainingToDeductKop <= 0) break;
		const unspentKop = parseKopecks(accrual.unspentPoints ?? 0);
		if (unspentKop <= 0) continue;

		if (unspentKop <= remainingToDeductKop) {
			remainingToDeductKop = remainingToDeductKop - unspentKop;
			await tx
				.update(bonusTransactions)
				.set({ unspentPoints: "0.00" })
				.where(and(eq(bonusTransactions.organizationId, orgId), eq(bonusTransactions.id, accrual.id)));
		} else {
			const newUnspentKop = unspentKop - remainingToDeductKop;
			remainingToDeductKop = 0;
			await tx
				.update(bonusTransactions)
				.set({ unspentPoints: kopecksToNumericString(newUnspentKop) })
				.where(and(eq(bonusTransactions.organizationId, orgId), eq(bonusTransactions.id, accrual.id)));
		}
	}

	const totalDeductedKop = parseKopecks(pointsToDeduct) - remainingToDeductKop;
	return { deductedPoints: Number(kopecksToNumericString(totalDeductedKop)) };
}

/**
 * Restore unspent points back onto active positive accrual batches when a hold is released.
 * Restores in latest-expiring order first so earlier batches remain prioritized for FIFO usage.
 */
export async function restoreUnspentPointsOnRelease(
	tx: DatabaseTransaction,
	params: {
		readonly orgId: string;
		readonly patientId: string;
		readonly pointsToRestore: number;
	},
): Promise<void> {
	const { orgId, patientId, pointsToRestore } = params;
	if (pointsToRestore <= 0) return;

	const accrualBatches = await tx
		.select()
		.from(bonusTransactions)
		.where(
			and(
				eq(bonusTransactions.organizationId, orgId),
				eq(bonusTransactions.patientId, patientId),
				gt(sql`cast(${bonusTransactions.amountPoints} as numeric)`, 0),
			),
		)
		.orderBy(desc(bonusTransactions.expiresAt), desc(bonusTransactions.createdAt))
		.for("update");

	let remainingKop = parseKopecks(pointsToRestore);
	for (const batch of accrualBatches) {
		if (remainingKop <= 0) break;
		const totalKop = parseKopecks(batch.amountPoints ?? 0);
		const curUnspentKop = parseKopecks(batch.unspentPoints ?? 0);
		const capacityKop = Math.max(0, totalKop - curUnspentKop);
		if (capacityKop <= 0) continue;

		const addKop = Math.min(capacityKop, remainingKop);
		remainingKop -= addKop;
		await tx
			.update(bonusTransactions)
			.set({ unspentPoints: kopecksToNumericString(curUnspentKop + addKop) })
			.where(and(eq(bonusTransactions.organizationId, orgId), eq(bonusTransactions.id, batch.id)));
	}
}

/**
 * Process expired bonuses for a single patient atomically.
 * Moves expired points from activePoints to lifetimeExpiredPoints and writes an audit ledger entry.
 */
export async function processPatientExpiredBonuses(
	tx: DatabaseTransaction,
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

	let totalUnspentExpiredKop = 0;
	for (const row of expiredAccruals) {
		totalUnspentExpiredKop = sumKopecks([totalUnspentExpiredKop, parseKopecks(row.unspentPoints ?? 0)]);
	}

	if (totalUnspentExpiredKop <= 0) {
		return { expiredPoints: 0, expiredTransactionsCount: 0 };
	}

	const [balance] = await tx
		.select()
		.from(patientBonusBalances)
		.where(and(eq(patientBonusBalances.organizationId, orgId), eq(patientBonusBalances.patientId, patientId)))
		.limit(1)
		.for("update");

	const currentActiveKop = parseKopecks(balance?.activePoints ?? 0);
	// Red Team Blind-Spot #2: activePoints must never go negative (greatest(0, activePoints - expired))
	const actualExpiredKop = Math.min(currentActiveKop, totalUnspentExpiredKop);
	const newActiveKop = Math.max(0, currentActiveKop - actualExpiredKop);
	const currentExpiredKop = parseKopecks(balance?.lifetimeExpiredPoints ?? 0);
	const newLifetimeExpiredKop = sumKopecks([currentExpiredKop, actualExpiredKop]);

	const newActiveStr = kopecksToNumericString(newActiveKop);
	const newLifetimeExpiredStr = kopecksToNumericString(newLifetimeExpiredKop);
	const actualExpired = Number(kopecksToNumericString(actualExpiredKop));

	if (balance) {
		await tx
			.update(patientBonusBalances)
			.set({
				activePoints: newActiveStr,
				lifetimeExpiredPoints: newLifetimeExpiredStr,
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

	if (actualExpiredKop > 0) {
		await tx.insert(bonusTransactions).values({
			organizationId: orgId,
			patientId,
			amountPoints: kopecksToNumericString(-actualExpiredKop),
			balanceAfterPoints: newActiveStr,
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
	txClient?: DatabaseTransaction | undefined,
): Promise<{
	readonly processedPatients: number;
	readonly totalExpiredPoints: number;
	readonly expiredTransactionsCount: number;
}> {
	const run = async (tx: DatabaseTransaction) => {
		// Find all distinct patientIds with expired unspent bonuses
		const expiredCandidates = await tx
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

		let totalExpiredPointsKop = 0;
		let totalExpiredCount = 0;
		let processedPatients = 0;

		for (const candidate of expiredCandidates) {
			const res = await processPatientExpiredBonuses(tx, orgId, candidate.patientId, asOfDate);
			if (res.expiredPoints > 0 || res.expiredTransactionsCount > 0) {
				processedPatients += 1;
				totalExpiredPointsKop = sumKopecks([totalExpiredPointsKop, parseKopecks(res.expiredPoints)]);
				totalExpiredCount += res.expiredTransactionsCount;
			}
		}

		return {
			processedPatients,
			totalExpiredPoints: Number(kopecksToNumericString(totalExpiredPointsKop)),
			expiredTransactionsCount: totalExpiredCount,
		};
	};

	return txClient ? run(txClient) : withTenantCtx(orgId, run);
}

/**
 * Get patient bonus balance with JIT TTL evaluation.
 * Evaluates and burns expired points lazily on read so the balance is always strictly fresh.
 */
export async function getPatientBonusBalance(params: {
	readonly orgId: string;
	readonly patientId: string;
	readonly asOfDate?: Date | undefined;
	readonly txClient?: DatabaseTransaction | undefined;
}) {
	const { orgId, patientId, asOfDate = new Date(), txClient } = params;

	const run = async (tx: DatabaseTransaction) => {
		const [patient] = await tx
			.select({ id: patients.id, fullName: patients.fullName, familyGroupId: patients.familyGroupId })
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

		let tierId: LoyaltyTierId = "silver";
		if (patient.familyGroupId) {
			tierId = "family";
		}
		const lifetimeSpentKop = parseKopecks(balance?.lifetimeSpentPoints ?? 0);
		const lifetimeEarnedKop = parseKopecks(balance?.lifetimeEarnedPoints ?? 0);
		if (lifetimeSpentKop >= 40000000 || lifetimeEarnedKop >= 4000000) {
			tierId = "platinum";
		} else if (lifetimeSpentKop >= 15000000 || lifetimeEarnedKop >= 1500000) {
			if (tierId !== "family") {
				tierId = "gold";
			}
		}
		const tierDef = getLoyaltyTierDefinition(tierId);

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
			tier: tierDef.id,
			tierNameRu: tierDef.nameRu,
			cashbackPercent: tierDef.cashbackPercent,
			maxInvoiceCoveragePercent: tierDef.maxInvoiceCoveragePercent,
			pointRateRub: 1.0,
		};
	};

	return txClient ? run(txClient) : withTenantCtx(orgId, run);
}
