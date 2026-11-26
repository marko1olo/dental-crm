import {
	calculateMaxRedeemablePoints,
	kopecksToNumericString,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import { withTenantCtx, type TenantDb } from "../../db/rls.js";
import { bonusTransactions, patientBonusBalances, patients } from "../../db/schema.js";
import {
	deductUnspentPointsFifo,
	processPatientExpiredBonuses,
	restoreUnspentPointsOnRelease,
} from "./bonusBalanceService.js";
import {
	isPgUniqueViolation,
	lockAndResolveLoyaltyInvoice,
	resolvePatientLoyaltyCoveragePercent,
} from "./bonusRedemptionUtils.js";

export interface ExecuteHoldParams {
	readonly orgId: string;
	readonly patientId: string;
	readonly invoiceId?: string | null | undefined;
	readonly invoiceAmountRub: number;
	readonly pointsToHold: number;
	readonly allowFullCoverage?: boolean | undefined;
	readonly clientMutationId?: string | undefined;
	readonly description: string;
	readonly txClient?: TenantDb | undefined;
}

export async function executeBonusHold(p: ExecuteHoldParams) {
	const runInTx = async (tx: TenantDb) => {
		if (p.clientMutationId) {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${p.orgId} || ':bonus_hold:' || ${p.clientMutationId}))`,
			);
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
					.where(
						and(
							eq(patientBonusBalances.organizationId, p.orgId),
							eq(patientBonusBalances.patientId, p.patientId),
						),
					)
					.limit(1)
					.for("update");
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

		const [patient] = await tx
			.select({ id: patients.id, familyGroupId: patients.familyGroupId })
			.from(patients)
			.where(and(eq(patients.organizationId, p.orgId), eq(patients.id, p.patientId)))
			.limit(1)
			.for("update");
		if (!patient) return { notFound: true as const };

		await processPatientExpiredBonuses(tx, p.orgId, p.patientId);

		const [balance] = await tx
			.select()
			.from(patientBonusBalances)
			.where(
				and(
					eq(patientBonusBalances.organizationId, p.orgId),
					eq(patientBonusBalances.patientId, p.patientId),
				),
			)
			.limit(1)
			.for("update");

		let effectiveInvoiceAmountRub = p.invoiceAmountRub;
		if (p.invoiceId) {
			const invRes = await lockAndResolveLoyaltyInvoice(tx, {
				orgId: p.orgId,
				invoiceId: p.invoiceId,
				allowedPatientIds: [p.patientId],
			});
			if (!invRes.ok) {
				return { invalidInvoice: true as const, message: invRes.message, code: invRes.code };
			}
			effectiveInvoiceAmountRub = invRes.invoiceTotalRub;
		}

		const maxCoverage = resolvePatientLoyaltyCoveragePercent({
			hasFamilyGroup: Boolean(patient.familyGroupId),
			lifetimeSpentPoints: balance?.lifetimeSpentPoints,
			lifetimeEarnedPoints: balance?.lifetimeEarnedPoints,
			allowFullCoverage: p.allowFullCoverage,
		});

		const activePoints = Number(balance?.activePoints ?? 0);
		const coverage = calculateMaxRedeemablePoints(
			effectiveInvoiceAmountRub,
			activePoints,
			maxCoverage,
		);

		if (p.pointsToHold > coverage.maxAllowedPoints) {
			return { limitExceeded: true as const, maxAllowedPoints: coverage.maxAllowedPoints };
		}
		if (p.pointsToHold > activePoints) {
			return { insufficientPoints: true as const, activePoints };
		}

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

		await tx
			.update(patientBonusBalances)
			.set({
				activePoints: newActivePointsStr,
				pendingPoints: newPendingPointsStr,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(patientBonusBalances.organizationId, p.orgId),
					eq(patientBonusBalances.patientId, p.patientId),
				),
			);

		// Reserve FIFO unspentPoints immediately on hold so JIT TTL expiration cannot double-burn held points.
		await deductUnspentPointsFifo(tx, {
			orgId: p.orgId,
			patientId: p.patientId,
			pointsToDeduct: heldPointsExact,
		});

		const [txRecord] = await tx
			.insert(bonusTransactions)
			.values({
				organizationId: p.orgId,
				patientId: p.patientId,
				amountPoints: kopecksToNumericString(-pointsToHoldKop),
				balanceAfterPoints: newActivePointsStr,
				type: "hold_payment",
				relatedInvoiceId: p.invoiceId || null,
				clientMutationId: p.clientMutationId || null,
				description: p.description,
			})
			.returning();

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
	};

	const execTenant = () => (p.txClient ? runInTx(p.txClient) : withTenantCtx(p.orgId, runInTx));

	if (p.clientMutationId) {
		try {
			return await execTenant();
		} catch (err) {
			if (isPgUniqueViolation(err)) {
				const clientMutationId = p.clientMutationId;
				const lookupReplay = async (tx: TenantDb) => {
					const [existingHold] = await tx
						.select()
						.from(bonusTransactions)
						.where(
							and(
								eq(bonusTransactions.organizationId, p.orgId),
								eq(bonusTransactions.clientMutationId, clientMutationId),
								eq(bonusTransactions.type, "hold_payment"),
							),
						)
						.limit(1);
					if (!existingHold) return null;
					const [currBal] = await tx
						.select()
						.from(patientBonusBalances)
						.where(
							and(
								eq(patientBonusBalances.organizationId, p.orgId),
								eq(patientBonusBalances.patientId, p.patientId),
							),
						)
						.limit(1);
					return {
						success: true as const,
						replayed: true as const,
						holdId: existingHold.id,
						heldPoints: Math.abs(Number(existingHold.amountPoints)),
						newActivePoints: Number(existingHold.balanceAfterPoints),
						newPendingPoints: Number(currBal?.pendingPoints ?? 0),
					};
				};
				const replayed = await withTenantCtx(p.orgId, lookupReplay);
				if (replayed) return replayed;
			}
			throw err;
		}
	}

	return execTenant();
}

export interface ExecuteConfirmHoldParams {
	readonly orgId: string;
	readonly holdId: string;
	readonly paymentId?: string | null | undefined;
	readonly clientMutationId?: string | undefined;
	readonly txClient?: TenantDb | undefined;
}

export async function executeBonusConfirm(p: ExecuteConfirmHoldParams) {
	const runInTx = async (tx: TenantDb) => {
		const [existingConfirmed] = await tx
			.select()
			.from(bonusTransactions)
			.where(
				and(
					eq(bonusTransactions.organizationId, p.orgId),
					eq(bonusTransactions.id, p.holdId),
					eq(bonusTransactions.type, "redemption_payment"),
				),
			)
			.limit(1)
			.for("update");

		if (existingConfirmed) {
			const [balance] = await tx
				.select()
				.from(patientBonusBalances)
				.where(
					and(
						eq(patientBonusBalances.organizationId, p.orgId),
						eq(patientBonusBalances.patientId, existingConfirmed.patientId),
					),
				)
				.limit(1)
				.for("update");
			return {
				success: true as const,
				replayed: true as const,
				holdId: p.holdId,
				confirmedPoints: Math.abs(Number(existingConfirmed.amountPoints)),
				newPendingPoints: Number(balance?.pendingPoints ?? 0),
				status: "confirmed" as const,
			};
		}

		const [holdTx] = await tx
			.select()
			.from(bonusTransactions)
			.where(
				and(
					eq(bonusTransactions.organizationId, p.orgId),
					eq(bonusTransactions.id, p.holdId),
					eq(bonusTransactions.type, "hold_payment"),
				),
			)
			.limit(1)
			.for("update");

		if (!holdTx) return { holdNotFound: true as const, message: "Активный холд бонусов не найден" };

		const heldPoints = Math.abs(Number(holdTx.amountPoints));
		const [balance] = await tx
			.select()
			.from(patientBonusBalances)
			.where(
				and(
					eq(patientBonusBalances.organizationId, p.orgId),
					eq(patientBonusBalances.patientId, holdTx.patientId),
				),
			)
			.limit(1)
			.for("update");

		const heldPointsKop = parseKopecks(heldPoints);
		const pendingPointsKop = parseKopecks(balance?.pendingPoints ?? 0);
		const lifetimeSpentKop = parseKopecks(balance?.lifetimeSpentPoints ?? 0);
		const newPendingKop = Math.max(0, pendingPointsKop - heldPointsKop);
		const newSpentKop = sumKopecks([lifetimeSpentKop, heldPointsKop]);
		const newPendingStr = kopecksToNumericString(newPendingKop);
		const newSpentStr = kopecksToNumericString(newSpentKop);
		const newPending = Number(newPendingStr);

		await tx
			.update(patientBonusBalances)
			.set({
				pendingPoints: newPendingStr,
				lifetimeSpentPoints: newSpentStr,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(patientBonusBalances.organizationId, p.orgId),
					eq(patientBonusBalances.patientId, holdTx.patientId),
				),
			);

		await tx
			.update(bonusTransactions)
			.set({
				type: "redemption_payment",
				relatedPaymentId: p.paymentId || null,
				description: `${holdTx.description} (подтверждено)`,
			})
			.where(
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
	};

	return p.txClient ? runInTx(p.txClient) : withTenantCtx(p.orgId, runInTx);
}

export interface ExecuteReleaseHoldParams {
	readonly orgId: string;
	readonly holdId: string;
	readonly reason: string;
	readonly clientMutationId?: string | undefined;
	readonly txClient?: TenantDb | undefined;
}

export async function executeBonusRelease(p: ExecuteReleaseHoldParams) {
	const runInTx = async (tx: TenantDb) => {
		const [existingReleased] = await tx
			.select()
			.from(bonusTransactions)
			.where(
				and(
					eq(bonusTransactions.organizationId, p.orgId),
					eq(bonusTransactions.id, p.holdId),
					eq(bonusTransactions.type, "hold_released"),
				),
			)
			.limit(1)
			.for("update");

		if (existingReleased) {
			const [balance] = await tx
				.select()
				.from(patientBonusBalances)
				.where(
					and(
						eq(patientBonusBalances.organizationId, p.orgId),
						eq(patientBonusBalances.patientId, existingReleased.patientId),
					),
				)
				.limit(1)
				.for("update");
			return {
				success: true as const,
				replayed: true as const,
				holdId: p.holdId,
				releasedPoints: Math.abs(Number(existingReleased.amountPoints)),
				newActivePoints: Number(balance?.activePoints ?? 0),
				newPendingPoints: Number(balance?.pendingPoints ?? 0),
				status: "released" as const,
			};
		}

		const [holdTx] = await tx
			.select()
			.from(bonusTransactions)
			.where(
				and(
					eq(bonusTransactions.organizationId, p.orgId),
					eq(bonusTransactions.id, p.holdId),
					eq(bonusTransactions.type, "hold_payment"),
				),
			)
			.limit(1)
			.for("update");

		if (!holdTx) return { holdNotFound: true as const, message: "Активный холд бонусов не найден" };

		const heldPoints = Math.abs(Number(holdTx.amountPoints));
		const [balance] = await tx
			.select()
			.from(patientBonusBalances)
			.where(
				and(
					eq(patientBonusBalances.organizationId, p.orgId),
					eq(patientBonusBalances.patientId, holdTx.patientId),
				),
			)
			.limit(1)
			.for("update");

		const heldPointsKop = parseKopecks(heldPoints);
		const activePointsKop = parseKopecks(balance?.activePoints ?? 0);
		const pendingPointsKop = parseKopecks(balance?.pendingPoints ?? 0);
		const newActiveKop = sumKopecks([activePointsKop, heldPointsKop]);
		const newPendingKop = Math.max(0, pendingPointsKop - heldPointsKop);
		const newActiveStr = kopecksToNumericString(newActiveKop);
		const newPendingStr = kopecksToNumericString(newPendingKop);
		const newActive = Number(newActiveStr);
		const newPending = Number(newPendingStr);

		await tx
			.update(patientBonusBalances)
			.set({
				activePoints: newActiveStr,
				pendingPoints: newPendingStr,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(patientBonusBalances.organizationId, p.orgId),
					eq(patientBonusBalances.patientId, holdTx.patientId),
				),
			);

		await restoreUnspentPointsOnRelease(tx, {
			orgId: p.orgId,
			patientId: holdTx.patientId,
			pointsToRestore: heldPoints,
		});

		await tx
			.update(bonusTransactions)
			.set({
				type: "hold_released",
				description: `${holdTx.description} (снят: ${p.reason})`,
			})
			.where(
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
	};

	return p.txClient ? runInTx(p.txClient) : withTenantCtx(p.orgId, runInTx);
}
